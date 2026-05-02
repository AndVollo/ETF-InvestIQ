/* global React */
const { useState, useMemo, useEffect, createContext, useContext } = React;

// =============================================================================
// i18n
// =============================================================================
const TRANSLATIONS = {
  en: {
    nav: {
      dashboard: "Dashboard",
      buckets: "Buckets",
      deposit: "Smart Deposit",
      universe: "Universe",
      architect: "Architect",
      sectors: "Sectors",
      drawdown: "Drawdown",
      audit: "Audit Trail",
      settings: "Settings",
      portfolio: "Portfolio",
      tools: "Analysis",
      system: "System",
    },
    settings: {
      title: "Settings",
      subtitle: "System view configuration. Changes apply immediately and persist across sessions.",
      tabAppearance: "Appearance",
      tabLocale: "Locale & Region",
      tabLayout: "Layout & Density",
      tabPortfolio: "Portfolio",
      tabCharts: "Charts",
      tabAdvanced: "Advanced",
      theme: "Theme",
      themeNote: "Dark theme is recommended for long sessions.",
      accent: "Accent color",
      accentNote: "Used for primary actions, active states, and emphasized data.",
      density: "Display density",
      densityNote: "Compact reduces row heights and padding for power users.",
      language: "Language",
      languageNote: "Interface language. Hebrew flips layout to right-to-left.",
      direction: "Text direction",
      currency: "Default currency",
      numberFormat: "Number format",
      sidebar: "Sidebar",
      sidebarCollapsed: "Start with sidebar collapsed",
      sidebarNote: "Frees horizontal space on smaller displays.",
      valuation: "Show valuation badges",
      valuationNote: "Display Cheap / Fair / Expensive z-score badges throughout the app.",
      activeBucket: "Active bucket",
      activeBucketNote: "Dashboard and Smart Deposit default to this bucket on open.",
      driftVariant: "Drift chart style",
      driftVariantNote: "How allocation drift is visualized on the dashboard.",
      reset: "Reset to defaults",
      saved: "Saved",
      savedNote: "Preferences are stored locally.",
      diverging: "Diverging bars",
      divergingNote: "Centered axis, shows direction and magnitude of drift.",
      tick: "Target tick",
      tickNote: "Linear bar with target marker. Compact.",
      stacked: "Stacked compare",
      stackedNote: "Current vs target on parallel bars. Detailed.",
    },
    bucket: {
      label: "Active bucket",
      shortTerm: "Short-Term",
      mediumTerm: "Medium-Term",
      longTerm: "Long-Term",
      retirement: "Retirement 2050",
      education: "Education 2035",
      downpayment: "Down Payment 2028",
    },
    dashboard: {
      portfolioValue: "Portfolio value",
      totalReturn: "Total return",
      goalProgress: "Progress to goal",
      cashYield: "Forward yield",
      since: "since Jan 2024",
      target: "Target",
      driftTitle: "Allocation drift",
      driftSubtitle: "Current weight vs. target. The next deposit fills underweights first.",
      valuationTitle: "Valuation status",
      valuationSubtitle: "Z-score over 3y rolling history. Reference, not signal.",
      sectorTitle: "Sector exposure",
      sectorSubtitle: "Effective exposure across holdings. Diversification 76/100.",
      reminderTitle: "Next deposit scheduled",
      reminderDate: "May 7, 2026 · in 5 days",
      viewAll: "View all",
    },
    valuation: {
      cheap: "Cheap",
      fair: "Fair",
      expensive: "Expensive",
      insufficient: "Insufficient history",
    },
    deposit: {
      title: "Smart Deposit",
      subtitle: "Tax-free rebalancing through new contributions only. No sells, ever.",
      bucket: "Bucket",
      amount: "Amount",
      currency: "Currency",
      fxRate: "FX rate",
      fxNote: "1 USD = 3.62 ILS · FRED, updated 14:32 UTC",
      calculate: "Calculate plan",
      planTitle: "Purchase plan (dry-run)",
      planSubtitle: "Orders prioritize the most underweight holdings first.",
      buy: "Buy",
      units: "units",
      at: "@",
      total: "Total",
      remainder: "Remainder",
      remainderNote: "below $50 minimum threshold",
      sectorImpact: "Projected sector impact",
      noChange: "no change",
      writeNote: "On confirmation, this deposit is logged to the audit trail and Obsidian vault.",
      back: "Back to edit",
      confirm: "Confirm and write",
    },
    architect: {
      title: "Portfolio Architect",
      subtitle: "Build a goal-anchored allocation. Math decides, AI explains.",
      step1: "Bucket",
      step2: "Categories",
      step3: "Shortlist",
      step4: "Allocation",
      step5: "Validate",
      step6: "Confirm",
      goalLabel: "Choose target bucket",
      categories: "Universe categories",
      categoriesNote: "Pick which buckets to draw from. Short-Term buckets are restricted to ultra-short bonds.",
      shortlistTitle: "Top-scored ETFs per category",
      shortlistNote: "Composite score weighs cost (35%), Sharpe 3y (25%), tracking error (20%), liquidity (20%).",
      allocateTitle: "Set target allocation",
      allocateNote: "Allocations must sum to 100.0%.",
      sum: "Sum",
      validateTitle: "Validation gate",
      validateNote: "Sector caps and drawdown stress test must pass before confirm.",
      sectorCheck: "Sector caps",
      drawdownCheck: "Drawdown stress",
      pass: "Pass",
      review: "Review",
      next: "Next",
      previous: "Previous",
      askAI: "Request AI proposal",
    },
    sectors: {
      title: "Sector Analysis",
      subtitle: "Effective exposure (sector weight × ETF weight) across the bucket.",
      diversification: "Diversification score",
      hidden: "Concentrated stock exposure",
      hiddenNote: "Same names appear in multiple ETFs. Top single-stock concentrations:",
      cap: "Cap",
      soft: "Soft",
      hard: "Hard",
    },
    drawdown: {
      title: "Drawdown Test",
      subtitle: "Historical stress test. What this allocation would have lost in past crises.",
      simulate: "Run simulation",
      worstCase: "Worst case",
      worstCaseNote: "Across the four scenarios below.",
      recovery: "Recovery",
      months: "months",
      proxy: "proxy used",
      reflectionTitle: "The question worth asking",
      reflectionBody: "Could you sleep at night if your portfolio fell by this amount? If not, increase your bond allocation before continuing.",
      scenario_dotcom: "Dot-com crash",
      scenario_gfc: "Global Financial Crisis",
      scenario_covid: "COVID crash",
      scenario_2022: "2022 rate hikes",
    },
    common: {
      cancel: "Cancel",
      save: "Save",
      confirm: "Confirm",
      edit: "Edit",
      tnumNote: "All numbers tabular-aligned",
    },
  },
  he: {
    nav: {
      dashboard: "דשבורד",
      buckets: "סלים",
      deposit: "הפקדה חכמה",
      universe: "מאגר ETF",
      architect: "ארכיטקט",
      sectors: "ניתוח סקטורים",
      drawdown: "סימולציית מפולת",
      audit: "יומן החלטות",
      settings: "הגדרות",
      portfolio: "תיק",
      tools: "ניתוח",
      system: "מערכת",
    },
    settings: {
      title: "הגדרות",
      subtitle: "תצורת תצוגת מערכת. שינויים נשמרים אוטומטית.",
      tabAppearance: "מראה",
      tabLocale: "שפה ואזור",
      tabLayout: "פריסה וצפיפות",
      tabPortfolio: "תיק",
      tabCharts: "תרשימים",
      tabAdvanced: "מתקדם",
      theme: "ערכת נושא",
      themeNote: "ערכה כהה מומלצת לשעות עבודה ארוכות.",
      accent: "צבע משני",
      accentNote: "משמש לפעולות ראשיות, מצבים פעילים והדגשת נתונים.",
      density: "צפיפות תצוגה",
      densityNote: "תצוגה צפופה מקטינה רווחים — מתאים למשתמשים מנוסים.",
      language: "שפה",
      languageNote: "שפת הממשק. עברית מחליפה את כיוון הפריסה ל-RTL.",
      direction: "כיוון טקסט",
      currency: "מטבע ברירת מחדל",
      numberFormat: "פורמט מספרים",
      sidebar: "סרגל צד",
      sidebarCollapsed: "פתח עם סרגל צד מצומצם",
      sidebarNote: "מפנה מקום אופקי במסכים קטנים.",
      valuation: "הצג תגי ולואציה",
      valuationNote: "הצג תגי Z-Score (זול / הוגן / יקר) ברחבי האפליקציה.",
      activeBucket: "סל פעיל",
      activeBucketNote: "דשבורד והפקדה חכמה ייפתחו על הסל הזה.",
      driftVariant: "סגנון תרשים סטייה",
      driftVariantNote: "אופן הצגת סטיות ההקצאה בדשבורד.",
      reset: "איפוס לברירת מחדל",
      saved: "נשמר",
      savedNote: "ההעדפות נשמרות מקומית.",
      diverging: "פסים מתפצלים",
      divergingNote: "ציר ממורכז, מציג כיוון ועוצמה של הסטייה.",
      tick: "סמן יעד",
      tickNote: "פס לינארי עם סמן יעד. קומפקטי.",
      stacked: "השוואה מערומה",
      stackedNote: "נוכחי מול יעד על פסים מקבילים. מפורט.",
    },
    bucket: {
      label: "סל פעיל",
      shortTerm: "טווח קצר",
      mediumTerm: "טווח בינוני",
      longTerm: "טווח ארוך",
      retirement: "פרישה 2050",
      education: "השכלה 2035",
      downpayment: "מקדמה לדירה 2028",
    },
    dashboard: {
      portfolioValue: "שווי תיק",
      totalReturn: "תשואה כוללת",
      goalProgress: "התקדמות ליעד",
      cashYield: "תשואת דיבידנד",
      since: "מאז ינואר 2024",
      target: "יעד",
      driftTitle: "סטייה מההקצאה",
      driftSubtitle: "משקל נוכחי מול יעד. הפקדה הבאה ממלאת חסרים תחילה.",
      valuationTitle: "סטטוס ולואציה",
      valuationSubtitle: "Z-Score על היסטוריית 3 שנים. התייחסות, לא איתות.",
      sectorTitle: "חשיפה סקטוריאלית",
      sectorSubtitle: "חשיפה אפקטיבית לרוחב התיק. ציון גיוון 76/100.",
      reminderTitle: "הפקדה הבאה מתוכננת",
      reminderDate: "7 במאי 2026 · עוד 5 ימים",
      viewAll: "הצג הכל",
    },
    valuation: {
      cheap: "זול",
      fair: "הוגן",
      expensive: "יקר",
      insufficient: "היסטוריה לא מספקת",
    },
    deposit: {
      title: "הפקדה חכמה",
      subtitle: "איזון תיק ללא מס דרך הפקדות חדשות בלבד. אף פעם לא מוכרים.",
      bucket: "סל",
      amount: "סכום",
      currency: "מטבע",
      fxRate: "שער חליפין",
      fxNote: "1 USD = 3.62 ILS · FRED, עודכן 14:32 UTC",
      calculate: "חשב תוכנית",
      planTitle: "תוכנית רכישה (Dry-Run)",
      planSubtitle: "הפקודות מתעדפות את האחזקות עם החסר הגדול ביותר.",
      buy: "קנה",
      units: "יחידות",
      at: "@",
      total: "סך הכל",
      remainder: "יתרה",
      remainderNote: "מתחת לסף של $50",
      sectorImpact: "השפעה צפויה על הסקטורים",
      noChange: "ללא שינוי",
      writeNote: "באישור, ההפקדה נכתבת ליומן ולכספת Obsidian.",
      back: "חזור לעריכה",
      confirm: "אשר וכתוב",
    },
    architect: {
      title: "ארכיטקט תיק",
      subtitle: "בנה הקצאה ממוקדת יעד. המתמטיקה מחליטה, ה-AI מסביר.",
      step1: "סל",
      step2: "קטגוריות",
      step3: "שורטליסט",
      step4: "הקצאה",
      step5: "אימות",
      step6: "אישור",
      goalLabel: "בחר סל יעד",
      categories: "קטגוריות מהמאגר",
      categoriesNote: "בחר מאלו סלים ייבחרו ETFs. סל קצר-טווח חסום למניות.",
      shortlistTitle: "ETFs המובילים בכל קטגוריה",
      shortlistNote: "ציון משוקלל: עלות (35%), Sharpe 3 שנים (25%), Tracking Error (20%), נזילות (20%).",
      allocateTitle: "הגדר אחוזי הקצאה",
      allocateNote: "סכום ההקצאות חייב להיות 100.0%.",
      sum: "סך",
      validateTitle: "שער אימות",
      validateNote: "מגבלות סקטור וסימולציית מפולת חייבות לעבור לפני אישור.",
      sectorCheck: "מגבלות סקטור",
      drawdownCheck: "Drawdown",
      pass: "עובר",
      review: "בדיקה",
      next: "הבא",
      previous: "הקודם",
      askAI: "בקש הצעת AI",
    },
    sectors: {
      title: "ניתוח סקטורים",
      subtitle: "חשיפה אפקטיבית (משקל סקטור × משקל ETF) לרוחב הסל.",
      diversification: "ציון גיוון",
      hidden: "חשיפה מרוכזת למניות",
      hiddenNote: "אותן מניות מופיעות במספר ETFs. הריכוזים הגדולים ביותר:",
      cap: "תקרה",
      soft: "רכה",
      hard: "קשיחה",
    },
    drawdown: {
      title: "סימולציית מפולת",
      subtitle: "מבחן עקה היסטורי. כמה ההקצאה הזו הייתה מפסידה במשברים בעבר.",
      simulate: "הרץ סימולציה",
      worstCase: "הגרוע ביותר",
      worstCaseNote: "על פני ארבעת התרחישים.",
      recovery: "התאוששות",
      months: "חודשים",
      proxy: "Proxy בשימוש",
      reflectionTitle: "השאלה ששווה לשאול",
      reflectionBody: "האם תוכל לישון בלילה אם תפסיד את הסכום הזה? אם לא — הגדל את אחוז האג\"ח לפני שתמשיך.",
      scenario_dotcom: "התפוצצות בועת הדוט-קום",
      scenario_gfc: "המשבר הפיננסי הגלובלי",
      scenario_covid: "מפולת הקורונה",
      scenario_2022: "עליית ריבית 2022",
    },
    common: {
      cancel: "בטל",
      save: "שמור",
      confirm: "אשר",
      edit: "ערוך",
      tnumNote: "כל המספרים מיושרים בטור",
    },
  },
};

const I18nContext = createContext({ lang: "en", t: (k) => k });
const useI18n = () => useContext(I18nContext);

function tFor(lang) {
  return (path, params) => {
    const parts = path.split(".");
    let cur = TRANSLATIONS[lang];
    for (const p of parts) cur = cur?.[p];
    if (typeof cur !== "string") return path;
    if (params) {
      return cur.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? "");
    }
    return cur;
  };
}

// =============================================================================
// Number / currency helpers
// =============================================================================
function fmtCurrency(value, currency = "USD", lang = "en") {
  const locale = lang === "he" ? "he-IL" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
function fmtPct(value, digits = 1, lang = "en") {
  const locale = lang === "he" ? "he-IL" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value / 100);
}
function fmtNum(value, digits = 0, lang = "en") {
  const locale = lang === "he" ? "he-IL" : "en-US";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
function signedPct(value, digits = 1, lang = "en") {
  const sign = value > 0 ? "+" : "";
  return sign + fmtPct(value, digits, lang);
}

// =============================================================================
// Mock data
// =============================================================================
const HOLDINGS = [
  { ticker: "VTI", name: "Vanguard Total Stock Market", target: 40, current: 42.3, valuation: "fair", z: -0.2, ter: 0.03 },
  { ticker: "VXUS", name: "Vanguard Total Intl Stock", target: 25, current: 21.9, valuation: "cheap", z: -1.7, ter: 0.05 },
  { ticker: "AVUV", name: "Avantis US Small Cap Value", target: 10, current: 9.6, valuation: "fair", z: -0.4, ter: 0.25 },
  { ticker: "BND", name: "Vanguard Total Bond Market", target: 20, current: 21.2, valuation: "expensive", z: 1.8, ter: 0.03 },
  { ticker: "VNQ", name: "Vanguard Real Estate", target: 5, current: 5.0, valuation: "fair", z: 0.1, ter: 0.13 },
];

const SECTORS = [
  { name: "Technology", pct: 24.1, soft: 30, hard: 35 },
  { name: "Financials", pct: 17.0, soft: 22, hard: 28 },
  { name: "Healthcare", pct: 12.4, soft: 20, hard: 25 },
  { name: "Consumer Disc.", pct: 10.8, soft: 18, hard: 22 },
  { name: "Industrials", pct: 9.6, soft: 18, hard: 22 },
  { name: "Comm. Services", pct: 7.9, soft: 15, hard: 20 },
  { name: "Consumer Staples", pct: 5.7, soft: 15, hard: 20 },
  { name: "Energy", pct: 4.2, soft: 12, hard: 18 },
  { name: "Materials", pct: 3.8, soft: 12, hard: 18 },
  { name: "Real Estate", pct: 2.9, soft: 15, hard: 20 },
  { name: "Utilities", pct: 1.6, soft: 12, hard: 18 },
];

const HIDDEN = [
  { name: "Apple Inc.", pct: 4.8, sources: ["VTI", "VXUS"] },
  { name: "Microsoft Corp.", pct: 4.2, sources: ["VTI"] },
  { name: "NVIDIA Corp.", pct: 3.6, sources: ["VTI"] },
  { name: "Amazon.com", pct: 2.4, sources: ["VTI"] },
  { name: "Alphabet (A+C)", pct: 2.1, sources: ["VTI"] },
];

const SCENARIOS = [
  { key: "dotcom", period: "2000-03 → 2002-10", lossPct: -38.2, recoveryMonths: 49, proxy: true },
  { key: "gfc", period: "2007-10 → 2009-03", lossPct: -44.1, recoveryMonths: 36, proxy: false },
  { key: "covid", period: "2020-02 → 2020-03", lossPct: -28.7, recoveryMonths: 5, proxy: false },
  { key: "2022", period: "2022-01 → 2022-10", lossPct: -18.4, recoveryMonths: 12, proxy: false },
];

const PORTFOLIO_VALUE = 487250;

// Architect categories + scored ETFs
const CATEGORIES = [
  { id: "global_core", name: "Global Core", picks: [
    { ticker: "VT", score: 0.94, ter: 0.07 },
    { ticker: "VTI", score: 0.92, ter: 0.03 },
    { ticker: "VXUS", score: 0.88, ter: 0.05 },
  ]},
  { id: "us_value", name: "US Factor Value", picks: [
    { ticker: "AVUV", score: 0.91, ter: 0.25 },
    { ticker: "DFSV", score: 0.89, ter: 0.30 },
  ]},
  { id: "us_bonds", name: "US Bonds", picks: [
    { ticker: "BND", score: 0.93, ter: 0.03 },
    { ticker: "GOVT", score: 0.86, ter: 0.05 },
  ]},
  { id: "reits", name: "Real Estate", picks: [
    { ticker: "VNQ", score: 0.87, ter: 0.13 },
  ]},
];

window.IQ_DATA = { HOLDINGS, SECTORS, HIDDEN, SCENARIOS, PORTFOLIO_VALUE, CATEGORIES };
window.IQ_I18N = { I18nContext, useI18n, tFor, TRANSLATIONS };
window.IQ_FMT = { fmtCurrency, fmtPct, fmtNum, signedPct };
