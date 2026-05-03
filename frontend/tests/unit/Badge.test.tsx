import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Badge } from '@/components/common/Badge'

describe('Badge', () => {
  it('renders text', () => {
    const { getByText } = render(<Badge>Active</Badge>)
    expect(getByText('Active')).toBeInTheDocument()
  })

  it('applies green (success) variant class', () => {
    const { container } = render(<Badge color="green">OK</Badge>)
    expect(container.firstChild).toHaveClass('badge--success')
  })

  it('applies red (danger) variant class', () => {
    const { container } = render(<Badge color="red">Error</Badge>)
    expect(container.firstChild).toHaveClass('badge--danger')
  })

  it('defaults to muted variant', () => {
    const { container } = render(<Badge>Neutral</Badge>)
    expect(container.firstChild).toHaveClass('badge--muted')
  })
})
