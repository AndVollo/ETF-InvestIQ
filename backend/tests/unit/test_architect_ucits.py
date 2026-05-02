"""Unit tests for architect_service.check_ucits_eligibility (pure function)."""
from __future__ import annotations

from app.services.architect_service import check_ucits_eligibility


def test_ucits_advisory_when_100pct_us():
    """All-US allocation with UCITS peers in universe → advisory present."""
    advisory = check_ucits_eligibility({"VTI": 60.0, "BND": 40.0}, is_us_citizen=False)
    assert advisory is not None
    assert advisory.message_key == "info.ucits_alternative_available"
    assert advisory.params["us_pct"] == 100.0
    assert "VTI" in advisory.params["suggestions"]
    assert "BND" in advisory.params["suggestions"]


def test_ucits_advisory_blocked_for_us_citizen():
    """is_us_citizen=True suppresses the advisory entirely (PFIC risk)."""
    advisory = check_ucits_eligibility({"VTI": 60.0, "BND": 40.0}, is_us_citizen=True)
    assert advisory is None


def test_ucits_advisory_skipped_when_already_ucits():
    """100% UCITS allocation has no US peers to advise about."""
    advisory = check_ucits_eligibility({"VWRA": 100.0}, is_us_citizen=False)
    assert advisory is None


def test_ucits_advisory_threshold_below_50():
    """49% US-domiciled is below the 50% trigger."""
    advisory = check_ucits_eligibility(
        {"VTI": 49.0, "VWRA": 51.0},
        is_us_citizen=False,
    )
    assert advisory is None


def test_ucits_advisory_threshold_at_50():
    """Exactly 50% US triggers the advisory."""
    advisory = check_ucits_eligibility(
        {"VTI": 50.0, "VWRA": 50.0},
        is_us_citizen=False,
    )
    assert advisory is not None
    assert advisory.params["us_pct"] == 50.0


def test_ucits_advisory_empty_allocation():
    assert check_ucits_eligibility({}, is_us_citizen=False) is None


def test_ucits_advisory_no_peers_available():
    """A US ETF that has no UCITS peer in its bucket returns no advisory."""
    # AVEM is in INTL_FACTOR_VALUE — that bucket has no UCITS entries in our universe.
    advisory = check_ucits_eligibility({"AVEM": 100.0}, is_us_citizen=False)
    assert advisory is None
