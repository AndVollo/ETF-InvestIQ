from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class DrawdownSimulation(Base, TimestampMixin):
    __tablename__ = "drawdown_simulations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bucket_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("goal_buckets.id"), nullable=True
    )
    allocation_json: Mapped[str] = mapped_column(Text, nullable=False)
    portfolio_value_at_simulation: Mapped[float | None] = mapped_column(Float, nullable=True)
    portfolio_currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    scenarios_json: Mapped[str] = mapped_column(Text, nullable=False)
    worst_case_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    worst_case_amount: Mapped[float | None] = mapped_column(Float, nullable=True)

    bucket: Mapped["GoalBucket | None"] = relationship(  # type: ignore[name-defined]
        "GoalBucket", back_populates="drawdown_simulations"
    )
