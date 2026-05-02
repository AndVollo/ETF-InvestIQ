# ADR-001: תמיכה ב-UCITS / Irish-Domiciled ETFs

## Status
Accepted — 2026-05-02

## Context

המערכת בנויה למשקיע ישראלי. ETFs אמריקאים סובלים מ-30% ניכוי מס במקור על דיבידנדים
המופנים למשקיע ישראלי. UCITS אירים סובלים מ-15% בלבד (אמנת המס US-Ireland) ומאפשרים
דחיית מס בישראל דרך share class מסוג Accumulating.

הפיצ'ר מתבקש מתוך עיקרון "Math over feelings" שב-MASTER_PRD §1.2 — ההבדל ביעילות המס
מדיד וגדול (15 נקודות אחוז על דיבידנדים), ולכן ראוי לחשיפה למשתמש. מנגד, סעיף 1.3
מחייב את המערכת לא לתת ייעוץ מס, ולכן הוצאת ההצעה כ-advisory בלבד, ללא חסימה.

## Decision

1. **YAML schema** — להוסיף לכל entry ב-`backend/data/etf_universe.yaml` את השדות:
   - `domicile`: `US | IE | LU` (חובה)
   - `distribution`: `Distributing | Accumulating` (חובה)
   - `ucits`: `bool` (חובה)
   - `isin`: `string | null` (אופציונלי)

2. **Universe** — להוסיף 12 UCITS ETFs מקבילים, מבלי להחליף ETFs קיימים.
   רשימה: VWRA, CSPX, VHVE, VFEA, EIMI, ZPRV, WSML, AGGG, VAGS, IDTL, SGLN, IPRP.

3. **Architect** — `ingest_allocation` מחזיר `ucits_advisory` לא-חוסם כאשר:
   - המשתמש לא הוגדר כאזרח ארה"ב (PFIC risk)
   - לפחות 50% מההקצאה היא US-domiciled
   - לפחות ETF אחד מההקצאה יש לו מקבילה UCITS באותו bucket

4. **Settings** — מפתח `is_us_citizen` (default `False`) ב-`app_settings`. מסומן ב-UI
   ב-Settings → General → "מצב מס", עם הסבר על PFIC.

5. **UI** — Universe Browser מציג Badge `🇮🇪 UCITS · Acc/Dist` או `🇺🇸 US · Dist`
   לכל שורה, ומאפשר פילטר `הכל / UCITS בלבד / US בלבד` (שמור ב-Zustand).
   Architect שלב 5 מציג בלוק ירקרק עם ההצעות, פטור הסבר ("אינו ייעוץ מס"),
   וכפתור "התעלם" שמסתיר עד session הבא.

## Consequences

**חיובי:**
- יעילות מס טובה יותר למשתמש הישראלי הטיפוסי (חיסכון משוער 15% על תזרים דיבידנדים).
- שדה `domicile` מאפשר בעתיד הרחבות (Luxembourg, accumulating share classes).
- אין שינוי בעקרונות יסוד או באלגוריתמים קיימים (Smart Deposit, Drawdown, Sectors).

**שלילי:**
- Universe גדל מ-50 ל-62 ETFs (+24%). זמן ריצה של `audit_universe.py` ושל
  `scoring_service` עולה פרופורציונלית; עדיין שניות בודדות.
- חלק מה-UCITS (במיוחד WSML, IPRP) הם לא תחליפים 1:1 ל-US peers שלהם — רק חשיפה דומה.

**מנוטרל:**
- PFIC risk לאזרחי ארה"ב: ה-flag `is_us_citizen` חוסם את ה-advisory לחלוטין.
- אין החלפה אוטומטית; המשתמש מבצע הקצאה חדשה דרך Architect, עם אותם validation gates.

## Alternatives Considered

1. **שכבת ייעוץ מס דינמית** (חישוב חיסכון בשקלים, השוואה לפרופיל המשתמש) — נדחה.
   המערכת לא נותנת ייעוץ מס; ראה MASTER_PRD §1.3.

2. **החלפה אוטומטית של US ל-UCITS** ב-Smart Deposit — נדחה. סותר את עיקרון
   "Block before warn, warn before allow" — שינוי domicile הוא החלטה אסטרטגית
   שדורשת שיקול דעת אנושי, לא אופטימיזציה אוטומטית.

3. **שינוי הסף מ-50% ל-80%** — נשמר ב-50% עם תיעוד שניתן לשנות אחרי beta feedback.
   80% היה מחמיץ תיקים מעורבים שעדיין כבדים בארה"ב.

## References

- MASTER_PRD §1.2 (Math over feelings), §1.3 (no tax advice)
- `docs/Ucits implementation.md` — מסמך הספציפיקציה המקורי
- IRS Form 8621 (PFIC) — הסיבה ל-`is_us_citizen` opt-out
