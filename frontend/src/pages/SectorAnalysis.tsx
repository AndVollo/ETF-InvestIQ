import { useTranslation } from 'react-i18next'
import { useBuckets } from '@/api/buckets'
import { useBucketSectors, useRefreshSectors } from '@/api/sectors'
import { useUiStore } from '@/store/uiStore'
import { SectorBar } from '@/components/charts/SectorBar'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function SectorAnalysis() {
  const { t } = useTranslation()
  const { data: bucketsData } = useBuckets()
  const buckets = (bucketsData ?? []).filter((b) => !b.is_archived)
  const activeBucketId = useUiStore((s) => s.activeBucketId)
  const bucketId = activeBucketId ?? buckets[0]?.id ?? 0

  const { data, isLoading } = useBucketSectors(bucketId)
  const refresh = useRefreshSectors(bucketId)

  if (isLoading) return <LoadingSpinner className="py-32" />

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('sectors.title')}</h1>
        <Button variant="secondary" onClick={() => refresh.mutate()} loading={refresh.isPending}>
          {t('sectors.refresh')}
        </Button>
      </div>

      {data?.cap_warnings.map((w) => (
        <div key={w.cap_type} className="mb-3 flex items-center gap-2 text-sm text-danger">
          <Badge color="red">{t('sectors.breach')}</Badge>
          {t(w.message_key as Parameters<typeof t>[0], w.params as Record<string, string | number>)}
        </div>
      ))}

      {data?.hidden_stocks && data.hidden_stocks.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-4">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
            ⚠️ {t('sectors.hidden_stocks_title')}
          </p>
          <ul className="space-y-1 text-sm text-amber-900 dark:text-amber-100">
            {data.hidden_stocks.map((h) => (
              <li key={h.symbol}>
                <span className="font-mono font-semibold">{h.symbol}</span>
                {' — '}
                {t('sectors.hidden_stocks_line', {
                  pct: h.total_exposure_pct.toFixed(2),
                  count: h.appears_in.length,
                  sources: h.appears_in.join(', '),
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!data || data.sector_exposures.length === 0 ? (
        <EmptyState message={t('sectors.no_holdings')} />
      ) : (
        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
          <SectorBar exposures={data.sector_exposures} warnings={data.cap_warnings} />
        </div>
      )}
    </div>
  )
}
