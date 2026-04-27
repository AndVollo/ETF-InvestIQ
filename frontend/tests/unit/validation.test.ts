import { describe, it, expect } from 'vitest'
import {
  isPositiveNumber,
  isValidTicker,
  allocationSumsTo100,
  isValidDate,
  isFutureDate,
  clamp,
} from '@/utils/validation'

describe('isPositiveNumber', () => {
  it('returns true for positive integer', () => expect(isPositiveNumber(5)).toBe(true))
  it('returns true for positive float', () => expect(isPositiveNumber(0.01)).toBe(true))
  it('returns false for zero', () => expect(isPositiveNumber(0)).toBe(false))
  it('returns false for negative', () => expect(isPositiveNumber(-1)).toBe(false))
  it('returns false for NaN', () => expect(isPositiveNumber(NaN)).toBe(false))
  it('returns false for string', () => expect(isPositiveNumber('5')).toBe(false))
})

describe('isValidTicker', () => {
  it('accepts valid tickers', () => {
    expect(isValidTicker('VTI')).toBe(true)
    expect(isValidTicker('AVUV')).toBe(true)
    expect(isValidTicker('BND')).toBe(true)
  })
  it('accepts lowercase (normalizes internally)', () => expect(isValidTicker('vti')).toBe(true))
  it('rejects numbers', () => expect(isValidTicker('VT1')).toBe(false))
  it('rejects empty string', () => expect(isValidTicker('')).toBe(false))
  it('rejects more than 6 chars', () => expect(isValidTicker('TOOLONG')).toBe(false))
})

describe('allocationSumsTo100', () => {
  it('passes when sum is exactly 100', () => {
    expect(allocationSumsTo100({ VTI: 60, BND: 40 })).toBe(true)
  })
  it('passes within tolerance', () => {
    expect(allocationSumsTo100({ VTI: 60, BND: 39.995 })).toBe(true)
  })
  it('fails when sum is wrong', () => {
    expect(allocationSumsTo100({ VTI: 60, BND: 30 })).toBe(false)
  })
  it('handles empty allocation', () => {
    expect(allocationSumsTo100({})).toBe(false)
  })
})

describe('isValidDate', () => {
  it('accepts ISO date string', () => expect(isValidDate('2026-04-26')).toBe(true))
  it('rejects garbage string', () => expect(isValidDate('not-a-date')).toBe(false))
  it('rejects empty string', () => expect(isValidDate('')).toBe(false))
})

describe('isFutureDate', () => {
  it('returns true for a far future date', () => expect(isFutureDate('2050-01-01')).toBe(true))
  it('returns false for a past date', () => expect(isFutureDate('2000-01-01')).toBe(false))
})

describe('clamp', () => {
  it('clamps below min', () => expect(clamp(-5, 0, 100)).toBe(0))
  it('clamps above max', () => expect(clamp(150, 0, 100)).toBe(100))
  it('passes through in-range values', () => expect(clamp(50, 0, 100)).toBe(50))
})
