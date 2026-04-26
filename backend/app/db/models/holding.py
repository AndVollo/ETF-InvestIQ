from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Holding(Base, TimestampMixin):
    __tablename__ = "holdings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bucket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("goal_buckets.id", ondelete="CASCADE"), nullable=False
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    units: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    avg_cost_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_pct: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    bucket: Mapped["GoalBucket"] = relationship(  # type: ignore[name-defined]
        "GoalBucket", back_populates="holdings"
    )

    __table_args__ = (
        UniqueConstraint("bucket_id", "ticker", name="uq_holdings_bucket_ticker"),
        Index("idx_holdings_bucket", "bucket_id"),
        Index("idx_holdings_ticker", "ticker"),
    )

    def __repr__(self) -> str:
        return f"<Holding bucket={self.bucket_id} ticker={self.ticker} target={self.target_pct}%>"
