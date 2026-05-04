import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  useBuckets,
  useBucketHoldings,
  useCreateBucket,
  useArchiveBucket,
  useDeleteBucket,
  useCreateHolding,
} from '@/api/buckets'
import type { BucketCreate, HoldingCreate, Bucket } from '@/types/api'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { Card, Button, Badge, Modal, Field, Input, Select, Icon, Seg, InputGroup } from '@/components/design'
import { formatCurrency } from '@/utils/formatting'

const HORIZON_TYPES = ['SHORT', 'MEDIUM', 'LONG'] as const

function CreateBucketModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const createBucket = useCreateBucket()
  const [form, setForm] = useState<BucketCreate>({
    name: '',
    horizon_type: 'LONG',
    initial_investment: undefined,
    target_amount: undefined,
    target_date: undefined,
    target_currency: 'USD',
    description: '',
  })
  const [nameError, setNameError] = useState('')
  const [submitError, setSubmitError] = useState('')

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setNameError(t('buckets.name_required'))
      return
    }
    setNameError('')
    setSubmitError('')
    try {
      await createBucket.mutateAsync(form)
      onClose()
    } catch {
      setSubmitError(t('common.error'))
    }
  }

  return (
    <Modal
      open
      title={t('buckets.create_title')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} loading={createBucket.isPending}>{t('common.save')}</Button>
        </>
      }
    >
      <Field label={t('buckets.name')}>
        <Input
          value={form.name}
          onChange={(e) => { setForm({ ...form, name: e.target.value }); setNameError('') }}
        />
        {nameError && <p className="hint" style={{ color: 'var(--error, red)', marginTop: 4 }}>{nameError}</p>}
      </Field>
      <Field label={t('buckets.horizon_type')}>
        <Select
          value={form.horizon_type}
          onChange={(e) => setForm({ ...form, horizon_type: e.target.value as typeof form.horizon_type })}
        >
          {HORIZON_TYPES.map((h) => (
            <option key={h} value={h}>{t(`horizon.${h}`)}</option>
          ))}
        </Select>
      </Field>
      <Field label={t('buckets.target_currency')}>
        <Seg<'USD' | 'ILS'>
          value={form.target_currency as 'USD' | 'ILS'}
          onChange={(v) => setForm({ ...form, target_currency: v })}
          options={[
            { value: 'USD', label: 'USD' },
            { value: 'ILS', label: 'ILS' },
          ]}
        />
      </Field>
      <Field label={t('buckets.initial_investment')}>
        <InputGroup prefix={form.target_currency === 'USD' ? '$' : '₪'}>
          <input
            className="input-group__input tnum"
            type="number"
            placeholder="0"
            value={form.initial_investment ?? ''}
            onChange={(e) => setForm({ ...form, initial_investment: e.target.value ? Number(e.target.value) : undefined })}
          />
        </InputGroup>
        <p className="hint" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{t('buckets.initial_investment_hint')}</p>
      </Field>
      <Field label={t('buckets.target_amount')}>
        <InputGroup prefix={form.target_currency === 'USD' ? '$' : '₪'}>
          <input
            className="input-group__input tnum"
            type="number"
            placeholder="—"
            value={form.target_amount ?? ''}
            onChange={(e) => setForm({ ...form, target_amount: e.target.value ? Number(e.target.value) : undefined })}
          />
        </InputGroup>
        <p className="hint" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{t('buckets.target_amount_hint')}</p>
      </Field>
      <Field label={t('buckets.target_date')}>
        <Input
          type="date"
          value={form.target_date ?? ''}
          onChange={(e) => setForm({ ...form, target_date: e.target.value || undefined })}
        />
        <p className="hint" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{t('buckets.target_date_hint')}</p>
      </Field>
      <Field label={t('buckets.description')}>
        <Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      {form.horizon_type === 'SHORT' && (
        <p className="hint" style={{ color: 'var(--warning)' }}>{t('buckets.short_warning')}</p>
      )}
      {submitError && (
        <p style={{ color: 'var(--error, red)', marginTop: 8 }}>{submitError}</p>
      )}
    </Modal>
  )
}

function AddHoldingModal({ bucketId, onClose }: { bucketId: number; onClose: () => void }) {
  const { t } = useTranslation()
  const createHolding = useCreateHolding()
  const [ticker, setTicker] = useState('')
  const [targetPct, setTargetPct] = useState(0)
  const [units, setUnits] = useState(0)
  const [avgCost, setAvgCost] = useState(0)

  const handleSubmit = async () => {
    const data: HoldingCreate = {
      bucket_id: bucketId,
      ticker: ticker.toUpperCase(),
      target_pct: targetPct,
      units,
      avg_cost_usd: avgCost,
    }
    await createHolding.mutateAsync(data)
    onClose()
  }

  return (
    <Modal
      open
      title={t('buckets.holdings')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} loading={createHolding.isPending}>{t('common.save')}</Button>
        </>
      }
    >
      <Field label="Ticker"><Input value={ticker} onChange={(e) => setTicker(e.target.value)} /></Field>
      <Field label={t('architect.weight_pct')}>
        <Input type="number" value={targetPct} onChange={(e) => setTargetPct(Number(e.target.value))} />
      </Field>
      <Field label="Units">
        <Input type="number" value={units} onChange={(e) => setUnits(Number(e.target.value))} />
      </Field>
      <Field label="Avg Cost (USD)">
        <Input type="number" value={avgCost} onChange={(e) => setAvgCost(Number(e.target.value))} />
      </Field>
    </Modal>
  )
}

const HORIZON_VARIANT: Record<Bucket['horizon_type'], 'info' | 'warning' | 'success'> = {
  SHORT: 'info',
  MEDIUM: 'warning',
  LONG: 'success',
}

function BucketCard({ bucket }: { bucket: Bucket }) {
  const { t } = useTranslation()
  const archiveBucket = useArchiveBucket()
  const deleteBucket = useDeleteBucket()
  const { data: holdingsData } = useBucketHoldings(bucket.id)
  const [showHoldings, setShowHoldings] = useState(false)
  const [showAddHolding, setShowAddHolding] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

  const totalValue = (bucket.target_currency === 'ILS' && holdingsData?.total_value_ils != null)
    ? holdingsData.total_value_ils
    : (holdingsData?.total_value_usd ?? 0)
  const currency = (bucket.target_currency as 'USD' | 'ILS') || 'USD'
  const pct = bucket.target_amount ? (totalValue / bucket.target_amount) * 100 : null

  return (
    <Card interactive>
      <Card.Body>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{bucket.name}</div>
            <div style={{ marginTop: 4 }}>
              <Badge variant={HORIZON_VARIANT[bucket.horizon_type]}>
                {t(`horizon.${bucket.horizon_type}`)}
              </Badge>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {!bucket.is_archived && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => archiveBucket.mutate(bucket.id)}
                loading={archiveBucket.isPending}
              >
                {t('common.archive')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirmDelete(true)}
              style={{ color: 'var(--error, #ff4d4f)' }}
            >
              <Icon name="trash" size={14} />
            </Button>
          </div>
        </div>

        {showConfirmDelete && (
          <Modal
            open
            title={t('common.confirm')}
            onClose={() => setShowConfirmDelete(false)}
            footer={
              <>
                <Button variant="secondary" onClick={() => setShowConfirmDelete(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    deleteBucket.mutate({ id: bucket.id, password: deletePassword })
                    setDeletePassword('')
                  }}
                  loading={deleteBucket.isPending}
                  disabled={!deletePassword}
                >
                  {t('common.delete')}
                </Button>
              </>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p>{t('buckets.delete_confirm_msg', { name: bucket.name })}</p>
              <div className="field">
                <label className="field__label">{t('settings.password_label', { defaultValue: 'Confirm Password' })}</label>
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              {deleteBucket.isError && (
                <p style={{ color: 'var(--danger)', fontSize: 12 }}>
                  {t('settings.invalid_password', { defaultValue: 'Invalid password' })}
                </p>
              )}
            </div>
          </Modal>
        )}

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="tnum" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
                {formatCurrency(totalValue, currency)}
              </span>
              {bucket.target_amount && (
                <span className="tnum" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  / {formatCurrency(bucket.target_amount, currency)}
                </span>
              )}
            </div>
            {bucket.initial_investment && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {t('buckets.initial_investment')}: {formatCurrency(bucket.initial_investment, (bucket.target_currency as 'USD' | 'ILS') || 'USD')}
              </div>
            )}
          </div>
          {pct !== null && (
            <div
              style={{
                marginTop: 10,
                height: 4,
                background: 'var(--bg-elevated)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  transition: 'width 180ms',
                }}
              />
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={() => setShowHoldings((v) => !v)}>
            {t('buckets.holdings')} ({holdingsData?.holdings.length ?? 0})
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowAddHolding(true)}>
            <Icon name="plus" size={12} />
          </Button>
          <Link to={`/deposit?bucket=${bucket.id}`}>
            <Button size="sm">{t('buckets.smart_deposit')}</Button>
          </Link>
        </div>

        {showHoldings && holdingsData && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
            {holdingsData.holdings.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                {t('buckets.no_holdings')}
              </p>
            ) : (
              holdingsData.holdings.map((h) => (
                <div
                  key={h.ticker}
                  className="tnum"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    fontSize: 13,
                  }}
                >
                  <span className="mono" style={{ fontWeight: 500 }}>{h.ticker}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {h.current_pct.toFixed(1)}% / {h.target_pct.toFixed(1)}%
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {showAddHolding && <AddHoldingModal bucketId={bucket.id} onClose={() => setShowAddHolding(false)} />}
      </Card.Body>
    </Card>
  )
}

export default function BucketsPage() {
  const { t } = useTranslation()
  const [showCreate, setShowCreate] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const { data, isLoading } = useBuckets(showArchived)

  const buckets = data ?? []
  const active = buckets.filter((b) => !b.is_archived)
  const archived = buckets.filter((b) => b.is_archived)

  if (isLoading) return <div className="content"><LoadingSpinner /></div>

  return (
    <div className="content">
      <div className="content__inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>{t('buckets.title')}</div>
          <Button onClick={() => setShowCreate(true)}>
            <Icon name="plus" size={12} /> {t('buckets.new_bucket')}
          </Button>
        </div>

        {active.length === 0 ? (
          <Card>
            <Card.Body>
              <EmptyState
                title={t('dashboard.no_buckets')}
                message={t('dashboard.create_first')}
                action={<Button onClick={() => setShowCreate(true)}>{t('dashboard.create_first')}</Button>}
              />
            </Card.Body>
          </Card>
        ) : (
          <div className="grid-cols-3">
            {active.map((b) => <BucketCard key={b.id} bucket={b} />)}
          </div>
        )}

        {archived.length > 0 && (
          <div>
            <button
              type="button"
              className="hint"
              onClick={() => setShowArchived((v) => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {t('buckets.show_archived')} ({archived.length})
            </button>
            {showArchived && (
              <div className="grid-cols-3" style={{ marginTop: 12, opacity: 0.6 }}>
                {archived.map((b) => <BucketCard key={b.id} bucket={b} />)}
              </div>
            )}
          </div>
        )}

        {showCreate && <CreateBucketModal onClose={() => setShowCreate(false)} />}
      </div>
    </div>
  )
}
