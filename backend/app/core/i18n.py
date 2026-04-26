from __future__ import annotations

# The server is locale-agnostic: it returns message_key + params.
# The frontend (i18next) translates. This module is a thin convenience
# wrapper used only in log messages — never in API responses.

MESSAGE_KEYS: frozenset[str] = frozenset(
    [
        "error.not_found",
        "error.ticker_blacklisted",
        "error.ticker_not_in_universe",
        "error.allocation_sum_invalid",
        "error.hard_cap_exceeded",
        "error.horizon_incompatible",
        "error.bucket_archived",
        "error.data_unavailable",
        "error.internal",
        "sector.warning.over_soft_cap",
        "sector.warning.over_hard_cap",
        "deposit.plan_created",
        "deposit.confirmed",
        "architect.session_started",
        "architect.session_confirmed",
        "universe.ticker_valid",
        "universe.ticker_invalid",
    ]
)


def assert_valid_key(key: str) -> None:
    """Dev-time guard: catch typos in message keys."""
    if key not in MESSAGE_KEYS:
        raise ValueError(f"Unknown message key: {key!r}")
