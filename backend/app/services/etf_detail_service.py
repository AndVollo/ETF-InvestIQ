from __future__ import annotations

import asyncio
from datetime import date, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.price_history import PriceHistory
from app.services.universe_service import get_etf_metadata
from app.services.yfinance_client import yfinance_client
from app.services.scoring_service import calculate_composite_score
from app.services.fred_client import fred_client


async def get_etf_returns(ticker: str, db: AsyncSession) -> list[dict[str, Any]]:
    periods = {
        "1Y": 365,
        "3Y": 365 * 3,
        "5Y": 365 * 5,
        "10Y": 365 * 10,
    }
    
    # Ensure we have enough history in DB
    # We might need to trigger a fetch if DB is empty for these periods
    # For now, let's try to fetch from DB
    
    today = date.today()
    results = []
    
    # 1. Ensure we have history (Fetch max period needed once)
    max_days = max(periods.values())
    try:
        await yfinance_client.get_price_history(ticker, db, days=max_days + 30)
    except Exception as e:
        logger.warning("Failed to fetch history for returns", ticker=ticker, error=str(e))

    # 2. Get current price
    curr_res = await db.execute(
        select(PriceHistory.close_usd)
        .where(PriceHistory.ticker == ticker)
        .order_by(PriceHistory.date.desc())
        .limit(1)
    )
    curr_price = curr_res.scalar_one_or_none()
    
    if not curr_price:
        return [{"period": p, "value": None} for p in periods.keys()]

    # 3. Calculate for each period
    for label, days in periods.items():
        target_date = today - timedelta(days=days)
        past_res = await db.execute(
            select(PriceHistory.close_usd, PriceHistory.date)
            .where(PriceHistory.ticker == ticker, PriceHistory.date >= target_date)
            .order_by(PriceHistory.date.asc())
            .limit(1)
        )
        row = past_res.first()
        
        if row:
            past_price, past_date = row
            # Closest date must be within 14 days of target
            if past_price > 0 and abs((past_date - target_date).days) <= 14:
                ret = (curr_price / past_price) - 1
                results.append({"period": label, "value": round(ret * 100, 2)})
            else:
                results.append({"period": label, "value": None})
        else:
            results.append({"period": label, "value": None})
            
    return results


async def get_etf_full_detail(ticker: str, db: AsyncSession) -> dict[str, Any] | None:
    meta = get_etf_metadata(ticker)
    if not meta:
        return None
    
    # Get scores
    rf_rate = await fred_client.get_risk_free_rate(db)
    scored = await calculate_composite_score(ticker, db, rf_rate)
    
    # Get sector & holdings
    sector_data = await yfinance_client.get_sector_data(ticker, db)
    
    # Get returns
    returns = await get_etf_returns(ticker, db)
    
    # Build response-compatible dict
    res = {
        "ticker": ticker,
        "name": meta.get("name"),
        "bucket": meta.get("bucket"),
        "isin": meta.get("isin"),
        "domicile": meta.get("domicile"),
        "distribution": meta.get("distribution"),
        "ucits": meta.get("ucits"),
        "ter": meta.get("ter"),
        "aum_b": meta.get("aum_b"),
        "inception": meta.get("inception"),
        "description_en": meta.get("description_en") or "",
        "description_he": meta.get("description_he") or "",
        "composite_score": round(scored.composite_score * 10, 2) if scored else 0.0,
        "component_scores": {
            "cost": round(scored.components.cost * 10, 2) if scored else 0.0,
            "sharpe_3y": round(scored.components.sharpe_3y * 10, 2) if scored else 0.0,
            "tracking_error": round(scored.components.tracking_error * 10, 2) if scored else 0.0,
            "liquidity_aum": round(scored.components.liquidity_aum * 10, 2) if scored else 0.0,
            "sharpe_computed": scored.components.sharpe_computed if scored else False,
        },
        "rank": scored.rank if scored else 0,
        "returns": returns,
        "top_holdings": [
            {
                "symbol": h.get("Symbol") or "N/A",
                "name": h.get("Name") or "N/A",
                "weight": (h.get("Holding Percent") or 0.0) * 100
            }
            for h in sector_data.get("top_holdings", [])
        ],
        "sector_weights": {
            (k.replace("_", " ").title() if k.lower() != "realestate" else "Real Estate"): v * 100
            for k, v in sector_data.get("sector_weights", {}).items()
        },
    }
    
    return res
