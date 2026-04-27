import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Button } from '@/components/common/Button'

describe('Button', () => {
  it('renders children', () => {
    const { getByText } = render(<Button>Click me</Button>)
    expect(getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    const { getByText } = render(<Button onClick={onClick}>Go</Button>)
    fireEvent.click(getByText('Go'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when loading', () => {
    const { getByRole } = render(<Button loading>Save</Button>)
    expect(getByRole('button')).toBeDisabled()
  })

  it('shows spinner when loading', () => {
    const { container } = render(<Button loading>Save</Button>)
    expect(container.querySelector('.animate-spin')).toBeTruthy()
  })

  it('applies danger variant classes', () => {
    const { getByRole } = render(<Button variant="danger">Delete</Button>)
    expect(getByRole('button').className).toContain('bg-danger')
  })
})
