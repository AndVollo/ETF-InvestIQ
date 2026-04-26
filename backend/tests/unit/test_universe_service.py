from __future__ import annotations

import pytest

from app.services.universe_service import (
    get_blacklist,
    get_etf_metadata,
    get_etfs_in_bucket,
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
