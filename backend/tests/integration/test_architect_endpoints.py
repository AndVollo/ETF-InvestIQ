from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


async def _make_long_bucket(client: AsyncClient) -> int:
    r = await client.post("/api/v1/buckets/", json={"name": "ArchTest", "horizon_type": "LONG"})
    return r.json()["id"]


@pytest.mark.asyncio
class TestArchitectSessionFlow:
    async def test_start_session_returns_prompt(self, client: AsyncClient):
        bid = await _make_long_bucket(client)
        r = await client.post("/api/v1/architect/sessions", json={
            "bucket_id": bid,
            "investor_profile": {
                "goal_description": "Retire at 60 with passive income",
                "target_amount_ils": 3000000,
                "monthly_deposit_ils": 5000,
            },
        })
        assert r.status_code == 201
        data = r.json()
        assert "session_id" in data
        assert "discovery_prompt" in data
        assert len(data["discovery_prompt"]) > 100
        assert data["status"] == "DRAFT"

    async def test_start_session_bucket_not_found(self, client: AsyncClient):
        r = await client.post("/api/v1/architect/sessions", json={
            "bucket_id": 99999,
            "investor_profile": {"goal_description": "test"},
        })
        assert r.status_code == 404

    async def test_ingest_candidates_accepted(self, client: AsyncClient):
        bid = await _make_long_bucket(client)
        sr = await client.post("/api/v1/architect/sessions", json={
            "bucket_id": bid,
            "investor_profile": {"goal_description": "Long-term growth"},
        })
        sid = sr.json()["session_id"]

        r = await client.post(f"/api/v1/architect/sessions/{sid}/candidates", json={
            "tickers": ["VTI", "BND", "VNQ"]
        })
        assert r.status_code == 200
        data = r.json()
        accepted_tickers = {c["ticker"] for c in data["accepted"]}
        assert "VTI" in accepted_tickers
        assert "BND" in accepted_tickers
        assert "VNQ" in accepted_tickers
        assert data["rejected"] == []

    async def test_ingest_candidates_rejects_blacklisted(self, client: AsyncClient):
        bid = await _make_long_bucket(client)
        sr = await client.post("/api/v1/architect/sessions", json={
            "bucket_id": bid,
            "investor_profile": {"goal_description": "test"},
        })
        sid = sr.json()["session_id"]

        r = await client.post(f"/api/v1/architect/sessions/{sid}/candidates", json={
            "tickers": ["VTI", "JEPI"]   # JEPI is blacklisted
        })
        assert r.status_code == 200
        data = r.json()
        rejected_tickers = {c["ticker"] for c in data["rejected"]}
        assert "JEPI" in rejected_tickers

    async def test_ingest_candidates_rejects_unknown(self, client: AsyncClient):
        bid = await _make_long_bucket(client)
        sr = await client.post("/api/v1/architect/sessions", json={
            "bucket_id": bid,
            "investor_profile": {"goal_description": "test"},
        })
        sid = sr.json()["session_id"]

        r = await client.post(f"/api/v1/architect/sessions/{sid}/candidates", json={
            "tickers": ["VTI", "FAKE_ETF_XYZ"]
        })
        assert r.status_code == 200
        rejected_tickers = {c["ticker"] for c in r.json()["rejected"]}
        assert "FAKE_ETF_XYZ" in rejected_tickers

    async def test_engineer_prompt_requires_shortlist(self, client: AsyncClient):
        bid = await _make_long_bucket(client)
        sr = await client.post("/api/v1/architect/sessions", json={
            "bucket_id": bid,
            "investor_profile": {"goal_description": "test"},
        })
        sid = sr.json()["session_id"]
        # No candidates ingested yet
        r = await client.get(f"/api/v1/architect/sessions/{sid}/engineer-prompt")
        assert r.status_code == 422

    async def test_engineer_prompt_returns_text(self, client: AsyncClient):
        bid = await _make_long_bucket(client)
        sr = await client.post("/api/v1/architect/sessions", json={
            "bucket_id": bid,
            "investor_profile": {"goal_description": "test"},
        })
        sid = sr.json()["session_id"]
        await client.post(f"/api/v1/architect/sessions/{sid}/candidates", json={"tickers": ["VTI", "BND"]})

        r = await client.get(f"/api/v1/architect/sessions/{sid}/engineer-prompt")
        assert r.status_code == 200
        assert len(r.json()["engineer_prompt"]) > 100

    async def test_full_flow_to_confirm(self, client: AsyncClient):
        bid = await _make_long_bucket(client)
        sr = await client.post("/api/v1/architect/sessions", json={
            "bucket_id": bid,
            "investor_profile": {"goal_description": "Full flow test"},
        })
        sid = sr.json()["session_id"]

        await client.post(f"/api/v1/architect/sessions/{sid}/candidates", json={"tickers": ["VTI", "BND"]})

        alloc_r = await client.post(f"/api/v1/architect/sessions/{sid}/allocation", json={
            "allocation": [
                {"ticker": "VTI", "weight_pct": 60.0},
                {"ticker": "BND", "weight_pct": 40.0},
            ],
            "rationale": "Standard 60/40 portfolio for long-term growth with bond cushion.",
        })
        assert alloc_r.status_code == 200
        alloc_data = alloc_r.json()
        assert alloc_data["validation_passed"] is True

        confirm_r = await client.post(f"/api/v1/architect/sessions/{sid}/confirm")
        assert confirm_r.status_code == 200
        confirm_data = confirm_r.json()
        assert confirm_data["status"] == "CONFIRMED"
        assert confirm_data["holdings_written"] == 2

        # Verify holdings written to bucket
        holdings_r = await client.get(f"/api/v1/holdings/?bucket_id={bid}")
        tickers = {h["ticker"] for h in holdings_r.json()}
        assert tickers == {"VTI", "BND"}

    async def test_allocation_sum_not_100_rejected(self, client: AsyncClient):
        bid = await _make_long_bucket(client)
        sr = await client.post("/api/v1/architect/sessions", json={
            "bucket_id": bid,
            "investor_profile": {"goal_description": "test"},
        })
        sid = sr.json()["session_id"]
        await client.post(f"/api/v1/architect/sessions/{sid}/candidates", json={"tickers": ["VTI", "BND"]})

        r = await client.post(f"/api/v1/architect/sessions/{sid}/allocation", json={
            "allocation": [
                {"ticker": "VTI", "weight_pct": 60.0},
                {"ticker": "BND", "weight_pct": 30.0},  # sums to 90 — invalid
            ],
            "rationale": "This should fail due to allocation sum.",
        })
        assert r.status_code == 422

    async def test_get_session_returns_state(self, client: AsyncClient):
        bid = await _make_long_bucket(client)
        sr = await client.post("/api/v1/architect/sessions", json={
            "bucket_id": bid,
            "investor_profile": {"goal_description": "test"},
        })
        sid = sr.json()["session_id"]

        r = await client.get(f"/api/v1/architect/sessions/{sid}")
        assert r.status_code == 200
        assert r.json()["session_id"] == sid
        assert r.json()["status"] == "DRAFT"
