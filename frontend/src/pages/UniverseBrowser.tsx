import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUniverse } from '@/api/universe'
import type { ETFScoreResponse } from '@/types/api'
import { Badge } from '@/components/common/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

type ScoreColor = 'green' | 'yellow' | 'red' | 'gray'

function scoreColor(score: number | null): ScoreColor {
  if (score == null) return 'gray'
  if (score >= 7) return 'green'
  if (score >= 5) return 'yellow'
  return 'red'
}

export default function UniverseBrowser() {
  const { t } = useTranslation()
  const { data, isLoading } = useUniverse()
  const [filter, setFilter] = useState('')

  const allEtfs: ETFScoreResponse[] = data
    ? Object.values(data.buckets).flat()
    : []

  const items = allEtfs.filter(
    (e) =>
      !filter ||
      e.ticker.toLowerCase().includes(filter.toLowerCase()) ||
      e.bucket.toLowerCase().includes(filter.toLowerCase()),
  )

  if (isLoading) return <LoadingSpinner className="py-32" />

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('universe.title')}</h1>

      <div className="mb-4">
        <input
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm bg-white dark:bg-gray-800"
          placeholder="Filter by ticker or category…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 text-xs uppercase">
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">{t('universe.ter')}</th>
              <th className="px-4 py-3">{t('universe.score')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((etf) => (
              <tr key={etf.ticker} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold">{etf.ticker}</td>
                <td className="px-4 py-3 text-gray-500">{etf.bucket}</td>
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
    </div>
  )
}
