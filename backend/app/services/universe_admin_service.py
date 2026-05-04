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

def generate_discovery_prompt() -> str:
    """Generate a prompt the user pastes into ChatGPT/Claude. The AI is asked to
    suggest passive ETFs that fit the existing buckets, with metadata in JSON."""
    bucket_lines: list[str] = []
    for bucket_name, cfg in svc_uni.BUCKET_CONFIG.items():
        existing = svc_uni.get_etfs_in_bucket(bucket_name)
        existing_tickers = ", ".join(e["ticker"] for e in existing) or "(none)"
        constraint = ""
        if cfg["max_pct"] is not None:
            constraint = f" — max {cfg['max_pct']:.0f}% per portfolio"
        bucket_lines.append(
            f"  {bucket_name}{constraint}\n"
            f"    {cfg['description_en']}\n"
            f"    Already in universe: {existing_tickers}"
        )
    bucket_section = "\n".join(bucket_lines)

    return f"""You are a passive-investing ETF analyst. Suggest UP TO 10 NEW ETFs to add to a curated universe.

## Hard rules — DO NOT VIOLATE
1. Only suggest passively managed, broad-exposure ETFs from major issuers (Vanguard, iShares, SPDR, Schwab, Invesco, Avantis, Dimensional, Xtrackers, Amundi, JPMorgan, WisdomTree, Fidelity).
2. NEVER suggest leveraged, inverse, single-stock, covered-call, options-income, thematic-fad, or actively managed ETFs.
3. Each ETF must fit ONE of the buckets listed below. If it doesn't fit any bucket, do not suggest it.
4. Do NOT suggest tickers already in the universe (listed below per bucket).
5. TER must be ≤ 0.50%.
6. AUM must be ≥ $500M ($0.5B). Prefer ≥ $1B.
7. Inception date must be at least 3 years ago (need history for valuation/correlation).
8. ISIN is required for non-US (UCITS) ETFs. For US-domiciled ETFs ISIN is optional but preferred.

## Buckets (categories)
{bucket_section}

## Output — return ONLY valid JSON, no prose, no markdown fences:
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
      "description_en": "One-line factual description",
      "description_he": "תיאור עובדתי בשורה אחת"
    }}
  ]
}}
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
