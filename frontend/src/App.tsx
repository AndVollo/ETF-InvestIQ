import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './components/common/Sidebar'
import { Topbar } from './components/common/Topbar'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { useUiStore, ACCENTS } from './store/uiStore'

const ROUTE_TITLES: Record<string, string> = {
  '/':          'navigation.dashboard',
  '/buckets':   'navigation.buckets',
  '/deposit':   'navigation.smart_deposit',
  '/universe':  'navigation.universe',
  '/architect': 'navigation.architect',
  '/sectors':   'navigation.sectors',
  '/drawdown':  'navigation.drawdown',
  '/audit':     'navigation.audit',
  '/settings':  'navigation.settings',
}

export default function App() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const theme = useUiStore((s) => s.theme)
  const density = useUiStore((s) => s.density)
  const accent = useUiStore((s) => s.accent)
  const collapsed = useUiStore((s) => s.sidebarCollapsed)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.density = density
    root.classList.toggle('dark', theme === 'dark')
    const a = ACCENTS[accent]
    root.style.setProperty('--accent', a.color)
    root.style.setProperty('--accent-hover', a.hover)
    root.style.setProperty('--accent-muted', a.muted)
  }, [theme, density, accent])

  useEffect(() => {
    const lang = i18n.language
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [i18n.language])

  const titleKey = useMemo(() => {
    if (ROUTE_TITLES[location.pathname]) return ROUTE_TITLES[location.pathname]
    const root = '/' + location.pathname.split('/').filter(Boolean)[0]
    return ROUTE_TITLES[root] ?? 'navigation.dashboard'
  }, [location.pathname])

  const title = t(titleKey as Parameters<typeof t>[0])

  return (
    <div className="app" data-collapsed={collapsed} data-density={density}>
      <Sidebar />
      <main className="main">
        <Topbar title={title} />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
