from __future__ import annotations

import pytest

from app.services.universe_service import (
    get_blacklist,
    get_etf_metadata,
    get_etfs_in_bucket,
    get_ucits_alternatives,
    get_universe_tickers,
    is_blacklisted,
    load_universe,
)


def test_load_universe_has_buckets():
    u = load_universe()
    assert "buckets" in u
    assert len(u["buckets"]) > 0


def test_get_universe_tickers_count():
    tickers = get_universe_tickers()
    assert len(tickers) >= 40  # at least 40 curated ETFs


def test_vti_in_universe():
    tickers = get_universe_tickers()
    assert "VTI" in tickers
    assert "VXUS" in tickers
    assert "SGOV" in tickers


def test_get_etf_metadata_vti():
    meta = get_etf_metadata("VTI")
    assert meta is not None
    assert meta["ticker"] == "VTI"
    assert meta["bucket"] == "GLOBAL_CORE"
    assert meta["ter"] == 0.03


def test_get_etf_metadata_unknown():
    assert get_etf_metadata("NONEXISTENT") is None


def test_blacklisted_leveraged():
    blocked, reason = is_blacklisted("TQQQ")
    assert blocked is True
    assert reason != ""


def test_blacklisted_covered_call():
    blocked, reason = is_blacklisted("JEPI")
    assert blocked is True


def test_blacklisted_thematic():
    blocked, reason = is_blacklisted("ARKK")
    assert blocked is True


def test_not_blacklisted_vti():
    blocked, _ = is_blacklisted("VTI")
    assert blocked is False


def test_get_etfs_in_bucket():
    etfs = get_etfs_in_bucket("GLOBAL_CORE")
    tickers = [e["ticker"] for e in etfs]
    assert "VTI" in tickers
    assert "VXUS" in tickers


def test_blacklist_loaded():
    bl = get_blacklist()
    assert "leveraged" in bl
    assert "covered_call" in bl


# ── UCITS-aware metadata ──────────────────────────────────────────────────────

def test_yaml_has_required_ucits_fields():
    """Every entry must declare domicile/distribution/ucits — the schema makes
    these required, so audit_universe.py and Architect can rely on them."""
    u = load_universe()
    for bucket_name, bucket in u["buckets"].items():
        for etf in bucket["etfs"]:
            assert "domicile" in etf, f"{etf['ticker']} in {bucket_name} missing domicile"
            assert etf["domicile"] in ("US", "IE", "LU"), etf["ticker"]
            assert etf["distribution"] in ("Distributing", "Accumulating"), etf["ticker"]
            assert isinstance(etf["ucits"], bool), etf["ticker"]


def test_existing_us_etfs_backfilled():
    vt = get_etf_metadata("VT")
    assert vt is not None
    assert vt["domicile"] == "US"
    assert vt["distribution"] == "Distributing"
    assert vt["ucits"] is False


def test_ucits_etfs_present():
    for ticker in ("VWRA", "CSPX", "VHVE", "EIMI", "AGGG", "SGLN"):
        meta = get_etf_metadata(ticker)
        assert meta is not None, ticker
        assert meta["domicile"] == "IE", ticker
        assert meta["ucits"] is True, ticker


def test_get_ucits_alternatives_for_VT_returns_global_core_peers():
    alts = get_ucits_alternatives("VT")
    assert "VWRA" in alts
    assert "CSPX" in alts
    assert "VHVE" in alts


def test_get_ucits_alternatives_for_VWRA_returns_empty():
    """Already a UCITS — nothing to suggest."""
    assert get_ucits_alternatives("VWRA") == []


def test_get_ucits_alternatives_for_unknown_ticker_returns_empty():
    assert get_ucits_alternatives("NOPE_NOT_LISTED") == []


def test_get_ucits_alternatives_for_BND_finds_AGGG():
    alts = get_ucits_alternatives("BND")
    assert "AGGG" in alts
    assert "VAGS" in alts


def test_blacklist_ucits_consistency():
    """No UCITS ticker should accidentally land on the blacklist."""
    bl = get_blacklist()
    blacklisted: set[str] = set()
    for category, data in bl.items():
        if isinstance(data, dict) and "tickers" in data:
            blacklisted.update(data["tickers"])
    u = load_universe()
    for bucket in u["buckets"].values():
        for etf in bucket["etfs"]:
            if etf.get("ucits"):
                assert etf["ticker"] not in blacklisted, etf["ticker"]
