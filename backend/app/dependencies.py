from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db

# Re-export for convenience in routes
DBSession = AsyncGenerator[AsyncSession, None]


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> "User":  # type: ignore[name-defined]
    from app.db.models.user import User
    from app.services.auth_service import get_user_by_id

    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"message_key": "error.unauthorized", "params": {}},
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not authorization or not authorization.startswith("Bearer "):
        raise credentials_exc

    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exc

    user_id = payload.get("sub")
    if not isinstance(user_id, str):
        raise credentials_exc

    user = await get_user_by_id(int(user_id), db)
    if user is None or not user.is_active:
        raise credentials_exc

    return user
