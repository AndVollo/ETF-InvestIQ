# משימה ל-Claude Code: תמיכה ב-UCITS / Irish-Domiciled ETFs

**גרסה:** 1.0
**יעד:** Smart ETF Portfolio Manager (Greenfield, גרסה 1.0)
**סוג שינוי:** הרחבה — לא משנה ארכיטקטורה, לא נוגע בעקרונות יסוד
**Sprint משוער:** ~3 ימי עבודה (1 backend, 1 frontend, 1 בדיקות + תיעוד)

---

## 1. מטרה

להוסיף למערכת מודעות לארץ ההתאגדות (`domicile`) ולסוג חלוקה (`distribution`) של כל ETF ב-Universe, כדי לאפשר למשתמש ישראלי לבחור גרסאות UCITS איריות חסכוניות יותר במס.

**הרציונל בקצרה:**
- ETF אמריקאי → 30% ניכוי במקור על דיבידנדים למשקיע ישראלי.
- ETF אירי (UCITS) → 15% ניכוי במקור ברמת הקרן (אמנת מס US-Ireland).
- UCITS Accumulating → דחיית אירוע מס בישראל עד למכירה.
- אזהרה קריטית: לאזרחי ארה"ב — קרנות זרות גוררות סיווג PFIC. חובה אופציה לכבות את ההצעה.

---

## 2. Non-Goals (חשוב לא לחרוג)

- ❌ **לא** ליצור service חדש לעצות מס. המערכת לא נותנת ייעוץ מס.
- ❌ **לא** להחליף ETFs קיימים — רק להוסיף מקבילות.
- ❌ **לא** לחסום הקצאות בארה"ב. האזהרה אינפורמטיבית בלבד, לא חוסמת.
- ❌ **לא** להציג "תשואה צפויה" של מעבר UCITS. לא לחזות.
- ❌ **לא** לגעת ב-blacklist, ב-scoring weights, או באלגוריתם ה-Smart Deposit.
- ❌ **לא** להוסיף קטגוריות bucket חדשות. ה-UCITS משתמש בקטגוריות הקיימות (`GLOBAL_CORE`, `US_BONDS` וכו').

---

## 3. Definition of Done

המשימה Done רק כש**כל** הסעיפים הבאים מתקיימים:

- [ ] `etf_universe.yaml` מכיל שדות חדשים: `domicile`, `distribution`, `ucits`, `isin`. כל ה-ETFs הקיימים backfilled.
- [ ] לפחות **10 ETFs מקבילים UCITS** הוספו ל-Universe (רשימה בסעיף 5).
- [ ] `ETFMetadata` Pydantic schema מעודכן עם השדות החדשים.
- [ ] `universe_service` מחזיר את השדות החדשים בכל endpoint רלוונטי.
- [ ] עמוד Universe Browser מציג Badge `🇮🇪 UCITS Acc` או `🇺🇸 US Dist` ליד כל ETF.
- [ ] Universe Browser מאפשר פילטר: `All / UCITS only / US only`.
- [ ] Settings → Tab General מכיל צ'קבוקס: "אזרח/ית ארה"ב (PFIC risk)".
- [ ] ה-Architect מציג notice אינפורמטיבי כאשר ההקצאה ≥50% US-domiciled, ויש מקבילות UCITS ב-Universe — **אלא אם** הצ'קבוקס PFIC מסומן.
- [ ] ה-notice משתמש ב-`message_key + params`, מתורגם ב-i18n.
- [ ] בדיקות עוברות (unit + integration). Coverage על קוד חדש ≥80%.
- [ ] `ruff check`, `mypy --strict`, `pytest`, `vitest`, `npm run typecheck` — כולם עוברים.
- [ ] אין `print()` או `console.log` שכוחים.
- [ ] `scripts/audit_universe.py` מאמת גם את ה-ETFs האירים (שינוי קל — ראה סעיף 8).
- [ ] תיעוד: ADR קצר ב-`docs/DECISIONS/ADR-XXX-ucits-support.md`.
- [ ] Commits עוקבים אחרי הקונבנציה (`feat(universe): ...`).

---

## 4. שינויי Schema

### 4.1 הרחבת `etf_universe.yaml`

לכל entry קיים — הוסף ארבעה שדות. לדוגמה, ה-entry של VT הופך מ:

```yaml
- ticker: VT
  bucket: GLOBAL_CORE
  ter: 0.07
  ...
```

ל:

```yaml
- ticker: VT
  bucket: GLOBAL_CORE
  isin: US9220427424
  domicile: US                    # US | IE | LU
  distribution: Distributing      # Distributing | Accumulating
  ucits: false                    # bool
  ter: 0.07
  ...
```

**Backfill:** כל ה-ETFs הקיימים (VT, VTI, VXUS, AVUV, DFSV, AVDV, AVES, BND, GOVT, TIP, SGOV, BIL, VNQ, REET, IAU, GLDM, VWO, IEMG) → `domicile: US`, `distribution: Distributing`, `ucits: false`.

### 4.2 Pydantic Schema

ב-`backend/app/schemas/etf.py` (או היכן שמוגדר `ETFMetadata`):

```python
from typing import Literal

class ETFMetadata(BaseModel):
    ticker: str
    bucket: str
    isin: str | None = None
    domicile: Literal["US", "IE", "LU"]
    distribution: Literal["Distributing", "Accumulating"]
    ucits: bool
    ter: float
    # ... שאר השדות הקיימים
```

**חשוב:** Defaults רק לשדות שלא היו קיימים קודם (`isin` יכול להיות None). שדות חדשים שהם חובה (`domicile`, `distribution`, `ucits`) — חייבים להיות מאוכלסים בכל entry ב-YAML. validator יזרוק שגיאה אם חסר.

### 4.3 Alembic Migration

**אין צורך.** ה-Universe נטען מ-YAML בלבד; אין טבלה ל-ETF metadata ב-DB. ראה `architecture.md`: "Source of truth: backend/data/etf_universe.yaml".

הסיווג של PFIC הוא setting פשוט בטבלת `app_settings` הקיימת (key-value), ללא migration.

---

## 5. ה-UCITS ETFs להוספה

הוסף את ה-entries הבאים ל-`etf_universe.yaml`. הערכים מציינים TER ו-ISIN כפי שידועים — **`scripts/audit_universe.py` יאמת מול yfinance ויעדכן בריצה הבאה**. אם yfinance לא מחזיר TER עבור UCITS — קח מאתר המנפיק (Vanguard / iShares / SPDR) ועדכן ידנית.

| Ticker | ISIN | מקבילה ל | Bucket | Domicile | Distribution | TER משוער |
|--------|------|----------|--------|----------|--------------|------------|
| VWRA | IE00BK5BQT80 | VT | GLOBAL_CORE | IE | Accumulating | 0.22% |
| CSPX | IE00B5BMR087 | VTI / SPY | GLOBAL_CORE | IE | Accumulating | 0.07% |
| VHVE | IE00BKX55T58 | VTI (Developed) | GLOBAL_CORE | IE | Accumulating | 0.12% |
| VFEA | IE00BK5BR733 | VWO / IEMG | EMERGING_MARKETS | IE | Accumulating | 0.22% |
| EIMI | IE00BKM4GZ66 | IEMG | EMERGING_MARKETS | IE | Accumulating | 0.18% |
| ZPRV | IE00BSPLC413 | AVUV | US_FACTOR_VALUE | IE | Accumulating | 0.30% |
| WSML | IE00BF4RFH31 | (Small Cap World) | US_FACTOR_VALUE | IE | Accumulating | 0.35% |
| AGGG | IE00B43QJJ40 | BND | US_BONDS | IE | Distributing | 0.10% |
| VAGS | IE00BG47KH54 | BND (Acc) | US_BONDS | IE | Accumulating | 0.10% |
| IDTL | IE00BSKRJZ44 | TLT | US_BONDS | IE | Distributing | 0.07% |
| SGLN | IE00B4ND3602 | IAU / GLDM | COMMODITIES_HEDGE | IE | Accumulating | 0.12% |
| IPRP | IE00B0M63284 | (REIT-Europe) | REITS | IE | Distributing | 0.40% |

**הערה לגבי SGLN:** טכנית ETC ולא ETF, אבל זה הסטנדרט בשוק UCITS לחשיפה לזהב פיזי. שמור על אותו `bucket: COMMODITIES_HEDGE` ועל ה-cap הקיים של 10%.

**הערה לגבי שדות נוספים בכל entry חדש:**
- `inception`: תאריך הקמת הקרן (חובה לסקור באתר המנפיק)
- `description_en` / `description_he`: שורה אחת
- `aum_threshold_usd`: 100_000_000 (אותו threshold כמו ה-US)

---

## 6. שינויים ב-Backend

### 6.1 `universe_service.py`

```python
def get_ucits_alternatives(self, ticker: str) -> list[str]:
    """
    Returns list of UCITS-domiciled tickers in the same bucket
    as the given (presumably US-domiciled) ticker.
    """
    metadata = self.get_etf_metadata(ticker)
    if not metadata or metadata.ucits:
        return []
    same_bucket = self.get_etfs_in_bucket(metadata.bucket)
    return [e.ticker for e in same_bucket if e.ucits]
```

בדיקה תואמת ב-`tests/unit/test_universe_service.py`:
- `test_get_ucits_alternatives_for_VT_returns_VWRA_CSPX_VHVE`
- `test_get_ucits_alternatives_for_VWRA_returns_empty` (כבר UCITS)
- `test_get_ucits_alternatives_for_unknown_ticker_returns_empty`

### 6.2 `architect_service.py`

הוסף פונקציה לדו"ח האימות:

```python
def check_ucits_eligibility(
    self,
    allocation: dict[str, float],
    is_us_citizen: bool,
) -> UcitsAdvisory | None:
    """
    Returns advisory only if:
      - User is NOT US citizen (PFIC risk override)
      - >=50% of allocation is US-domiciled
      - >=1 ticker has a UCITS alternative in the universe
    """
    if is_us_citizen:
        return None

    us_pct = sum(
        pct for ticker, pct in allocation.items()
        if self.universe_service.get_etf_metadata(ticker).domicile == "US"
    )
    if us_pct < 50:
        return None

    suggestions = {}
    for ticker in allocation:
        alts = self.universe_service.get_ucits_alternatives(ticker)
        if alts:
            suggestions[ticker] = alts

    if not suggestions:
        return None

    return UcitsAdvisory(
        message_key="info.ucits_alternative_available",
        params={
            "us_pct": round(us_pct, 1),
            "suggestions": suggestions,
        },
    )
```

הוסף לתשובת ה-validation report של ה-Architect (לא חוסם, אינפורמטיבי).

**Pydantic:**

```python
class UcitsAdvisory(BaseModel):
    message_key: str
    params: dict[str, Any]

class ArchitectValidationReport(BaseModel):
    # ... שדות קיימים
    ucits_advisory: UcitsAdvisory | None = None
```

### 6.3 `settings_service.py`

הוסף key:

```python
SETTING_KEYS = {
    # קיימים...
    "is_us_citizen": {"type": "bool", "default": False},
}
```

הוסף endpoint ב-`routes/settings.py` (אם לא קיים גנרי כבר):

```
GET  /api/v1/settings/is_us_citizen
PUT  /api/v1/settings/is_us_citizen   { "value": true }
```

---

## 7. שינויים ב-Frontend

### 7.1 Universe Browser (`pages/UniverseBrowser.tsx`)

**Badge נוסף בכל שורה:**
- `domicile === "IE"` → כיתוב `🇮🇪 UCITS · {distribution === "Accumulating" ? "Acc" : "Dist"}` ברקע ירקרק.
- `domicile === "US"` → כיתוב `🇺🇸 US · Dist` ברקע אפרפר.

**פילטר חדש בראש העמוד:**
- כפתורי radio: `הכל / UCITS בלבד / US בלבד`
- שמירת בחירה ב-Zustand store (לא בURL — נשאר local).

**Modal הפרטים של ETF:**
- הוסף שורה: "Domicile: Ireland (UCITS) · Accumulating"
- אם US-domiciled ויש UCITS alternative → קישור פנימי "ראה גרסת UCITS: VWRA"

### 7.2 Settings → Tab General (`pages/Settings.tsx`)

הוסף בלוק חדש מתחת ל-"שפה" ו-"מטבע בסיס":

```
מצב מס:
  ☐ אזרח/ית ארה"ב (PFIC risk)
  
  כשמסומן, המערכת לא תציע מקבילות UCITS אירופיות,
  כיוון שהן עלולות להיחשב Passive Foreign Investment Company
  ולגרור סיבוכי מס משמעותיים בארה"ב.
```

### 7.3 Architect — שלב 5 (Validation Gate)

אם `validationReport.ucits_advisory` קיים — הצג בלוק אינפורמטיבי **בנוסף** לדו"חות הקיימים (לא מחליף, לא חוסם):

```
ℹ️ הזדמנות לחיסכון במס

ההקצאה שלך כוללת {us_pct}% ETFs אמריקאים. למקצתם יש מקבילות UCITS איריות,
שמובילות ל:
  • ניכוי מס במקור 15% (במקום 30%) על דיבידנדים
  • דחיית מס בישראל (Accumulating)

ETFs שיש להם מקבילה:
  • VT → VWRA
  • VTI → CSPX
  • BND → AGGG / VAGS
  ...

[הצג כל ההצעות]                    [התעלם]
```

**הערות UI:**
- אין כפתור "החלף עכשיו" אוטומטי. המעבר תמיד דרך Architect חדש.
- כותרת קטנה: "אינו ייעוץ מס. בדוק עם רואה חשבון."
- אם המשתמש לחץ "התעלם" → לא מציגים שוב באותו session.

---

## 8. עדכון `scripts/audit_universe.py`

הוסף בדיקה לכל ETF UCITS:
- ודא ש-yfinance מכיר את הטיקר (מתמודד עם שווקים אירופיים)
- ודא ש-`isin` תואם
- אם `ucits: true` ו-`domicile != "IE"` → `WARN`
- אם TER במציאות סוטה ביותר מ-0.05% מהערך ב-YAML → `WARN`

הרצה: `uv run python scripts/audit_universe.py` — כעת מתפקדת על 50+ ETFs במקום 50.

---

## 9. i18n (`he.json` ו-`en.json`)

הוסף את המפתחות הבאים:

```json
{
  "universe": {
    "filter_domicile_all": "הכל",
    "filter_domicile_ucits": "UCITS בלבד",
    "filter_domicile_us": "US בלבד",
    "badge_ucits_acc": "UCITS · Acc",
    "badge_ucits_dist": "UCITS · Dist",
    "badge_us_dist": "US · Dist"
  },
  "settings": {
    "tax_status_section": "מצב מס",
    "us_citizen_label": "אזרח/ית ארה\"ב (PFIC risk)",
    "us_citizen_help": "כשמסומן, המערכת לא תציע מקבילות UCITS איריות בגלל סיכון PFIC."
  },
  "info": {
    "ucits_alternative_available": "ההקצאה שלך כוללת {us_pct}% ETFs אמריקאים. למקצתם יש מקבילות UCITS איריות שיכולות לחסוך במס."
  },
  "architect": {
    "ucits_disclaimer": "מידע זה אינו ייעוץ מס. התייעץ עם רואה חשבון לפני החלטת השקעה.",
    "ucits_show_all": "הצג כל ההצעות",
    "ucits_dismiss": "התעלם"
  }
}
```

ב-`en.json` — מקבילות באנגלית. PFIC נשאר באותיות לטיניות גם בעברית.

---

## 10. בדיקות

### 10.1 Backend (`tests/unit/`)

**`test_universe_service.py`** — הוסף:
- `test_yaml_has_required_ucits_fields` — לכל entry יש domicile, distribution, ucits
- `test_get_ucits_alternatives_for_us_etf` — VT מחזיר [VWRA, CSPX, VHVE]
- `test_get_ucits_alternatives_for_ucits_etf` — VWRA מחזיר []
- `test_blacklist_ucits_consistency` — אין UCITS ב-blacklist בטעות

**`test_architect_service.py`** — הוסף:
- `test_ucits_advisory_when_100pct_us` — מקצה רק VTI+BND → advisory מופיע
- `test_ucits_advisory_blocked_for_us_citizen` — אותו allocation + is_us_citizen=true → None
- `test_ucits_advisory_skipped_when_already_ucits` — מקצה רק VWRA → None
- `test_ucits_advisory_threshold` — 49% US → None; 50% US → advisory
- `test_ucits_advisory_no_blocking` — תיק עם hard cap warning + UCITS advisory → ה-advisory לא משנה את `status`

**`test_settings_service.py`** — הוסף:
- `test_is_us_citizen_default_false`
- `test_is_us_citizen_persists`

### 10.2 Frontend (`tests/unit/`)

**`UniverseBrowser.test.tsx`:**
- `renders UCITS badge for IE-domiciled ETF`
- `filter UCITS-only hides US ETFs`
- `filter US-only hides UCITS ETFs`

**`Settings.test.tsx`:**
- `PFIC checkbox toggles is_us_citizen setting`

**`Architect.test.tsx`:**
- `shows ucits_advisory block when present`
- `does not show ucits_advisory when null`
- `dismiss button hides advisory until next session`

---

## 11. ADR

צור `docs/DECISIONS/ADR-XXX-ucits-support.md` (XXX = המספר הבא ברצף):

```markdown
# ADR-XXX: תמיכה ב-UCITS / Irish-Domiciled ETFs

## Status
Accepted — 2026-XX-XX

## Context
המערכת בנויה למשקיע ישראלי. ETFs אמריקאים סובלים מ-30% ניכוי מס במקור
על דיבידנדים. UCITS אירים סובלים מ-15% בלבד (אמנת US-Ireland) ומאפשרים
דחיית מס בישראל דרך Accumulating share class.

## Decision
- הוספת שדות domicile / distribution / ucits ל-ETF Universe (YAML).
- הוספת ~12 ETFs UCITS מקבילים ל-Universe (לא מחליפים את ה-US).
- Architect מציג notice אינפורמטיבי (לא חוסם) על מעבר אפשרי.
- Setting חדש: is_us_citizen — מבטל את ה-notice (PFIC risk).

## Consequences
- חיובי: יעילות מס טובה יותר למשתמש הישראלי הטיפוסי.
- שלילי: Universe גדל ב-~25%. Audit script ירוץ זמן רב יותר.
- חיובי: לא נדרש שינוי ב-services קיימים מעבר ל-architect_service.

## Alternatives Considered
- שכבת ייעוץ מס דינמית — נדחה. המערכת לא נותנת ייעוץ.
- החלפה אוטומטית של US ל-UCITS — נדחה. סותר עיקרון "המתמטיקה מחליטה,
  לא ה-AI"; וגם לא נכון לאזרחי ארה"ב.
```

---

## 12. סדר Commits מומלץ

עקוב אחרי `<type>(<scope>): <subject>` מ-`DEVELOPER_SETUP.md`:

```
1. feat(universe): add domicile/distribution/ucits fields to ETF schema
2. feat(universe): backfill US-domiciled metadata for existing ETFs
3. feat(universe): add 12 UCITS ETF alternatives to curated universe
4. feat(settings): add is_us_citizen flag for PFIC awareness
5. feat(architect): emit ucits_advisory in validation report
6. feat(frontend): add UCITS badge and filter to Universe Browser
7. feat(frontend): add PFIC checkbox to Settings → General
8. feat(frontend): render ucits_advisory block in Architect step 5
9. feat(i18n): add UCITS-related keys to he.json and en.json
10. test(architect): cover ucits_advisory threshold and PFIC override
11. test(universe): cover ucits alternatives lookup
12. chore(audit): extend audit_universe.py to validate UCITS entries
13. docs(adr): document UCITS support decision
```

---

## 13. PR Checklist

לפני פתיחת PR — הרץ:

```bash
# Backend
cd backend
uv run ruff check .
uv run mypy --strict app/
uv run pytest tests/ -v --cov=app --cov-report=term-missing
uv run python scripts/audit_universe.py     # חייב לעבור ללא ERR

# Frontend
cd ../frontend
npm run lint
npm run typecheck
npm run test -- --run
```

ה-PR description חייב לכלול:
- קישור ל-ADR
- צילום מסך של ה-UCITS badge ב-Universe Browser
- צילום מסך של ה-advisory ב-Architect (לא אזרח ארה"ב)
- צילום מסך של ה-Settings → PFIC checkbox
- אישור: "נבדק שהאזהרה לא חוסמת אישור הקצאה"

---

## 14. שאלות פתוחות (לאשר עם ה-Product לפני התחלה)

1. **Threshold של 50% US-domiciled** — האם זה הסף הנכון, או 80%? פשרה: 50% רגיש מדי במצבי ליבה+אג"ח, אבל 80% לא יתפוס תיקים מעורבים. **המלצה:** התחל ב-50%, אסוף feedback בbeta.

2. **תרגום "PFIC"** בעברית — נשאר באנגלית (זה מונח פיננסי ספציפי) או "השקעה זרה פסיבית"? **המלצה:** PFIC + tooltip עם הסבר.

3. **Distributing UCITS (כמו AGGG, IDTL)** — האם להציג אותם בכלל, אם היתרון העיקרי הוא Accumulating? **המלצה:** כן — היתרון של 15% vs 30% עדיין רלוונטי גם בלי דחיית המס.

4. **REITs UCITS (IPRP)** — חשיפה אירופאית בלבד, לא תחליף 1:1 ל-VNQ. **המלצה:** הוסף עם תיוג מפורש "European REITs" ב-description; אל תציע אוטומטית כמקבילה ל-VNQ.

---

**סיום.** אם משהו לא ברור או דורש החלטה — עצור, שאל, ואל תניח.