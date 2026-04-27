import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './components/common/Sidebar'
import { ErrorBoundary } from './components/common/ErrorBoundary'

export default function App() {
  const { i18n } = useTranslation()

  useEffect(() => {
    const lang = i18n.language
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [i18n.language])

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
