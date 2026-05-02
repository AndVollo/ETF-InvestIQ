from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, NotFoundError
from app.core.logging import get_logger
from app.db.models.settings import SETTING_KEYS
from app.db.session import get_db
from app.schemas.app_settings import SettingResponse, SettingUpdate, SettingsListResponse
from app.services import settings_service

logger = get_logger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])


class BackupResponse(BaseModel):
    path: str
    bytes: int


class _BackupFailedError(AppError):
    status_code = 503


@router.get("/", response_model=SettingsListResponse)
async def list_settings(db: AsyncSession = Depends(get_db)) -> SettingsListResponse:
    rows = await settings_service.get_all_settings(db)
    return SettingsListResponse(
        settings=[SettingResponse(key=k, value=v) for k, v in rows]
    )


@router.get("/{key}", response_model=SettingResponse)
async def get_setting(key: str, db: AsyncSession = Depends(get_db)) -> SettingResponse:
    value = await settings_service.get_setting(key, db)
    if value is None and key not in SETTING_KEYS:
        raise NotFoundError("setting", key)
    return SettingResponse(key=key, value=value)


@router.put("/{key}", response_model=SettingResponse)
async def update_setting(
    key: str, payload: SettingUpdate, db: AsyncSession = Depends(get_db)
) -> SettingResponse:
    await settings_service.set_setting(key, payload.value, db)
    return SettingResponse(key=key, value=payload.value)


@router.post("/backup", response_model=BackupResponse)
async def create_backup() -> BackupResponse:
    """Snapshot the live SQLite DB to a timestamped sibling file.

    Backups land next to the live DB so they share a filesystem (atomic
    copy, no cross-device move). The user can then sync them off-device
    however they want.
    """
    from scripts.backup_db import create_backup as _create_backup

    try:
        path = _create_backup()
    except FileNotFoundError as exc:
        raise _BackupFailedError("error.backup_db_missing", {"detail": str(exc)}) from exc
    except OSError as exc:
        logger.error("backup_failed", error=str(exc))
        raise _BackupFailedError("error.backup_failed", {"detail": str(exc)}) from exc

    return BackupResponse(path=str(path), bytes=path.stat().st_size)
