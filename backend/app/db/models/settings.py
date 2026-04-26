from __future__ import annotations

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class AppSetting(Base, TimestampMixin):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value_json: Mapped[str] = mapped_column(Text, nullable=False)

    def __repr__(self) -> str:
        return f"<AppSetting key={self.key!r}>"


# Canonical setting keys
SETTING_KEYS = frozenset(
    [
        "language",            # "he" | "en"
        "base_currency",       # "ILS" | "USD"
        "fred_api_key",
        "obsidian_vault_path",
        "obsidian_journal_subfolder",
        "sector_thresholds_override",
        "theme",              # "light" | "dark" | "system"
        "rebalance_interval_months",
    ]
)

DEFAULT_SETTINGS: dict[str, object] = {
    "language": "he",
    "base_currency": "ILS",
    "fred_api_key": "",
    "obsidian_vault_path": "",
    "obsidian_journal_subfolder": "Investment Journal",
    "sector_thresholds_override": None,
    "theme": "system",
    "rebalance_interval_months": 3,
}
