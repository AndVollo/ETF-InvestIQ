from __future__ import annotations

import pytest

from app.services.drawdown_service import (
    SCENARIOS,
    _CATEGORY_DEFAULTS,
    _INCEPTION_YEAR,
    _PROXY_MAP,
    _SCENARIO_INDEX,
)


class TestScenarioDefinitions:
    def test_four_scenarios_defined(self):
        assert len(SCENARIOS) == 4

    def test_scenario_names(self):
        names = [s[0] for s in SCENARIOS]
        assert "2008 GFC" in names
        assert "2020 COVID" in names
        assert "2022 Rate Hike" in names

    def test_peak_before_trough(self):
        for name, peak, trough in SCENARIOS:
            assert peak < trough, f"{name}: peak {peak} must be before trough {trough}"

    def test_scenario_index_covers_all(self):
        names = {s[0] for s in SCENARIOS}
        assert names == set(_SCENARIO_INDEX.keys())


class TestProxyMapping:
    def test_avuv_maps_to_ijs(self):
        assert _PROXY_MAP["AVUV"] == "IJS"

    def test_avdv_maps_to_scz(self):
        assert _PROXY_MAP["AVDV"] == "SCZ"

    def test_aves_maps_to_dgs(self):
        assert _PROXY_MAP["AVES"] == "DGS"

    def test_proxy_inception_year_2019(self):
        for ticker in ("AVUV", "AVDV", "AVES"):
            assert _INCEPTION_YEAR[ticker] == 2019

    def test_2008_scenario_uses_proxy_for_avuv(self):
        _, peak_date, _ = next(s for s in SCENARIOS if s[0] == "2008 GFC")
        assert peak_date.year < _INCEPTION_YEAR["AVUV"]  # must use proxy

    def test_2022_scenario_does_not_use_proxy_for_avuv(self):
        _, peak_date, _ = next(s for s in SCENARIOS if s[0] == "2022 Rate Hike")
        assert peak_date.year >= _INCEPTION_YEAR["AVUV"]  # no proxy needed


class TestCategoryDefaults:
    def test_all_categories_have_four_values(self):
        for cat, vals in _CATEGORY_DEFAULTS.items():
            assert len(vals) == 4, f"{cat} must have 4 scenario defaults"

    def test_bonds_positive_in_2000(self):
        assert _CATEGORY_DEFAULTS["US_BONDS"][0] > 0

    def test_ultra_short_near_zero(self):
        for val in _CATEGORY_DEFAULTS["ULTRA_SHORT_TERM"]:
            assert abs(val) < 5.0

    def test_equity_negative_in_2008(self):
        assert _CATEGORY_DEFAULTS["GLOBAL_CORE"][1] < -30

    def test_reits_large_drawdown_2008(self):
        # REITs were hit hard in GFC
        assert _CATEGORY_DEFAULTS["REITS"][1] < -50
