import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useBuckets, useBucketHoldings, useBucketSummary } from '@/api/buckets'
import { useBucketSectors } from '@/api/sectors'
import { useUiStore } from '@/store/uiStore'
import { DriftChart } from '@/components/charts/DriftChart'
import { SectorBar } from '@/components/charts/SectorBar'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { Card, Button, Badge, ValuationBadge } from '@/components/design'
import { formatCurrency } from '@/utils/formatting'

function KPIStrip({ bucketId }: { bucketId: number }) {
  const { t } = useTranslation()
  const { data, isLoading } = useBucketSummary(bucketId)

  if (isLoading) return null
  if (!data) return null

  const portfolioValue =
    data.total_value_ils != null
      ? formatCurrency(data.total_value_ils, 'ILS')
      : formatCurrency(data.total_value_usd, 'USD')
  const portfolioSub =
    data.total_value_ils != null && data.total_value_usd
      ? `≈ ${formatCurrency(data.total_value_usd, 'USD')}`
      : ''

  return (
    <Card>
      <div className="kpi-strip kpi-strip--3">
        <div className="kpi">
          <div className="kpi__label">{t('dashboard.portfolio_value')}</div>
          <div className="kpi__value">{portfolioValue}</div>
          {portfolioSub ? <div className="kpi__sub">{portfolioSub}</div> : null}
        </div>
        <div className="kpi">
          <div className="kpi__label">{t('dashboard.goal_progress')}</div>
          <div className="kpi__value">
            {data.goal_progress_pct != null ? `${data.goal_progress_pct.toFixed(1)}%` : t('common.na')}
          </div>
          {data.target_amount != null ? (
            <div className="kpi__sub">
              {t('buckets.target_amount')}: {formatCurrency(data.target_amount, data.target_currency as 'USD' | 'ILS')}
            </div>
          ) : null}
        </div>
        <div className="kpi">
          <div className="kpi__label">{t('dashboard.target_date')}</div>
          <div className="kpi__value">{data.target_date ?? t('common.na')}</div>
          <div className="kpi__sub">{t('dashboard.total_holdings')}: {data.holdings_count}</div>
        </div>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { data: bucketsData, isLoading: bucketsLoading } = useBuckets()
  const activeBucketId = useUiStore((s) => s.activeBucketId)
  const setActiveBucketId = useUiStore((s) => s.setActiveBucketId)
  const showValuation = useUiStore((s) => s.showValuation)
  const buckets = (bucketsData ?? []).filter((b) => !b.is_archived)
  const resolvedId = activeBucketId ?? buckets[0]?.id ?? 0

  // Auto-set the first bucket as active if none chosen yet or if active ID is invalid for this user
  useEffect(() => {
    if (buckets.length > 0) {
      const isValid = activeBucketId != null && buckets.some(b => b.id === activeBucketId)
      // Only auto-set if we have NO bucket chosen. 
      // If we HAVE an ID but it's not in the list yet, we might be waiting for cache invalidation.
      if (activeBucketId === null) {
        setActiveBucketId(buckets[0].id)
      }
    }
  }, [activeBucketId, buckets, setActiveBucketId])

  const { data: holdingsData } = useBucketHoldings(resolvedId)
  const { data: sectorsData } = useBucketSectors(resolvedId)

  if (bucketsLoading) return <div className="content"><LoadingSpinner /></div>

  if (buckets.length === 0) {
    return (
      <div className="content">
        <div className="content__inner">
          <Card>
            <Card.Body>
              <EmptyState
                title={t('dashboard.no_buckets')}
                message={t('dashboard.create_first')}
                action={
                  <Link to="/buckets">
                    <Button>{t('dashboard.create_first')}</Button>
                  </Link>
                }
              />
            </Card.Body>
          </Card>
        </div>
      </div>
    )
  }

  const holdings = holdingsData?.holdings ?? []

  return (
    <div className="content">
      <div className="content__inner">
        {resolvedId > 0 && <KPIStrip bucketId={resolvedId} />}

        <Card>
          <Card.Header
            title={t('dashboard.drift_chart_title')}
            subtitle={t('dashboard.drift_chart_subtitle')}
          />
          <Card.Body>
            <DriftChart holdings={holdings} />
          </Card.Body>
        </Card>

        <div className="grid-3-1">
          <Card>
            <Card.Header
              title={t('dashboard.sector_snapshot')}
              subtitle={t('dashboard.sector_snapshot_subtitle')}
              actions={
                <Link to="/sectors" style={{ fontSize: 12 }}>
                  {t('dashboard.view_all_sectors')}
                </Link>
              }
            />
            <Card.Body>
              {sectorsData && sectorsData.sector_exposures.length > 0 ? (
                <SectorBar
                  exposures={sectorsData.sector_exposures.slice(0, 6)}
                  warnings={sectorsData.cap_warnings}
                  compact
                />
              ) : (
                <EmptyState message={t('sectors.no_holdings')} />
              )}
            </Card.Body>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {showValuation && holdings.length > 0 ? (
              <Card>
                <Card.Header
                  title={t('dashboard.valuation_title')}
                  subtitle={t('dashboard.valuation_subtitle')}
                />
                <Card.Body>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {holdings.map((h) => {
                      const cls = (h as unknown as { valuation_classification?: string }).valuation_classification
                      return (
                        <div key={h.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{h.ticker}</span>
                          <ValuationBadge classification={cls ?? 'FAIR'} />
                        </div>
                      )
                    })}
                  </div>
                </Card.Body>
              </Card>
            ) : null}

            {sectorsData && sectorsData.cap_warnings.length > 0 ? (
              <Card>
                <Card.Body>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sectorsData.cap_warnings.map((w) => (
                      <div key={w.cap_type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Badge variant="danger">{t('sectors.breach')}</Badge>
                        <span style={{ fontSize: 12 }}>
                          {t(w.message_key as Parameters<typeof t>[0], w.params as Record<string, string | number>)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
