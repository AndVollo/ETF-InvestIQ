#!/usr/bin/env python3
"""Seed the database with default settings rows."""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.db.models.settings import DEFAULT_SETTINGS, AppSetting


async def seed() -> None:
    engine = create_async_engine(settings.database_url)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as session:
        for key, value in DEFAULT_SETTINGS.items():
            existing = await session.get(AppSetting, key)
            if existing is None:
                session.add(AppSetting(key=key, value_json=json.dumps(value)))
                print(f"  seeded: {key} = {value!r}")
            else:
                print(f"  exists: {key}")
        await session.commit()

    await engine.dispose()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
