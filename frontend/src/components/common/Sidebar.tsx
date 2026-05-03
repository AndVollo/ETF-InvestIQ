import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBuckets } from '@/api/buckets'
import { useUiStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useChangePassword } from '@/api/auth'
import { Icon, type IconName, Button, Input, Field, Modal } from '@/components/design'

interface NavItemDef {
  to: string
  labelKey: string
  icon: IconName
  end?: boolean
}

const PORTFOLIO: NavItemDef[] = [
  { to: '/',         labelKey: 'navigation.dashboard',     icon: 'home',    end: true },
  { to: '/buckets',  labelKey: 'navigation.buckets',       icon: 'bucket' },
  { to: '/deposit',  labelKey: 'navigation.smart_deposit', icon: 'deposit' },
]

const ANALYSIS: NavItemDef[] = [
  { to: '/universe',  labelKey: 'navigation.universe',  icon: 'globe' },
  { to: '/architect', labelKey: 'navigation.architect', icon: 'architect' },
  { to: '/sectors',   labelKey: 'navigation.sectors',   icon: 'sectors' },
  { to: '/drawdown',  labelKey: 'navigation.drawdown',  icon: 'drawdown' },
  { to: '/audit',     labelKey: 'navigation.audit',     icon: 'audit' },
]

const SYSTEM: NavItemDef[] = [
  { to: '/settings', labelKey: 'navigation.settings', icon: 'settings' },
]

function NavItemEntry({ item }: { item: NavItemDef }) {
  const { t } = useTranslation()
  const label = t(item.labelKey)
  return (
    <NavLink to={item.to} end={item.end} title={label} className="nav-item">
      <span className="nav-item__icon"><Icon name={item.icon} size={16} /></span>
      <span className="nav-item__label">{label}</span>
    </NavLink>
  )
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const change = useChangePassword()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')
    if (next !== confirm) { setError(t('auth.passwords_no_match')); return }
    if (next.length < 8) { setError(t('auth.password_min_length')); return }
    try {
      await change.mutateAsync({ current_password: current, new_password: next })
      onClose()
    } catch {
      setError(t('auth.wrong_current_password'))
    }
  }

  return (
    <Modal
      open
      title={t('auth.change_password')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} loading={change.isPending}>{t('common.save')}</Button>
        </>
      }
    >
      <Field label={t('auth.current_password')}>
        <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
      </Field>
      <Field label={t('auth.new_password')}>
        <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <Field label={t('auth.confirm_password')}>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
    </Modal>
  )
}

export function Sidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const activeBucketId = useUiStore((s) => s.activeBucketId)
  const setActiveBucketId = useUiStore((s) => s.setActiveBucketId)
  const { data: bucketsData } = useBuckets()
  const buckets = (bucketsData ?? []).filter((b) => !b.is_archived)
  const activeBucket = buckets.find((b) => b.id === activeBucketId) ?? buckets[0]

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="brand-mark">IQ</div>
        <div className="brand-name">IQ Invest ETF</div>
      </div>

      {activeBucket ? (
        <div className="sidebar__bucket">
          <button
            type="button"
            className="bucket-trigger"
            title={activeBucket.name}
            onClick={() => {
              if (buckets.length < 2) return
              const idx = buckets.findIndex((b) => b.id === activeBucket.id)
              const next = buckets[(idx + 1) % buckets.length]
              if (next) setActiveBucketId(next.id)
            }}
          >
            <div className="bucket-trigger__icon"><Icon name="bucket" size={14} /></div>
            <div className="bucket-trigger__body">
              <div className="bucket-trigger__name">{activeBucket.name}</div>
              <div className="bucket-trigger__sub">
                {t(`horizon.${activeBucket.horizon_type}` as Parameters<typeof t>[0])}
              </div>
            </div>
            <Icon name="chevronDown" size={14} className="bucket-trigger__chevron" />
          </button>
        </div>
      ) : null}

      <nav className="sidebar__nav">
        <div className="nav-section">{t('navigation.group_portfolio')}</div>
        {PORTFOLIO.map((item) => <NavItemEntry key={item.to} item={item} />)}
        <div className="nav-section">{t('navigation.group_analysis')}</div>
        {ANALYSIS.map((item) => <NavItemEntry key={item.to} item={item} />)}
        <div className="nav-section">{t('navigation.group_system')}</div>
        {SYSTEM.map((item) => <NavItemEntry key={item.to} item={item} />)}
      </nav>

      <div className="sidebar__footer">
        <button
          type="button"
          className="sidebar__user-trigger"
          onClick={() => setShowUserMenu((v) => !v)}
          title={user?.email ?? ''}
        >
          <div className="sidebar__user-avatar">
            {user ? user.full_name.slice(0, 2).toUpperCase() : '??'}
          </div>
          <div className="sidebar__user-body">
            <div className="sidebar__user-name">{user?.full_name ?? '—'}</div>
            <div className="sidebar__user-email">{user?.email ?? ''}</div>
          </div>
          <Icon name="chevronDown" size={12} className={showUserMenu ? 'sidebar__user-chevron--open' : 'sidebar__user-chevron'} />
        </button>

        {showUserMenu && (
          <div className="sidebar__user-menu">
            <button
              type="button"
              className="nav-item"
              onClick={() => { setShowUserMenu(false); setShowChangePassword(true) }}
            >
              <span className="nav-item__icon"><Icon name="settings" size={14} /></span>
              <span className="nav-item__label">{t('auth.change_password')}</span>
            </button>
            <button
              type="button"
              className="nav-item nav-item--danger"
              onClick={() => { clearAuth(); navigate('/login', { replace: true }) }}
            >
              <span className="nav-item__icon"><Icon name="x" size={14} /></span>
              <span className="nav-item__label">{t('auth.logout')}</span>
            </button>
          </div>
        )}
      </div>

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </aside>
  )
}
