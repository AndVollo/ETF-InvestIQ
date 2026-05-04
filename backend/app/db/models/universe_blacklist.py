from __future__ import annotations

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class UniverseBlacklist(Base, TimestampMixin):
    __tablename__ = "universe_blacklist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(15), unique=True, nullable=False, index=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)

    def __repr__(self) -> str:
        return f"<UniverseBlacklist {self.ticker} reason={self.reason!r}>"
