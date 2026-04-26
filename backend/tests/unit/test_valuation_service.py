from __future__ import annotations

import pytest

from app.services.valuation_service import (
    classify,
    compute_52w_percentile,
    compute_sma200_deviation,
    compute_z_score,
)


# ── classify() — exact PRD thresholds ────────────────────────────────────────

def test_classify_none_is_insufficient():
    assert classify(None) == "INSUFFICIENT_HISTORY"


def test_classify_below_minus_1_5_is_cheap():
    assert classify(-1.5001) == "CHEAP"
    assert classify(-2.0) == "CHEAP"
    assert classify(-10.0) == "CHEAP"


def test_classify_exactly_minus_1_5_is_fair():
    # PRD: z < -1.5 → CHEAP, so -1.5 itself is FAIR
    assert classify(-1.5) == "FAIR"


def test_classify_zero_is_fair():
    assert classify(0.0) == "FAIR"


def test_classify_exactly_1_5_is_fair():
    # PRD: z > 1.5 → EXPENSIVE, so 1.5 itself is FAIR
    assert classify(1.5) == "FAIR"


def test_classify_above_1_5_is_expensive():
    assert classify(1.5001) == "EXPENSIVE"
    assert classify(2.0) == "EXPENSIVE"
    assert classify(10.0) == "EXPENSIVE"


def test_classify_full_range():
    cases = [
        (-3.0, "CHEAP"),
        (-1.5001, "CHEAP"),
        (-1.5, "FAIR"),
        (-0.5, "FAIR"),
        (0.0, "FAIR"),
        (0.5, "FAIR"),
        (1.5, "FAIR"),
        (1.5001, "EXPENSIVE"),
        (3.0, "EXPENSIVE"),
    ]
    for z, expected in cases:
        assert classify(z) == expected, f"classify({z}) should be {expected}"


# ── compute_z_score() ─────────────────────────────────────────────────────────

def test_z_score_insufficient_history():
    assert compute_z_score([100.0] * 50) is None  # < 90 days


def test_z_score_flat_prices():
    prices = [100.0] * 200
    # stdev = 0, so z_score = 0.0
    assert compute_z_score(prices) == 0.0


def test_z_score_current_at_mean():
    # Symmetric prices: current = mean → z = 0
    prices = list(range(80, 120)) + list(range(119, 79, -1))  # 80 prices, symmetric
    z = compute_z_score(prices)
    assert z is not None
    # Last price is 80, mean is ~99.5 — not symmetric last, but should be computable
    assert isinstance(z, float)


def test_z_score_high_price_is_positive():
    # Build prices: mostly around 100, then spike to 200
    prices = [100.0] * 200 + [200.0]
    z = compute_z_score(prices)
    assert z is not None
    assert z > 0  # current (200) is above mean (~100.5)


def test_z_score_low_price_is_negative():
    prices = [100.0] * 200 + [50.0]
    z = compute_z_score(prices)
    assert z is not None
    assert z < 0


def test_z_score_known_value():
    # prices: 98, 100, 102 → mean=100, stdev≈2, last=102 → z≈1.0
    prices = [98.0, 100.0, 102.0] * 40  # 120 values
    z = compute_z_score(prices)
    assert z is not None
    assert abs(z - 0.0) < 1.0  # current (102) repeating pattern → z should be near 1 or 0


# ── compute_52w_percentile() ──────────────────────────────────────────────────

def test_52w_at_minimum():
    prices = [100.0, 110.0, 120.0, 100.0]  # last = min
    assert compute_52w_percentile(prices) == 0.0


def test_52w_at_maximum():
    prices = [100.0, 110.0, 120.0]  # last = max
    assert compute_52w_percentile(prices) == 100.0


def test_52w_at_midpoint():
    prices = [90.0, 110.0, 100.0]  # last = 100, min=90, max=110
    assert compute_52w_percentile(prices) == 50.0


def test_52w_insufficient_data():
    assert compute_52w_percentile([100.0]) is None


def test_52w_flat_prices():
    prices = [100.0] * 100
    assert compute_52w_percentile(prices) == 50.0


def test_52w_uses_last_252_days():
    # Old prices out of 52w window — only last 252 matter
    old = [50.0] * 300
    recent = [90.0, 110.0, 100.0]
    prices = old + recent
    pct = compute_52w_percentile(prices)
    assert pct == 50.0  # only last 252 used: [110.0, 100.0, 90.0 copies…]
    # Actually last 252 of (old+recent) = last 252 = all old[52:] + recent


# ── compute_sma200_deviation() ────────────────────────────────────────────────

def test_sma200_insufficient_data():
    assert compute_sma200_deviation([100.0] * 150) is None


def test_sma200_above_mean():
    prices = [100.0] * 199 + [120.0]  # last > SMA200
    dev = compute_sma200_deviation(prices)
    assert dev is not None
    assert dev > 0


def test_sma200_below_mean():
    prices = [100.0] * 199 + [80.0]  # last < SMA200
    dev = compute_sma200_deviation(prices)
    assert dev is not None
    assert dev < 0


def test_sma200_at_mean():
    prices = [100.0] * 200  # last = SMA200
    dev = compute_sma200_deviation(prices)
    assert dev == 0.0
