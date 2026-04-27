import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { DriftChart } from '@/components/charts/DriftChart'
import type { HoldingDriftItem } from '@/types/api'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
}))

const makeHolding = (ticker: string, current_pct: number, target_pct: number): HoldingDriftItem => ({
  id: 1,
  ticker,
  current_pct,
  target_pct,
  drift_pct: current_pct - target_pct,
  current_value_usd: 1000,
  units: 10,
  avg_cost_usd: 100,
  current_price_usd: 100,
  notes: null,
})

describe('DriftChart', () => {
  it('shows empty state when no holdings', () => {
    const { getByText } = render(<DriftChart holdings={[]} />)
    expect(getByText('buckets.no_holdings')).toBeInTheDocument()
  })

  it('renders bar chart when holdings provided', () => {
    const holdings = [makeHolding('VTI', 62, 60), makeHolding('BND', 38, 40)]
    const { getByTestId } = render(<DriftChart holdings={holdings} />)
    expect(getByTestId('bar-chart')).toBeInTheDocument()
  })
})
