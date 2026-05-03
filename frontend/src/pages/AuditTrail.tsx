import { useTranslation } from 'react-i18next'
import { useBuckets } from '@/api/buckets'
import { useDepositHistory } from '@/api/deposits'
import { useUiStore } from '@/store/uiStore'
import { Card, Badge, Button } from '@/components/design'
import { EmptyState } from '@/components/common/EmptyState'
import { formatDate, formatCurrency } from '@/utils/formatting'

export default function AuditTrail() {
  const { t } = useTranslation()
  const { data: bucketsData } = useBuckets()
  const buckets = (bucketsData ?? []).filter((b) => !b.is_archived)
  const activeBucketId = useUiStore((s) => s.activeBucketId)
  const bucketId = activeBucketId ?? buckets[0]?.id ?? 0
  const activeBucket = buckets.find((b) => b.id === bucketId)

  const { data: history } = useDepositHistory(bucketId)

  return (
    <div className="content">
      <div className="content__inner">
        <Card>
          <Card.Body flush>
            {!history || history.length === 0 ? (
              <div style={{ padding: 24 }}>
                <EmptyState message={t('audit.no_history')} />
              </div>
            ) : (
              history.map((entry, i) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 140px 1fr auto',
                    gap: 16,
                    padding: '16px 24px',
                    borderBottom:
                      i < history.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    alignItems: 'center',
                  }}
                >
                  <div className="tnum text-muted" style={{ fontSize: 12 }}>
                    {formatDate(entry.created_at)}
                  </div>
                  <div>
                    <Badge variant="info">{t('audit.type_deposit')}</Badge>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {activeBucket?.name ?? `Portfolio #${entry.bucket_id}`}
                    </div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {formatCurrency(entry.amount, (entry.currency as 'USD' | 'ILS') || 'USD')} · {entry.orders.length} {t('audit.orders')}
                    </div>
                  </div>
                  <div>
                    {entry.obsidian_file_path ? (
                      <Button variant="ghost" size="sm">{t('audit.open_obsidian')}</Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}
