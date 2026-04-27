from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class HoldingCreate(BaseModel):
    bucket_id: int
    ticker: str = Field(min_length=1, max_length=20)
    units: float = Field(ge=0)
    avg_cost_usd: float | None = Field(default=None, gt=0)
    target_pct: float = Field(gt=0, le=100)
    notes: str | None = None

    @field_validator("ticker")
    @classmethod
    def uppercase_ticker(cls, v: str) -> str:
        return v.upper().strip()


class HoldingUpdate(BaseModel):
    units: float | None = Field(default=None, ge=0)
    avg_cost_usd: float | None = Field(default=None, gt=0)
    target_pct: float | None = Field(default=None, gt=0, le=100)
    notes: str | None = None


class HoldingResponse(BaseModel):
    id: int
    bucket_id: int
    ticker: str
    units: float
    avg_cost_usd: float | None
    target_pct: float
    is_archived: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
