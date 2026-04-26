from __future__ import annotations

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Smart ETF Portfolio Manager"
    app_version: str = "0.1.0"
    debug: bool = False

    # Database
    database_url: str = "sqlite+aiosqlite:///./smart_etf.db"
    database_url_sync: str = "sqlite:///./smart_etf.db"

    # FRED API
    fred_api_key: str = ""

    # Obsidian
    obsidian_vault_path: str = ""
    obsidian_journal_subfolder: str = "Investment Journal"

    # Universe
    universe_file: Path = Path(__file__).parent.parent / "data" / "etf_universe.yaml"

    # Cache TTLs (seconds)
    price_cache_ttl: int = 3600          # 1 hour
    sector_cache_ttl: int = 86400 * 7   # 7 days
    score_cache_ttl: int = 86400        # 1 day
    valuation_cache_ttl: int = 3600     # 1 hour
    macro_cache_ttl: int = 86400        # 1 day

    # Portfolio rules
    reit_hard_cap_pct: float = 15.0
    commodities_hard_cap_pct: float = 10.0
    medium_term_equity_cap_pct: float = 40.0
    allocation_sum_tolerance: float = 0.01
    large_change_threshold_pct: float = 30.0  # triggers cooling-off
    min_order_usd: float = 50.0               # aggregate orders below this

    # Cooling-off
    cooling_off_hours: int = 24

    @field_validator("universe_file", mode="before")
    @classmethod
    def resolve_universe_path(cls, v: str | Path) -> Path:
        return Path(v)


settings = Settings()
