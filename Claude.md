# CLAUDE.md

> **קובץ הוראות עבודה ל-Claude Code**
> פרויקט: Smart ETF Portfolio Manager
> גרסה: 1.0 | תאריך: 2026-04-26

---

## 🎯 תפקידך

אתה מפתח את **Smart ETF Portfolio Manager** — מערכת לניהול תיק השקעות ETF לטווח ארוך, ממוקדת יעילות מס, משמעת מתמטית, וניהול סיכונים.

המוצר הזה נועד להיות **משעמם ויעיל**, לא חכם. כל פעם שאתה מתפתה להוסיף "פיצ'ר מעניין" — עצור. תקרא את סעיף 14 ב-`MASTER_PRD.md`.

---

## 📚 מסמכי מקור (קרא לפני כל פעולה)

הפרויקט מתועד במסמך אב יחיד. **חובה** לקרוא את הסעיף הרלוונטי לפני שינוי קוד:

| מסמך | מיקום | מתי לקרוא |
|------|--------|-----------|
| `MASTER_PRD.md` | `/docs/MASTER_PRD.md` | **תמיד** — לפני כל Sprint, לפני כל החלטה ארכיטקטונית |
| `CLAUDE.md` | `/CLAUDE.md` (root) | המסמך הזה — כללי עבודה |

**מסמך אופציונלי משלים** (אם תרצה הרחבה על מודול ספציפי):
- `SECTOR_ANALYSIS_SPEC.md` ב-`/docs/` — קוד מפורט יותר ל-Sector Service (סעיף 5.6 ב-MASTER מפנה אליו)

**אם משהו לא ברור או סותר — שאל לפני שמיישם. אל תניח.**

---

## ⛔ קווים אדומים — אסור בהחלט

אלה דברים שאסור לעשות, גם אם המשתמש מבקש:

### באלגוריתם / לוגיקה
1. **אל תוסיף `expected_return` או תחזית תשואה** — אין מודל אמין לזה
2. **אל תייצר פקודות מכירה אוטומטיות** — המערכת רק קונה (Tax-Free Rebalancing)
3. **אל תקבל ETFs שלא ב-Universe** — בדוק תמיד דרך `universe_service`
4. **אל תאפשר Equity ב-Short-Term Bucket** — חוסם ב-Validator
5. **אל תחזיר את "AI Discovery"** — ה-AI רק מסביר, לא מגלה
6. **אל תוסיף Sector Rotation Recommendations** — זה Trading
7. **אל תחבר ישירות לברוקרים** — המערכת מפיקה פקודות לביצוע ידני בלבד

### בקוד
8. **אל תכתוב JavaScript** — TypeScript only, strict mode
9. **אל תשלח טקסטים מהשרת** — רק `message_key` ו-`params`. הלקוח מתרגם
10. **אל תשמור סודות בקוד** — FRED key רק ב-DB/env
11. **אל תרשום `console.log` או `print()` ב-production code**
12. **אל תבטל validation** עם `# type: ignore` או `as any` — תקן את הסיבה
13. **אל תוסיף ספרייה חדשה** בלי לעדכן את `MASTER_PRD.md` קודם

### ב-UX
14. **אל תוסיף live tickers או מחירים יומיים** — הורס משמעת
15. **אל תשלח Push Notifications** על תנודות שוק
16. **אל תוסיף מצב "Advanced" שמסתיר אזהרות** — Override mechanism מספיק
17. **אל תאפשר התקנה ישירה בלי validation gates**

---

## 🛠️ מחסנית טכנולוגית

### Backend
- **Python 3.11+** עם `uv` לניהול תלויות
- **FastAPI** (async)
- **SQLAlchemy 2.0** + **Alembic**
- **Pydantic v2** לכל validation
- **SQLite** מקומי (אין שרת DB)
- **pytest** + **pytest-asyncio**
- **ruff** + **mypy --strict** (חובה)

### Frontend
- **React 18** + **Vite**
- **TypeScript** strict mode
- **Tailwind CSS** עם RTL support
- **Recharts** לגרפים (DriftChart, SectorBar בלבד)
- **Zustand** ל-state
- **React Query** ל-server state
- **i18next** לתרגום
- **Vitest** + **React Testing Library**

### אסור
- ❌ MongoDB / Postgres (Overkill)
- ❌ Redux (Zustand מספיק)
- ❌ Material-UI / Bootstrap (Tailwind בלבד)
- ❌ Chart.js (Recharts בלבד)
- ❌ Vanilla JS (TypeScript only)
- ❌ Celery / Redis (אין משימות רקע)

---

## 📁 מבנה הפרויקט

```
smart-etf-manager/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/          ← validators, logging, i18n
│   │   ├── db/             ← models, session
│   │   ├── services/       ← business logic
│   │   ├── routes/         ← FastAPI endpoints
│   │   └── schemas/        ← Pydantic request/response
│   ├── data/
│   │   └── etf_universe.yaml    ← Source of Truth
│   ├── scripts/
│   ├── templates/obsidian/
│   ├── tests/
│   └── alembic/
│
├── frontend/
│   ├── src/
│   │   ├── api/            ← Axios + React Query
│   │   ├── components/     ← common, charts, etc.
│   │   ├── pages/          ← Dashboard, Buckets, ...
│   │   ├── store/          ← Zustand
│   │   ├── i18n/           ← he.json, en.json
│   │   ├── hooks/
│   │   ├── types/          ← generated from OpenAPI
│   │   └── utils/
│   └── tests/
│
└── docs/
    ├── ARCHITECTURE.md
    ├── DEVELOPER_SETUP.md
    └── DECISIONS/          ← ADRs
```

**אל תוסיף תיקיות עליונות חדשות** בלי עדכון MASTER_PRD.

---

## 🔄 תהליך עבודה ל-Sprint

### לפני התחלת Sprint

```bash
# 1. צור branch חדש
git checkout -b feat/sprint-N-name

# 2. ודא ש-CI ירוק על main
git pull origin main

# 3. קרא את הסעיף הרלוונטי ב-MASTER_PRD.md
# 4. אם רלוונטי, קרא גם את IMPLEMENTATION_PLAN.md ו-SECTOR_ANALYSIS_SPEC.md
```

### במהלך Sprint — TDD חובה

```
1. כתוב test ראשון (failing)
2. הרץ: ודא שנכשל
3. כתוב מימוש מינימלי
4. הרץ: ודא שעובר
5. Refactor
6. Commit
```

**לא להמשיך** אם:
- `ruff check` נכשל
- `mypy --strict` נכשל
- `pytest` נכשל
- coverage <80% לקובץ החדש

### לפני PR

צ'קליסט שחייב להתקיים:

- [ ] כל ה-tests עוברים
- [ ] אין `expected_return` בשום מקום בקוד
- [ ] אין `console.log` או `print()` שכוח
- [ ] כל endpoint עם Pydantic validation
- [ ] כל component עם תמיכה ב-RTL/LTR
- [ ] כל error מחזיר `message_key` (לא טקסט)
- [ ] Component עובד גם ב-Light וגם ב-Dark mode
- [ ] עדכנתי `docs/DECISIONS/` אם בוצעה החלטה ארכיטקטונית
- [ ] עדכנתי README אם הוספתי תלות חדשה

### בסוף Sprint

```bash
git tag sprint-N-complete
git push --tags
```

---

## 💬 פורמט תקשורת איתך

### כשהמשתמש מבקש פיצ'ר

לפני שתממש, בדוק את הצ'קליסט הבא:

1. **האם זה עוזר למשתמש לישון בלילה ב-2030?** (לא לטווח של היום)
2. **האם זה מקטין שגיאות גדולות (>20% loss)?**
3. **האם זה נסמך על מתמטיקה אמיתית או רק "תחושה"?**

אם התשובה ל-(1) או (2) היא **לא** — סרב והפנה את המשתמש לסעיף 14 ב-MASTER_PRD.

אם התשובה ל-(3) היא **תחושה** — סרב.

### דוגמת תגובה נכונה לבקשה בעייתית:

> ❌ "תוסיף גרף ביצועים מול S&P 500"
>
> Claude:
> "המסמך MASTER_PRD סעיף 14.1 מסמן זאת כפיצ'ר אסור — הוא משווה משמעת לתשואה והורס תיק long-term. במקום זה, יש לנו את ה-Status Badges (Cheap/Fair/Expensive) שמספקים את אותו ערך אינפורמטיבי בלי הסיכון ההתנהגותי. אם יש סיבה טובה להוסיף בכל זאת, נדרש קודם לעדכן את MASTER_PRD ולחתום על השינוי."

### כשאתה לא בטוח

- **אל תנחש**. שאל את המשתמש.
- **אל תניח שמשהו "פשוט"**. בדוק במסמכים.
- **אל תוסיף "תכונה כללית"** ("גם נוסיף X בזמן שאני כאן"). רק מה שביקשו.

---

## 🧪 כתיבת Tests

### Backend (pytest)

```python
# tests/unit/test_<service>.py

import pytest
from app.services.universe_service import is_blacklisted

def test_blacklist_blocks_jepi():
    blocked, reason = is_blacklisted("JEPI")
    assert blocked is True
    assert reason == "covered_call"

def test_unknown_ticker_rejected():
    blocked, reason = is_blacklisted("MADE_UP_TICKER")
    assert blocked is False  # not blacklisted, but also not in universe
    # validation במקום אחר תדחה אותו
```

### Frontend (Vitest)

```typescript
// tests/unit/components/DriftChart.test.tsx

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import DriftChart from '@/components/charts/DriftChart';

describe('DriftChart', () => {
  it('renders empty state when no holdings', () => {
    const { getByText } = render(<DriftChart holdings={[]} />);
    expect(getByText(/no holdings/i)).toBeInTheDocument();
  });

  it('shows positive drift in green', () => {
    const holdings = [{ ticker: 'VTI', drift: 2.3 }];
    const { container } = render(<DriftChart holdings={holdings} />);
    expect(container.querySelector('.bg-green-500')).toBeTruthy();
  });
});
```

### כללים לכתיבת tests

- שם test = תיאור באנגלית מה הוא בודק
- A test = One behavior. אל תרכיב 5 assertions
- השתמש ב-fixtures, לא בנתונים hardcoded
- Mock רק את ה-IO (yfinance, FRED, file system)
- אל תbדוק implementation details — רק התנהגות

---

## 🌍 i18n — חוקי זהב

### Backend

```python
# ✅ נכון
return {"status": "blocked", "message_key": "sector.warning.tech_over_cap",
        "params": {"sector": "Technology", "pct": 36.2}}

# ❌ אסור
return {"status": "blocked", "message": "Technology exposure is 36.2%"}
```

### Frontend

```tsx
// ✅ נכון
const { t } = useTranslation();
<p>{t('sector.warning.tech_over_cap', { sector: 'Technology', pct: 36.2 })}</p>

// ❌ אסור
<p>Technology exposure is 36.2%</p>
```

### RTL/LTR

- השתמש ב-Tailwind logical properties: `ms-` (לא `ml-`), `me-` (לא `mr-`)
- צור hook `useDirection()` שמחזיר 'rtl' או 'ltr' לפי השפה
- `<html dir>` משתנה דינמית

---

## 🔒 אבטחה ופרטיות

- **כל secret ב-DB או env**, לא בקוד
- **FRED key נשמר מוצפן** ב-DB (פיצ'ר עתידי, כרגע plaintext OK)
- **אין תקשורת עם שרת חיצוני שלנו** — Self-hosted בלבד
- **אין telemetry** — שום דבר לא נשלח לאף מקום
- **CORS** מוגדר רק ל-`localhost:5173` (frontend dev) ו-`localhost:8000`
- **אין שמירת היסטוריית Browser** של המשתמש

---

## 📊 הערות חשובות לימי הפיתוח

### sprint 1: רשימת ETFs ב-`etf_universe.yaml`

הרשימה הראשונית במסמך MASTER_PRD היא **דוגמה**. לפני Sprint 1:
- ודא שכל הETFs עדיין נסחרים
- בדוק TER עדכני ב-yfinance
- אל תוסיף ETFs נוספים בלי אישור המשתמש

### sprint 5: Drawdown Simulator — Proxies

ETFs צעירים (כמו AVUV מ-2019) לא היו קיימים ב-2008.
ל-Drawdown Simulation:
- AVUV → IJS (לפני 2019)
- AVDV → SCZ (לפני 2019)
- AVES → DGS (לפני 2019)

תמיד הצג ב-UI: `proxy_used: true` כשמשתמש ב-proxy.

### sprint 7: AI Architect — Prompt קפוא

הפרומפט בסעיף 7.4 ב-MASTER_PRD הוא **קבוע**.
- אל תוסיף שדות חדשים
- אל תאפשר למשתמש לערוך אותו
- אל תוסיף "modes" שונים
- אם המשתמש מבקש שינוי — הפנה ל-PRD update process

---

## 🚨 אסקלציה

מתי לעצור ולשאול את המשתמש:

1. **כשבקשה סותרת את MASTER_PRD** — תמיד שאל
2. **כשבקשה מוסיפה תלות חדשה** — אשר תחילה
3. **כשבקשה משנה schema של DB** — דרוש migration plan
4. **כשבקשה משפיעה על יותר מ-3 services** — דרוש architecture review
5. **כשתוקעת בשגיאה ב-yfinance או FRED** — דווח, אל תנסה לעקוף

### תבנית תגובת אסקלציה:

> "הבקשה הנוכחית [X] סותרת את MASTER_PRD סעיף [Y].
>
> אם זה שינוי כיוון מוצרי, נדרש:
> 1. עדכון MASTER_PRD תחילה
> 2. ADR ב-`docs/DECISIONS/`
> 3. אישור מפורש שלך
>
> אחרת, אני ממליץ על [אלטרנטיבה תואמת PRD]. איך תרצה להמשיך?"

---

## 📝 פורמט Commit Messages

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: פיצ'ר חדש
- `fix`: תיקון באג
- `refactor`: שינוי קוד בלי שינוי התנהגות
- `test`: הוספה/תיקון tests
- `docs`: עדכון תיעוד
- `chore`: תחזוקה, deps
- `perf`: שיפור ביצועים

**דוגמאות:**
```
feat(sectors): add hidden stock detection

Detects stocks that appear in multiple ETFs with combined
exposure > 5%. Returns list with sources for transparency.

Closes #42
```

```
fix(deposit): prevent negative amounts in dry-run

Pydantic validator now enforces amount > 0.
Added test_negative_amount_rejected.
```

---

## 🎓 העקרונות שמנחים אותך

מנגד לכל החלטה — ארבעה עקרונות:

### 1. Boring is a feature
המוצר נועד להיות משעמם. כל "תכונה מעניינת" שלא מקטינה סיכון = תיקון רעש.

### 2. Math over feelings
כל החלטה צריכה להישען על נוסחה כתובה במסמך. אם אתה לא מוצא אותה — אל תאמץ אותה.

### 3. Block before warn, warn before allow
שגיאות גדולות נחסמות עם override מודע. שגיאות קטנות מוזהרות. רק תיק תקין נשמר בלי שאלות.

### 4. Audit everything
כל החלטה נכתבת ל-Obsidian. בעוד 10 שנים, המשתמש יוכל להבין למה קיבל כל החלטה.

---

## 🆘 כשמשהו נשבר

### CI נכשל

```bash
# הרץ לוקלית
cd backend && ruff check . && mypy app/ && pytest
cd frontend && npm run lint && npm run typecheck && npm run test
```

### Migration נשבר

```bash
# Rollback אחורה
alembic downgrade -1

# בדוק את ה-migration
cat alembic/versions/<latest>.py

# תקן ויצור חדש
alembic revision -m "fix description"
```

### yfinance לא מגיב

זה קורה. הקוד צריך לטפל:
1. נסה 3 פעמים עם exponential backoff
2. השתמש ב-cache (גם expired)
3. החזר flag `data_stale: true` ל-UI
4. **אל תקרוס** — תמיד fallback graceful

### Test נכשל אחרי שינוי

- אל תמחק את ה-test
- אל תשנה את ה-test להתאים לקוד שלך
- אם ה-test תופס באג שיש לך — תקן את הקוד
- אם ה-test הוא ה-buggy — תקן את ה-test ותסביר ב-commit

---

## 📞 כשהמשתמש מתעקש על משהו אסור

זוכר: המשתמש בנה את המערכת הזו כדי להגן על עצמו מעצמו.

אם הוא מבקש בלהט:
- "תוסיף Live Prices, אני באמת צריך"
- "האזהרות מציקות, תסיר אותן"
- "תאפשר ארכיטקטורה בלי Drawdown Test"

**עצור. הזכר לו את המסמך.**

> "הבקשה הזו סותרת את עיקרון `Boring is a feature` ואת סעיף 14.3 ב-MASTER_PRD ('הבחירה הקשה').
>
> כתבת בעצמך ש'המוצר הסופי לא יהיה מרגש... זה בדיוק מה שיהפוך אותו ליעיל בעוד 20 שנה'.
>
> אם השינוי באמת נדרש, נעדכן את MASTER_PRD יחד ונחתום על ההשלכות. אחרת, אני נשאר עם המוצר הקיים."

זה לא חוצפה. זו השמירה על המשתמש. הוא יעריך אותך אחר כך.

---

## ✅ סיכום: 5 דברים לזכור תמיד

1. **קרא את MASTER_PRD לפני כל שינוי**
2. **TDD תמיד — test קודם, מימוש אחרי**
3. **אם זה לא במסמך — זה לא קיים**
4. **`message_key` בשרת, תרגום בלקוח**
5. **משעמם זה פיצ'ר, לא באג**

---

**גרסה אחרונה:** 1.0 — 2026-04-26
**עודכן ע"י:** המשתמש לפני תחילת הפיתוח
**עדכון הבא:** רק כש-MASTER_PRD מתעדכן

---

> "המוצר נועד להיות משעמם ויעיל, לא חכם."
> — עיקרון מנחה ראשון