import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguageStore } from '@/store/languageStore'

interface NavItem {
  to: string
  labelKey: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',            labelKey: 'navigation.dashboard',     icon: '◉' },
  { to: '/buckets',     labelKey: 'navigation.buckets',       icon: '⬡' },
  { to: '/deposit',     labelKey: 'navigation.smart_deposit', icon: '↓' },
  { to: '/universe',    labelKey: 'navigation.universe',      icon: '🌐' },
  { to: '/architect',   labelKey: 'navigation.architect',     icon: '✦' },
  { to: '/sectors',     labelKey: 'navigation.sectors',       icon: '▦' },
  { to: '/drawdown',    labelKey: 'navigation.drawdown',      icon: '↘' },
  { to: '/audit',       labelKey: 'navigation.audit',         icon: '📋' },
  { to: '/settings',    labelKey: 'navigation.settings',      icon: '⚙' },
]

export function Sidebar() {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguageStore()

  return (
    <aside className="flex flex-col w-56 shrink-0 bg-gray-900 dark:bg-gray-950 text-gray-200 min-h-screen">
      <div className="px-5 py-5 border-b border-gray-700">
        <span className="text-lg font-bold tracking-tight text-white">InvestIQ</span>
      </div>
      <nav className="flex-1 py-3">
        {NAV_ITEMS.map(({ to, labelKey, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-700 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span className="text-base w-5 text-center">{icon}</span>
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-gray-700 flex items-center gap-2">
        <button
          onClick={() => setLanguage('he')}
          className={`text-xs px-2 py-1 rounded transition-colors ${language === 'he' ? 'bg-primary-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          עב
        </button>
        <span className="text-gray-600">|</span>
        <button
          onClick={() => setLanguage('en')}
          className={`text-xs px-2 py-1 rounded transition-colors ${language === 'en' ? 'bg-primary-700 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          EN
        </button>
      </div>
    </aside>
  )
}
