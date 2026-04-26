from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.holding import Holding
from app.db.session import get_db
from app.schemas.valuation import (
    PortfolioValuationResponse,
    RefreshResponse,
    ValuationResponse,
)
from app.services import valuation_service as svc

router = APIRouter(prefix="/valuation", tags=["valuation"])


def _to_response(res: svc.ValuationResult) -> ValuationResponse:
    return ValuationResponse(
        ticker=res.ticker,
        z_score=res.z_score,
        percentile_52w=res.percentile_52w,
        sma200_deviation=res.sma200_deviation,
        classification=res.classification,
        has_3y_history=res.has_3y_history,
        calculated_at=res.calculated_at,
        stale=res.stale,
    )


@router.get("/{ticker}", response_model=ValuationResponse)
async def get_valuation(
    ticker: str, db: AsyncSession = Depends(get_db)
) -> ValuationResponse:
    from app.services.universe_service import get_etf_metadata, is_blacklisted

    ticker = ticker.upper()
    blocked, reason = is_blacklisted(ticker)
    if blocked:
        raise HTTPException(
            status_code=400,
            detail={"message_key": "error.ticker_blacklisted", "params": {"ticker": ticker, "reason": reason}},
        )

    result = await svc.calculate_valuation(ticker, db)
    return _to_response(result)


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_all(db: AsyncSession = Depends(get_db)) -> RefreshResponse:
    ok, failed = await svc.refresh_valuations(db)
    from app.services.universe_service import get_universe_tickers

    total = len(get_universe_tickers())
    return RefreshResponse(
        refreshed=ok,
        insufficient_history=total - ok - len(failed),
        failed=len(failed),
        tickers_failed=failed,
    )


@router.get("/portfolio/{bucket_id}", response_model=PortfolioValuationResponse)
async def portfolio_valuation(
    bucket_id: int, db: AsyncSession = Depends(get_db)
) -> PortfolioValuationResponse:
    from app.db.models.bucket import GoalBucket
    from app.core.exceptions import NotFoundError, BucketArchivedError

    bucket = await db.get(GoalBucket, bucket_id)
    if not bucket:
        raise NotFoundError("bucket", bucket_id)
    if bucket.is_archived:
        raise BucketArchivedError(bucket_id)

    result = await db.execute(
        select(Holding.ticker).where(Holding.bucket_id == bucket_id)
    )
    tickers = [row[0] for row in result.fetchall()]

    valuations_map = await svc.bulk_calculate(tickers, db)
    return PortfolioValuationResponse(
        bucket_id=bucket_id,
        valuations=[_to_response(v) for v in valuations_map.values()],
    )
