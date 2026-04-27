import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  useBuckets,
  useBucketHoldings,
  useCreateBucket,
  useArchiveBucket,
  useCreateHolding,
} from '@/api/buckets'
import type { BucketCreate, HoldingCreate } from '@/types/api'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { Badge } from '@/components/common/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'

const HORIZON_TYPES = ['SHORT', 'MEDIUM', 'LONG'] as const

function CreateBucketModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const createBucket = useCreateBucket()
  const [form, setForm] = useState<BucketCreate>({
    name: '',
    horizon_type: 'LONG',
    target_amount: undefined,
    target_date: undefined,
    description: '',
  })

  const handleSubmit = async () => {
    await createBucket.mutateAsync(form)
    onClose()
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
      <div className="flex flex-col gap-4">
        <Input
          label={t('buckets.name')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('buckets.horizon_type')}</label>
          <select
            className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800"
            value={form.horizon_type}
            onChange={(e) => setForm({ ...form, horizon_type: e.target.value as typeof form.horizon_type })}
          >
            {HORIZON_TYPES.map((h) => (
              <option key={h} value={h}>{t(`horizon.${h}`)}</option>
            ))}
          </select>
        </div>
        <Input
          label={t('buckets.target_amount')}
          type="number"
          value={form.target_amount ?? ''}
          onChange={(e) => setForm({ ...form, target_amount: e.target.value ? Number(e.target.value) : undefined })}
        />
        <Input
          label={t('buckets.target_date')}
          type="date"
          value={form.target_date ?? ''}
          onChange={(e) => setForm({ ...form, target_date: e.target.value || undefined })}
        />
        <Input
          label={t('buckets.description')}
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        {form.horizon_type === 'SHORT' && (
          <p className="text-xs text-warning">{t('buckets.short_warning')}</p>
        )}
      </div>
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
      <div className="flex flex-col gap-4">
        <Input label="Ticker" value={ticker} onChange={(e) => setTicker(e.target.value)} />
        <Input label={t('architect.weight_pct')} type="number" value={targetPct} onChange={(e) => setTargetPct(Number(e.target.value))} />
        <Input label="Units" type="number" value={units} onChange={(e) => setUnits(Number(e.target.value))} />
        <Input label="Avg Cost (USD)" type="number" value={avgCost} onChange={(e) => setAvgCost(Number(e.target.value))} />
      </div>
    </Modal>
  )
}

function BucketCard({ bucket }: { bucket: { id: number; name: string; horizon_type: string; is_archived: boolean } }) {
  const { t } = useTranslation()
  const archiveBucket = useArchiveBucket()
  const { data: holdingsData } = useBucketHoldings(bucket.id)
  const [showHoldings, setShowHoldings] = useState(false)
  const [showAddHolding, setShowAddHolding] = useState(false)

  const horizonColor = { SHORT: 'blue', MEDIUM: 'yellow', LONG: 'green' }[bucket.horizon_type] as 'blue' | 'yellow' | 'green'

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{bucket.name}</h3>
          <Badge color={horizonColor} className="mt-1">{t(`horizon.${bucket.horizon_type}`)}</Badge>
        </div>
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
      </div>

      <div className="flex gap-2 mt-3">
        <Button variant="secondary" size="sm" onClick={() => setShowHoldings((v) => !v)}>
          {t('buckets.holdings')} ({holdingsData?.holdings.length ?? 0})
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setShowAddHolding(true)}>+</Button>
        <Link to={`/deposit?bucket=${bucket.id}`}>
          <Button size="sm">{t('buckets.smart_deposit')}</Button>
        </Link>
      </div>

      {showHoldings && holdingsData && (
        <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-700 text-sm">
          {holdingsData.holdings.map((h) => (
            <div key={h.ticker} className="flex justify-between py-1.5">
              <span className="font-mono font-medium">{h.ticker}</span>
              <span className="text-gray-500">
                {h.current_pct.toFixed(1)}% / {h.target_pct.toFixed(1)}%
              </span>
            </div>
          ))}
          {holdingsData.holdings.length === 0 && (
            <p className="py-4 text-center text-gray-400">{t('buckets.no_holdings')}</p>
          )}
        </div>
      )}

      {showAddHolding && <AddHoldingModal bucketId={bucket.id} onClose={() => setShowAddHolding(false)} />}
    </div>
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

  if (isLoading) return <LoadingSpinner className="py-32" />

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('buckets.title')}</h1>
        <Button onClick={() => setShowCreate(true)}>{t('buckets.new_bucket')}</Button>
      </div>

      {active.length === 0 ? (
        <EmptyState
          message={t('dashboard.no_buckets')}
          action={<Button onClick={() => setShowCreate(true)}>{t('dashboard.create_first')}</Button>}
        />
      ) : (
        <div className="grid gap-4">
          {active.map((b) => <BucketCard key={b.id} bucket={b} />)}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-8">
          <button
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3"
            onClick={() => setShowArchived((v) => !v)}
          >
            {t('buckets.show_archived')} ({archived.length})
          </button>
          {showArchived && (
            <div className="grid gap-4 opacity-60">
              {archived.map((b) => <BucketCard key={b.id} bucket={b} />)}
            </div>
          )}
        </div>
      )}

      {showCreate && <CreateBucketModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
