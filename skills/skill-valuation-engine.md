---
name: skill-valuation-engine
description: Statistical valuation metrics — Z-Score, SMA200, 52-week percentile — formulas, thresholds, fallback behavior
type: project
---

# Skill: Statistical Valuation Engine

## Purpose
Classifies each ETF in the portfolio as "cheap", "fair", or "expensive" using 3 independent statistical signals.

## Metrics

### 1. Z-Score (3-Year)
```
Z = (current_price - mean_3y) / std_3y
```
| Z | Signal | Hebrew | Color |
|---|--------|--------|-------|
| < -1.5 | buy | זולה / הזדמנות קנייה | 🟢 Green |
| -1.5 to 1.5 | fair | הוגנת | 🟡 Amber |
| > 1.5 | expensive | יקרה / מתוחה | 🔴 Red |

**Logic:** Uses min(3yr, available) daily close prices. Requires ≥ 200 data points.

### 2. 52-Week Percentile
```
Pct = (current - min_52w) / (max_52w - min_52w) × 100
```
- 0% = at 52-week low
- 100% = at 52-week high
- Uses last 252 trading days

### 3. SMA200 Deviation
```
SMA200_dev = (current - SMA200) / SMA200 × 100
```
- Positive = above long-term trend (bullish)
- Negative = below trend (potential value)
- Requires ≥ 200 data points

## Fallback Behavior
| Condition | Behavior |
|-----------|----------|
| < 50 data points | `status: "insufficient_data"`, all metrics null |
| 50-200 points | SMA200/Z partial, percentile_52w available |
| ≥ 200 points | All metrics computed |

Frontend shows "נתונים חלקיים" badge for insufficient data — **never crashes**.

## Data Flow
1. `GET /api/analytics/valuation` calls `compute_valuation(tickers)`
2. First checks `price_history` table in SQLite (cached)
3. If < 200 rows → calls `fetch_price_history()` (yfinance batch download)
4. Results computed in `_compute_single()`, never stored (pure computation)

## Adding a New Metric
1. Add formula in `valuation_service.py:_compute_single()`
2. Return the new field in the dict
3. Add column in `frontend/js/components/analytics.js` valuation table

## Files
- `backend/services/valuation_service.py` — all 3 metrics + signal mapping
- `backend/routes/analytics.py` — `/api/analytics/valuation` endpoint
- `frontend/js/components/analytics.js` — color-coded valuation table

## Constants (in `backend/constants.py`)
```python
ZSCORE_BUY_THRESHOLD  = -1.5
ZSCORE_SELL_THRESHOLD =  1.5
MIN_HISTORY_YEARS     =  3
```

## Trigger Phrases
"z-score", "valuation", "SMA200", "52 week", "buy signal", "cheap ETF", "statistical analysis", "zscore threshold"
