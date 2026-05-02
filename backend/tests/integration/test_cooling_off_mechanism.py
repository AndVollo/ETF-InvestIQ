from __future__ import annotations

"""
Integration tests for the Architect cooling-off mechanism.

When an allocation changes any existing holding by > 30% (large_change_threshold_pct),
the session moves to PENDING_REVIEW and an immediate confirm is rejected with the
`error.architect_cooling_off` ValidationError (HTTP 422).
"""

import pytest
from httpx import AsyncClient


async def _make_long_bucket(client: AsyncClient) -> int:
    r = await client.post("/api/v1/buckets/", json={"name": "CoolingTest", "horizon_type": "LONG"})
    assert r.status_code == 201
    return r.json()["id"]


async def _start_session(client: AsyncClient, bucket_id: int) -> str:
    r = await client.post("/api/v1/architect/sessions", json={
        "bucket_id": bucket_id,
        "investor_profile": {"goal_description": "Cooling-off integration test"},
    })
    assert r.status_code == 201
    return r.json()["session_id"]


async def _add_candidates(client: AsyncClient, session_id: str) -> None:
    r = await client.post(f"/api/v1/architect/sessions/{session_id}/candidates", json={
        "tickers": ["VTI", "BND", "VNQ"]
    })
    assert r.status_code == 200


@pytest.mark.asyncio
class TestCoolingOff:
    async def test_initial_allocation_no_cooling_off(self, client: AsyncClient):
        """First allocation to an empty bucket never triggers cooling-off."""
        bid = await _make_long_bucket(client)
        sid = await _start_session(client, bid)
        await _add_candidates(client, sid)

        r = await client.post(f"/api/v1/architect/sessions/{sid}/allocation", json={
            "allocation": [
                {"ticker": "VTI", "weight_pct": 70.0},
                {"ticker": "BND", "weight_pct": 30.0},
            ],
            "rationale": "First allocation — no prior holdings so no cooling-off.",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "DRAFT"
        assert body["cooling_off_until"] is None

    async def test_initial_allocation_confirm_succeeds_immediately(self, client: AsyncClient):
        """First allocation can be confirmed without any wait."""
        bid = await _make_long_bucket(client)
        sid = await _start_session(client, bid)
        await _add_candidates(client, sid)

        await client.post(f"/api/v1/architect/sessions/{sid}/allocation", json={
            "allocation": [
                {"ticker": "VTI", "weight_pct": 60.0},
                {"ticker": "BND", "weight_pct": 40.0},
            ],
            "rationale": "Initial 60/40.",
        })

        r = await client.post(f"/api/v1/architect/sessions/{sid}/confirm")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "CONFIRMED"
        assert data["holdings_written"] == 2

    async def test_large_change_triggers_pending_review(self, client: AsyncClient):
        """Changing VTI from 60% → 95% (delta = 35) triggers PENDING_REVIEW."""
        bid = await _make_long_bucket(client)
        sid = await _start_session(client, bid)
        await _add_candidates(client, sid)

        # First allocation — confirmed
        await client.post(f"/api/v1/architect/sessions/{sid}/allocation", json={
            "allocation": [
                {"ticker": "VTI", "weight_pct": 60.0},
                {"ticker": "BND", "weight_pct": 40.0},
            ],
            "rationale": "Initial baseline.",
        })
        await client.post(f"/api/v1/architect/sessions/{sid}/confirm")

        # Second session — large shift
        sid2 = await _start_session(client, bid)
        await _add_candidates(client, sid2)

        r = await client.post(f"/api/v1/architect/sessions/{sid2}/allocation", json={
            "allocation": [
                {"ticker": "VTI", "weight_pct": 95.0},  # +35 on VTI — over threshold
                {"ticker": "BND", "weight_pct": 5.0},
            ],
            "rationale": "Aggressive equity shift — triggers cooling-off.",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "PENDING_REVIEW"
        assert data["cooling_off_until"] is not None

    async def test_confirm_during_cooling_off_returns_validation_error(self, client: AsyncClient):
        """Confirming a PENDING_REVIEW session before the window expires fails (HTTP 422)."""
        bid = await _make_long_bucket(client)
        sid = await _start_session(client, bid)
        await _add_candidates(client, sid)

        await client.post(f"/api/v1/architect/sessions/{sid}/allocation", json={
            "allocation": [
                {"ticker": "VTI", "weight_pct": 60.0},
                {"ticker": "BND", "weight_pct": 40.0},
            ],
            "rationale": "Initial baseline.",
        })
        await client.post(f"/api/v1/architect/sessions/{sid}/confirm")

        sid2 = await _start_session(client, bid)
        await _add_candidates(client, sid2)

        alloc = await client.post(f"/api/v1/architect/sessions/{sid2}/allocation", json={
            "allocation": [
                {"ticker": "VTI", "weight_pct": 95.0},
                {"ticker": "BND", "weight_pct": 5.0},
            ],
            "rationale": "Large shift — triggers PENDING_REVIEW.",
        })
        assert alloc.json()["status"] == "PENDING_REVIEW"

        # Immediate confirm must fail with cooling-off error
        r = await client.post(f"/api/v1/architect/sessions/{sid2}/confirm")
        assert r.status_code == 422
        body = r.json()
        assert body["message_key"] == "error.architect_cooling_off"
        assert "available_at" in body["params"]

    async def test_small_rebalance_does_not_trigger_cooling_off(self, client: AsyncClient):
        """A change below 30% stays in DRAFT status (no cooling-off)."""
        bid = await _make_long_bucket(client)
        sid = await _start_session(client, bid)
        await _add_candidates(client, sid)

        await client.post(f"/api/v1/architect/sessions/{sid}/allocation", json={
            "allocation": [
                {"ticker": "VTI", "weight_pct": 60.0},
                {"ticker": "BND", "weight_pct": 40.0},
            ],
            "rationale": "Initial.",
        })
        await client.post(f"/api/v1/architect/sessions/{sid}/confirm")

        sid2 = await _start_session(client, bid)
        await _add_candidates(client, sid2)

        # Minor drift correction: VTI 60→70, BND 40→30 — only 10% delta
        r = await client.post(f"/api/v1/architect/sessions/{sid2}/allocation", json={
            "allocation": [
                {"ticker": "VTI", "weight_pct": 70.0},
                {"ticker": "BND", "weight_pct": 30.0},
            ],
            "rationale": "Minor drift correction — below threshold.",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "DRAFT"
        assert body["cooling_off_until"] is None
