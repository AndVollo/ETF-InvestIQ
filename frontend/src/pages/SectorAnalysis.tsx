import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuckets } from '@/api/buckets'
import { useBucketSectors, useRefreshSectors } from '@/api/sectors'
import { useUiStore } from '@/store/uiStore'
import { SectorBar } from '@/components/charts/SectorBar'
import { Card, Button, Badge, Icon } from '@/components/design'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function SectorAnalysis() {
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

  const { data, isLoading } = useBucketSectors(bucketId)
  const refresh = useRefreshSectors(bucketId)

  if (isLoading) return <div className="content"><LoadingSpinner /></div>

  return (
    <div className="content">
      <div className="content__inner">
        <Card>
          <Card.Header
            title={t('sectors.title')}
            subtitle={`Effective exposure (sector × ETF weight)`}
            actions={
              <Button variant="secondary" size="sm" onClick={() => refresh.mutate()} loading={refresh.isPending}>
                <Icon name="refresh" size={12} /> {t('sectors.refresh')}
              </Button>
            }
          />
          <Card.Body>
            {data?.cap_warnings && data.cap_warnings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {data.cap_warnings.map((w) => (
                  <div key={w.cap_type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge variant="danger">{t('sectors.breach')}</Badge>
                    <span style={{ fontSize: 13 }}>
                      {t(w.message_key as Parameters<typeof t>[0], w.params as Record<string, string | number>)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {!data || data.sector_exposures.length === 0 ? (
              <EmptyState message={t('sectors.no_holdings')} />
            ) : (
              <SectorBar exposures={data.sector_exposures} warnings={data.cap_warnings} />
            )}
          </Card.Body>
        </Card>

        {data?.hidden_stocks && data.hidden_stocks.length > 0 ? (
          <Card>
            <Card.Header
              title={t('sectors.hidden_stocks_title')}
              subtitle="Same names appear in multiple ETFs."
            />
            <Card.Body>
              <table className="table">
                <thead>
                  <tr>
                    <th>Stock</th>
                    <th>Found in</th>
                    <th className="num">Effective weight</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hidden_stocks.map((h) => (
                    <tr key={h.symbol}>
                      <td>{h.symbol}</td>
                      <td>
                        {h.appears_in.map((s) => (
                          <span key={s} className="mono" style={{ marginInlineEnd: 6 }}>{s}</span>
                        ))}
                      </td>
                      <td className="num tnum">{h.total_exposure_pct.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card.Body>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
