from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_universe_returns_50_etfs(client: AsyncClient):
    resp = await client.get("/api/v1/universe/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_etfs"] == 50
    assert len(data["etfs"]) == 50
    assert data["version"] == "2026-Q2"


@pytest.mark.asyncio
async def test_list_universe_has_8_buckets(client: AsyncClient):
    resp = await client.get("/api/v1/universe/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["buckets"]) == 8


@pytest.mark.asyncio
async def test_list_buckets_endpoint(client: AsyncClient):
    resp = await client.get("/api/v1/universe/buckets")
    assert resp.status_code == 200
    buckets = resp.json()
    names = [b["name"] for b in buckets]
    assert "GLOBAL_CORE" in names
    assert "REITS" in names
    assert "ULTRA_SHORT_TERM" in names


@pytest.mark.asyncio
async def test_reits_bucket_has_max_pct_15(client: AsyncClient):
    resp = await client.get("/api/v1/universe/buckets")
    assert resp.status_code == 200
    reits = next(b for b in resp.json() if b["name"] == "REITS")
    assert reits["max_pct"] == 15.0


@pytest.mark.asyncio
async def test_commodities_bucket_has_max_pct_10(client: AsyncClient):
    resp = await client.get("/api/v1/universe/buckets")
    reits = next(b for b in resp.json() if b["name"] == "COMMODITIES_HEDGE")
    assert reits["max_pct"] == 10.0


@pytest.mark.asyncio
async def test_scores_in_bucket_global_core(client: AsyncClient):
    resp = await client.get("/api/v1/universe/scores/GLOBAL_CORE")
    assert resp.status_code == 200
    scores = resp.json()
    assert len(scores) > 0
    # Should be sorted by composite_score descending
    composites = [s["composite_score"] for s in scores]
    assert composites == sorted(composites, reverse=True)


@pytest.mark.asyncio
async def test_scores_have_required_fields(client: AsyncClient):
    resp = await client.get("/api/v1/universe/scores/US_BONDS")
    assert resp.status_code == 200
    for etf in resp.json():
        assert "ticker" in etf
        assert "composite_score" in etf
        assert "components" in etf
        assert "rank" in etf
        assert etf["rank"] >= 1


@pytest.mark.asyncio
async def test_shortlist_returns_top_ticker_per_bucket(client: AsyncClient):
    resp = await client.post(
        "/api/v1/universe/shortlist",
        json={"buckets": ["GLOBAL_CORE", "US_BONDS"], "top_n": 1},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["shortlist"]) == 2
    assert len(data["scored"]) == 2


@pytest.mark.asyncio
async def test_shortlist_top_2(client: AsyncClient):
    resp = await client.post(
        "/api/v1/universe/shortlist",
        json={"buckets": ["GLOBAL_CORE"], "top_n": 2},
    )
    assert resp.status_code == 200
    assert len(resp.json()["shortlist"]) == 2


@pytest.mark.asyncio
async def test_validate_valid_ticker(client: AsyncClient):
    resp = await client.get("/api/v1/universe/validate/VTI")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["in_universe"] is True
    assert data["blacklisted"] is False


@pytest.mark.asyncio
async def test_validate_blacklisted_ticker(client: AsyncClient):
    resp = await client.get("/api/v1/universe/validate/TQQQ")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False
    assert data["blacklisted"] is True
    assert data["blacklist_reason"] is not None


@pytest.mark.asyncio
async def test_validate_covered_call_blocked(client: AsyncClient):
    resp = await client.get("/api/v1/universe/validate/JEPI")
    assert resp.status_code == 200
    assert resp.json()["valid"] is False


@pytest.mark.asyncio
async def test_validate_unknown_ticker(client: AsyncClient):
    resp = await client.get("/api/v1/universe/validate/ZZZZZ")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False
    assert data["in_universe"] is False


@pytest.mark.asyncio
async def test_validate_lowercase_normalized(client: AsyncClient):
    resp = await client.get("/api/v1/universe/validate/vti")
    assert resp.status_code == 200
    assert resp.json()["ticker"] == "VTI"
    assert resp.json()["valid"] is True


@pytest.mark.asyncio
async def test_blacklist_has_categories(client: AsyncClient):
    resp = await client.get("/api/v1/universe/blacklist")
    assert resp.status_code == 200
    data = resp.json()
    cats = [c["category"] for c in data["categories"]]
    assert "leveraged" in cats
    assert "covered_call" in cats
    assert "thematic_high_concentration" in cats


@pytest.mark.asyncio
async def test_blacklist_tqqq_in_leveraged(client: AsyncClient):
    resp = await client.get("/api/v1/universe/blacklist")
    leveraged = next(c for c in resp.json()["categories"] if c["category"] == "leveraged")
    assert "TQQQ" in leveraged["tickers"]
