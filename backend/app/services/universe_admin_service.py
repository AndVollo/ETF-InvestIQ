"""Universe admin service — CRUD on ETFs and blacklist, plus AI-assisted
discovery prompt generation and bulk import.

After every mutation, invalidate the universe_service in-memory cache.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.db.models.universe_blacklist import UniverseBlacklist
from app.db.models.universe_etf import UniverseETF
from app.schemas.universe_admin import (
    BlacklistEntryCreate,
    BulkImportRequest,
    BulkImportResponse,
    BulkImportResultItem,
    UniverseETFCreate,
    UniverseETFUpdate,
)
from app.services import universe_service as svc_uni

logger = get_logger(__name__)


# ── ETF CRUD ─────────────────────────────────────────────────────────────────

async def list_etfs(
    db: AsyncSession,
    bucket_name: str | None = None,
    include_inactive: bool = False,
) -> list[UniverseETF]:
    q = select(UniverseETF)
    if bucket_name:
        q = q.where(UniverseETF.bucket_name == bucket_name)
    if not include_inactive:
        q = q.where(UniverseETF.is_active == True)  # noqa: E712
    q = q.order_by(UniverseETF.bucket_name.asc(), UniverseETF.ticker.asc())
    result = await db.execute(q)
    return list(result.scalars().all())


async def _get_etf_by_ticker(ticker: str, db: AsyncSession) -> UniverseETF | None:
    result = await db.execute(
        select(UniverseETF).where(UniverseETF.ticker == ticker)
    )
    return result.scalar_one_or_none()


async def create_etf(payload: UniverseETFCreate, db: AsyncSession) -> UniverseETF:
    if payload.bucket_name not in svc_uni.BUCKET_CONFIG:
        raise ValidationError(
            "error.universe_unknown_bucket",
            {"bucket": payload.bucket_name, "valid": sorted(svc_uni.BUCKET_CONFIG)},
        )
    existing = await _get_etf_by_ticker(payload.ticker, db)
    if existing is not None:
        raise ValidationError("error.universe_duplicate_ticker", {"ticker": payload.ticker})

    now = datetime.now(timezone.utc)
    etf = UniverseETF(
        ticker=payload.ticker,
        name=payload.name,
        isin=payload.isin,
        domicile=payload.domicile,
        distribution=payload.distribution,
        ucits=payload.ucits,
        ter=payload.ter,
        aum_b=payload.aum_b,
        inception=payload.inception,
        description_en=payload.description_en,
        description_he=payload.description_he,
        bucket_name=payload.bucket_name,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    db.add(etf)
    await db.flush()
    await db.refresh(etf)
    svc_uni.invalidate_cache()
    logger.info("universe_etf_created", ticker=etf.ticker, bucket=etf.bucket_name)
    return etf


async def update_etf(ticker: str, payload: UniverseETFUpdate, db: AsyncSession) -> UniverseETF:
    etf = await _get_etf_by_ticker(ticker.upper(), db)
    if etf is None:
        raise NotFoundError("universe_etf", ticker)

    if payload.bucket_name is not None and payload.bucket_name not in svc_uni.BUCKET_CONFIG:
        raise ValidationError(
            "error.universe_unknown_bucket",
            {"bucket": payload.bucket_name, "valid": sorted(svc_uni.BUCKET_CONFIG)},
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(etf, field, value)
    etf.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(etf)
    svc_uni.invalidate_cache()
    logger.info("universe_etf_updated", ticker=etf.ticker)
    return etf


async def delete_etf(ticker: str, db: AsyncSession) -> None:
    """Hard delete — removes the ETF from the universe entirely."""
    etf = await _get_etf_by_ticker(ticker.upper(), db)
    if etf is None:
        raise NotFoundError("universe_etf", ticker)
    await db.delete(etf)
    await db.flush()
    svc_uni.invalidate_cache()
    logger.info("universe_etf_deleted", ticker=ticker)


# ── Blacklist ────────────────────────────────────────────────────────────────

async def list_blacklist(db: AsyncSession) -> list[UniverseBlacklist]:
    result = await db.execute(
        select(UniverseBlacklist).order_by(UniverseBlacklist.ticker.asc())
    )
    return list(result.scalars().all())


async def add_to_blacklist(payload: BlacklistEntryCreate, db: AsyncSession) -> UniverseBlacklist:
    existing = await db.execute(
        select(UniverseBlacklist).where(UniverseBlacklist.ticker == payload.ticker)
    )
    if existing.scalar_one_or_none() is not None:
        raise ValidationError("error.universe_already_blacklisted", {"ticker": payload.ticker})

    now = datetime.now(timezone.utc)
    entry = UniverseBlacklist(
        ticker=payload.ticker,
        reason=payload.reason,
        created_at=now,
        updated_at=now,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    svc_uni.invalidate_cache()
    logger.info("universe_blacklist_added", ticker=entry.ticker)
    return entry


async def remove_from_blacklist(ticker: str, db: AsyncSession) -> None:
    result = await db.execute(
        select(UniverseBlacklist).where(UniverseBlacklist.ticker == ticker.upper())
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError("universe_blacklist", ticker)
    await db.delete(entry)
    await db.flush()
    svc_uni.invalidate_cache()
    logger.info("universe_blacklist_removed", ticker=ticker)


# ── AI discovery + bulk import ───────────────────────────────────────────────

_FINVIZ_BASE = "https://finviz.com/screener.ashx"


def finviz_screener_url() -> str:
    """Pre-built finviz screener URL for ETFs with sane long-term filters.

    Free finviz allows manual viewing of the screener (no scraping). Filters:
      - ind_exchangetradedfund   ETFs only
      - sh_avgvol_o1000          avg volume > 1M shares (liquidity)
      - sh_curvol_o500           current volume > 500K (active today)
    Sorted by market cap descending. The user can adjust filters in the
    browser before manually copying tickers back into the AI flow.
    """
    filters = "ind_exchangetradedfund,sh_avgvol_o1000,sh_curvol_o500"
    return f"{_FINVIZ_BASE}?v=111&f={filters}&o=-marketcap"


def generate_discovery_prompt() -> str:
    """Bilingual, criteria-rich prompt for an external LLM (ChatGPT/Claude).

    Asks for passive ETFs that pass both fundamental and technical screens,
    instructs the model to cite sources (finviz, Morningstar, ETF.com, issuer
    pages), and constrains output to a strict JSON schema the backend can
    validate via bulk_import.
    """
    bucket_lines: list[str] = []
    for bucket_name, cfg in svc_uni.BUCKET_CONFIG.items():
        existing = svc_uni.get_etfs_in_bucket(bucket_name)
        existing_tickers = ", ".join(e["ticker"] for e in existing) or "(none)"
        constraint_parts: list[str] = []
        if cfg["max_pct"] is not None:
            constraint_parts.append(f"portfolio max {cfg['max_pct']:.0f}%")
        if cfg.get("allowed_horizon"):
            constraint_parts.append("horizon: " + "/".join(cfg["allowed_horizon"]))
        constraint = f" [{', '.join(constraint_parts)}]" if constraint_parts else ""
        bucket_lines.append(
            f"  {bucket_name}{constraint}\n"
            f"    {cfg['description_en']}\n"
            f"    Already in universe (DO NOT re-suggest): {existing_tickers}"
        )
    bucket_section = "\n".join(bucket_lines)

    return f"""You are a senior passive-investing ETF analyst. Your task: propose UP TO 10 NEW ETFs to add to a curated, long-term, buy-and-hold universe.

This is for an Israeli retail investor using a personal portfolio analytics tool. The output must be safe, conservative, and fact-checked — not aggressive picks.

═══════════════════════════════════════════════════════════════════
PART A — HARD ELIGIBILITY (fail any → reject the candidate)
═══════════════════════════════════════════════════════════════════
1. Issuer reputation: only major, established issuers — Vanguard, iShares (BlackRock), SPDR (State Street), Schwab, Invesco, Avantis, Dimensional, Xtrackers (DWS), Amundi, JPMorgan AM, WisdomTree, Fidelity, Franklin Templeton, First Trust (passive lines only).
2. Strategy: passively managed, rules-based, broad-exposure. NEVER suggest:
   - Leveraged (2x, 3x, -1x) or inverse ETFs
   - Single-stock ETFs or covered-call / options-income ETFs
   - Thematic fad ETFs (AI hype, cannabis, blockchain, meme themes)
   - Actively managed ETFs
   - ETNs (debt instruments, not funds)
   - Recently launched buzzword products
3. Costs: TER ≤ 0.50% annual. Strongly prefer ≤ 0.20%.
4. Size: AUM ≥ $500M. Strongly prefer ≥ $2B (avoids closure risk).
5. Age: Inception ≥ 3 years ago (need real history, not back-tests).
6. Liquidity: Avg daily volume ≥ 100K shares (US) or ≥ €1M turnover (UCITS).
7. Domicile: must be US, IE (UCITS), or LU. ISIN required for IE/LU; optional for US.
8. Bucket fit: each ETF must clearly belong to ONE bucket below. Don't force-fit.
9. Not already in universe (lists below per bucket).

═══════════════════════════════════════════════════════════════════
PART B — FUNDAMENTAL CRITERIA (use to rank within a bucket)
═══════════════════════════════════════════════════════════════════
- Tracking error vs benchmark: lower is better (target < 0.30% annual)
- Holdings concentration: top 10 holdings ≤ 50% of fund (for broad-exposure funds)
- Replication method: prefer physical full replication over synthetic/sampled
- Securities lending policy: prefer transparent disclosure
- Dividend policy fits the chosen distribution type (Distributing vs Accumulating)
- Issuer's track record on the same strategy (longevity, no past closures of similar funds)

═══════════════════════════════════════════════════════════════════
PART C — TECHNICAL CRITERIA (sanity check, not a stock-picking signal)
═══════════════════════════════════════════════════════════════════
- Price not in extreme drawdown from 52w high (within 25%)
- Trading above its 200-day SMA OR within 10% of it (avoids broken-trend funds)
- Bid-ask spread tight relative to NAV (< 0.10% for US-listed)
- No premium/discount > 1% to NAV in normal conditions
- Volume profile stable (no liquidity collapse over the past 6 months)

═══════════════════════════════════════════════════════════════════
PART D — DATA SOURCES TO CONSULT BEFORE SUGGESTING
═══════════════════════════════════════════════════════════════════
You MUST verify each candidate against multiple sources. Cite the source you used in `evidence_sources`. Suggested sources (use the ones you have current data for):
  - https://finviz.com/screener.ashx?v=111&f=ind_exchangetradedfund   (free ETF screener)
  - https://www.etf.com   (factsheets, holdings, comparisons)
  - https://www.morningstar.com   (ratings, fund analysis)
  - https://www.justetf.com   (UCITS-specific factsheets, very strong for IE/LU funds)
  - Issuer's official factsheet PDF (Vanguard, iShares, etc.) — most authoritative for TER and AUM
  - Yahoo Finance / yfinance (historical prices, dividend yield)

If you do NOT have current data on a candidate, DO NOT include it. Better to suggest 3 well-verified ETFs than 10 guesses.

═══════════════════════════════════════════════════════════════════
PART E — BUCKETS (categories you may target)
═══════════════════════════════════════════════════════════════════
{bucket_section}

═══════════════════════════════════════════════════════════════════
PART F — OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════
Return ONLY valid JSON. No prose before or after. No markdown code fences. No comments.

{{
  "items": [
    {{
      "ticker": "EXAMPLE",
      "name": "Example ETF Long Name",
      "bucket_name": "GLOBAL_CORE",
      "domicile": "US",
      "distribution": "Distributing",
      "ucits": false,
      "ter": 0.04,
      "aum_b": 12.3,
      "isin": "US0000000000",
      "inception": "2010-01-15",
      "description_en": "One-line factual description (what it tracks)",
      "description_he": "תיאור עובדתי בשורה אחת (מה הקרן עוקבת אחריו)",
      "fundamental_notes": "1-2 sentences on why this ETF is a strong fundamental pick (tracking error, holdings quality, issuer reputation).",
      "technical_notes": "1 sentence on current technical posture (vs SMA200, 52w position). Plain factual, no forecasts.",
      "evidence_sources": ["finviz.com", "issuer factsheet"]
    }}
  ]
}}

The backend will validate every field; bad/missing values get rejected silently. Quality > quantity. If you have nothing strong to add, return {{"items": []}}.
"""


async def bulk_import(payload: BulkImportRequest, db: AsyncSession) -> BulkImportResponse:
    """Validate AI-suggested ETFs and add the safe ones. Skip duplicates and
    blacklisted tickers; collect errors per item without aborting the batch."""
    valid_buckets = set(svc_uni.BUCKET_CONFIG.keys())
    blacklist = svc_uni.get_blacklist()
    existing_tickers = svc_uni.get_universe_tickers()

    results: list[BulkImportResultItem] = []
    added = 0
    skipped = 0
    errors = 0
    now = datetime.now(timezone.utc)

    for item in payload.items:
        ticker = item.ticker.strip().upper()

        if ticker in existing_tickers:
            results.append(BulkImportResultItem(ticker=ticker, status="skipped_duplicate"))
            skipped += 1
            continue
        if ticker in blacklist:
            results.append(BulkImportResultItem(
                ticker=ticker, status="skipped_blacklisted", detail=blacklist[ticker]
            ))
            skipped += 1
            continue
        if item.bucket_name not in valid_buckets:
            results.append(BulkImportResultItem(
                ticker=ticker, status="error",
                detail=f"unknown bucket '{item.bucket_name}'",
            ))
            errors += 1
            continue
        if item.ter < 0 or item.ter > 0.50:
            results.append(BulkImportResultItem(
                ticker=ticker, status="error",
                detail=f"TER {item.ter} out of allowed range 0–0.50",
            ))
            errors += 1
            continue
        if item.domicile.upper() not in {"US", "IE", "LU"}:
            results.append(BulkImportResultItem(
                ticker=ticker, status="error",
                detail=f"unsupported domicile '{item.domicile}'",
            ))
            errors += 1
            continue
        if item.distribution not in {"Distributing", "Accumulating"}:
            results.append(BulkImportResultItem(
                ticker=ticker, status="error",
                detail=f"invalid distribution '{item.distribution}'",
            ))
            errors += 1
            continue

        etf = UniverseETF(
            ticker=ticker,
            name=item.name.strip(),
            isin=item.isin,
            domicile=item.domicile.upper(),
            distribution=item.distribution,
            ucits=bool(item.ucits),
            ter=float(item.ter),
            aum_b=float(item.aum_b),
            inception=item.inception,
            description_en=item.description_en,
            description_he=item.description_he,
            bucket_name=item.bucket_name,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        db.add(etf)
        existing_tickers.add(ticker)  # prevent in-batch dupes
        results.append(BulkImportResultItem(ticker=ticker, status="added"))
        added += 1

    if added > 0:
        await db.flush()
        svc_uni.invalidate_cache()

    logger.info("universe_bulk_import", added=added, skipped=skipped, errors=errors)
    return BulkImportResponse(added=added, skipped=skipped, errors=errors, results=results)
