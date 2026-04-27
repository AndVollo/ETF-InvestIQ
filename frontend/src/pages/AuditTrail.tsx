import { useTranslation } from 'react-i18next'
import { useBuckets } from '@/api/buckets'
import { useDepositHistory } from '@/api/deposits'
import { useUiStore } from '@/store/uiStore'
import { Badge } from '@/components/common/Badge'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDate, formatCurrency } from '@/utils/formatting'

export default function AuditTrail() {
  const { t } = useTranslation()
  const { data: bucketsData } = useBuckets()
  const buckets = (bucketsData ?? []).filter((b) => !b.is_archived)
  const activeBucketId = useUiStore((s) => s.activeBucketId)
  const bucketId = activeBucketId ?? buckets[0]?.id ?? 0

  const { data: history } = useDepositHistory(bucketId)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('audit.title')}</h1>

      {!history || history.length === 0 ? (
        <EmptyState message={t('audit.no_history')} />
      ) : (
        <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
          {history.map((entry) => (
            <div key={entry.id} className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Badge color="blue">{t('audit.type_deposit')}</Badge>
                  <span className="text-sm text-gray-500">{formatDate(entry.created_at)}</span>
                </div>
                <span className="font-semibold text-sm">{formatCurrency(entry.amount, 'USD')}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('audit.orders')}: {entry.orders.length}
              </p>
              {entry.obsidian_file_path && (
                <p className="text-xs text-gray-400 mt-1">
                  {t('deposit.obsidian_written', { path: entry.obsidian_file_path })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
