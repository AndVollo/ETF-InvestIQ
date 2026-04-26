from __future__ import annotations

from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.price_history import PriceHistory


async def _seed_prices(db: AsyncSession, ticker: str, n_days: int, start_price: float = 100.0) -> None:
    """Insert n_days of synthetic price history for testing."""
    from datetime import timezone
    from app.db.base import utcnow

    today = date.today()
    step = 0.05  # slight upward trend
    for i in range(n_days):
        d = today - timedelta(days=n_days - i)
        price = start_price * (1 + step * i / n_days)
        db.add(
            PriceHistory(
                ticker=ticker,
                date=d,
                close_usd=round(price, 4),
                volume=1_000_000,
                created_at=utcnow(),
                updated_at=utcnow(),
            )
        )
    await db.flush()


@pytest.mark.asyncio
async def test_valuation_insufficient_history(client: AsyncClient):
    # VTI has no data seeded → INSUFFICIENT_HISTORY
    resp = await client.get("/api/v1/valuation/VTI")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ticker"] == "VTI"
    assert data["classification"] == "INSUFFICIENT_HISTORY"
    assert data["z_score"] is None


@pytest.mark.asyncio
async def test_valuation_with_history(client: AsyncClient, db_session: AsyncSession):
    await _seed_prices(db_session, "VXUS", n_days=400, start_price=55.0)

    resp = await client.get("/api/v1/valuation/VXUS")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ticker"] == "VXUS"
    assert data["classification"] in {"CHEAP", "FAIR", "EXPENSIVE"}
    assert data["z_score"] is not None
    assert data["percentile_52w"] is not None


@pytest.mark.asyncio
async def test_valuation_sma200_with_enough_history(client: AsyncClient, db_session: AsyncSession):
    await _seed_prices(db_session, "BND", n_days=250, start_price=73.0)

    resp = await client.get("/api/v1/valuation/BND")
    assert resp.status_code == 200
    data = resp.json()
    # 250 days → enough for SMA200
    assert data["sma200_deviation"] is not None


@pytest.mark.asyncio
async def test_valuation_3y_history_flag(client: AsyncClient, db_session: AsyncSession):
    await _seed_prices(db_session, "SGOV", n_days=1100, start_price=100.0)

    resp = await client.get("/api/v1/valuation/SGOV")
    assert resp.status_code == 200
    assert resp.json()["has_3y_history"] is True


@pytest.mark.asyncio
async def test_valuation_short_history_no_3y_flag(client: AsyncClient, db_session: AsyncSession):
    await _seed_prices(db_session, "CLTL", n_days=200, start_price=100.0)

    resp = await client.get("/api/v1/valuation/CLTL")
    assert resp.status_code == 200
    assert resp.json()["has_3y_history"] is False


@pytest.mark.asyncio
async def test_valuation_blacklisted_ticker_blocked(client: AsyncClient):
    resp = await client.get("/api/v1/valuation/TQQQ")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_valuation_response_has_calculated_at(client: AsyncClient, db_session: AsyncSession):
    await _seed_prices(db_session, "IAU", n_days=120, start_price=38.0)

    resp = await client.get("/api/v1/valuation/IAU")
    assert resp.status_code == 200
    assert "calculated_at" in resp.json()


@pytest.mark.asyncio
async def test_valuation_cheap_classification(client: AsyncClient, db_session: AsyncSession):
    # Build prices: long plateau then drop — current should be cheap (below mean)
    from app.db.base import utcnow
    today = date.today()
    ticker = "AVUV"

    for i in range(300):
        d = today - timedelta(days=300 - i)
        price = 100.0 if i < 290 else 60.0  # sharp drop at end
        db_session.add(PriceHistory(
            ticker=ticker, date=d, close_usd=price, volume=500_000,
            created_at=utcnow(), updated_at=utcnow(),
        ))
    await db_session.flush()

    resp = await client.get(f"/api/v1/valuation/{ticker}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["z_score"] is not None
    assert data["z_score"] < 0  # current below historical mean
    assert data["classification"] == "CHEAP"


@pytest.mark.asyncio
async def test_portfolio_valuation_missing_bucket(client: AsyncClient):
    resp = await client.get("/api/v1/valuation/portfolio/99999")
    assert resp.status_code == 404
