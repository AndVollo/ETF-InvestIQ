/* global React, ReactDOM */
const { useState, useEffect, useMemo } = React;
const { I18nContext, tFor } = window.IQ_I18N;
const { Sidebar, Topbar, Icon } = window.IQ_UI;
const { Dashboard } = window.IQ_DASHBOARD;
const { SmartDeposit, Architect, Sectors, Drawdown, Buckets, Universe, Audit } = window.IQ_PAGES;
const { Settings } = window.IQ_SETTINGS;
const { TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakToggle, TweakSelect } = window;

const ACCENTS = {
  indigo:  { name: "Indigo",   accent: "#5E6AD2", hover: "#6E78DC", muted: "rgba(94,106,210,0.12)" },
  emerald: { name: "Emerald",  accent: "#2A9D7F", hover: "#3BAF91", muted: "rgba(42,157,127,0.12)" },
  amber:   { name: "Amber",    accent: "#C18A2A", hover: "#D69A37", muted: "rgba(193,138,42,0.12)" },
};

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "language": "en",
  "sidebarCollapsed": false,
  "showValuation": true,
  "activeBucket": "retirement",
  "density": "comfortable",
  "driftVariant": "diverging",
  "accent": "indigo"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(DEFAULTS);
  const [page, setPage] = useState("dashboard");
  const lang = tweaks.language;

  // Apply theme/density/RTL/accent to root
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = tweaks.theme;
    root.dataset.density = tweaks.density;
    root.dir = lang === "he" ? "rtl" : "ltr";
    root.lang = lang;
    const a = ACCENTS[tweaks.accent] || ACCENTS.indigo;
    root.style.setProperty("--accent", a.accent);
    root.style.setProperty("--accent-hover", a.hover);
    root.style.setProperty("--accent-muted", a.muted);
  }, [tweaks.theme, tweaks.density, lang, tweaks.accent]);

  const i18nValue = useMemo(() => ({ lang, t: tFor(lang) }), [lang]);
  const t = i18nValue.t;

  const bucketLabel = t("bucket." + tweaks.activeBucket);
  const horizon = tweaks.activeBucket === "downpayment" ? t("bucket.shortTerm")
                : tweaks.activeBucket === "education" ? t("bucket.mediumTerm")
                : t("bucket.longTerm");

  const pageTitle = t("nav." + page);
  const pageActions = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div className="seg">
        <button className="seg__opt" aria-selected={lang === "en"} onClick={() => setTweak("language", "en")}>EN</button>
        <button className="seg__opt" aria-selected={lang === "he"} onClick={() => setTweak("language", "he")}>HE</button>
      </div>
      <button className="icon-btn" aria-label="theme" onClick={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}>
        <Icon name={tweaks.theme === "dark" ? "sun" : "moon"} size={14} />
      </button>
      <button className="icon-btn" aria-pressed={tweaks.sidebarCollapsed} aria-label="collapse" onClick={() => setTweak("sidebarCollapsed", !tweaks.sidebarCollapsed)}>
        <Icon name="panel" size={14} />
      </button>
    </div>
  );

  let body;
  switch (page) {
    case "dashboard": body = <Dashboard tweaks={tweaks} lang={lang} />; break;
    case "buckets":   body = <Buckets lang={lang} />; break;
    case "deposit":   body = <SmartDeposit lang={lang} />; break;
    case "universe":  body = <Universe lang={lang} />; break;
    case "architect": body = <Architect lang={lang} />; break;
    case "sectors":   body = <Sectors lang={lang} />; break;
    case "drawdown":  body = <Drawdown lang={lang} />; break;
    case "audit":     body = <Audit lang={lang} />; break;
    case "settings":  body = <Settings tweaks={tweaks} setTweak={setTweak} lang={lang} />; break;
    default:          body = <Dashboard tweaks={tweaks} lang={lang} />;
  }

  return (
    <I18nContext.Provider value={i18nValue}>
      <div className="app" data-collapsed={tweaks.sidebarCollapsed} data-density={tweaks.density}>
        <Sidebar
          active={page}
          onNavigate={setPage}
          bucketName={bucketLabel}
          bucketHorizon={horizon}
          onBucketClick={() => {}}
        />
        <main className="main">
          <Topbar title={pageTitle} crumb={tweaks.activeBucket !== "retirement" ? bucketLabel : undefined} actions={pageActions} />
          {page === "architect" ? body : <div className="content">{body}</div>}
        </main>

        <TweaksPanel title="Tweaks" defaultOpen={false}>
          <TweakSection title="Appearance">
            <TweakRadio label="Theme" value={tweaks.theme}
              onChange={v => setTweak("theme", v)}
              options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} />
            <TweakRadio label="Accent" value={tweaks.accent}
              onChange={v => setTweak("accent", v)}
              options={Object.entries(ACCENTS).map(([k, v]) => ({ value: k, label: v.name }))} />
            <TweakRadio label="Density" value={tweaks.density}
              onChange={v => setTweak("density", v)}
              options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }]} />
          </TweakSection>
          <TweakSection title="Locale">
            <TweakRadio label="Language" value={lang}
              onChange={v => setTweak("language", v)}
              options={[{ value: "en", label: "English" }, { value: "he", label: "עברית" }]} />
          </TweakSection>
          <TweakSection title="Layout">
            <TweakToggle label="Collapse sidebar" checked={tweaks.sidebarCollapsed} onChange={v => setTweak("sidebarCollapsed", v)} />
            <TweakToggle label="Show valuation badges" checked={tweaks.showValuation} onChange={v => setTweak("showValuation", v)} />
          </TweakSection>
          <TweakSection title="Active bucket">
            <TweakSelect label="Bucket" value={tweaks.activeBucket}
              onChange={v => setTweak("activeBucket", v)}
              options={[
                { value: "retirement", label: t("bucket.retirement") },
                { value: "education", label: t("bucket.education") },
                { value: "downpayment", label: t("bucket.downpayment") },
              ]} />
          </TweakSection>
          <TweakSection title="Drift chart">
            <TweakRadio label="Variant" value={tweaks.driftVariant}
              onChange={v => setTweak("driftVariant", v)}
              options={[
                { value: "diverging", label: "Diverging" },
                { value: "tick", label: "Tick" },
                { value: "stacked", label: "Stacked" },
              ]} />
          </TweakSection>
        </TweaksPanel>
      </div>
    </I18nContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
