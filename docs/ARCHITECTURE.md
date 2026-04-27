# Architecture

## Overview

Smart ETF Portfolio Manager is a local-first, self-hosted web application.
No data leaves the user's machine. No external servers, no telemetry.

```
Browser (React SPA)
    ↕ HTTP /api/v1/*
FastAPI (Python 3.11)
    ↕ SQLAlchemy async
SQLite (smart_etf.db)
    ↕ yfinance / FRED
External price & macro feeds (read-only, cached)
    ↕ file I/O
Obsidian vault (markdown journal)
```

## Backend

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | FastAPI (async) | All routes under `/api/v1/` |
| ORM | SQLAlchemy 2.0 + Alembic | Async sessions via `aiosqlite` |
| Validation | Pydantic v2 | Every request and response typed |
| DB | SQLite (local file) | Backup = file copy |
| Data feeds | yfinance + FRED API | Cached in DB, graceful stale fallback |
| Logging | structlog | JSON in prod, colored in dev |
| Testing | pytest + pytest-asyncio | httpx for integration tests |

### Service Layer

```
universe_service   → loads etf_universe.yaml (source of truth)
scoring_service    → composite score: cost 35%, sharpe 25%, TE 20%, AUM 20%
valuation_service  → Z-Score + 52W percentile + SMA200 deviation
sector_service     → aggregates yfinance sector weights, enforces caps
drawdown_service   → 4 historical scenarios, proxy map for young ETFs
smart_deposit_service → greedy underweight-first allocation
architect_service  → session wizard + cooling-off (24h if Δ>30%)
obsidian_service   → atomic markdown writes to vault
bucket_service     → CRUD + horizon/ETF compatibility checks
fred_client        → FRED API wrapper with retry + DB cache
settings_service   → key-value app settings from DB
```

### Safety Gates (every mutating endpoint)

1. Pydantic validation (400/422 on failure)
2. Universe check — ticker must be in curated list and not blacklisted
3. Allocation sum = 100% ± 0.01%
4. REIT hard cap 15%, Commodities hard cap 10%
5. Horizon compatibility (SHORT → bonds/cash only)
6. Cooling-off: 24h hold if any single holding changes >30%
7. Atomic DB backup before large structural changes

### Error contract

Backend never returns text. Always returns `message_key` + `params`:

```json
{ "message_key": "error.hard_cap_exceeded", "params": { "cap_type": "REITS", "actual": 18.2, "cap": 15 } }
```

Client translates using i18next.

## Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Language | TypeScript strict |
| Styling | Tailwind CSS (RTL via logical properties) |
| State | Zustand (language, theme, active bucket) |
| Server state | React Query v5 |
| HTTP | Axios with error interceptor |
| Charts | Recharts (DriftChart + SectorBar only) |
| i18n | i18next (he.json + en.json) |
| Tests | Vitest + React Testing Library |

### Page structure

```
/ (Dashboard)    → bucket selector, summary cards, drift chart, sector snapshot
/buckets         → CRUD, holdings list, add holding
/deposit         → calculate plan → confirm → Obsidian write
/universe        → curated ETF table, filterable
/architect       → 5-step wizard (profile → candidates → analysis → allocation → confirm)
/sectors         → sector bar chart + cap warnings
/drawdown        → 4-scenario stress test
/audit           → deposit history log
/settings        → general, data sources, Obsidian, advanced
```

### RTL/LTR

- `document.documentElement.dir` set in `App.tsx` on language change
- `useDirection()` hook returns `'rtl' | 'ltr'`
- Tailwind logical properties (`ms-`, `me-`, `ps-`, `pe-`) used instead of `ml-`/`mr-`

## Data Flow — Smart Deposit

```
User enters amount + currency
    → POST /deposits/calculate (dry-run)
    → Server: fetch prices (yfinance, cached)
    → Greedy underweight-first allocation
    → Returns DepositPlan with plan_token (5-min expiry)
User reviews plan
    → POST /deposits/confirm { plan_token }
    → Server: persist orders, update holdings units, write Obsidian journal
    → Returns obsidian_file_path
```

## Data Flow — Architect

```
Step 1: POST /architect/sessions (profile)
Step 2: POST /sessions/{id}/candidates (ticker list)
        → universe + blacklist validation
        → scoring service for each valid ticker
Step 3: GET /sessions/{id}/engineer-prompt
        → frozen AI educator prompt with shortlist metadata
Step 4: User pastes AI JSON response
        → POST /sessions/{id}/allocation
        → validation: sum=100%, caps, universe membership
        → if Δ>30% on any holding → PENDING_REVIEW + cooling_off_until
Step 5: POST /sessions/{id}/confirm (after cooling-off if required)
        → archive old holdings, create new ones, write Obsidian entry
```

## ETF Universe

- Source of truth: `backend/data/etf_universe.yaml`
- 8 buckets: GLOBAL_CORE, US_FACTOR_VALUE, INTL_FACTOR_VALUE, US_BONDS,
  ULTRA_SHORT_TERM, REITS, COMMODITIES_HEDGE, EMERGING_MARKETS
- Blacklist categories: leveraged, covered_call, thematic_high_concentration, inverse
- Quarterly review: 15 Jan/Apr/Jul/Oct via `scripts/audit_universe.py`

## Key Invariants (never violate)

- No sell orders — system only buys (tax-free rebalancing via new deposits)
- No expected_return anywhere in codebase
- No live price tickers in UI
- No external telemetry
- Every portfolio change → Obsidian journal entry
