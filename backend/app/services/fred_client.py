from __future__ import annotations

import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.logging import get_logger
from app.db.models.macro_data import MacroData

logger = get_logger(__name__)

FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations"
DEFAULT_RF_RATE = 0.045  # 4.5% annual — fallback when FRED unavailable

# FRED series used by the app
SERIES_USDILS = "DEXISUS"    # USD to ILS exchange rate (units: ILS per USD)
SERIES_FEDFUNDS = "FEDFUNDS"  # Effective Federal Funds Rate (monthly %)


from app.services import settings_service

class FREDClient:
    def _utc(self, dt: datetime) -> datetime:
        """Treat naive datetimes (from SQLite) as UTC."""
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    async def get_latest(
        self,
        series_id: str,
        db: AsyncSession,
        max_age_hours: int = 24,
    ) -> float | None:
        """Return the most recent cached value for a series, refreshing if stale."""
        now = datetime.now(timezone.utc)
        stale_threshold = now - timedelta(hours=max_age_hours)

        result = await db.execute(
            select(MacroData)
            .where(MacroData.series_id == series_id)
            .order_by(MacroData.date.desc())
            .limit(1)
        )
        row = result.scalar_one_or_none()

        if row and self._utc(row.updated_at) > stale_threshold:
            return row.value

        fresh = await self._fetch_and_cache(series_id, db)
        if fresh is not None:
            return fresh
        
        # Fallback to cached if refresh failed
        return row.value if row else None

    async def _fetch_and_cache(
        self, series_id: str, db: AsyncSession
    ) -> float | None:
        fred_key = await settings_service.get_setting("fred_api_key", db)
        if not fred_key or not str(fred_key).strip():
            logger.info("FRED key not configured, using cached/default", series=series_id)
            return None

        api_key = str(fred_key).strip().lower()
        
        params = {
            "series_id": series_id,
            "api_key": api_key,
            "file_type": "json",
            "sort_order": "desc",
            "limit": "10",
            "observation_start": str(date.today() - timedelta(days=60)),
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(FRED_BASE_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            logger.warning("FRED fetch failed", series=series_id, error=str(exc))
            return None

        observations = data.get("observations", [])
        latest_value: float | None = None
        now = datetime.now(timezone.utc)

        for obs in observations:
            raw_val = obs.get("value", ".")
            if raw_val == ".":
                continue
            try:
                val = float(raw_val)
            except ValueError:
                continue

            obs_date = date.fromisoformat(obs["date"])
            existing = (
                await db.execute(
                    select(MacroData).where(
                        MacroData.series_id == series_id,
                        MacroData.date == obs_date,
                    )
                )
            ).scalar_one_or_none()

            if existing:
                existing.value = val
                existing.updated_at = now
            else:
                db.add(MacroData(series_id=series_id, date=obs_date, value=val, created_at=now, updated_at=now))

            if latest_value is None:
                latest_value = val

        await db.flush()
        return latest_value

    async def get_usd_ils_rate(self, db: AsyncSession) -> float | None:
        """Returns ILS per 1 USD (e.g. 3.70)."""
        return await self.get_latest(SERIES_USDILS, db)

    async def get_risk_free_rate(self, db: AsyncSession) -> float:
        """Returns annualized risk-free rate as decimal (e.g. 0.053 for 5.3%).
        Falls back to DEFAULT_RF_RATE if FRED unavailable."""
        val = await self.get_latest(SERIES_FEDFUNDS, db, max_age_hours=48)
        if val is None:
            return DEFAULT_RF_RATE
        return val / 100.0  # FEDFUNDS is in percent


fred_client = FREDClient()
