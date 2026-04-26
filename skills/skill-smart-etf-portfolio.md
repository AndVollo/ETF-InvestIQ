---
name: skill-smart-etf-portfolio
description: Master system skill for the Smart ETF Portfolio Manager — startup, architecture, DB, adding features, deployment
type: project
---

# Skill: Smart ETF Portfolio Manager — System Master

## Purpose
Master reference for operating and extending the Smart ETF Portfolio Manager.

## Startup
```bash
cd "/Users/andreyvolovich/Smart ETF Portfolio Manager"
./start.sh
# → http://localhost:8000
```
Or directly:
```bash
python3 -m uvicorn backend.app:app --port 8000 --reload
```

## Project Structure
```
backend/
  app.py               FastAPI app entrypoint + startup lifecycle
  database.py          SQLite init + migrations (WAL mode)
  models.py            Pydantic request/response models
  constants.py         All thresholds, GICS codes, default settings
  routes/<feature>.py  One file per API domain
  services/<name>.py   Business logic, stateless functions

frontend/
  index.html           Single HTML shell (SPA)
  css/theme.css        CSS variables (light/dark)
  css/elite.css        Glassmorphism component library
  js/api.js            All API calls + toast/fmt helpers
  js/app.js            Router + init
  js/components/*.js   One module per page

data/
  etf_universe.json    55-ETF seed universe (not loaded to DB automatically)

smart_etf.db           SQLite, created on first run
```

## Database (SQLite WAL)
Key tables: `holdings`, `deposit_sessions`, `transactions`, `price_history`, `macro_data`, `architect_sessions`, `goals`, `settings`, `journal_entries`

**Never recreate tables.** Use `_migrate_schema()` in `database.py`:
```python
conn.execute("ALTER TABLE holdings ADD COLUMN new_col TEXT")
```

## Adding a New API Field (end-to-end)
1. Add column via `_migrate_schema()` in `database.py`
2. Update Pydantic model in `models.py`
3. Update INSERT/SELECT in the relevant route
4. Update JS component to show the field

## Core Business Rules (never break these)
- **ZERO sell orders** — `smart_deposit_service.py` only returns buy orders
- **Allocation must sum to 100%** — validated in `ArchitectAllocation` model (±0.5% tolerance)
- **REITs cap** — enforced in `portfolio.py:add_holding()` and `architect.py:ingest_allocation()`
- **Covered call warning** — raised via HTTP 400 in `portfolio.py:_check_covered_call()`

## Settings Keys (stored in DB)
| Key | Default | Description |
|-----|---------|-------------|
| fred_api_key | "" | FRED API key |
| obsidian_vault_path | "" | Obsidian vault path |
| rebalance_interval_months | "3" | Rebalancing reminder |
| allocation_mode | "equal_weight" | equal_weight or inverse_volatility |
| reits_cap_pct | "15.0" | Max REIT exposure % |
| auto_refresh_valuation | "true" | Auto-compute Z-Score etc |
| obsidian_auto_journal | "true" | Write MD file after deposit |
| usdils_rate | (live) | Cached exchange rate |

## Python Compatibility
Uses Python 3.9 (macOS system). All files have `from __future__ import annotations` at line 1 to support `X | None` and `list[str]` type hint syntax.

## Trigger Phrases
"smart etf", "portfolio manager", "how to start", "add new feature", "etf backend", "deposit engine"
