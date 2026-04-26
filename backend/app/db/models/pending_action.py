from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class PendingAction(Base, TimestampMixin):
    __tablename__ = "pending_actions"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    bucket_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("goal_buckets.id"), nullable=True
    )
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    bucket: Mapped["GoalBucket | None"] = relationship(  # type: ignore[name-defined]
        "GoalBucket", back_populates="pending_actions"
    )
