import { describe, it, expect } from 'vitest'
import { formatCurrency, formatPercent, formatDate, formatNumber } from '@/utils/formatting'

describe('formatCurrency', () => {
  it('formats USD', () => {
    const result = formatCurrency(1000, 'USD', 'en-US')
    expect(result).toContain('1,000')
  })

  it('formats ILS', () => {
    const result = formatCurrency(5000, 'ILS', 'he-IL')
    expect(result).toContain('5,000')
  })

  it('rounds to zero decimal places', () => {
    const result = formatCurrency(1000.99, 'USD', 'en-US')
    expect(result).not.toContain('.')
  })
})

describe('formatPercent', () => {
  it('adds + prefix for positive values', () => {
    expect(formatPercent(3.5)).toBe('+3.5%')
  })

  it('does not add + prefix for negative values', () => {
    expect(formatPercent(-2.1)).toBe('-2.1%')
  })

  it('respects fractionDigits', () => {
    expect(formatPercent(1.234, 2)).toBe('+1.23%')
  })

  it('handles zero', () => {
    expect(formatPercent(0)).toBe('+0.0%')
  })
})

describe('formatNumber', () => {
  it('formats to 2 decimal places by default', () => {
    expect(formatNumber(3.14159)).toBe('3.14')
  })

  it('respects custom fractionDigits', () => {
    expect(formatNumber(3.14159, 4)).toBe('3.1416')
  })
})

describe('formatDate', () => {
  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatDate('2026-04-26', 'en-US')
    expect(result.length).toBeGreaterThan(0)
    expect(result).toContain('2026')
  })
})
