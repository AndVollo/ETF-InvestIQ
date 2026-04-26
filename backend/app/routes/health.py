from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "version": settings.app_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
