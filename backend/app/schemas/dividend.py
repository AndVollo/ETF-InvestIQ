from __future__ import annotations

from pydantic import BaseModel


class HoldingDividend(BaseModel):
    ticker: str
    units: float
    forward_yield_pct: float | None
    annual_income_usd: float
    data_available: bool


class DividendAnnualResponse(BaseModel):
    bucket_id: int
    total_annual_usd: float
    holdings: list[HoldingDividend]


class DividendRecord(BaseModel):
    date: str
    amount_usd: float


class DividendHistoryResponse(BaseModel):
    ticker: str
    years: int
    records: list[DividendRecord]
