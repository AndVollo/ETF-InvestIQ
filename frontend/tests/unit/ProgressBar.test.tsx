import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ProgressBar } from '@/components/common/ProgressBar'

describe('ProgressBar', () => {
  it('renders a progressbar role element', () => {
    const { getByRole } = render(<ProgressBar value={50} />)
    expect(getByRole('progressbar')).toBeInTheDocument()
  })

  it('sets aria-valuenow correctly', () => {
    const { getByRole } = render(<ProgressBar value={75} max={100} />)
    expect(getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75')
  })

  it('clamps value above max to 100%', () => {
    const { getByRole } = render(<ProgressBar value={150} max={100} />)
    const bar = getByRole('progressbar')
    expect(bar.getAttribute('style')).toContain('width: 100%')
  })

  it('clamps value below 0 to 0%', () => {
    const { getByRole } = render(<ProgressBar value={-10} />)
    const bar = getByRole('progressbar')
    expect(bar.getAttribute('style')).toContain('width: 0%')
  })

  it('shows label when showLabel is true', () => {
    const { getByText } = render(<ProgressBar value={60} showLabel />)
    expect(getByText('60%')).toBeInTheDocument()
  })

  it('does not show label by default', () => {
    const { queryByText } = render(<ProgressBar value={60} />)
    expect(queryByText('60%')).toBeNull()
  })
})
