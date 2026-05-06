import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useUniverse, useValuation, useETFDetail } from '@/api/universe'
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
  const { t, i18n } = useTranslation()
  const { data: detail, isLoading: detailLoading } = useETFDetail(etf.ticker)
  const { data: valuation, isLoading: valLoading } = useValuation(etf.ticker)

  const description = i18n.language === 'he' ? etf.description_he : etf.description_en

  return (
    <Modal
      open
      title={<span className="mono">{etf.ticker}</span>}
      onClose={onClose}
      width="900px"
      minHeight="700px"
      footer={<Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>}
    >
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{etf.name}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <Badge variant="muted">{etf.bucket}</Badge>
          <DomicileBadge etf={etf} />
        </div>
        {description && (
          <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {description}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Performance section */}
          <div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              {t('universe.performance', { defaultValue: 'Performance & Returns' })}
            </div>
            {detailLoading ? <Spinner /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {detail?.returns.map(r => (
                  <Card key={r.period} style={{ padding: '8px', textAlign: 'center', background: 'var(--bg-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{r.period}</div>
                    <div className="tnum" style={{ 
                      fontSize: 13, 
                      fontWeight: 600, 
                      color: r.value != null ? (r.value >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)'
                    }}>
                      {r.value != null ? `${r.value > 0 ? '+' : ''}${r.value.toFixed(1)}%` : '—'}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Holdings section */}
          <div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              {t('universe.topHoldings', { defaultValue: 'Top 10 Holdings' })}
            </div>
            {detailLoading ? <Spinner /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {detail?.top_holdings.map((h, idx) => (
                  <div key={h.symbol || idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 4, background: idx % 2 === 0 ? 'transparent' : 'var(--bg-subtle)', fontSize: 13 }}>
                    <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
                      <span className="mono text-muted" style={{ width: 45, flexShrink: 0 }}>{h.symbol}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
                    </div>
                    <span className="tnum" style={{ fontWeight: 500, flexShrink: 0 }}>{h.weight.toFixed(2)}%</span>
                  </div>
                ))}
                {detail?.top_holdings.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>{t('common.noData')}</div>}
              </div>
            )}
          </div>

          {/* Sector Exposure */}
          <div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              {t('universe.sectors', { defaultValue: 'Sector Exposure' })}
            </div>
            {detailLoading ? <Spinner /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(detail?.sector_weights || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([sector, pct]) => (
                    <div key={sector}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span className="text-secondary">{sector}</span>
                        <span className="tnum">{pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', opacity: 0.7 }} />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Key Stats Card */}
          <Card style={{ background: 'var(--bg-subtle)', border: 'none' }}>
            <Card.Body>
              <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                {t('universe.keyStats', { defaultValue: 'Key Statistics' })}
              </div>
              <ScoreRow label={t('universe.ter')} value={etf.ter != null ? etf.ter * 100 : null} suffix="%" />
              <ScoreRow label={t('universe.aum', { defaultValue: 'AUM' })} value={etf.aum_b} suffix="B" />
              <ScoreRow label={t('universe.inception')} value={null} suffix={etf.inception || '—'} />
              
              <div style={{ marginTop: 16 }}>
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
            </Card.Body>
          </Card>

          {/* Valuation section */}
          <div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
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
                  value={valuation.percentile_52w}
                  suffix="%"
                />
              </div>
            ) : null}
          </div>

          {/* Component Scores */}
          <div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              {t('universe.componentScores')}
            </div>
            {(() => {
              const scores = etf.component_scores || (etf as any).components
              return (
                <>
                  <ScoreRow label={t('universe.costScore')} value={scores?.cost} />
                  <ScoreRow
                    label={t('universe.sharpeScore')}
                    value={scores?.sharpe_computed ? scores?.sharpe_3y : null}
                  />
                  <ScoreRow label={t('universe.trackingError')} value={scores?.tracking_error} />
                  <ScoreRow label={t('universe.liquidityAum')} value={scores?.liquidity_aum} />
                </>
              )
            })()}
          </div>
        </div>
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
