"""Idempotent seeder: load etf_universe.yaml into universe_etfs and
universe_blacklist tables on first run (when DB tables are empty).

The YAML remains as a fallback and historical reference, but the DB is
the source of truth from now on.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import yaml
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.logging import get_logger
from app.db.models.universe_blacklist import UniverseBlacklist
from app.db.models.universe_etf import UniverseETF

logger = get_logger(__name__)


def _parse_date(raw: Any) -> date | None:
    if raw is None:
        return None
    if isinstance(raw, date):
        return raw
    try:
        return datetime.strptime(str(raw), "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


async def seed_if_empty(db: AsyncSession) -> None:
    """Seed universe tables from YAML if they are empty.

    Safe to call on every startup — exits early when rows already exist.
    """
    existing = (await db.execute(select(UniverseETF.id).limit(1))).first()
    if existing is not None:
        return

    yaml_path: Path = settings.universe_file
    if not yaml_path.exists():
        logger.warning("universe_seed_skipped_no_yaml", path=str(yaml_path))
        return

    with yaml_path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    now = datetime.now(timezone.utc)
    etf_count = 0
    for bucket_name, bucket_data in (data.get("buckets") or {}).items():
        for etf in bucket_data.get("etfs", []):
            db.add(UniverseETF(
                ticker=etf["ticker"],
                name=etf.get("name", etf["ticker"]),
                isin=etf.get("isin"),
                domicile=etf.get("domicile", "US"),
                distribution=etf.get("distribution", "Distributing"),
                ucits=bool(etf.get("ucits", False)),
                ter=float(etf.get("ter", 0.0)),
                aum_b=float(etf.get("aum_b", 0.0)),
                inception=_parse_date(etf.get("inception")),
                description_en=etf.get("description_en"),
                description_he=etf.get("description_he"),
                bucket_name=bucket_name,
                is_active=True,
                created_at=now,
                updated_at=now,
            ))
            etf_count += 1

    seen_blacklist: dict[str, str] = {}
    for category, bl in (data.get("blacklist") or {}).items():
        if category == "high_ter":
            continue
        reason = bl.get("reason", category)
        for ticker in bl.get("tickers", []) or []:
            seen_blacklist.setdefault(ticker, reason)
    for ticker, reason in seen_blacklist.items():
        db.add(UniverseBlacklist(
            ticker=ticker,
            reason=reason,
            created_at=now,
            updated_at=now,
        ))
    blacklist_count = len(seen_blacklist)

    await db.commit()
    logger.info(
        "universe_seeded_from_yaml",
        etfs=etf_count,
        blacklisted=blacklist_count,
        version=data.get("version"),
    )
