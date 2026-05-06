from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.db.models.architect_session import ArchitectSession
from app.db.models.holding import Holding
from app.db.models.price_history import PriceHistory
from app.schemas.architect import (
    AllocationItem,
    ArchitectConfirmResponse,
    ArchitectSessionResponse,
    ArchitectStartResponse,
    CandidateDetail,
    CandidateIngestResponse,
    EngineerPromptResponse,
    InvestorProfile,
    AllocationIngestResponse,
    UcitsAdvisory,
)
from app.services.universe_service import (
    get_etf_metadata,
    get_ucits_alternatives,
    get_universe_tickers,
    is_blacklisted,
)

logger = get_logger(__name__)


# ── Pure helpers ──────────────────────────────────────────────────────────────

def _compute_correlation_matrix(
    price_series: dict[str, list[float]],
) -> dict[str, dict[str, float]]:
    """Pearson correlation matrix from price series. Returns {ticker: {ticker: r}}."""
    # Compute log returns
    returns: dict[str, list[float]] = {}
    for ticker, prices in price_series.items():
        if len(prices) < 2:
            continue
        rets = [math.log(prices[i] / prices[i - 1]) for i in range(1, len(prices)) if prices[i - 1] > 0]
        if rets:
            returns[ticker] = rets

    tickers = list(returns.keys())
    matrix: dict[str, dict[str, float]] = {t: {} for t in tickers}

    for i, t1 in enumerate(tickers):
        for j, t2 in enumerate(tickers):
            if i == j:
                matrix[t1][t2] = 1.0
                continue
            if j < i:
                matrix[t1][t2] = matrix[t2][t1]
                continue

            r1 = returns[t1]
            r2 = returns[t2]
            # Align length (should be same if from same period, but be safe)
            n = min(len(r1), len(r2))
            if n < 5:
                matrix[t1][t2] = 0.0
                continue
            
            s1 = r1[:n]
            s2 = r2[:n]
            m1 = sum(s1) / n
            m2 = sum(s2) / n
            
            num = sum((x - m1) * (y - m2) for x, y in zip(s1, s2))
            den1 = math.sqrt(sum((x - m1)**2 for x in s1))
            den2 = math.sqrt(sum((y - m2)**2 for y in s2))
            
            if den1 * den2 == 0:
                matrix[t1][t2] = 0.0
            else:
                matrix[t1][t2] = num / (den1 * den2)

    return matrix


def _format_correlation_table(matrix: dict[str, dict[str, float]]) -> str:
    """Markdown table for the correlation matrix."""
    tickers = sorted(matrix.keys())
    if not tickers:
        return "No sufficient history for correlation."
    
    header = "| | " + " | ".join(tickers) + " |"
    sep = "|---|" + "---| " * len(tickers) + "|"
    rows = []
    for t1 in tickers:
        row_cells = [f"**{t1}**"]
        for t2 in tickers:
            val = matrix[t1].get(t2, 0.0)
            row_cells.append(f"{val:.2f}")
        rows.append("| " + " | ".join(row_cells) + " |")
    
    return "\n".join([header, sep] + rows)


def _generate_engineer_prompt(
    shortlist: list[CandidateDetail],
    correlation_table: str,
    horizon: str,
) -> str:
    """The 'System Prompt' for the LLM to design the portfolio."""
    valid_shortlist = [c for c in shortlist if c.is_valid]
    shortlist_txt = "\n".join([
        f"- {c.ticker}: Score {c.composite_score:.2f}, TER {c.ter or 'N/A'}, Bucket: {c.bucket}"
        for c in valid_shortlist
    ])

    return f"""Act as a Senior Quant Portfolio Engineer. 
Design a diversified ETF portfolio for a {horizon}-term horizon using only the candidates below.

Candidates:
{shortlist_txt}

Correlation Matrix (Log Returns, 3Y):
{correlation_table}

Rules:
1. Max allocation per ETF: 35%.
2. Min allocation per ETF: 5%.
3. Sum of weights MUST be 100%.
4. Optimization goal: Maximize diversified risk-adjusted returns (Sharpe) while keeping aggregate TER low.
5. Account for bucket membership (don't over-concentrate in one theme).

Output strictly as JSON:
{{
  "allocation": [
    {{ "ticker": "VTI", "weight_pct": 30 }},
    ...
  ],
  "rationale": "One paragraph explaining the design decisions."
}}
"""


# ── Internal DB helpers ───────────────────────────────────────────────────────

async def _get_session(session_id: int, db: AsyncSession, user_id: int | None = None) -> ArchitectSession:
    q = select(ArchitectSession).where(ArchitectSession.id == session_id)
    if user_id:
        q = q.where(ArchitectSession.user_id == user_id)
    session = (await db.execute(q)).scalar_one_or_none()
    if not session:
        raise NotFoundError("error.architect_session_not_found", {"session_id": session_id})
    return session


async def _get_price_series(tickers: list[str], db: AsyncSession) -> dict[str, list[float]]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=365 * 3 + 30)
    result = await db.execute(
        select(PriceHistory)
        .where(PriceHistory.ticker.in_(tickers), PriceHistory.date >= cutoff.date())
        .order_by(PriceHistory.ticker, PriceHistory.date.asc())
    )
    rows = result.scalars().all()
    
    series: dict[str, list[float]] = {t: [] for t in tickers}
    for r in rows:
        series[r.ticker].append(float(r.close_usd))
    return series


# ── Public Service API ────────────────────────────────────────────────────────

# Number of candidates to pick per bucket based on horizon
_BUCKET_ALLOCATION_BY_HORIZON = {
    "LONG": {
        "GLOBAL_CORE": 5,
        "US_FACTOR_VALUE": 3,
        "INTL_FACTOR_VALUE": 3,
        "US_FACTOR_MOMENTUM": 2,
        "EMERGING_MARKETS": 3,
        "TECH_GROWTH": 3,
        "REITS": 2,
        "COMMODITIES_HEDGE": 2,
    },
    "MEDIUM": {
        "GLOBAL_CORE": 4,
        "US_FACTOR_VALUE": 2,
        "INTL_FACTOR_VALUE": 2,
        "US_BONDS": 4,
        "EMERGING_MARKETS": 2,
        "REITS": 1,
    },
    "SHORT": {
        "GLOBAL_CORE": 2,
        "US_BONDS": 3,
        "ULTRA_SHORT_TERM": 3,
    },
}


async def start_session(
    bucket_id: int,
    profile: InvestorProfile,
    db: AsyncSession,
    user_id: int | None = None,
) -> ArchitectStartResponse:
    from app.services.bucket_service import get_active_bucket
    
    # Validate bucket exists and belongs to user
    await get_active_bucket(bucket_id, db)

    session = ArchitectSession(
        user_id=user_id,
        bucket_id=bucket_id,
        status="DRAFT",
        investor_profile_json=profile.model_dump_json(),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return ArchitectStartResponse(
        session_id=session.id,
        bucket_id=bucket_id,
        discovery_prompt="Please research current top ETFs for the requested buckets.",
        status=session.status,
    )


async def get_session(
    session_id: int, db: AsyncSession, user_id: int | None = None
) -> ArchitectSessionResponse:
    session = await _get_session(session_id, db, user_id=user_id)
    
    profile = None
    if session.investor_profile_json:
        profile = InvestorProfile.model_validate_json(session.investor_profile_json)

    shortlist = None
    if session.shortlist_json:
        shortlist = [CandidateDetail(**c) for c in json.loads(session.shortlist_json)]

    final_allocation = None
    if session.final_allocation_json:
        items = json.loads(session.final_allocation_json)
        final_allocation = [AllocationItem(**i) for i in items]

    return ArchitectSessionResponse(
        session_id=session.id,
        bucket_id=session.bucket_id,
        status=session.status,
        investor_profile=profile,
        shortlist=shortlist,
        final_allocation=final_allocation,
        rationale=session.rationale,
        drawdown_acknowledged_at=session.drawdown_acknowledged_at,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


async def select_auto_candidates(bucket_horizon: str, db: AsyncSession) -> tuple[list[str], dict[str, int]]:
    """Pick a diversified candidate shortlist for the given horizon.

    For each bucket in the horizon's allocation plan, ranks ETFs by composite
    score (cost + sharpe + tracking-error + liquidity) and takes the top-K.
    Falls back to TER ascending when scoring data is missing.

    Skips blacklisted tickers. Returns (ticker_list, picks_per_bucket).
    """
    from app.services import scoring_service

    plan = _BUCKET_ALLOCATION_BY_HORIZON.get(bucket_horizon.upper())
    if plan is None:
        plan = _BUCKET_ALLOCATION_BY_HORIZON["LONG"]

    chosen: list[str] = []
    picks_per_bucket: dict[str, int] = {}

    for bucket_name, k in plan.items():
        if k <= 0:
            continue
        ranked = await scoring_service.rank_within_bucket(bucket_name, db)
        # Drop blacklisted
        eligible = [r for r in ranked if not is_blacklisted(r.ticker)[0]]
        
        if not eligible:
            # Fallback: use raw universe order sorted by TER ascending
            from app.services.universe_service import get_etfs_in_bucket
            raw = sorted(get_etfs_in_bucket(bucket_name), key=lambda e: e.get("ter") if e.get("ter") is not None else 1.0)
            eligible_tickers = [
                e["ticker"] for e in raw if not is_blacklisted(e["ticker"])[0]
            ][:k]
            chosen.extend(eligible_tickers)
            picks_per_bucket[bucket_name] = len(eligible_tickers)
            continue

        top = [r.ticker for r in eligible[:k]]
        chosen.extend(top)
        picks_per_bucket[bucket_name] = len(top)

    return chosen, picks_per_bucket


async def auto_select_and_ingest(
    session_id: int, db: AsyncSession, user_id: int | None = None
) -> CandidateIngestResponse:
    from app.services.bucket_service import get_active_bucket
    
    session = await _get_session(session_id, db, user_id=user_id)
    if session.bucket_id is None:
        raise ValidationError("error.architect_no_bucket", {"session_id": session_id})

    try:
        bucket = await get_active_bucket(session.bucket_id, db)
        horizon = bucket.horizon_type
        
        if session.investor_profile_json:
            try:
                profile_data = json.loads(session.investor_profile_json)
                if isinstance(profile_data, dict) and "horizon_type" in profile_data:
                    horizon = profile_data["horizon_type"]
            except Exception as pe:
                logger.warning("architect_profile_parse_failed", session_id=session_id, error=str(pe))

        tickers, picks = await select_auto_candidates(horizon, db)
        logger.info(
            "architect_auto_selected",
            session_id=session_id,
            horizon=horizon,
            count=len(tickers),
            picks=picks,
        )
        return await ingest_candidates(session_id, tickers, db, user_id=user_id)
    except Exception as e:
        logger.exception("architect_auto_select_failed", session_id=session_id, error=str(e))
        raise ValidationError("error.architect_auto_select_failed", {"detail": str(e)})


async def ingest_candidates(
    session_id: int,
    tickers: list[str],
    db: AsyncSession,
    user_id: int | None = None,
) -> CandidateIngestResponse:
    session = await _get_session(session_id, db, user_id=user_id)
    if session.status not in ("DRAFT",):
        raise ValidationError("error.architect_session_wrong_status", {"status": session.status, "expected": "DRAFT"})

    valid_universe = get_universe_tickers()
    accepted: list[CandidateDetail] = []
    rejected: list[CandidateDetail] = []

    for raw_ticker in tickers:
        ticker = raw_ticker.upper().strip()
        blacklisted, bl_reason = is_blacklisted(ticker)

        if blacklisted:
            rejected.append(CandidateDetail(
                ticker=ticker, composite_score=None, valuation=None, z_score=None,
                ter=None, bucket=None, is_valid=False,
                rejection_reason=f"blacklisted:{bl_reason}",
            ))
            continue

        if ticker not in valid_universe:
            rejected.append(CandidateDetail(
                ticker=ticker, composite_score=None, valuation=None, z_score=None,
                ter=None, bucket=None, is_valid=False,
                rejection_reason="not_in_universe",
            ))
            continue

        try:
            meta = get_etf_metadata(ticker) or {}
            ter = meta.get("ter")

            # Try to get cached score + valuation
            from app.db.models.etf_scores_cache import ETFScoresCache
            from app.db.models.valuation_cache import ValuationCache

            score_row = (await db.execute(
                select(ETFScoresCache).where(ETFScoresCache.ticker == ticker)
            )).scalar_one_or_none()

            val_row = (await db.execute(
                select(ValuationCache).where(ValuationCache.ticker == ticker)
            )).scalar_one_or_none()

            composite_score = score_row.composite_score if score_row else None
            valuation = val_row.classification if val_row else None
            z_score = val_row.z_score if val_row else None

            accepted.append(CandidateDetail(
                ticker=ticker,
                composite_score=round(composite_score, 4) if composite_score is not None else None,
                valuation=valuation,
                z_score=round(z_score, 4) if z_score is not None else None,
                ter=ter,
                bucket=meta.get("bucket"),
                is_valid=True,
                rejection_reason=None,
            ))
        except Exception as ticker_err:
            logger.error("architect_ticker_ingest_failed", ticker=ticker, error=str(ticker_err))
            rejected.append(CandidateDetail(
                ticker=ticker, composite_score=None, valuation=None, z_score=None,
                ter=None, bucket=None, is_valid=False,
                rejection_reason=f"error:{str(ticker_err)}",
            ))

    session.shortlist_json = json.dumps([c.model_dump() for c in accepted + rejected])
    session.updated_at = datetime.now(timezone.utc)
    await db.flush()

    return CandidateIngestResponse(
        session_id=session_id,
        accepted=accepted,
        rejected=rejected,
    )


async def get_engineer_prompt(
    session_id: int, db: AsyncSession, user_id: int | None = None
) -> EngineerPromptResponse:
    session = await _get_session(session_id, db, user_id=user_id)
    if not session.shortlist_json:
        raise ValidationError("error.architect_no_shortlist", {"session_id": session_id})

    shortlist = [CandidateDetail(**c) for c in json.loads(session.shortlist_json)]
    tickers = [c.ticker for c in shortlist if c.is_valid]

    # Correlation matrix from 3yr price history
    price_series = await _get_price_series(tickers, db)
    correlation_matrix = _compute_correlation_matrix(price_series)
    corr_table = _format_correlation_table(correlation_matrix)

    profile_data = json.loads(session.investor_profile_json or "{}")
    horizon = profile_data.get("horizon_type", "LONG")

    prompt = _generate_engineer_prompt(shortlist, corr_table, horizon)
    return EngineerPromptResponse(session_id=session_id, engineer_prompt=prompt, status=session.status)


def check_ucits_eligibility(
    allocation_map: dict[str, float],
    is_us_citizen: bool,
) -> UcitsAdvisory | None:
    """Inform the user about UCITS-domiciled peers when \u226550% of the allocation
    is US-domiciled and peer UCITS versions exist.
    """
    if is_us_citizen:
        return None

    us_domiciled_pct = 0.0
    suggestions: dict[str, list[str]] = {}

    for ticker, weight in allocation_map.items():
        meta = get_etf_metadata(ticker)
        if meta and meta.get("domicile") == "US":
            us_domiciled_pct += weight
            alts = get_ucits_alternatives(ticker)
            if alts:
                suggestions[ticker] = alts

    if us_domiciled_pct >= 50.0 and suggestions:
        return UcitsAdvisory(
            message_key="architect.ucits_nudge",
            params={
                "us_pct": round(us_domiciled_pct, 1),
                "suggestions": suggestions,
            }
        )
    return None


async def ingest_allocation(
    session_id: int,
    allocation: list[AllocationItem],
    rationale: str,
    db: AsyncSession,
    user_id: int | None = None,
) -> AllocationIngestResponse:
    session = await _get_session(session_id, db, user_id=user_id)
    
    # 1. Basic validation
    if abs(sum(a.weight_pct for a in allocation) - 100.0) > 0.01:
        raise ValidationError("error.architect_allocation_sum", {"sum": sum(a.weight_pct for a in allocation)})

    # 2. Check shortlist membership
    shortlist = [CandidateDetail(**c) for c in json.loads(session.shortlist_json or "[]")]
    valid_tickers = {c.ticker for c in shortlist if c.is_valid}
    
    # Expand allowed tickers to include UCITS peers of the shortlisted tickers
    allowed_tickers = set(valid_tickers)
    from app.services.universe_service import get_ucits_alternatives
    for t in valid_tickers:
        alts = get_ucits_alternatives(t)
        if alts:
            allowed_tickers.update(alts)

    for item in allocation:
        if item.ticker not in allowed_tickers:
            raise ValidationError("error.architect_ticker_not_in_shortlist", {"ticker": item.ticker})

    # 3. UCITS nudge
    # In this MVP we assume non-US citizen for nudge logic unless explicitly set.
    # We could pull this from user settings in the future.
    ucits = check_ucits_eligibility({a.ticker: a.weight_pct for a in allocation}, is_us_citizen=False)

    session.rationale_text = rationale
    session.final_allocation_json = json.dumps([a.model_dump() for a in allocation])
    session.status = "PENDING_REVIEW"
    session.updated_at = datetime.now(timezone.utc)
    
    await db.commit()

    return AllocationIngestResponse(
        session_id=session_id,
        status=session.status,
        cap_warnings=[],
        cooling_off_until=None,
        validation_passed=True,
        ucits_advisory=ucits,
    )


async def review_drawdown(
    session_id: int, db: AsyncSession, user_id: int | None = None
) -> DrawdownSimulationResponse:
    session = await _get_session(session_id, db, user_id=user_id)
    if not session.final_allocation_json:
        raise ValidationError("error.architect_no_allocation", {"session_id": session_id})

    from app.services.drawdown_service import simulate_proposed_allocation
    
    allocation = {
        item["ticker"]: item["weight_pct"]
        for item in json.loads(session.final_allocation_json)
    }
    
    # Get current capital from profile
    profile = json.loads(session.investor_profile_json or "{}")
    current_capital = profile.get("current_capital", 0.0)

    report = await simulate_proposed_allocation(allocation, current_capital, db)
    
    session.drawdown_acknowledged_at = datetime.now(timezone.utc)
    session.status = "CONFIRMED_READY"
    await db.commit()
    
    return report


async def confirm_session(
    session_id: int, db: AsyncSession, user_id: int | None = None
) -> ArchitectConfirmResponse:
    session = await _get_session(session_id, db, user_id=user_id)
    if session.status != "CONFIRMED_READY":
        raise ValidationError("error.architect_not_ready", {"status": session.status})

    allocation = json.loads(session.final_allocation_json)
    
    # Write to holdings
    holdings_written = 0
    for item in allocation:
        ticker = item["ticker"]
        weight = item["weight_pct"]
        
        # Check if exists
        q = select(Holding).where(Holding.bucket_id == session.bucket_id, Holding.ticker == ticker)
        existing = (await db.execute(q)).scalar_one_or_none()
        
        if existing:
            existing.target_pct = weight
            existing.updated_at = datetime.now(timezone.utc)
        else:
            new_holding = Holding(
                bucket_id=session.bucket_id,
                ticker=ticker,
                target_pct=weight,
                units=0.0,
                is_archived=False,
            )
            db.add(new_holding)
        holdings_written += 1

    session.status = "COMPLETED"
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return ArchitectConfirmResponse(
        session_id=session.id,
        bucket_id=session.bucket_id,
        status=session.status,
        holdings_written=holdings_written,
        confirmed_at=session.updated_at,
    )
