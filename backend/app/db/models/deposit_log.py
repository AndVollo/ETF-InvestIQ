from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class DepositLog(Base, TimestampMixin):
    __tablename__ = "deposit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bucket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("goal_buckets.id"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)  # ILS | USD
    fx_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    orders_json: Mapped[str] = mapped_column(Text, nullable=False)
    portfolio_snapshot_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    obsidian_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    bucket: Mapped["GoalBucket"] = relationship(  # type: ignore[name-defined]
        "GoalBucket", back_populates="deposit_logs"
    )

    __table_args__ = (Index("idx_deposits_bucket_date", "bucket_id", "created_at"),)
