from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class InvestorProfile(BaseModel):
    goal_description: str = Field(min_length=1, max_length=500)
    target_amount_ils: float | None = Field(default=None, gt=0)
    monthly_deposit_ils: float | None = Field(default=None, gt=0)
    risk_notes: str | None = Field(default=None, max_length=300)


class ArchitectStartRequest(BaseModel):
    bucket_id: int
    investor_profile: InvestorProfile


class ArchitectStartResponse(BaseModel):
    session_id: int
    bucket_id: int
    discovery_prompt: str
    status: str


class CandidateIngestRequest(BaseModel):
    tickers: list[str] = Field(min_length=1, max_length=15)


class CandidateDetail(BaseModel):
    ticker: str
    composite_score: float | None
    valuation: str | None      # CHEAP | FAIR | EXPENSIVE | INSUFFICIENT_HISTORY
    z_score: float | None
    ter: float | None
    bucket: str | None
    is_valid: bool
    rejection_reason: str | None


class CandidateIngestResponse(BaseModel):
    session_id: int
    accepted: list[CandidateDetail]
    rejected: list[CandidateDetail]


class EngineerPromptResponse(BaseModel):
    session_id: int
    engineer_prompt: str
    status: str


class AllocationItem(BaseModel):
    ticker: str
    weight_pct: float = Field(gt=0, le=100)


class AllocationIngestRequest(BaseModel):
    allocation: list[AllocationItem] = Field(min_length=1, max_length=15)
    rationale: str = Field(min_length=10, max_length=2000)


class AllocationIngestResponse(BaseModel):
    session_id: int
    status: str                   # PENDING_REVIEW | CONFIRMED_READY
    cap_warnings: list[str]
    cooling_off_until: datetime | None   # None if no cooling-off required
    validation_passed: bool


class ArchitectConfirmResponse(BaseModel):
    session_id: int
    bucket_id: int
    status: str
    holdings_written: int
    confirmed_at: datetime


class ArchitectSessionResponse(BaseModel):
    session_id: int
    bucket_id: int | None
    status: str
    shortlist: list[CandidateDetail] | None
    final_allocation: list[AllocationItem] | None
    rationale: str | None
    created_at: datetime
    updated_at: datetime
