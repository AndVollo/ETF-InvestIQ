from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Float, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class MacroData(Base, TimestampMixin):
    __tablename__ = "macro_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    series_id: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. FEDFUNDS, DEXISUS
    date: Mapped[date] = mapped_column(Date, nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (
        UniqueConstraint("series_id", "date", name="uq_macro_series_date"),
        Index("idx_macro_series_date", "series_id", "date"),
    )
