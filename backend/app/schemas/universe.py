from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Domicile = Literal["US", "IE", "LU"]
Distribution = Literal["Distributing", "Accumulating"]


class ETFMetaResponse(BaseModel):
    ticker: str
    name: str
    bucket: str
    isin: str | None = None
    domicile: Domicile = "US"
    distribution: Distribution = "Distributing"
    ucits: bool = False
    ter: float
    aum_b: float | None = None
    inception: str | None = None
    description_en: str = ""
    description_he: str = ""

    model_config = {"from_attributes": True}


class ComponentScoresResponse(BaseModel):
    cost: float
    sharpe_3y: float
    tracking_error: float
    liquidity_aum: float
    sharpe_computed: bool


class ETFScoreResponse(ETFMetaResponse):
    composite_score: float
    component_scores: ComponentScoresResponse
    rank: int = 0


class BucketInfo(BaseModel):
    name: str
    description_en: str
    description_he: str
    max_pct: float | None
    allowed_horizon: list[str]
    etf_count: int


class UniverseListResponse(BaseModel):
    version: str
    total_etfs: int
    buckets: list[BucketInfo]
    etfs: list[ETFScoreResponse]


class ShortlistRequest(BaseModel):
    buckets: list[str] = Field(min_length=1)
    top_n: int = Field(default=1, ge=1, le=5)


class ShortlistResponse(BaseModel):
    shortlist: list[str]
    scored: list[ETFScoreResponse]


class ValidateResponse(BaseModel):
    ticker: str
    valid: bool
    in_universe: bool
    blacklisted: bool
    blacklist_reason: str | None = None


class BlacklistCategoryResponse(BaseModel):
    category: str
    reason: str
    reason_he: str
    tickers: list[str]


class BlacklistResponse(BaseModel):
    categories: list[BlacklistCategoryResponse]
    high_ter_threshold: float
    high_ter_exceptions: list[str]
