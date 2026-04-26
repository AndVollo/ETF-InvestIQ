from __future__ import annotations

from pydantic import BaseModel, model_validator

from app.config import settings

EQUITY_BUCKETS = frozenset(
    {"GLOBAL_CORE", "US_FACTOR_VALUE", "INTL_FACTOR_VALUE", "EMERGING_MARKETS", "REITS"}
)


class TargetAllocation(BaseModel):
    """Validates a target allocation dict against all hard rules."""

    holdings: dict[str, float]  # ticker → percentage (0-100)

    @model_validator(mode="after")
    def sum_must_be_100(self) -> "TargetAllocation":
        total = sum(self.holdings.values())
        if abs(total - 100.0) > settings.allocation_sum_tolerance:
            from app.core.exceptions import AllocationSumError

            raise AllocationSumError(total)
        return self

    @model_validator(mode="after")
    def all_tickers_valid(self) -> "TargetAllocation":
        # Deferred import to avoid circular deps at module load time.
        from app.services.universe_service import get_universe_tickers, is_blacklisted
        from app.core.exceptions import BlacklistedTickerError, UniverseTickerError

        valid = get_universe_tickers()
        for ticker in self.holdings:
            blocked, reason = is_blacklisted(ticker)
            if blocked:
                raise BlacklistedTickerError(ticker, reason)
            if ticker not in valid:
                raise UniverseTickerError(ticker)
        return self

    @model_validator(mode="after")
    def reit_cap_check(self) -> "TargetAllocation":
        from app.services.universe_service import get_etf_metadata
        from app.core.exceptions import HardCapError

        reit_total = sum(
            pct
            for ticker, pct in self.holdings.items()
            if (meta := get_etf_metadata(ticker)) and meta.get("bucket") == "REITS"
        )
        if reit_total > settings.reit_hard_cap_pct:
            raise HardCapError("REITS", reit_total, settings.reit_hard_cap_pct)
        return self

    @model_validator(mode="after")
    def commodities_cap_check(self) -> "TargetAllocation":
        from app.services.universe_service import get_etf_metadata
        from app.core.exceptions import HardCapError

        cmd_total = sum(
            pct
            for ticker, pct in self.holdings.items()
            if (meta := get_etf_metadata(ticker)) and meta.get("bucket") == "COMMODITIES_HEDGE"
        )
        if cmd_total > settings.commodities_hard_cap_pct:
            raise HardCapError("COMMODITIES_HEDGE", cmd_total, settings.commodities_hard_cap_pct)
        return self


class BucketAllocationCompatibility(BaseModel):
    """Ensures horizon type matches asset types in allocation."""

    bucket_horizon: str  # SHORT, MEDIUM, LONG
    holdings: dict[str, float]

    @model_validator(mode="after")
    def horizon_matches_assets(self) -> "BucketAllocationCompatibility":
        from app.services.universe_service import get_etf_metadata
        from app.core.exceptions import HorizonCompatibilityError

        equity_pct = sum(
            pct
            for ticker, pct in self.holdings.items()
            if (meta := get_etf_metadata(ticker)) and meta.get("bucket") in EQUITY_BUCKETS
        )

        if self.bucket_horizon == "SHORT" and equity_pct > 0:
            raise HorizonCompatibilityError("SHORT", equity_pct)
        if (
            self.bucket_horizon == "MEDIUM"
            and equity_pct > settings.medium_term_equity_cap_pct
        ):
            raise HorizonCompatibilityError("MEDIUM", equity_pct)
        return self
