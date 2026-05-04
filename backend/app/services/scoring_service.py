from __future__ import annotations

import json
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models.etf_scores_cache import ETFScoresCache
from app.services.universe_service import get_etf_metadata, get_etfs_in_bucket, get_universe_tickers

logger = get_logger(__name__)

# ── Immutable weights (PRD §5.2) ─────────────────────────────────────────────
WEIGHTS: dict[str, float] = {
    "cost": 0.35,
    "sharpe_3y": 0.25,
    "tracking_error": 0.20,
    "liquidity_aum": 0.20,
}
assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9, "Score weights must sum to 1.0"

# Universe-wide normalization bounds (derived from etf_universe.yaml)
_TER_MIN = 0.03
_TER_MAX = 0.70
_AUM_MIN = 0.0   # log baseline: log(0+1)=0
_AUM_MAX = 430.0  # billions (VTI)

SCORE_CACHE_TTL = timedelta(hours=24)
NEUTRAL_SCORE = 0.5  # used when a component can't be computed


@dataclass
class ComponentScores:
    cost: float
    sharpe_3y: float
    tracking_error: float
    liquidity_aum: float
    sharpe_computed: bool = False

    @property
    def composite(self) -> float:
        return (
            self.cost * WEIGHTS["cost"]
            + self.sharpe_3y * WEIGHTS["sharpe_3y"]
            + self.tracking_error * WEIGHTS["tracking_error"]
            + self.liquidity_aum * WEIGHTS["liquidity_aum"]
        )


@dataclass
class ScoredETF:
    ticker: str
    name: str
    bucket: str
    ter: float
    aum_b: float
    composite_score: float
    components: ComponentScores
    rank: int = 0


# ── Pure score computation ────────────────────────────────────────────────────

def _cost_score(ter: float) -> float:
    """Higher score = lower cost. Linear normalization on universe TER range."""
    ter = max(_TER_MIN, min(_TER_MAX, ter))
    return 1.0 - (ter - _TER_MIN) / (_TER_MAX - _TER_MIN)


def _liquidity_score(aum_b: float) -> float:
    """Higher score = larger AUM. Log-linear normalization."""
    if aum_b <= 0:
        return 0.0
    log_min = math.log(_AUM_MIN + 1)
    log_max = math.log(_AUM_MAX + 1)
    log_val = math.log(min(aum_b, _AUM_MAX) + 1)
    return (log_val - log_min) / (log_max - log_min)


def _sharpe_score_from_prices(prices: list[float], rf_rate: float = 0.045) -> float | None:
    """Compute annualised Sharpe ratio and normalise to [0, 1] via sigmoid."""
    if len(prices) < 60:
        return None
    import statistics

    daily_returns = [
        (prices[i] - prices[i - 1]) / prices[i - 1]
        for i in range(1, len(prices))
        if prices[i - 1] != 0
    ]
    if not daily_returns:
        return None

    mean_daily = statistics.mean(daily_returns)
    try:
        std_daily = statistics.stdev(daily_returns)
    except statistics.StatisticsError:
        return None

    if std_daily == 0:
        return NEUTRAL_SCORE

    annual_return = (1 + mean_daily) ** 252 - 1
    annual_vol = std_daily * (252 ** 0.5)
    sharpe = (annual_return - rf_rate) / annual_vol

    # Sigmoid: maps Sharpe (typically -2 to +4) → (0, 1)
    return 1.0 / (1.0 + math.exp(-sharpe * 0.5))


def _tracking_error_score_proxy(ter: float) -> float:
    """TER proxy for tracking error (lower TER → lower tracking error → higher score).
    NOTE: Replace with actual tracking-error data in a future sprint."""
    return _cost_score(ter)


def _build_components(
    ter: float, aum_b: float, prices: list[float] | None, rf_rate: float
) -> ComponentScores:
    cost = _cost_score(ter)
    liquidity = _liquidity_score(aum_b)
    te = _tracking_error_score_proxy(ter)

    if prices and len(prices) >= 60:
        sharpe = _sharpe_score_from_prices(prices, rf_rate)
        sharpe_computed = sharpe is not None
        sharpe = sharpe if sharpe is not None else NEUTRAL_SCORE
    else:
        sharpe = NEUTRAL_SCORE
        sharpe_computed = False

    return ComponentScores(
        cost=cost,
        sharpe_3y=sharpe,
        tracking_error=te,
        liquidity_aum=liquidity,
        sharpe_computed=sharpe_computed,
    )


# ── Cache helpers ─────────────────────────────────────────────────────────────

def _utc(dt: datetime) -> datetime:
    """Treat naive datetimes (from SQLite) as UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def _get_cached_score(ticker: str, db: AsyncSession) -> ComponentScores | None:
    result = await db.execute(
        select(ETFScoresCache).where(ETFScoresCache.ticker == ticker)
    )
    row = result.scalar_one_or_none()
    if row is None or _utc(row.expires_at) < datetime.now(timezone.utc):
        return None
    return ComponentScores(
        cost=row.cost_score or NEUTRAL_SCORE,
        sharpe_3y=row.sharpe_score or NEUTRAL_SCORE,
        tracking_error=row.tracking_error_score or NEUTRAL_SCORE,
        liquidity_aum=row.liquidity_score or NEUTRAL_SCORE,
        sharpe_computed=bool(row.sharpe_score),
    )


async def _cache_score(ticker: str, comp: ComponentScores, db: AsyncSession) -> None:
    now = datetime.now(timezone.utc)
    expires = now + SCORE_CACHE_TTL
    existing = (
        await db.execute(select(ETFScoresCache).where(ETFScoresCache.ticker == ticker))
    ).scalar_one_or_none()

    if existing:
        existing.composite_score = comp.composite
        existing.cost_score = comp.cost
        existing.sharpe_score = comp.sharpe_3y
        existing.tracking_error_score = comp.tracking_error
        existing.liquidity_score = comp.liquidity_aum
        existing.components_json = json.dumps(
            {"sharpe_computed": comp.sharpe_computed}
        )
        existing.calculated_at = now
        existing.expires_at = expires
        existing.updated_at = now
    else:
        db.add(
            ETFScoresCache(
                ticker=ticker,
                composite_score=comp.composite,
                cost_score=comp.cost,
                sharpe_score=comp.sharpe_3y,
                tracking_error_score=comp.tracking_error,
                liquidity_score=comp.liquidity_aum,
                components_json=json.dumps({"sharpe_computed": comp.sharpe_computed}),
                calculated_at=now,
                expires_at=expires,
                created_at=now,
                updated_at=now,
            )
        )
    await db.flush()


# ── Public API ────────────────────────────────────────────────────────────────

async def calculate_composite_score(
    ticker: str,
    db: AsyncSession,
    rf_rate: float = 0.045,
    use_cache: bool = True,
) -> ScoredETF | None:
    meta = get_etf_metadata(ticker)
    if meta is None:
        return None

    if use_cache:
        cached = await _get_cached_score(ticker, db)
        if cached is not None:
            return ScoredETF(
                ticker=ticker,
                name=meta["name"],
                bucket=meta["bucket"],
                ter=meta["ter"],
                aum_b=meta.get("aum_b", 0.0),
                composite_score=cached.composite,
                components=cached,
            )

    # Fetch price history from DB (yfinance_client populates it separately)
    from app.db.models.price_history import PriceHistory
    from sqlalchemy import select as sa_select
    from datetime import date, timedelta

    cutoff = date.today() - timedelta(days=365 * 3 + 30)
    result = await db.execute(
        sa_select(PriceHistory.close_usd)
        .where(PriceHistory.ticker == ticker, PriceHistory.date >= cutoff)
        .order_by(PriceHistory.date.asc())
    )
    prices = [row[0] for row in result.fetchall()]

    comp = _build_components(
        ter=meta["ter"],
        aum_b=meta.get("aum_b", 0.0),
        prices=prices if prices else None,
        rf_rate=rf_rate,
    )
    await _cache_score(ticker, comp, db)

    return ScoredETF(
        ticker=ticker,
        name=meta["name"],
        bucket=meta["bucket"],
        ter=meta["ter"],
        aum_b=meta.get("aum_b", 0.0),
        composite_score=comp.composite,
        components=comp,
    )


async def rank_within_bucket(
    bucket_name: str, db: AsyncSession, rf_rate: float = 0.045
) -> list[ScoredETF]:
    etfs = get_etfs_in_bucket(bucket_name)
    # Bulk fetch cached scores for all tickers in bucket
    tickers = [etf["ticker"] for etf in etfs]
    from app.db.models.etf_scores_cache import ETFScoresCache
    result = await db.execute(
        select(ETFScoresCache).where(ETFScoresCache.ticker.in_(tickers))
    )
    cache_map = {row.ticker: row for row in result.scalars().all()}

    results: list[ScoredETF] = []
    for etf in etfs:
        ticker = etf["ticker"]
        row = cache_map.get(ticker)
        
        # Check if cache is valid
        if row and _utc(row.expires_at) >= datetime.now(timezone.utc):
            comp = ComponentScores(
                cost=row.cost_score or NEUTRAL_SCORE,
                sharpe_3y=row.sharpe_score or NEUTRAL_SCORE,
                tracking_error=row.tracking_error_score or NEUTRAL_SCORE,
                liquidity_aum=row.liquidity_score or NEUTRAL_SCORE,
                sharpe_computed=bool(row.sharpe_score),
            )
            results.append(ScoredETF(
                ticker=ticker,
                name=etf["name"],
                bucket=etf["bucket"],
                ter=etf["ter"],
                aum_b=etf.get("aum_b", 0.0),
                composite_score=comp.composite,
                components=comp,
            ))
        else:
            # Recalculate if missing or expired
            scored = await calculate_composite_score(ticker, db, rf_rate, use_cache=True)
            if scored:
                results.append(scored)

    results.sort(key=lambda x: x.composite_score, reverse=True)
    for i, s in enumerate(results, start=1):
        s.rank = i
    return results


async def build_shortlist(
    buckets: list[str], top_n: int, db: AsyncSession, rf_rate: float = 0.045
) -> list[str]:
    """Returns the top_n highest-scored tickers from each requested bucket."""
    shortlist: list[str] = []
    for bucket_name in buckets:
        ranked = await rank_within_bucket(bucket_name, db, rf_rate)
        shortlist.extend(s.ticker for s in ranked[:top_n])
    return shortlist


async def refresh_all_scores(db: AsyncSession, rf_rate: float = 0.045) -> int:
    tickers = get_universe_tickers()
    count = 0
    for ticker in sorted(tickers):
        scored = await calculate_composite_score(ticker, db, rf_rate, use_cache=False)
        if scored:
            count += 1
    logger.info("scores_refreshed", count=count)
    return count
