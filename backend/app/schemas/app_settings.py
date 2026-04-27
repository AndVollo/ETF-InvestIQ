from __future__ import annotations

from pydantic import BaseModel


class SettingResponse(BaseModel):
    key: str
    value: object    # decoded from JSON


class SettingUpdate(BaseModel):
    value: object


class SettingsListResponse(BaseModel):
    settings: list[SettingResponse]
