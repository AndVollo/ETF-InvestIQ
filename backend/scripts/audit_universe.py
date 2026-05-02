#!/usr/bin/env python3
"""Audit the ETF universe YAML for consistency and data quality."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import yaml

from app.config import settings


def audit() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    with settings.universe_file.open(encoding="utf-8") as f:
        universe = yaml.safe_load(f)

    all_tickers: list[str] = []
    buckets = universe.get("buckets", {})

    for bucket_name, bucket_data in buckets.items():
        etfs = bucket_data.get("etfs", [])
        if not etfs:
            warnings.append(f"Bucket {bucket_name} has no ETFs")

        for etf in etfs:
            ticker = etf.get("ticker", "MISSING")
            all_tickers.append(ticker)

            if not etf.get("name"):
                errors.append(f"{ticker}: missing name")
            if etf.get("ter") is None:
                errors.append(f"{ticker}: missing TER")
            elif etf["ter"] > 0.50:
                bl_exceptions = universe.get("blacklist", {}).get("high_ter", {}).get("exceptions", [])
                if ticker not in bl_exceptions:
                    warnings.append(f"{ticker}: TER {etf['ter']:.2%} > 0.50% (consider blacklisting)")
            if not etf.get("inception"):
                warnings.append(f"{ticker}: missing inception date")
            if not etf.get("aum_b"):
                warnings.append(f"{ticker}: missing AUM")

            # UCITS / domicile checks
            domicile = etf.get("domicile")
            distribution = etf.get("distribution")
            ucits = etf.get("ucits")
            if domicile not in ("US", "IE", "LU"):
                errors.append(f"{ticker}: missing or invalid domicile ({domicile!r})")
            if distribution not in ("Distributing", "Accumulating"):
                errors.append(f"{ticker}: missing or invalid distribution ({distribution!r})")
            if not isinstance(ucits, bool):
                errors.append(f"{ticker}: ucits flag must be bool, got {type(ucits).__name__}")
            if ucits and domicile not in ("IE", "LU"):
                warnings.append(f"{ticker}: ucits=true but domicile={domicile} (UCITS funds must be IE or LU)")
            if domicile == "US" and ucits:
                errors.append(f"{ticker}: domicile=US is incompatible with ucits=true")
            if etf.get("isin") and not isinstance(etf["isin"], str):
                errors.append(f"{ticker}: isin must be a string when set")

    # Duplicate check
    seen: set[str] = set()
    for t in all_tickers:
        if t in seen:
            errors.append(f"Duplicate ticker: {t}")
        seen.add(t)

    # Count
    print(f"Universe version: {universe.get('version', 'unknown')}")
    print(f"Total ETFs: {len(all_tickers)} (declared: {universe.get('total_etfs', '?')})")
    if len(all_tickers) != universe.get("total_etfs", 0):
        warnings.append(f"total_etfs mismatch: YAML says {universe.get('total_etfs')}, found {len(all_tickers)}")

    for w in warnings:
        print(f"  WARN  {w}")
    for e in errors:
        print(f"  ERROR {e}")

    if errors:
        print(f"\nAudit FAILED — {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1

    print(f"\nAudit PASSED — {len(warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    sys.exit(audit())
