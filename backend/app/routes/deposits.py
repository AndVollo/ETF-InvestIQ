from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.deposit_log import DepositLog
from app.db.models.user import User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.schemas.deposit import (
    DepositCalculateRequest,
    DepositConfirmRequest,
    DepositConfirmResponse,
    DepositLogResponse,
    DepositPlan,
)
from app.services import bucket_service, smart_deposit_service

router = APIRouter(prefix="/deposits", tags=["deposits"])


@router.post("/calculate", response_model=DepositPlan)
async def calculate_deposit(
    payload: DepositCalculateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DepositPlan:
    await bucket_service.get_user_bucket(payload.bucket_id, current_user.id, db)
    return await smart_deposit_service.calculate_deposit(
        bucket_id=payload.bucket_id,
        amount=payload.amount,
        currency=payload.currency,
        db=db,
    )


@router.post("/confirm", response_model=DepositConfirmResponse)
async def confirm_deposit(
    payload: DepositConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DepositConfirmResponse:
    log: DepositLog = await smart_deposit_service.confirm_deposit(payload.plan_token, db)
    await bucket_service.get_user_bucket(log.bucket_id, current_user.id, db)
    orders = json.loads(log.orders_json)
    return DepositConfirmResponse(
        deposit_id=log.id,
        bucket_id=log.bucket_id,
        amount_usd=sum(o["est_total_usd"] for o in orders),
        orders_placed=len(orders),
        obsidian_file_path=log.obsidian_file_path,
    )


@router.get("/history", response_model=list[DepositLogResponse])
async def deposit_history(
    bucket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DepositLogResponse]:
    from app.schemas.deposit import OrderItem
    await bucket_service.get_user_bucket(bucket_id, current_user.id, db)
    logs = await smart_deposit_service.get_deposit_history(bucket_id, db)
    result = []
    for log in logs:
        orders = [OrderItem(**o) for o in json.loads(log.orders_json)]
        result.append(DepositLogResponse(
            id=log.id,
            bucket_id=log.bucket_id,
            amount=log.amount,
            currency=log.currency,
            fx_rate=log.fx_rate,
            orders=orders,
            obsidian_file_path=log.obsidian_file_path,
            created_at=log.created_at,
        ))
    return result
