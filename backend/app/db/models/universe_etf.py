from __future__ import annotations

from datetime import date

from sqlalchemy import Boolean, Date, Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class UniverseETF(Base, TimestampMixin):
    __tablename__ = "universe_etfs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(15), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    isin: Mapped[str | None] = mapped_column(String(20), nullable=True)
    domicile: Mapped[str] = mapped_column(String(2), nullable=False)  # US, IE, LU
    distribution: Mapped[str] = mapped_column(String(15), nullable=False)  # Distributing | Accumulating
    ucits: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ter: Mapped[float] = mapped_column(Float, nullable=False)
    aum_b: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    inception: Mapped[date | None] = mapped_column(Date, nullable=True)
    description_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_he: Mapped[str | None] = mapped_column(Text, nullable=True)
    bucket_name: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index("idx_universe_bucket_active", "bucket_name", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<UniverseETF {self.ticker} bucket={self.bucket_name}>"
