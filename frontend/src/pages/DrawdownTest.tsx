import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuckets } from '@/api/buckets'
import { useLatestSimulation, useRunSimulation } from '@/api/drawdown'
import { useUiStore } from '@/store/uiStore'
import { Card, Button, Icon } from '@/components/design'
import { EmptyState } from '@/components/common/EmptyState'
import { formatCurrency } from '@/utils/formatting'
import type { DrawdownScenario } from '@/types/api'

function fmtSigned(n: number, digits = 1) {
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`
}

function ScenarioRow({ scenario, portfolioValueUsd }: { scenario: DrawdownScenario; portfolioValueUsd: number }) {
  const { t } = useTranslation()
  const drawdownPct = scenario.portfolio_drawdown_pct ?? 0
  const lossUsd = scenario.portfolio_loss_usd ?? (portfolioValueUsd * drawdownPct / 100)
  const barPct = (Math.abs(drawdownPct) / 50) * 100

  const scenarioKey = `drawdown.scenarios.${scenario.name}` as Parameters<typeof t>[0]
  const proxyHolding = scenario.holdings.find((h) => h.proxy_used)

  return (
    <div className="scenario">
      <div>
        <div className="scenario__title">{t(scenarioKey, { defaultValue: scenario.name })}</div>
        <div className="scenario__period">
          {scenario.period_start} → {scenario.period_end}
          {proxyHolding ? (
            <span className="text-info" style={{ marginInlineStart: 8 }}>
              · {t('drawdown.proxy_used', { proxy: `${proxyHolding.ticker}→${proxyHolding.proxy_ticker}` })}
            </span>
          ) : null}
        </div>
        <div className="scenario__bar">
          <div className="scenario__bar-fill" style={{ width: `${Math.min(barPct, 100)}%` }} />
        </div>
      </div>
      <div className="scenario__numbers">
        <div className="scenario__loss-pct">{fmtSigned(drawdownPct)}</div>
        <div className="scenario__loss-amt">{formatCurrency(Math.abs(lossUsd), 'USD')}</div>
      </div>
    </div>
  )
}

export default function DrawdownTest() {
  const { t } = useTranslation()
  const { data: bucketsData } = useBuckets()
  const buckets = (bucketsData ?? []).filter((b) => !b.is_archived)
  const activeBucketId = useUiStore((s) => s.activeBucketId)
  const setActiveBucketId = useUiStore((s) => s.setActiveBucketId)
  const bucketId = activeBucketId ?? buckets[0]?.id ?? 0

  useEffect(() => {
    if (buckets.length > 0) {
      const isValid = activeBucketId != null && buckets.some(b => b.id === activeBucketId)
      if (!isValid) {
        setActiveBucketId(buckets[0].id)
      }
    }
  }, [activeBucketId, buckets, setActiveBucketId])

  const { data: sim, isLoading: simLoading } = useLatestSimulation(bucketId)
  const runSim = useRunSimulation(bucketId)

  const worstScenario = sim
    ? sim.scenarios.reduce(
        (worst, s) =>
          (s.portfolio_drawdown_pct ?? 0) < (worst.portfolio_drawdown_pct ?? 0) ? s : worst,
        sim.scenarios[0],
      )
    : null
  const worstAmt =
    worstScenario && sim
      ? sim.portfolio_value_usd * (worstScenario.portfolio_drawdown_pct ?? 0) / 100
      : 0

  return (
    <div className="content">
      <div className="content__inner">
        <Card>
          <Card.Header
            title={t('drawdown.title')}
            subtitle="Historical stress test."
            actions={
              <Button size="sm" variant="secondary" onClick={() => runSim.mutate()} loading={runSim.isPending}>
                <Icon name="refresh" size={12} />
                {runSim.isPending ? t('drawdown.running') : t('drawdown.run')}
              </Button>
            }
          />
          <Card.Body>
            {simLoading && <p className="text-muted" style={{ textAlign: 'center', padding: '32px 0' }}>{t('common.loading')}</p>}
            {!simLoading && !sim && <EmptyState message={t('drawdown.no_data')} />}
            {sim ? sim.scenarios.map((s) => (
              <ScenarioRow key={s.name} scenario={s} portfolioValueUsd={sim.portfolio_value_usd} />
            )) : null}
          </Card.Body>
        </Card>

        {worstScenario && sim ? (
          <Card style={{ background: 'var(--danger-bg)', borderColor: 'transparent' }}>
            <Card.Body>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'var(--danger)', color: 'white',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}
                >
                  <Icon name="alert" size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t('drawdown.worst_case')}</div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                      <span className="tnum" style={{ fontSize: 28, fontWeight: 600, color: 'var(--danger)', letterSpacing: '-0.02em' }}>
                        {fmtSigned(worstScenario.portfolio_drawdown_pct ?? 0)}
                      </span>
                      <span className="tnum text-secondary" style={{ fontSize: 14 }}>
                        {formatCurrency(Math.abs(worstAmt), 'USD')}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 540 }}>
                    {t('drawdown.question', { amount: formatCurrency(Math.abs(worstAmt), 'USD') })}
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
