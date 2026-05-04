from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


class BucketCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    horizon_type: str  # SHORT | MEDIUM | LONG
    initial_investment: float | None = Field(default=None, gt=0)
    target_amount: float | None = Field(default=None, gt=0)
    target_currency: str = "ILS"
    target_date: date | None = None
    description: str | None = None

    @field_validator("horizon_type")
    @classmethod
    def valid_horizon(cls, v: str) -> str:
        if v not in {"SHORT", "MEDIUM", "LONG"}:
            raise ValueError("horizon_type must be SHORT, MEDIUM, or LONG")
        return v

    @field_validator("target_currency")
    @classmethod
    def valid_currency(cls, v: str) -> str:
        if v not in {"ILS", "USD"}:
            raise ValueError("target_currency must be ILS or USD")
        return v


class BucketUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    initial_investment: float | None = Field(default=None, gt=0)
    target_amount: float | None = Field(default=None, gt=0)
    target_currency: str | None = None
    target_date: date | None = None
    description: str | None = None


class BucketResponse(BaseModel):
    id: int
    name: str
    horizon_type: str
    initial_investment: float | None
    target_amount: float | None
    target_currency: str
    target_date: date | None
    description: str | None
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HoldingDriftItem(BaseModel):
    id: int
    ticker: str
    units: float
    avg_cost_usd: float | None
    target_pct: float
    current_price_usd: float | None
    current_value_usd: float
    current_pct: float
    drift_pct: float          # current_pct - target_pct; negative = underweight
    notes: str | None


class BucketHoldingsResponse(BaseModel):
    bucket_id: int
    total_value_usd: float
    total_value_ils: float | None = None
    holdings: list[HoldingDriftItem]


class BucketSummaryResponse(BaseModel):
    id: int
    name: str
    horizon_type: str
    total_value_usd: float
    total_value_ils: float | None     # None if FX rate unavailable
    holdings_count: int
    initial_investment: float | None
    target_amount: float | None
    target_currency: str
    target_date: date | None
    goal_progress_pct: float | None   # None if no target_amount
    is_archived: bool


class GoalProgressResponse(BaseModel):
    bucket_id: int
    current_value_usd: float
    current_value_ils: float | None
    target_amount: float | None
    target_currency: str
    target_date: date | None
    progress_pct: float | None
    amount_remaining: float | None
    months_remaining: int | None


class PasswordConfirmation(BaseModel):
    password: str
