from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.schemas.bucket import (
    BucketCreate,
    BucketHoldingsResponse,
    BucketResponse,
    BucketSummaryResponse,
    BucketUpdate,
    GoalProgressResponse,
    PasswordConfirmation,
)
from app.core.security import verify_password
from app.services import bucket_service
from app.services.fred_client import fred_client

router = APIRouter(prefix="/buckets", tags=["buckets"])


@router.post("/", response_model=BucketResponse, status_code=201)
async def create_bucket(
    payload: BucketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BucketResponse:
    bucket = await bucket_service.create_bucket(payload, db, user_id=current_user.id)
    return BucketResponse.model_validate(bucket)


@router.get("/", response_model=list[BucketResponse])
async def list_buckets(
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BucketResponse]:
    buckets = await bucket_service.list_buckets(
        db, include_archived=include_archived, user_id=current_user.id
    )
    return [BucketResponse.model_validate(b) for b in buckets]


@router.get("/{bucket_id}", response_model=BucketResponse)
async def get_bucket(
    bucket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BucketResponse:
    bucket = await bucket_service.get_user_bucket(bucket_id, current_user.id, db)
    return BucketResponse.model_validate(bucket)


@router.put("/{bucket_id}", response_model=BucketResponse)
async def update_bucket(
    bucket_id: int,
    payload: BucketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BucketResponse:
    await bucket_service.get_user_bucket(bucket_id, current_user.id, db)
    bucket = await bucket_service.update_bucket(bucket_id, payload, db)
    return BucketResponse.model_validate(bucket)


@router.delete("/{bucket_id}", status_code=204)
async def delete_bucket(
    bucket_id: int,
    payload: PasswordConfirmation,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="Invalid password")

    await bucket_service.get_user_bucket(bucket_id, current_user.id, db)
    await bucket_service.delete_bucket(bucket_id, db)


@router.post("/{bucket_id}/archive", status_code=204)
async def archive_bucket(
    bucket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await bucket_service.get_user_bucket(bucket_id, current_user.id, db)
    await bucket_service.archive_bucket(bucket_id, db)


@router.get("/{bucket_id}/holdings", response_model=BucketHoldingsResponse)
async def get_holdings(
    bucket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BucketHoldingsResponse:
    await bucket_service.get_user_bucket(bucket_id, current_user.id, db)
    total_value_usd, enriched = await bucket_service.get_holdings_with_drift(bucket_id, db)
    return BucketHoldingsResponse(
        bucket_id=bucket_id,
        total_value_usd=round(total_value_usd, 4),
        holdings=enriched,
    )


@router.get("/{bucket_id}/summary", response_model=BucketSummaryResponse)
async def get_summary(
    bucket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BucketSummaryResponse:
    bucket = await bucket_service.get_user_bucket(bucket_id, current_user.id, db)
    total_value_usd, enriched = await bucket_service.get_holdings_with_drift(bucket_id, db)

    fx_rate = await fred_client.get_usd_ils_rate(db)
    total_value_ils = round(total_value_usd * fx_rate, 2) if fx_rate else None

    goal = bucket_service.compute_goal_progress(
        total_value_usd,
        bucket.target_amount,
        bucket.target_currency,
        bucket.target_date,
        fx_rate,
    )

    return BucketSummaryResponse(
        id=bucket.id,
        name=bucket.name,
        horizon_type=bucket.horizon_type,
        total_value_usd=round(total_value_usd, 4),
        total_value_ils=total_value_ils,
        holdings_count=len(enriched),
        initial_investment=bucket.initial_investment,
        target_amount=bucket.target_amount,
        target_currency=bucket.target_currency,
        target_date=bucket.target_date,
        goal_progress_pct=goal["progress_pct"],
        is_archived=bucket.is_archived,
    )


@router.get("/{bucket_id}/goal-progress", response_model=GoalProgressResponse)
async def get_goal_progress(
    bucket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GoalProgressResponse:
    bucket = await bucket_service.get_user_bucket(bucket_id, current_user.id, db)
    total_value_usd, _ = await bucket_service.get_holdings_with_drift(bucket_id, db)

    fx_rate = await fred_client.get_usd_ils_rate(db)
    current_value_ils = round(total_value_usd * fx_rate, 2) if fx_rate else None

    goal = bucket_service.compute_goal_progress(
        total_value_usd,
        bucket.target_amount,
        bucket.target_currency,
        bucket.target_date,
        fx_rate,
    )

    return GoalProgressResponse(
        bucket_id=bucket_id,
        current_value_usd=round(total_value_usd, 4),
        current_value_ils=current_value_ils,
        target_amount=bucket.target_amount,
        target_currency=bucket.target_currency,
        target_date=bucket.target_date,
        progress_pct=goal["progress_pct"],
        amount_remaining=goal["amount_remaining"],
        months_remaining=goal["months_remaining"],
    )
