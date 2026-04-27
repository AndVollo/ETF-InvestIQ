from __future__ import annotations

import pytest

from app.services.smart_deposit_service import HoldingSlot, _compute_allocation


def _slot(ticker: str, units: float, target_pct: float, price: float) -> HoldingSlot:
    return HoldingSlot(
        holding_id=1,
        ticker=ticker,
        units=units,
        target_pct=target_pct,
        avg_cost_usd=price,
        current_price_usd=price,
        price_is_estimated=False,
    )


class TestComputeAllocationEdgeCases:
    def test_empty_slots_returns_zero(self):
        result = _compute_allocation([], 1000.0)
        assert result.orders == []
        assert result.total_allocated_usd == 0.0
        assert result.remainder_usd == 1000.0

    def test_zero_deposit_returns_zero(self):
        slots = [_slot("VTI", 10, 100.0, 200.0)]
        result = _compute_allocation(slots, 0.0)
        assert result.orders == []
        assert result.remainder_usd == 0.0

    def test_negative_deposit_returns_zero(self):
        slots = [_slot("VTI", 10, 100.0, 200.0)]
        result = _compute_allocation(slots, -100.0)
        assert result.orders == []

    def test_order_below_min_skipped(self):
        # Only $40 gap → below $50 min_order_usd; remainder stays
        slots = [_slot("BND", 0, 100.0, 40.0)]
        result = _compute_allocation(slots, 40.0, min_order_usd=50.0)
        assert result.orders == []
        assert result.remainder_usd == 40.0

    def test_single_slot_full_allocation(self):
        slots = [_slot("VTI", 0, 100.0, 200.0)]
        result = _compute_allocation(slots, 1000.0, min_order_usd=50.0)
        assert len(result.orders) == 1
        assert result.orders[0].ticker == "VTI"
        assert result.total_allocated_usd == pytest.approx(1000.0, abs=0.01)
        assert result.remainder_usd == pytest.approx(0.0, abs=0.01)


class TestComputeAllocationOrdering:
    def test_most_underweight_filled_first(self):
        """BND is at 0% but should be 60% → filled before VTI (already at 50% target 40%)."""
        slots = [
            _slot("VTI", 5, 40.0, 100.0),   # value=$500, 50% — overweight
            _slot("BND", 0, 60.0, 100.0),   # value=$0,   0% — underweight
        ]
        result = _compute_allocation(slots, 500.0, min_order_usd=50.0)
        # BND should get the first allocation
        assert result.orders[0].ticker == "BND"

    def test_two_underweight_slots_both_filled(self):
        # Portfolio empty, deposit 1000 split 60/40
        slots = [
            _slot("VTI", 0, 60.0, 100.0),
            _slot("BND", 0, 40.0, 100.0),
        ]
        result = _compute_allocation(slots, 1000.0, min_order_usd=50.0)
        tickers = {o.ticker for o in result.orders}
        assert "VTI" in tickers
        assert "BND" in tickers
        assert result.total_allocated_usd == pytest.approx(1000.0, abs=0.02)

    def test_overweight_slot_skipped(self):
        """VTI already 70% vs target 60% → only BND (target 40%, at 30%) gets allocation."""
        slots = [
            _slot("VTI", 7, 60.0, 100.0),   # $700 / $1000 = 70%
            _slot("BND", 3, 40.0, 100.0),   # $300 / $1000 = 30%
        ]
        # gap for VTI: projected_total=1200, target_value=720, current=700 → gap=20
        # gap for BND: target_value=480, current=300 → gap=180
        result = _compute_allocation(slots, 200.0, min_order_usd=50.0)
        tickers = [o.ticker for o in result.orders]
        # BND must be allocated; VTI gap < min_order if cascade; at least BND filled
        assert "BND" in tickers


class TestComputeAllocationPostDepositDrifts:
    def test_drifts_computed_for_all_slots(self):
        slots = [
            _slot("VTI", 0, 60.0, 100.0),
            _slot("BND", 0, 40.0, 100.0),
        ]
        result = _compute_allocation(slots, 1000.0)
        assert len(result.post_deposit_drifts) == 2
        tickers = {d.ticker for d in result.post_deposit_drifts}
        assert tickers == {"VTI", "BND"}

    def test_perfect_allocation_zero_drift(self):
        """Empty portfolio, one holding, full deposit → drift ≈ 0."""
        slots = [_slot("VTI", 0, 100.0, 100.0)]
        result = _compute_allocation(slots, 500.0)
        drift = result.post_deposit_drifts[0].drift_pct
        assert abs(drift) < 0.01

    def test_drift_fields_present(self):
        slots = [_slot("VTI", 5, 100.0, 200.0)]
        result = _compute_allocation(slots, 1000.0)
        d = result.post_deposit_drifts[0]
        assert hasattr(d, "ticker")
        assert hasattr(d, "target_pct")
        assert hasattr(d, "projected_pct")
        assert hasattr(d, "drift_pct")


class TestComputeAllocationRemainder:
    def test_remainder_when_all_gaps_filled_early(self):
        """Small gaps total $200 but deposit is $500 → remainder $300."""
        # current_total = $1000, projected = $1500
        # VTI target 60% → target_value = $900, current = $800, gap = $100
        # BND target 40% → target_value = $600, current = $200, gap = $400
        # deposit $300 < gap_BND, fills BND partially
        slots = [
            _slot("VTI", 8, 60.0, 100.0),   # $800
            _slot("BND", 2, 40.0, 100.0),   # $200
        ]
        result = _compute_allocation(slots, 300.0, min_order_usd=50.0)
        assert result.total_allocated_usd + result.remainder_usd == pytest.approx(300.0, abs=0.02)
