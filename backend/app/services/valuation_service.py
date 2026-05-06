from __future__ import annotations

import statistics
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models.price_history import PriceHistory
from app.db.models.valuation_cache import ValuationCache
from app.services.universe_service import get_universe_tickers

logger = get_logger(__name__)

Classification = Literal["CHEAP", "FAIR", "EXPENSIVE", "INSUFFICIENT_HISTORY"]
VALUATION_CACHE_TTL = timedelta(hours=1)

MIN_DAYS_FOR_Z_SCORE = 90       # need at least 3 months
MIN_DAYS_FOR_3Y = 365 * 3 - 30  # ~2y 11m counts as "has 3y history"


@dataclass
class ValuationResult:
    ticker: str
    z_score: float | None
    percentile_52w: float | None
    sma200_deviation: float | None
    classification: Classification
    has_3y_history: bool
    calculated_at: datetime
    stale: bool = False


# ── Pure math functions ───────────────────────────────────────────────────────

def classify(z_score: float | None) -> Classification:
    """PRD §5.3 — fixed thresholds, never deviate."""
    if z_score is None:
        return "INSUFFICIENT_HISTORY"
    if z_score < -1.5:
        return "CHEAP"
    if z_score > 1.5:
        return "EXPENSIVE"
    return "FAIR"


def compute_z_score(prices: list[float]) -> float | None:
    if len(prices) < MIN_DAYS_FOR_Z_SCORE:
        return None
    try:
        mean = statistics.mean(prices)
        stdev = statistics.stdev(prices)
    except statistics.StatisticsError:
        return None
    if stdev == 0:
        return 0.0
    return (prices[-1] - mean) / stdev


def compute_52w_percentile(prices: list[float]) -> float | None:
    """Position of current price within its 52-week (≈252 trading days) range."""
    window = prices[-252:] if len(prices) >= 252 else prices
    if len(window) < 2:
        return None
    lo, hi = min(window), max(window)
    diff = hi - lo
    if diff < 1e-7:
        return 100.0
    val = (window[-1] - lo) / diff * 100
    return round(max(0.0, min(100.0, val)), 2)


def compute_sma200_deviation(prices: list[float]) -> float | None:
    """(current_price - SMA200) / SMA200 — positive means above SMA200."""
    if len(prices) < 200:
        return None
    sma200 = statistics.mean(prices[-200:])
    if sma200 == 0:
        return None
    return round((prices[-1] - sma200) / sma200, 6)


def _analyse_prices(prices: list[float]) -> tuple[float | None, float | None, float | None, bool]:
    """Returns (z_score, percentile_52w, sma200_deviation, has_3y_history)."""
    has_3y = len(prices) >= MIN_DAYS_FOR_3Y
    return (
        compute_z_score(prices),
        compute_52w_percentile(prices),
        compute_sma200_deviation(prices),
        has_3y,
    )


# ── Cache helpers ─────────────────────────────────────────────────────────────

def _utc(dt: datetime) -> datetime:
    """Treat naive datetimes (from SQLite) as UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def _get_cached(ticker: str, db: AsyncSession) -> ValuationResult | None:
    result = await db.execute(
        select(ValuationCache).where(ValuationCache.ticker == ticker)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return None
    is_stale = _utc(row.expires_at) < datetime.now(timezone.utc)
    return ValuationResult(
        ticker=ticker,
        z_score=row.z_score,
        percentile_52w=row.percentile_52w,
        sma200_deviation=row.sma200_deviation,
        classification=row.classification or "INSUFFICIENT_HISTORY",  # type: ignore[arg-type]
        has_3y_history=row.has_3y_history,
        calculated_at=row.calculated_at,
        stale=is_stale,
    )


async def _cache_result(ticker: str, res: ValuationResult, db: AsyncSession) -> None:
    now = datetime.now(timezone.utc)
    expires = now + VALUATION_CACHE_TTL
    existing = (
        await db.execute(select(ValuationCache).where(ValuationCache.ticker == ticker))
    ).scalar_one_or_none()

    if existing:
        existing.z_score = res.z_score
        existing.percentile_52w = res.percentile_52w
        existing.sma200_deviation = res.sma200_deviation
        existing.classification = res.classification
        existing.has_3y_history = res.has_3y_history
        existing.calculated_at = res.calculated_at
        existing.expires_at = expires
        existing.updated_at = now
    else:
        db.add(
            ValuationCache(
                ticker=ticker,
                z_score=res.z_score,
                percentile_52w=res.percentile_52w,
                sma200_deviation=res.sma200_deviation,
                classification=res.classification,
                has_3y_history=res.has_3y_history,
                calculated_at=res.calculated_at,
                expires_at=expires,
                created_at=now,
                updated_at=now,
            )
        )
    await db.flush()


# ── Public API ────────────────────────────────────────────────────────────────

async def calculate_valuation(
    ticker: str,
    db: AsyncSession,
    use_cache: bool = True,
) -> ValuationResult:
    if use_cache:
        cached = await _get_cached(ticker, db)
        if cached and not cached.stale:
            return cached

    # Pull price history from DB (populated by yfinance_client separately)
    cutoff = date.today() - timedelta(days=365 * 3 + 60)
    result = await db.execute(
        select(PriceHistory.close_usd)
        .where(PriceHistory.ticker == ticker, PriceHistory.date >= cutoff)
        .order_by(PriceHistory.date.asc())
    )
    prices = [row[0] for row in result.fetchall()]

    now = datetime.now(timezone.utc)

    if len(prices) < MIN_DAYS_FOR_Z_SCORE:
        # Return stale cache if available; otherwise INSUFFICIENT_HISTORY
        if use_cache:
            cached = await _get_cached(ticker, db)
            if cached:
                cached.stale = True
                return cached
        res = ValuationResult(
            ticker=ticker,
            z_score=None,
            percentile_52w=None,
            sma200_deviation=None,
            classification="INSUFFICIENT_HISTORY",
            has_3y_history=False,
            calculated_at=now,
            stale=len(prices) == 0,
        )
        return res

    z, p52, sma_dev, has_3y = _analyse_prices(prices)
    res = ValuationResult(
        ticker=ticker,
        z_score=round(z, 4) if z is not None else None,
        percentile_52w=p52,
        sma200_deviation=sma_dev,
        classification=classify(z),
        has_3y_history=has_3y,
        calculated_at=now,
    )
    await _cache_result(ticker, res, db)
    return res


async def bulk_calculate(
    tickers: list[str], db: AsyncSession, use_cache: bool = True
) -> dict[str, ValuationResult]:
    out: dict[str, ValuationResult] = {}
    for ticker in tickers:
        out[ticker] = await calculate_valuation(ticker, db, use_cache=use_cache)
    return out


async def refresh_valuations(db: AsyncSession) -> tuple[int, list[str]]:
    """Re-compute valuation for all universe tickers. Returns (count_ok, failed_list)."""
    tickers = sorted(get_universe_tickers())
    ok = 0
    failed: list[str] = []
    for ticker in tickers:
        try:
            res = await calculate_valuation(ticker, db, use_cache=False)
            if res.classification != "INSUFFICIENT_HISTORY":
                ok += 1
        except Exception as exc:
            logger.warning("valuation_refresh_failed", ticker=ticker, error=str(exc))
            failed.append(ticker)
    logger.info("valuations_refreshed", ok=ok, failed=len(failed))
    return ok, failed
