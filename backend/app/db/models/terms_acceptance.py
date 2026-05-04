from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TermsAcceptance(Base):
    """Append-only audit log of terms-of-use acceptances. Each row is legal
    evidence that a specific user accepted a specific version at a specific
    time, optionally from a recorded IP address.
    """

    __tablename__ = "terms_acceptances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    terms_version: Mapped[str] = mapped_column(String(20), nullable=False)
    terms_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)

    __table_args__ = (
        Index("idx_terms_acceptances_user_version", "user_id", "terms_version"),
    )

    def __repr__(self) -> str:
        return f"<TermsAcceptance user_id={self.user_id} version={self.terms_version}>"
