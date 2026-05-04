from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.schemas.universe_admin import (
    BlacklistEntryCreate,
    BlacklistEntryResponse,
    BulkImportRequest,
    BulkImportResponse,
    DiscoveryPromptResponse,
    UniverseETFCreate,
    UniverseETFResponse,
    UniverseETFUpdate,
)
from app.services import universe_admin_service as svc, universe_service as svc_uni

router = APIRouter(prefix="/universe/admin", tags=["universe-admin"])


@router.get("/etfs", response_model=list[UniverseETFResponse])
async def list_etfs(
    bucket_name: str | None = None,
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[UniverseETFResponse]:
    rows = await svc.list_etfs(db, bucket_name=bucket_name, include_inactive=include_inactive)
    return [UniverseETFResponse.model_validate(r) for r in rows]


@router.post("/etfs", response_model=UniverseETFResponse, status_code=201)
async def create_etf(
    payload: UniverseETFCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> UniverseETFResponse:
    etf = await svc.create_etf(payload, db)
    return UniverseETFResponse.model_validate(etf)


@router.put("/etfs/{ticker}", response_model=UniverseETFResponse)
async def update_etf(
    ticker: str,
    payload: UniverseETFUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> UniverseETFResponse:
    etf = await svc.update_etf(ticker, payload, db)
    return UniverseETFResponse.model_validate(etf)


@router.delete("/etfs/{ticker}", status_code=204)
async def delete_etf(
    ticker: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    await svc.delete_etf(ticker, db)


@router.get("/blacklist", response_model=list[BlacklistEntryResponse])
async def list_blacklist(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[BlacklistEntryResponse]:
    rows = await svc.list_blacklist(db)
    return [BlacklistEntryResponse.model_validate(r) for r in rows]


@router.post("/blacklist", response_model=BlacklistEntryResponse, status_code=201)
async def add_blacklist(
    payload: BlacklistEntryCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> BlacklistEntryResponse:
    entry = await svc.add_to_blacklist(payload, db)
    return BlacklistEntryResponse.model_validate(entry)


@router.delete("/blacklist/{ticker}", status_code=204)
async def remove_blacklist(
    ticker: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    await svc.remove_from_blacklist(ticker, db)


@router.get("/discovery-prompt", response_model=DiscoveryPromptResponse)
async def discovery_prompt(
    _: User = Depends(get_current_user),
) -> DiscoveryPromptResponse:
    return DiscoveryPromptResponse(
        prompt=svc.generate_discovery_prompt(),
        bucket_options=sorted(svc_uni.BUCKET_CONFIG.keys()),
        finviz_screener_url=svc.finviz_screener_url(),
    )


@router.post("/bulk-import", response_model=BulkImportResponse)
async def bulk_import(
    payload: BulkImportRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> BulkImportResponse:
    return await svc.bulk_import(payload, db)
