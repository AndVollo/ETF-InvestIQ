from __future__ import annotations

import sys
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _is_frozen() -> bool:
    """True when running inside a PyInstaller bundle (Tauri sidecar)."""
    return getattr(sys, "frozen", False)


def get_app_data_dir() -> Path:
    """Return the platform-specific app data directory."""
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "SmartETFManager"
    if sys.platform == "win32":
        return Path.home() / "AppData" / "Roaming" / "SmartETFManager"
    return Path.home() / ".local" / "share" / "SmartETFManager"


def _default_db_path() -> Path:
    """Local DB file in dev, app-data DB when frozen."""
    if _is_frozen():
        d = get_app_data_dir()
        d.mkdir(parents=True, exist_ok=True)
        return d / "portfolio.db"
    return Path("./smart_etf.db")


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

    # Database — derived from db_path so the same file is used by Alembic + runtime.
    db_path: Path = _default_db_path()

    @property
    def database_url(self) -> str:
        return f"sqlite+aiosqlite:///{self.db_path}"

    @property
    def database_url_sync(self) -> str:
        return f"sqlite:///{self.db_path}"

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
