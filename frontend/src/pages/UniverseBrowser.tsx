import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useUniverse, useValuation } from '@/api/universe'
import type { ETFScoreResponse } from '@/types/api'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useUiStore } from '@/store/uiStore'
import {
  Card,
  Badge,
  Modal,
  Seg,
  Input,
  Select,
  ValuationBadge,
  Spinner,
  Button,
} from '@/components/design'

function DomicileBadge({ etf }: { etf: ETFScoreResponse }) {
  const { t } = useTranslation()
  if (etf.domicile === 'IE') {
    const key = etf.distribution === 'Accumulating' ? 'badge_ucits_acc' : 'badge_ucits_dist'
    return <Badge variant="success" dot={false}>🇮🇪 {t(`universe.${key}`)}</Badge>
  }
  return <Badge variant="muted" dot={false}>🇺🇸 {t('universe.badge_us_dist')}</Badge>
}

function scoreVariant(score: number | null): 'success' | 'warning' | 'danger' | 'muted' {
  if (score == null) return 'muted'
  if (score >= 7) return 'success'
  if (score >= 5) return 'warning'
  return 'danger'
}

function ScoreRow({ label, value, suffix = '' }: { label: string; value: number | null, suffix?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 0',
        borderBottom: '1px solid var(--border-subtle)',
        fontSize: 13,
      }}
    >
      <span className="text-muted">{label}</span>
      <span className="tnum" style={{ fontWeight: 500 }}>
        {value != null ? value.toFixed(2) : '—'}{suffix}
      </span>
    </div>
  )
}

function ETFDetailModal({ etf, onClose }: { etf: ETFScoreResponse; onClose: () => void }) {
  const { t } = useTranslation()
  const { data: valuation, isLoading: valLoading } = useValuation(etf.ticker)

  return (
    <Modal
      open
      title={<span className="mono">{etf.ticker}</span>}
      onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{etf.name}</div>
        <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
          {etf.bucket} • {etf.ticker}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('universe.ter')}
          </div>
          <div className="tnum" style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>
            {etf.ter != null ? `${(etf.ter * 100).toFixed(3)}%` : '—'}
          </div>
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('universe.inception')}
          </div>
          <div className="tnum" style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>
            {etf.inception || '—'}
          </div>
        </div>
      </div>

      <div>
        <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          {t('universe.compositeScore')}
        </div>
        {etf.composite_score != null ? (
          <Badge variant={scoreVariant(etf.composite_score)}>
            {etf.composite_score?.toFixed(1)} / 10
          </Badge>
        ) : (
          <Badge>{t('common.na')}</Badge>
        )}
      </div>

      <div>
        <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          {t('universe.componentScores')}
        </div>
        {/* Support both component_scores (new) and components (legacy) to prevent crashes during reload/cache mismatch */}
        {(() => {
          const scores = etf.component_scores || (etf as any).components
          return (
            <>
              <ScoreRow label={t('universe.costScore')} value={scores?.cost} />
              <ScoreRow
                label={t('universe.sharpeScore')}
                value={scores?.sharpe_computed ? scores?.sharpe_3y : null}
                suffix={!scores?.sharpe_computed ? ` (${t('universe.insufficientHistory')})` : ''}
              />
              <ScoreRow label={t('universe.trackingError')} value={scores?.tracking_error} />
              <ScoreRow label={t('universe.liquidityAum')} value={scores?.liquidity_aum} />
            </>
          )
        })()}
      </div>

      <div>
        <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          {t('universe.valuation')}
        </div>
        {valLoading ? (
          <Spinner />
        ) : valuation ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ValuationBadge classification={valuation.classification} />
            <ScoreRow label={t('universe.zScore')} value={valuation.z_score} />
            <ScoreRow
              label={t('universe.percentile52w')}
              value={valuation.percentile_52w != null ? valuation.percentile_52w * 100 : null}
            />
            <ScoreRow label={t('universe.sma200Dev')} value={valuation.sma200_deviation} />
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

export default function UniverseBrowser() {
  const { t } = useTranslation()
  const { data, isLoading } = useUniverse()
  const [filter, setFilter] = useState('')
  const [selectedEtf, setSelectedEtf] = useState<ETFScoreResponse | null>(null)
  const [selectedSector, setSelectedSector] = useState<string>('all')
  const [sortConfig, setSortConfig] = useState<{ key: string; order: 'asc' | 'desc' } | null>(null)
  const domicileFilter = useUiStore((s) => s.domicileFilter)
  const setDomicileFilter = useUiStore((s) => s.setDomicileFilter)

  const allEtfs: ETFScoreResponse[] = data ? data.etfs : []

  // Extract unique sectors
  const sectors = Array.from(new Set(allEtfs.map((e) => e.bucket))).sort()

  const handleSort = (key: string) => {
    let order: 'asc' | 'desc' = 'asc'
    if (sortConfig?.key === key && sortConfig.order === 'asc') {
      order = 'desc'
    }
    setSortConfig({ key, order })
  }

  const items = allEtfs.filter((e) => {
    const textMatch =
      !filter ||
      e.ticker.toLowerCase().includes(filter.toLowerCase()) ||
      e.name.toLowerCase().includes(filter.toLowerCase())
    const domicileMatch =
      domicileFilter === 'all' ||
      (domicileFilter === 'ucits' && e.ucits) ||
      (domicileFilter === 'us' && e.domicile === 'US')
    const sectorMatch = selectedSector === 'all' || e.bucket === selectedSector
    return textMatch && domicileMatch && sectorMatch
  })

  const sortedItems = [...items].sort((a, b) => {
    if (!sortConfig) return 0
    const { key, order } = sortConfig
    let valA: any = a[key as keyof ETFScoreResponse]
    let valB: any = b[key as keyof ETFScoreResponse]

    // Special case for TER and Score to handle nulls
    if (valA == null) return order === 'asc' ? 1 : -1
    if (valB == null) return order === 'asc' ? -1 : 1

    if (valA < valB) return order === 'asc' ? -1 : 1
    if (valA > valB) return order === 'asc' ? 1 : -1
    return 0
  })

  if (isLoading) return <div className="content"><LoadingSpinner /></div>

  return (
    <div className="content">
      <div className="content__inner">
        <Card>
          <Card.Header
            title={t('universe.title')}
            subtitle={`${items.length} / ${allEtfs.length}`}
            actions={
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Seg<'all' | 'ucits' | 'us'>
                  value={domicileFilter}
                  onChange={setDomicileFilter}
                  options={[
                    { value: 'all', label: t('universe.filter_domicile_all') },
                    { value: 'ucits', label: t('universe.filter_domicile_ucits') },
                    { value: 'us', label: t('universe.filter_domicile_us') },
                  ]}
                />
                <Link to="/universe/manage">
                  <Button variant="secondary" size="sm">{t('universe.manage')}</Button>
                </Link>
              </div>
            }
          />
          <Card.Body>
            <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
              <div style={{ flex: 2 }}>
                <Input
                  placeholder={t('universe.filterPlaceholder')}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                >
                  <option value="all">{t('universe.filter_all_categories', { defaultValue: 'All Categories' })}</option>
                  {sectors.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th className="is-sortable" onClick={() => handleSort('ticker')}>
                    Ticker {sortConfig?.key === 'ticker' && (sortConfig.order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>{t('universe.category')}</th>
                  <th>{t('universe.domicile')}</th>
                  <th className="num is-sortable" onClick={() => handleSort('ter')}>
                    {t('universe.ter')} {sortConfig?.key === 'ter' && (sortConfig.order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="num is-sortable" onClick={() => handleSort('composite_score')}>
                    {t('universe.score')} {sortConfig?.key === 'composite_score' && (sortConfig.order === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((etf, i) => (
                  <tr
                    key={etf.ticker}
                    className="is-clickable"
                    onClick={() => setSelectedEtf(etf)}
                  >
                    <td className="tnum text-muted">{i + 1}</td>
                    <td className="mono" style={{ fontWeight: 500 }}>{etf.ticker}</td>
                    <td className="text-muted">{etf.bucket}</td>
                    <td><DomicileBadge etf={etf} /></td>
                    <td className="num tnum">
                      {etf.ter != null ? `${(etf.ter * 100).toFixed(2)}%` : t('common.na')}
                    </td>
                    <td className="num">
                      {etf.composite_score != null ? (
                        <Badge variant={scoreVariant(etf.composite_score)}>
                          {etf.composite_score?.toFixed(1)}
                        </Badge>
                      ) : (
                        <Badge>{t('common.na')}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card.Body>
        </Card>

        {selectedEtf && (
          <ETFDetailModal etf={selectedEtf} onClose={() => setSelectedEtf(null)} />
        )}
      </div>
    </div>
  )
}
