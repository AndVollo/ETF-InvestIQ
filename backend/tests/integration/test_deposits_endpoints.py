from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.holding import Holding
from app.db.models.price_history import PriceHistory
from datetime import date, datetime, timezone


async def _seed_bucket_with_holding(client: AsyncClient, db: AsyncSession) -> tuple[int, int]:
    """Creates a bucket + one holding + a price row. Returns (bucket_id, holding_id)."""
    br = await client.post("/api/v1/buckets/", json={"name": "DepBucket", "horizon_type": "LONG"})
    bid = br.json()["id"]

    hr = await client.post("/api/v1/holdings/", json={
        "bucket_id": bid,
        "ticker": "VTI",
        "units": 0.0,
        "target_pct": 100.0,
    })
    holding_id = hr.json()["id"]

    # Seed a price so allocation can proceed
    now = datetime.now(timezone.utc)
    price = PriceHistory(ticker="VTI", date=date.today(), close_usd=200.0, volume=1_000_000)
    db.add(price)
    await db.flush()

    return bid, holding_id


@pytest.mark.asyncio
class TestDepositCalculate:
    async def test_calculate_deposit(self, client: AsyncClient, db_session: AsyncSession):
        bid, _ = await _seed_bucket_with_holding(client, db_session)

        r = await client.post("/api/v1/deposits/calculate", json={
            "bucket_id": bid,
            "amount": 1000.0,
            "currency": "USD",
        })
        assert r.status_code == 200
        data = r.json()
        assert "plan_token" in data
        assert data["bucket_id"] == bid
        assert data["amount_usd"] == pytest.approx(1000.0, abs=0.01)
        assert len(data["orders"]) == 1
        assert data["orders"][0]["ticker"] == "VTI"
        assert data["total_allocated_usd"] == pytest.approx(1000.0, abs=0.01)
        assert data["remainder_usd"] == pytest.approx(0.0, abs=0.01)

    async def test_calculate_no_holdings(self, client: AsyncClient):
        br = await client.post("/api/v1/buckets/", json={"name": "Empty", "horizon_type": "LONG"})
        bid = br.json()["id"]

        r = await client.post("/api/v1/deposits/calculate", json={
            "bucket_id": bid,
            "amount": 500.0,
            "currency": "USD",
        })
        assert r.status_code == 422

    async def test_calculate_bucket_not_found(self, client: AsyncClient):
        r = await client.post("/api/v1/deposits/calculate", json={
            "bucket_id": 99999,
            "amount": 500.0,
            "currency": "USD",
        })
        assert r.status_code == 404

    async def test_calculate_amount_zero_rejected(self, client: AsyncClient):
        r = await client.post("/api/v1/deposits/calculate", json={
            "bucket_id": 1,
            "amount": 0.0,
            "currency": "USD",
        })
        assert r.status_code == 422

    async def test_calculate_invalid_currency(self, client: AsyncClient):
        r = await client.post("/api/v1/deposits/calculate", json={
            "bucket_id": 1,
            "amount": 500.0,
            "currency": "EUR",
        })
        assert r.status_code == 422


@pytest.mark.asyncio
class TestDepositConfirm:
    async def test_confirm_updates_holdings(self, client: AsyncClient, db_session: AsyncSession):
        bid, holding_id = await _seed_bucket_with_holding(client, db_session)

        calc = await client.post("/api/v1/deposits/calculate", json={
            "bucket_id": bid,
            "amount": 1000.0,
            "currency": "USD",
        })
        token = calc.json()["plan_token"]

        r = await client.post("/api/v1/deposits/confirm", json={"plan_token": token})
        assert r.status_code == 200
        data = r.json()
        assert data["bucket_id"] == bid
        assert data["orders_placed"] == 1
        assert "deposit_id" in data

        # Verify units updated in DB
        await db_session.refresh(await db_session.get(Holding, holding_id))
        holding = await db_session.get(Holding, holding_id)
        assert holding.units == pytest.approx(5.0, abs=0.01)  # 1000 / 200 = 5

    async def test_confirm_double_confirm_rejected(self, client: AsyncClient, db_session: AsyncSession):
        bid, _ = await _seed_bucket_with_holding(client, db_session)

        calc = await client.post("/api/v1/deposits/calculate", json={
            "bucket_id": bid,
            "amount": 500.0,
            "currency": "USD",
        })
        token = calc.json()["plan_token"]

        await client.post("/api/v1/deposits/confirm", json={"plan_token": token})
        r2 = await client.post("/api/v1/deposits/confirm", json={"plan_token": token})
        assert r2.status_code == 422

    async def test_confirm_invalid_token(self, client: AsyncClient):
        r = await client.post("/api/v1/deposits/confirm", json={"plan_token": "nonexistent-token"})
        assert r.status_code == 404


@pytest.mark.asyncio
class TestDepositHistory:
    async def test_history_empty(self, client: AsyncClient):
        br = await client.post("/api/v1/buckets/", json={"name": "H", "horizon_type": "LONG"})
        bid = br.json()["id"]

        r = await client.get(f"/api/v1/deposits/history?bucket_id={bid}")
        assert r.status_code == 200
        assert r.json() == []

    async def test_history_after_confirm(self, client: AsyncClient, db_session: AsyncSession):
        bid, _ = await _seed_bucket_with_holding(client, db_session)

        calc = await client.post("/api/v1/deposits/calculate", json={
            "bucket_id": bid,
            "amount": 600.0,
            "currency": "USD",
        })
        token = calc.json()["plan_token"]
        await client.post("/api/v1/deposits/confirm", json={"plan_token": token})

        r = await client.get(f"/api/v1/deposits/history?bucket_id={bid}")
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["amount"] == pytest.approx(600.0, abs=0.01)
