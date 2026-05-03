from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.schemas.sector import BucketSectorResponse, SectorRefreshResponse
from app.services import bucket_service, sector_service
from app.services.yfinance_client import yfinance_client

router = APIRouter(prefix="/sectors", tags=["sectors"])


@router.get("/{bucket_id}", response_model=BucketSectorResponse)
async def get_bucket_sectors(
    bucket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BucketSectorResponse:
    await bucket_service.get_user_bucket(bucket_id, current_user.id, db)
    return await sector_service.get_bucket_sector_exposure(bucket_id, db)


@router.post("/{bucket_id}/refresh", response_model=SectorRefreshResponse)
async def refresh_sector_cache(
    bucket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SectorRefreshResponse:
    await bucket_service.get_user_bucket(bucket_id, current_user.id, db)
    _, enriched = await bucket_service.get_holdings_with_drift(bucket_id, db)
    stale = False
    for h in enriched:
        data = await yfinance_client.get_sector_data(h["ticker"], db, force_refresh=True)
        if data.get("stale"):
            stale = True
    return SectorRefreshResponse(tickers_refreshed=len(enriched), stale=stale)
