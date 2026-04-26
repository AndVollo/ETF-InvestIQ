from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class SectorCache(Base, TimestampMixin):
    __tablename__ = "sector_cache"

    ticker: Mapped[str] = mapped_column(String(20), primary_key=True)
    sector_weights_json: Mapped[str] = mapped_column(Text, nullable=False)
    top_holdings_json: Mapped[str] = mapped_column(Text, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (Index("idx_sector_cache_expires", "expires_at"),)
