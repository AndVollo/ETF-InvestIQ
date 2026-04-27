from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.schemas.drawdown import DrawdownScenario, DrawdownSimulationResponse
from app.services import bucket_service, drawdown_service

router = APIRouter(prefix="/drawdown", tags=["drawdown"])


@router.post("/simulate/{bucket_id}", response_model=DrawdownSimulationResponse)
async def run_simulation(
    bucket_id: int,
    db: AsyncSession = Depends(get_db),
) -> DrawdownSimulationResponse:
    await bucket_service.get_active_bucket(bucket_id, db)
    return await drawdown_service.simulate_bucket(bucket_id, db)


@router.get("/{bucket_id}/latest", response_model=DrawdownSimulationResponse)
async def get_latest_simulation(
    bucket_id: int,
    db: AsyncSession = Depends(get_db),
) -> DrawdownSimulationResponse:
    await bucket_service.get_bucket(bucket_id, db)
    sim = await drawdown_service.get_latest_simulation(bucket_id, db)
    if sim is None:
        raise NotFoundError("drawdown_simulation", bucket_id)

    scenarios = [DrawdownScenario(**s) for s in json.loads(sim.scenarios_json)]
    return DrawdownSimulationResponse(
        simulation_id=sim.id,
        bucket_id=sim.bucket_id or bucket_id,
        portfolio_value_usd=sim.portfolio_value_at_simulation or 0.0,
        scenarios=scenarios,
        worst_case_pct=sim.worst_case_pct,
        worst_case_amount_usd=sim.worst_case_amount,
        simulated_at=sim.created_at.isoformat(),
    )
