from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

# Re-export for convenience in routes
DBSession = AsyncGenerator[AsyncSession, None]
