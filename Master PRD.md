# Smart ETF Portfolio Manager — מסמך אפיון ראשי (Master PRD)

**גרסה:** 1.0 (Greenfield)
**תאריך:** 2026-04-26
**יעד:** Claude Code פועל ב-Antigravity
**שפת ממשק:** עברית + אנגלית (מלא, RTL/LTR)

---

## תוכן עניינים

1. [חזון המוצר ועקרונות יסוד](#1-חזון-המוצר-ועקרונות-יסוד)
2. [סטנדרט טכנולוגי](#2-סטנדרט-טכנולוגי)
3. [מבנה הפרויקט](#3-מבנה-הפרויקט)
4. [Database Schema מלא](#4-database-schema-מלא)
5. [Backend Services — ספציפיקציה מלאה](#5-backend-services--ספציפיקציה-מלאה)
6. [API Endpoints — רשימה מלאה](#6-api-endpoints--רשימה-מלאה)
7. [Curated ETF Universe](#7-curated-etf-universe)
8. [Frontend — כל מסך וכל תפריט](#8-frontend--כל-מסך-וכל-תפריט)
9. [תמיכה דו-לשונית (i18n)](#9-תמיכה-דו-לשונית-i18n)
10. [Validation & Safety Layer](#10-validation--safety-layer)
11. [Testing Strategy](#11-testing-strategy)
12. [סדר פיתוח (Sprints)](#12-סדר-פיתוח-sprints)
13. [Definition of Done](#13-definition-of-done)
14. [שיקול דעת אמיתי — מה לא לעשות](#14-שיקול-דעת-אמיתי--מה-לא-לעשות)

---

## 1. חזון המוצר ועקרונות יסוד

### 1.1 מהו המוצר

מערכת לניהול תיק השקעות ETF ארוך טווח, ממוקדת ב:
- **יעילות מס** — איזון התיק רק דרך הפקדות חדשות, ללא מכירות
- **משמעת מתמטית** — Z-Score וניתוח סקטוריאלי במקום אינטואיציה
- **שקיפות סיכונים** — סימולציית Drawdown מציגה גודל הפסד פוטנציאלי בש"ח
- **הפרדת יעדים** — Bucket Architecture לפי אופק זמן (קצר/בינוני/ארוך)
- **AI כעוזר ולא כמנהל** — ה-AI מסביר, לא מגלה. המתמטיקה מקבלת החלטות.

### 1.2 עקרונות יסוד (לא לסטות מהם)

| עיקרון | משמעות מעשית |
|--------|---------------|
| **משעמם ויעיל** | אין live tickers, אין צבעים אדום/ירוק על תנודה יומית |
| **חסימה לפני שגיאה** | Hard caps על סקטורים ו-REITs — לא רק אזהרה |
| **No Discovery, Only Curation** | רשימה מאוצרת ידנית של 50 ETFs במקום AI שמחפש |
| **Tax-Free Rebalancing בלבד** | המערכת לא מייצרת פקודות מכירה לעולם |
| **Goal-Anchored** | כסף ליעד 2028 לא חי עם כסף לפרישה ב-2050 |
| **Transparent Math** | כל ציון, כל סף, כל החלטה — מוסבר ונראה |
| **Audit Everything** | כל שינוי נכתב ל-Obsidian אוטומטית |

### 1.3 מה המערכת **לא** עושה (ולא תעשה לעולם)

- לא מציעה מתי לקנות ומתי למכור (אין Market Timing)
- לא מנסה לחזות תשואות עתידיות
- לא ממליצה על Sector Rotation
- לא תומכת ב-Leveraged ETFs (TQQQ, SOXL וכו')
- לא תומכת ב-Covered Call ETFs (JEPI, JEPQ, QYLD)
- לא תומכת ב-Thematic ETFs מרוכזים (ARKK, ICLN)
- לא מציגה גרפים יומיים של מחיר
- לא שולחת Push Notifications על תנודות שוק
- לא מתחברת ישירות לברוקרים (אין auto-trading)

### 1.4 פרסונת המשתמש

משקיע פרטי, גילאי 30-50, בעל הון להשקעה לטווח ארוך, עם:
- יעדי נזילות ספציפיים בעולם האמיתי (דירה, ילדים, פרישה)
- העדפה למשמעת על פני התרגשות
- חוסר אמון בכלים פיננסיים שמנסים לגרום לו לסחור
- ידע בסיסי בטכנולוגיה (יודע לקרוא JSON, להריץ סקריפט)

---

## 2. סטנדרט טכנולוגי

### 2.1 Backend

| רכיב | בחירה | למה |
|------|--------|------|
| Framework | **FastAPI** (Python 3.11+) | אסינכרוני, type-safe, OpenAPI אוטומטי |
| ORM | **SQLAlchemy 2.0** + Alembic | Migrations מסודרות, type hints |
| Validation | **Pydantic v2** | חובה לכל endpoint |
| DB | **SQLite** (לוקאלי) | פשטות, אין שרת, גיבוי = file copy |
| Data Source | **yfinance** + **FRED API** | חינמי, אמין מספיק |
| Testing | **pytest** + **pytest-asyncio** + **httpx** | סטנדרט תעשייתי |
| Linting | **ruff** + **mypy --strict** | חובה ב-CI |
| Logging | **structlog** | JSON logs, מובנים |

### 2.2 Frontend

| רכיב | בחירה | למה |
|------|--------|------|
| Framework | **React 18** + **Vite** | מהיר, פשוט, ECO-system בוגר |
| Language | **TypeScript** (strict mode) | חובה — לא JavaScript |
| Styling | **Tailwind CSS** | utility-first, RTL מובנה |
| Charts | **Recharts** | בלבד עבור Drift Chart ו-Sector Bar |
| State | **Zustand** | קל יותר מ-Redux לפרויקט בגודל הזה |
| HTTP | **Axios** + **React Query** | caching אוטומטי |
| i18n | **i18next** + **react-i18next** | תמיכה מלאה ב-RTL |
| Testing | **Vitest** + **React Testing Library** | מהיר ומשולב עם Vite |

### 2.3 כלים אופרטיביים

- **Git** — חובה, כולל branch protection
- **GitHub Actions / Pre-commit hooks** — ruff + mypy + pytest רצים אוטומטית
- **Docker Compose** (אופציונלי) — להרצה לוקאלית מסודרת
- **Obsidian** — אינטגרציה ברמת קבצים בלבד (לא API)

### 2.4 מה **לא** להשתמש

- ❌ Vanilla JS — Type safety חיוני
- ❌ MongoDB / Postgres — Overkill לפרויקט אישי
- ❌ Redux — מורכבות מיותרת
- ❌ Material-UI / Bootstrap — Tailwind מספיק וקליל
- ❌ Chart.js — Recharts פשוט יותר ל-React
- ❌ ספריות AI/ML מקומיות (TensorFlow, scikit) — אין צורך אמיתי
- ❌ Celery / Redis — אין משימות רקע אמיתיות בפרויקט הזה

---

## 3. מבנה הפרויקט

```
smart-etf-manager/
│
├── backend/
│   ├── pyproject.toml             # uv / poetry
│   ├── alembic.ini
│   ├── alembic/                   # migrations
│   │   └── versions/
│   │
│   ├── app/
│   │   ├── main.py                # FastAPI entrypoint
│   │   ├── config.py              # Pydantic Settings
│   │   ├── dependencies.py        # DI helpers
│   │   │
│   │   ├── core/
│   │   │   ├── logging.py
│   │   │   ├── validators.py      # Pydantic models cross-cutting
│   │   │   ├── exceptions.py      # Custom exceptions
│   │   │   └── i18n.py            # שרת מחזיר messages במפתח, לקוח מתרגם
│   │   │
│   │   ├── db/
│   │   │   ├── base.py            # Declarative base
│   │   │   ├── session.py         # get_db()
│   │   │   └── models/            # ORM models
│   │   │       ├── __init__.py
│   │   │       ├── holding.py
│   │   │       ├── bucket.py
│   │   │       ├── price_history.py
│   │   │       ├── macro_data.py
│   │   │       ├── architect_session.py
│   │   │       ├── deposit_log.py
│   │   │       ├── sector_cache.py
│   │   │       ├── pending_action.py
│   │   │       └── settings.py
│   │   │
│   │   ├── services/
│   │   │   ├── universe_service.py
│   │   │   ├── scoring_service.py
│   │   │   ├── valuation_service.py
│   │   │   ├── smart_deposit_service.py
│   │   │   ├── drawdown_service.py
│   │   │   ├── sector_service.py
│   │   │   ├── bucket_service.py
│   │   │   ├── architect_service.py
│   │   │   ├── dividend_service.py
│   │   │   ├── obsidian_service.py
│   │   │   ├── yfinance_client.py
│   │   │   └── fred_client.py
│   │   │
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── universe.py
│   │   │   ├── buckets.py
│   │   │   ├── holdings.py
│   │   │   ├── valuation.py
│   │   │   ├── deposits.py
│   │   │   ├── architect.py
│   │   │   ├── sectors.py
│   │   │   ├── drawdown.py
│   │   │   ├── dividends.py
│   │   │   ├── settings.py
│   │   │   └── health.py
│   │   │
│   │   └── schemas/               # Pydantic request/response
│   │       ├── universe.py
│   │       ├── bucket.py
│   │       └── ...
│   │
│   ├── data/
│   │   └── etf_universe.yaml      # Source of Truth
│   │
│   ├── scripts/
│   │   ├── audit_universe.py
│   │   ├── seed_db.py
│   │   └── backup_db.py
│   │
│   ├── templates/
│   │   └── obsidian/
│   │       ├── decision_entry.md
│   │       └── universe_review.md
│   │
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   │
│   └── README.md
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   │
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── client.ts          # Axios instance
│   │   │   ├── universe.ts
│   │   │   ├── buckets.ts
│   │   │   └── ...
│   │   │
│   │   ├── components/
│   │   │   ├── common/            # Button, Input, Modal, etc.
│   │   │   ├── charts/            # DriftChart, SectorBar
│   │   │   ├── dashboard/
│   │   │   ├── architect/
│   │   │   ├── deposit/
│   │   │   └── settings/
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Buckets.tsx
│   │   │   ├── SmartDeposit.tsx
│   │   │   ├── UniverseBrowser.tsx
│   │   │   ├── Architect.tsx
│   │   │   ├── AuditTrail.tsx
│   │   │   └── Settings.tsx
│   │   │
│   │   ├── store/                 # Zustand
│   │   │   ├── userStore.ts
│   │   │   └── languageStore.ts
│   │   │
│   │   ├── i18n/
│   │   │   ├── index.ts
│   │   │   ├── he.json
│   │   │   └── en.json
│   │   │
│   │   ├── hooks/
│   │   │   ├── useDirection.ts    # ltr/rtl
│   │   │   └── useApi.ts
│   │   │
│   │   ├── types/
│   │   │   └── api.ts             # generated from OpenAPI
│   │   │
│   │   └── utils/
│   │       ├── formatting.ts      # currency, percent
│   │       └── validation.ts
│   │
│   └── tests/
│       ├── unit/
│       └── e2e/                   # Playwright (optional)
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── UNIVERSE_REVIEW_PROCESS.md
│   ├── DEVELOPER_SETUP.md
│   └── DECISIONS/                 # ADR (Architecture Decision Records)
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── .gitignore
├── docker-compose.yml             # אופציונלי
├── README.md
└── LICENSE
```

---

## 4. Database Schema מלא

### 4.1 הטבלאות

```sql
-- =============================================================
-- BUCKETS — Goal-anchored portfolios
-- =============================================================
CREATE TABLE goal_buckets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    horizon_type TEXT NOT NULL CHECK(horizon_type IN ('SHORT', 'MEDIUM', 'LONG')),
    target_amount REAL,
    target_currency TEXT DEFAULT 'ILS' CHECK(target_currency IN ('ILS', 'USD')),
    target_date DATE,
    description TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_buckets_horizon ON goal_buckets(horizon_type);
CREATE INDEX idx_buckets_archived ON goal_buckets(is_archived);


-- =============================================================
-- HOLDINGS — Per-bucket positions
-- =============================================================
CREATE TABLE holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bucket_id INTEGER NOT NULL REFERENCES goal_buckets(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    units REAL NOT NULL DEFAULT 0,
    avg_cost_usd REAL,
    target_pct REAL NOT NULL,           -- אחוז מטרה ב-Bucket (0-100)
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bucket_id, ticker)
);

CREATE INDEX idx_holdings_bucket ON holdings(bucket_id);
CREATE INDEX idx_holdings_ticker ON holdings(ticker);


-- =============================================================
-- PRICE HISTORY — yfinance cache
-- =============================================================
CREATE TABLE price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    date DATE NOT NULL,
    close_usd REAL NOT NULL,
    volume INTEGER,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticker, date)
);

CREATE INDEX idx_prices_ticker_date ON price_history(ticker, date DESC);


-- =============================================================
-- MACRO DATA — FRED cache
-- =============================================================
CREATE TABLE macro_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id TEXT NOT NULL,            -- e.g. 'FEDFUNDS', 'CPIAUCSL', 'DEXISUS' (USD/ILS)
    date DATE NOT NULL,
    value REAL NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(series_id, date)
);

CREATE INDEX idx_macro_series_date ON macro_data(series_id, date DESC);


-- =============================================================
-- SECTOR CACHE — yfinance sector weights + top holdings
-- =============================================================
CREATE TABLE sector_cache (
    ticker TEXT PRIMARY KEY,
    sector_weights_json TEXT NOT NULL,
    top_holdings_json TEXT NOT NULL,
    fetched_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_sector_cache_expires ON sector_cache(expires_at);


-- =============================================================
-- ETF SCORES CACHE — Composite scores
-- =============================================================
CREATE TABLE etf_scores_cache (
    ticker TEXT PRIMARY KEY,
    composite_score REAL,
    cost_score REAL,
    sharpe_score REAL,
    tracking_error_score REAL,
    liquidity_score REAL,
    components_json TEXT,
    calculated_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
);


-- =============================================================
-- VALUATION CACHE — Z-Score, percentile, SMA200
-- =============================================================
CREATE TABLE valuation_cache (
    ticker TEXT PRIMARY KEY,
    z_score REAL,
    percentile_52w REAL,
    sma200_deviation REAL,
    classification TEXT CHECK(classification IN ('CHEAP', 'FAIR', 'EXPENSIVE', 'INSUFFICIENT_HISTORY')),
    has_3y_history BOOLEAN DEFAULT TRUE,
    calculated_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
);


-- =============================================================
-- ARCHITECT SESSIONS — Portfolio building sessions
-- =============================================================
CREATE TABLE architect_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bucket_id INTEGER REFERENCES goal_buckets(id),
    status TEXT NOT NULL CHECK(status IN ('DRAFT', 'PENDING_REVIEW', 'CONFIRMED', 'ABANDONED')),
    selected_buckets_json TEXT,         -- ["GLOBAL_CORE", "US_BONDS", ...]
    shortlist_json TEXT,                -- generated by scoring_service
    ai_proposal_json TEXT,              -- AI's allocation suggestion
    final_allocation_json TEXT,         -- user-confirmed
    rationale_text TEXT,
    sector_report_json TEXT,            -- snapshot of sector validation
    drawdown_report_json TEXT,          -- snapshot of drawdown simulation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);


-- =============================================================
-- DEPOSIT LOG — Every smart deposit recorded
-- =============================================================
CREATE TABLE deposit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bucket_id INTEGER NOT NULL REFERENCES goal_buckets(id),
    amount REAL NOT NULL,
    currency TEXT NOT NULL CHECK(currency IN ('ILS', 'USD')),
    fx_rate REAL,                        -- USD/ILS at time of deposit
    orders_json TEXT NOT NULL,           -- [{ticker, units, est_price_usd}]
    portfolio_snapshot_json TEXT,        -- before deposit
    obsidian_file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deposits_bucket_date ON deposit_log(bucket_id, created_at DESC);


-- =============================================================
-- DRAWDOWN SIMULATIONS — Stress tests
-- =============================================================
CREATE TABLE drawdown_simulations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bucket_id INTEGER REFERENCES goal_buckets(id),
    allocation_json TEXT NOT NULL,
    portfolio_value_at_simulation REAL,
    portfolio_currency TEXT,
    scenarios_json TEXT NOT NULL,        -- [{name, loss_pct, loss_amount, recovery_months}]
    worst_case_pct REAL,
    worst_case_amount REAL,
    simulated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================
-- PENDING ACTIONS — Cooling-off mechanism
-- =============================================================
CREATE TABLE pending_actions (
    token TEXT PRIMARY KEY,
    action_type TEXT NOT NULL,           -- 'large_allocation_change', etc.
    bucket_id INTEGER REFERENCES goal_buckets(id),
    payload_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP
);


-- =============================================================
-- SETTINGS — Single-row key-value
-- =============================================================
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial settings keys (seed):
-- 'language'         → "he" | "en"
-- 'base_currency'    → "ILS" | "USD"
-- 'fred_api_key'     → "..."
-- 'obsidian_vault_path' → "/Users/.../Obsidian"
-- 'sector_thresholds_override' → null | {...}
-- 'theme'            → "light" | "dark" | "system"
```

### 4.2 כללי DB

- **כל timestamp ב-UTC** — המרה לזמן מקומי רק בלקוח
- **נכסים בדולרים בלבד ב-DB** — המרה ל-ILS תמיד דרך FRED rate
- **אין DELETE קשיח** ל-buckets/holdings — רק `is_archived = TRUE`
- **migrations חייבות להיות הפיכות** (downgrade)
- **גיבוי אוטומטי** של ה-SQLite file לפני כל migration

---

## 5. Backend Services — ספציפיקציה מלאה

### 5.1 `universe_service.py`

| פונקציה | קלט | פלט | תיאור |
|---------|------|------|--------|
| `load_universe()` | – | dict (cached) | טוען את `etf_universe.yaml` |
| `get_universe_tickers()` | – | set[str] | כל הטיקרים המורשים |
| `get_etf_metadata(ticker)` | str | ETFMetadata\|None | פרטי ETF |
| `is_blacklisted(ticker)` | str | (bool, reason) | בדיקה |
| `get_bucket_constraints(name)` | str | dict | max_pct, description |
| `get_etfs_in_bucket(name)` | str | list[ETFMetadata] | כל ה-ETFs ב-Bucket |

### 5.2 `scoring_service.py`

| פונקציה | קלט | פלט | תיאור |
|---------|------|------|--------|
| `calculate_composite_score(ticker)` | str | dict | ציון 0-1 + components |
| `rank_within_bucket(bucket)` | str | list[dict] | מסודר מהגבוה לנמוך |
| `build_shortlist(buckets, top_n)` | list, int | list[str] | קלט ל-AI Architect |
| `refresh_all_scores()` | – | int | ריענון cache, מחזיר count |

**משקלי הציון (קבועים, לא משתנים):**
```python
WEIGHTS = {
    "cost":           0.35,  # TER (אינברסי)
    "sharpe_3y":      0.25,
    "tracking_error": 0.20,  # אינברסי
    "liquidity_aum":  0.20,
}
```

### 5.3 `valuation_service.py`

| פונקציה | קלט | פלט | תיאור |
|---------|------|------|--------|
| `calculate_valuation(ticker)` | str | ValuationReport | Z-Score + 52W + SMA200 |
| `classify(z_score)` | float | "CHEAP"/"FAIR"/"EXPENSIVE" | סיווג |
| `bulk_calculate(tickers)` | list[str] | dict | חישוב מרובה |
| `refresh_valuations()` | – | int | ריענון לכל התיק |

**ספי סיווג:**
```python
def classify(z_score: float | None) -> Classification:
    if z_score is None:
        return "INSUFFICIENT_HISTORY"
    if z_score < -1.5:
        return "CHEAP"
    if z_score > 1.5:
        return "EXPENSIVE"
    return "FAIR"
```

**אסור:** לחזות תשואה. אסור: להחזיר "expected_return".

### 5.4 `smart_deposit_service.py`

| פונקציה | קלט | פלט | תיאור |
|---------|------|------|--------|
| `calculate_deposit(bucket_id, amount, currency, dry_run=True)` | int, float, str | DepositPlan | פקודות קנייה |
| `confirm_deposit(plan_id)` | int | DepositResult | שמירת DB + Obsidian |
| `simulate_post_deposit(plan)` | DepositPlan | dict | תיק לאחר ההפקדה |

**אלגוריתם:**
1. שלוף holdings + target_pct מהtable
2. חשב current_pct לכל holding
3. חשב drift = current_pct - target_pct
4. מיין לפי drift עולה (הכי חסר ראשון)
5. בכל שלב, הקצה כסף לטיקר עם הכי גדול drift שלילי, עד שמגיע ל-target
6. אחד פקודות מתחת ל-$50 לטיקר הבא
7. **בולמ:** אם בעקבות ההפקדה תיווצר hard sector warning — סמן `post_deposit_warning`

**Validation:**
- amount > 0
- bucket exists & not archived
- target_allocation בכל ה-Bucket מסתכם ל-100%
- אם currency=ILS — חובה fx_rate עדכני

### 5.5 `drawdown_service.py`

| פונקציה | קלט | פלט | תיאור |
|---------|------|------|--------|
| `simulate_historical(allocation, portfolio_value)` | dict, float | DrawdownReport | 4 תרחישים |
| `_run_scenario(allocation, start, end)` | – | dict | תרחיש בודד |

**תרחישים קבועים (datas מ-yfinance):**
```python
SCENARIOS = [
    {"name": "Dot-Com Crash",    "start": "2000-03-01", "end": "2002-10-09", "label_he": "התפוצצות בועת הדוט-קום"},
    {"name": "Financial Crisis", "start": "2007-10-09", "end": "2009-03-09", "label_he": "המשבר הפיננסי"},
    {"name": "COVID Crash",      "start": "2020-02-19", "end": "2020-03-23", "label_he": "מפולת הקורונה"},
    {"name": "2022 Rate Hikes",  "start": "2022-01-03", "end": "2022-10-12", "label_he": "עליית הריבית 2022"},
]
```

**חשוב:** עבור ETFs שלא היו קיימים בתאריך הסימולציה — השתמש ב-**proxy** מאותה קטגוריה (למשל AVUV → השתמש ב-IJS לפני 2019). הצג ב-frontend `proxy_used: true`.

**פלט חובה:**
- `worst_case_pct` (אחוז)
- `worst_case_amount` (במטבע התיק — קריטי!)
- `recovery_months` לכל תרחיש

### 5.6 `sector_service.py`

ראה מסמך נפרד שכבר נכתב — `SECTOR_ANALYSIS_SPEC.md`. נכלל כאן ב-Master.

מבוא: מחשב `effective_exposure` (משקל סקטור × משקל ETF), מזהה Hidden Stocks, חוסם תיק עם Hard Caps.

### 5.7 `bucket_service.py`

| פונקציה | קלט | פלט | תיאור |
|---------|------|------|--------|
| `create_bucket(payload)` | BucketCreate | Bucket | אימות אופק vs סוג ETFs |
| `get_bucket(id)` | int | Bucket | |
| `list_buckets(include_archived=False)` | bool | list[Bucket] | |
| `update_bucket(id, payload)` | int, BucketUpdate | Bucket | |
| `archive_bucket(id)` | int | None | אין מחיקה — רק ארכוב |
| `validate_holdings_for_bucket(bucket, tickers)` | – | dict | Short-Term לא מקבל מניות |

**כללים:**
- `SHORT_TERM` (≤3 שנים) → רק `ULTRA_SHORT_TERM` בUniverse
- `MEDIUM_TERM` (3-7 שנים) → אג"ח + עד 40% מניות
- `LONG_TERM` (>7 שנים) → הכל מורשה

### 5.8 `architect_service.py`

| פונקציה | קלט | פלט | תיאור |
|---------|------|------|--------|
| `start_session(bucket_id, selected_buckets)` | int, list | Session | יוצר session DRAFT |
| `generate_shortlist(session_id)` | int | list[str] | קורא ל-scoring_service |
| `request_ai_proposal(session_id, profile)` | int, dict | Proposal | פרומפט ל-LLM |
| `validate_proposal(session_id)` | int | ValidationResult | סקטור + drawdown checks |
| `confirm_session(session_id)` | int | None | שומר ל-holdings + Obsidian |
| `abandon_session(session_id)` | int | None | |

**AI Prompt (מקובע, באנגלית):**
ראה [Section 7.4 — AI Educator Prompt].

### 5.9 `dividend_service.py`

| פונקציה | קלט | פלט | תיאור |
|---------|------|------|--------|
| `get_annual_income(bucket_id)` | int | dict | forward yield × units |
| `get_dividend_history(ticker, years)` | str, int | list | היסטוריה |

**הסר:** DRIP simulator. אין projections.

### 5.10 `obsidian_service.py`

| פונקציה | קלט | פלט | תיאור |
|---------|------|------|--------|
| `write_decision_entry(payload)` | dict | str (path) | כתיבה אטומית |
| `write_universe_review(payload)` | dict | str | רבעוני |

**כתיבה אטומית:**
```python
def atomic_write(path: Path, content: str) -> None:
    tmp = path.with_suffix('.tmp')
    tmp.write_text(content, encoding='utf-8')
    tmp.replace(path)  # atomic on POSIX
```

### 5.11 `yfinance_client.py` & `fred_client.py`

מחלקות wrapper, עם:
- Retry logic (3 ניסיונות, exponential backoff)
- Caching ב-DB (לא in-memory)
- Type-safe responses
- Error handling — אם yfinance נופל, החזר from cache (גם אם expired) + flag

---

## 6. API Endpoints — רשימה מלאה

### 6.1 קונבנציה

- כל הנתיבים תחת `/api/v1/`
- Response: JSON
- Error: `{"detail": "...", "code": "ERROR_KEY"}`
- Validation errors: 422 עם פירוט שדה
- All money values: מספרים בלבד (לא מחרוזות), שדה `currency` נפרד
- Locale-agnostic: שרת מחזיר `message_key`, לקוח מתרגם

### 6.2 רשימת Endpoints

#### Health
```
GET    /api/v1/health                      → {"status": "ok", "version": "..."}
```

#### Universe
```
GET    /api/v1/universe/                    → רשימה מלאה
GET    /api/v1/universe/buckets             → רשימת Buckets זמינים
GET    /api/v1/universe/scores/{bucket}     → ETFs מסודרים בBucket
POST   /api/v1/universe/shortlist           → body: {buckets: [...], top_n: 1}
GET    /api/v1/universe/validate/{ticker}   → bool + reason
GET    /api/v1/universe/blacklist           → רשימת חסומים + סיבות
```

#### Goal Buckets
```
POST   /api/v1/buckets/                     → create
GET    /api/v1/buckets/                     → list
GET    /api/v1/buckets/{id}                 → detail
PUT    /api/v1/buckets/{id}                 → update
DELETE /api/v1/buckets/{id}                 → archive (soft)
GET    /api/v1/buckets/{id}/holdings        → holdings + drift
GET    /api/v1/buckets/{id}/summary         → value, return, sector, etc.
GET    /api/v1/buckets/{id}/goal-progress   → % אל היעד
```

#### Holdings
```
GET    /api/v1/holdings/?bucket_id=         → list
POST   /api/v1/holdings/                    → manual add (rare)
PUT    /api/v1/holdings/{id}                → update target_pct
DELETE /api/v1/holdings/{id}                → archive
```

#### Valuation
```
GET    /api/v1/valuation/{ticker}           → Z-Score, 52W, SMA200, classification
POST   /api/v1/valuation/refresh            → bulk refresh
GET    /api/v1/valuation/portfolio/{bucket_id}  → for entire bucket
```

#### Smart Deposit
```
POST   /api/v1/deposits/calculate           → dry-run, returns plan
POST   /api/v1/deposits/confirm             → body: {plan_token}
GET    /api/v1/deposits/history?bucket_id=  → log
```

#### Architect
```
POST   /api/v1/architect/sessions           → start
GET    /api/v1/architect/sessions/{id}      → state
POST   /api/v1/architect/sessions/{id}/shortlist  → generate
POST   /api/v1/architect/sessions/{id}/ai-prompt  → generate prompt
POST   /api/v1/architect/sessions/{id}/ai-result  → submit AI response
POST   /api/v1/architect/sessions/{id}/validate   → sector + drawdown
POST   /api/v1/architect/sessions/{id}/confirm    → save to holdings
DELETE /api/v1/architect/sessions/{id}            → abandon
```

#### Sectors
```
GET    /api/v1/sectors/exposure?bucket_id=  → effective exposure
POST   /api/v1/sectors/validate             → before save
GET    /api/v1/sectors/thresholds           → current settings
PUT    /api/v1/sectors/thresholds           → user override
DELETE /api/v1/sectors/cache                → manual flush
```

#### Drawdown
```
POST   /api/v1/drawdown/simulate            → body: {allocation, portfolio_value, currency}
GET    /api/v1/drawdown/history/{bucket_id} → past simulations
```

#### Dividends
```
GET    /api/v1/dividends/annual/{bucket_id} → annual income forecast
GET    /api/v1/dividends/history/{ticker}   → past dividends
```

#### Pending Actions (cooling-off)
```
GET    /api/v1/pending/{token}              → status
POST   /api/v1/pending/{token}/confirm      → after 24h
DELETE /api/v1/pending/{token}              → cancel
```

#### Settings
```
GET    /api/v1/settings/                    → all
PUT    /api/v1/settings/{key}               → single update
POST   /api/v1/settings/test-fred           → validate FRED key
POST   /api/v1/settings/test-obsidian       → validate path
```

#### Audit / Obsidian
```
GET    /api/v1/audit/recent?limit=20        → recent entries
GET    /api/v1/audit/by-bucket/{id}         → bucket history
```

---

## 7. Curated ETF Universe

### 7.1 Source of Truth

קובץ `data/etf_universe.yaml` בגיט. כל שינוי → PR + tag.

### 7.2 מבנה Buckets ב-Universe

| Bucket | מטרה | דוגמת ETFs | Cap |
|--------|------|------------|-----|
| `GLOBAL_CORE` | חשיפה גלובלית רחבה | VT, VTI, VXUS | – |
| `US_FACTOR_VALUE` | Small Cap Value (Fama-French) | AVUV, DFSV | – |
| `INTL_FACTOR_VALUE` | SCV בינלאומי + EM Value | AVDV, AVES | – |
| `US_BONDS` | אג"ח ליבה | BND, GOVT, TIP | – |
| `ULTRA_SHORT_TERM` | מזומן-שקול | SGOV, BIL | – |
| `REITS` | נדל"ן | VNQ, REET | **15%** |
| `COMMODITIES_HEDGE` | זהב | IAU, GLDM | **10%** |
| `EMERGING_MARKETS` | EM נפרד | VWO, IEMG | – |

### 7.3 Blacklist (חסומים)

```yaml
blacklist:
  leveraged: [TQQQ, SQQQ, SOXL, UPRO, TMF]
  covered_call: [JEPI, JEPQ, QYLD, XYLD, RYLD, NUSI]
  thematic_high_concentration: [ARKK, ICLN, TAN, BLOK]
  high_ter:
    threshold: 0.50
  inverse: [SH, SDS, PSQ]
```

### 7.4 AI Educator Prompt

קבוע במערכת. ב-`backend/app/services/architect_service.py`:

```
You are a portfolio educator. You DO NOT discover or recommend tickers.

CONTEXT:
The system has already filtered a curated universe of institutional-grade ETFs
to produce this shortlist for the user:

{shortlist_with_metadata}

Each ticker includes:
- Bucket category (GLOBAL_CORE, US_BONDS, etc.)
- Composite score (0-1, based on cost/sharpe/tracking-error/liquidity)
- Z-Score classification (CHEAP/FAIR/EXPENSIVE)
- TER (expense ratio)
- Sector exposure summary

USER PROFILE:
- Time horizon: {years} years
- Bucket type: {SHORT|MEDIUM|LONG}
- Liquidity goal: {goal_amount} {currency} by {goal_year} (if any)
- Current sector tolerances: {thresholds}

YOUR TASK (strictly limited):
1. Suggest target_allocation percentages summing exactly to 100.0
2. Explain WHY this mix fits the user's stated horizon and goals
3. Flag concerns: concentration risks, time-horizon mismatch
4. Use ONLY tickers from the provided shortlist

PROHIBITED:
- Suggesting tickers not in the shortlist
- Predicting returns or "expected outperformance"
- Recommending Covered Call, Leveraged, or Inverse products
- Sector rotation or market timing advice

OUTPUT (strict JSON, no markdown):
{
  "target_allocation": {"VTI": 40.0, "VXUS": 25.0, ...},
  "rationale_en": "Concise explanation in English",
  "rationale_he": "Concise explanation in Hebrew",
  "concerns": ["concern 1", "concern 2"]
}
```

### 7.5 Quarterly Review

תיעוד מלא ב-`docs/UNIVERSE_REVIEW_PROCESS.md`:
- 15/1, 15/4, 15/7, 15/10
- הרץ `scripts/audit_universe.py`
- עדכן YAML, version, git tag
- כתוב Obsidian entry

---

## 8. Frontend — כל מסך וכל תפריט

### 8.1 Navigation Layout

**Sidebar (קבוע, ניתן לכווץ):**

```
┌─────────────────────────┐
│ ⚡ Smart ETF Manager    │  ← לוגו
├─────────────────────────┤
│ 🏠 Dashboard            │  Active bucket: [Long-Term ▾]
│ 📦 Buckets              │
│ 💰 Smart Deposit        │
│ 🔍 Universe Browser     │
│ 🛠️  Architect           │
│ 📊 Sector Analysis      │
│ 📉 Drawdown Test        │
│ 📓 Audit Trail          │
├─────────────────────────┤
│ ⚙️  Settings            │
│ 🌐 EN | HE              │  ← language toggle
└─────────────────────────┘
```

### 8.2 Page: Dashboard

**אזור עליון — Bucket Selector + Summary Cards:**

```
┌─ Active Bucket: Long-Term Retirement (2050) ──────────────┐
│                                                            │
│  💼 שווי תיק       📈 תשואה כוללת    🎯 התקדמות ליעד    │
│  $487,250          +24.3%             32%                 │
│  ₪1,754,100        מאז 2024-01        עד 2050             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**אזור מרכזי — Drift Chart (הויזואל היחיד):**

גרף עמודות אופקי, ללא צבעים אגרסיביים:
- ירוק רקע: בעודף לעומת יעד
- אדום רקע: בחסר לעומת יעד
- בלי צבע: בטווח ±0.5%

```
VTI    [████████████░░░░░░░░] +2.3%    ← בעודף (קל)
VXUS   [░░░░░░░░░░██████░░░░] -3.1%    ← בחסר (יקבל בהפקדה הבאה)
AVUV   [░░░░░░░░██████░░░░░░] -0.4%    ← קרוב ליעד
BND    [████░░░░░░░░░░░░░░░░] +1.2%
```

**אזור תחתון — Status Strip + Sector Snapshot:**

```
┌─ סטטוס ולואציה ─────────────────────────────────────────┐
│ VTI: 🟢 Fair | VXUS: 🟢 Cheap | AVUV: 🟢 Fair | BND: 🟡 Expensive │
└──────────────────────────────────────────────────────────┘

┌─ סקטורים (תקציר) ──────────────── ציון גיוון: 76/100 ✅ ┐
│ Tech    24% ✅                                            │
│ Health  12% ✅                                            │
│ Finance 17% ✅                                            │
│ ... [הצג הכל →]                                          │
└──────────────────────────────────────────────────────────┘
```

**אזור תזכורת:**
```
📅 הפקדה הבאה מתוכננת: 1 במאי 2026 (עוד 5 ימים)
```

**אסור על המסך הזה:**
- מחירים יומיים
- גרף "performance" עם x=זמן y=שווי
- צבעים זוהרים על שינויים יומיים
- פוש על "the market is up today!"

### 8.3 Page: Buckets

**רשימת Buckets פתוחים + כפתור יצירה:**

```
┌─ הBuckets שלי ──────────────────────────── [+ Bucket חדש] ┐
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🏠 קבלן 2028 — Short-Term                              │ │
│ │ יעד: 3,550,000 ₪ עד יוני 2028                          │ │
│ │ נוכחי: 1,820,000 ₪ (51%)  ⏱️ 26 חודשים                │ │
│ │ אחזקות: SGOV (60%), BIL (40%)                          │ │
│ │ [ערוך] [הפקדה חכמה] [ארכוב]                            │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 👶 השכלת ילדים 2035 — Medium-Term                       │ │
│ │ יעד: 600,000 ₪ עד 2035                                  │ │
│ │ נוכחי: 145,000 ₪ (24%)                                  │ │
│ │ אחזקות: VTI (30%), VXUS (20%), BND (40%), TIP (10%)    │ │
│ │ [ערוך] [הפקדה חכמה] [ארכוב]                            │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🏖️ פרישה 2050 — Long-Term                              │ │
│ │ יעד: לא הוגדר                                          │ │
│ │ נוכחי: $487,250                                         │ │
│ │ ...                                                     │ │
│ └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**טופס יצירת Bucket חדש (Modal):**

שדות:
- שם (חובה)
- אופק זמן (Radio: Short ≤3y / Medium 3-7y / Long >7y)
- סכום יעד (אופציונלי) + מטבע
- תאריך יעד (אופציונלי, אם Short — חובה)
- תיאור

**אזהרה דינמית:** אם בוחר Short-Term — מציג: "ב-Bucket זה תורשו רק SGOV/BIL ופיקדונות. מניות ו-REITs יחסמו."

### 8.4 Page: Smart Deposit

```
┌─ הפקדה חכמה ──────────────────────────────────────────────┐
│                                                              │
│  Bucket: [Long-Term Retirement ▾]                           │
│                                                              │
│  סכום הפקדה: [   5,000   ] [USD ▾]                         │
│  שער חליפין נוכחי: 1 USD = 3.62 ILS                         │
│                                                              │
│  [חשב תוכנית]                                                │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│  📋 תוכנית רכישה (Dry-Run):                                 │
│                                                              │
│  ▸ קנה  6   יחידות VXUS  @ ~$58  =  $348                   │
│  ▸ קנה  4   יחידות AVUV  @ ~$96  =  $384                   │
│  ▸ קנה  10  יחידות VTI   @ ~$268 =  $2,680                  │
│  ▸ קנה  20  יחידות BND   @ ~$79  =  $1,580                  │
│                                                              │
│  סך הכל מתוכנן: $4,992 (יתרה: $8 — מתחת לסף $50)            │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│  📊 השפעה צפויה על הסקטורים:                                │
│  Tech: 24% → 23.8% ✅                                        │
│  REITs: 0% → 0% (ללא שינוי)                                  │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│  ⚠️ הפקדה זו תיכתב ל-Obsidian באישור.                       │
│                                                              │
│  [חזור לעריכה]  [✅ אשר וכתוב ל-Obsidian]                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Validation:**
- חוסם הפקדה אם ה-bucket אין לו holdings מוגדרים
- חוסם אם יש pending action על אותו bucket
- חוסם אם FRED key לא זמין ו-currency=ILS

### 8.5 Page: Universe Browser

```
┌─ Universe Browser — 50 ETFs מאוצרים ───────────────────────┐
│                                                              │
│  סנן לפי Bucket:                                             │
│  [All] [Global Core] [US Value] [Bonds] [REITs] ...         │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│  🌍 GLOBAL_CORE                                              │
│  ┌──────┬─────────┬──────┬──────────┬────────┐              │
│  │ #1   │ VT      │ TER  │ Score    │ Status │              │
│  │      │         │ 0.07%│ 0.94 ⭐  │ 🟢 Fair│              │
│  ├──────┼─────────┼──────┼──────────┼────────┤              │
│  │ #2   │ VTI     │ 0.03%│ 0.92     │ 🟢 Fair│              │
│  ├──────┼─────────┼──────┼──────────┼────────┤              │
│  │ #3   │ VXUS    │ 0.05%│ 0.88     │ 🟢 Cheap│             │
│  └──────┴─────────┴──────┴──────────┴────────┘              │
│                                                              │
│  💎 US_FACTOR_VALUE                                          │
│  ...                                                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**לחיצה על שורה → modal עם פרטים:**
- שם מלא, תיאור, תאריך הקמה
- TER, AUM, נפח יומי
- Composite Score עם פירוט (Cost/Sharpe/TE/Liquidity)
- Z-Score, אחוזון 52W, SMA200 deviation
- Top 10 holdings
- חשיפה סקטוריאלית של ה-ETF עצמו
- קישור ל-yfinance / ETF.com

### 8.6 Page: Architect

**Wizard 6 שלבים:**

```
שלב 1: בחר Bucket יעד
  → רשימת Buckets פתוחים, או [+ Bucket חדש]

שלב 2: בחר קטגוריות מUniverse
  → צ'קבוקסים: Global Core, US Value, US Bonds, REITs, וכו'
  → אזהרה אם Bucket=Short-Term ובחר Equity

שלב 3: שורטליסט אוטומטי
  → המערכת מציגה את ה-Top-Scored ETF מכל קטגוריה
  → המשתמש יכול להחליף ידנית מתוך אותה קטגוריה

שלב 4: הקצאת אחוזים
  אופציה A: הזן ידנית
  אופציה B: בקש הצעה מ-AI (מציג את הפרומפט להעתקה)
            → לאחר הדבקת ה-JSON החוזר, המערכת מאמתת
  
שלב 5: Validation Gate
  → מציג: סקטור report + drawdown report
  → אם hard warnings → חסום עם override checkbox
  → מציג: "הפסד צפוי בתרחיש 2008: $206,490 (-42%)"

שלב 6: Cooling-off (אם שינוי >30%)
  → "השינוי גדול. חזור בעוד 24 שעות."
  → token + reminder
  
  אחרי 24 שעות: אישור סופי → שמירה + Obsidian entry
```

### 8.7 Page: Sector Analysis

ראה SECTOR_ANALYSIS_SPEC.md — מצוטט במלואו.

קצור: גרף עמודות אופקי לכל סקטור עם spi soft/hard, רשימת Hidden Stocks, ציון גיוון.

### 8.8 Page: Drawdown Test

```
┌─ סימולציית מפולת ──────────────────────────────────────────┐
│                                                              │
│  Bucket: [Long-Term Retirement ▾]                            │
│  שווי תיק נוכחי: $487,250 (₪1,762,845)                       │
│                                                              │
│  [הרץ סימולציה]                                              │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│  התרחישים:                                                   │
│                                                              │
│  📉 התפוצצות בועת הדוט-קום (2000-2002)                       │
│     הפסד: -38% │ ₪669,881 │ התאוששות: 49 חודשים              │
│     [proxy: AVUV→IJS]                                        │
│                                                              │
│  📉 המשבר הפיננסי (2007-2009)                                │
│     הפסד: -44% │ ₪775,652 │ התאוששות: 36 חודשים              │
│                                                              │
│  📉 מפולת הקורונה (2020-Q1)                                  │
│     הפסד: -29% │ ₪511,225 │ התאוששות: 5 חודשים               │
│                                                              │
│  📉 עליית הריבית 2022                                        │
│     הפסד: -18% │ ₪317,312 │ התאוששות: 12 חודשים              │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│  💀 גרוע ביותר: -44% │ ₪775,652                              │
│                                                              │
│  ❓ שאל את עצמך: האם תוכל לישון בלילה אם תפסיד ₪775,652?     │
│     אם לא — שקול להגדיל את אחוז ה-BND בתיק.                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 8.9 Page: Audit Trail

```
┌─ יומן החלטות ──────────────────────────────────────────────┐
│                                                              │
│  סנן: [כל הBuckets ▾]  [כל הסוגים ▾]  [טווח תאריכים]       │
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│  📅 2026-04-26 — Smart Deposit                              │
│  Bucket: Long-Term Retirement                               │
│  סכום: $5,000 (₪18,100)                                      │
│  פקודות: 4 קניות                                             │
│  [פתח ב-Obsidian] [הצג פרטים]                                │
│                                                              │
│  📅 2026-04-15 — Architect Change                           │
│  Bucket: Medium-Term Education                              │
│  שינוי: הוספת AVUV (5%), הקטנת BND (-5%)                    │
│  [פתח ב-Obsidian] [הצג פרטים]                                │
│                                                              │
│  📅 2026-03-30 — Universe Review                            │
│  גרסה: 2026-Q2                                               │
│  שינויים: AVUV-X הוסף, JEPI הוסר (blacklist)                │
│  [פתח ב-Obsidian]                                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 8.10 Page: Settings

**Tabs:**

#### Tab 1: General
- שפה: [עברית | English] (radio)
- מטבע בסיס: [ILS | USD] (radio)
- ערכת נושא: [Light | Dark | System] (radio)

#### Tab 2: Data Sources
- FRED API Key: [text input + 🧪 בדוק]
  - סטטוס: 🟢 Connected | 🔴 Invalid | 🟡 Not configured
- Yahoo Finance: [סטטוס בלבד — לא דורש מפתח]
  - עדכון אחרון: 2026-04-26 14:32 UTC

#### Tab 3: Obsidian
- נתיב Vault: [path picker]
- תת-תיקייה ל-decisions: ברירת מחדל `Investment Journal`
- בדיקת כתיבה: [🧪 כתוב קובץ test]
- סטטוס: 🟢 Path valid & writable

#### Tab 4: Sector Thresholds (Advanced)
- טבלה לעריכה ידנית של soft/hard caps לכל סקטור
- כפתור: "שחזר ברירות מחדל"
- אזהרה: "ערכים אלו מבוססים על מחקר. שנה רק אם אתה מבין את ההשלכות."

#### Tab 5: Backup & Maintenance
- כפתור: "גבה DB עכשיו" → יוצר `backup_YYYYMMDD.db`
- כפתור: "נקה Sector Cache"
- כפתור: "נקה Valuation Cache"
- כפתור: "הרץ Universe Audit"
- מציג: גודל DB, מספר רשומות בכל טבלה

#### Tab 6: About
- גרסת מערכת
- גרסת Universe (e.g. "2026-Q2")
- תאריך ביקורת אחרון
- קישור ל-GitHub
- קישור לתיעוד

### 8.11 Common UI Components

| רכיב | שימוש |
|------|--------|
| `Button` | primary / secondary / danger / ghost |
| `Input` | text / number / currency (auto-format) |
| `Select` / `Dropdown` | רגיל + searchable |
| `Modal` | confirmation / details / form |
| `Tooltip` | על Z-Score badges, סקטורים |
| `Badge` | status (green/yellow/red) |
| `ProgressBar` | goal progress |
| `Toast` | success / error feedback |
| `EmptyState` | "אין Buckets עדיין" + CTA |
| `LoadingSpinner` | בזמן fetch |
| `ErrorBoundary` | תפיסת שגיאות React |
| `LanguageSwitch` | EN/HE bottom-right |

### 8.12 כללי עיצוב

- **גופנים:** עברית — Heebo / Rubik. אנגלית — Inter
- **גודל בסיס:** 16px, line-height 1.6
- **צבעים:**
  - Primary: כחול עמוק `#1e40af`
  - Success: ירוק רגוע `#10b981`
  - Warning: צהוב מודגש `#f59e0b`
  - Danger: אדום מאופק `#dc2626`
  - Neutral: אפור `#64748b`
- **אסור:** אנימציות פיננסיות אגרסיביות, מספרים שמתחלפים בזמן אמת, נצנוץ
- **רוחב מקסימלי לתוכן:** 1280px, ממורכז
- **Dark Mode:** חובה מהיום הראשון, עם prefers-color-scheme

---

## 9. תמיכה דו-לשונית (i18n)

### 9.1 ארכיטקטורה

**Backend:** מחזיר `message_key` בלבד. לא מחזיר טקסט.

```json
{
  "status": "blocked",
  "message_key": "sector.warning.tech_over_cap",
  "params": {"sector": "Technology", "pct": 36.2, "cap": 35.0}
}
```

**Frontend:** מתרגם לפי שפת המשתמש.

### 9.2 קבצי תרגום

`frontend/src/i18n/he.json`:
```json
{
  "common": {
    "save": "שמור",
    "cancel": "בטל",
    "confirm": "אישור",
    "loading": "טוען..."
  },
  "navigation": {
    "dashboard": "דשבורד",
    "buckets": "Buckets",
    "smart_deposit": "הפקדה חכמה",
    "universe": "Universe Browser",
    "architect": "ארכיטקט",
    "sectors": "ניתוח סקטורים",
    "drawdown": "סימולציית מפולת",
    "audit": "יומן החלטות",
    "settings": "הגדרות"
  },
  "valuation": {
    "cheap": "זול סטטיסטית",
    "fair": "בטווח הוגן",
    "expensive": "יקר סטטיסטית",
    "insufficient_history": "היסטוריה לא מספקת"
  },
  "sector": {
    "warning": {
      "tech_over_cap": "חשיפה ל-{{sector}} היא {{pct}}% — מעל הגבול של {{cap}}%",
      "soft_concentration": "חשיפה ל-{{sector}} מתקרבת לסף ({{pct}}%)"
    }
  },
  "drawdown": {
    "scenarios": {
      "dot_com": "התפוצצות בועת הדוט-קום",
      "financial_crisis": "המשבר הפיננסי 2008",
      "covid": "מפולת הקורונה",
      "rate_hikes_2022": "עליית הריבית 2022"
    }
  }
}
```

`frontend/src/i18n/en.json` — אותו מבנה, באנגלית.

### 9.3 RTL/LTR

```typescript
// hooks/useDirection.ts
import { useTranslation } from 'react-i18next';

export const useDirection = () => {
  const { i18n } = useTranslation();
  return i18n.language === 'he' ? 'rtl' : 'ltr';
};
```

```tsx
// App.tsx
const dir = useDirection();
useEffect(() => {
  document.documentElement.dir = dir;
  document.documentElement.lang = i18n.language;
}, [dir, i18n.language]);
```

**Tailwind RTL:** השתמש ב-utilities `rtl:` ו-`ltr:` או בעיקרון logical properties (`ms-`, `me-` במקום `ml-`, `mr-`).

### 9.4 פורמט מספרים ותאריכים

- מטבע: `Intl.NumberFormat(locale, {style: 'currency', currency})`
- תאריכים: `Intl.DateTimeFormat(locale, {dateStyle: 'long'})`
- אחוזים: `Intl.NumberFormat(locale, {style: 'percent', minimumFractionDigits: 1})`

### 9.5 שדות ב-DB עם תוכן רב-לשוני

לעמודות כמו `description` ב-buckets — שמור JSON:
```json
{"he": "...", "en": "..."}
```

או — שמור בשפת המקור של המשתמש בעת הקלדה, ואל תתרגם אוטומטית.

---

## 10. Validation & Safety Layer

### 10.1 Pydantic Models קריטיים

`backend/app/core/validators.py`:

```python
from pydantic import BaseModel, field_validator, model_validator
from decimal import Decimal


class TargetAllocation(BaseModel):
    holdings: dict[str, float]  # ticker → pct
    
    @model_validator(mode='after')
    def sum_must_be_100(self):
        total = sum(self.holdings.values())
        if abs(total - 100.0) > 0.01:
            raise ValueError(f"Allocation sums to {total}, must be 100.0")
        return self
    
    @model_validator(mode='after')
    def all_tickers_in_universe(self):
        from app.services.universe_service import get_universe_tickers, is_blacklisted
        valid = get_universe_tickers()
        for ticker in self.holdings:
            blocked, reason = is_blacklisted(ticker)
            if blocked:
                raise ValueError(f"{ticker} is blacklisted ({reason})")
            if ticker not in valid:
                raise ValueError(f"{ticker} is not in curated universe")
        return self
    
    @model_validator(mode='after')
    def reit_cap(self):
        from app.services.universe_service import get_etf_metadata
        reit_total = sum(
            pct for ticker, pct in self.holdings.items()
            if get_etf_metadata(ticker).bucket == "REITS"
        )
        if reit_total > 15.0:
            raise ValueError(f"REIT exposure {reit_total}% exceeds 15% cap")
        return self
    
    @model_validator(mode='after')
    def commodities_cap(self):
        from app.services.universe_service import get_etf_metadata
        cmd_total = sum(
            pct for ticker, pct in self.holdings.items()
            if get_etf_metadata(ticker).bucket == "COMMODITIES_HEDGE"
        )
        if cmd_total > 10.0:
            raise ValueError(f"Commodities exposure {cmd_total}% exceeds 10% cap")
        return self


class BucketAllocationCompatibility(BaseModel):
    """אופק זמן של Bucket תואם לסוג ה-ETFs"""
    bucket_horizon: str  # SHORT, MEDIUM, LONG
    holdings: dict[str, float]
    
    @model_validator(mode='after')
    def horizon_matches_assets(self):
        from app.services.universe_service import get_etf_metadata
        
        equity_buckets = {"GLOBAL_CORE", "US_FACTOR_VALUE", "INTL_FACTOR_VALUE", 
                        "EMERGING_MARKETS", "REITS"}
        
        equity_pct = sum(
            pct for ticker, pct in self.holdings.items()
            if get_etf_metadata(ticker).bucket in equity_buckets
        )
        
        if self.bucket_horizon == "SHORT" and equity_pct > 0:
            raise ValueError("Short-term buckets cannot hold equity ETFs")
        if self.bucket_horizon == "MEDIUM" and equity_pct > 40.0:
            raise ValueError(f"Medium-term equity {equity_pct}% exceeds 40% cap")
        return self
```

### 10.2 Safety Gates (בכל Endpoint)

```python
# Pseudocode pattern
@router.post("/api/v1/architect/sessions/{id}/confirm")
async def confirm_session(id: int, db: Session = Depends(get_db)):
    session = get_session(id, db)
    
    # Gate 1: Validation Layer
    allocation = TargetAllocation(holdings=session.final_allocation)
    BucketAllocationCompatibility(
        bucket_horizon=session.bucket.horizon_type,
        holdings=session.final_allocation,
    )
    
    # Gate 2: Sector Validation
    sector_result = validate_proposed_allocation(
        session.final_allocation, db,
        allow_overrides=session.user_acknowledged_overrides
    )
    if sector_result["status"] == "blocked":
        raise HTTPException(409, sector_result)
    
    # Gate 3: Cooling-off (if change > 30%)
    change_magnitude = compute_change_magnitude(session.bucket, session.final_allocation)
    if change_magnitude > 0.30 and not session.cooling_off_acknowledged:
        token = create_pending_action(...)
        return {"status": "cooling_off_required", "token": token, "expires_in_hours": 24}
    
    # Gate 4: Backup before commit
    backup_db_atomic()
    
    # Now commit
    apply_allocation_to_holdings(session, db)
    obsidian_service.write_decision_entry(session)
    db.commit()
```

### 10.3 Error Handling

- כל exception מתפס ב-middleware מרכזי
- תמיד מחזירים `message_key` ולא טקסט
- Stack trace רק ב-DEBUG mode
- Errors נכתבים ל-structlog בJSON

---

## 11. Testing Strategy

### 11.1 פירמידה

```
        E2E (Playwright) — 5%
       ─────────────────────
      Integration tests — 20%
     ─────────────────────────
    Unit tests (pytest, vitest) — 75%
```

### 11.2 Backend — קובץ tests חיוניים

```
tests/
├── unit/
│   ├── test_universe_service.py
│   │   ├── test_blacklist_blocks_jepi
│   │   ├── test_blacklist_blocks_leveraged
│   │   ├── test_unknown_ticker_rejected
│   │   ├── test_metadata_loads_correctly
│   │   ├── test_bucket_max_pct_enforced
│   │   └── test_universe_yaml_structure_valid
│   │
│   ├── test_scoring_service.py
│   │   ├── test_composite_score_in_range_0_1
│   │   ├── test_lower_ter_yields_higher_cost_score
│   │   ├── test_insufficient_history_returns_none
│   │   └── test_ranking_orders_correctly
│   │
│   ├── test_valuation_service.py
│   │   ├── test_zscore_classification_thresholds
│   │   ├── test_insufficient_history_returns_null_zscore
│   │   ├── test_no_expected_return_field_in_response
│   │   └── test_52w_percentile_in_range
│   │
│   ├── test_smart_deposit_service.py
│   │   ├── test_underweight_gets_priority
│   │   ├── test_no_sell_orders_ever
│   │   ├── test_minimum_per_ticker_50usd_enforced
│   │   ├── test_dry_run_does_not_persist
│   │   ├── test_currency_conversion_uses_fred_rate
│   │   └── test_fails_if_target_not_100pct
│   │
│   ├── test_drawdown_service.py
│   │   ├── test_2008_scenario_returns_negative
│   │   ├── test_results_in_currency_not_just_pct
│   │   ├── test_uses_proxy_for_young_etfs
│   │   ├── test_recovery_months_calculated
│   │   └── test_cache_works
│   │
│   ├── test_sector_service.py
│   │   ├── test_pure_vti_triggers_tech_soft_warning
│   │   ├── test_vti_plus_qqq_triggers_tech_hard_warning
│   │   ├── test_diversified_portfolio_passes
│   │   ├── test_validation_gate_blocks_concentrated
│   │   ├── test_validation_gate_allows_with_override
│   │   ├── test_hidden_stock_detection
│   │   ├── test_diversification_score_range
│   │   └── test_cache_prevents_duplicate_yfinance_calls
│   │
│   ├── test_bucket_service.py
│   │   ├── test_short_term_rejects_equity
│   │   ├── test_medium_term_caps_equity_at_40
│   │   ├── test_long_term_allows_all
│   │   └── test_archive_does_not_delete
│   │
│   └── test_validators.py
│       ├── test_allocation_must_sum_to_100
│       ├── test_allocation_rejects_unknown_ticker
│       ├── test_reit_cap_enforced_at_15pct
│       ├── test_commodities_cap_at_10pct
│       └── test_blacklisted_ticker_rejected
│
├── integration/
│   ├── test_architect_flow_end_to_end.py
│   ├── test_smart_deposit_with_obsidian_write.py
│   ├── test_cooling_off_mechanism.py
│   └── test_universe_audit_script.py
│
└── fixtures/
    ├── etf_universe_test.yaml
    ├── sample_holdings.json
    └── mock_yfinance_responses.py
```

### 11.3 Frontend — Vitest

```
tests/
├── unit/
│   ├── components/
│   │   ├── DriftChart.test.tsx
│   │   ├── SectorExposure.test.tsx
│   │   └── BucketCard.test.tsx
│   │
│   ├── hooks/
│   │   └── useDirection.test.ts
│   │
│   └── utils/
│       ├── formatting.test.ts
│       └── validation.test.ts
│
└── e2e/  (Playwright - אופציונלי)
    ├── architect-wizard.spec.ts
    ├── smart-deposit.spec.ts
    └── language-switch.spec.ts
```

### 11.4 כללי TDD

- **כל service חדש:** test ראשון, מימוש שני
- **bug fix:** test שמשחזר את הבאג ראשון
- **CI חוסם merge** אם coverage <80%
- **משך כל הרצת tests <60 שניות** (אחרת, mock כבד יותר)

---

## 12. סדר פיתוח (Sprints)

**זמן כולל: 8-10 שבועות עבודה מלאה. מפתח חלקי: 4-6 חודשים.**

### Sprint 0: Foundation (3 ימים)
- Repo setup, monorepo structure
- Docker Compose (אופציונלי)
- CI: GitHub Actions עם ruff/mypy/pytest/vitest
- Pre-commit hooks
- Database setup + Alembic init
- Skeleton FastAPI app + skeleton React app
- README + CONTRIBUTING

### Sprint 1: Universe + Validation (5-7 ימים)
- `data/etf_universe.yaml` עם 50 ETFs
- `services/universe_service.py` + tests
- `core/validators.py` + tests
- `routes/universe.py` + tests
- מסך Universe Browser (פרונט בסיסי)

### Sprint 2: DB Schema + Buckets (5 ימים)
- כל ה-Alembic migrations
- ORM models
- `services/bucket_service.py` + tests
- `routes/buckets.py`
- UI: עמוד Buckets + טופס יצירה
- i18n setup (he/en) + RTL

### Sprint 3: Valuation + Scoring (5 ימים)
- `services/yfinance_client.py` עם cache
- `services/fred_client.py`
- `services/valuation_service.py` + tests
- `services/scoring_service.py` + tests
- UI: Status badges + tooltips
- Composite Score בUniverse Browser

### Sprint 4: Smart Deposit (5 ימים)
- `services/smart_deposit_service.py` + tests
- `routes/deposits.py`
- UI: עמוד Smart Deposit
- אינטגרציית currency
- Validation gates

### Sprint 5: Sector Analysis (7 ימים)
- `services/sector_service.py` + tests
- Sector Cache table
- `routes/sectors.py`
- UI: Sector Bar Chart
- Hidden Stocks Alert
- Validation gate בArchitect

### Sprint 6: Drawdown Simulator (5 ימים)
- `services/drawdown_service.py` + tests
- 4 תרחישים היסטוריים
- Proxy mapping ל-ETFs צעירים
- UI: עמוד Drawdown Test
- אינטגרציה עם Architect (חובה לפני שמירה)

### Sprint 7: Architect Flow + AI (7 ימים)
- `services/architect_service.py` + tests
- AI Educator prompt
- Wizard 6 שלבים בפרונט
- Cooling-off mechanism
- Pending actions table

### Sprint 8: Obsidian + Audit (4 ימים)
- `services/obsidian_service.py`
- Templates
- Atomic writing
- UI: Audit Trail

### Sprint 9: Settings + Polish (5 ימים)
- כל ה-Settings tabs
- Theme switcher
- Backup tools
- Loading states, error boundaries
- Empty states

### Sprint 10: Testing & Hardening (5 ימים)
- E2E tests מינימליים
- Performance tuning
- Accessibility audit (WCAG AA)
- Documentation completion
- Quarterly Universe Review process

### Sprint 11: Beta + Iteration (שבוע)
- שימוש אמיתי שבועיים
- תיקוני באגים
- שיפורי UX מבוססי ניסיון אמיתי

---

## 13. Definition of Done

מעבר ל-feature נחשב "Done" רק כאשר:

- ✅ קוד עובר `ruff check`, `mypy --strict`, `pytest`, `vitest`
- ✅ Test coverage >80% לקובץ החדש
- ✅ אין שדות `expected_return` או "תחזיות תשואה"
- ✅ אין HTTP endpoint שלא מוגן ב-Pydantic validation
- ✅ אין מסך שלא תומך ב-RTL/LTR
- ✅ כל error message עם `message_key` מתורגם
- ✅ Component עובד גם ב-Light וגם ב-Dark mode
- ✅ אין `console.log` או `print()` שכוח
- ✅ אין סודות בקוד (FRED key רק מ-DB/env)
- ✅ קומיט עם הודעה ברורה (`feat:`, `fix:`, `test:`, `docs:`)
- ✅ עדכון לתיעוד אם API השתנה

---

## 14. שיקול דעת אמיתי — מה לא לעשות

### 14.1 פיצ'רים שיכולים להופיע "טבעיים" — וצריך לסרב להם

| פיצ'ר מבוקש | למה לא | מה לעשות במקום |
|--------------|---------|-----------------|
| "תוסיף גרף ביצועים מול S&P" | משווה משמעת לתשואה. הורס תיק long-term | סטטוס אחוזון 52W מספיק |
| "אופציה לחבר Interactive Brokers" | סיכון אבטחה + לחץ לסחר | תמיד פלט "פקודות לבצע ידנית" |
| "התראה כשהשוק יורד 5%" | מעודד פעולה רגשית | שום התראות |
| "חיווי AI על ETF נחמד" | חיפוש מתחת לAlpha | רק score מתמטי |
| "מצב סוחר" | זה הפך ל-trading platform | סרב מוחלט |
| "Backtest על אסטרטגיות שונות" | מעודד curve-fitting | רק Drawdown על תיק נבחר |
| "Live news feed" | רעש שווי = הרס משמעת | תאריך הפקדה הבאה בלבד |
| "Crypto integration" | מחוץ לתחום | סרב |
| "Tax optimization (TLH)" | מורכב לישראלי, סיכון | תפעל ידנית עם רואה חשבון |
| "Robo-rebalancing אוטומטי" | מסיר את ההחלטה מהמשתמש | המשתמש מאשר כל הפקדה |

### 14.2 התרגיל הקריטי

לפני **כל** פיצ'ר חדש — שאל:

1. האם זה עוזר למשתמש לישון בלילה ב-2030?
2. האם זה מקטין שגיאות גדולות (>20% loss)?
3. האם זה נסמך על מתמטיקה אמיתית או רק "תחושה"?

אם התשובה ל-(1) או (2) היא "לא" — **אל תוסיף**.
אם התשובה ל-(3) היא "תחושה" — **אל תוסיף**.

### 14.3 הבחירה הקשה

המוצר הסופי לא יהיה מרגש. הוא יראה כמו אקסל מעוצב היטב, עם 3-4 גרפים פשוטים. זו **התכונה**, לא הבאג.

המתחרים יהיו צבעוניים, מלאי גרפים אינטראקטיביים, ועם AI שאומר "found a great opportunity!". המוצר שלך יהיה משעמם.

זה בדיוק מה שיהפוך אותו ליעיל בעוד 20 שנה — כשהמתחרים יקרסו עם המשתמשים שלהם.

---

## 15. צ'קליסט סופי לClaude Code

לפני התחלת כל Sprint, וודא:

- [ ] קראתי את הסעיף הרלוונטי במסמך הזה
- [ ] קראתי את `SECTOR_ANALYSIS_SPEC.md` (אם רלוונטי)
- [ ] קראתי את הסעיפים הרלוונטיים ב-`IMPLEMENTATION_PLAN.md` (אם רלוונטי)
- [ ] יצרתי branch חדש: `feat/sprint-N-name`
- [ ] כתבתי tests **לפני** מימוש
- [ ] CI ירוק לפני PR

לפני סיום כל Sprint:

- [ ] כל ה-Definition of Done מתקיים
- [ ] עדכון `docs/DECISIONS/` אם בוצעה החלטה ארכיטקטונית
- [ ] עדכון README אם הוספו תלויות
- [ ] עדכון `docs/ARCHITECTURE.md` אם השתנה מבנה
- [ ] git tag: `sprint-N-complete`

---

**סוף מסמך אב.**

*כל מה שלא מופיע במסמך הזה — לא מתפתח. הוסף תחילה למסמך, אז למימוש.*