/* global React */
const { useState } = React;
const { useI18n } = window.IQ_I18N;
const { Icon } = window.IQ_UI;

const ACCENTS = {
  indigo:  { name: "Indigo",   color: "#5E6AD2" },
  emerald: { name: "Emerald",  color: "#2A9D7F" },
  amber:   { name: "Amber",    color: "#C18A2A" },
};

// A row in the settings page: label on the left, control on the right
function SettingsRow({ label, note, children, stacked }) {
  return (
    <div className={"settings-row " + (stacked ? "settings-row--stacked" : "")}>
      <div className="settings-row__label">
        <div className="settings-row__title">{label}</div>
        {note && <div className="settings-row__note">{note}</div>}
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div className="settings-group">
      <div className="settings-group__title">{title}</div>
      <div className="settings-group__body">{children}</div>
    </div>
  );
}

function Seg({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={o.value} className="seg__opt"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button className="switch" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span className="switch__thumb" />
    </button>
  );
}

function AccentSwatch({ value, onChange }) {
  return (
    <div className="accent-swatches">
      {Object.entries(ACCENTS).map(([k, v]) => (
        <button key={k} className={"accent-swatch " + (value === k ? "accent-swatch--active" : "")}
          onClick={() => onChange(k)} aria-label={v.name}>
          <span className="accent-swatch__dot" style={{ background: v.color }} />
          <span className="accent-swatch__name">{v.name}</span>
        </button>
      ))}
    </div>
  );
}

function DriftCard({ id, active, onSelect, label, note, preview }) {
  return (
    <button className={"drift-card " + (active ? "drift-card--active" : "")} onClick={() => onSelect(id)}>
      <div className="drift-card__preview">{preview}</div>
      <div className="drift-card__title">{label}</div>
      <div className="drift-card__note">{note}</div>
    </button>
  );
}

const PreviewDiverging = () => (
  <svg viewBox="0 0 120 60" width="100%" height="60">
    {[8, 22, 36, 50].map((y, i) => (
      <g key={i}>
        <rect x="0" y={y} width="120" height="6" rx="1" fill="var(--bg-elevated)" />
        <rect x={i % 2 ? 60 : 60 - [18, 12, 24, 8][i]} y={y} width={[18, 12, 24, 8][i]} height="6" rx="1"
          fill={i % 2 ? "var(--info)" : "var(--accent)"} opacity="0.85" />
      </g>
    ))}
    <line x1="60" y1="4" x2="60" y2="60" stroke="var(--border-strong)" strokeWidth="1" />
  </svg>
);

const PreviewTick = () => (
  <svg viewBox="0 0 120 60" width="100%" height="60">
    {[8, 22, 36, 50].map((y, i) => (
      <g key={i}>
        <rect x="0" y={y + 1} width="120" height="4" rx="2" fill="var(--bg-elevated)" />
        <rect x="0" y={y + 1} width={[80, 50, 95, 30][i]} height="4" rx="2" fill="var(--accent)" />
        <rect x={[72, 60, 88, 36][i]} y={y - 1} width="2" height="8" fill="var(--text-primary)" />
      </g>
    ))}
  </svg>
);

const PreviewStacked = () => (
  <svg viewBox="0 0 120 60" width="100%" height="60">
    {[6, 26, 46].map((y, i) => (
      <g key={i}>
        <rect x="0" y={y} width={[80, 50, 95][i]} height="5" rx="1" fill="var(--accent)" />
        <rect x="0" y={y + 7} width={[70, 60, 88][i]} height="5" rx="1" fill="var(--text-muted)" opacity="0.4" />
      </g>
    ))}
  </svg>
);

function Settings({ tweaks, setTweak, lang }) {
  const { t } = useI18n();
  const [tab, setTab] = useState("appearance");

  const tabs = [
    { id: "appearance", icon: "sun", label: t("settings.tabAppearance") },
    { id: "locale", icon: "universe", label: t("settings.tabLocale") },
    { id: "layout", icon: "panel", label: t("settings.tabLayout") },
    { id: "portfolio", icon: "bucket", label: t("settings.tabPortfolio") },
    { id: "charts", icon: "drawdown", label: t("settings.tabCharts") },
  ];

  const reset = () => {
    setTweak({
      theme: "dark", language: "en", sidebarCollapsed: false,
      showValuation: true, activeBucket: "retirement",
      density: "comfortable", driftVariant: "diverging", accent: "indigo",
    });
  };

  return (
    <div className="content__inner settings-page">
      <div className="settings-shell">
        <aside className="settings-tabs">
          {tabs.map(tb => (
            <button key={tb.id}
              className="settings-tab"
              aria-current={tab === tb.id ? "page" : undefined}
              onClick={() => setTab(tb.id)}>
              <Icon name={tb.icon} size={14} />
              <span>{tb.label}</span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className="btn btn--ghost btn--sm" onClick={reset} style={{ justifyContent: "flex-start", height: 28, paddingInlineStart: 10 }}>
            <Icon name="refresh" size={12} />
            <span>{t("settings.reset")}</span>
          </button>
        </aside>

        <div className="settings-body">
          <div className="settings-header">
            <div>
              <div className="settings-header__title">{t("settings.title")}</div>
              <div className="settings-header__subtitle">{t("settings.subtitle")}</div>
            </div>
            <span className="badge badge--success"><span className="badge__dot"/>{t("settings.saved")}</span>
          </div>

          {tab === "appearance" && (
            <>
              <Group title={t("settings.tabAppearance")}>
                <SettingsRow label={t("settings.theme")} note={t("settings.themeNote")}>
                  <Seg value={tweaks.theme} onChange={v => setTweak("theme", v)}
                    options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} />
                </SettingsRow>
                <SettingsRow label={t("settings.accent")} note={t("settings.accentNote")} stacked>
                  <AccentSwatch value={tweaks.accent} onChange={v => setTweak("accent", v)} />
                </SettingsRow>
                <SettingsRow label={t("settings.density")} note={t("settings.densityNote")}>
                  <Seg value={tweaks.density} onChange={v => setTweak("density", v)}
                    options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }]} />
                </SettingsRow>
              </Group>
            </>
          )}

          {tab === "locale" && (
            <Group title={t("settings.tabLocale")}>
              <SettingsRow label={t("settings.language")} note={t("settings.languageNote")}>
                <Seg value={lang} onChange={v => setTweak("language", v)}
                  options={[{ value: "en", label: "English" }, { value: "he", label: "עברית" }]} />
              </SettingsRow>
              <SettingsRow label={t("settings.direction")}>
                <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{lang === "he" ? "RTL · auto" : "LTR · auto"}</span>
              </SettingsRow>
              <SettingsRow label={t("settings.currency")}>
                <Seg value="USD" onChange={() => {}}
                  options={[{ value: "USD", label: "USD" }, { value: "ILS", label: "ILS" }, { value: "EUR", label: "EUR" }]} />
              </SettingsRow>
              <SettingsRow label={t("settings.numberFormat")}>
                <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {lang === "he" ? "1,234.56 · he-IL" : "1,234.56 · en-US"}
                </span>
              </SettingsRow>
            </Group>
          )}

          {tab === "layout" && (
            <Group title={t("settings.tabLayout")}>
              <SettingsRow label={t("settings.sidebar")} note={t("settings.sidebarNote")}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("settings.sidebarCollapsed")}</span>
                  <Switch checked={tweaks.sidebarCollapsed} onChange={v => setTweak("sidebarCollapsed", v)} />
                </div>
              </SettingsRow>
              <SettingsRow label={t("settings.valuation")} note={t("settings.valuationNote")}>
                <Switch checked={tweaks.showValuation} onChange={v => setTweak("showValuation", v)} />
              </SettingsRow>
            </Group>
          )}

          {tab === "portfolio" && (
            <Group title={t("settings.tabPortfolio")}>
              <SettingsRow label={t("settings.activeBucket")} note={t("settings.activeBucketNote")}>
                <Seg value={tweaks.activeBucket} onChange={v => setTweak("activeBucket", v)}
                  options={[
                    { value: "retirement", label: t("bucket.retirement") },
                    { value: "education", label: t("bucket.education") },
                    { value: "downpayment", label: t("bucket.downpayment") },
                  ]} />
              </SettingsRow>
            </Group>
          )}

          {tab === "charts" && (
            <Group title={t("settings.tabCharts")}>
              <SettingsRow label={t("settings.driftVariant")} note={t("settings.driftVariantNote")} stacked>
                <div style={{ width: "100%" }}>
                  <div className="drift-card-grid">
                    <DriftCard id="diverging" active={tweaks.driftVariant === "diverging"}
                      onSelect={v => setTweak("driftVariant", v)}
                      label={t("settings.diverging")} note={t("settings.divergingNote")}
                      preview={<PreviewDiverging/>} />
                    <DriftCard id="tick" active={tweaks.driftVariant === "tick"}
                      onSelect={v => setTweak("driftVariant", v)}
                      label={t("settings.tick")} note={t("settings.tickNote")}
                      preview={<PreviewTick/>} />
                    <DriftCard id="stacked" active={tweaks.driftVariant === "stacked"}
                      onSelect={v => setTweak("driftVariant", v)}
                      label={t("settings.stacked")} note={t("settings.stackedNote")}
                      preview={<PreviewStacked/>} />
                  </div>
                </div>
              </SettingsRow>
            </Group>
          )}
        </div>
      </div>
    </div>
  );
}

window.IQ_SETTINGS = { Settings };
