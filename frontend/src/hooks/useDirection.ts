import { useTranslation } from 'react-i18next'

export function useDirection(): 'rtl' | 'ltr' {
  const { i18n } = useTranslation()
  return i18n.language === 'he' ? 'rtl' : 'ltr'
}
