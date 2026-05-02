from __future__ import annotations

import pytest

from app.services.sector_service import (
    _normalize_sector,
    check_target_allocation_caps,
    detect_hidden_stocks,
)


class TestNormalizeSector:
    def test_lowercase_real_estate(self):
        assert _normalize_sector("realestate") == "Real Estate"

    def test_financial_services_alias(self):
        assert _normalize_sector("financials") == "Financial Services"

    def test_unknown_passthrough_titlecase(self):
        result = _normalize_sector("some new sector")
        assert result == "Some New Sector"


class TestCheckTargetAllocationCaps:
    def test_no_warnings_for_clean_portfolio(self):
        # VTI = GLOBAL_CORE, BND = US_BONDS — no caps
        warnings = check_target_allocation_caps({"VTI": 70.0, "BND": 30.0})
        assert warnings == []

    def test_reit_cap_breach(self):
        # VNQ is REITS bucket; 20% > 15% cap
        warnings = check_target_allocation_caps({"VTI": 80.0, "VNQ": 20.0})
        reit_warnings = [w for w in warnings if w.cap_type == "REITS"]
        assert len(reit_warnings) == 1
        assert reit_warnings[0].actual_pct == pytest.approx(20.0)
        assert reit_warnings[0].cap_pct == 15.0

    def test_reit_at_cap_no_warning(self):
        # VNQ at exactly 15% — no breach
        warnings = check_target_allocation_caps({"VTI": 85.0, "VNQ": 15.0})
        reit_warnings = [w for w in warnings if w.cap_type == "REITS"]
        assert len(reit_warnings) == 0

    def test_commodities_cap_breach(self):
        # IAU is COMMODITIES_HEDGE; 12% > 10% cap
        warnings = check_target_allocation_caps({"VTI": 88.0, "IAU": 12.0})
        comm_warnings = [w for w in warnings if w.cap_type == "COMMODITIES_HEDGE"]
        assert len(comm_warnings) == 1
        assert comm_warnings[0].actual_pct == pytest.approx(12.0)

    def test_both_caps_breached(self):
        warnings = check_target_allocation_caps({"VNQ": 20.0, "IAU": 15.0, "BND": 65.0})
        types = {w.cap_type for w in warnings}
        assert "REITS" in types
        assert "COMMODITIES_HEDGE" in types

    def test_message_key_format(self):
        warnings = check_target_allocation_caps({"VNQ": 20.0, "VTI": 80.0})
        assert warnings[0].message_key == "warning.sector.reit_cap_breach"

    def test_unknown_ticker_ignored(self):
        # Unknown tickers have no metadata → count as zero toward caps
        warnings = check_target_allocation_caps({"FAKE_ETF": 100.0})
        assert warnings == []


class TestDetectHiddenStocks:
    """Stocks that surface ≥5% via two or more ETFs in the bucket."""

    def test_apple_via_two_etfs_flagged(self):
        # VTI 50% × AAPL 7% = 3.5%; VOO 40% × AAPL 6.5% = 2.6% → 6.1% combined
        holdings = [
            {
                "ticker": "VTI",
                "portfolio_pct": 50.0,
                "top_holdings": [{"symbol": "AAPL", "weight": 0.07}],
            },
            {
                "ticker": "VOO",
                "portfolio_pct": 40.0,
                "top_holdings": [{"symbol": "AAPL", "weight": 0.065}],
            },
        ]
        hidden = detect_hidden_stocks(holdings)
        assert len(hidden) == 1
        h = hidden[0]
        assert h.symbol == "AAPL"
        assert h.total_exposure_pct == pytest.approx(6.1, abs=0.01)
        assert set(h.appears_in) == {"VTI", "VOO"}
        assert h.message_key == "warning.sector.hidden_stock"

    def test_single_etf_source_not_flagged(self):
        # Even at 10% combined exposure, only one ETF source → not "hidden"
        holdings = [
            {
                "ticker": "VTI",
                "portfolio_pct": 100.0,
                "top_holdings": [{"symbol": "AAPL", "weight": 0.10}],
            },
        ]
        assert detect_hidden_stocks(holdings) == []

    def test_below_5pct_threshold_not_flagged(self):
        # Two sources but only 3% combined → ignored
        holdings = [
            {"ticker": "VTI", "portfolio_pct": 50.0, "top_holdings": [{"symbol": "MSFT", "weight": 0.03}]},
            {"ticker": "VOO", "portfolio_pct": 30.0, "top_holdings": [{"symbol": "MSFT", "weight": 0.05}]},
        ]
        assert detect_hidden_stocks(holdings) == []

    def test_empty_top_holdings_returns_empty(self):
        holdings = [{"ticker": "BND", "portfolio_pct": 100.0, "top_holdings": []}]
        assert detect_hidden_stocks(holdings) == []

    def test_results_sorted_by_exposure_desc(self):
        holdings = [
            {"ticker": "A", "portfolio_pct": 50.0, "top_holdings": [
                {"symbol": "X", "weight": 0.20}, {"symbol": "Y", "weight": 0.10},
            ]},
            {"ticker": "B", "portfolio_pct": 50.0, "top_holdings": [
                {"symbol": "X", "weight": 0.05}, {"symbol": "Y", "weight": 0.10},
            ]},
        ]
        hidden = detect_hidden_stocks(holdings)
        assert [h.symbol for h in hidden] == ["X", "Y"]

    def test_zero_weight_entries_skipped(self):
        holdings = [
            {"ticker": "VTI", "portfolio_pct": 50.0, "top_holdings": [
                {"symbol": "GHOST", "weight": 0.0},
                {"symbol": "REAL", "weight": 0.07},
            ]},
            {"ticker": "VOO", "portfolio_pct": 50.0, "top_holdings": [
                {"symbol": "REAL", "weight": 0.07},
            ]},
        ]
        hidden = detect_hidden_stocks(holdings)
        assert len(hidden) == 1
        assert hidden[0].symbol == "REAL"
