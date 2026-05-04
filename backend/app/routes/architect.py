from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.session import get_db
from app.dependencies import get_current_user
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
    current_user: User = Depends(get_current_user),
) -> ArchitectStartResponse:
    return await architect_service.start_session(
        bucket_id=payload.bucket_id,
        profile=payload.investor_profile,
        db=db,
        user_id=current_user.id,
    )


@router.get("/sessions/{session_id}", response_model=ArchitectSessionResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArchitectSessionResponse:
    return await architect_service.get_session(session_id, db, user_id=current_user.id)


@router.post("/sessions/{session_id}/candidates", response_model=CandidateIngestResponse)
async def ingest_candidates(
    session_id: int,
    payload: CandidateIngestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CandidateIngestResponse:
    return await architect_service.ingest_candidates(
        session_id, payload.tickers, db, user_id=current_user.id
    )


@router.post("/sessions/{session_id}/auto-select", response_model=CandidateIngestResponse)
async def auto_select_candidates(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CandidateIngestResponse:
    """Diversified candidate shortlist picked from the universe by composite
    score, sized for the session's bucket horizon (LONG≈23, MEDIUM≈15, SHORT≈8)."""
    return await architect_service.auto_select_and_ingest(
        session_id, db, user_id=current_user.id
    )


@router.get("/sessions/{session_id}/engineer-prompt", response_model=EngineerPromptResponse)
async def get_engineer_prompt(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EngineerPromptResponse:
    return await architect_service.get_engineer_prompt(
        session_id, db, user_id=current_user.id
    )


@router.post("/sessions/{session_id}/allocation", response_model=AllocationIngestResponse)
async def ingest_allocation(
    session_id: int,
    payload: AllocationIngestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AllocationIngestResponse:
    return await architect_service.ingest_allocation(
        session_id=session_id,
        allocation=payload.allocation,
        rationale=payload.rationale,
        db=db,
        user_id=current_user.id,
    )


@router.post("/sessions/{session_id}/drawdown", response_model=DrawdownSimulationResponse)
async def review_drawdown(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DrawdownSimulationResponse:
    return await architect_service.review_drawdown(
        session_id, db, user_id=current_user.id
    )


@router.post("/sessions/{session_id}/confirm", response_model=ArchitectConfirmResponse)
async def confirm_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArchitectConfirmResponse:
    return await architect_service.confirm_session(
        session_id, db, user_id=current_user.id
    )
