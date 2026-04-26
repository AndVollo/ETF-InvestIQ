from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.universe import (
    BlacklistCategoryResponse,
    BlacklistResponse,
    BucketInfo,
    ETFMetaResponse,
    ETFScoreResponse,
    ShortlistRequest,
    ShortlistResponse,
    UniverseListResponse,
    ValidateResponse,
    ComponentScoresResponse,
)
from app.services import scoring_service as svc_score
from app.services import universe_service as svc_uni
from app.services.fred_client import fred_client

router = APIRouter(prefix="/universe", tags=["universe"])


def _meta_from_dict(d: dict) -> ETFMetaResponse:
    return ETFMetaResponse(
        ticker=d["ticker"],
        name=d.get("name", ""),
        bucket=d["bucket"],
        ter=d.get("ter", 0.0),
        aum_b=d.get("aum_b"),
        inception=d.get("inception"),
        description_en=d.get("description_en", ""),
        description_he=d.get("description_he", ""),
    )


def _scored_to_response(scored: svc_score.ScoredETF) -> ETFScoreResponse:
    return ETFScoreResponse(
        ticker=scored.ticker,
        name=scored.name,
        bucket=scored.bucket,
        ter=scored.ter,
        aum_b=scored.aum_b,
        composite_score=round(scored.composite_score, 4),
        components=ComponentScoresResponse(
            cost=round(scored.components.cost, 4),
            sharpe_3y=round(scored.components.sharpe_3y, 4),
            tracking_error=round(scored.components.tracking_error, 4),
            liquidity_aum=round(scored.components.liquidity_aum, 4),
            sharpe_computed=scored.components.sharpe_computed,
        ),
        rank=scored.rank,
    )


@router.get("/", response_model=UniverseListResponse)
async def list_universe() -> UniverseListResponse:
    universe = svc_uni.load_universe()
    buckets_raw = universe.get("buckets", {})

    bucket_infos: list[BucketInfo] = []
    all_etfs: list[ETFMetaResponse] = []

    for bucket_name, bucket_data in buckets_raw.items():
        etfs_in = bucket_data.get("etfs", [])
        bucket_infos.append(
            BucketInfo(
                name=bucket_name,
                description_en=bucket_data.get("description_en", ""),
                description_he=bucket_data.get("description_he", ""),
                max_pct=bucket_data.get("max_pct"),
                allowed_horizon=bucket_data.get("allowed_horizon", []),
                etf_count=len(etfs_in),
            )
        )
        for etf in etfs_in:
            all_etfs.append(_meta_from_dict({**etf, "bucket": bucket_name}))

    return UniverseListResponse(
        version=svc_uni.get_universe_version(),
        total_etfs=len(all_etfs),
        buckets=bucket_infos,
        etfs=all_etfs,
    )


@router.get("/buckets", response_model=list[BucketInfo])
async def list_buckets() -> list[BucketInfo]:
    universe = svc_uni.load_universe()
    result: list[BucketInfo] = []
    for bucket_name, bucket_data in universe.get("buckets", {}).items():
        result.append(
            BucketInfo(
                name=bucket_name,
                description_en=bucket_data.get("description_en", ""),
                description_he=bucket_data.get("description_he", ""),
                max_pct=bucket_data.get("max_pct"),
                allowed_horizon=bucket_data.get("allowed_horizon", []),
                etf_count=len(bucket_data.get("etfs", [])),
            )
        )
    return result


@router.get("/scores/{bucket}", response_model=list[ETFScoreResponse])
async def scores_in_bucket(
    bucket: str, db: AsyncSession = Depends(get_db)
) -> list[ETFScoreResponse]:
    ranked = await svc_score.rank_within_bucket(bucket, db)
    return [_scored_to_response(s) for s in ranked]


@router.post("/shortlist", response_model=ShortlistResponse)
async def build_shortlist(
    body: ShortlistRequest, db: AsyncSession = Depends(get_db)
) -> ShortlistResponse:
    rf_rate = await fred_client.get_risk_free_rate(db)
    tickers = await svc_score.build_shortlist(body.buckets, body.top_n, db, rf_rate)

    scored: list[ETFScoreResponse] = []
    for ticker in tickers:
        s = await svc_score.calculate_composite_score(ticker, db, rf_rate)
        if s:
            scored.append(_scored_to_response(s))

    return ShortlistResponse(shortlist=tickers, scored=scored)


@router.get("/validate/{ticker}", response_model=ValidateResponse)
async def validate_ticker(ticker: str) -> ValidateResponse:
    ticker = ticker.upper()
    in_universe = ticker in svc_uni.get_universe_tickers()
    blacklisted, reason = svc_uni.is_blacklisted(ticker)
    return ValidateResponse(
        ticker=ticker,
        valid=in_universe and not blacklisted,
        in_universe=in_universe,
        blacklisted=blacklisted,
        blacklist_reason=reason if blacklisted else None,
    )


@router.get("/blacklist", response_model=BlacklistResponse)
async def get_blacklist() -> BlacklistResponse:
    bl = svc_uni.get_blacklist()
    categories: list[BlacklistCategoryResponse] = []

    for cat_name, cat_data in bl.items():
        if cat_name == "high_ter":
            continue
        categories.append(
            BlacklistCategoryResponse(
                category=cat_name,
                reason=cat_data.get("reason", ""),
                reason_he=cat_data.get("reason_he", ""),
                tickers=cat_data.get("tickers", []),
            )
        )

    high_ter = bl.get("high_ter", {})
    return BlacklistResponse(
        categories=categories,
        high_ter_threshold=high_ter.get("threshold", 0.50),
        high_ter_exceptions=high_ter.get("exceptions", []),
    )
