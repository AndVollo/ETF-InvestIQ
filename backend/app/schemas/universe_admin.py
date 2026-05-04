from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


ALLOWED_DOMICILES = {"US", "IE", "LU"}
ALLOWED_DISTRIBUTIONS = {"Distributing", "Accumulating"}


class UniverseETFCreate(BaseModel):
    ticker: str = Field(min_length=1, max_length=15)
    name: str = Field(min_length=1, max_length=200)
    isin: str | None = Field(default=None, max_length=20)
    domicile: str
    distribution: str
    ucits: bool = False
    ter: float = Field(ge=0.0, le=5.0)
    aum_b: float = Field(default=0.0, ge=0.0)
    inception: date | None = None
    description_en: str | None = None
    description_he: str | None = None
    bucket_name: str = Field(min_length=1, max_length=40)

    @field_validator("ticker")
    @classmethod
    def upper_ticker(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("domicile")
    @classmethod
    def valid_domicile(cls, v: str) -> str:
        v = v.upper()
        if v not in ALLOWED_DOMICILES:
            raise ValueError(f"domicile must be one of {sorted(ALLOWED_DOMICILES)}")
        return v

    @field_validator("distribution")
    @classmethod
    def valid_distribution(cls, v: str) -> str:
        if v not in ALLOWED_DISTRIBUTIONS:
            raise ValueError(f"distribution must be one of {sorted(ALLOWED_DISTRIBUTIONS)}")
        return v


class UniverseETFUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    isin: str | None = Field(default=None, max_length=20)
    domicile: str | None = None
    distribution: str | None = None
    ucits: bool | None = None
    ter: float | None = Field(default=None, ge=0.0, le=5.0)
    aum_b: float | None = Field(default=None, ge=0.0)
    inception: date | None = None
    description_en: str | None = None
    description_he: str | None = None
    bucket_name: str | None = Field(default=None, min_length=1, max_length=40)
    is_active: bool | None = None

    @field_validator("domicile")
    @classmethod
    def valid_domicile(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.upper()
        if v not in ALLOWED_DOMICILES:
            raise ValueError(f"domicile must be one of {sorted(ALLOWED_DOMICILES)}")
        return v

    @field_validator("distribution")
    @classmethod
    def valid_distribution(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in ALLOWED_DISTRIBUTIONS:
            raise ValueError(f"distribution must be one of {sorted(ALLOWED_DISTRIBUTIONS)}")
        return v


class UniverseETFResponse(BaseModel):
    id: int
    ticker: str
    name: str
    isin: str | None
    domicile: str
    distribution: str
    ucits: bool
    ter: float
    aum_b: float
    inception: date | None
    description_en: str | None
    description_he: str | None
    bucket_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BlacklistEntryCreate(BaseModel):
    ticker: str = Field(min_length=1, max_length=15)
    reason: str = Field(min_length=1, max_length=500)

    @field_validator("ticker")
    @classmethod
    def upper_ticker(cls, v: str) -> str:
        return v.strip().upper()


class BlacklistEntryResponse(BaseModel):
    id: int
    ticker: str
    reason: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DiscoveryPromptResponse(BaseModel):
    prompt: str
    bucket_options: list[str]
    finviz_screener_url: str


class BulkImportItem(BaseModel):
    """Item shape expected from the AI bulk-import JSON."""
    ticker: str
    name: str
    bucket_name: str
    domicile: str = "US"
    distribution: str = "Distributing"
    ucits: bool = False
    ter: float = 0.0
    aum_b: float = 0.0
    isin: str | None = None
    inception: date | None = None
    description_en: str | None = None
    description_he: str | None = None
    fundamental_notes: str | None = None
    technical_notes: str | None = None
    evidence_sources: list[str] | None = None


class BulkImportRequest(BaseModel):
    items: list[BulkImportItem]


class BulkImportResultItem(BaseModel):
    ticker: str
    status: str  # "added" | "skipped_duplicate" | "skipped_blacklisted" | "error"
    detail: str | None = None


class BulkImportResponse(BaseModel):
    added: int
    skipped: int
    errors: int
    results: list[BulkImportResultItem]
