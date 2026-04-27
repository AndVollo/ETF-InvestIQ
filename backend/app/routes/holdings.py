from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.db.models.holding import Holding
from app.db.session import get_db
from app.schemas.holding import HoldingCreate, HoldingResponse, HoldingUpdate
from app.services import bucket_service
from app.services.universe_service import get_universe_tickers, is_blacklisted

logger = get_logger(__name__)

router = APIRouter(prefix="/holdings", tags=["holdings"])


@router.get("/", response_model=list[HoldingResponse])
async def list_holdings(
    bucket_id: int,
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db),
) -> list[HoldingResponse]:
    q = select(Holding).where(Holding.bucket_id == bucket_id)
    if not include_archived:
        q = q.where(Holding.is_archived == False)  # noqa: E712
    q = q.order_by(Holding.ticker.asc())
    result = await db.execute(q)
    holdings = list(result.scalars().all())
    return [HoldingResponse.model_validate(h) for h in holdings]


@router.post("/", response_model=HoldingResponse, status_code=201)
async def create_holding(
    payload: HoldingCreate,
    db: AsyncSession = Depends(get_db),
) -> HoldingResponse:
    # Bucket must exist and be active
    await bucket_service.get_active_bucket(payload.bucket_id, db)

    ticker = payload.ticker

    # Universe + blacklist check
    blacklisted, reason = is_blacklisted(ticker)
    if blacklisted:
        from app.core.exceptions import BlacklistedTickerError
        raise BlacklistedTickerError(ticker, reason or "blacklisted")

    universe = get_universe_tickers()
    if ticker not in universe:
        from app.core.exceptions import UniverseTickerError
        raise UniverseTickerError(ticker)

    # Upsert: if archived holding exists, unarchive it
    existing_result = await db.execute(
        select(Holding).where(
            Holding.bucket_id == payload.bucket_id,
            Holding.ticker == ticker,
        )
    )
    existing = existing_result.scalar_one_or_none()

    now = datetime.now(timezone.utc)

    if existing is not None:
        if not existing.is_archived:
            raise ValidationError("error.holding_already_exists", {"ticker": ticker})
        # Reactivate
        existing.is_archived = False
        existing.units = payload.units
        existing.avg_cost_usd = payload.avg_cost_usd
        existing.target_pct = payload.target_pct
        existing.notes = payload.notes
        existing.updated_at = now
        await db.flush()
        await db.refresh(existing)
        return HoldingResponse.model_validate(existing)

    holding = Holding(
        bucket_id=payload.bucket_id,
        ticker=ticker,
        units=payload.units,
        avg_cost_usd=payload.avg_cost_usd,
        target_pct=payload.target_pct,
        notes=payload.notes,
        is_archived=False,
        created_at=now,
        updated_at=now,
    )
    db.add(holding)
    await db.flush()
    await db.refresh(holding)
    logger.info("holding_created", bucket_id=payload.bucket_id, ticker=ticker)
    return HoldingResponse.model_validate(holding)


@router.put("/{holding_id}", response_model=HoldingResponse)
async def update_holding(
    holding_id: int,
    payload: HoldingUpdate,
    db: AsyncSession = Depends(get_db),
) -> HoldingResponse:
    result = await db.execute(
        select(Holding).where(Holding.id == holding_id, Holding.is_archived == False)  # noqa: E712
    )
    holding = result.scalar_one_or_none()
    if holding is None:
        raise NotFoundError("holding", holding_id)

    if payload.units is not None:
        holding.units = payload.units
    if payload.avg_cost_usd is not None:
        holding.avg_cost_usd = payload.avg_cost_usd
    if payload.target_pct is not None:
        holding.target_pct = payload.target_pct
    if payload.notes is not None:
        holding.notes = payload.notes

    holding.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(holding)
    return HoldingResponse.model_validate(holding)


@router.delete("/{holding_id}", status_code=204)
async def archive_holding(
    holding_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Holding).where(Holding.id == holding_id)
    )
    holding = result.scalar_one_or_none()
    if holding is None:
        raise NotFoundError("holding", holding_id)

    holding.is_archived = True
    holding.updated_at = datetime.now(timezone.utc)
    await db.flush()
    logger.info("holding_archived", holding_id=holding_id, ticker=holding.ticker)
