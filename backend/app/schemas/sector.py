from __future__ import annotations

from pydantic import BaseModel


class SectorExposureItem(BaseModel):
    sector: str
    pct: float           # 0–100, portfolio-weighted exposure
    data_estimated: bool  # True when sector weights came from fallback


class CapWarning(BaseModel):
    cap_type: str        # "REITS" | "COMMODITIES_HEDGE"
    actual_pct: float
    cap_pct: float
    message_key: str
    params: dict[str, object]


class HiddenStock(BaseModel):
    """A single stock that surfaces with combined ≥5% portfolio exposure
    via two or more ETFs in the bucket."""
    symbol: str
    total_exposure_pct: float
    appears_in: list[str]
    message_key: str
    params: dict[str, object]


class BucketSectorResponse(BaseModel):
    bucket_id: int
    total_value_usd: float
    sector_exposures: list[SectorExposureItem]
    cap_warnings: list[CapWarning]
    hidden_stocks: list[HiddenStock]
    data_stale: bool


class SectorRefreshResponse(BaseModel):
    tickers_refreshed: int
    stale: bool
