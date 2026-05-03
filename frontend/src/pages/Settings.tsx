import { useState, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings, useUpdateSetting, useBackupDb, useValidateFred, useConnectionStatus } from '@/api/settings'
import { useLanguageStore } from '@/store/languageStore'
import { useUiStore, ACCENTS, type Accent, type DriftVariant } from '@/store/uiStore'
import { Toast } from '@/components/common/Toast'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import {
  Button,
  Badge,
  Seg,
  Switch,
  Input,
  Icon,
  type IconName,
} from '@/components/design'

type Tab =
  | 'appearance'
  | 'locale'
  | 'layout'
  | 'charts'
  | 'data_sources'
  | 'obsidian'
  | 'advanced'

const TABS: ReadonlyArray<{ id: Tab; icon: IconName; labelKey: string }> = [
  { id: 'appearance',  icon: 'sun',      labelKey: 'settings.appearance' },
  { id: 'locale',      icon: 'globe',    labelKey: 'settings.locale' },
  { id: 'layout',      icon: 'panel',    labelKey: 'settings.layout' },
  { id: 'charts',      icon: 'drawdown', labelKey: 'settings.charts' },
  { id: 'data_sources', icon: 'database', labelKey: 'settings.data_sources' },
  { id: 'obsidian',    icon: 'audit',    labelKey: 'settings.obsidian' },
  { id: 'advanced',    icon: 'settings', labelKey: 'settings.advanced' },
]

function SettingsRow({
  label,
  note,
  children,
  stacked,
}: {
  label: ReactNode
  note?: ReactNode
  children: ReactNode
  stacked?: boolean
}) {
  return (
    <div className={'settings-row' + (stacked ? ' settings-row--stacked' : '')}>
      <div>
        <div className="settings-row__title">{label}</div>
        {note ? <div className="settings-row__note">{note}</div> : null}
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  )
}

function Group({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="settings-group">
      <div className="settings-group__title">{title}</div>
      <div className="settings-group__body">{children}</div>
    </div>
  )
}

function AccentSwatches({ value, onChange }: { value: Accent; onChange: (a: Accent) => void }) {
  return (
    <div className="accent-swatches">
      {(Object.keys(ACCENTS) as Accent[]).map((k) => {
        const cfg = ACCENTS[k]
        return (
          <button
            type="button"
            key={k}
            className={'accent-swatch' + (value === k ? ' accent-swatch--active' : '')}
            onClick={() => onChange(k)}
            aria-label={cfg.name}
          >
            <span className="accent-swatch__dot" style={{ background: cfg.color }} />
            <span>{cfg.name}</span>
          </button>
        )
      })}
    </div>
  )
}

function DriftPreviewCard({
  id,
  active,
  onSelect,
  label,
  note,
  preview,
}: {
  id: DriftVariant
  active: boolean
  onSelect: (id: DriftVariant) => void
  label: string
  note: string
  preview: ReactNode
}) {
  return (
    <button
      type="button"
      className={'drift-card' + (active ? ' drift-card--active' : '')}
      onClick={() => onSelect(id)}
    >
      <div className="drift-card__preview">{preview}</div>
      <div className="drift-card__title">{label}</div>
      <div className="drift-card__note">{note}</div>
    </button>
  )
}

const PreviewDiverging = () => (
  <svg viewBox="0 0 120 60" width="100%" height="60">
    {[8, 22, 36, 50].map((y, i) => (
      <g key={i}>
        <rect x="0" y={y} width="120" height="6" rx="1" fill="var(--bg-elevated)" />
        <rect
          x={i % 2 ? 60 : 60 - [18, 12, 24, 8][i]}
          y={y}
          width={[18, 12, 24, 8][i]}
          height="6"
          rx="1"
          fill={i % 2 ? 'var(--info)' : 'var(--accent)'}
          opacity="0.85"
        />
      </g>
    ))}
    <line x1="60" y1="4" x2="60" y2="60" stroke="var(--border-strong)" strokeWidth="1" />
  </svg>
)

const PreviewTick = () => (
  <svg viewBox="0 0 120 60" width="100%" height="60">
    {[8, 22, 36, 50].map((y, i) => (
      <g key={i}>
        <rect x="0" y={y + 1} width="120" height="4" rx="2" fill="var(--bg-elevated)" />
        <rect x="0" y={y + 1} width={[80, 50, 95, 30][i]} height="4" rx="2" fill="var(--accent)" />
        <rect x={[72, 60, 88, 36][i]} y={y - 1} width="2" height="8" fill="var(--text-primary)" />
      </g>
    ))}
  </svg>
)

const PreviewStacked = () => (
  <svg viewBox="0 0 120 60" width="100%" height="60">
    {[6, 26, 46].map((y, i) => (
      <g key={i}>
        <rect x="0" y={y} width={[80, 50, 95][i]} height="5" rx="1" fill="var(--accent)" />
        <rect x="0" y={y + 7} width={[70, 60, 88][i]} height="5" rx="1" fill="var(--text-muted)" opacity="0.4" />
      </g>
    ))}
  </svg>
)

/* ── Data Sources Panel ────────────────────────────────────────────────────── */

type FredStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'timeout' | 'network_error' | 'empty'

function StatusDot({ status }: { status: 'ok' | 'error' | 'warn' | 'checking' }) {
  const color = {
    ok: 'var(--success)',
    error: 'var(--danger)',
    warn: 'var(--warning)',
    checking: 'var(--text-muted)',
  }[status]
  return (
    <span
      className="status-dot"
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        boxShadow: status === 'ok' ? `0 0 6px ${color}` : undefined,
        animation: status === 'checking' ? 'pulse-dot 1.2s ease-in-out infinite' : undefined,
      }}
    />
  )
}

function DataSourcesPanel({
  fredKey,
  setFredKey,
  save,
}: {
  fredKey: string
  setFredKey: (v: string) => void
  save: (key: string, value: unknown) => Promise<void>
}) {
  const { t } = useTranslation()
  const validateFred = useValidateFred()
  const { data: connStatus, isLoading: connLoading, refetch: refetchConn } = useConnectionStatus(true)

  const [fredStatus, setFredStatus] = useState<FredStatus>('idle')
  const [showReplace, setShowReplace] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [isEditing, setIsEditing] = useState(!fredKey)

  // Auto-validate saved key on mount
  useEffect(() => {
    if (fredKey) {
      setIsEditing(false)
      handleValidate(fredKey)
    } else {
      setFredStatus('empty')
      setIsEditing(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleValidate = async (key: string) => {
    if (!key.trim()) {
      setFredStatus('empty')
      return
    }
    setFredStatus('checking')
    try {
      const res = await validateFred.mutateAsync({ api_key: key })
      if (res.valid) {
        setFredStatus('valid')
      } else if (res.message === 'timeout') {
        setFredStatus('timeout')
      } else if (res.message === 'network_error') {
        setFredStatus('network_error')
      } else {
        setFredStatus('invalid')
      }
    } catch {
      setFredStatus('network_error')
    }
  }

  const handleSaveNew = async () => {
    const trimmed = (isEditing ? fredKey : newKey).trim()
    if (!trimmed) return
    await save('fred_api_key', trimmed)
    setFredKey(trimmed)
    setIsEditing(false)
    setShowReplace(false)
    setNewKey('')
    handleValidate(trimmed)
  }

  const handleReplace = () => {
    setShowReplace(true)
    setNewKey('')
  }

  const handleConfirmReplace = async () => {
    const trimmed = newKey.trim()
    if (!trimmed) return
    await save('fred_api_key', trimmed)
    setFredKey(trimmed)
    setShowReplace(false)
    setNewKey('')
    handleValidate(trimmed)
  }

  const maskedKey = fredKey
    ? `••••••••${fredKey.slice(-4)}`
    : ''

  const fredStatusDot = (() => {
    switch (fredStatus) {
      case 'valid': return 'ok' as const
      case 'checking': return 'checking' as const
      case 'empty': return 'warn' as const
      default: return 'error' as const
    }
  })()

  const fredStatusLabel = (() => {
    switch (fredStatus) {
      case 'valid': return t('settings.fred_key_valid' as Parameters<typeof t>[0])
      case 'invalid': return t('settings.fred_key_invalid' as Parameters<typeof t>[0])
      case 'empty': return t('settings.fred_key_empty' as Parameters<typeof t>[0])
      case 'checking': return t('settings.fred_key_checking' as Parameters<typeof t>[0])
      case 'timeout': return t('settings.fred_key_timeout' as Parameters<typeof t>[0])
      case 'network_error': return t('settings.fred_key_network_error' as Parameters<typeof t>[0])
      default: return ''
    }
  })()

  return (
    <>
      {/* ── FRED API Key ─────────────────────────────────────── */}
      <Group title={t('settings.fred_api_key' as Parameters<typeof t>[0])}>
        <SettingsRow
          label={t('settings.fred_api_key' as Parameters<typeof t>[0])}
          note={t('settings.fred_api_key_note' as Parameters<typeof t>[0])}
          stacked
        >
          {/* Status line */}
          <div className="ds-status-line">
            <StatusDot status={fredStatusDot} />
            <span className={`ds-status-label ds-status-label--${fredStatusDot}`}>
              {fredStatusLabel}
            </span>
            {fredStatus !== 'checking' && fredKey && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleValidate(fredKey)}
                style={{ marginInlineStart: 'auto' }}
              >
                <Icon name="refresh" size={12} />
                {t('settings.test_connection' as Parameters<typeof t>[0])}
              </Button>
            )}
          </div>

          {/* Key input area */}
          {isEditing ? (
            /* First-time / empty state — direct input */
            <div className="ds-key-row">
              <Input
                type="password"
                value={fredKey}
                onChange={(e) => setFredKey(e.target.value)}
                placeholder="Enter your FRED API key"
                style={{ width: 280 }}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSaveNew}
                disabled={!fredKey.trim()}
              >
                {t('common.save' as Parameters<typeof t>[0])}
              </Button>
            </div>
          ) : (
            /* Key exists — show masked + replace flow */
            <div className="ds-key-row">
              <div className="ds-masked-key">
                <Icon name="database" size={14} />
                <span>{maskedKey}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={handleReplace}>
                <Icon name="pencil" size={12} />
                {t('settings.fred_replace_title' as Parameters<typeof t>[0])}
              </Button>
            </div>
          )}

          {/* Replace confirmation */}
          {showReplace && (
            <div className="ds-replace-box">
              <div className="ds-replace-warning">
                <Icon name="alert" size={14} />
                <span>{t('settings.fred_replace_warning' as Parameters<typeof t>[0])}</span>
              </div>
              <div className="ds-key-row">
                <Input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="New API key"
                  style={{ width: 280 }}
                  autoFocus
                />
                <Button size="sm" variant="secondary" onClick={handleConfirmReplace} disabled={!newKey.trim()}>
                  {t('settings.fred_replace_confirm' as Parameters<typeof t>[0])}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowReplace(false)}>
                  {t('settings.fred_replace_cancel' as Parameters<typeof t>[0])}
                </Button>
              </div>
            </div>
          )}
        </SettingsRow>
      </Group>

      {/* ── Connection Status ────────────────────────────────── */}
      <Group title={t('settings.connection_status_title' as Parameters<typeof t>[0])}>
        {/* System Internet status */}
        <SettingsRow
          label="System Connectivity"
          note="General internet access from the application backend."
        >
          <StatusDot
            status={
              connLoading
                ? 'checking'
                : connStatus?.internet?.connected
                  ? 'ok'
                  : 'error'
            }
          />
          <Badge
            variant={
              connLoading
                ? 'info'
                : connStatus?.internet?.connected
                  ? 'success'
                  : 'danger'
            }
          >
            {connLoading
              ? t('settings.yfinance_checking' as Parameters<typeof t>[0])
              : connStatus?.internet?.connected
                ? 'Connected'
                : `No Internet (${connStatus?.internet?.message || 'Unknown error'})`}
          </Badge>
        </SettingsRow>

        {/* FRED connection */}
        <SettingsRow
          label="FRED API"
          note={
            connStatus?.fred
              ? connStatus.fred.connected
                ? t('settings.fred_key_valid' as Parameters<typeof t>[0])
                  : connStatus.fred.has_key
                    ? `${t('settings.fred_key_invalid' as Parameters<typeof t>[0])} (${connStatus.fred.message})`
                    : t('settings.fred_key_empty' as Parameters<typeof t>[0])
              : connLoading
                ? t('settings.yfinance_checking' as Parameters<typeof t>[0])
                : ''
          }
        >
          <StatusDot
            status={
              connLoading
                ? 'checking'
                : connStatus?.fred?.connected
                  ? 'ok'
                  : connStatus?.fred?.has_key
                    ? 'error'
                    : 'warn'
            }
          />
          <Badge
            variant={
              connLoading
                ? 'info'
                : connStatus?.fred?.connected
                  ? 'success'
                  : 'danger'
            }
          >
            {connLoading
              ? t('settings.yfinance_checking' as Parameters<typeof t>[0])
              : connStatus?.fred?.connected
                ? t('settings.yfinance_connected' as Parameters<typeof t>[0])
                : t('settings.yfinance_disconnected' as Parameters<typeof t>[0])}
          </Badge>
        </SettingsRow>

        {/* yfinance connection */}
        <SettingsRow
          label={t('settings.yfinance_title' as Parameters<typeof t>[0])}
          note={t('settings.yfinance_note' as Parameters<typeof t>[0])}
        >
          <StatusDot
            status={
              connLoading
                ? 'checking'
                : connStatus?.yfinance?.connected
                  ? 'ok'
                  : 'error'
            }
          />
          <Badge
            variant={
              connLoading
                ? 'info'
                : connStatus?.yfinance?.connected
                  ? 'success'
                  : 'danger'
            }
          >
            {connLoading
              ? t('settings.yfinance_checking' as Parameters<typeof t>[0])
              : connStatus?.yfinance?.connected
                ? t('settings.yfinance_connected' as Parameters<typeof t>[0])
                : t('settings.yfinance_disconnected' as Parameters<typeof t>[0])}
          </Badge>
        </SettingsRow>

        {/* Refresh */}
        <SettingsRow label="" note={t('settings.connection_status_note' as Parameters<typeof t>[0])}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => refetchConn()}
            loading={connLoading}
          >
            <Icon name="refresh" size={12} />
            {t('settings.refresh_status' as Parameters<typeof t>[0])}
          </Button>
        </SettingsRow>
      </Group>
    </>
  )
}

export default function Settings() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('appearance')
  const [toast, setToast] = useState<string | null>(null)

  const { data, isLoading } = useSettings()
  const updateSetting = useUpdateSetting()
  const backupDb = useBackupDb()

  const { language, setLanguage } = useLanguageStore()
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const density = useUiStore((s) => s.density)
  const setDensity = useUiStore((s) => s.setDensity)
  const accent = useUiStore((s) => s.accent)
  const setAccent = useUiStore((s) => s.setAccent)
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed)
  const driftVariant = useUiStore((s) => s.driftVariant)
  const setDriftVariant = useUiStore((s) => s.setDriftVariant)
  const showValuation = useUiStore((s) => s.showValuation)
  const setShowValuation = useUiStore((s) => s.setShowValuation)

  const settings: Record<string, unknown> = {}
  data?.settings.forEach(({ key, value }) => { settings[key] = value })

  const [fredKey, setFredKey] = useState('')
  const [vaultPath, setVaultPath] = useState('')
  const [journalSubfolder, setJournalSubfolder] = useState('')

  useEffect(() => {
    if (data) {
      setFredKey((settings['fred_api_key'] as string) ?? '')
      setVaultPath((settings['obsidian_vault_path'] as string) ?? '')
      setJournalSubfolder((settings['obsidian_journal_subfolder'] as string) ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const save = async (key: string, value: unknown) => {
    await updateSetting.mutateAsync({ key, value })
    setToast(t('settings.saved' as Parameters<typeof t>[0]))
  }

  const [justSaved, setJustSaved] = useState(false)
  useEffect(() => {
    if (updateSetting.isSuccess && !updateSetting.isPending) {
      setJustSaved(true)
      const t = setTimeout(() => setJustSaved(false), 3000)
      return () => clearTimeout(t)
    }
  }, [updateSetting.isSuccess, updateSetting.isPending])

  const reset = () => {
    setTheme('dark')
    setDensity('comfortable')
    setAccent('indigo')
    setSidebarCollapsed(false)
    setDriftVariant('diverging')
    setShowValuation(true)
    setLanguage('en')
    setToast(t('settings.saved'))
  }

  if (isLoading) return <div className="content"><LoadingSpinner /></div>

  return (
    <div className="content">
      <div className="content__inner settings-page">
        <div className="settings-shell">
          <aside className="settings-tabs">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                type="button"
                className="settings-tab"
                aria-current={tab === tb.id ? 'page' : undefined}
                onClick={() => setTab(tb.id)}
              >
                <Icon name={tb.icon} size={14} />
                <span>{t(tb.labelKey as Parameters<typeof t>[0])}</span>
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              style={{ justifyContent: 'flex-start', paddingInlineStart: 10 }}
            >
              <Icon name="refresh" size={12} />
              <span>{t('settings.reset')}</span>
            </Button>
          </aside>

          <div className="settings-body">
            <div className="settings-header">
              <div>
                <div className="settings-header__title">{t('settings.title')}</div>
                <div className="settings-header__subtitle">{t('settings.subtitle')}</div>
              </div>
              {updateSetting.isPending ? (
                <Badge variant="info">{t('common.saving' as Parameters<typeof t>[0])}</Badge>
              ) : justSaved ? (
                <Badge variant="success">{t('settings.saved' as Parameters<typeof t>[0])}</Badge>
              ) : (
                <Badge variant="muted" dot={false}>{t('common.synced' as Parameters<typeof t>[0])}</Badge>
              )}
            </div>

            {tab === 'appearance' && (
              <Group title={t('settings.appearance')}>
                <SettingsRow label={t('settings.theme')} note={t('settings.theme_note')}>
                  <Seg<'dark' | 'light'>
                    value={theme}
                    onChange={setTheme}
                    options={[
                      { value: 'dark', label: t('settings.theme_dark') },
                      { value: 'light', label: t('settings.theme_light') },
                    ]}
                  />
                </SettingsRow>
                <SettingsRow label={t('settings.accent')} note={t('settings.accent_note')} stacked>
                  <AccentSwatches value={accent} onChange={setAccent} />
                </SettingsRow>
                <SettingsRow label={t('settings.density')} note={t('settings.density_note')}>
                  <Seg<'compact' | 'comfortable'>
                    value={density}
                    onChange={setDensity}
                    options={[
                      { value: 'compact', label: t('settings.density_compact') },
                      { value: 'comfortable', label: t('settings.density_comfortable') },
                    ]}
                  />
                </SettingsRow>
              </Group>
            )}

            {tab === 'locale' && (
              <Group title={t('settings.locale')}>
                <SettingsRow label={t('settings.language')} note={t('settings.language_note')}>
                  <Seg<'en' | 'he'>
                    value={language}
                    onChange={setLanguage}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'he', label: 'עברית' },
                    ]}
                  />
                </SettingsRow>
                <SettingsRow label={t('settings.base_currency')}>
                  <Seg<string>
                    value={(settings['base_currency'] as string) ?? 'USD'}
                    onChange={(v) => save('base_currency', v)}
                    options={[
                      { value: 'USD', label: 'USD' },
                      { value: 'ILS', label: 'ILS' },
                      { value: 'EUR', label: 'EUR' },
                    ]}
                  />
                </SettingsRow>
              </Group>
            )}

            {tab === 'layout' && (
              <Group title={t('settings.layout')}>
                <SettingsRow label={t('settings.sidebar')} note={t('settings.sidebar_note')}>
                  <span className="text-muted" style={{ fontSize: 12 }}>{t('settings.sidebar_collapsed')}</span>
                  <Switch checked={sidebarCollapsed} onChange={setSidebarCollapsed} />
                </SettingsRow>
                <SettingsRow label={t('settings.valuation')} note={t('settings.valuation_note')}>
                  <Switch checked={showValuation} onChange={setShowValuation} />
                </SettingsRow>
              </Group>
            )}

            {tab === 'charts' && (
              <Group title={t('settings.charts')}>
                <SettingsRow label={t('settings.drift_variant')} note={t('settings.drift_variant_note')} stacked>
                  <div className="drift-card-grid">
                    <DriftPreviewCard
                      id="diverging"
                      active={driftVariant === 'diverging'}
                      onSelect={setDriftVariant}
                      label={t('settings.drift_diverging')}
                      note={t('settings.drift_diverging_note')}
                      preview={<PreviewDiverging />}
                    />
                    <DriftPreviewCard
                      id="tick"
                      active={driftVariant === 'tick'}
                      onSelect={setDriftVariant}
                      label={t('settings.drift_tick')}
                      note={t('settings.drift_tick_note')}
                      preview={<PreviewTick />}
                    />
                    <DriftPreviewCard
                      id="stacked"
                      active={driftVariant === 'stacked'}
                      onSelect={setDriftVariant}
                      label={t('settings.drift_stacked')}
                      note={t('settings.drift_stacked_note')}
                      preview={<PreviewStacked />}
                    />
                  </div>
                </SettingsRow>
              </Group>
            )}

            {tab === 'data_sources' && (
              <DataSourcesPanel
                fredKey={fredKey}
                setFredKey={setFredKey}
                save={save}
              />
            )}

            {tab === 'obsidian' && (
              <Group title={t('settings.obsidian')}>
                <SettingsRow label={t('settings.vault_path')}>
                  <Input
                    value={vaultPath}
                    onChange={(e) => setVaultPath(e.target.value)}
                    placeholder="/Users/you/Obsidian/Vault"
                    style={{ width: 280 }}
                  />
                  <Button size="sm" variant="secondary" onClick={() => save('obsidian_vault_path', vaultPath)}>
                    {t('common.save')}
                  </Button>
                </SettingsRow>
                <SettingsRow label={t('settings.journal_subfolder')}>
                  <Input
                    value={journalSubfolder}
                    onChange={(e) => setJournalSubfolder(e.target.value)}
                    placeholder="Portfolio/Decisions"
                    style={{ width: 280 }}
                  />
                  <Button size="sm" variant="secondary" onClick={() => save('obsidian_journal_subfolder', journalSubfolder)}>
                    {t('common.save')}
                  </Button>
                </SettingsRow>
              </Group>
            )}

            {tab === 'advanced' && (
              <>
                <Group title={t('settings.tax_status_section')}>
                  <SettingsRow
                    label={t('settings.us_citizen_label')}
                    note={t('settings.us_citizen_help')}
                  >
                    <Switch
                      checked={Boolean(settings['is_us_citizen'])}
                      onChange={(v) => save('is_us_citizen', v)}
                    />
                  </SettingsRow>
                </Group>
                <Group title={t('settings.backup_section')}>
                  <SettingsRow label={t('settings.backup_section')} note={t('settings.backup_help')}>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        try {
                          const res = await backupDb.mutateAsync()
                          setToast(t('settings.backup_success', { path: res.path }))
                        } catch {
                          setToast(t('settings.backup_failed'))
                        }
                      }}
                      loading={backupDb.isPending}
                    >
                      <Icon name="database" size={12} /> {t('settings.backup_now')}
                    </Button>
                  </SettingsRow>
                </Group>
              </>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </div>
  )
}
