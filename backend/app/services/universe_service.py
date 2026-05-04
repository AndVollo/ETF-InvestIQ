"""Universe service — reads ETF metadata, bucket constraints, and blacklist
from the database. Caches in memory; call invalidate_cache() after writes.

Public API is sync (callers expect sync). Backed by a sync SQLAlchemy session.

Bucket-level constraints (max_pct, allowed_horizon, descriptions) are tied to
investment policy, not market data, so they remain hardcoded here. ETF lists
within buckets are dynamic and managed via the admin API.
"""
from __future__ import annotations

import threading
from typing import Any

from sqlalchemy import select

from app.db.models.universe_blacklist import UniverseBlacklist
from app.db.models.universe_etf import UniverseETF
from app.db.session import SyncSessionLocal

_lock = threading.Lock()
_cache: dict[str, Any] | None = None

UNIVERSE_VERSION = "db-managed"

BUCKET_CONFIG: dict[str, dict[str, Any]] = {
    "GLOBAL_CORE": {
        "description_en": "Broad global equity exposure — core of any long-term portfolio",
        "description_he": "חשיפה גלובלית רחבה — ליבת כל תיק לטווח ארוך",
        "max_pct": None,
        "allowed_horizon": ["MEDIUM", "LONG"],
    },
    "US_FACTOR_VALUE": {
        "description_en": "US value-factor tilt for long-term returns",
        "description_he": "הטיית ערך אמריקאית לטווח ארוך",
        "max_pct": None,
        "allowed_horizon": ["LONG"],
    },
    "INTL_FACTOR_VALUE": {
        "description_en": "International value-factor tilt",
        "description_he": "הטיית ערך בינלאומית",
        "max_pct": None,
        "allowed_horizon": ["LONG"],
    },
    "US_FACTOR_MOMENTUM": {
        "description_en": "US momentum-factor tilt",
        "description_he": "הטיית מומנטום אמריקאית",
        "max_pct": None,
        "allowed_horizon": ["LONG"],
    },
    "US_BONDS": {
        "description_en": "US investment-grade bonds",
        "description_he": "אג\"ח אמריקאי בדירוג השקעה",
        "max_pct": None,
        "allowed_horizon": ["SHORT", "MEDIUM", "LONG"],
    },
    "ULTRA_SHORT_TERM": {
        "description_en": "Cash-equivalent — short-term Treasury bills",
        "description_he": "חלופת מזומן — אג\"ח קצר",
        "max_pct": None,
        "allowed_horizon": ["SHORT"],
    },
    "REITS": {
        "description_en": "Real estate investment trusts (max 15%)",
        "description_he": "נדל\"ן מניב (תקרה 15%)",
        "max_pct": 15.0,
        "allowed_horizon": ["MEDIUM", "LONG"],
    },
    "COMMODITIES_HEDGE": {
        "description_en": "Gold and broad commodities (max 10%)",
        "description_he": "זהב וסחורות (תקרה 10%)",
        "max_pct": 10.0,
        "allowed_horizon": ["MEDIUM", "LONG"],
    },
    "EMERGING_MARKETS": {
        "description_en": "Emerging-markets equity exposure",
        "description_he": "חשיפה לשווקים מתעוררים",
        "max_pct": None,
        "allowed_horizon": ["MEDIUM", "LONG"],
    },
    "TECH_GROWTH": {
        "description_en": "Concentrated technology / growth tilt",
        "description_he": "הטיית טכנולוגיה / צמיחה",
        "max_pct": None,
        "allowed_horizon": ["LONG"],
    },
}

HIGH_TER_THRESHOLD = 0.50  # percent
HIGH_TER_EXCEPTIONS: set[str] = set()


def _etf_to_dict(etf: UniverseETF) -> dict[str, Any]:
    return {
        "ticker": etf.ticker,
        "name": etf.name,
        "isin": etf.isin,
        "domicile": etf.domicile,
        "distribution": etf.distribution,
        "ucits": etf.ucits,
        "ter": etf.ter,
        "aum_b": etf.aum_b,
        "inception": etf.inception.isoformat() if etf.inception else None,
        "description_en": etf.description_en,
        "description_he": etf.description_he,
        "bucket": etf.bucket_name,
    }


def _load() -> dict[str, Any]:
    global _cache
    if _cache is not None:
        return _cache

    with _lock:
        if _cache is not None:
            return _cache

        with SyncSessionLocal() as session:
            etfs = session.execute(
                select(UniverseETF).where(UniverseETF.is_active == True)  # noqa: E712
            ).scalars().all()
            blacklist_rows = session.execute(select(UniverseBlacklist)).scalars().all()

        buckets: dict[str, dict[str, Any]] = {}
        for bucket_name, cfg in BUCKET_CONFIG.items():
            buckets[bucket_name] = {**cfg, "etfs": []}

        for etf in etfs:
            bucket_entry = buckets.setdefault(
                etf.bucket_name,
                {"description_en": "", "description_he": "", "max_pct": None, "allowed_horizon": [], "etfs": []},
            )
            bucket_entry["etfs"].append(_etf_to_dict(etf))

        blacklist_dict: dict[str, str] = {row.ticker: row.reason for row in blacklist_rows}

        _cache = {
            "version": UNIVERSE_VERSION,
            "buckets": buckets,
            "blacklist": blacklist_dict,
        }
    return _cache


def invalidate_cache() -> None:
    """Call after any write to universe_etfs or universe_blacklist."""
    global _cache
    with _lock:
        _cache = None


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
    for bucket_data in universe.get("buckets", {}).values():
        for etf in bucket_data.get("etfs", []):
            if etf["ticker"] == ticker:
                return etf
    return None


def is_blacklisted(ticker: str) -> tuple[bool, str]:
    universe = _load()
    bl = universe.get("blacklist", {})
    if ticker in bl:
        return True, bl[ticker]

    meta = get_etf_metadata(ticker)
    if meta:
        ter = meta.get("ter")
        if ter is not None and ter > HIGH_TER_THRESHOLD and ticker not in HIGH_TER_EXCEPTIONS:
            return True, f"TER {ter:.2%} exceeds {HIGH_TER_THRESHOLD:.2%} threshold"

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
    return list(bucket.get("etfs", []))


def get_ucits_alternatives(ticker: str) -> list[str]:
    """UCITS-domiciled tickers in the same bucket as the given (US-domiciled) ticker."""
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


def get_blacklist() -> dict[str, str]:
    return dict(_load().get("blacklist", {}))


def get_universe_version() -> str:
    return _load().get("version", UNIVERSE_VERSION)
