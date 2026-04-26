---
name: ETF Data Pipeline
description: Recipes for fetching, storing, and refreshing price and macro data using yfinance and FRED API. Use when adding data sources or debugging stale data.
type: project
---

## Data Sources

| Source    | Cost  | Key          | Use For                              |
|-----------|-------|--------------|--------------------------------------|
| yfinance  | Free  | None needed  | Price history, ETF metadata          |
| FRED API  | Free  | Required*    | Macro data (rates, inflation, etc.)  |
| Polygon   | Free† | Required     | ETF enrichment backup (5 req/min)    |

*FRED key: free registration at fred.stlouisfed.org  
†Polygon free tier: 5 requests/minute, end-of-day data only

## yfinance Batch Download Pattern

```python
import yfinance as yf
import pandas as pd

def fetch_batch_prices(tickers: list[str], period: str = "5d") -> dict:
    raw = yf.download(
        tickers,
        period=period,       # "5d", "1y", "5y"
        interval="1d",
        group_by="ticker",
        auto_adjust=True,    # Close = adjusted close automatically
        progress=False,
        threads=True,
    )
    # For single ticker: raw is DataFrame with OHLCV columns
    # For multiple tickers: raw is MultiIndex with (ticker, OHLCV)
    for ticker in tickers:
        df = raw[ticker] if len(tickers) > 1 else raw
        df = df.dropna(subset=["Close"])
```

**Gotchas:**
- `auto_adjust=True` → `Close` column already contains adjusted price. Do NOT use `Adj Close` separately.
- MultiIndex access: `raw["XLK"]["Close"]` for multi-ticker, `raw["Close"]` for single
- yfinance has no official rate limit, but batch download uses 1 HTTP request for all tickers (efficient)
- Yahoo Finance may return empty DataFrames for tickers not found — always check `df.empty`

## FRED API Pattern

```python
import httpx

FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"

async def fetch_series(series_id: str, api_key: str, limit: int = 60) -> list[dict]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(FRED_BASE, params={
            "series_id": series_id,
            "api_key": api_key,
            "file_type": "json",
            "limit": limit,
            "sort_order": "desc",
        })
        r.raise_for_status()
        return r.json().get("observations", [])

# CRITICAL: FRED uses "." (period string) for missing values — must filter
for obs in observations:
    if obs["value"] == ".":
        continue  # skip missing
    value = float(obs["value"])
```

## FRED Series Reference

| Series ID   | Description                    | Update Freq |
|-------------|--------------------------------|-------------|
| FEDFUNDS    | Federal Funds Rate             | Monthly     |
| UNRATE      | Unemployment Rate              | Monthly     |
| CPIAUCSL    | CPI All Urban Consumers        | Monthly     |
| T10Y2Y      | 10Y-2Y Treasury Spread         | Daily       |
| INDPRO      | Industrial Production Index    | Monthly     |
| UMCSENT     | Michigan Consumer Sentiment    | Monthly     |
| DCOILWTICO  | WTI Crude Oil Price            | Daily       |
| VIXCLS      | CBOE VIX                       | Daily       |
| M2SL        | M2 Money Supply                | Monthly     |
| NAPM        | ISM Manufacturing PMI          | Monthly     |

## SQLite Upsert Pattern

```python
db.executemany(
    "INSERT OR REPLACE INTO price_history (ticker, price_date, open, high, low, close, volume, adj_close) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    rows,
)
# INSERT OR REPLACE uses the UNIQUE(ticker, price_date) constraint
# Never use INSERT OR IGNORE for price updates — OR REPLACE overwrites with fresh data
```

## APScheduler Job Registration

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()

scheduler.add_job(
    job_fn,
    CronTrigger(hour=9, minute=10, timezone="America/New_York"),
    id="fetch_prices",
    replace_existing=True,   # CRITICAL: prevents duplicate jobs on restart
)
scheduler.start()
```

## Scheduled Job Schedule

| Job          | Trigger             | Description                          |
|--------------|---------------------|--------------------------------------|
| fetch_prices | Daily 09:10 ET      | yfinance batch download, 5d window   |
| compute_scores| Weekly Sun 02:00   | AI sector scoring (Mode A)           |
| fetch_macro  | Monthly 1st 06:00   | FRED all tracked series              |
| init_data    | On startup (once)   | Backfill 5Y history if sparse        |

## TTL Cache Values

```python
TTL_PRICES_MARKET_HOURS = 15 * 60    # 15 min (market open)
TTL_PRICES_AFTER_CLOSE  = 6 * 60 * 60  # 6 h (market closed)
TTL_MACRO               = 24 * 60 * 60  # 24 h
TTL_ETF_META            = 12 * 60 * 60  # 12 h
TTL_SECTOR_SCORES       = 6 * 60 * 60   # 6 h
TTL_PORTFOLIO           = 2 * 60         # 2 min
```

Cache key convention: `"{type}:{identifier}:{params}"` e.g. `"ph:XLK:365"`, `"returns:SPY"`

## Critical Files
- `backend/services/yfinance_service.py` — all yfinance calls
- `backend/services/fred_service.py` — all FRED calls
- `backend/routes/data_pipeline.py` — manual trigger endpoints
- `backend/app.py` → `lifespan()` → APScheduler setup
