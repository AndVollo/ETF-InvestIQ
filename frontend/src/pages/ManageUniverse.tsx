import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  useAdminETFs,
  useAdminBlacklist,
  useCreateETF,
  useUpdateETF,
  useDeleteETF,
  useAddBlacklist,
  useRemoveBlacklist,
  useDiscoveryPrompt,
  useBulkImport,
} from '@/api/universe'
import type {
  UniverseETFAdmin,
  UniverseETFCreatePayload,
  UniverseETFUpdatePayload,
  BulkImportItem,
  BulkImportResponse,
} from '@/types/api'
import { Card, Button, Badge, Modal, Field, Input, Select, Seg } from '@/components/design'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const BUCKET_OPTIONS = [
  'GLOBAL_CORE', 'US_FACTOR_VALUE', 'INTL_FACTOR_VALUE', 'US_FACTOR_MOMENTUM',
  'US_BONDS', 'ULTRA_SHORT_TERM', 'REITS', 'COMMODITIES_HEDGE',
  'EMERGING_MARKETS', 'TECH_GROWTH',
]

type Tab = 'etfs' | 'blacklist' | 'discover'

const emptyForm: UniverseETFCreatePayload = {
  ticker: '',
  name: '',
  isin: '',
  domicile: 'US',
  distribution: 'Distributing',
  ucits: false,
  ter: 0.05,
  aum_b: 1.0,
  inception: '',
  description_en: '',
  description_he: '',
  bucket_name: 'GLOBAL_CORE',
}

// ── ETF Form Modal (create or edit) ──────────────────────────────────────────
function ETFFormModal({
  initial,
  onClose,
}: {
  initial: UniverseETFAdmin | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const create = useCreateETF()
  const update = useUpdateETF()
  const isEdit = !!initial

  const [form, setForm] = useState<UniverseETFCreatePayload>(
    initial
      ? {
          ticker: initial.ticker,
          name: initial.name,
          isin: initial.isin ?? '',
          domicile: initial.domicile,
          distribution: initial.distribution,
          ucits: initial.ucits,
          ter: initial.ter,
          aum_b: initial.aum_b,
          inception: initial.inception ?? '',
          description_en: initial.description_en ?? '',
          description_he: initial.description_he ?? '',
          bucket_name: initial.bucket_name,
        }
      : emptyForm,
  )
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')
    if (!form.ticker.trim()) { setError(t('manage_universe.ticker_required')); return }
    if (!form.name.trim()) { setError(t('manage_universe.name_required')); return }
    try {
      if (isEdit) {
        const { ticker: _t, ...rest } = form
        await update.mutateAsync({ ticker: initial!.ticker, data: rest as UniverseETFUpdatePayload })
      } else {
        await create.mutateAsync(form)
      }
      onClose()
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: { message_key?: string } | string } } })
        ?.response?.data?.detail
      setError(typeof msg === 'string' ? msg : (msg?.message_key ?? t('common.error')))
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <Modal
      open
      title={isEdit ? `${t('manage_universe.edit_etf')} ${initial!.ticker}` : t('manage_universe.add_etf')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} loading={isPending}>{t('common.save')}</Button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Ticker">
          <Input
            value={form.ticker}
            disabled={isEdit}
            onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label={t('manage_universe.bucket')}>
          <Select value={form.bucket_name} onChange={(e) => setForm({ ...form, bucket_name: e.target.value })}>
            {BUCKET_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
        </Field>
      </div>
      <Field label={t('manage_universe.name')}>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="ISIN">
          <Input value={form.isin ?? ''} onChange={(e) => setForm({ ...form, isin: e.target.value })} />
        </Field>
        <Field label={t('manage_universe.domicile')}>
          <Select
            value={form.domicile}
            onChange={(e) => setForm({ ...form, domicile: e.target.value as 'US' | 'IE' | 'LU' })}
          >
            <option value="US">US</option>
            <option value="IE">IE (UCITS)</option>
            <option value="LU">LU (UCITS)</option>
          </Select>
        </Field>
        <Field label={t('manage_universe.distribution')}>
          <Select
            value={form.distribution}
            onChange={(e) => setForm({ ...form, distribution: e.target.value as 'Distributing' | 'Accumulating' })}
          >
            <option value="Distributing">Distributing</option>
            <option value="Accumulating">Accumulating</option>
          </Select>
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label={`TER (% — e.g. 0.07 = 0.07%)`}>
          <Input
            type="number"
            step="0.01"
            value={form.ter}
            onChange={(e) => setForm({ ...form, ter: Number(e.target.value) })}
          />
        </Field>
        <Field label={t('manage_universe.aum_b')}>
          <Input
            type="number"
            step="0.1"
            value={form.aum_b}
            onChange={(e) => setForm({ ...form, aum_b: Number(e.target.value) })}
          />
        </Field>
        <Field label={t('manage_universe.inception')}>
          <Input
            type="date"
            value={form.inception ?? ''}
            onChange={(e) => setForm({ ...form, inception: e.target.value })}
          />
        </Field>
      </div>
      <Field label="UCITS">
        <Select
          value={form.ucits ? 'yes' : 'no'}
          onChange={(e) => setForm({ ...form, ucits: e.target.value === 'yes' })}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </Select>
      </Field>
      <Field label={t('manage_universe.description_en')}>
        <Input value={form.description_en ?? ''} onChange={(e) => setForm({ ...form, description_en: e.target.value })} />
      </Field>
      <Field label={t('manage_universe.description_he')}>
        <Input value={form.description_he ?? ''} onChange={(e) => setForm({ ...form, description_he: e.target.value })} />
      </Field>
      {error && <p style={{ color: 'var(--error, red)', marginTop: 8 }}>{error}</p>}
    </Modal>
  )
}

// ── ETFs Tab ─────────────────────────────────────────────────────────────────
function ETFsTab() {
  const { t } = useTranslation()
  const { data, isLoading } = useAdminETFs(false)
  const del = useDeleteETF()
  const [bucketFilter, setBucketFilter] = useState<string>('all')
  const [editing, setEditing] = useState<UniverseETFAdmin | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!data) return []
    return bucketFilter === 'all' ? data : data.filter((e) => e.bucket_name === bucketFilter)
  }, [data, bucketFilter])

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <Select value={bucketFilter} onChange={(e) => setBucketFilter(e.target.value)} style={{ maxWidth: 240 }}>
          <option value="all">{t('manage_universe.all_buckets')} ({data?.length ?? 0})</option>
          {BUCKET_OPTIONS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
        <Button onClick={() => setShowAdd(true)}>+ {t('manage_universe.add_etf')}</Button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>{t('manage_universe.name')}</th>
            <th>{t('manage_universe.bucket')}</th>
            <th>{t('manage_universe.domicile')}</th>
            <th className="num">TER</th>
            <th className="num">AUM ($B)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((etf) => (
            <tr key={etf.id}>
              <td className="mono" style={{ fontWeight: 500 }}>{etf.ticker}</td>
              <td>{etf.name}</td>
              <td><Badge variant="muted">{etf.bucket_name}</Badge></td>
              <td>{etf.ucits ? `${etf.domicile} (UCITS)` : etf.domicile}</td>
              <td className="num tnum">{etf.ter.toFixed(3)}%</td>
              <td className="num tnum">{etf.aum_b.toFixed(1)}</td>
              <td style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <Button size="sm" variant="ghost" onClick={() => setEditing(etf)}>{t('common.edit')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(etf.ticker)}>
                  {t('common.delete')}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showAdd && <ETFFormModal initial={null} onClose={() => setShowAdd(false)} />}
      {editing && <ETFFormModal initial={editing} onClose={() => setEditing(null)} />}

      {confirmDelete && (
        <Modal
          open
          title={`${t('common.delete')} ${confirmDelete}?`}
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>{t('common.cancel')}</Button>
              <Button
                onClick={async () => {
                  await del.mutateAsync(confirmDelete)
                  setConfirmDelete(null)
                }}
                loading={del.isPending}
              >
                {t('common.delete')}
              </Button>
            </>
          }
        >
          <p>{t('manage_universe.delete_etf_warning', { ticker: confirmDelete })}</p>
        </Modal>
      )}
    </>
  )
}

// ── Blacklist Tab ────────────────────────────────────────────────────────────
function BlacklistTab() {
  const { t } = useTranslation()
  const { data, isLoading } = useAdminBlacklist()
  const add = useAddBlacklist()
  const remove = useRemoveBlacklist()
  const [ticker, setTicker] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!ticker.trim() || !reason.trim()) { setError(t('manage_universe.blacklist_form_required')); return }
    try {
      await add.mutateAsync({ ticker: ticker.toUpperCase(), reason })
      setTicker(''); setReason('')
    } catch {
      setError(t('common.error'))
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Card.Body>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 12, alignItems: 'end' }}>
            <Field label="Ticker">
              <Input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} />
            </Field>
            <Field label={t('manage_universe.reason')}>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Button onClick={submit} loading={add.isPending}>+ {t('manage_universe.add_blacklist')}</Button>
          </div>
          {error && <p style={{ color: 'var(--error, red)', marginTop: 8 }}>{error}</p>}
        </Card.Body>
      </Card>

      <table className="table">
        <thead>
          <tr><th>Ticker</th><th>{t('manage_universe.reason')}</th><th></th></tr>
        </thead>
        <tbody>
          {data?.map((row) => (
            <tr key={row.id}>
              <td className="mono" style={{ fontWeight: 500 }}>{row.ticker}</td>
              <td className="text-muted">{row.reason}</td>
              <td style={{ textAlign: 'right' }}>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(row.ticker)}>
                  {t('common.delete')}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

// ── Discover with AI Tab ─────────────────────────────────────────────────────
function DiscoverTab() {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(false)
  const { data: prompt, isLoading: promptLoading } = useDiscoveryPrompt(enabled)
  const bulkImport = useBulkImport()
  const [pasted, setPasted] = useState('')
  const [parseError, setParseError] = useState('')
  const [result, setResult] = useState<BulkImportResponse | null>(null)

  const copyPrompt = async () => {
    if (prompt?.prompt) await navigator.clipboard.writeText(prompt.prompt)
  }

  const submitJson = async () => {
    setParseError('')
    setResult(null)
    let parsed: { items?: BulkImportItem[] }
    try {
      parsed = JSON.parse(pasted)
    } catch {
      setParseError(t('manage_universe.invalid_json'))
      return
    }
    if (!parsed.items || !Array.isArray(parsed.items)) {
      setParseError(t('manage_universe.json_missing_items'))
      return
    }
    try {
      const res = await bulkImport.mutateAsync({ items: parsed.items })
      setResult(res)
      if (res.added > 0) setPasted('')
    } catch {
      setParseError(t('common.error'))
    }
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Card.Header
          title={t('manage_universe.step1_prompt')}
          subtitle={t('manage_universe.step1_subtitle')}
        />
        <Card.Body>
          {!enabled ? (
            <Button onClick={() => setEnabled(true)}>{t('manage_universe.generate_prompt')}</Button>
          ) : promptLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <textarea
                readOnly
                value={prompt?.prompt ?? ''}
                style={{ width: '100%', minHeight: 280, fontFamily: 'monospace', fontSize: 12, padding: 8 }}
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button onClick={copyPrompt}>{t('manage_universe.copy_prompt')}</Button>
                {prompt?.finviz_screener_url && (
                  <a href={prompt.finviz_screener_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary">↗ {t('manage_universe.open_finviz')}</Button>
                  </a>
                )}
              </div>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
                {t('manage_universe.finviz_hint')}
              </p>
            </>
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header
          title={t('manage_universe.step2_paste')}
          subtitle={t('manage_universe.step2_subtitle')}
        />
        <Card.Body>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder='{"items": [{"ticker": "...", ...}]}'
            style={{ width: '100%', minHeight: 200, fontFamily: 'monospace', fontSize: 12, padding: 8 }}
          />
          {parseError && <p style={{ color: 'var(--error, red)', marginTop: 8 }}>{parseError}</p>}
          <div style={{ marginTop: 8 }}>
            <Button onClick={submitJson} loading={bulkImport.isPending} disabled={!pasted.trim()}>
              {t('manage_universe.import_json')}
            </Button>
          </div>

          {result && (
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <Badge variant="success">{t('manage_universe.added')}: {result.added}</Badge>{' '}
                <Badge variant="muted">{t('manage_universe.skipped')}: {result.skipped}</Badge>{' '}
                <Badge variant={result.errors > 0 ? 'danger' : 'muted'}>{t('manage_universe.errors')}: {result.errors}</Badge>
              </div>
              <table className="table">
                <thead><tr><th>Ticker</th><th>Status</th><th>Detail</th></tr></thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <tr key={i}>
                      <td className="mono">{r.ticker}</td>
                      <td>{r.status}</td>
                      <td className="text-muted">{r.detail ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ManageUniverse() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('etfs')

  return (
    <div className="content">
      <div className="content__inner">
        <Card>
          <Card.Header
            title={t('manage_universe.title')}
            subtitle={t('manage_universe.subtitle')}
            actions={
              <Link to="/universe">
                <Button variant="secondary" size="sm">← {t('manage_universe.back_to_browser')}</Button>
              </Link>
            }
          />
          <Card.Body>
            <div style={{ marginBottom: 16 }}>
              <Seg<Tab>
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'etfs', label: t('manage_universe.tab_etfs') },
                  { value: 'blacklist', label: t('manage_universe.tab_blacklist') },
                  { value: 'discover', label: t('manage_universe.tab_discover') },
                ]}
              />
            </div>
            {tab === 'etfs' && <ETFsTab />}
            {tab === 'blacklist' && <BlacklistTab />}
            {tab === 'discover' && <DiscoverTab />}
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}
