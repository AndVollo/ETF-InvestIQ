import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { DriftChart } from '@/components/charts/DriftChart'
import type { HoldingDriftItem } from '@/types/api'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

vi.mock('@/store/uiStore', () => ({
  useUiStore: (selector: (s: { driftVariant: 'diverging' | 'tick' | 'stacked'; showValuation: boolean }) => unknown) =>
    selector({ driftVariant: 'diverging', showValuation: true }),
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

  it('renders a row per holding when holdings provided', () => {
    const holdings = [makeHolding('VTI', 62, 60), makeHolding('BND', 38, 40)]
    const { container, getByText } = render(<DriftChart holdings={holdings} />)
    expect(container.querySelectorAll('.drift-row')).toHaveLength(2)
    expect(getByText('VTI')).toBeInTheDocument()
    expect(getByText('BND')).toBeInTheDocument()
  })
})
