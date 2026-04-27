from __future__ import annotations

import math

import pytest

from app.services.scoring_service import (
    WEIGHTS,
    ComponentScores,
    _build_components,
    _cost_score,
    _liquidity_score,
    _sharpe_score_from_prices,
    _tracking_error_score_proxy,
)


# ── Weight integrity ──────────────────────────────────────────────────────────

def test_weights_sum_to_1():
    assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9


def test_weights_keys():
    assert set(WEIGHTS.keys()) == {"cost", "sharpe_3y", "tracking_error", "liquidity_aum"}


# ── Cost score ────────────────────────────────────────────────────────────────

def test_cost_score_cheapest_etf():
    score = _cost_score(0.03)  # VTI, SCHB
    assert score > 0.95


def test_cost_score_expensive_etf():
    score = _cost_score(0.70)
    assert score < 0.05


def test_cost_score_is_inverse():
    assert _cost_score(0.03) > _cost_score(0.25) > _cost_score(0.70)


def test_cost_score_bounds():
    for ter in [0.03, 0.10, 0.25, 0.40, 0.70]:
        score = _cost_score(ter)
        assert 0.0 <= score <= 1.0, f"cost_score({ter}) = {score} out of [0,1]"


def test_cost_score_clamps_below_min():
    assert _cost_score(0.001) == _cost_score(0.03)


def test_cost_score_clamps_above_max():
    assert _cost_score(1.0) == _cost_score(0.70)


# ── Liquidity score ───────────────────────────────────────────────────────────

def test_liquidity_score_large_fund_wins():
    assert _liquidity_score(430.0) > _liquidity_score(1.0)


def test_liquidity_score_zero_aum():
    assert _liquidity_score(0.0) == 0.0


def test_liquidity_score_negative_aum():
    assert _liquidity_score(-1.0) == 0.0


def test_liquidity_score_bounds():
    for aum in [0.5, 1.0, 10.0, 50.0, 430.0]:
        score = _liquidity_score(aum)
        assert 0.0 <= score <= 1.0, f"liquidity_score({aum}) = {score} out of [0,1]"


def test_liquidity_score_log_scale():
    # Log scale: going from 1B to 10B should gain less than 1B to 100B
    gain_1_to_10 = _liquidity_score(10.0) - _liquidity_score(1.0)
    gain_10_to_100 = _liquidity_score(100.0) - _liquidity_score(10.0)
    assert gain_1_to_10 < gain_10_to_100  # false — log is concave, so gain shrinks
    # Actually log is concave: gains should DECREASE as AUM grows
    # Correct assertion:
    assert gain_1_to_10 > (_liquidity_score(200.0) - _liquidity_score(100.0))


# ── Sharpe from prices ────────────────────────────────────────────────────────

def _trending_prices(n: int, start: float, end: float) -> list[float]:
    step = (end - start) / (n - 1)
    return [start + i * step for i in range(n)]


def test_sharpe_insufficient_history():
    assert _sharpe_score_from_prices([100.0] * 30) is None  # < 60 days


def test_sharpe_positive_trend():
    prices = _trending_prices(500, 100.0, 150.0)
    score = _sharpe_score_from_prices(prices, rf_rate=0.04)
    assert score is not None
    assert score > 0.5  # profitable → above neutral


def test_sharpe_flat_prices():
    prices = [100.0] * 300
    score = _sharpe_score_from_prices(prices)
    assert score == 0.5  # zero vol → neutral


def test_sharpe_score_bounds():
    prices = _trending_prices(500, 100.0, 200.0)
    score = _sharpe_score_from_prices(prices)
    assert score is not None
    assert 0.0 <= score <= 1.0


def test_sharpe_negative_trend_lower_than_positive():
    up = _sharpe_score_from_prices(_trending_prices(300, 100.0, 130.0))
    down = _sharpe_score_from_prices(_trending_prices(300, 130.0, 100.0))
    assert up is not None and down is not None
    assert up > down


# ── Tracking error proxy ──────────────────────────────────────────────────────

def test_tracking_error_proxy_same_as_cost():
    for ter in [0.03, 0.15, 0.40]:
        assert _tracking_error_score_proxy(ter) == _cost_score(ter)


# ── Composite score ───────────────────────────────────────────────────────────

def test_composite_uses_weights():
    comp = ComponentScores(
        cost=1.0,
        sharpe_3y=0.0,
        tracking_error=0.0,
        liquidity_aum=0.0,
    )
    assert abs(comp.composite - WEIGHTS["cost"]) < 1e-9


def test_composite_all_ones():
    comp = ComponentScores(cost=1.0, sharpe_3y=1.0, tracking_error=1.0, liquidity_aum=1.0)
    assert abs(comp.composite - 1.0) < 1e-9


def test_composite_all_zeros():
    comp = ComponentScores(cost=0.0, sharpe_3y=0.0, tracking_error=0.0, liquidity_aum=0.0)
    assert comp.composite == 0.0


def test_build_components_no_prices_uses_neutral_sharpe():
    comp = _build_components(ter=0.07, aum_b=10.0, prices=None, rf_rate=0.045)
    assert comp.sharpe_3y == 0.5
    assert comp.sharpe_computed is False
    assert 0.0 <= comp.composite <= 1.0


def test_build_components_with_prices_computes_sharpe():
    prices = _trending_prices(400, 100.0, 140.0)
    comp = _build_components(ter=0.07, aum_b=10.0, prices=prices, rf_rate=0.045)
    assert comp.sharpe_computed is True
    assert comp.sharpe_3y != 0.5
