import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useBuckets, useBucketHoldings, useBucketSummary } from '@/api/buckets'
import { useBucketSectors } from '@/api/sectors'
import { useUiStore } from '@/store/uiStore'
import { DriftChart } from '@/components/charts/DriftChart'
import { SectorBar } from '@/components/charts/SectorBar'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/common/Button'
import { formatCurrency } from '@/utils/formatting'

function BucketSelector() {
  const { t } = useTranslation()
  const { data } = useBuckets()
  const activeBucketId = useUiStore((s) => s.activeBucketId)
  const setActiveBucketId = useUiStore((s) => s.setActiveBucketId)
  const buckets = data ?? []

  if (buckets.length === 0) return null

  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.select_bucket')}</span>
      <select
        className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-800"
        value={activeBucketId ?? ''}
        onChange={(e) => setActiveBucketId(e.target.value ? Number(e.target.value) : null)}
      >
        {buckets.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
  )
}

function SummaryCards({ bucketId }: { bucketId: number }) {
  const { t } = useTranslation()
  const { data, isLoading } = useBucketSummary(bucketId)

  if (isLoading) return <LoadingSpinner className="py-8" />
  if (!data) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('dashboard.portfolio_value')}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {data.total_value_ils != null
            ? formatCurrency(data.total_value_ils, 'ILS')
            : formatCurrency(data.total_value_usd, 'USD')}
        </p>
      </div>
      <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('dashboard.goal_progress')}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {data.goal_progress_pct != null ? `${data.goal_progress_pct.toFixed(1)}%` : t('common.na')}
        </p>
      </div>
      <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('buckets.target_date')}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {data.target_date ?? t('common.na')}
        </p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { data: bucketsData, isLoading: bucketsLoading } = useBuckets()
  const activeBucketId = useUiStore((s) => s.activeBucketId)
  const buckets = bucketsData ?? []

  const resolvedId = activeBucketId ?? buckets[0]?.id ?? 0

  const { data: holdingsData } = useBucketHoldings(resolvedId)
  const { data: sectorsData } = useBucketSectors(resolvedId)

  if (bucketsLoading) return <LoadingSpinner className="py-32" />

  if (buckets.length === 0) {
    return (
      <EmptyState
        message={t('dashboard.no_buckets')}
        action={
          <Link to="/buckets">
            <Button>{t('dashboard.create_first')}</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('dashboard.title')}</h1>
      <BucketSelector />
      {resolvedId > 0 && <SummaryCards bucketId={resolvedId} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('dashboard.drift_chart_title')}
          </h2>
          <DriftChart holdings={holdingsData?.holdings ?? []} />
        </div>

        <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('dashboard.sector_snapshot')}
            </h2>
            <Link to="/sectors" className="text-xs text-primary-600 hover:underline">
              {t('dashboard.view_all_sectors')}
            </Link>
          </div>
          {sectorsData && sectorsData.sector_exposures.length > 0 ? (
            <SectorBar
              exposures={sectorsData.sector_exposures.slice(0, 5)}
              warnings={sectorsData.cap_warnings}
              compact
            />
          ) : (
            <p className="text-sm text-gray-400 py-6 text-center">{t('sectors.no_holdings')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
