---
name: Investment Platform Core
description: Domain model, GICS sector universe, ETF reference table, allocation rules, and rebalancing vocabulary for the InvestIQ platform
type: project
---

## Purpose
Master reference for all investment domain logic. Use before adding any feature that touches sectors, ETFs, or portfolio allocation.

## GICS Sector Universe (11 sectors)

| Code  | Name (EN)                | Name (HE)         | Canonical ETF | Alternatives          |
|-------|--------------------------|-------------------|---------------|-----------------------|
| XLK   | Technology               | טכנולוגיה         | XLK           | VGT, FTEC, QQQ, SOXX |
| XLV   | Health Care              | בריאות            | XLV           | VHT, FHLC, IYH, IBB  |
| XLF   | Financials               | פיננסים           | XLF           | VFH, FNCL, IYF, KBE  |
| XLY   | Consumer Discretionary   | צריכה מחזורית     | XLY           | VCR, FDIS, IYC, RTH  |
| XLP   | Consumer Staples         | צריכה בסיסית      | XLP           | VDC, FSTA, IYK, KXI  |
| XLI   | Industrials              | תעשייה            | XLI           | VIS, FIDU, IYJ, XAR  |
| XLE   | Energy                   | אנרגיה            | XLE           | VDE, FENY, IYE, OIH  |
| XLB   | Materials                | חומרי גלם         | XLB           | VAW, FMAT, IYM, GDX  |
| XLU   | Utilities                | תשתיות            | XLU           | VPU, FUTY, IDU, UTES |
| XLC   | Communication Services   | שירותי תקשורת    | XLC           | VOX, FCOM, IYZ, SOCL |
| XLRE  | Real Estate              | נדל"ן             | XLRE          | VNQ, FREL, IYR, SCHH |

**Benchmark:** SPY (S&P 500)

## Allocation Rules

- Valid modes: **3 sectors** (33.33% each), **4 sectors** (25% each), **5 sectors** (20% each)
- Always exactly equal weight — no exceptions
- Target weight = `1 / n` where n ∈ {3, 4, 5}
- Stored in `target_allocation` table in SQLite

## Drift & Rebalancing Definitions

- **Current weight** = sector_value / total_portfolio_value
- **Drift** = current_weight − target_weight (positive = overweight)
- **Threshold default** = 5% absolute drift (configurable in settings)
- **Status thresholds:**
  - `ok` = drift_abs < 3%
  - `warning` = 3% ≤ drift_abs < 5%
  - `breach` = drift_abs ≥ 5%

## Smart Cash Routing Algorithm (pseudocode)

```
function generate_trades(cash_available):
  1. Sort underweight sectors by drift (most underweight first)
  2. For each underweight sector:
       gap = target_value - current_value
       buy_amount = min(cash_available, gap)
       create BUY trade for (buy_amount / etf_price) shares
       cash_available -= buy_amount
  3. If cash_covers_gap: done (no sells needed)
  4. Else:
       For each overweight sector:
         excess_value = current_value - target_value
         create SELL trade for (excess_value / etf_price) shares
       For each underweight sector with remaining deficit:
         create BUY trade for (deficit / etf_price) shares
```

**Key principle:** SELL only when cash routing is insufficient. This minimizes tax events.

## Domain Glossary (Hebrew ↔ English)

| Hebrew            | English                | Notes                                   |
|-------------------|------------------------|-----------------------------------------|
| תיק השקעות        | Investment Portfolio   |                                         |
| תעודת סל          | ETF                    | Exchange-Traded Fund                    |
| סקטור             | Sector                 | GICS sector                             |
| איזון מחדש        | Rebalancing            |                                         |
| סטייה             | Drift                  | current_weight - target_weight          |
| משקל יעד          | Target Weight          | Equal-weight per mode                   |
| רווח/הפסד לא מומש | Unrealized P&L         | (current_value - cost_basis)            |
| מומנטום           | Momentum               | Price trend strength                    |
| ציון מורכב        | Composite Score        | Weighted AI sector score (0-100)        |
| ניתוב סקטוריאלי   | Sector Rotation        | Moving capital between sectors by cycle |
| גיוון             | Diversification        |                                         |
| כוח יחסי          | Relative Strength      | Sector return vs SPY                    |

## Key Constants (backend/constants.py)

```python
SECTOR_CODES = ["XLK","XLV","XLF","XLY","XLP","XLI","XLE","XLB","XLU","XLC","XLRE"]
VALID_ALLOCATION_MODES = [3, 4, 5]
DEFAULT_DRIFT_THRESHOLD = 0.05
BENCHMARK_TICKER = "SPY"
```

## Critical Files
- `backend/constants.py` — authoritative source for all sector/ETF constants
- `backend/database.py` — schema for `holdings`, `target_allocation`, `rebalancing_events`
- `data/etf_universe.json` — static ETF metadata (55 ETFs across 11 sectors + SPY)
