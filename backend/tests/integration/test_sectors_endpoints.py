from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


async def _make_bucket_with_holdings(client: AsyncClient) -> int:
    br = await client.post("/api/v1/buckets/", json={"name": "SectorTest", "horizon_type": "LONG"})
    bid = br.json()["id"]
    await client.post("/api/v1/holdings/", json={"bucket_id": bid, "ticker": "VTI", "units": 0, "target_pct": 70})
    await client.post("/api/v1/holdings/", json={"bucket_id": bid, "ticker": "BND", "units": 0, "target_pct": 30})
    return bid


@pytest.mark.asyncio
class TestSectorEndpoints:
    async def test_sector_exposure_empty_bucket(self, client: AsyncClient):
        br = await client.post("/api/v1/buckets/", json={"name": "Empty", "horizon_type": "LONG"})
        bid = br.json()["id"]
        r = await client.get(f"/api/v1/sectors/{bid}")
        assert r.status_code == 200
        data = r.json()
        assert data["bucket_id"] == bid
        assert data["sector_exposures"] == []
        assert data["cap_warnings"] == []

    async def test_sector_exposure_returns_structure(self, client: AsyncClient, db_session: AsyncSession):
        bid = await _make_bucket_with_holdings(client)
        # Add some units so holdings have value
        holdings_r = await client.get(f"/api/v1/holdings/?bucket_id={bid}")
        for h in holdings_r.json():
            await client.put(f"/api/v1/holdings/{h['id']}", json={"units": 10, "avg_cost_usd": 100})

        r = await client.get(f"/api/v1/sectors/{bid}")
        assert r.status_code == 200
        data = r.json()
        assert "sector_exposures" in data
        assert "cap_warnings" in data
        assert "total_value_usd" in data

    async def test_sector_bucket_not_found(self, client: AsyncClient):
        r = await client.get("/api/v1/sectors/99999")
        assert r.status_code == 404

    async def test_reit_cap_warning(self, client: AsyncClient):
        br = await client.post("/api/v1/buckets/", json={"name": "HeavyREIT", "horizon_type": "LONG"})
        bid = br.json()["id"]
        # 20% REITs — above 15% cap
        await client.post("/api/v1/holdings/", json={"bucket_id": bid, "ticker": "VTI", "units": 8, "avg_cost_usd": 100, "target_pct": 80})
        await client.post("/api/v1/holdings/", json={"bucket_id": bid, "ticker": "VNQ", "units": 2, "avg_cost_usd": 100, "target_pct": 20})

        r = await client.get(f"/api/v1/sectors/{bid}")
        assert r.status_code == 200
        warnings = r.json()["cap_warnings"]
        reit_warnings = [w for w in warnings if w["cap_type"] == "REITS"]
        assert len(reit_warnings) == 1
        assert reit_warnings[0]["actual_pct"] == pytest.approx(20.0)

    async def test_refresh_sector_cache(self, client: AsyncClient):
        bid = await _make_bucket_with_holdings(client)
        r = await client.post(f"/api/v1/sectors/{bid}/refresh")
        assert r.status_code == 200
        data = r.json()
        assert "tickers_refreshed" in data
        assert data["tickers_refreshed"] == 2
