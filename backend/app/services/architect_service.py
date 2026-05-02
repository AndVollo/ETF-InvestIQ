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

    tickers = list(returns)
    matrix: dict[str, dict[str, float]] = {t: {} for t in tickers}

    for i, t1 in enumerate(tickers):
        for j, t2 in enumerate(tickers):
            if i == j:
                matrix[t1][t2] = 1.0
                continue
            if j < i:
                matrix[t1][t2] = matrix[t2][t1]
                continue
            r1, r2 = returns[t1], returns[t2]
            n = min(len(r1), len(r2))
            if n < 10:
                matrix[t1][t2] = 0.0
                continue
            r1, r2 = r1[-n:], r2[-n:]
            mu1 = sum(r1) / n
            mu2 = sum(r2) / n
            cov = sum((r1[k] - mu1) * (r2[k] - mu2) for k in range(n)) / n
            std1 = math.sqrt(sum((x - mu1) ** 2 for x in r1) / n)
            std2 = math.sqrt(sum((x - mu2) ** 2 for x in r2) / n)
            if std1 == 0 or std2 == 0:
                matrix[t1][t2] = 0.0
            else:
                matrix[t1][t2] = round(cov / (std1 * std2), 4)
    return matrix


def _format_correlation_table(matrix: dict[str, dict[str, float]]) -> str:
    tickers = sorted(matrix)
    if not tickers:
        return "(no data)"
    header = "         " + "  ".join(f"{t:>6}" for t in tickers)
    rows = [header]
    for t1 in tickers:
        row = f"{t1:>8} " + "  ".join(
            f"{matrix[t1].get(t2, 0.0):>6.2f}" for t2 in tickers
        )
        rows.append(row)
    return "\n".join(rows)


def _generate_discovery_prompt(
    bucket: Any, profile: InvestorProfile, universe_summary: str
) -> str:
    return f"""You are a passive-investing analyst. Your task is to suggest ETF CANDIDATES for a long-term portfolio.

## Investor Profile
- Goal: {profile.goal_description}
- Target amount: {f"₪{profile.target_amount_ils:,.0f}" if profile.target_amount_ils else "Not specified"}
- Monthly deposit: {f"₪{profile.monthly_deposit_ils:,.0f}" if profile.monthly_deposit_ils else "Not specified"}
- Bucket horizon: {getattr(bucket, 'horizon_type', 'LONG')}
- Risk notes: {profile.risk_notes or "None"}

## Rules (STRICT — do not violate)
1. Only suggest tickers from the APPROVED UNIVERSE below.
2. Do NOT suggest leveraged, inverse, covered-call, or thematic ETFs.
3. REITs must not exceed 15% of total allocation.
4. Commodities (gold etc.) must not exceed 10%.
5. SHORT horizon buckets: bonds/cash only — no equity.
6. Suggest 4–10 tickers maximum.
7. No sell orders — this is a BUY-only system.

## Approved Universe
{universe_summary}

## Output format — return ONLY this JSON, nothing else:
{{
  "candidate_tickers": ["VT", "AVUV", "BND", "VNQ"]
}}"""


def _generate_engineer_prompt(
    shortlist: list[CandidateDetail],
    correlation_table: str,
    bucket_horizon: str,
) -> str:
    candidate_rows = []
    for c in shortlist:
        val = c.valuation or "N/A"
        score = f"{c.composite_score:.2f}" if c.composite_score is not None else "N/A"
        ter = f"{c.ter:.3f}%" if c.ter is not None else "N/A"
        candidate_rows.append(
            f"  {c.ticker:<8} score={score:>5}  valuation={val:<22} ter={ter}  category={c.bucket or 'N/A'}"
        )
    candidates_text = "\n".join(candidate_rows)

    return f"""You are a passive-investing portfolio engineer. Based on the mathematical data below, propose an ALLOCATION for the following validated ETF candidates.

## Candidate ETFs (pre-validated by backend)
{candidates_text}

## 3-Year Pearson Correlation Matrix (daily log returns)
{correlation_table}

## Rules (STRICT — do not violate)
1. Weights must sum to exactly 100%.
2. REITs total ≤ 15%.
3. Commodities total ≤ 10%.
4. Bucket horizon: {bucket_horizon}
   - SHORT → bonds/cash only
   - MEDIUM → equity ≤ 40%
5. Pairs with |correlation| > 0.85 are REDUNDANT — do not include both unless intentional.
6. Prefer CHEAP or FAIR valuation tickers over EXPENSIVE ones.
7. Provide a portfolio_rationale explaining your weighting decisions.

## Output format — return ONLY this JSON, nothing else:
{{
  "portfolio_rationale": "Explanation...",
  "target_allocation": [
    {{"ticker": "VT",   "weight_pct": 45.0}},
    {{"ticker": "AVUV", "weight_pct": 25.0}},
    {{"ticker": "BND",  "weight_pct": 30.0}}
  ]
}}"""


def _universe_summary() -> str:
    from app.services.universe_service import load_universe
    universe = load_universe()
    lines: list[str] = []
    for bucket_key, etfs in universe.get("etf_universe", {}).items():
        tickers = [e["ticker"] for e in etfs if isinstance(etfs, list)]
        constraint = ""
        if bucket_key == "REITS":
            constraint = " [max 15%]"
        elif bucket_key == "COMMODITIES_HEDGE":
            constraint = " [max 10%]"
        elif bucket_key == "ULTRA_SHORT_TERM":
            constraint = " [SHORT buckets only]"
        lines.append(f"  {bucket_key}{constraint}: {', '.join(tickers)}")
    return "\n".join(lines)


# ── DB helpers ────────────────────────────────────────────────────────────────

async def _get_session(session_id: int, db: AsyncSession) -> ArchitectSession:
    result = await db.execute(
        select(ArchitectSession).where(ArchitectSession.id == session_id)
    )
    s = result.scalar_one_or_none()
    if s is None:
        raise NotFoundError("architect_session", session_id)
    return s


async def _get_price_series(tickers: list[str], db: AsyncSession) -> dict[str, list[float]]:
    series: dict[str, list[float]] = {}
    cutoff = (datetime.now(timezone.utc).date()) - __import__("datetime").timedelta(days=365 * 3)
    for ticker in tickers:
        result = await db.execute(
            select(PriceHistory.close_usd)
            .where(PriceHistory.ticker == ticker, PriceHistory.date >= cutoff)
            .order_by(PriceHistory.date.asc())
        )
        prices = [float(r[0]) for r in result.fetchall()]
        if prices:
            series[ticker] = prices
    return series


# ── Public API ────────────────────────────────────────────────────────────────

async def start_session(
    bucket_id: int,
    profile: InvestorProfile,
    db: AsyncSession,
) -> ArchitectStartResponse:
    from app.services.bucket_service import get_active_bucket

    bucket = await get_active_bucket(bucket_id, db)
    universe_summary = _universe_summary()
    discovery_prompt = _generate_discovery_prompt(bucket, profile, universe_summary)

    now = datetime.now(timezone.utc)
    session = ArchitectSession(
        bucket_id=bucket_id,
        status="DRAFT",
        selected_buckets_json=json.dumps({"horizon_type": bucket.horizon_type}),
        shortlist_json=None,
        ai_proposal_json=None,
        final_allocation_json=None,
        rationale_text=None,
        sector_report_json=None,
        drawdown_report_json=None,
        confirmed_at=None,
        created_at=now,
        updated_at=now,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)

    logger.info("architect_session_started", session_id=session.id, bucket_id=bucket_id)
    return ArchitectStartResponse(
        session_id=session.id,
        bucket_id=bucket_id,
        discovery_prompt=discovery_prompt,
        status="DRAFT",
    )


async def ingest_candidates(
    session_id: int,
    tickers: list[str],
    db: AsyncSession,
) -> CandidateIngestResponse:
    session = await _get_session(session_id, db)
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

    session.shortlist_json = json.dumps([c.model_dump() for c in accepted])
    session.updated_at = datetime.now(timezone.utc)
    await db.flush()

    return CandidateIngestResponse(
        session_id=session_id,
        accepted=accepted,
        rejected=rejected,
    )


async def get_engineer_prompt(session_id: int, db: AsyncSession) -> EngineerPromptResponse:
    session = await _get_session(session_id, db)
    if not session.shortlist_json:
        raise ValidationError("error.architect_no_shortlist", {"session_id": session_id})

    shortlist = [CandidateDetail(**c) for c in json.loads(session.shortlist_json)]
    tickers = [c.ticker for c in shortlist]

    # Correlation matrix from 3yr price history
    price_series = await _get_price_series(tickers, db)
    correlation_matrix = _compute_correlation_matrix(price_series)
    corr_table = _format_correlation_table(correlation_matrix)

    bucket_info = json.loads(session.selected_buckets_json or "{}")
    horizon = bucket_info.get("horizon_type", "LONG")

    prompt = _generate_engineer_prompt(shortlist, corr_table, horizon)
    return EngineerPromptResponse(session_id=session_id, engineer_prompt=prompt, status=session.status)


def check_ucits_eligibility(
    allocation_map: dict[str, float],
    is_us_citizen: bool,
) -> UcitsAdvisory | None:
    """Inform the user about UCITS-domiciled peers when ≥50% of the allocation
    is US-domiciled and at least one ticker has a peer in the universe.

    Suppressed entirely for self-declared US citizens — those investors face
    PFIC tax treatment on foreign funds, so UCITS suggestions are dangerous.
    Returns None when no advisory is warranted.
    """
    if is_us_citizen or not allocation_map:
        return None

    us_pct = 0.0
    for ticker, pct in allocation_map.items():
        meta = get_etf_metadata(ticker)
        if meta and meta.get("domicile") == "US":
            us_pct += pct

    if us_pct < 50.0:
        return None

    suggestions: dict[str, list[str]] = {}
    for ticker in allocation_map:
        alts = get_ucits_alternatives(ticker)
        if alts:
            suggestions[ticker] = alts

    if not suggestions:
        return None

    return UcitsAdvisory(
        message_key="info.ucits_alternative_available",
        params={
            "us_pct": round(us_pct, 1),
            "suggestions": suggestions,
        },
    )


async def ingest_allocation(
    session_id: int,
    allocation: list[AllocationItem],
    rationale: str,
    db: AsyncSession,
) -> AllocationIngestResponse:
    session = await _get_session(session_id, db)
    if not session.shortlist_json:
        raise ValidationError("error.architect_no_shortlist", {"session_id": session_id})

    # Validate sum = 100
    total = sum(item.weight_pct for item in allocation)
    if abs(total - 100.0) > settings.allocation_sum_tolerance * 100:
        from app.core.exceptions import AllocationSumError
        raise AllocationSumError(total)

    # Validate all tickers were in shortlist
    accepted_tickers = {c["ticker"] for c in json.loads(session.shortlist_json)}
    for item in allocation:
        if item.ticker not in accepted_tickers:
            raise ValidationError("error.architect_ticker_not_in_shortlist", {"ticker": item.ticker})

    # Cap warnings (soft — don't block)
    from app.services.sector_service import check_target_allocation_caps
    holdings_map = {item.ticker: item.weight_pct for item in allocation}
    cap_warnings = check_target_allocation_caps(holdings_map)

    # Hard cap violations → block
    from app.core.exceptions import HardCapError
    for w in cap_warnings:
        if w.cap_type == "REITS" and w.actual_pct > settings.reit_hard_cap_pct:
            raise HardCapError("REITS", w.actual_pct, settings.reit_hard_cap_pct)
        if w.cap_type == "COMMODITIES_HEDGE" and w.actual_pct > settings.commodities_hard_cap_pct:
            raise HardCapError("COMMODITIES_HEDGE", w.actual_pct, settings.commodities_hard_cap_pct)

    # Horizon compatibility check
    bucket_info = json.loads(session.selected_buckets_json or "{}")
    horizon = bucket_info.get("horizon_type", "LONG")
    from app.core.validators import BucketAllocationCompatibility
    BucketAllocationCompatibility(
        bucket_horizon=horizon,
        holdings=holdings_map,
    )

    # Cooling-off: check if any existing holding changes by > large_change_threshold_pct
    cooling_off_until: datetime | None = None
    if session.bucket_id:
        existing_result = await db.execute(
            select(Holding).where(
                Holding.bucket_id == session.bucket_id,
                Holding.is_archived == False,  # noqa: E712
            )
        )
        existing = {h.ticker: h.target_pct for h in existing_result.scalars().all()}
        if existing:
            max_change = max(
                abs(holdings_map.get(t, 0.0) - existing.get(t, 0.0))
                for t in set(holdings_map) | set(existing)
            )
            if max_change >= settings.large_change_threshold_pct:
                cooling_off_until = datetime.now(timezone.utc) + timedelta(hours=settings.cooling_off_hours)

    new_status = "PENDING_REVIEW" if cooling_off_until else "DRAFT"
    session.ai_proposal_json = json.dumps([item.model_dump() for item in allocation])
    session.final_allocation_json = json.dumps([item.model_dump() for item in allocation])
    session.rationale_text = rationale
    session.status = new_status
    session.updated_at = datetime.now(timezone.utc)
    await db.flush()

    # UCITS advisory (informational only — never blocks confirm).
    from app.services import settings_service
    is_us_citizen_val = await settings_service.get_setting("is_us_citizen", db)
    is_us_citizen = bool(is_us_citizen_val) if is_us_citizen_val is not None else False
    ucits_advisory = check_ucits_eligibility(holdings_map, is_us_citizen)

    return AllocationIngestResponse(
        session_id=session_id,
        status=new_status,
        cap_warnings=[w.message_key for w in cap_warnings],
        cooling_off_until=cooling_off_until,
        validation_passed=True,
        ucits_advisory=ucits_advisory,
    )


async def confirm_session(session_id: int, db: AsyncSession) -> ArchitectConfirmResponse:
    session = await _get_session(session_id, db)
    if session.status not in ("DRAFT", "PENDING_REVIEW"):
        raise ValidationError("error.architect_session_wrong_status", {
            "status": session.status, "expected": "DRAFT or PENDING_REVIEW"
        })
    if not session.final_allocation_json:
        raise ValidationError("error.architect_no_allocation", {"session_id": session_id})

    # Cooling-off enforcement
    if session.status == "PENDING_REVIEW":
        cooling_off_end = session.updated_at + timedelta(hours=settings.cooling_off_hours)
        # Normalize to UTC
        if cooling_off_end.tzinfo is None:
            cooling_off_end = cooling_off_end.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) < cooling_off_end:
            raise ValidationError("error.architect_cooling_off", {
                "available_at": cooling_off_end.isoformat()
            })

    allocation = [AllocationItem(**a) for a in json.loads(session.final_allocation_json)]
    bucket_id = session.bucket_id
    if bucket_id is None:
        raise ValidationError("error.architect_no_bucket", {"session_id": session_id})

    now = datetime.now(timezone.utc)

    # Archive all existing active holdings
    existing_result = await db.execute(
        select(Holding).where(Holding.bucket_id == bucket_id, Holding.is_archived == False)  # noqa: E712
    )
    for h in existing_result.scalars().all():
        h.is_archived = True
        h.updated_at = now

    # Create new holdings from allocation
    for item in allocation:
        db.add(Holding(
            bucket_id=bucket_id,
            ticker=item.ticker,
            units=0.0,
            avg_cost_usd=None,
            target_pct=item.weight_pct,
            is_archived=False,
            notes=f"Architect session #{session_id}",
            created_at=now,
            updated_at=now,
        ))

    session.status = "CONFIRMED"
    session.confirmed_at = now
    session.updated_at = now
    await db.flush()

    # Obsidian journal entry (best-effort, never blocks)
    from app.db.models.bucket import GoalBucket
    from app.services import obsidian_service, settings_service
    bucket_row = await db.get(GoalBucket, bucket_id)
    bucket_name = bucket_row.name if bucket_row else f"Bucket {bucket_id}"
    vault_path = await settings_service.get_setting_str("obsidian_vault_path", db)
    journal_subfolder = await settings_service.get_setting_str(
        "obsidian_journal_subfolder", db, default="Investment Journal"
    )
    await obsidian_service.write_architect_journal(
        bucket_name=bucket_name,
        session_id=session_id,
        status="CONFIRMED",
        goal_description="",
        allocation=[item.model_dump() for item in allocation],
        rationale=session.rationale_text or "",
        cap_warnings=None,
        cooling_off_until=None,
        vault_path=vault_path,
        journal_subfolder=journal_subfolder,
    )

    logger.info("architect_confirmed", session_id=session_id, bucket_id=bucket_id, holdings=len(allocation))
    return ArchitectConfirmResponse(
        session_id=session_id,
        bucket_id=bucket_id,
        status="CONFIRMED",
        holdings_written=len(allocation),
        confirmed_at=now,
    )


async def get_session(session_id: int, db: AsyncSession) -> ArchitectSessionResponse:
    session = await _get_session(session_id, db)
    shortlist = (
        [CandidateDetail(**c) for c in json.loads(session.shortlist_json)]
        if session.shortlist_json else None
    )
    allocation = (
        [AllocationItem(**a) for a in json.loads(session.final_allocation_json)]
        if session.final_allocation_json else None
    )
    return ArchitectSessionResponse(
        session_id=session.id,
        bucket_id=session.bucket_id,
        status=session.status,
        shortlist=shortlist,
        final_allocation=allocation,
        rationale=session.rationale_text,
        created_at=session.created_at if session.created_at.tzinfo else session.created_at.replace(tzinfo=timezone.utc),
        updated_at=session.updated_at if session.updated_at.tzinfo else session.updated_at.replace(tzinfo=timezone.utc),
    )
