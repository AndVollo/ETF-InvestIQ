/* global React */
const { useState, useMemo } = React;
const { useI18n } = window.IQ_I18N;
const { fmtCurrency, fmtPct, fmtNum, signedPct } = window.IQ_FMT;
const { Icon, ValuationBadge } = window.IQ_UI;
const { HOLDINGS, SECTORS, HIDDEN, SCENARIOS, PORTFOLIO_VALUE, CATEGORIES } = window.IQ_DATA;

// =============================================================================
// SMART DEPOSIT
// =============================================================================
function computeDepositPlan(amount) {
  // Allocate to most underweight first
  const sorted = [...HOLDINGS].sort((a, b) => (a.current - a.target) - (b.current - b.target));
  const portfolioAfter = PORTFOLIO_VALUE + amount;
  const orders = [];
  let remaining = amount;
  for (const h of sorted) {
    const targetVal = portfolioAfter * (h.target / 100);
    const currentVal = PORTFOLIO_VALUE * (h.current / 100);
    const need = Math.max(0, targetVal - currentVal);
    const allocated = Math.min(need, remaining);
    if (allocated < 50) continue;
    const px = h.ticker === "VTI" ? 268 : h.ticker === "VXUS" ? 58 : h.ticker === "AVUV" ? 96 : h.ticker === "BND" ? 79 : 92;
    const units = Math.floor(allocated / px);
    if (units < 1) continue;
    const cost = units * px;
    orders.push({ ticker: h.ticker, name: h.name, units, price: px, total: cost });
    remaining -= cost;
  }
  return { orders, remainder: remaining, planned: amount - remaining };
}

function SmartDeposit({ lang }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(5000);
  const [currency, setCurrency] = useState("USD");
  const [plan, setPlan] = useState(null);
  const calculate = () => setPlan(computeDepositPlan(amount));

  return (
    <div className="content__inner">
      <div className="card">
        <div className="card__header">
          <div>
            <div className="card__title">{t("deposit.title")}</div>
            <div className="card__subtitle">{t("deposit.subtitle")}</div>
          </div>
        </div>
        <div className="card__body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{t("deposit.bucket")}</div>
              <div className="input" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{t("bucket.retirement")}</span>
                <Icon name="chevronDown" size={14} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{t("deposit.amount")}</div>
              <div className="input-group">
                <div className="input-group__prefix">{currency === "USD" ? "$" : "₪"}</div>
                <input className="input-group__input tnum" type="number" value={amount}
                  onChange={e => setAmount(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{t("deposit.currency")}</div>
              <div className="seg" style={{ width: "100%", display: "flex" }}>
                <button className="seg__opt" aria-selected={currency === "USD"} onClick={() => setCurrency("USD")} style={{ flex: 1 }}>USD</button>
                <button className="seg__opt" aria-selected={currency === "ILS"} onClick={() => setCurrency("ILS")} style={{ flex: 1 }}>ILS</button>
              </div>
            </div>
            <button className="btn btn--primary" onClick={calculate}>
              <Icon name="refresh" size={14} />
              {t("deposit.calculate")}
            </button>
          </div>
          <div className="hint" style={{ marginTop: 10 }}>
            <Icon name="info" size={12} /> {t("deposit.fxNote")}
          </div>
        </div>
      </div>

      {plan && (
        <>
          <div className="card">
            <div className="card__header">
              <div>
                <div className="card__title">{t("deposit.planTitle")}</div>
                <div className="card__subtitle">{t("deposit.planSubtitle")}</div>
              </div>
              <span className="badge badge--success"><span className="badge__dot"/>dry-run</span>
            </div>
            <div className="card__body">
              {plan.orders.map(o => (
                <div key={o.ticker} className="order-row">
                  <div className="order-row__icon"><Icon name="plus" size={14}/></div>
                  <div className="order-row__ticker mono">{o.ticker}</div>
                  <div className="order-row__name">{o.name}</div>
                  <div className="order-row__num">{fmtNum(o.units, 0, lang)} {t("deposit.units")}</div>
                  <div className="order-row__num" style={{ color: "var(--text-muted)" }}>@ ${fmtNum(o.price, 0, lang)}</div>
                  <div className="order-row__num" style={{ fontWeight: 500 }}>{fmtCurrency(o.total, "USD", lang)}</div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("deposit.remainder")}</div>
                  <div className="tnum" style={{ fontSize: 13 }}>{fmtCurrency(plan.remainder, "USD", lang)} <span style={{ color: "var(--text-muted)" }}>· {t("deposit.remainderNote")}</span></div>
                </div>
                <div style={{ textAlign: "end" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("deposit.total")}</div>
                  <div className="tnum" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>{fmtCurrency(plan.planned, "USD", lang)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <div>
                <div className="card__title">{t("deposit.sectorImpact")}</div>
              </div>
            </div>
            <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SECTORS.slice(0, 5).map(s => {
                const after = s.pct - 0.1 * (Math.random() - 0.5);
                return (
                  <div key={s.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>{s.name}</span>
                    <span className="tnum" style={{ color: "var(--text-muted)" }}>
                      {fmtPct(s.pct, 1, lang)} → <span style={{ color: "var(--text-primary)" }}>{fmtPct(after, 1, lang)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="reminder">
            <div className="reminder__icon" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
              <Icon name="info" size={14}/>
            </div>
            <div className="reminder__body" style={{ fontSize: 13 }}>{t("deposit.writeNote")}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn--secondary">{t("deposit.back")}</button>
              <button className="btn btn--primary">
                <Icon name="check" size={14} /> {t("deposit.confirm")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// ARCHITECT
// =============================================================================
function Architect({ lang }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [selectedCats, setSelectedCats] = useState(["global_core", "us_value", "us_bonds"]);
  const [allocation, setAllocation] = useState({ VT: 40, AVUV: 15, BND: 30, VXUS: 15 });
  const sum = Object.values(allocation).reduce((a, b) => a + b, 0);

  const steps = ["step1", "step2", "step3", "step4", "step5", "step6"];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="stepper">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={"step " + (step === i ? "step--active" : step > i ? "step--done" : "")}>
              <div className="step__num">{step > i ? <Icon name="check" size={11}/> : i + 1}</div>
              <span>{t("architect." + s)}</span>
            </div>
            {i < steps.length - 1 && <div className="step__sep" />}
          </React.Fragment>
        ))}
      </div>
      <div className="content">
        <div className="content__inner">
          {step === 0 && (
            <div className="card">
              <div className="card__header">
                <div><div className="card__title">{t("architect.goalLabel")}</div></div>
              </div>
              <div className="card__body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {["retirement", "education", "downpayment"].map(b => (
                  <button key={b} className="card card--interactive" style={{ padding: 16, textAlign: "start", background: "var(--bg-elevated)" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t("bucket." + b)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                      {b === "downpayment" ? t("bucket.shortTerm") : b === "education" ? t("bucket.mediumTerm") : t("bucket.longTerm")}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="card">
              <div className="card__header">
                <div>
                  <div className="card__title">{t("architect.categories")}</div>
                  <div className="card__subtitle">{t("architect.categoriesNote")}</div>
                </div>
              </div>
              <div className="card__body" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map(c => {
                  const on = selectedCats.includes(c.id);
                  return (
                    <button key={c.id}
                      className={"chip " + (on ? "chip--active" : "")}
                      style={{ height: 32, fontSize: 13 }}
                      onClick={() => setSelectedCats(p => on ? p.filter(x => x !== c.id) : [...p, c.id])}>
                      {on && <Icon name="check" size={12} />}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card">
              <div className="card__header">
                <div>
                  <div className="card__title">{t("architect.shortlistTitle")}</div>
                  <div className="card__subtitle">{t("architect.shortlistNote")}</div>
                </div>
              </div>
              <div className="card__body">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Category</th><th>Ticker</th><th className="num">Score</th><th className="num">TER</th><th className="num">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIES.filter(c => selectedCats.includes(c.id)).flatMap(c =>
                      c.picks.map((p, i) => (
                        <tr key={c.id + p.ticker}>
                          <td style={{ color: "var(--text-muted)" }}>{i === 0 ? c.name : ""}</td>
                          <td className="mono">{p.ticker}</td>
                          <td className="num tnum">{fmtNum(p.score, 2, lang)}</td>
                          <td className="num tnum">{fmtPct(p.ter, 2, lang)}</td>
                          <td className="num">{i === 0 && <span className="badge badge--success"><span className="badge__dot"/>top pick</span>}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card">
              <div className="card__header">
                <div>
                  <div className="card__title">{t("architect.allocateTitle")}</div>
                  <div className="card__subtitle">{t("architect.allocateNote")}</div>
                </div>
                <button className="btn btn--secondary btn--sm">
                  <Icon name="sparkle" size={12}/> {t("architect.askAI")}
                </button>
              </div>
              <div className="card__body">
                {Object.keys(allocation).map(tk => (
                  <div key={tk} className="alloc-row">
                    <div className="alloc-row__ticker mono">{tk}</div>
                    <input type="range" min="0" max="100" step="0.5" className="alloc-slider"
                      value={allocation[tk]}
                      onChange={e => setAllocation(p => ({ ...p, [tk]: Number(e.target.value) }))} />
                    <div className="alloc-row__pct">{fmtPct(allocation[tk], 1, lang)}</div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("architect.sum")}</span>
                  <span className={"tnum " + (Math.abs(sum - 100) < 0.1 ? "" : "")} style={{ fontWeight: 600, color: Math.abs(sum - 100) < 0.1 ? "var(--success)" : "var(--warning)" }}>
                    {fmtPct(sum, 1, lang)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="card">
              <div className="card__header">
                <div>
                  <div className="card__title">{t("architect.validateTitle")}</div>
                  <div className="card__subtitle">{t("architect.validateNote")}</div>
                </div>
              </div>
              <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: t("architect.sectorCheck"), pass: true, note: "All sectors below soft caps" },
                  { label: t("architect.drawdownCheck"), pass: true, note: "Worst case −38% / 36mo recovery" },
                  { label: "Allocation sum", pass: Math.abs(sum - 100) < 0.1, note: `${fmtPct(sum, 1, lang)}` },
                  { label: "Bucket horizon match", pass: true, note: "Long-term bucket allows equity" },
                ].map(c => (
                  <div key={c.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{c.note}</div>
                    </div>
                    <span className={"badge " + (c.pass ? "badge--success" : "badge--danger")}>
                      <span className="badge__dot"/>
                      {c.pass ? t("architect.pass") : t("architect.review")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="card">
              <div className="card__body" style={{ textAlign: "center", padding: 48 }}>
                <div style={{ width: 48, height: 48, margin: "0 auto 16px", display: "grid", placeItems: "center", background: "var(--success-bg)", color: "var(--success)", borderRadius: 12 }}>
                  <Icon name="check" size={24}/>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Ready to confirm</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 380, margin: "0 auto 20px" }}>
                  Allocation will be applied to holdings and logged to the Obsidian vault.
                </div>
                <button className="btn btn--primary btn--lg">
                  <Icon name="check" size={14}/> Confirm allocation
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button className="btn btn--secondary" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>
              {t("architect.previous")}
            </button>
            <button className="btn btn--primary" disabled={step === 5} onClick={() => setStep(s => Math.min(5, s + 1))}>
              {t("architect.next")} <Icon name="chevronRight" size={14}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SECTORS
// =============================================================================
function Sectors({ lang }) {
  const { t } = useI18n();
  return (
    <div className="content__inner">
      <div className="card">
        <div className="card__header">
          <div>
            <div className="card__title">{t("sectors.title")}</div>
            <div className="card__subtitle">{t("sectors.subtitle")}</div>
          </div>
          <div style={{ textAlign: "end" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("sectors.diversification")}</div>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 600 }}>76 <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 400 }}>/ 100</span></div>
          </div>
        </div>
        <div className="card__body">
          {SECTORS.map(s => {
            const pct = (s.pct / s.hard) * 100;
            const cls = s.pct > s.hard ? "sector-track__bar--danger" : s.pct > s.soft ? "sector-track__bar--warn" : "";
            return (
              <div key={s.name} className="sector-row">
                <div className="sector-row__name">{s.name}</div>
                <div className="sector-track">
                  <div className={"sector-track__bar " + cls} style={{ width: `${Math.min(pct, 100)}%` }} />
                  <div className="sector-track__cap" style={{ insetInlineStart: `${(s.soft / s.hard) * 100}%` }} />
                  <div className="sector-track__cap sector-track__cap--hard" style={{ insetInlineEnd: 0 }} />
                </div>
                <div className="sector-row__pct">{fmtPct(s.pct, 1, lang)}</div>
                <div className="sector-row__cap">{t("sectors.soft")} {fmtPct(s.soft, 0, lang)} · {t("sectors.hard")} {fmtPct(s.hard, 0, lang)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <div>
            <div className="card__title">{t("sectors.hidden")}</div>
            <div className="card__subtitle">{t("sectors.hiddenNote")}</div>
          </div>
        </div>
        <div className="card__body">
          <table className="table">
            <thead>
              <tr><th>Stock</th><th>Found in</th><th className="num">Effective weight</th></tr>
            </thead>
            <tbody>
              {HIDDEN.map(h => (
                <tr key={h.name}>
                  <td>{h.name}</td>
                  <td>{h.sources.map(s => <span key={s} className="mono" style={{ marginInlineEnd: 6 }}>{s}</span>)}</td>
                  <td className="num tnum">{fmtPct(h.pct, 2, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DRAWDOWN
// =============================================================================
function Drawdown({ lang }) {
  const { t } = useI18n();
  const [ran, setRan] = useState(true);
  const worst = SCENARIOS.reduce((w, s) => s.lossPct < w.lossPct ? s : w, SCENARIOS[0]);
  const worstAmt = PORTFOLIO_VALUE * worst.lossPct / 100;

  return (
    <div className="content__inner">
      <div className="card">
        <div className="card__header">
          <div>
            <div className="card__title">{t("drawdown.title")}</div>
            <div className="card__subtitle">{t("drawdown.subtitle")}</div>
          </div>
          <button className="btn btn--secondary btn--sm" onClick={() => setRan(true)}>
            <Icon name="refresh" size={12}/> {t("drawdown.simulate")}
          </button>
        </div>
        <div className="card__body">
          {ran && SCENARIOS.map(s => {
            const amt = PORTFOLIO_VALUE * s.lossPct / 100;
            const barPct = (Math.abs(s.lossPct) / 50) * 100;
            return (
              <div key={s.key} className="scenario">
                <div>
                  <div className="scenario__title">{t("drawdown.scenario_" + s.key)}</div>
                  <div className="scenario__period">{s.period} {s.proxy && <span style={{ marginInlineStart: 8, color: "var(--info)" }}>· {t("drawdown.proxy")}</span>}</div>
                  <div className="scenario__bar">
                    <div className="scenario__bar-fill" style={{ width: `${barPct}%` }} />
                  </div>
                  <div className="scenario__recovery">{t("drawdown.recovery")}: {s.recoveryMonths} {t("drawdown.months")}</div>
                </div>
                <div className="scenario__numbers">
                  <div className="scenario__loss-pct">{signedPct(s.lossPct, 1, lang)}</div>
                  <div className="scenario__loss-amt">{fmtCurrency(amt, "USD", lang)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ background: "var(--danger-bg)", borderColor: "transparent" }}>
        <div className="card__body" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--danger)", color: "white", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="alert" size={18}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t("drawdown.worstCase")}</div>
              <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                <span className="tnum" style={{ fontSize: 28, fontWeight: 600, color: "var(--danger)", letterSpacing: "-0.02em" }}>{signedPct(worst.lossPct, 1, lang)}</span>
                <span className="tnum" style={{ fontSize: 14, color: "var(--text-secondary)" }}>{fmtCurrency(worstAmt, "USD", lang)}</span>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{t("drawdown.reflectionTitle")}</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 540 }}>{t("drawdown.reflectionBody")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BUCKETS / UNIVERSE / AUDIT (placeholders with structure)
// =============================================================================
function Buckets({ lang }) {
  const { t } = useI18n();
  const buckets = [
    { id: "downpayment", target: 3550000, currency: "ILS", current: 1820000, horizon: "shortTerm", holdings: ["SGOV (60%)", "BIL (40%)"] },
    { id: "education", target: 600000, currency: "ILS", current: 145000, horizon: "mediumTerm", holdings: ["VTI (30%)", "VXUS (20%)", "BND (40%)", "TIP (10%)"] },
    { id: "retirement", target: null, currency: "USD", current: 487250, horizon: "longTerm", holdings: ["VTI (40%)", "VXUS (25%)", "AVUV (10%)", "BND (20%)", "VNQ (5%)"] },
  ];
  return (
    <div className="content__inner">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="section-title" style={{ marginBottom: 0 }}>{t("nav.buckets")}</div>
        <button className="btn btn--primary btn--sm"><Icon name="plus" size={12}/> New bucket</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {buckets.map(b => {
          const pct = b.target ? (b.current / b.target) * 100 : null;
          return (
            <div key={b.id} className="card card--interactive">
              <div className="card__body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t("bucket." + b.id)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t("bucket." + b.horizon)}</div>
                  </div>
                  <ValuationBadge valuation={b.horizon === "shortTerm" ? "fair" : b.horizon === "mediumTerm" ? "fair" : "fair"} lang={lang}/>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span className="tnum" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>
                      {fmtCurrency(b.current, b.currency, lang)}
                    </span>
                    {b.target && <span className="tnum" style={{ fontSize: 12, color: "var(--text-muted)" }}>/ {fmtCurrency(b.target, b.currency, lang)}</span>}
                  </div>
                  {pct !== null && (
                    <div style={{ marginTop: 10, height: 4, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: "var(--accent)", transition: "width 180ms" }} />
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border-subtle)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
                  {b.holdings.map((h, i) => (
                    <span key={i} className="mono" style={{ marginInlineEnd: 8 }}>{h}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Universe({ lang }) {
  const universe = [
    { cat: "Global Core", picks: [
      { ticker: "VT", ter: 0.07, score: 0.94, val: "fair" },
      { ticker: "VTI", ter: 0.03, score: 0.92, val: "fair" },
      { ticker: "VXUS", ter: 0.05, score: 0.88, val: "cheap" },
    ]},
    { cat: "US Factor Value", picks: [
      { ticker: "AVUV", ter: 0.25, score: 0.91, val: "fair" },
      { ticker: "DFSV", ter: 0.30, score: 0.89, val: "fair" },
    ]},
    { cat: "US Bonds", picks: [
      { ticker: "BND", ter: 0.03, score: 0.93, val: "expensive" },
      { ticker: "GOVT", ter: 0.05, score: 0.86, val: "expensive" },
    ]},
    { cat: "REITs", picks: [
      { ticker: "VNQ", ter: 0.13, score: 0.87, val: "fair" },
    ]},
  ];
  return (
    <div className="content__inner">
      <div className="card">
        <div className="card__body card__body--flush">
          {universe.map(g => (
            <div key={g.cat}>
              <div style={{ padding: "12px 24px", background: "var(--bg-base)", borderBottom: "1px solid var(--border-subtle)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                {g.cat}
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Ticker</th>
                    <th className="num">TER</th>
                    <th className="num">Score</th>
                    <th>Valuation</th>
                  </tr>
                </thead>
                <tbody>
                  {g.picks.map((p, i) => (
                    <tr key={p.ticker}>
                      <td className="tnum" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                      <td className="mono">{p.ticker}</td>
                      <td className="num tnum">{fmtPct(p.ter, 2, lang)}</td>
                      <td className="num tnum">{fmtNum(p.score, 2, lang)}</td>
                      <td><ValuationBadge valuation={p.val} lang={lang}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Audit({ lang }) {
  const events = [
    { date: "2026-04-26", type: "Smart Deposit", bucket: "Retirement 2050", detail: "$5,000 · 4 buy orders" },
    { date: "2026-04-15", type: "Architect", bucket: "Education 2035", detail: "Added AVUV (5%), reduced BND (−5%)" },
    { date: "2026-03-30", type: "Universe Review", bucket: "Q2 release", detail: "AVUV-X added, JEPI removed (blacklist)" },
    { date: "2026-03-15", type: "Smart Deposit", bucket: "Down Payment 2028", detail: "₪10,000 · 2 buy orders" },
  ];
  return (
    <div className="content__inner">
      <div className="card">
        <div className="card__body card__body--flush">
          {events.map((e, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 140px 1fr auto", gap: 16, padding: "16px 24px", borderBottom: i < events.length - 1 ? "1px solid var(--border-subtle)" : "none", alignItems: "center" }}>
              <div className="tnum" style={{ fontSize: 12, color: "var(--text-muted)" }}>{e.date}</div>
              <div><span className="badge badge--muted">{e.type}</span></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.bucket}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{e.detail}</div>
              </div>
              <button className="btn btn--ghost btn--sm">Open</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.IQ_PAGES = { SmartDeposit, Architect, Sectors, Drawdown, Buckets, Universe, Audit };
