from __future__ import annotations

import random
import string
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.core.security import create_access_token, hash_password, verify_password
from app.core.terms import TERMS_HASH, TERMS_VERSION
from app.db.models.bucket import GoalBucket
from app.db.models.password_reset import PasswordResetCode
from app.db.models.terms_acceptance import TermsAcceptance
from app.db.models.user import User
from app.schemas.auth import SignupRequest

logger = get_logger(__name__)

_RESET_CODE_TTL_MINUTES = 15
_RESET_CODE_LENGTH = 8


class AuthError(AppError):
    status_code = 401

    def __init__(self, key: str = "error.invalid_credentials") -> None:
        super().__init__(key, {})


class EmailTakenError(AppError):
    status_code = 409

    def __init__(self) -> None:
        super().__init__("error.email_taken", {})


class SmtpNotConfiguredError(AppError):
    status_code = 503

    def __init__(self) -> None:
        super().__init__("error.smtp_not_configured", {})


class TermsVersionMismatchError(AppError):
    status_code = 422

    def __init__(self, expected: str, got: str) -> None:
        super().__init__(
            "error.terms_version_mismatch",
            {"expected": expected, "got": got},
        )


async def record_terms_acceptance(
    user: User,
    version: str,
    db: AsyncSession,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    """Persist an audit row and update the user's cached latest-accepted version.
    Rejects acceptance attempts for any version other than the current one."""
    if version != TERMS_VERSION:
        raise TermsVersionMismatchError(expected=TERMS_VERSION, got=version)

    db.add(TermsAcceptance(
        user_id=user.id,
        terms_version=TERMS_VERSION,
        terms_hash=TERMS_HASH,
        accepted_at=datetime.now(timezone.utc),
        ip_address=ip_address,
        user_agent=user_agent[:500] if user_agent else None,
    ))
    user.latest_terms_version = TERMS_VERSION
    await db.flush()
    logger.info(
        "terms_accepted",
        user_id=user.id,
        version=TERMS_VERSION,
        hash=TERMS_HASH[:12],
    )


def _generate_code(length: int = _RESET_CODE_LENGTH) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


async def signup(
    payload: SignupRequest,
    db: AsyncSession,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[User, str]:
    if payload.terms_version_accepted != TERMS_VERSION:
        raise TermsVersionMismatchError(
            expected=TERMS_VERSION, got=payload.terms_version_accepted
        )

    existing = await db.execute(
        select(User).where(User.email == payload.email.lower())
    )
    if existing.scalar_one_or_none() is not None:
        raise EmailTakenError()

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Record terms acceptance — legal evidence row + cached latest version
    await record_terms_acceptance(
        user, payload.terms_version_accepted, db,
        ip_address=ip_address, user_agent=user_agent,
    )

    # Claim any orphaned buckets (created before auth was added)
    await db.execute(
        update(GoalBucket)
        .where(GoalBucket.user_id.is_(None))
        .values(user_id=user.id)
    )

    token = create_access_token(user.id, user.email)
    logger.info("user_signed_up", user_id=user.id, email=user.email)
    return user, token


async def login(email: str, password: str, db: AsyncSession) -> tuple[User, str]:
    result = await db.execute(
        select(User).where(User.email == email.lower(), User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.password_hash):
        raise AuthError()

    token = create_access_token(user.id, user.email)
    logger.info("user_logged_in", user_id=user.id)
    return user, token


async def get_user_by_id(user_id: int, db: AsyncSession) -> User | None:
    return await db.get(User, user_id)


async def forgot_password(email: str, db: AsyncSession) -> tuple[User | None, str | None]:
    """Returns (user, code) or (None, None) if email not found."""
    result = await db.execute(
        select(User).where(User.email == email.lower(), User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()
    if user is None:
        return None, None

    code = _generate_code()
    expires = datetime.now(timezone.utc) + timedelta(minutes=_RESET_CODE_TTL_MINUTES)
    record = PasswordResetCode(user_id=user.id, code=code, expires_at=expires)
    db.add(record)
    await db.flush()

    return user, code


async def reset_password(email: str, code: str, new_password: str, db: AsyncSession) -> None:
    result = await db.execute(
        select(User).where(User.email == email.lower())
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise AuthError("error.invalid_reset_code")

    now = datetime.now(timezone.utc)
    code_result = await db.execute(
        select(PasswordResetCode)
        .where(
            PasswordResetCode.user_id == user.id,
            PasswordResetCode.code == code.upper(),
            PasswordResetCode.expires_at > now,
            PasswordResetCode.used_at.is_(None),
        )
        .order_by(PasswordResetCode.created_at.desc())
        .limit(1)
    )
    reset_record = code_result.scalar_one_or_none()
    if reset_record is None:
        raise AuthError("error.invalid_reset_code")

    reset_record.used_at = now
    user.password_hash = hash_password(new_password)
    await db.flush()
    logger.info("password_reset", user_id=user.id)


async def change_password(
    user: User, current_password: str, new_password: str, db: AsyncSession
) -> None:
    if not verify_password(current_password, user.password_hash):
        raise AuthError("error.wrong_current_password")
    user.password_hash = hash_password(new_password)
    await db.flush()
    logger.info("password_changed", user_id=user.id)
