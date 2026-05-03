from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utcnow


class GoalBucket(Base, TimestampMixin):
    __tablename__ = "goal_buckets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    horizon_type: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # SHORT | MEDIUM | LONG
    initial_investment: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_currency: Mapped[str] = mapped_column(String(3), default="ILS", nullable=False)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="buckets"
    )
    holdings: Mapped[list["Holding"]] = relationship(  # type: ignore[name-defined]
        "Holding", back_populates="bucket", cascade="all, delete-orphan"
    )
    deposit_logs: Mapped[list["DepositLog"]] = relationship(  # type: ignore[name-defined]
        "DepositLog", back_populates="bucket", cascade="all, delete-orphan"
    )
    architect_sessions: Mapped[list["ArchitectSession"]] = relationship(  # type: ignore[name-defined]
        "ArchitectSession", back_populates="bucket", cascade="all, delete-orphan"
    )
    drawdown_simulations: Mapped[list["DrawdownSimulation"]] = relationship(  # type: ignore[name-defined]
        "DrawdownSimulation", back_populates="bucket", cascade="all, delete-orphan"
    )
    pending_actions: Mapped[list["PendingAction"]] = relationship(  # type: ignore[name-defined]
        "PendingAction", back_populates="bucket", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_buckets_horizon", "horizon_type"),
        Index("idx_buckets_archived", "is_archived"),
    )

    def __repr__(self) -> str:
        return f"<GoalBucket id={self.id} name={self.name!r} horizon={self.horizon_type}>"
