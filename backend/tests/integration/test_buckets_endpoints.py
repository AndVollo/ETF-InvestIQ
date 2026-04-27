from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestBucketCRUD:
    async def test_create_bucket(self, client: AsyncClient):
        r = await client.post("/api/v1/buckets/", json={
            "name": "Retirement",
            "horizon_type": "LONG",
            "target_amount": 500000,
            "target_currency": "ILS",
        })
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "Retirement"
        assert data["horizon_type"] == "LONG"
        assert data["is_archived"] is False
        assert "id" in data

    async def test_create_bucket_invalid_horizon(self, client: AsyncClient):
        r = await client.post("/api/v1/buckets/", json={
            "name": "Bad",
            "horizon_type": "ULTRA",
        })
        assert r.status_code == 422

    async def test_list_buckets_empty(self, client: AsyncClient):
        r = await client.get("/api/v1/buckets/")
        assert r.status_code == 200
        assert r.json() == []

    async def test_list_buckets_returns_created(self, client: AsyncClient):
        await client.post("/api/v1/buckets/", json={"name": "A", "horizon_type": "SHORT"})
        await client.post("/api/v1/buckets/", json={"name": "B", "horizon_type": "MEDIUM"})
        r = await client.get("/api/v1/buckets/")
        assert r.status_code == 200
        assert len(r.json()) == 2

    async def test_get_bucket(self, client: AsyncClient):
        cr = await client.post("/api/v1/buckets/", json={"name": "Solo", "horizon_type": "LONG"})
        bid = cr.json()["id"]
        r = await client.get(f"/api/v1/buckets/{bid}")
        assert r.status_code == 200
        assert r.json()["id"] == bid

    async def test_get_bucket_not_found(self, client: AsyncClient):
        r = await client.get("/api/v1/buckets/99999")
        assert r.status_code == 404

    async def test_update_bucket(self, client: AsyncClient):
        cr = await client.post("/api/v1/buckets/", json={"name": "Old", "horizon_type": "LONG"})
        bid = cr.json()["id"]
        r = await client.put(f"/api/v1/buckets/{bid}", json={"name": "New"})
        assert r.status_code == 200
        assert r.json()["name"] == "New"

    async def test_archive_bucket(self, client: AsyncClient):
        cr = await client.post("/api/v1/buckets/", json={"name": "ToArchive", "horizon_type": "SHORT"})
        bid = cr.json()["id"]
        r = await client.delete(f"/api/v1/buckets/{bid}")
        assert r.status_code == 204

        # Should not appear in default list
        r2 = await client.get("/api/v1/buckets/")
        ids = [b["id"] for b in r2.json()]
        assert bid not in ids

        # Should appear with include_archived=true
        r3 = await client.get("/api/v1/buckets/?include_archived=true")
        ids3 = [b["id"] for b in r3.json()]
        assert bid in ids3

    async def test_archive_bucket_not_found(self, client: AsyncClient):
        r = await client.delete("/api/v1/buckets/99999")
        assert r.status_code == 404


@pytest.mark.asyncio
class TestBucketHoldings:
    async def _make_bucket(self, client: AsyncClient) -> int:
        r = await client.post("/api/v1/buckets/", json={"name": "B", "horizon_type": "LONG"})
        return r.json()["id"]

    async def test_holdings_empty(self, client: AsyncClient):
        bid = await self._make_bucket(client)
        r = await client.get(f"/api/v1/buckets/{bid}/holdings")
        assert r.status_code == 200
        assert r.json()["holdings"] == []
        assert r.json()["total_value_usd"] == 0.0

    async def test_summary_endpoint(self, client: AsyncClient):
        bid = await self._make_bucket(client)
        r = await client.get(f"/api/v1/buckets/{bid}/summary")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == bid
        assert data["holdings_count"] == 0

    async def test_goal_progress_no_target(self, client: AsyncClient):
        bid = await self._make_bucket(client)
        r = await client.get(f"/api/v1/buckets/{bid}/goal-progress")
        assert r.status_code == 200
        data = r.json()
        assert data["progress_pct"] is None
        assert data["amount_remaining"] is None
