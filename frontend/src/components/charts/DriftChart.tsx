import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { HoldingDriftItem } from '@/types/api'
import { EmptyState } from '@/components/common/EmptyState'
import { formatPercent } from '@/utils/formatting'

interface DriftChartProps {
  holdings: HoldingDriftItem[]
}

export function DriftChart({ holdings }: DriftChartProps) {
  const { t } = useTranslation()

  if (holdings.length === 0) {
    return <EmptyState message={t('buckets.no_holdings')} />
  }

  const data = holdings.map((h) => ({
    ticker: h.ticker,
    drift: Number(h.drift_pct.toFixed(2)),
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => `${v}%`}
          domain={['auto', 'auto']}
          tick={{ fontSize: 11 }}
        />
        <YAxis type="category" dataKey="ticker" width={60} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => [formatPercent(v), t('dashboard.drift_chart_title')]} />
        <ReferenceLine x={0} stroke="#6b7280" strokeDasharray="4 2" />
        <Bar dataKey="drift" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.drift >= 0 ? '#10b981' : '#dc2626'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
