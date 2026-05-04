import type { ReactNode } from 'react'
import { useUiStore } from '@/store/uiStore'
import { Icon } from '@/components/design'

interface TopbarProps {
  title: ReactNode
  crumb?: ReactNode
  actions?: ReactNode
}

export function Topbar({ title, crumb, actions }: TopbarProps) {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed)

  return (
    <div className="topbar">
      <div>
        {crumb ? <div className="topbar__crumb">{crumb}</div> : null}
        <div className="topbar__title">{title}</div>
      </div>
      <div className="topbar__spacer" />
      {actions}
      <button
        type="button"
        className="icon-btn"
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={collapsed}
        onClick={() => setCollapsed(!collapsed)}
      >
        <Icon name="panel" size={14} />
      </button>
    </div>
  )
}

