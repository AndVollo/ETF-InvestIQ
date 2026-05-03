from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

import httpx

from app.core.exceptions import AppError, NotFoundError
from app.core.logging import get_logger
from app.db.models.settings import SETTING_KEYS
from app.db.session import get_db
from app.schemas.app_settings import SettingResponse, SettingUpdate, SettingsListResponse
from app.services import settings_service

logger = get_logger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])


class BackupResponse(BaseModel):
    path: str
    bytes: int


class FredValidateRequest(BaseModel):
    api_key: str


class FredValidateResponse(BaseModel):
    valid: bool
    message: str


class ConnectionStatusResponse(BaseModel):
    fred: dict
    yfinance: dict
    internet: dict


class _BackupFailedError(AppError):
    status_code = 503


# ── Validate FRED API Key ─────────────────────────────────────────────────────
@router.post("/validate-fred", response_model=FredValidateResponse)
async def validate_fred_key(payload: FredValidateRequest) -> FredValidateResponse:
    """Test a FRED API key by making a lightweight call to the FRED API."""
    api_key = payload.api_key.strip().lower()
    if not api_key:
        return FredValidateResponse(valid=False, message="empty_key")

    url = "https://api.stlouisfed.org/fred/series"
    params = {
        "series_id": "GNPCA",
        "api_key": api_key,
        "file_type": "json",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                if "seriess" in data:
                    return FredValidateResponse(valid=True, message="ok")
                return FredValidateResponse(valid=False, message="invalid_response")
            
            # Log the failure details for debugging
            logger.warning(
                "fred_validate_failed",
                status_code=resp.status_code,
                response_body=resp.text[:500],
                url=url
            )
            
            if resp.status_code in (400, 403):
                return FredValidateResponse(valid=False, message="invalid_key")
            else:
                return FredValidateResponse(valid=False, message=f"http_{resp.status_code}")
    except httpx.TimeoutException:
        logger.warning("fred_validate_timeout")
        return FredValidateResponse(valid=False, message="timeout")
    except Exception as exc:
        logger.exception("fred_validate_error")
        return FredValidateResponse(valid=False, message=f"network_error: {str(exc)}")


# ── Connection Status (FRED + yfinance) ───────────────────────────────────────
@router.get("/connection-status", response_model=ConnectionStatusResponse)
async def connection_status(
    db: AsyncSession = Depends(get_db),
) -> ConnectionStatusResponse:
    """Check live connectivity to FRED and yfinance servers."""
    
    # --- Internet status ---
    internet_result = {"connected": False, "message": "checking"}
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.head("https://www.google.com")
            if resp.status_code < 400:
                internet_result = {"connected": True, "message": "ok"}
            else:
                internet_result = {"connected": False, "message": f"http_{resp.status_code}"}
    except Exception as exc:
        internet_result = {"connected": False, "message": str(exc)}

    # --- FRED status ---
    fred_result: dict = {"connected": False, "has_key": False, "message": "not_configured"}
    fred_key = await settings_service.get_setting("fred_api_key", db)
    if fred_key:
        key_str = str(fred_key).strip().lower()
        if key_str:
            fred_result["has_key"] = True
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(
                        "https://api.stlouisfed.org/fred/series",
                        params={
                            "series_id": "GNPCA",
                            "api_key": key_str,
                            "file_type": "json",
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        if "seriess" in data:
                            fred_result["connected"] = True
                            fred_result["message"] = "ok"
                        else:
                            fred_result["message"] = "invalid_response"
                    elif resp.status_code in (400, 403):
                        fred_result["message"] = "invalid_key"
                    else:
                        fred_result["message"] = f"http_{resp.status_code}"
            except Exception as exc:
                logger.warning("fred_status_check_failed", error=str(exc))
                fred_result["message"] = "network_error"

    # --- yfinance status ---
    yf_result: dict = {"connected": False, "message": "checking"}
    try:
        import yfinance as yf

        def _ping_yf() -> bool:
            ticker = yf.Ticker("SPY")
            info = ticker.fast_info
            return info is not None and hasattr(info, "last_price")

        ok = await asyncio.to_thread(_ping_yf)
        if ok:
            yf_result = {"connected": True, "message": "ok"}
        else:
            yf_result = {"connected": False, "message": "no_data"}
    except Exception as exc:
        import traceback
        tb = traceback.format_exc()
        logger.exception("yfinance_check_failed", error=str(exc))
        yf_result = {"connected": False, "message": f"{str(exc)}\n{tb}"[:500]}

    return ConnectionStatusResponse(fred=fred_result, yfinance=yf_result, internet=internet_result)


@router.get("/", response_model=SettingsListResponse)
async def list_settings(db: AsyncSession = Depends(get_db)) -> SettingsListResponse:
    rows = await settings_service.get_all_settings(db)
    return SettingsListResponse(
        settings=[SettingResponse(key=k, value=v) for k, v in rows]
    )


@router.get("/{key}", response_model=SettingResponse)
async def get_setting(key: str, db: AsyncSession = Depends(get_db)) -> SettingResponse:
    value = await settings_service.get_setting(key, db)
    if value is None and key not in SETTING_KEYS:
        raise NotFoundError("setting", key)
    return SettingResponse(key=key, value=value)


@router.put("/{key}", response_model=SettingResponse)
async def update_setting(
    key: str, payload: SettingUpdate, db: AsyncSession = Depends(get_db)
) -> SettingResponse:
    value = payload.value
    if key == "fred_api_key" and isinstance(value, str):
        value = value.strip().lower()
    
    await settings_service.set_setting(key, value, db)
    return SettingResponse(key=key, value=value)


@router.post("/backup", response_model=BackupResponse)
async def create_backup() -> BackupResponse:
    """Snapshot the live SQLite DB to a timestamped sibling file.

    Backups land next to the live DB so they share a filesystem (atomic
    copy, no cross-device move). The user can then sync them off-device
    however they want.
    """
    from scripts.backup_db import create_backup as _create_backup

    try:
        path = _create_backup()
    except FileNotFoundError as exc:
        raise _BackupFailedError("error.backup_db_missing", {"detail": str(exc)}) from exc
    except OSError as exc:
        logger.error("backup_failed", error=str(exc))
        raise _BackupFailedError("error.backup_failed", {"detail": str(exc)}) from exc

    return BackupResponse(path=str(path), bytes=path.stat().st_size)
