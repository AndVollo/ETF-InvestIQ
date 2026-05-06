from __future__ import annotations

import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Any


# import yfinance as yf  # Moved to local imports to speed up startup
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.logging import get_logger
from app.db.models.price_history import PriceHistory
from app.db.models.sector_cache import SectorCache

logger = get_logger(__name__)

_DEFAULT_PERIOD_DAYS = 365 * 3 + 30  # 3 years + buffer


def _fetch_history_sync(ticker: str, start: date, end: date) -> list[dict[str, Any]]:
    """Synchronous yfinance call — run in thread pool."""
    import yfinance as yf
    t = yf.Ticker(ticker)
    df = t.history(start=str(start), end=str(end), interval="1d", auto_adjust=True)
    if df.empty:
        return []
    rows = []
    for idx, row in df.iterrows():
        rows.append(
            {
                "date": idx.date(),
                "close_usd": float(row["Close"]),
                "volume": int(row["Volume"]) if row["Volume"] else None,
            }
        )
    return rows


def _fetch_info_sync(ticker: str) -> dict[str, Any]:
    """Fetch ETF sector weights and top holdings — synchronous."""
    import yfinance as yf
    
    def fetch_for_ticker(t_str: str) -> tuple[dict[str, float], list[dict[str, Any]], bool]:
        t = yf.Ticker(t_str)
        sw: dict[str, float] = {}
        th_list: list[dict[str, Any]] = []
        success = False
        try:
            fd = t.funds_data
            if fd is not None:
                s_weightings = fd.sector_weightings
                if s_weightings is not None:
                    sw = {k: float(v) for k, v in s_weightings.items() if v}
                    success = True
                
                t_holdings = fd.top_holdings
                if t_holdings is not None and not t_holdings.empty:
                    # Normalize keys: yfinance columns vary between 'Symbol'/'Ticker', 'Name'/'Holding', 'Holding Percent'/'Percentage'
                    raw_dict = t_holdings.reset_index().to_dict("records")
                    for row in raw_dict:
                        normalized = {
                            "Symbol": row.get("Symbol") or row.get("Ticker"),
                            "Name": row.get("Name") or row.get("Holding"),
                            "Holding Percent": row.get("Holding Percent") or row.get("Percentage") or row.get("Weight", 0.0)
                        }
                        th_list.append(normalized)
                    success = True
        except Exception as exc:
            logger.warning("yfinance.funds_data failed", ticker=t_str, error=str(exc))
        return sw, th_list, success

    # Try base ticker
    sector_weights, top_holdings, success = fetch_for_ticker(ticker)
    
    # If failed and no suffix, try common UCITS suffixes
    if not success and "." not in ticker:
        for suffix in [".L", ".AS", ".DE", ".MI", ".PA"]:
            logger.info("Retrying with suffix", ticker=ticker, suffix=suffix)
            sw, th, ok = fetch_for_ticker(f"{ticker}{suffix}")
            if ok:
                sector_weights, top_holdings = sw, th
                break

    return {"sector_weights": sector_weights, "top_holdings": top_holdings}


class YFinanceClient:
    async def get_price_history(
        self,
        ticker: str,
        db: AsyncSession,
        days: int = _DEFAULT_PERIOD_DAYS,
        force_refresh: bool = False,
    ) -> list[PriceHistory]:
        end = date.today()
        start = end - timedelta(days=days)

        if not force_refresh:
            cached = await self._from_db(ticker, start, db)
            if len(cached) >= 30:
                return cached

        try:
            # Try base ticker
            rows = await asyncio.to_thread(_fetch_history_sync, ticker, start, end)
            
            # If failed and no suffix, try common UCITS suffixes
            if not rows and "." not in ticker:
                for suffix in [".L", ".AS", ".DE", ".MI", ".PA"]:
                    logger.info("Retrying history with suffix", ticker=ticker, suffix=suffix)
                    rows = await asyncio.to_thread(_fetch_history_sync, f"{ticker}{suffix}", start, end)
                    if rows:
                        break
        except Exception as exc:
            logger.warning("yfinance fetch failed", ticker=ticker, error=str(exc))
            return await self._from_db(ticker, start, db)  # stale fallback

        if rows:
            await self._upsert_rows(ticker, rows, db)

        return await self._from_db(ticker, start, db)

    async def _from_db(
        self, ticker: str, start: date, db: AsyncSession
    ) -> list[PriceHistory]:
        result = await db.execute(
            select(PriceHistory)
            .where(PriceHistory.ticker == ticker, PriceHistory.date >= start)
            .order_by(PriceHistory.date.asc())
        )
        return list(result.scalars().all())

    async def _upsert_rows(
        self, ticker: str, rows: list[dict[str, Any]], db: AsyncSession
    ) -> None:
        fetched_at = datetime.now(timezone.utc)
        for row in rows:
            existing = await db.execute(
                select(PriceHistory).where(
                    PriceHistory.ticker == ticker,
                    PriceHistory.date == row["date"],
                )
            )
            obj = existing.scalar_one_or_none()
            if obj is None:
                db.add(
                    PriceHistory(
                        ticker=ticker,
                        date=row["date"],
                        close_usd=row["close_usd"],
                        volume=row["volume"],
                        created_at=fetched_at,
                        updated_at=fetched_at,
                    )
                )
            else:
                obj.close_usd = row["close_usd"]
                obj.volume = row["volume"]
                obj.updated_at = fetched_at
        await db.flush()

    async def get_sector_data(
        self,
        ticker: str,
        db: AsyncSession,
        ttl_seconds: int = 86400 * 7,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        import json

        now = datetime.now(timezone.utc)

        if not force_refresh:
            result = await db.execute(
                select(SectorCache).where(SectorCache.ticker == ticker)
            )
            cached = result.scalar_one_or_none()
            def _utc(dt):
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

            if cached and _utc(cached.expires_at) > now:
                return {
                    "sector_weights": json.loads(cached.sector_weights_json),
                    "top_holdings": json.loads(cached.top_holdings_json),
                    "stale": False,
                }

        try:
            data = await asyncio.to_thread(_fetch_info_sync, ticker)
        except Exception as exc:
            logger.warning("yfinance info fetch failed", ticker=ticker, error=str(exc))
            data = {"sector_weights": {}, "top_holdings": []}

        expires_at = now + timedelta(seconds=ttl_seconds)
        existing = (
            await db.execute(select(SectorCache).where(SectorCache.ticker == ticker))
        ).scalar_one_or_none()

        if existing:
            existing.sector_weights_json = json.dumps(data["sector_weights"])
            existing.top_holdings_json = json.dumps(data["top_holdings"])
            existing.fetched_at = now
            existing.expires_at = expires_at
            existing.updated_at = now
        else:
            db.add(
                SectorCache(
                    ticker=ticker,
                    sector_weights_json=json.dumps(data["sector_weights"]),
                    top_holdings_json=json.dumps(data["top_holdings"]),
                    fetched_at=now,
                    expires_at=expires_at,
                    created_at=now,
                    updated_at=now,
                )
            )
        await db.flush()
        return {**data, "stale": not data["sector_weights"]}


yfinance_client = YFinanceClient()
