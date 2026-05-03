from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base application error — always carries a message_key for i18n."""

    status_code: int = 500

    def __init__(self, message_key: str, params: dict[str, object] | None = None) -> None:
        self.message_key = message_key
        self.params = params or {}
        super().__init__(message_key)


class NotFoundError(AppError):
    status_code = 404

    def __init__(self, resource: str, id: int | str) -> None:
        super().__init__("error.not_found", {"resource": resource, "id": id})


class ValidationError(AppError):
    status_code = 422


class BlacklistedTickerError(ValidationError):
    def __init__(self, ticker: str, reason: str) -> None:
        super().__init__("error.ticker_blacklisted", {"ticker": ticker, "reason": reason})


class UniverseTickerError(ValidationError):
    def __init__(self, ticker: str) -> None:
        super().__init__("error.ticker_not_in_universe", {"ticker": ticker})


class AllocationSumError(ValidationError):
    def __init__(self, total: float) -> None:
        super().__init__("error.allocation_sum_invalid", {"total": round(total, 4)})


class HardCapError(ValidationError):
    def __init__(self, cap_type: str, actual_pct: float, cap_pct: float) -> None:
        super().__init__(
            "error.hard_cap_exceeded",
            {"cap_type": cap_type, "actual": round(actual_pct, 2), "cap": cap_pct},
        )


class HorizonCompatibilityError(ValidationError):
    def __init__(self, horizon: str, equity_pct: float) -> None:
        super().__init__(
            "error.horizon_incompatible",
            {"horizon": horizon, "equity_pct": round(equity_pct, 2)},
        )


class BucketArchivedError(AppError):
    status_code = 409

    def __init__(self, bucket_id: int) -> None:
        super().__init__("error.bucket_archived", {"bucket_id": bucket_id})


class DataUnavailableError(AppError):
    status_code = 503

    def __init__(self, source: str, ticker: str | None = None) -> None:
        super().__init__("error.data_unavailable", {"source": source, "ticker": ticker})


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"message_key": exc.message_key, "params": exc.params},
    )


import structlog

logger = structlog.get_logger(__name__)

async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled_exception", path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"message_key": "error.internal", "params": {}},
    )
