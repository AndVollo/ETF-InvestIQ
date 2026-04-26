from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class ETFScoresCache(Base, TimestampMixin):
    __tablename__ = "etf_scores_cache"

    ticker: Mapped[str] = mapped_column(String(20), primary_key=True)
    composite_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    cost_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    sharpe_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    tracking_error_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    liquidity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    components_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
