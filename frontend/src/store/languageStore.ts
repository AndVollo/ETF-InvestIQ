import { create } from 'zustand'
import i18n from '@/i18n'

type Theme = 'light' | 'dark' | 'system'
type Language = 'he' | 'en'

interface LanguageStore {
  language: Language
  theme: Theme
  setLanguage: (lang: Language) => void
  setTheme: (theme: Theme) => void
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}

const storedTheme = (localStorage.getItem('theme') as Theme) ?? 'system'
applyTheme(storedTheme)

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: (localStorage.getItem('lang') as Language) ?? 'he',
  theme: storedTheme,

  setLanguage: (lang) => {
    localStorage.setItem('lang', lang)
    i18n.changeLanguage(lang)
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
    set({ language: lang })
  },

  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    applyTheme(theme)
    set({ theme })
  },
}))
