from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.dividend import DividendAnnualResponse, DividendHistoryResponse
from app.services import dividend_service

router = APIRouter(prefix="/dividends", tags=["dividends"])


@router.get("/annual/{bucket_id}", response_model=DividendAnnualResponse)
async def get_annual_income(
    bucket_id: int,
    db: AsyncSession = Depends(get_db),
) -> DividendAnnualResponse:
    return await dividend_service.get_annual_income(bucket_id, db)


@router.get("/history/{ticker}", response_model=DividendHistoryResponse)
async def get_dividend_history(
    ticker: str,
    years: int = Query(default=5, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
) -> DividendHistoryResponse:
    return await dividend_service.get_dividend_history(ticker.upper(), years, db)
