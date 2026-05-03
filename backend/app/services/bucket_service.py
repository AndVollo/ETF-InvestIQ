from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BucketArchivedError, NotFoundError
from app.core.logging import get_logger
from app.db.models.bucket import GoalBucket
from app.db.models.holding import Holding
from app.db.models.price_history import PriceHistory
from app.schemas.bucket import BucketCreate, BucketUpdate

logger = get_logger(__name__)


# ── CRUD ─────────────────────────────────────────────────────────────────────

async def create_bucket(payload: BucketCreate, db: AsyncSession, user_id: int | None = None) -> GoalBucket:
    now = datetime.now(timezone.utc)
    bucket = GoalBucket(
        user_id=user_id,
        name=payload.name,
        horizon_type=payload.horizon_type,
        initial_investment=payload.initial_investment,
        target_amount=payload.target_amount,
        target_currency=payload.target_currency,
        target_date=payload.target_date,
        description=payload.description,
        is_archived=False,
        created_at=now,
        updated_at=now,
    )
    db.add(bucket)
    await db.flush()
    await db.refresh(bucket)
    logger.info("bucket_created", id=bucket.id, name=bucket.name)
    return bucket


async def get_bucket(bucket_id: int, db: AsyncSession) -> GoalBucket:
    bucket = await db.get(GoalBucket, bucket_id)
    if bucket is None:
        raise NotFoundError("bucket", bucket_id)
    return bucket


async def get_user_bucket(bucket_id: int, user_id: int, db: AsyncSession) -> GoalBucket:
    """Get bucket and verify ownership. Returns 404 for missing or foreign bucket."""
    bucket = await db.get(GoalBucket, bucket_id)
    if bucket is None or (bucket.user_id is not None and bucket.user_id != user_id):
        raise NotFoundError("bucket", bucket_id)
    return bucket


async def get_active_bucket(bucket_id: int, db: AsyncSession) -> GoalBucket:
    bucket = await get_bucket(bucket_id, db)
    if bucket.is_archived:
        raise BucketArchivedError(bucket_id)
    return bucket


async def list_buckets(
    db: AsyncSession, include_archived: bool = False, user_id: int | None = None
) -> list[GoalBucket]:
    q = select(GoalBucket)
    if user_id is not None:
        q = q.where(GoalBucket.user_id == user_id)
    if not include_archived:
        q = q.where(GoalBucket.is_archived == False)  # noqa: E712
    q = q.order_by(GoalBucket.created_at.asc())
    result = await db.execute(q)
    return list(result.scalars().all())


async def update_bucket(
    bucket_id: int, payload: BucketUpdate, db: AsyncSession
) -> GoalBucket:
    bucket = await get_active_bucket(bucket_id, db)
    if payload.name is not None:
        bucket.name = payload.name
    if payload.initial_investment is not None:
        bucket.initial_investment = payload.initial_investment
    if payload.target_amount is not None:
        bucket.target_amount = payload.target_amount
    if payload.target_currency is not None:
        bucket.target_currency = payload.target_currency
    if payload.target_date is not None:
        bucket.target_date = payload.target_date
    if payload.description is not None:
        bucket.description = payload.description
    bucket.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(bucket)
    return bucket


async def archive_bucket(bucket_id: int, db: AsyncSession) -> None:
    bucket = await get_bucket(bucket_id, db)
    bucket.is_archived = True
    bucket.updated_at = datetime.now(timezone.utc)
    await db.flush()
    logger.info("bucket_archived", id=bucket_id)


async def delete_bucket(bucket_id: int, db: AsyncSession) -> None:
    bucket = await get_bucket(bucket_id, db)
    # Holdings and prices have ON DELETE CASCADE or need manual cleanup
    await db.delete(bucket)
    await db.flush()
    logger.info("bucket_deleted", id=bucket_id)


# ── Holdings with drift ───────────────────────────────────────────────────────

async def _latest_price(ticker: str, db: AsyncSession) -> float | None:
    result = await db.execute(
        select(PriceHistory.close_usd, PriceHistory.date)
        .where(PriceHistory.ticker == ticker)
        .order_by(PriceHistory.date.desc())
        .limit(1)
    )
    row = result.first()
    return float(row[0]) if row else None


async def get_holdings_with_drift(
    bucket_id: int, db: AsyncSession
) -> tuple[float, list[dict[str, Any]]]:
    """Returns (total_value_usd, list of holdings enriched with drift data)."""
    result = await db.execute(
        select(Holding)
        .where(Holding.bucket_id == bucket_id, Holding.is_archived == False)  # noqa: E712
        .order_by(Holding.ticker.asc())
    )
    holdings = list(result.scalars().all())

    # Fetch latest price for each ticker
    prices: dict[str, float | None] = {}
    for h in holdings:
        prices[h.ticker] = await _latest_price(h.ticker, db)

    # Compute values
    total_value = 0.0
    rows: list[dict[str, Any]] = []
    for h in holdings:
        price = prices.get(h.ticker) or h.avg_cost_usd or 0.0
        value = h.units * price
        total_value += value
        rows.append(
            {
                "holding": h,
                "current_price_usd": prices.get(h.ticker),
                "current_value_usd": value,
            }
        )

    # Compute percentages and drift
    enriched: list[dict[str, Any]] = []
    for r in rows:
        h = r["holding"]
        current_pct = (r["current_value_usd"] / total_value * 100) if total_value > 0 else 0.0
        enriched.append(
            {
                "id": h.id,
                "ticker": h.ticker,
                "units": h.units,
                "avg_cost_usd": h.avg_cost_usd,
                "target_pct": h.target_pct,
                "current_price_usd": r["current_price_usd"],
                "current_value_usd": round(r["current_value_usd"], 4),
                "current_pct": round(current_pct, 4),
                "drift_pct": round(current_pct - h.target_pct, 4),
                "notes": h.notes,
            }
        )

    return total_value, enriched


# ── Goal progress ─────────────────────────────────────────────────────────────

def compute_goal_progress(
    current_value_usd: float,
    target_amount: float | None,
    target_currency: str,
    target_date: date | None,
    fx_rate: float | None,
) -> dict[str, Any]:
    """Returns goal progress metadata. All amounts in target_currency."""
    # Convert current value to target currency
    if target_currency == "ILS":
        current_in_target = current_value_usd * fx_rate if fx_rate else None
    else:
        current_in_target = current_value_usd

    progress_pct: float | None = None
    amount_remaining: float | None = None
    if target_amount and current_in_target is not None:
        progress_pct = min(round(current_in_target / target_amount * 100, 2), 100.0)
        amount_remaining = max(target_amount - current_in_target, 0.0)

    months_remaining: int | None = None
    if target_date:
        today = date.today()
        delta_months = (target_date.year - today.year) * 12 + (target_date.month - today.month)
        months_remaining = max(delta_months, 0)

    return {
        "progress_pct": progress_pct,
        "amount_remaining": amount_remaining,
        "months_remaining": months_remaining,
        "current_in_target_currency": current_in_target,
    }
