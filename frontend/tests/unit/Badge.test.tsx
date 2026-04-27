import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Badge } from '@/components/common/Badge'

describe('Badge', () => {
  it('renders text', () => {
    const { getByText } = render(<Badge>Active</Badge>)
    expect(getByText('Active')).toBeInTheDocument()
  })

  it('applies green color classes', () => {
    const { container } = render(<Badge color="green">OK</Badge>)
    expect(container.firstChild).toHaveClass('bg-green-100')
  })

  it('applies red color classes', () => {
    const { container } = render(<Badge color="red">Error</Badge>)
    expect(container.firstChild).toHaveClass('bg-red-100')
  })

  it('defaults to gray', () => {
    const { container } = render(<Badge>Neutral</Badge>)
    expect(container.firstChild).toHaveClass('bg-gray-100')
  })
})
