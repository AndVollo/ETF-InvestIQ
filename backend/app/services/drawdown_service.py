from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any

import yfinance as yf
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models.drawdown_simulation import DrawdownSimulation
from app.db.models.price_history import PriceHistory
from app.schemas.drawdown import (
    DrawdownHoldingDetail,
    DrawdownScenario,
    DrawdownSimulationResponse,
)
from app.services.universe_service import get_etf_metadata

logger = get_logger(__name__)

# Historical crash scenarios: (name, peak_date, trough_date)
SCENARIOS: list[tuple[str, date, date]] = [
    ("2000 Dot-Com",    date(2000, 3, 24), date(2002, 10, 9)),
    ("2008 GFC",        date(2007, 10, 9), date(2009, 3, 9)),
    ("2020 COVID",      date(2020, 2, 19), date(2020, 3, 23)),
    ("2022 Rate Hike",  date(2022, 1, 3),  date(2022, 10, 12)),
]

# Proxies for ETFs that didn't exist during earlier scenarios
# Inception dates (approximate):
#   AVUV: 2019-09, AVDV: 2019-09, AVES: 2019-09
_PROXY_MAP: dict[str, str] = {
    "AVUV": "IJS",
    "AVDV": "SCZ",
    "AVES": "DGS",
}

# Inception years — scenarios before this year use proxy
_INCEPTION_YEAR: dict[str, int] = {
    "AVUV": 2019,
    "AVDV": 2019,
    "AVES": 2019,
}

# Category-based default drawdowns [2000, 2008, 2020, 2022] when no price data available
_CATEGORY_DEFAULTS: dict[str, list[float]] = {
    "GLOBAL_CORE":        [-49.0, -55.0, -34.0, -22.0],
    "US_FACTOR_VALUE":    [-55.0, -60.0, -40.0, -25.0],
    "INTL_FACTOR_VALUE":  [-52.0, -58.0, -38.0, -24.0],
    "US_BONDS":           [  5.0,   5.0,  -3.0, -15.0],
    "ULTRA_SHORT_TERM":   [  0.5,   0.5,   0.2,   0.0],
    "REITS":              [-37.0, -68.0, -38.0, -25.0],
    "COMMODITIES_HEDGE":  [ -5.0, -25.0, -15.0,  15.0],
    "EMERGING_MARKETS":   [-55.0, -60.0, -35.0, -25.0],
}
_SCENARIO_INDEX = {"2000 Dot-Com": 0, "2008 GFC": 1, "2020 COVID": 2, "2022 Rate Hike": 3}


def _fetch_prices_sync(ticker: str, start: date, end: date) -> list[dict[str, Any]]:
    t = yf.Ticker(ticker)
    # Fetch a window around target dates to handle weekends/holidays
    df = t.history(
        start=str(start - timedelta(days=7)),
        end=str(end + timedelta(days=7)),
        interval="1d",
        auto_adjust=True,
    )
    if df.empty:
        return []
    rows = []
    for idx, row in df.iterrows():
        rows.append({"date": idx.date(), "close_usd": float(row["Close"])})
    return rows


async def _ensure_prices_in_db(ticker: str, start: date, end: date, db: AsyncSession) -> None:
    """Fetch and store price range if not yet in DB."""
    result = await db.execute(
        select(PriceHistory.date)
        .where(
            PriceHistory.ticker == ticker,
            PriceHistory.date >= start,
            PriceHistory.date <= end,
        )
        .limit(1)
    )
    if result.first():
        return  # already have data

    try:
        rows = await asyncio.to_thread(_fetch_prices_sync, ticker, start, end)
    except Exception as exc:
        logger.warning("drawdown_price_fetch_failed", ticker=ticker, error=str(exc))
        return

    now = datetime.now(timezone.utc)
    for row in rows:
        existing = (
            await db.execute(
                select(PriceHistory).where(
                    PriceHistory.ticker == ticker,
                    PriceHistory.date == row["date"],
                )
            )
        ).scalar_one_or_none()
        if existing is None:
            db.add(PriceHistory(
                ticker=ticker,
                date=row["date"],
                close_usd=row["close_usd"],
                volume=None,
                created_at=now,
                updated_at=now,
            ))
    await db.flush()


async def _price_nearest(ticker: str, target: date, db: AsyncSession) -> float | None:
    """Return the closing price closest to (and on or after) target date, within 7 days."""
    result = await db.execute(
        select(PriceHistory.close_usd, PriceHistory.date)
        .where(PriceHistory.ticker == ticker, PriceHistory.date >= target)
        .order_by(PriceHistory.date.asc())
        .limit(1)
    )
    row = result.first()
    if row and (row[1] - target).days <= 7:
        return float(row[0])
    # Try going backwards too
    result2 = await db.execute(
        select(PriceHistory.close_usd, PriceHistory.date)
        .where(PriceHistory.ticker == ticker, PriceHistory.date <= target)
        .order_by(PriceHistory.date.desc())
        .limit(1)
    )
    row2 = result2.first()
    if row2 and (target - row2[1]).days <= 7:
        return float(row2[0])
    return None


async def simulate_bucket(bucket_id: int, db: AsyncSession) -> DrawdownSimulationResponse:
    from app.services import bucket_service

    total_value, enriched = await bucket_service.get_holdings_with_drift(bucket_id, db)

    scenarios_out: list[DrawdownScenario] = []
    worst_pct: float | None = None
    worst_amount: float | None = None

    for name, peak_date, trough_date in SCENARIOS:
        holding_details: list[DrawdownHoldingDetail] = []
        portfolio_drawdown_sum = 0.0
        weight_sum = 0.0

        for h in enriched:
            ticker: str = h["ticker"]
            holding_weight = (
                h["current_value_usd"] / total_value * 100 if total_value > 0 else 0.0
            )

            # Determine which ticker to use for price lookup
            inception_year = _INCEPTION_YEAR.get(ticker)
            use_proxy = (
                inception_year is not None and peak_date.year < inception_year
            )
            price_ticker = _PROXY_MAP.get(ticker, ticker) if use_proxy else ticker

            # Ensure we have price data in DB
            await _ensure_prices_in_db(price_ticker, peak_date, trough_date, db)

            peak_price = await _price_nearest(price_ticker, peak_date, db)
            trough_price = await _price_nearest(price_ticker, trough_date, db)

            if peak_price and trough_price and peak_price > 0:
                scenario_dd = (trough_price - peak_price) / peak_price * 100
                data_available = True
            else:
                # Fall back to category default
                meta = get_etf_metadata(ticker)
                bucket_key = meta.get("bucket", "") if meta else ""
                defaults = _CATEGORY_DEFAULTS.get(bucket_key, _CATEGORY_DEFAULTS["GLOBAL_CORE"])
                idx = _SCENARIO_INDEX.get(name, 0)
                scenario_dd = defaults[idx]
                data_available = False

            holding_details.append(DrawdownHoldingDetail(
                ticker=ticker,
                proxy_ticker=price_ticker if use_proxy else None,
                proxy_used=use_proxy,
                data_available=data_available,
                scenario_drawdown_pct=round(scenario_dd, 2),
                holding_weight_pct=round(holding_weight, 4),
            ))

            if holding_weight > 0:
                portfolio_drawdown_sum += scenario_dd * holding_weight
                weight_sum += holding_weight

        if weight_sum > 0:
            portfolio_dd_pct = portfolio_drawdown_sum / weight_sum
            portfolio_loss = total_value * portfolio_dd_pct / 100
        else:
            portfolio_dd_pct = 0.0
            portfolio_loss = 0.0

        scenarios_out.append(DrawdownScenario(
            name=name,
            period_start=peak_date,
            period_end=trough_date,
            portfolio_drawdown_pct=round(portfolio_dd_pct, 2),
            portfolio_loss_usd=round(portfolio_loss, 2),
            holdings=holding_details,
        ))

        if worst_pct is None or portfolio_dd_pct < worst_pct:
            worst_pct = portfolio_dd_pct
            worst_amount = portfolio_loss

    # Store result in DB
    now = datetime.now(timezone.utc)
    sim = DrawdownSimulation(
        bucket_id=bucket_id,
        allocation_json=json.dumps([
            {"ticker": h["ticker"], "target_pct": h["target_pct"]} for h in enriched
        ]),
        portfolio_value_at_simulation=round(total_value, 4),
        portfolio_currency="USD",
        scenarios_json=json.dumps([s.model_dump(mode="json") for s in scenarios_out]),
        worst_case_pct=round(worst_pct, 2) if worst_pct is not None else None,
        worst_case_amount=round(worst_amount, 2) if worst_amount is not None else None,
        created_at=now,
        updated_at=now,
    )
    db.add(sim)
    await db.flush()
    await db.refresh(sim)

    return DrawdownSimulationResponse(
        simulation_id=sim.id,
        bucket_id=bucket_id,
        portfolio_value_usd=round(total_value, 4),
        scenarios=scenarios_out,
        worst_case_pct=worst_pct,
        worst_case_amount_usd=worst_amount,
        simulated_at=now.isoformat(),
    )


async def simulate_proposed_allocation(
    allocation: dict[str, float],
    portfolio_value_usd: float,
    db: AsyncSession,
) -> DrawdownSimulationResponse:
    """Run the same 4-scenario simulation against a *proposed* allocation
    (target weights only) without writing it to holdings.

    Used by the Architect's pre-confirm drawdown review (PRD §12 Sprint 6,
    "אינטגרציה עם Architect — חובה לפני שמירה"). Does not persist to
    DrawdownSimulation; the architect session itself records the
    acknowledgement.
    """
    scenarios_out: list[DrawdownScenario] = []
    worst_pct: float | None = None
    worst_amount: float | None = None

    for name, peak_date, trough_date in SCENARIOS:
        holding_details: list[DrawdownHoldingDetail] = []
        portfolio_drawdown_sum = 0.0
        weight_sum = 0.0

        for ticker, weight_pct in allocation.items():
            inception_year = _INCEPTION_YEAR.get(ticker)
            use_proxy = inception_year is not None and peak_date.year < inception_year
            price_ticker = _PROXY_MAP.get(ticker, ticker) if use_proxy else ticker

            await _ensure_prices_in_db(price_ticker, peak_date, trough_date, db)
            peak_price = await _price_nearest(price_ticker, peak_date, db)
            trough_price = await _price_nearest(price_ticker, trough_date, db)

            if peak_price and trough_price and peak_price > 0:
                scenario_dd = (trough_price - peak_price) / peak_price * 100
                data_available = True
            else:
                meta = get_etf_metadata(ticker)
                bucket_key = meta.get("bucket", "") if meta else ""
                defaults = _CATEGORY_DEFAULTS.get(bucket_key, _CATEGORY_DEFAULTS["GLOBAL_CORE"])
                idx = _SCENARIO_INDEX.get(name, 0)
                scenario_dd = defaults[idx]
                data_available = False

            holding_details.append(DrawdownHoldingDetail(
                ticker=ticker,
                proxy_ticker=price_ticker if use_proxy else None,
                proxy_used=use_proxy,
                data_available=data_available,
                scenario_drawdown_pct=round(scenario_dd, 2),
                holding_weight_pct=round(weight_pct, 4),
            ))

            if weight_pct > 0:
                portfolio_drawdown_sum += scenario_dd * weight_pct
                weight_sum += weight_pct

        if weight_sum > 0:
            portfolio_dd_pct = portfolio_drawdown_sum / weight_sum
            portfolio_loss = portfolio_value_usd * portfolio_dd_pct / 100
        else:
            portfolio_dd_pct = 0.0
            portfolio_loss = 0.0

        scenarios_out.append(DrawdownScenario(
            name=name,
            period_start=peak_date,
            period_end=trough_date,
            portfolio_drawdown_pct=round(portfolio_dd_pct, 2),
            portfolio_loss_usd=round(portfolio_loss, 2),
            holdings=holding_details,
        ))

        if worst_pct is None or portfolio_dd_pct < worst_pct:
            worst_pct = portfolio_dd_pct
            worst_amount = portfolio_loss

    return DrawdownSimulationResponse(
        simulation_id=0,  # not persisted
        bucket_id=0,
        portfolio_value_usd=round(portfolio_value_usd, 4),
        scenarios=scenarios_out,
        worst_case_pct=round(worst_pct, 2) if worst_pct is not None else None,
        worst_case_amount_usd=round(worst_amount, 2) if worst_amount is not None else None,
        simulated_at=datetime.now(timezone.utc).isoformat(),
    )


async def get_latest_simulation(bucket_id: int, db: AsyncSession) -> DrawdownSimulation | None:
    result = await db.execute(
        select(DrawdownSimulation)
        .where(DrawdownSimulation.bucket_id == bucket_id)
        .order_by(DrawdownSimulation.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
