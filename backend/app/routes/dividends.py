from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.schemas.dividend import DividendAnnualResponse, DividendHistoryResponse
from app.services import bucket_service, dividend_service

router = APIRouter(prefix="/dividends", tags=["dividends"])


@router.get("/annual/{bucket_id}", response_model=DividendAnnualResponse)
async def get_annual_income(
    bucket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DividendAnnualResponse:
    await bucket_service.get_user_bucket(bucket_id, current_user.id, db)
    return await dividend_service.get_annual_income(bucket_id, db)


@router.get("/history/{ticker}", response_model=DividendHistoryResponse)
async def get_dividend_history(
    ticker: str,
    years: int = Query(default=5, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DividendHistoryResponse:
    return await dividend_service.get_dividend_history(ticker.upper(), years, db)
