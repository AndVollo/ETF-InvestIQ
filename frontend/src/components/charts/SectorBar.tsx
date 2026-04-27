import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { SectorExposureItem, CapWarning } from '@/types/api'

interface SectorBarProps {
  exposures: SectorExposureItem[]
  warnings: CapWarning[]
  compact?: boolean
}

export function SectorBar({ exposures, warnings, compact = false }: SectorBarProps) {
  const { t } = useTranslation()
  const warnedSectors = new Set(warnings.map((w) => w.cap_type))

  const data = exposures.map((e) => ({
    sector: compact ? e.sector.slice(0, 10) : e.sector,
    pct: Number(e.pct.toFixed(1)),
    estimated: e.data_estimated,
    warned: warnedSectors.has(e.sector),
  }))

  return (
    <ResponsiveContainer width="100%" height={compact ? 160 : Math.max(200, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: compact ? 60 : 80, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="sector"
          width={compact ? 60 : 80}
          tick={{ fontSize: compact ? 10 : 12 }}
        />
        <Tooltip
          formatter={(v: number, _: string, item) => [
            `${v}%${item.payload.estimated ? ` ${t('sectors.data_estimated')}` : ''}`,
            t('sectors.exposure'),
          ]}
        />
        <ReferenceLine x={15} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'REIT cap', position: 'insideTopRight', fontSize: 10 }} />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <rect key={i} fill={entry.warned ? '#dc2626' : '#1e40af'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
