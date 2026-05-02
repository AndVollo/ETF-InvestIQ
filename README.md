# Smart ETF Portfolio Manager

> Long-term, tax-efficient ETF portfolio manager for the Israeli investor.
> Goal-anchored buckets, sector caps, drawdown simulation, no AI discovery.

**Distribution:** Native desktop app via Tauri 2.0 (macOS + Windows). Single-user, local-first. All data stays on your machine.

## Documentation

- [`docs/MASTER_PRD.md`](docs/MASTER_PRD.md) — product spec (Hebrew). Read this before any non-trivial change.
- [`docs/Claude.md`](docs/Claude.md) — instructions for Claude Code (red lines, tech stack, troubleshooting).
- [`docs/DEVELOPER_SETUP.md`](docs/DEVELOPER_SETUP.md) — full dev setup, env vars, FRED API.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system diagram, service map, data flow.
- [`docs/DECISIONS/`](docs/DECISIONS) — Architecture Decision Records.

## Quick start

### Requirements

- Python 3.11+ with [`uv`](https://github.com/astral-sh/uv)
- Node.js 20+
- Rust (only for desktop builds — `cargo tauri dev`/`cargo tauri build`)

### Run in development (web mode)

```bash
# Backend (port 8000)
cd backend
uv sync --dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000

# Frontend (port 5173, proxies /api → :8000)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

### Run as desktop app (Tauri)

```bash
# 1. Build the Python sidecar binary (per-platform)
cd backend
uv run python build_sidecar.py

# 2. Launch the Tauri shell (auto-spawns the sidecar)
cd ../frontend
npm run tauri:dev

# 3. Production build → frontend/src-tauri/target/release/bundle/
npm run tauri:build
```

User data location:
- macOS: `~/Library/Application Support/SmartETFManager/portfolio.db`
- Windows: `%APPDATA%\SmartETFManager\portfolio.db`

## Project structure

```
smart-etf-manager/
├── backend/         FastAPI + SQLAlchemy + Alembic + uv (Python 3.11+)
│   ├── app/
│   │   ├── routes/      FastAPI endpoints
│   │   ├── services/    Business logic
│   │   ├── db/models/   ORM models
│   │   ├── schemas/     Pydantic request/response
│   │   └── core/        Validators, logging, exceptions
│   ├── data/etf_universe.yaml    Curated ETF universe (Source of Truth)
│   ├── templates/obsidian/       Markdown templates for journal entries
│   ├── tests/           pytest unit + integration
│   ├── alembic/         DB migrations
│   ├── scripts/         Audit, backup, seed
│   └── build_sidecar.py PyInstaller build for Tauri
├── frontend/        React 18 + Vite + TypeScript strict + Tailwind
│   ├── src-tauri/   Tauri 2.0 desktop shell (Rust)
│   ├── src/         App, pages, components, i18n (he/en, RTL)
│   └── tests/       Vitest unit tests
└── docs/            PRD, Claude.md, ADRs, setup
```

## Testing

```bash
# Backend
cd backend
uv run ruff check .
uv run mypy --strict app/
uv run pytest

# Frontend
cd frontend
npm run lint
npm run typecheck
npm run test -- --run
```

CI runs all of the above on every PR via `.github/workflows/ci.yml`.

## License

Proprietary (single-user). See `LICENSE` if present.
