from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.architect import (
    AllocationIngestRequest,
    AllocationIngestResponse,
    ArchitectConfirmResponse,
    ArchitectSessionResponse,
    ArchitectStartRequest,
    ArchitectStartResponse,
    CandidateIngestRequest,
    CandidateIngestResponse,
    EngineerPromptResponse,
)
from app.schemas.drawdown import DrawdownSimulationResponse
from app.services import architect_service

router = APIRouter(prefix="/architect", tags=["architect"])


@router.post("/sessions", response_model=ArchitectStartResponse, status_code=201)
async def start_session(
    payload: ArchitectStartRequest,
    db: AsyncSession = Depends(get_db),
) -> ArchitectStartResponse:
    return await architect_service.start_session(
        bucket_id=payload.bucket_id,
        profile=payload.investor_profile,
        db=db,
    )


@router.get("/sessions/{session_id}", response_model=ArchitectSessionResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
) -> ArchitectSessionResponse:
    return await architect_service.get_session(session_id, db)


@router.post("/sessions/{session_id}/candidates", response_model=CandidateIngestResponse)
async def ingest_candidates(
    session_id: int,
    payload: CandidateIngestRequest,
    db: AsyncSession = Depends(get_db),
) -> CandidateIngestResponse:
    return await architect_service.ingest_candidates(session_id, payload.tickers, db)


@router.get("/sessions/{session_id}/engineer-prompt", response_model=EngineerPromptResponse)
async def get_engineer_prompt(
    session_id: int,
    db: AsyncSession = Depends(get_db),
) -> EngineerPromptResponse:
    return await architect_service.get_engineer_prompt(session_id, db)


@router.post("/sessions/{session_id}/allocation", response_model=AllocationIngestResponse)
async def ingest_allocation(
    session_id: int,
    payload: AllocationIngestRequest,
    db: AsyncSession = Depends(get_db),
) -> AllocationIngestResponse:
    return await architect_service.ingest_allocation(
        session_id=session_id,
        allocation=payload.allocation,
        rationale=payload.rationale,
        db=db,
    )


@router.post("/sessions/{session_id}/drawdown", response_model=DrawdownSimulationResponse)
async def review_drawdown(
    session_id: int,
    db: AsyncSession = Depends(get_db),
) -> DrawdownSimulationResponse:
    """Run a drawdown simulation against the proposed allocation and mark
    the session as drawdown-reviewed. Required before /confirm succeeds."""
    return await architect_service.review_drawdown(session_id, db)


@router.post("/sessions/{session_id}/confirm", response_model=ArchitectConfirmResponse)
async def confirm_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
) -> ArchitectConfirmResponse:
    return await architect_service.confirm_session(session_id, db)
