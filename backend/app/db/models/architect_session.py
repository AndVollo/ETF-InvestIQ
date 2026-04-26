from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class ArchitectSession(Base, TimestampMixin):
    __tablename__ = "architect_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bucket_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("goal_buckets.id"), nullable=True
    )
    # DRAFT | PENDING_REVIEW | CONFIRMED | ABANDONED
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT")
    selected_buckets_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    shortlist_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_proposal_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_allocation_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    rationale_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    sector_report_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    drawdown_report_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    bucket: Mapped["GoalBucket | None"] = relationship(  # type: ignore[name-defined]
        "GoalBucket", back_populates="architect_sessions"
    )
