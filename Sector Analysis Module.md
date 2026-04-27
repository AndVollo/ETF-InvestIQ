# Sector Analysis Module — מפרט מימוש ל-Claude Code

**מסמך משלים ל-`IMPLEMENTATION_PLAN.md`** | תאריך: 2026-04-26
**קונטקסט:** הוספת מודול ניתוח סקטורים אמיתי לתוכנת Smart ETF Portfolio Manager.

---

## 0. למה זה קריטי

S&P 500 ב-2026 מכיל 34% טכנולוגיה. כל משקיע פסיבי שמחזיק VTI + QQQ ביחד נמצא בריכוז של 40%+ בעשר מניות. זו לא תיאוריה — זו המציאות.

המודול הזה פותר את **הבעיה הנסתרת**: גם תיק שנראה מגוון (5 ETFs שונים) יכול להיות מרוכז במניות בודדות אם הן חוזרות בכל אחד מהם.

**העיקרון המנחה:** התוכנה לא צריכה לקבל החלטות סקטוריאליות במקום המשתמש. היא צריכה **לחשוף את המציאות** ולחסום שגיאות גדולות.

---

## 1. מה להוסיף — סיכום מהיר

| רכיב | סוג | קובץ | סטטוס |
|------|-----|------|--------|
| Sector Service | Backend | `services/sector_service.py` | חדש |
| Effective Exposure Engine | Backend | בתוך sector_service | חדש |
| Hidden Concentration Detector | Backend | בתוך sector_service | חדש |
| Sector Validation Gate | Backend | `core/validators.py` | הרחבה |
| Sector Cache | DB | `sector_cache` table | חדש |
| Sector Endpoints | API | `routes/sectors.py` | חדש |
| Sector Bar Chart | Frontend | `components/SectorExposure.jsx` | חדש |
| Hidden Stocks Alert | Frontend | `components/HiddenStocks.jsx` | חדש |
| Architect Sector Gate | Frontend | בתוך Architect Wizard | הרחבה |

---

## 2. Database Schema — טבלה חדשה

```sql
-- מטמון של נתוני סקטורים מ-yfinance
-- yfinance איטי וחסום לפעמים — חובה למטמן
CREATE TABLE sector_cache (
    ticker TEXT PRIMARY KEY,
    sector_weights_json TEXT NOT NULL,    -- {"Technology": 0.31, "Healthcare": 0.12, ...}
    top_holdings_json TEXT NOT NULL,       -- [{"symbol": "AAPL", "weight": 0.07}, ...]
    fetched_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL          -- TTL = 7 ימים
);

CREATE INDEX idx_sector_cache_expires ON sector_cache(expires_at);
```

**הערה:** `sectorWeightings` ב-yfinance משתנה לאט מאוד (פעם בחודש בערך). TTL של 7 ימים מספק.

---

## 3. Backend — `services/sector_service.py`

### 3.1 קוד מלא ליישום

```python
"""
services/sector_service.py

ניתוח חשיפה סקטוריאלית אמיתית לתיק ETF.
משתמש ב-yfinance לשליפת נתוני סקטור והחזקות עליונות,
ומחשב חשיפה אפקטיבית בכל רמות התיק.
"""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Literal

import yfinance as yf
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.models import SectorCache  # ORM model
from core.logging import logger


# ============================================================
# CONFIGURATION — ספי אזהרה לכל סקטור
# ============================================================
# הערכים מבוססים על:
# - מחקר אקדמי על concentration risk (Fama-French)
# - מצב השוק ב-2026 (S&P 500 Tech = 34%)
# - אסטרטגיית "השקעה רגועה" של המשתמש (REITs מוגבל לנזילות)

SECTOR_THRESHOLDS = {
    "Technology":             {"hard_cap": 35.0, "soft_warn": 28.0},
    "Real Estate":            {"hard_cap": 15.0, "soft_warn": 12.0},
    "Energy":                 {"hard_cap": 15.0, "soft_warn": 10.0},
    "Financial Services":     {"hard_cap": 25.0, "soft_warn": 20.0},
    "Healthcare":             {"hard_cap": 25.0, "soft_warn": 18.0},
    "Consumer Cyclical":      {"hard_cap": 25.0, "soft_warn": 18.0},
    "Communication Services": {"hard_cap": 20.0, "soft_warn": 15.0},
    "Industrials":            {"hard_cap": 25.0, "soft_warn": 18.0},
    "Consumer Defensive":     {"hard_cap": 20.0, "soft_warn": 15.0},
    "Basic Materials":        {"hard_cap": 15.0, "soft_warn": 10.0},
    "Utilities":              {"hard_cap": 15.0, "soft_warn": 10.0},
    "_default":               {"hard_cap": 30.0, "soft_warn": 22.0},
}

# סף לזיהוי "מניה נסתרת" — מניה בודדת שמופיעה ביותר מ-ETF אחד
SINGLE_STOCK_WARNING_PCT = 5.0   # אם מניה בודדת > 5% מכלל התיק

# TTL למטמון
CACHE_TTL_DAYS = 7


# ============================================================
# DATA MODELS
# ============================================================

class HoldingInput(BaseModel):
    """אחזקה בודדת — קלט לחישובים"""
    ticker: str
    current_pct: float  # אחוז מהתיק (0-100)


class SectorWarning(BaseModel):
    sector: str
    pct: float
    level: Literal["soft", "hard"]
    threshold: float
    message_he: str


class HiddenStock(BaseModel):
    symbol: str
    total_exposure_pct: float
    appears_in: list[str]  # רשימת tickers של ETFs
    message_he: str


class SectorExposureReport(BaseModel):
    sectors: dict[str, float]                # {"Technology": 31.2, ...}
    warnings: list[SectorWarning]
    hidden_stocks: list[HiddenStock]
    diversification_score: float             # 0-100, גבוה = מגוון
    summary_he: str


# ============================================================
# DATA FETCH — עם מטמון
# ============================================================

def fetch_etf_sector_data(ticker: str, db: Session) -> tuple[dict, list]:
    """
    מחזיר (sector_weights, top_holdings) לטיקר.
    משתמש במטמון כדי לא להציף את yfinance.
    
    sector_weights: {"Technology": 0.31, "Healthcare": 0.12, ...}
    top_holdings:   [{"symbol": "AAPL", "weight": 0.07}, ...]
    """
    now = datetime.now(timezone.utc)
    
    # ניסיון מהמטמון
    cached = db.query(SectorCache).filter(SectorCache.ticker == ticker).first()
    if cached and cached.expires_at > now:
        import json
        return (
            json.loads(cached.sector_weights_json),
            json.loads(cached.top_holdings_json),
        )
    
    # שליפה מ-yfinance עם error handling
    try:
        yf_ticker = yf.Ticker(ticker)
        info = yf_ticker.info or {}
        
        # sectorWeightings מגיע כרשימה של dicts
        raw_sectors = info.get("sectorWeightings", [])
        sector_weights = {}
        for entry in raw_sectors:
            if isinstance(entry, dict):
                sector_weights.update(entry)
        
        # top holdings — yfinance מחזיר במבנים שונים לפעמים
        funds_data = yf_ticker.funds_data if hasattr(yf_ticker, 'funds_data') else None
        top_holdings = []
        if funds_data:
            try:
                top = funds_data.top_holdings
                if hasattr(top, 'to_dict'):
                    top_holdings = [
                        {"symbol": idx, "weight": row.get("Holding Percent", 0)}
                        for idx, row in top.to_dict('index').items()
                    ]
            except Exception as e:
                logger.warning(f"Could not fetch top holdings for {ticker}: {e}")
        
        # שמירה במטמון
        import json
        cache_entry = SectorCache(
            ticker=ticker,
            sector_weights_json=json.dumps(sector_weights),
            top_holdings_json=json.dumps(top_holdings),
            fetched_at=now,
            expires_at=now + timedelta(days=CACHE_TTL_DAYS),
        )
        db.merge(cache_entry)
        db.commit()
        
        return sector_weights, top_holdings
        
    except Exception as e:
        logger.error(f"Failed to fetch sector data for {ticker}: {e}")
        # אם יש cache פג תוקף — עדיף ממאומה
        if cached:
            import json
            return (
                json.loads(cached.sector_weights_json),
                json.loads(cached.top_holdings_json),
            )
        return {}, []


# ============================================================
# CORE CALCULATION
# ============================================================

def calculate_effective_exposure(
    holdings: list[HoldingInput],
    db: Session
) -> SectorExposureReport:
    """
    מחשב חשיפה סקטוריאלית אפקטיבית של כל התיק.
    
    דוגמה:
    אם יש לך VTI ב-50% ו-Tech בתוך VTI = 30%,
    החשיפה האפקטיבית שלך לטכנולוגיה דרך VTI = 50% × 30% = 15%.
    
    מחבר את כל החשיפות מכל ה-ETFs בתיק.
    """
    sector_totals: dict[str, float] = defaultdict(float)
    stock_totals: dict[str, float] = defaultdict(float)
    stock_sources: dict[str, list[str]] = defaultdict(list)
    
    for holding in holdings:
        weights, top_holdings = fetch_etf_sector_data(holding.ticker, db)
        
        # חשיפה סקטוריאלית
        for sector, weight in weights.items():
            # weight ב-yfinance הוא 0-1 (לא אחוזים)
            sector_totals[sector] += weight * holding.current_pct
        
        # חשיפה למניות בודדות (לזיהוי חפיפות)
        for stock in top_holdings:
            symbol = stock.get("symbol")
            weight = stock.get("weight", 0)  # גם כן 0-1
            if symbol and weight > 0:
                stock_totals[symbol] += weight * holding.current_pct
                stock_sources[symbol].append(holding.ticker)
    
    # זיהוי אזהרות סקטוריאליות
    warnings = []
    for sector, pct in sector_totals.items():
        thresholds = SECTOR_THRESHOLDS.get(sector, SECTOR_THRESHOLDS["_default"])
        
        if pct >= thresholds["hard_cap"]:
            warnings.append(SectorWarning(
                sector=sector,
                pct=round(pct, 1),
                level="hard",
                threshold=thresholds["hard_cap"],
                message_he=f"חשיפה ל-{_sector_he(sector)} היא {pct:.1f}% — מעל הגבול של {thresholds['hard_cap']}%"
            ))
        elif pct >= thresholds["soft_warn"]:
            warnings.append(SectorWarning(
                sector=sector,
                pct=round(pct, 1),
                level="soft",
                threshold=thresholds["soft_warn"],
                message_he=f"חשיפה ל-{_sector_he(sector)} היא {pct:.1f}% — קרוב לסף הריכוז"
            ))
    
    # זיהוי מניות נסתרות (חוזרות במספר ETFs)
    hidden = []
    for symbol, total_pct in stock_totals.items():
        if total_pct >= SINGLE_STOCK_WARNING_PCT and len(stock_sources[symbol]) > 1:
            hidden.append(HiddenStock(
                symbol=symbol,
                total_exposure_pct=round(total_pct, 2),
                appears_in=stock_sources[symbol],
                message_he=(
                    f"{symbol} מופיעה ב-{len(stock_sources[symbol])} ETFs שלך "
                    f"({', '.join(stock_sources[symbol])}) — חשיפה כוללת: {total_pct:.1f}%"
                )
            ))
    
    # ציון גיוון: 0 = ריכוז קיצוני, 100 = מאוזן מושלם
    diversification = _calculate_diversification_score(sector_totals)
    
    # סיכום בעברית
    summary = _build_summary(sector_totals, warnings, hidden, diversification)
    
    return SectorExposureReport(
        sectors={k: round(v, 1) for k, v in sector_totals.items()},
        warnings=warnings,
        hidden_stocks=hidden,
        diversification_score=diversification,
        summary_he=summary,
    )


def _calculate_diversification_score(sectors: dict[str, float]) -> float:
    """
    Herfindahl-Hirschman Index (HHI) — מדד אקדמי לריכוז.
    מנורמל ל-0-100 כאשר 100 = מאוזן מושלם.
    """
    if not sectors:
        return 0.0
    
    total = sum(sectors.values())
    if total == 0:
        return 0.0
    
    # נרמול ל-100% (yfinance לפעמים לא מסתכם בדיוק ל-100)
    normalized = {k: (v / total) * 100 for k, v in sectors.items()}
    
    # HHI = sum of squares of percentages
    hhi = sum(pct ** 2 for pct in normalized.values())
    
    # 11 סקטורים מאוזנים: HHI = 11 × (100/11)² = 909
    # סקטור אחד דומיננטי: HHI = 10000
    # נרמול הפוך:
    min_hhi = 909   # מאוזן מושלם
    max_hhi = 10000 # ריכוז מוחלט
    
    # ככל ש-HHI נמוך יותר, הציון גבוה יותר
    score = max(0, min(100, 100 * (max_hhi - hhi) / (max_hhi - min_hhi)))
    return round(score, 1)


def _sector_he(sector: str) -> str:
    """תרגום שמות סקטור לעברית"""
    return {
        "Technology": "טכנולוגיה",
        "Healthcare": "בריאות",
        "Financial Services": "פיננסים",
        "Real Estate": "נדל\"ן",
        "Energy": "אנרגיה",
        "Consumer Cyclical": "צריכה מחזורית",
        "Consumer Defensive": "צריכה הגנתית",
        "Communication Services": "תקשורת",
        "Industrials": "תעשייה",
        "Basic Materials": "חומרי גלם",
        "Utilities": "תשתיות",
    }.get(sector, sector)


def _build_summary(sectors, warnings, hidden, score) -> str:
    """סיכום בעברית בשורה אחת"""
    if score >= 75:
        base = f"תיק מגוון ✅ (ציון: {score}/100)."
    elif score >= 50:
        base = f"תיק עם ריכוז בינוני ⚠️ (ציון: {score}/100)."
    else:
        base = f"תיק מרוכז מאוד ❌ (ציון: {score}/100)."
    
    issues = len([w for w in warnings if w.level == "hard"])
    if issues:
        base += f" {issues} סקטור(ים) חורגים מהגבול."
    
    if hidden:
        base += f" {len(hidden)} מנייה(ות) חוזרת במספר ETFs."
    
    return base


# ============================================================
# VALIDATION GATE — נקודת חסימה לפני שמירת תיק חדש
# ============================================================

def validate_proposed_allocation(
    allocation: dict[str, float],
    db: Session,
    allow_overrides: bool = False,
) -> dict:
    """
    רץ לפני שמירת תיק חדש בארכיטקט.
    מחזיר status: "ok" / "warning" / "blocked"
    
    blocked = יש hard warning ולא הותר override
    warning = יש soft warning בלבד
    ok = אין שום בעיה
    """
    holdings = [
        HoldingInput(ticker=t, current_pct=p)
        for t, p in allocation.items()
    ]
    
    report = calculate_effective_exposure(holdings, db)
    
    hard_warnings = [w for w in report.warnings if w.level == "hard"]
    soft_warnings = [w for w in report.warnings if w.level == "soft"]
    
    if hard_warnings and not allow_overrides:
        suggestions = _suggest_fixes(hard_warnings, allocation)
        return {
            "status": "blocked",
            "report": report.dict(),
            "blocking_warnings": [w.dict() for w in hard_warnings],
            "suggestions": suggestions,
            "override_available": True,
        }
    
    if soft_warnings or report.hidden_stocks:
        return {
            "status": "warning",
            "report": report.dict(),
        }
    
    return {
        "status": "ok",
        "report": report.dict(),
    }


def _suggest_fixes(warnings: list[SectorWarning], allocation: dict) -> list[str]:
    """הצעות מעשיות לתיקון ריכוז"""
    suggestions = []
    
    for w in warnings:
        if w.sector == "Technology":
            suggestions.append(
                "להפחית: שקול להוריד QQQ אם קיים, או להגדיל הקצאה ל-VXUS / AVUV / BND."
            )
        elif w.sector == "Real Estate":
            suggestions.append(
                "להפחית: REITs מעל 15% פוגע בנזילות. הורד את אחוז ה-VNQ/REET."
            )
        elif w.sector == "Energy":
            suggestions.append(
                "להפחית: אנרגיה תנודתית מאוד. שקול להוריד חשיפה ספציפית."
            )
        else:
            suggestions.append(
                f"לדלל את החשיפה ל-{_sector_he(w.sector)} ע\"י הגדלה של ETF במגזר אחר."
            )
    
    return suggestions
```

### 3.2 בדיקות לפי TDD

```python
# tests/test_sector_service.py

import pytest
from services.sector_service import (
    HoldingInput,
    calculate_effective_exposure,
    validate_proposed_allocation,
    SECTOR_THRESHOLDS,
)


def test_pure_vti_triggers_tech_soft_warning(test_db):
    """VTI לבדו → Tech ~32% → soft warning"""
    holdings = [HoldingInput(ticker="VTI", current_pct=100)]
    report = calculate_effective_exposure(holdings, test_db)
    
    tech_warnings = [w for w in report.warnings if w.sector == "Technology"]
    assert len(tech_warnings) > 0
    assert tech_warnings[0].level in ("soft", "hard")


def test_vti_plus_qqq_triggers_tech_hard_warning(test_db):
    """VTI 50% + QQQ 50% → Tech > 35% → hard warning"""
    holdings = [
        HoldingInput(ticker="VTI", current_pct=50),
        HoldingInput(ticker="QQQ", current_pct=50),
    ]
    report = calculate_effective_exposure(holdings, test_db)
    
    tech_warnings = [w for w in report.warnings if w.sector == "Technology"]
    assert any(w.level == "hard" for w in tech_warnings)


def test_diversified_portfolio_passes(test_db):
    """תיק 4 Buckets → ללא אזהרות hard"""
    holdings = [
        HoldingInput(ticker="VTI", current_pct=40),
        HoldingInput(ticker="VXUS", current_pct=25),
        HoldingInput(ticker="AVUV", current_pct=15),
        HoldingInput(ticker="BND", current_pct=20),
    ]
    report = calculate_effective_exposure(holdings, test_db)
    
    hard_warnings = [w for w in report.warnings if w.level == "hard"]
    assert len(hard_warnings) == 0
    assert report.diversification_score >= 70


def test_validation_gate_blocks_concentrated_portfolio(test_db):
    """validation_gate חוסם תיק מרוכז ללא override"""
    allocation = {"VTI": 50, "QQQ": 50}
    result = validate_proposed_allocation(allocation, test_db)
    
    assert result["status"] == "blocked"
    assert result["override_available"] is True
    assert len(result["suggestions"]) > 0


def test_validation_gate_allows_with_override(test_db):
    """validation_gate מאפשר עם override"""
    allocation = {"VTI": 50, "QQQ": 50}
    result = validate_proposed_allocation(allocation, test_db, allow_overrides=True)
    
    assert result["status"] != "blocked"


def test_hidden_stock_detection(test_db):
    """NVDA מופיעה ב-VTI ו-QQQ → hidden stock alert"""
    holdings = [
        HoldingInput(ticker="VTI", current_pct=50),
        HoldingInput(ticker="QQQ", current_pct=50),
    ]
    report = calculate_effective_exposure(holdings, test_db)
    
    nvda_alerts = [s for s in report.hidden_stocks if s.symbol == "NVDA"]
    assert len(nvda_alerts) == 1
    assert "VTI" in nvda_alerts[0].appears_in
    assert "QQQ" in nvda_alerts[0].appears_in


def test_diversification_score_range(test_db):
    """ציון תמיד בין 0-100"""
    holdings = [HoldingInput(ticker="VTI", current_pct=100)]
    report = calculate_effective_exposure(holdings, test_db)
    assert 0 <= report.diversification_score <= 100


def test_cache_prevents_duplicate_yfinance_calls(test_db, mocker):
    """קריאה שנייה לאותו ticker → לא קוראת ל-yfinance"""
    spy = mocker.spy(yf, "Ticker")
    
    holdings = [HoldingInput(ticker="VTI", current_pct=100)]
    calculate_effective_exposure(holdings, test_db)
    calculate_effective_exposure(holdings, test_db)
    
    # רק קריאה אחת ל-yfinance
    assert spy.call_count == 1
```

---

## 4. API Endpoints — `routes/sectors.py`

```python
"""
routes/sectors.py — נקודות קצה לניתוח סקטורים
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.session import get_db
from services.sector_service import (
    HoldingInput,
    calculate_effective_exposure,
    validate_proposed_allocation,
)
from services.portfolio_service import get_current_holdings

router = APIRouter(prefix="/api/sectors", tags=["sectors"])


@router.get("/exposure")
def get_current_exposure(db: Session = Depends(get_db)):
    """
    מחזיר חשיפה סקטוריאלית של התיק הנוכחי.
    משמש את הדשבורד הראשי.
    """
    holdings = get_current_holdings(db)
    if not holdings:
        return {"sectors": {}, "warnings": [], "hidden_stocks": [], "summary_he": "אין אחזקות"}
    
    inputs = [
        HoldingInput(ticker=h.ticker, current_pct=h.current_pct)
        for h in holdings
    ]
    return calculate_effective_exposure(inputs, db).dict()


@router.post("/validate")
def validate_allocation(
    allocation: dict[str, float],
    allow_overrides: bool = False,
    db: Session = Depends(get_db),
):
    """
    בדיקת חשיפה לפני שמירת תיק חדש.
    מוחזר לפני כל פעולת save בארכיטקט.
    
    Body:
    {
      "allocation": {"VTI": 40, "VXUS": 25, ...},
      "allow_overrides": false
    }
    """
    # ולידציה: סך = 100
    total = sum(allocation.values())
    if abs(total - 100.0) > 0.01:
        raise HTTPException(400, f"Allocation sums to {total}, must equal 100")
    
    return validate_proposed_allocation(allocation, db, allow_overrides)


@router.get("/thresholds")
def get_thresholds():
    """מחזיר את ספי האזהרה לכל סקטור — ל-UI/Settings"""
    from services.sector_service import SECTOR_THRESHOLDS
    return SECTOR_THRESHOLDS


@router.delete("/cache")
def clear_sector_cache(db: Session = Depends(get_db)):
    """ניקוי מטמון ידני — לדיבוג / אחרי universe update"""
    from db.models import SectorCache
    db.query(SectorCache).delete()
    db.commit()
    return {"status": "cleared"}
```

**רישום ב-`main.py`:**
```python
from routes import sectors
app.include_router(sectors.router)
```

---

## 5. Frontend — שני רכיבים חדשים

### 5.1 `SectorExposure.jsx` — בדשבורד

**מיקום:** מתחת ל-Drift Chart בדשבורד הראשי.

```jsx
// components/SectorExposure.jsx
import { useEffect, useState } from 'react';

const SECTOR_HE = {
  "Technology": "טכנולוגיה",
  "Healthcare": "בריאות",
  "Financial Services": "פיננסים",
  "Real Estate": "נדל\"ן",
  "Energy": "אנרגיה",
  "Consumer Cyclical": "צריכה מחזורית",
  "Industrials": "תעשייה",
  "Communication Services": "תקשורת",
  "Consumer Defensive": "צריכה הגנתית",
  "Basic Materials": "חומרי גלם",
  "Utilities": "תשתיות",
};

export default function SectorExposure() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/sectors/exposure')
      .then(r => r.json())
      .then(setData);
  }, []);
  
  if (!data) return <div>טוען...</div>;
  
  // מיון לפי גודל
  const sorted = Object.entries(data.sectors)
    .sort(([, a], [, b]) => b - a);
  
  const maxPct = Math.max(...sorted.map(([, p]) => p));
  
  return (
    <section className="sector-exposure">
      <div className="header">
        <h3>חשיפה סקטוריאלית בפועל</h3>
        <span className="score">
          ציון גיוון: {data.diversification_score}/100
        </span>
      </div>
      <p className="summary">{data.summary_he}</p>
      
      <div className="bars">
        {sorted.map(([sector, pct]) => {
          const warning = data.warnings.find(w => w.sector === sector);
          const level = warning?.level;
          const barColor =
            level === 'hard' ? '#dc2626' :
            level === 'soft' ? '#f59e0b' :
            '#10b981';
          
          return (
            <div key={sector} className="sector-row">
              <span className="name">
                {SECTOR_HE[sector] || sector}
              </span>
              <div className="bar-container">
                <div
                  className="bar"
                  style={{
                    width: `${(pct / maxPct) * 100}%`,
                    background: barColor,
                  }}
                />
              </div>
              <span className="pct">{pct.toFixed(1)}%</span>
              {level === 'hard' && <span className="flag">❌</span>}
              {level === 'soft' && <span className="flag">⚠️</span>}
            </div>
          );
        })}
      </div>
      
      {data.hidden_stocks.length > 0 && (
        <HiddenStocksAlert stocks={data.hidden_stocks} />
      )}
    </section>
  );
}

function HiddenStocksAlert({ stocks }) {
  return (
    <div className="hidden-stocks-alert">
      <h4>⚠️ ריכוז נסתר במניות בודדות</h4>
      <ul>
        {stocks.map(s => (
          <li key={s.symbol}>
            <strong>{s.symbol}</strong> — {s.total_exposure_pct}%
            <span className="sources">
              ({s.appears_in.join(', ')})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 5.2 שילוב ב-Architect Wizard

**שלב חדש:** "Sector Review" — לפני אישור סופי של תיק חדש.

```jsx
// בתוך ArchitectWizard.jsx

async function handleProceedToSave() {
  setLoading(true);
  
  const validation = await fetch('/api/sectors/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      allocation: proposedAllocation,
      allow_overrides: overrideAcknowledged,
    }),
  }).then(r => r.json());
  
  setLoading(false);
  
  if (validation.status === 'blocked') {
    setBlockingWarnings(validation.blocking_warnings);
    setSuggestions(validation.suggestions);
    setShowOverrideOption(true);
    return;
  }
  
  if (validation.status === 'warning') {
    // הצג סיכום אך אפשר להמשיך
    setSoftWarnings(validation.report.warnings);
    setHiddenStocks(validation.report.hidden_stocks);
    setShowConfirmDialog(true);
    return;
  }
  
  // status === 'ok' — אפשר לשמור
  saveAllocation();
}

// UI להצגת חסימה
{blockingWarnings.length > 0 && (
  <div className="blocking-dialog">
    <h3>❌ התיק חוסם — חשיפה מוגזמת</h3>
    {blockingWarnings.map(w => (
      <div key={w.sector} className="warning-item">
        <strong>{w.message_he}</strong>
      </div>
    ))}
    
    <h4>הצעות לתיקון:</h4>
    <ul>
      {suggestions.map((s, i) => <li key={i}>{s}</li>)}
    </ul>
    
    <label>
      <input
        type="checkbox"
        checked={overrideAcknowledged}
        onChange={e => setOverrideAcknowledged(e.target.checked)}
      />
      אני מבין/ה את הסיכון ורוצה להמשיך בכל זאת
    </label>
    
    <div className="actions">
      <button onClick={returnToEdit}>חזור לעריכה</button>
      <button
        disabled={!overrideAcknowledged}
        onClick={handleProceedToSave}
      >
        אישור עם override
      </button>
    </div>
  </div>
)}
```

---

## 6. שילוב ב-Smart Deposit

**הוספה ל-`services/smart_deposit_service.py`:**

```python
def calculate_smart_deposit(amount: float, db: Session) -> dict:
    """
    החישוב הקיים — ללא שינוי מהותי.
    הוסף בסוף בדיקת סקטור על התיק לאחר ההפקדה הצפויה.
    """
    # ... החישוב הקיים ...
    
    orders = compute_buy_orders(amount, db)
    
    # סימולציה: איך יראה התיק אחרי ההפקדה?
    projected_holdings = simulate_post_deposit(orders, db)
    projected_inputs = [
        HoldingInput(ticker=h.ticker, current_pct=h.projected_pct)
        for h in projected_holdings
    ]
    
    sector_check = calculate_effective_exposure(projected_inputs, db)
    
    return {
        "orders": orders,
        "projected_sector_exposure": sector_check.dict(),
        # אם הפקדה זו תיצור hard warning — להזהיר אבל לא לחסום
        "post_deposit_warnings": [
            w.dict() for w in sector_check.warnings if w.level == "hard"
        ],
    }
```

---

## 7. Settings — בקרה למשתמש

הוספה ל-טאב Settings:

```jsx
<section className="sector-thresholds">
  <h4>ספי אזהרה סקטוריאליים</h4>
  <p className="help">
    התוכנה תזהיר כשחשיפה לסקטור עוברת את הסף.
    הערכים המומלצים מבוססים על מחקר אקדמי — שנה רק אם אתה יודע מה אתה עושה.
  </p>
  
  {Object.entries(thresholds).map(([sector, vals]) => (
    <div key={sector} className="threshold-row">
      <span>{SECTOR_HE[sector]}</span>
      <input
        type="number"
        value={vals.soft_warn}
        onChange={e => updateThreshold(sector, 'soft_warn', e.target.value)}
      />
      <input
        type="number"
        value={vals.hard_cap}
        onChange={e => updateThreshold(sector, 'hard_cap', e.target.value)}
      />
    </div>
  ))}
  
  <button onClick={resetToDefaults}>שחזר ברירות מחדל</button>
</section>
```

---

## 8. Obsidian Integration

הוסף ל-template `decision_entry.md`:

```markdown
## חשיפה סקטוריאלית בפועל

| סקטור | אחוז | סטטוס |
|-------|------|-------|
{{#each sectors}}
| {{name_he}} | {{pct}}% | {{status_emoji}} |
{{/each}}

**ציון גיוון:** {{diversification_score}}/100

{{#if hidden_stocks}}
### ריכוזים נסתרים
{{#each hidden_stocks}}
- {{symbol}}: {{total_exposure_pct}}% (מופיע ב-{{appears_in}})
{{/each}}
{{/if}}

{{#if hard_warnings_acknowledged}}
> **שים לב:** המשתמש אישר override על אזהרות hard:
> {{hard_warnings_list}}
{{/if}}
```

---

## 9. סדר ביצוע — Sprint Plan

### Sprint Sectors-1 (3-4 ימים): Backend Foundation
1. צור טבלה `sector_cache`
2. ממש `services/sector_service.py` — פונקציות `fetch_etf_sector_data`, `calculate_effective_exposure`
3. כתוב tests ל-fetch + cache
4. ממש `validate_proposed_allocation`

### Sprint Sectors-2 (2 ימים): API
1. צור `routes/sectors.py`
2. רשום router ב-main
3. בדוק endpoints מול Postman/curl
4. כתוב integration tests

### Sprint Sectors-3 (3 ימים): Frontend Dashboard
1. רכיב `SectorExposure.jsx`
2. רכיב `HiddenStocksAlert`
3. CSS למעבר חלק בין רמות אזהרה
4. שילוב בדשבורד

### Sprint Sectors-4 (2-3 ימים): Architect Gate
1. הוסף שלב "Sector Review" ב-Wizard
2. UI לחסימה + override mechanism
3. תצוגת suggestions

### Sprint Sectors-5 (1-2 ימים): Smart Deposit + Obsidian
1. שילוב ב-Smart Deposit (סימולציה אחרי הפקדה)
2. עדכון Obsidian template

### Sprint Sectors-6 (1 יום): Settings + Polish
1. UI לעריכת thresholds
2. בדיקות end-to-end

**סה"כ: ~12-15 ימי עבודה.**

---

## 10. Edge Cases — חשוב לטפל

```
✋ ETF ללא sectorWeightings (אג"ח, סחורות)
   → סקטור = "Fixed Income" / "Commodity"
   → לא נכלל בחישוב 11 הסקטורים הסטנדרטיים

✋ ETF חדש שאין לו עדיין נתונים ב-yfinance
   → return empty, הצג חיווי "נתונים חסרים"
   → לא חוסם פעולות

✋ סך sectorWeightings != 100% (קורה!)
   → נרמל אוטומטית

✋ מטמון פג תוקף + yfinance חסום
   → השתמש בנתונים פגי תוקף + חיווי בממשק

✋ Top holdings לא זמין לכל ETF
   → דלג על Hidden Stocks Detection לאותו ETF
   → אל תקרוס
```

---

## 11. שיקול דעת אמיתי — מה לא לעשות

### ❌ אל תוסיף
- **Sector Rotation Recommendation** — "עכשיו זמן לקנות אנרגיה!" — זה trading
- **Sector Forecasting** — אין מודל אמין לחיזוי ביצועי סקטור
- **גרף עוגה צבעוני** — bars אופקיים יותר ברורים
- **Sector Performance Tracking** — לא תפקידנו, השוק יעשה את שלו

### ✅ מה כן עושה ערך
- **חשיפה אמיתית** (לא מסך השוואה ל-S&P)
- **חסימה לפני שגיאה גדולה** (Hard Cap)
- **גילוי חפיפות נסתרות** (NVDA במספר ETFs)
- **ציון גיוון פשוט** (HHI מנורמל)

---

## 12. סיכום למסמך

המודול הזה מוסיף **3 שכבות הגנה** לתיק:

1. **שקיפות** — המשתמש רואה את החשיפה האמיתית, לא הנומינלית
2. **גילוי** — חפיפות נסתרות במניות בודדות נחשפות
3. **חסימה** — שגיאות גדולות מונעות לפני שמירה

הקוד מתוכנן להיות **שמרני** — מתריע יותר מאשר מתעלם. עדיף false positive (אזהרה מיותרת) על-פני false negative (תיק מרוכז עובר בשתיקה).

המוצר הסופי: כשהמשתמש שומר תיק, הוא **יודע בדיוק** מה החשיפה שלו לטכנולוגיה ב-2026 — לא רק "VTI".

זה ההבדל בין משקיע מקצועי למהמר.