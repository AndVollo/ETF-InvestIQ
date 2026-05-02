from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

import yaml

from app.config import settings

_lock = threading.Lock()
_cache: dict[str, Any] | None = None


def _load() -> dict[str, Any]:
    global _cache
    if _cache is not None:
        return _cache
    with _lock:
        if _cache is not None:
            return _cache
        path: Path = settings.universe_file
        with path.open(encoding="utf-8") as f:
            _cache = yaml.safe_load(f)
    return _cache


def load_universe() -> dict[str, Any]:
    return _load()


def get_universe_tickers() -> set[str]:
    universe = _load()
    tickers: set[str] = set()
    for bucket_data in universe.get("buckets", {}).values():
        for etf in bucket_data.get("etfs", []):
            tickers.add(etf["ticker"])
    return tickers


def get_etf_metadata(ticker: str) -> dict[str, Any] | None:
    universe = _load()
    for bucket_name, bucket_data in universe.get("buckets", {}).items():
        for etf in bucket_data.get("etfs", []):
            if etf["ticker"] == ticker:
                return {**etf, "bucket": bucket_name}
    return None


def is_blacklisted(ticker: str) -> tuple[bool, str]:
    universe = _load()
    bl = universe.get("blacklist", {})

    for category, data in bl.items():
        if category == "high_ter":
            continue
        tickers = data.get("tickers", [])
        if ticker in tickers:
            return True, data.get("reason", category)

    # Check high TER via ETF metadata
    meta = get_etf_metadata(ticker)
    if meta:
        ter = meta.get("ter", 0.0)
        threshold = bl.get("high_ter", {}).get("threshold", 0.50)
        exceptions = bl.get("high_ter", {}).get("exceptions", [])
        if ter > threshold and ticker not in exceptions:
            return True, f"TER {ter:.2%} exceeds {threshold:.2%} threshold"

    return False, ""


def get_bucket_constraints(bucket_name: str) -> dict[str, Any]:
    universe = _load()
    bucket = universe.get("buckets", {}).get(bucket_name, {})
    return {
        "max_pct": bucket.get("max_pct"),
        "allowed_horizon": bucket.get("allowed_horizon", []),
        "description_en": bucket.get("description_en", ""),
        "description_he": bucket.get("description_he", ""),
    }


def get_etfs_in_bucket(bucket_name: str) -> list[dict[str, Any]]:
    universe = _load()
    bucket = universe.get("buckets", {}).get(bucket_name, {})
    return [
        {**etf, "bucket": bucket_name} for etf in bucket.get("etfs", [])
    ]


def get_ucits_alternatives(ticker: str) -> list[str]:
    """Return UCITS-domiciled tickers in the same bucket as the given (US-domiciled) ticker.

    Returns [] if the ticker is unknown, already UCITS, or has no UCITS peer.
    """
    metadata = get_etf_metadata(ticker)
    if metadata is None or metadata.get("ucits", False):
        return []
    bucket = metadata.get("bucket")
    if not bucket:
        return []
    return [
        e["ticker"]
        for e in get_etfs_in_bucket(bucket)
        if e.get("ucits", False) and e["ticker"] != ticker
    ]


def get_blacklist() -> dict[str, Any]:
    return _load().get("blacklist", {})


def get_universe_version() -> str:
    return _load().get("version", "unknown")
