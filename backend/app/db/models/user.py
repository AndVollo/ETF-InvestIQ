from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    buckets: Mapped[list["GoalBucket"]] = relationship(  # type: ignore[name-defined]
        "GoalBucket", back_populates="user", lazy="select"
    )
    architect_sessions: Mapped[list["ArchitectSession"]] = relationship(  # type: ignore[name-defined]
        "ArchitectSession", back_populates="user", lazy="select"
    )
    reset_codes: Mapped[list["PasswordResetCode"]] = relationship(  # type: ignore[name-defined]
        "PasswordResetCode", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"
