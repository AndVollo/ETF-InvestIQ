import { useTranslation } from 'react-i18next'
import type { HoldingDriftItem } from '@/types/api'
import { useUiStore, type DriftVariant } from '@/store/uiStore'
import { ValuationBadge } from '@/components/design'
import { EmptyState } from '@/components/common/EmptyState'

interface DriftChartProps {
  holdings: HoldingDriftItem[]
  variant?: DriftVariant
}

function fmtSigned(n: number, digits = 1): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(digits)}%`
}

function HoldingLabel({ ticker, valuation, showValuation }: {
  ticker: string
  valuation?: string | null
  showValuation: boolean
}) {
  return (
    <div>
      <div className="drift-row__ticker">{ticker}</div>
      {showValuation && valuation ? (
        <div style={{ marginTop: 3 }}>
          <ValuationBadge classification={valuation} />
        </div>
      ) : null}
    </div>
  )
}

function DriftDiverging({ holdings, showValuation }: { holdings: HoldingDriftItem[]; showValuation: boolean }) {
  const max = Math.max(4, ...holdings.map((h) => Math.abs(h.drift_pct)))
  return (
    <div>
      {holdings.map((h) => {
        const drift = h.drift_pct
        const pct = Math.min(Math.abs(drift) / max, 1) * 50
        const isOver = drift > 0.5
        const isUnder = drift < -0.5
        const barCls = isOver
          ? 'drift-track__bar drift-track__bar--over'
          : isUnder
          ? 'drift-track__bar drift-track__bar--under'
          : 'drift-track__bar drift-track__bar--in'
        const pctCls =
          'drift-row__pct ' +
          (drift > 0.5 ? 'drift-row__pct--pos' : drift < -0.5 ? 'drift-row__pct--neg' : '')
        return (
          <div key={h.ticker} className="drift-row">
            <HoldingLabel
              ticker={h.ticker}
              valuation={(h as unknown as { valuation_classification?: string }).valuation_classification}
              showValuation={showValuation}
            />
            <div className="drift-track">
              <div className="drift-track__center" />
              <div
                className={barCls}
                style={{
                  insetInlineStart: drift >= 0 ? '50%' : `${50 - pct}%`,
                  width: `${pct}%`,
                }}
              />
            </div>
            <div className={pctCls}>{fmtSigned(drift, 1)}</div>
            <div className="drift-row__weight">
              {h.current_pct.toFixed(1)}/{h.target_pct.toFixed(0)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DriftTick({ holdings, showValuation }: { holdings: HoldingDriftItem[]; showValuation: boolean }) {
  const max = Math.max(50, ...holdings.map((h) => Math.max(h.current_pct, h.target_pct)))
  return (
    <div>
      {holdings.map((h) => {
        const fillPct = (h.current_pct / max) * 100
        const targetPct = (h.target_pct / max) * 100
        return (
          <div key={h.ticker} className="drift-tick">
            <HoldingLabel
              ticker={h.ticker}
              valuation={(h as unknown as { valuation_classification?: string }).valuation_classification}
              showValuation={showValuation}
            />
            <div className="drift-tick__track">
              <div className="drift-tick__fill" style={{ width: `${fillPct}%` }} />
              <div className="drift-tick__target" style={{ insetInlineStart: `${targetPct}%` }} />
            </div>
            <div className="drift-row__pct">{h.current_pct.toFixed(1)}%</div>
          </div>
        )
      })}
    </div>
  )
}

function DriftStacked({ holdings, showValuation }: { holdings: HoldingDriftItem[]; showValuation: boolean }) {
  const max = Math.max(50, ...holdings.map((h) => Math.max(h.current_pct, h.target_pct)))
  return (
    <div>
      {holdings.map((h) => {
        const drift = h.drift_pct
        const cur = (h.current_pct / max) * 100
        const tgt = (h.target_pct / max) * 100
        const pctCls =
          'drift-row__pct ' +
          (drift > 0.5 ? 'drift-row__pct--pos' : drift < -0.5 ? 'drift-row__pct--neg' : '')
        return (
          <div key={h.ticker} className="drift-row" style={{ gridTemplateColumns: '100px 1fr 84px 64px' }}>
            <HoldingLabel
              ticker={h.ticker}
              valuation={(h as unknown as { valuation_classification?: string }).valuation_classification}
              showValuation={showValuation}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="drift-tick__track" style={{ height: 6 }}>
                <div className="drift-tick__fill" style={{ width: `${cur}%`, background: 'var(--accent)' }} />
              </div>
              <div className="drift-tick__track" style={{ height: 6 }}>
                <div className="drift-tick__fill" style={{ width: `${tgt}%`, background: 'var(--text-muted)', opacity: 0.5 }} />
              </div>
            </div>
            <div className={pctCls}>{fmtSigned(drift, 1)}</div>
            <div className="drift-row__weight">{h.current_pct.toFixed(1)}%</div>
          </div>
        )
      })}
    </div>
  )
}

export function DriftChart({ holdings, variant }: DriftChartProps) {
  const { t } = useTranslation()
  const variantFromStore = useUiStore((s) => s.driftVariant)
  const showValuation = useUiStore((s) => s.showValuation)
  const v = variant ?? variantFromStore

  if (holdings.length === 0) {
    return <EmptyState message={t('buckets.no_holdings')} />
  }
  if (v === 'tick') return <DriftTick holdings={holdings} showValuation={showValuation} />
  if (v === 'stacked') return <DriftStacked holdings={holdings} showValuation={showValuation} />
  return <DriftDiverging holdings={holdings} showValuation={showValuation} />
}
