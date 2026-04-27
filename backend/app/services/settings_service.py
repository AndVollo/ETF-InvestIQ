from __future__ import annotations

import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.db.models.settings import SETTING_KEYS, AppSetting


async def get_all_settings(db: AsyncSession) -> list[tuple[str, Any]]:
    result = await db.execute(select(AppSetting).order_by(AppSetting.key.asc()))
    rows = list(result.scalars().all())
    return [(r.key, json.loads(r.value_json)) for r in rows]


async def get_setting(key: str, db: AsyncSession) -> Any | None:
    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    row = result.scalar_one_or_none()
    return json.loads(row.value_json) if row else None


async def set_setting(key: str, value: Any, db: AsyncSession) -> None:
    if key not in SETTING_KEYS:
        raise ValidationError("error.setting_key_unknown", {"key": key})
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    row = result.scalar_one_or_none()
    if row:
        row.value_json = json.dumps(value)
        row.updated_at = now
    else:
        db.add(AppSetting(key=key, value_json=json.dumps(value), created_at=now, updated_at=now))
    await db.flush()


async def get_setting_str(key: str, db: AsyncSession, default: str = "") -> str:
    val = await get_setting(key, db)
    return str(val) if val is not None else default
