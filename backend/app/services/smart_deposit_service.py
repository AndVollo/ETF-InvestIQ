from __future__ import annotations

import json
import secrets
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import AppError, BucketArchivedError, DataUnavailableError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.db.models.bucket import GoalBucket
from app.db.models.deposit_log import DepositLog
from app.db.models.holding import Holding
from app.db.models.pending_action import PendingAction
from app.db.models.price_history import PriceHistory
from app.schemas.deposit import DepositPlan, OrderItem, PostDepositDrift

logger = get_logger(__name__)

PLAN_TTL = timedelta(hours=2)


# ── Pure allocation math (no I/O — fully testable) ───────────────────────────

@dataclass
class HoldingSlot:
    """One position in the bucket, enriched with live price data."""
    holding_id: int
    ticker: str
    units: float
    target_pct: float           # 0–100
    avg_cost_usd: float | None
    current_price_usd: float    # best available price
    price_is_estimated: bool    # True when falling back to avg_cost


@dataclass
class AllocationResult:
    orders: list[OrderItem]
    total_allocated_usd: float
    remainder_usd: float
    post_deposit_drifts: list[PostDepositDrift]


def _compute_allocation(
    slots: list[HoldingSlot],
    deposit_usd: float,
    min_order_usd: float = 50.0,
) -> AllocationResult:
    """
    Pure function — no I/O.

    Algorithm (PRD §5.4):
    1. Compute current portfolio value.
    2. Project new total = current + deposit.
    3. For each slot, compute gap = target_value_projected - current_value.
    4. Sort by drift ascending (most underweight first).
    5. Greedily allocate: fill each gap, skip if resulting order < min_order_usd
       (cascade that amount to the next slot).
    6. Return orders and remainder.
    """
    if deposit_usd <= 0 or not slots:
        return AllocationResult(orders=[], total_allocated_usd=0.0, remainder_usd=deposit_usd, post_deposit_drifts=[])

    current_total = sum(s.units * s.current_price_usd for s in slots)
    projected_total = current_total + deposit_usd

    @dataclass
    class _Gap:
        ticker: str
        current_value: float
        target_pct: float
        gap_usd: float    # how much money this slot needs
        price: float
        drift: float      # current_pct - target_pct (negative = underweight)

    gaps: list[_Gap] = []
    for s in slots:
        current_value = s.units * s.current_price_usd
        current_pct = (current_value / projected_total * 100) if projected_total > 0 else 0.0
        target_value = projected_total * (s.target_pct / 100)
        gap = max(target_value - current_value, 0.0)
        drift = current_pct - s.target_pct
        gaps.append(_Gap(
            ticker=s.ticker,
            current_value=current_value,
            target_pct=s.target_pct,
            gap_usd=gap,
            price=s.current_price_usd,
            drift=drift,
        ))

    # Sort by drift ascending → most underweight first
    gaps.sort(key=lambda g: g.drift)

    remaining = deposit_usd
    raw_orders: list[tuple[str, float, float]] = []  # (ticker, units, total_usd)

    for g in gaps:
        if remaining <= 0:
            break
        if g.gap_usd <= 0 or g.price <= 0:
            continue

        allocate = min(remaining, g.gap_usd)

        if allocate < min_order_usd:
            # Too small — cascade to next slot (don't deduct from remaining)
            continue

        units = allocate / g.price
        raw_orders.append((g.ticker, units, allocate))
        remaining -= allocate

    orders = [
        OrderItem(
            ticker=ticker,
            units=round(units, 6),
            est_price_usd=round(
                next(g.price for g in gaps if g.ticker == ticker), 4
            ),
            est_total_usd=round(total, 2),
        )
        for ticker, units, total in raw_orders
    ]

    total_allocated = sum(o.est_total_usd for o in orders)
    remainder = round(deposit_usd - total_allocated, 4)

    # Post-deposit drifts
    order_map = {o.ticker: o.est_total_usd for o in orders}
    drifts: list[PostDepositDrift] = []
    new_total = current_total + total_allocated
    for g in gaps:
        added = order_map.get(g.ticker, 0.0)
        new_value = g.current_value + added
        new_pct = (new_value / new_total * 100) if new_total > 0 else 0.0
        drifts.append(PostDepositDrift(
            ticker=g.ticker,
            target_pct=g.target_pct,
            projected_pct=round(new_pct, 4),
            drift_pct=round(new_pct - g.target_pct, 4),
        ))

    return AllocationResult(
        orders=orders,
        total_allocated_usd=round(total_allocated, 4),
        remainder_usd=remainder,
        post_deposit_drifts=drifts,
    )


# ── Validation helpers ────────────────────────────────────────────────────────

async def _assert_holdings_sum_100(bucket_id: int, db: AsyncSession) -> None:
    result = await db.execute(
        select(Holding.target_pct)
        .where(Holding.bucket_id == bucket_id, Holding.is_archived == False)  # noqa: E712
    )
    pcts = [row[0] for row in result.fetchall()]
    if not pcts:
        raise ValidationError("error.bucket_no_holdings", {"bucket_id": bucket_id})
    total = sum(pcts)
    if abs(total - 100.0) > settings.allocation_sum_tolerance:
        from app.core.exceptions import AllocationSumError
        raise AllocationSumError(total)


async def _load_slots(bucket_id: int, db: AsyncSession) -> tuple[list[HoldingSlot], bool]:
    """Returns (slots, prices_stale). Stale = any price older than 24h."""
    result = await db.execute(
        select(Holding)
        .where(Holding.bucket_id == bucket_id, Holding.is_archived == False)  # noqa: E712
    )
    holdings = list(result.scalars().all())

    slots: list[HoldingSlot] = []
    prices_stale = False
    yesterday = date.today() - timedelta(days=1)

    for h in holdings:
        price_row = (await db.execute(
            select(PriceHistory.close_usd, PriceHistory.date)
            .where(PriceHistory.ticker == h.ticker)
            .order_by(PriceHistory.date.desc())
            .limit(1)
        )).first()

        if price_row:
            price = float(price_row[0])
            if price_row[1] < yesterday:
                prices_stale = True
            estimated = False
        elif h.avg_cost_usd:
            price = h.avg_cost_usd
            estimated = True
            prices_stale = True
        else:
            # No price data at all — use $1 placeholder, mark as estimated
            price = 1.0
            estimated = True
            prices_stale = True

        slots.append(HoldingSlot(
            holding_id=h.id,
            ticker=h.ticker,
            units=h.units,
            target_pct=h.target_pct,
            avg_cost_usd=h.avg_cost_usd,
            current_price_usd=price,
            price_is_estimated=estimated,
        ))

    return slots, prices_stale


# ── Public API ────────────────────────────────────────────────────────────────

async def calculate_deposit(
    bucket_id: int,
    amount: float,
    currency: str,
    db: AsyncSession,
) -> DepositPlan:
    from app.services.bucket_service import get_active_bucket
    from app.services.fred_client import fred_client

    bucket = await get_active_bucket(bucket_id, db)

    # Currency conversion
    fx_rate: float | None = None
    if currency == "ILS":
        fx_rate = await fred_client.get_usd_ils_rate(db)
        if fx_rate is None:
            raise DataUnavailableError("FRED", "DEXISUS")
        amount_usd = amount / fx_rate
    else:
        amount_usd = amount

    # Validate allocation sums to 100%
    await _assert_holdings_sum_100(bucket_id, db)

    # Load slots with prices
    slots, prices_stale = await _load_slots(bucket_id, db)

    # Run pure allocation
    result = _compute_allocation(slots, amount_usd, settings.min_order_usd)

    # Sector cap warning (soft — informs user, does not block)
    from app.services.sector_service import check_target_allocation_caps
    target_map = {s.ticker: s.target_pct for s in slots}
    cap_warnings = check_target_allocation_caps(target_map)
    warning: str | None = cap_warnings[0].message_key if cap_warnings else None

    # Store plan as pending_action (expires in 2h)
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    plan_payload = {
        "bucket_id": bucket_id,
        "amount_usd": round(amount_usd, 4),
        "fx_rate": fx_rate,
        "currency": currency,
        "amount_input": amount,
        "orders": [o.model_dump() for o in result.orders],
        "slots": [
            {
                "holding_id": s.holding_id,
                "ticker": s.ticker,
                "current_price_usd": s.current_price_usd,
            }
            for s in slots
        ],
    }
    db.add(PendingAction(
        token=token,
        action_type="deposit_plan",
        bucket_id=bucket_id,
        payload_json=json.dumps(plan_payload),
        created_at=now,
        updated_at=now,
        expires_at=now + PLAN_TTL,
        confirmed=False,
    ))
    await db.flush()

    return DepositPlan(
        plan_token=token,
        bucket_id=bucket_id,
        amount_input=amount,
        currency=currency,
        amount_usd=round(amount_usd, 4),
        fx_rate=fx_rate,
        orders=result.orders,
        total_allocated_usd=result.total_allocated_usd,
        remainder_usd=result.remainder_usd,
        post_deposit_drifts=result.post_deposit_drifts,
        prices_stale=prices_stale,
        warning=warning,
        expires_at=now + PLAN_TTL,
    )


async def confirm_deposit(plan_token: str, db: AsyncSession) -> DepositLog:
    now = datetime.now(timezone.utc)

    # Load pending plan
    result = await db.execute(
        select(PendingAction).where(
            PendingAction.token == plan_token,
            PendingAction.action_type == "deposit_plan",
        )
    )
    action = result.scalar_one_or_none()
    if action is None:
        raise NotFoundError("deposit_plan", plan_token)

    # Check expiry (SQLite stores naive datetimes)
    expires = action.expires_at if action.expires_at.tzinfo else action.expires_at.replace(tzinfo=timezone.utc)
    if expires < now:
        raise ValidationError("error.deposit_plan_expired", {"token": plan_token})

    if action.confirmed:
        raise ValidationError("error.deposit_plan_already_confirmed", {"token": plan_token})

    payload = json.loads(action.payload_json)
    orders_raw = payload["orders"]
    amount_usd = payload["amount_usd"]
    slots_info = {s["ticker"]: s for s in payload["slots"]}

    # Update holdings: add units, update avg_cost
    for order in orders_raw:
        ticker = order["ticker"]
        new_units = order["units"]
        price = order["est_price_usd"]

        h_result = await db.execute(
            select(Holding).where(
                Holding.bucket_id == payload["bucket_id"],
                Holding.ticker == ticker,
                Holding.is_archived == False,  # noqa: E712
            )
        )
        holding = h_result.scalar_one_or_none()
        if holding is None:
            logger.warning("holding_not_found_during_confirm", ticker=ticker)
            continue

        old_cost_basis = (holding.avg_cost_usd or price) * holding.units
        new_cost_basis = old_cost_basis + new_units * price
        total_units = holding.units + new_units

        holding.units = round(total_units, 6)
        holding.avg_cost_usd = round(new_cost_basis / total_units, 4) if total_units > 0 else price
        holding.updated_at = now

    # Mark pending action confirmed
    action.confirmed = True
    action.confirmed_at = now
    action.updated_at = now

    # Portfolio snapshot (post-deposit state)
    from app.services.bucket_service import get_holdings_with_drift
    bucket_id_int: int = payload["bucket_id"]
    _, snapshot_enriched = await get_holdings_with_drift(bucket_id_int, db)
    portfolio_snapshot = [
        {
            "ticker": h["ticker"],
            "units": h["units"],
            "current_value_usd": h["current_value_usd"],
            "current_pct": h["current_pct"],
            "target_pct": h["target_pct"],
        }
        for h in snapshot_enriched
    ]

    # Obsidian journal entry
    from app.services import settings_service, obsidian_service
    from app.db.models.bucket import GoalBucket
    bucket_row = await db.get(GoalBucket, bucket_id_int)
    bucket_name = bucket_row.name if bucket_row else f"Bucket {bucket_id_int}"
    vault_path = await settings_service.get_setting_str("obsidian_vault_path", db)
    journal_subfolder = await settings_service.get_setting_str(
        "obsidian_journal_subfolder", db, default="Investment Journal"
    )
    obsidian_path = await obsidian_service.write_deposit_journal(
        bucket_name=bucket_name,
        orders=orders_raw,
        amount_input=payload["amount_input"],
        currency=payload["currency"],
        amount_usd=amount_usd,
        portfolio_snapshot=portfolio_snapshot,
        sector_exposures=None,
        worst_case_pct=None,
        worst_case_amount=None,
        vault_path=vault_path,
        journal_subfolder=journal_subfolder,
    )

    # Write deposit log
    log = DepositLog(
        bucket_id=bucket_id_int,
        amount=payload["amount_input"],
        currency=payload["currency"],
        fx_rate=payload.get("fx_rate"),
        orders_json=json.dumps(orders_raw),
        portfolio_snapshot_json=json.dumps(portfolio_snapshot),
        obsidian_file_path=obsidian_path,
        created_at=now,
        updated_at=now,
    )
    db.add(log)
    await db.flush()
    await db.refresh(log)

    logger.info("deposit_confirmed", bucket_id=bucket_id_int, amount_usd=amount_usd, orders=len(orders_raw))
    return log


async def get_deposit_history(bucket_id: int, db: AsyncSession) -> list[DepositLog]:
    result = await db.execute(
        select(DepositLog)
        .where(DepositLog.bucket_id == bucket_id)
        .order_by(DepositLog.created_at.desc())
    )
    return list(result.scalars().all())
