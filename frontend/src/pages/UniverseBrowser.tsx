import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUniverse, useValuation } from '@/api/universe'
import type { ETFScoreResponse } from '@/types/api'
import { Badge } from '@/components/common/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Modal } from '@/components/common/Modal'
import { useUiStore } from '@/store/uiStore'

type ScoreColor = 'green' | 'yellow' | 'red' | 'gray'

function DomicileBadge({ etf }: { etf: ETFScoreResponse }) {
  const { t } = useTranslation()
  if (etf.domicile === 'IE') {
    const key = etf.distribution === 'Accumulating' ? 'badge_ucits_acc' : 'badge_ucits_dist'
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        🇮🇪 {t(`universe.${key}`)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      🇺🇸 {t('universe.badge_us_dist')}
    </span>
  )
}

function scoreColor(score: number | null): ScoreColor {
  if (score == null) return 'gray'
  if (score >= 7) return 'green'
  if (score >= 5) return 'yellow'
  return 'red'
}

function valuationColor(cls: string | undefined): ScoreColor {
  if (cls === 'CHEAP') return 'green'
  if (cls === 'FAIR') return 'yellow'
  if (cls === 'EXPENSIVE') return 'red'
  return 'gray'
}

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {value != null ? value.toFixed(2) : '—'}
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
      title={etf.ticker}
      onClose={onClose}
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          {t('common.close')}
        </button>
      }
    >
      <div className="space-y-4">
        {/* Basic info */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('universe.category')}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{etf.bucket}</p>
        </div>

        {etf.ter != null && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('universe.ter')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {(etf.ter * 100).toFixed(3)}%
            </p>
          </div>
        )}

        {/* Composite score */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t('universe.compositeScore')}</p>
          {etf.composite_score != null ? (
            <Badge color={scoreColor(etf.composite_score)} className="text-base px-3 py-1">
              {etf.composite_score.toFixed(1)} / 10
            </Badge>
          ) : (
            <Badge color="gray">{t('common.na')}</Badge>
          )}
        </div>

        {/* Component scores breakdown */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t('universe.componentScores')}</p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <ScoreRow label={t('universe.costScore')} value={etf.component_scores.cost} />
            <ScoreRow label={t('universe.sharpeScore')} value={etf.component_scores.sharpe_3y} />
            <ScoreRow label={t('universe.trackingError')} value={etf.component_scores.tracking_error} />
            <ScoreRow label={t('universe.liquidityAum')} value={etf.component_scores.liquidity_aum} />
          </div>
        </div>

        {/* Valuation section */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t('universe.valuation')}</p>
          {valLoading ? (
            <LoadingSpinner size="sm" />
          ) : valuation ? (
            <div className="space-y-2">
              <Badge color={valuationColor(valuation.classification)}>
                {valuation.classification}
              </Badge>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mt-2">
                <ScoreRow label={t('universe.zScore')} value={valuation.z_score} />
                <ScoreRow
                  label={t('universe.percentile52w')}
                  value={valuation.percentile_52w != null ? valuation.percentile_52w * 100 : null}
                />
                <ScoreRow label={t('universe.sma200Dev')} value={valuation.sma200_deviation} />
              </div>
              {valuation.stale && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  {t('common.dataStale')}
                </p>
              )}
            </div>
          ) : null}
        </div>

        {etf.stale && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400">{t('common.dataStale')}</p>
        )}
      </div>
    </Modal>
  )
}

export default function UniverseBrowser() {
  const { t } = useTranslation()
  const { data, isLoading } = useUniverse()
  const [filter, setFilter] = useState('')
  const [selectedEtf, setSelectedEtf] = useState<ETFScoreResponse | null>(null)
  const domicileFilter = useUiStore((s) => s.domicileFilter)
  const setDomicileFilter = useUiStore((s) => s.setDomicileFilter)

  const allEtfs: ETFScoreResponse[] = data
    ? Object.values(data.buckets).flat()
    : []

  const items = allEtfs.filter((e) => {
    const textMatch =
      !filter ||
      e.ticker.toLowerCase().includes(filter.toLowerCase()) ||
      e.bucket.toLowerCase().includes(filter.toLowerCase())
    const domicileMatch =
      domicileFilter === 'all' ||
      (domicileFilter === 'ucits' && e.ucits) ||
      (domicileFilter === 'us' && e.domicile === 'US')
    return textMatch && domicileMatch
  })

  if (isLoading) return <LoadingSpinner className="py-32" />

  const filterButton = (value: typeof domicileFilter, label: string) => (
    <button
      onClick={() => setDomicileFilter(value)}
      className={`px-3 py-1.5 text-xs rounded-md border ${
        domicileFilter === value
          ? 'bg-primary-600 text-white border-primary-600'
          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('universe.title')}</h1>

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <input
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm bg-white dark:bg-gray-800"
          placeholder={t('universe.filterPlaceholder')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="flex gap-2">
          {filterButton('all', t('universe.filter_domicile_all'))}
          {filterButton('ucits', t('universe.filter_domicile_ucits'))}
          {filterButton('us', t('universe.filter_domicile_us'))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 text-xs uppercase">
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">{t('universe.category')}</th>
              <th className="px-4 py-3">{t('universe.domicile')}</th>
              <th className="px-4 py-3">{t('universe.ter')}</th>
              <th className="px-4 py-3">{t('universe.score')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((etf) => (
              <tr
                key={etf.ticker}
                onClick={() => setSelectedEtf(etf)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 font-mono font-semibold">{etf.ticker}</td>
                <td className="px-4 py-3 text-gray-500">{etf.bucket}</td>
                <td className="px-4 py-3"><DomicileBadge etf={etf} /></td>
                <td className="px-4 py-3">
                  {etf.ter != null ? `${(etf.ter * 100).toFixed(2)}%` : t('common.na')}
                </td>
                <td className="px-4 py-3">
                  {etf.composite_score != null ? (
                    <Badge color={scoreColor(etf.composite_score)}>
                      {etf.composite_score.toFixed(1)}
                    </Badge>
                  ) : (
                    <Badge color="gray">{t('common.na')}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedEtf && (
        <ETFDetailModal etf={selectedEtf} onClose={() => setSelectedEtf(null)} />
      )}
    </div>
  )
}
