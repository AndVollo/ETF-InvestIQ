from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class ValuationCache(Base, TimestampMixin):
    __tablename__ = "valuation_cache"

    ticker: Mapped[str] = mapped_column(String(20), primary_key=True)
    z_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    percentile_52w: Mapped[float | None] = mapped_column(Float, nullable=True)
    sma200_deviation: Mapped[float | None] = mapped_column(Float, nullable=True)
    # CHEAP | FAIR | EXPENSIVE | INSUFFICIENT_HISTORY
    classification: Mapped[str | None] = mapped_column(String(30), nullable=True)
    has_3y_history: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
