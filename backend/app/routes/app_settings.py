from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.db.models.settings import SETTING_KEYS
from app.db.session import get_db
from app.schemas.app_settings import SettingResponse, SettingUpdate, SettingsListResponse
from app.services import settings_service

router = APIRouter(prefix="/settings", tags=["settings"])


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
