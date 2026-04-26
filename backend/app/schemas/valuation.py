from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ValuationResponse(BaseModel):
    ticker: str
    z_score: float | None
    percentile_52w: float | None
    sma200_deviation: float | None
    classification: str  # CHEAP | FAIR | EXPENSIVE | INSUFFICIENT_HISTORY
    has_3y_history: bool
    calculated_at: datetime
    stale: bool = False

    model_config = {"from_attributes": True}


class PortfolioValuationResponse(BaseModel):
    bucket_id: int
    valuations: list[ValuationResponse]


class RefreshResponse(BaseModel):
    refreshed: int
    insufficient_history: int
    failed: int
    tickers_failed: list[str]
