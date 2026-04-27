from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class DrawdownHoldingDetail(BaseModel):
    ticker: str
    proxy_ticker: str | None          # set when proxy was used
    proxy_used: bool
    data_available: bool
    scenario_drawdown_pct: float | None   # None if no price data at all
    holding_weight_pct: float             # this holding's share of portfolio


class DrawdownScenario(BaseModel):
    name: str
    period_start: date
    period_end: date
    portfolio_drawdown_pct: float | None  # None if no data for any holding
    portfolio_loss_usd: float | None
    holdings: list[DrawdownHoldingDetail]


class DrawdownSimulationResponse(BaseModel):
    simulation_id: int
    bucket_id: int
    portfolio_value_usd: float
    scenarios: list[DrawdownScenario]
    worst_case_pct: float | None
    worst_case_amount_usd: float | None
    simulated_at: str   # ISO datetime
