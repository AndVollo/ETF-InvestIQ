import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDirection } from '@/hooks/useDirection'

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}))

import { useTranslation } from 'react-i18next'

describe('useDirection', () => {
  it('returns rtl when language is he', () => {
    vi.mocked(useTranslation).mockReturnValue({
      i18n: { language: 'he' },
    } as ReturnType<typeof useTranslation>)
    const { result } = renderHook(() => useDirection())
    expect(result.current).toBe('rtl')
  })

  it('returns ltr when language is en', () => {
    vi.mocked(useTranslation).mockReturnValue({
      i18n: { language: 'en' },
    } as ReturnType<typeof useTranslation>)
    const { result } = renderHook(() => useDirection())
    expect(result.current).toBe('ltr')
  })

  it('returns ltr for any unknown language', () => {
    vi.mocked(useTranslation).mockReturnValue({
      i18n: { language: 'fr' },
    } as ReturnType<typeof useTranslation>)
    const { result } = renderHook(() => useDirection())
    expect(result.current).toBe('ltr')
  })
})
