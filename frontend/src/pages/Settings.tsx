import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings, useUpdateSetting } from '@/api/settings'
import { useLanguageStore } from '@/store/languageStore'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Toast } from '@/components/common/Toast'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

type Tab = 'general' | 'data_sources' | 'obsidian' | 'advanced'

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [toast, setToast] = useState<string | null>(null)

  const { data, isLoading } = useSettings()
  const updateSetting = useUpdateSetting()
  const { language, theme, setLanguage, setTheme } = useLanguageStore()

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
  }, [data])

  const save = async (key: string, value: unknown) => {
    await updateSetting.mutateAsync({ key, value })
    setToast(t('settings.saved'))
  }

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'general', label: t('settings.general') },
    { id: 'data_sources', label: t('settings.data_sources') },
    { id: 'obsidian', label: t('settings.obsidian') },
    { id: 'advanced', label: t('settings.advanced') },
  ]

  if (isLoading) return <LoadingSpinner className="py-32" />

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('settings.title')}</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
        {activeTab === 'general' && (
          <>
            <SettingRow label={t('settings.language')}>
              <select
                className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-800"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'he' | 'en')}
              >
                <option value="he">עברית</option>
                <option value="en">English</option>
              </select>
            </SettingRow>
            <SettingRow label={t('settings.theme')}>
              <select
                className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-800"
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              >
                <option value="light">{t('settings.theme_light')}</option>
                <option value="dark">{t('settings.theme_dark')}</option>
                <option value="system">{t('settings.theme_system')}</option>
              </select>
            </SettingRow>
            <SettingRow label={t('settings.base_currency')}>
              <select
                className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-800"
                value={(settings['base_currency'] as string) ?? 'USD'}
                onChange={(e) => save('base_currency', e.target.value)}
              >
                <option value="USD">{t('common.usd')}</option>
                <option value="ILS">{t('common.ils')}</option>
              </select>
            </SettingRow>

            <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                {t('settings.tax_status_section')}
              </h2>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(settings['is_us_citizen'])}
                  onChange={(e) => save('is_us_citizen', e.target.checked)}
                />
                <span>
                  <span className="block text-sm text-gray-900 dark:text-gray-100">
                    {t('settings.us_citizen_label')}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                    {t('settings.us_citizen_help')}
                  </span>
                </span>
              </label>
            </div>
          </>
        )}

        {activeTab === 'data_sources' && (
          <>
            <SettingRow label={t('settings.fred_api_key')}>
              <Input
                type="password"
                value={fredKey}
                onChange={(e) => setFredKey(e.target.value)}
                className="w-64"
              />
              <Button size="sm" onClick={() => save('fred_api_key', fredKey)}>
                {t('common.save')}
              </Button>
            </SettingRow>
          </>
        )}

        {activeTab === 'obsidian' && (
          <>
            <SettingRow label={t('settings.vault_path')}>
              <Input
                value={vaultPath}
                onChange={(e) => setVaultPath(e.target.value)}
                className="w-64"
                placeholder="/Users/you/Obsidian/Vault"
              />
              <Button size="sm" onClick={() => save('obsidian_vault_path', vaultPath)}>
                {t('common.save')}
              </Button>
            </SettingRow>
            <SettingRow label={t('settings.journal_subfolder')}>
              <Input
                value={journalSubfolder}
                onChange={(e) => setJournalSubfolder(e.target.value)}
                className="w-64"
                placeholder="Portfolio/Decisions"
              />
              <Button size="sm" onClick={() => save('obsidian_journal_subfolder', journalSubfolder)}>
                {t('common.save')}
              </Button>
            </SettingRow>
          </>
        )}

        {activeTab === 'advanced' && (
          <p className="text-sm text-gray-500">{t('common.na')}</p>
        )}
      </div>

      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </div>
  )
}
