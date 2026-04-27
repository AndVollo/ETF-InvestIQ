from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.logging import get_logger
from app.schemas.sector import BucketSectorResponse, CapWarning, SectorExposureItem
from app.services.universe_service import get_etf_metadata
from app.services.yfinance_client import yfinance_client

logger = get_logger(__name__)

# yfinance fund_data returns sector names like these; map to canonical labels
_SECTOR_ALIASES: dict[str, str] = {
    "realestate": "Real Estate",
    "real estate": "Real Estate",
    "technology": "Technology",
    "financial services": "Financial Services",
    "financials": "Financial Services",
    "healthcare": "Healthcare",
    "health care": "Healthcare",
    "consumer cyclical": "Consumer Discretionary",
    "consumer defensive": "Consumer Staples",
    "industrials": "Industrials",
    "basic materials": "Basic Materials",
    "energy": "Energy",
    "utilities": "Utilities",
    "communication services": "Communication Services",
    "other": "Other",
}

# Default sector category for ETFs whose yfinance data is empty
_BUCKET_SECTOR_FALLBACK: dict[str, str] = {
    "GLOBAL_CORE": "Equity Blend",
    "US_FACTOR_VALUE": "US Small Cap Value",
    "INTL_FACTOR_VALUE": "International Value",
    "US_BONDS": "Fixed Income",
    "ULTRA_SHORT_TERM": "Cash / Ultra-Short",
    "REITS": "Real Estate",
    "COMMODITIES_HEDGE": "Commodities",
    "EMERGING_MARKETS": "Emerging Markets",
}


def _normalize_sector(raw: str) -> str:
    return _SECTOR_ALIASES.get(raw.lower().strip(), raw.strip().title())


async def get_bucket_sector_exposure(
    bucket_id: int, db: AsyncSession
) -> BucketSectorResponse:
    from app.services import bucket_service

    total_value, enriched = await bucket_service.get_holdings_with_drift(bucket_id, db)

    if total_value == 0 or not enriched:
        return BucketSectorResponse(
            bucket_id=bucket_id,
            total_value_usd=0.0,
            sector_exposures=[],
            cap_warnings=[],
            data_stale=False,
        )

    aggregated: dict[str, float] = {}
    data_stale = False
    estimated_sectors: set[str] = set()

    for h in enriched:
        ticker = h["ticker"]
        portfolio_weight = h["current_value_usd"] / total_value if total_value > 0 else 0.0
        if portfolio_weight == 0:
            continue

        sector_data = await yfinance_client.get_sector_data(ticker, db)
        raw_weights: dict[str, float] = sector_data.get("sector_weights", {})

        if not raw_weights:
            data_stale = True
            # Fall back to universe bucket category
            meta = get_etf_metadata(ticker)
            bucket_key = meta.get("bucket", "") if meta else ""
            fallback_sector = _BUCKET_SECTOR_FALLBACK.get(bucket_key, "Other")
            raw_weights = {fallback_sector: 1.0}
            estimated_sectors.add(ticker)

        for raw_sector, weight in raw_weights.items():
            sector = _normalize_sector(raw_sector)
            aggregated[sector] = aggregated.get(sector, 0.0) + weight * portfolio_weight * 100

    # Build sorted response
    exposures = [
        SectorExposureItem(
            sector=sector,
            pct=round(pct, 4),
            data_estimated=any(
                s in estimated_sectors
                for s in enriched
                if isinstance(s, str)  # guard; estimated_sectors uses ticker strings
            ),
        )
        for sector, pct in sorted(aggregated.items(), key=lambda x: -x[1])
    ]

    # Recompute data_estimated per sector properly (simplified: True if any holding used fallback)
    any_estimated = bool(estimated_sectors)
    for item in exposures:
        item.data_estimated = any_estimated

    cap_warnings = _check_bucket_caps(enriched)

    return BucketSectorResponse(
        bucket_id=bucket_id,
        total_value_usd=round(total_value, 4),
        sector_exposures=exposures,
        cap_warnings=cap_warnings,
        data_stale=data_stale,
    )


def _check_bucket_caps(enriched: list[dict[str, Any]]) -> list[CapWarning]:
    """Check REIT and Commodity hard caps against current portfolio weights."""
    total_value = sum(h["current_value_usd"] for h in enriched)
    if total_value == 0:
        return []

    reit_pct = 0.0
    comm_pct = 0.0
    for h in enriched:
        meta = get_etf_metadata(h["ticker"])
        if not meta:
            continue
        bucket = meta.get("bucket", "")
        weight = h["current_value_usd"] / total_value * 100
        if bucket == "REITS":
            reit_pct += weight
        elif bucket == "COMMODITIES_HEDGE":
            comm_pct += weight

    warnings: list[CapWarning] = []
    if reit_pct > settings.reit_hard_cap_pct:
        warnings.append(CapWarning(
            cap_type="REITS",
            actual_pct=round(reit_pct, 2),
            cap_pct=settings.reit_hard_cap_pct,
            message_key="warning.sector.reit_cap_breach",
            params={"actual": round(reit_pct, 2), "cap": settings.reit_hard_cap_pct},
        ))
    if comm_pct > settings.commodities_hard_cap_pct:
        warnings.append(CapWarning(
            cap_type="COMMODITIES_HEDGE",
            actual_pct=round(comm_pct, 2),
            cap_pct=settings.commodities_hard_cap_pct,
            message_key="warning.sector.commodities_cap_breach",
            params={"actual": round(comm_pct, 2), "cap": settings.commodities_hard_cap_pct},
        ))
    return warnings


def check_target_allocation_caps(holdings_target_pct: dict[str, float]) -> list[CapWarning]:
    """Pure check on proposed target allocation. Used by deposit + architect."""
    reit_pct = 0.0
    comm_pct = 0.0
    for ticker, pct in holdings_target_pct.items():
        meta = get_etf_metadata(ticker)
        if not meta:
            continue
        bucket = meta.get("bucket", "")
        if bucket == "REITS":
            reit_pct += pct
        elif bucket == "COMMODITIES_HEDGE":
            comm_pct += pct

    warnings: list[CapWarning] = []
    if reit_pct > settings.reit_hard_cap_pct:
        warnings.append(CapWarning(
            cap_type="REITS",
            actual_pct=round(reit_pct, 2),
            cap_pct=settings.reit_hard_cap_pct,
            message_key="warning.sector.reit_cap_breach",
            params={"actual": round(reit_pct, 2), "cap": settings.reit_hard_cap_pct},
        ))
    if comm_pct > settings.commodities_hard_cap_pct:
        warnings.append(CapWarning(
            cap_type="COMMODITIES_HEDGE",
            actual_pct=round(comm_pct, 2),
            cap_pct=settings.commodities_hard_cap_pct,
            message_key="warning.sector.commodities_cap_breach",
            params={"actual": round(comm_pct, 2), "cap": settings.commodities_hard_cap_pct},
        ))
    return warnings
