# Developer Setup

## Prerequisites

- Python 3.11+
- Node.js 20+
- `uv` (Python package manager): `pip install uv`
- Git

## Quick Start

### 1. Clone and enter the repo

```bash
git clone <repo-url>
cd smart-etf-manager
```

### 2. Backend

```bash
cd backend

# Install dependencies
uv sync --dev

# Create the database
uv run alembic upgrade head

# Seed default settings
uv run python scripts/seed_db.py

# Start the API server
uv run uvicorn app.main:app --reload --port 8000
```

API is now live at http://localhost:8000  
Docs at http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server (proxies /api → localhost:8000)
npm run dev
```

App is now live at http://localhost:5173

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./smart_etf.db` | DB path |
| `DEBUG` | `false` | Enables colored logs and stack traces |

Settings that require user input (FRED API key, Obsidian vault path) are stored
in the `settings` DB table via the Settings page.

## FRED API Key

Sign up at https://fred.stlouisfed.org/docs/api/api_key.html (free).
Enter the key in Settings → Data Sources → FRED API Key.
Required only for ILS currency conversion.

## Running tests

### Backend

```bash
cd backend
uv run pytest tests/ -v --cov=app --cov-report=term-missing
```

### Frontend

```bash
cd frontend
npm run test          # watch mode
npm run test -- --run # single run
npm run typecheck     # TypeScript check
npm run lint          # ESLint
```

## Pre-commit hooks

```bash
pip install pre-commit
pre-commit install
```

Hooks run on every `git commit`:
- ruff (lint + format)
- mypy (type check)
- No console.log in `frontend/src/`
- No `print()` in `backend/app/`

## Database migrations

```bash
cd backend

# Create a new migration
uv run alembic revision -m "description"

# Apply all pending
uv run alembic upgrade head

# Roll back one
uv run alembic downgrade -1
```

## Database backup

```bash
cd backend
uv run python scripts/backup_db.py
# Creates: smart_etf_backup_YYYYMMDD_HHMMSS.db
```

## ETF Universe audit

Run quarterly (Jan/Apr/Jul/Oct) to verify all ETFs still trade
and TER values are current:

```bash
cd backend
uv run python scripts/audit_universe.py
```

## Project structure

```
backend/
  app/
    core/        validators, logging, i18n helpers
    db/          ORM models + session
    routes/      FastAPI endpoints
    schemas/     Pydantic request/response models
    services/    Business logic (no HTTP dependencies)
  data/
    etf_universe.yaml   ← source of truth for curated ETFs
  scripts/       seed_db, backup_db, audit_universe
  tests/         unit/ + integration/
  templates/     Obsidian markdown templates

frontend/
  src/
    api/         React Query hooks (one file per domain)
    components/  common/ + charts/
    hooks/       useDirection
    i18n/        he.json + en.json
    pages/       one file per route
    store/       Zustand stores
    types/       api.ts (hand-maintained, matches backend schemas)
    utils/       formatting.ts + validation.ts
  tests/unit/

docs/
  ARCHITECTURE.md      ← this file's sibling
  DEVELOPER_SETUP.md   ← this file
  DECISIONS/           ADRs (architecture decision records)
```

## Commit convention

```
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`

Example:

```
feat(deposit): add ILS currency support with FRED rate

Uses DEXISUS series from FRED to convert deposit amounts.
Falls back to cached rate (up to 7 days) if FRED is unreachable.
```
