import { useTranslation } from 'react-i18next'
import { useBuckets } from '@/api/buckets'
import { useLatestSimulation, useRunSimulation } from '@/api/drawdown'
import { useUiStore } from '@/store/uiStore'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { formatCurrency } from '@/utils/formatting'
import type { DrawdownScenario } from '@/types/api'

function ScenarioCard({ scenario, portfolioValueUsd }: { scenario: DrawdownScenario; portfolioValueUsd: number }) {
  const { t } = useTranslation()
  const drawdownPct = scenario.portfolio_drawdown_pct ?? 0
  const lossUsd = scenario.portfolio_loss_usd ?? (portfolioValueUsd * drawdownPct / 100)
  const absPct = Math.abs(drawdownPct)
  const color = absPct > 40 ? 'red' : absPct > 20 ? 'yellow' : 'green'

  const scenarioKey = `drawdown.scenarios.${scenario.name}` as Parameters<typeof t>[0]

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          {t(scenarioKey, { defaultValue: scenario.name })}
        </h3>
        <Badge color={color}>{drawdownPct.toFixed(1)}%</Badge>
      </div>
      <p className="text-2xl font-bold text-danger mb-2">
        {formatCurrency(Math.abs(lossUsd), 'USD')}
      </p>
      <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300 italic">
        {t('drawdown.question', { amount: formatCurrency(Math.abs(lossUsd), 'USD') })}
      </p>
      {scenario.holdings.some((h) => h.proxy_used) && (
        <p className="mt-2 text-xs text-gray-400">
          {scenario.holdings.filter((h) => h.proxy_used).map((h) => `${h.ticker}→${h.proxy_ticker}`).join(', ')}
        </p>
      )}
    </div>
  )
}

export default function DrawdownTest() {
  const { t } = useTranslation()
  const { data: bucketsData } = useBuckets()
  const buckets = (bucketsData ?? []).filter((b) => !b.is_archived)
  const activeBucketId = useUiStore((s) => s.activeBucketId)
  const bucketId = activeBucketId ?? buckets[0]?.id ?? 0

  const { data: sim, isLoading: simLoading } = useLatestSimulation(bucketId)
  const runSim = useRunSimulation(bucketId)

  const worstScenario = sim
    ? sim.scenarios.reduce((worst, s) =>
        (s.portfolio_drawdown_pct ?? 0) < (worst.portfolio_drawdown_pct ?? 0) ? s : worst,
        sim.scenarios[0],
      )
    : null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('drawdown.title')}</h1>
        <Button onClick={() => runSim.mutate()} loading={runSim.isPending}>
          {runSim.isPending ? t('drawdown.running') : t('drawdown.run')}
        </Button>
      </div>

      {simLoading && <p className="text-gray-500 text-center py-16">{t('common.loading')}</p>}

      {!simLoading && !sim && (
        <p className="text-gray-500 text-center py-16">{t('drawdown.no_data')}</p>
      )}

      {sim && worstScenario && (
        <>
          <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {t('drawdown.worst_case')}: <span className="font-semibold text-danger">{worstScenario.name}</span>
            {' — '}{(worstScenario.portfolio_drawdown_pct ?? 0).toFixed(1)}%
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sim.scenarios.map((s) => (
              <ScenarioCard key={s.name} scenario={s} portfolioValueUsd={sim.portfolio_value_usd} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
