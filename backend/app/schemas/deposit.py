from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class DepositCalculateRequest(BaseModel):
    bucket_id: int
    amount: float = Field(gt=0)
    currency: str = "USD"

    @field_validator("currency")
    @classmethod
    def valid_currency(cls, v: str) -> str:
        if v.upper() not in {"ILS", "USD"}:
            raise ValueError("currency must be ILS or USD")
        return v.upper()


class OrderItem(BaseModel):
    ticker: str
    units: float
    est_price_usd: float
    est_total_usd: float


class PostDepositDrift(BaseModel):
    ticker: str
    target_pct: float
    projected_pct: float
    drift_pct: float


class DepositPlan(BaseModel):
    plan_token: str
    bucket_id: int
    amount_input: float
    currency: str
    amount_usd: float
    fx_rate: float | None         # ILS→USD rate used; None for USD deposits
    orders: list[OrderItem]
    total_allocated_usd: float
    remainder_usd: float
    post_deposit_drifts: list[PostDepositDrift]
    prices_stale: bool            # True if any price > 24h old
    warning: str | None           # sector hard-cap breach after deposit
    expires_at: datetime


class DepositConfirmRequest(BaseModel):
    plan_token: str


class DepositConfirmResponse(BaseModel):
    deposit_id: int
    bucket_id: int
    amount_usd: float
    orders_placed: int
    obsidian_file_path: str | None


class DepositLogResponse(BaseModel):
    id: int
    bucket_id: int
    amount: float
    currency: str
    fx_rate: float | None
    orders: list[OrderItem]
    obsidian_file_path: str | None
    created_at: datetime
