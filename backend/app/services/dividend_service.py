"""
Dividend income service.

Computes forward annual dividend income for a bucket:
    annual_income_usd = units × current_price × forward_yield

No projections, no DRIP simulation — per PRD §5.9.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any


# import yfinance as yf  # Moved to local imports to speed up startup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models.holding import Holding
from app.db.models.price_history import PriceHistory
from app.schemas.dividend import (
    DividendAnnualResponse,
    DividendHistoryResponse,
    DividendRecord,
    HoldingDividend,
)

logger = get_logger(__name__)


def _fetch_dividend_info_sync(ticker: str) -> dict[str, Any]:
    """Return forward yield (0–1) and last price from yfinance.info."""
    import yfinance as yf
    try:
        info = yf.Ticker(ticker).info
        yield_pct = info.get("dividendYield") or info.get("trailingAnnualDividendYield") or 0.0
        price = info.get("regularMarketPrice") or info.get("previousClose") or 0.0
        return {"forward_yield": float(yield_pct), "price": float(price)}
    except Exception as exc:
        logger.warning("dividend info fetch failed", ticker=ticker, error=str(exc))
        return {"forward_yield": 0.0, "price": 0.0}


def _fetch_dividend_history_sync(ticker: str, years: int) -> list[dict[str, Any]]:
    """Return list of {date, amount_usd} for the past `years` years."""
    import yfinance as yf
    try:
        t = yf.Ticker(ticker)
        divs = t.dividends
        if divs is None or divs.empty:
            return []
        cutoff = datetime.now(timezone.utc) - timedelta(days=years * 365)
        recent = divs[divs.index > cutoff]
        return [
            {"date": str(idx.date()), "amount_usd": float(val)}
            for idx, val in recent.items()
        ]
    except Exception as exc:
        logger.warning("dividend history fetch failed", ticker=ticker, error=str(exc))
        return []


async def _latest_price(ticker: str, db: AsyncSession) -> float | None:
    """Try DB price cache first, then yfinance."""
    result = await db.execute(
        select(PriceHistory)
        .where(PriceHistory.ticker == ticker)
        .order_by(PriceHistory.date.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if row:
        return float(row.close_usd)
    return None


async def get_annual_income(
    bucket_id: int,
    db: AsyncSession,
) -> DividendAnnualResponse:
    """
    Compute forward annual dividend income for every holding in a bucket.

    Uses cached price where available; falls back to yfinance.info price.
    """
    result = await db.execute(
        select(Holding).where(
            Holding.bucket_id == bucket_id,
            Holding.is_archived.is_(False),
        )
    )
    holdings: list[Holding] = list(result.scalars().all())

    items: list[HoldingDividend] = []
    total = 0.0

    for h in holdings:
        ticker = h.ticker
        units = float(h.units)

        # Fetch dividend yield + price concurrently
        info = await asyncio.to_thread(_fetch_dividend_info_sync, ticker)
        forward_yield: float = info["forward_yield"]
        price: float = info["price"]

        # Fall back to DB price cache if yfinance returned 0
        if price == 0.0:
            cached_price = await _latest_price(ticker, db)
            price = cached_price or 0.0

        annual_income = units * price * forward_yield
        total += annual_income

        items.append(
            HoldingDividend(
                ticker=ticker,
                units=units,
                forward_yield_pct=round(forward_yield * 100, 4) if forward_yield else None,
                annual_income_usd=round(annual_income, 2),
                data_available=forward_yield > 0 and price > 0,
            )
        )

    return DividendAnnualResponse(
        bucket_id=bucket_id,
        total_annual_usd=round(total, 2),
        holdings=items,
    )


async def get_dividend_history(
    ticker: str,
    years: int,
    db: AsyncSession,
) -> DividendHistoryResponse:
    """Return historical dividend payments for a single ticker."""
    if years < 1 or years > 10:
        years = min(max(years, 1), 10)

    records_raw = await asyncio.to_thread(_fetch_dividend_history_sync, ticker, years)
    records = [DividendRecord(date=r["date"], amount_usd=r["amount_usd"]) for r in records_raw]

    return DividendHistoryResponse(ticker=ticker, years=years, records=records)
