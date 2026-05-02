/* global React */
const { useState, useMemo } = React;
const { useI18n } = window.IQ_I18N;
const { fmtCurrency, fmtPct, fmtNum, signedPct } = window.IQ_FMT;
const { Icon, ValuationBadge } = window.IQ_UI;
const { HOLDINGS, SECTORS, PORTFOLIO_VALUE } = window.IQ_DATA;

// ---------- Drift visualizations ----------
function DriftDiverging({ holdings, showValuation, lang }) {
  const max = 4;
  return (
    <div>
      {holdings.map(h => {
        const drift = h.current - h.target;
        const pct = Math.min(Math.abs(drift) / max, 1) * 50;
        const isOver = drift > 0.5;
        const isUnder = drift < -0.5;
        return (
          <div key={h.ticker} className="drift-row">
            <div>
              <div className="drift-row__ticker">{h.ticker}</div>
              {showValuation && <div style={{marginTop: 3}}><ValuationBadge valuation={h.valuation} lang={lang} /></div>}
            </div>
            <div className="drift-track">
              <div className="drift-track__center" />
              <div className={"drift-track__bar " + (isOver ? "drift-track__bar--over" : isUnder ? "drift-track__bar--under" : "drift-track__bar--in")}
                style={{
                  insetInlineStart: drift >= 0 ? "50%" : `${50 - pct}%`,
                  width: `${pct}%`,
                }} />
            </div>
            <div className={"drift-row__pct " + (drift > 0.5 ? "drift-row__pct--pos" : drift < -0.5 ? "drift-row__pct--neg" : "")}>
              {signedPct(drift, 1, lang)}
            </div>
            <div className="drift-row__weight">
              {fmtNum(h.current, 1, lang)}/{fmtNum(h.target, 0, lang)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DriftTick({ holdings, showValuation, lang }) {
  return (
    <div>
      {holdings.map(h => {
        const max = 50;
        const fillPct = (h.current / max) * 100;
        const targetPct = (h.target / max) * 100;
        return (
          <div key={h.ticker} className="drift-tick">
            <div>
              <div className="drift-row__ticker">{h.ticker}</div>
              {showValuation && <div style={{marginTop: 3}}><ValuationBadge valuation={h.valuation} lang={lang} /></div>}
            </div>
            <div className="drift-tick__track">
              <div className="drift-tick__fill" style={{ width: `${fillPct}%` }} />
              <div className="drift-tick__target" style={{ insetInlineStart: `${targetPct}%` }} />
            </div>
            <div className="drift-row__pct">{fmtPct(h.current, 1, lang)}</div>
          </div>
        );
      })}
    </div>
  );
}

function DriftStacked({ holdings, showValuation, lang }) {
  return (
    <div>
      {holdings.map(h => {
        const drift = h.current - h.target;
        const cur = h.current * 2;
        const tgt = h.target * 2;
        return (
          <div key={h.ticker} className="drift-row" style={{ gridTemplateColumns: "80px 1fr 84px 64px" }}>
            <div>
              <div className="drift-row__ticker">{h.ticker}</div>
              {showValuation && <div style={{marginTop: 3}}><ValuationBadge valuation={h.valuation} lang={lang} /></div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="drift-tick__track" style={{ height: 6 }}>
                <div className="drift-tick__fill" style={{ width: `${cur}%`, background: "var(--accent)" }} />
              </div>
              <div className="drift-tick__track" style={{ height: 6 }}>
                <div className="drift-tick__fill" style={{ width: `${tgt}%`, background: "var(--text-muted)", opacity: 0.5 }} />
              </div>
            </div>
            <div className={"drift-row__pct " + (drift > 0.5 ? "drift-row__pct--pos" : drift < -0.5 ? "drift-row__pct--neg" : "")}>
              {signedPct(drift, 1, lang)}
            </div>
            <div className="drift-row__weight">{fmtNum(h.current, 1, lang)}%</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard({ tweaks, lang }) {
  const { t } = useI18n();
  const totalReturn = 24.3;
  const goalProgress = 32;
  const yieldPct = 1.84;

  const driftVariant = tweaks.driftVariant || "diverging";

  return (
    <div className="content__inner">
      {/* KPI strip */}
      <div className="card">
        <div className="kpi-strip">
          <div className="kpi">
            <div className="kpi__label">{t("dashboard.portfolioValue")}</div>
            <div className="kpi__value">{fmtCurrency(PORTFOLIO_VALUE, "USD", lang)}</div>
            <div className="kpi__sub">≈ {fmtCurrency(PORTFOLIO_VALUE * 3.62, "ILS", lang)}</div>
          </div>
          <div className="kpi">
            <div className="kpi__label">{t("dashboard.totalReturn")}</div>
            <div className="kpi__value">{signedPct(totalReturn, 1, lang)}</div>
            <div className="kpi__sub">{t("dashboard.since")}</div>
          </div>
          <div className="kpi">
            <div className="kpi__label">{t("dashboard.goalProgress")}</div>
            <div className="kpi__value">{fmtPct(goalProgress, 0, lang)}</div>
            <div className="kpi__sub">{t("dashboard.target")} 2050</div>
          </div>
          <div className="kpi">
            <div className="kpi__label">{t("dashboard.cashYield")}</div>
            <div className="kpi__value">{fmtPct(yieldPct, 2, lang)}</div>
            <div className="kpi__sub">{fmtCurrency(PORTFOLIO_VALUE * yieldPct / 100, "USD", lang)}/yr</div>
          </div>
        </div>
      </div>

      {/* Drift chart */}
      <div className="card">
        <div className="card__header">
          <div>
            <div className="card__title">{t("dashboard.driftTitle")}</div>
            <div className="card__subtitle">{t("dashboard.driftSubtitle")}</div>
          </div>
        </div>
        <div className="card__body">
          {driftVariant === "diverging" && <DriftDiverging holdings={HOLDINGS} showValuation={tweaks.showValuation} lang={lang} />}
          {driftVariant === "tick" && <DriftTick holdings={HOLDINGS} showValuation={tweaks.showValuation} lang={lang} />}
          {driftVariant === "stacked" && <DriftStacked holdings={HOLDINGS} showValuation={tweaks.showValuation} lang={lang} />}
        </div>
      </div>

      {/* Sector + reminder */}
      <div className="grid-3">
        <div className="card">
          <div className="card__header">
            <div>
              <div className="card__title">{t("dashboard.sectorTitle")}</div>
              <div className="card__subtitle">{t("dashboard.sectorSubtitle")}</div>
            </div>
            <span className="badge badge--success"><span className="badge__dot"/>76 / 100</span>
          </div>
          <div className="card__body">
            {SECTORS.slice(0, 6).map(s => {
              const pct = (s.pct / s.hard) * 100;
              const cls = s.pct > s.hard ? "sector-track__bar--danger"
                       : s.pct > s.soft ? "sector-track__bar--warn"
                       : "";
              return (
                <div key={s.name} className="sector-row">
                  <div className="sector-row__name">{s.name}</div>
                  <div className="sector-track">
                    <div className={"sector-track__bar " + cls} style={{ width: `${Math.min(pct, 100)}%` }} />
                    <div className="sector-track__cap" style={{ insetInlineStart: `${(s.soft / s.hard) * 100}%` }} />
                    <div className="sector-track__cap sector-track__cap--hard" style={{ insetInlineEnd: 0 }} />
                  </div>
                  <div className="sector-row__pct">{fmtPct(s.pct, 1, lang)}</div>
                  <div className="sector-row__cap">cap {fmtPct(s.hard, 0, lang)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="reminder">
            <div className="reminder__icon"><Icon name="calendar" size={14}/></div>
            <div className="reminder__body">
              <div style={{ fontWeight: 500 }}>{t("dashboard.reminderTitle")}</div>
              <div className="reminder__date">{t("dashboard.reminderDate")}</div>
            </div>
          </div>
          <div className="card">
            <div className="card__header">
              <div>
                <div className="card__title">{t("dashboard.valuationTitle")}</div>
                <div className="card__subtitle">{t("dashboard.valuationSubtitle")}</div>
              </div>
            </div>
            <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {HOLDINGS.map(h => (
                <div key={h.ticker} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{h.ticker}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="tnum" style={{ fontSize: 12, color: "var(--text-muted)" }}>z {fmtNum(h.z, 1, lang)}</span>
                    <ValuationBadge valuation={h.valuation} lang={lang} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.IQ_DASHBOARD = { Dashboard };
