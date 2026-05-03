import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useBuckets } from '@/api/buckets'
import { useCalculateDeposit, useConfirmDeposit, useDepositHistory } from '@/api/deposits'
import type { DepositPlan } from '@/types/api'
import { Card, Button, Badge, Field, Select, InputGroup, Seg, Icon } from '@/components/design'
import { Toast } from '@/components/common/Toast'
import { EmptyState } from '@/components/common/EmptyState'
import { formatCurrency, formatDate } from '@/utils/formatting'

export default function SmartDeposit() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { data: bucketsData } = useBuckets()
  const buckets = (bucketsData ?? []).filter((b) => !b.is_archived)

  const [bucketId, setBucketId] = useState<number>(
    Number(searchParams.get('bucket') ?? buckets[0]?.id ?? 0),
  )
  const [amount, setAmount] = useState<number>(1000)
  const [currency, setCurrency] = useState<'USD' | 'ILS'>('USD')
  const [plan, setPlan] = useState<DepositPlan | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const calculateDeposit = useCalculateDeposit()
  const confirmDeposit = useConfirmDeposit()
  const { data: history } = useDepositHistory(bucketId)

  const handleCalculate = async () => {
    const result = await calculateDeposit.mutateAsync({ bucket_id: bucketId, amount, currency })
    setPlan(result)
  }

  const handleConfirm = async () => {
    if (!plan) return
    const result = await confirmDeposit.mutateAsync(plan.plan_token)
    setToast({ message: t('deposit.success_msg', { orders: result.orders_placed }), type: 'success' })
    if (result.obsidian_file_path) {
      setToast({ message: t('deposit.obsidian_written', { path: result.obsidian_file_path }), type: 'success' })
    }
    setPlan(null)
  }

  return (
    <div className="content">
      <div className="content__inner">
        <Card>
          <Card.Header title={t('deposit.title')} subtitle={t('deposit.bucket_label')} />
          <Card.Body>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <Field label={t('deposit.bucket_label')}>
                <Select
                  value={bucketId}
                  onChange={(e) => { setBucketId(Number(e.target.value)); setPlan(null) }}
                >
                  {buckets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label={t('deposit.amount_label')}>
                <InputGroup prefix={currency === 'USD' ? '$' : '₪'}>
                  <input
                    className="input-group__input tnum"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </InputGroup>
              </Field>
              <Field label={t('deposit.currency_label')}>
                <Seg<'USD' | 'ILS'>
                  fullWidth
                  value={currency}
                  onChange={(v) => setCurrency(v)}
                  options={[
                    { value: 'USD', label: 'USD' },
                    { value: 'ILS', label: 'ILS' },
                  ]}
                />
              </Field>
              <Button onClick={handleCalculate} loading={calculateDeposit.isPending}>
                <Icon name="refresh" size={14} />
                {t('deposit.calculate')}
              </Button>
            </div>
            {plan?.fx_rate ? (
              <div className="hint" style={{ marginTop: 10 }}>
                <Icon name="info" size={12} /> 1 USD = {plan.fx_rate.toFixed(2)} ILS
              </div>
            ) : null}
          </Card.Body>
        </Card>

        {plan && (
          <>
            <Card>
              <Card.Header
                title={t('deposit.plan_title')}
                subtitle={plan.warning ? t(plan.warning as Parameters<typeof t>[0]) : undefined}
                actions={<Badge variant="success">dry-run</Badge>}
              />
              <Card.Body>
                {plan.prices_stale && (
                  <p className="hint" style={{ color: 'var(--warning)', marginBottom: 12 }}>
                    {t('deposit.prices_stale')}
                  </p>
                )}
                {plan.orders.map((o) => (
                  <div key={o.ticker} className="order-row">
                    <div className="order-row__icon"><Icon name="plus" size={14} /></div>
                    <div className="order-row__ticker mono">{o.ticker}</div>
                    <div className="order-row__name">{t('deposit.buy')} {o.units} {t('deposit.units')}</div>
                    <div className="order-row__num">{o.units} {t('deposit.units')}</div>
                    <div className="order-row__num text-muted">@ ${o.est_price_usd.toFixed(2)}</div>
                    <div className="order-row__num" style={{ fontWeight: 500 }}>
                      {formatCurrency(o.est_total_usd, 'USD')}
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{t('deposit.remainder')}</div>
                    <div className="tnum" style={{ fontSize: 13 }}>
                      {formatCurrency(plan.remainder_usd, 'USD')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div className="text-muted" style={{ fontSize: 12 }}>{t('deposit.total_allocated')}</div>
                    <div className="tnum" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
                      {formatCurrency(plan.total_allocated_usd, 'USD')}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <div className="reminder">
              <div
                className="reminder__icon"
                style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}
              >
                <Icon name="info" size={14} />
              </div>
              <div className="reminder__body">{t('deposit.confirm_btn')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={() => setPlan(null)}>{t('common.back')}</Button>
                <Button onClick={handleConfirm} loading={confirmDeposit.isPending}>
                  <Icon name="check" size={14} /> {t('common.confirm')}
                </Button>
              </div>
            </div>
          </>
        )}

        <Card>
          <Card.Header title={t('deposit.history_title')} />
          <Card.Body>
            {!history || history.length === 0 ? (
              <EmptyState message={t('deposit.no_history')} />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="num">Amount</th>
                    <th className="num">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>{formatDate(h.created_at)}</td>
                      <td className="num tnum">{formatCurrency(h.amount, 'USD')}</td>
                      <td className="num"><Badge variant="success">{h.orders.length}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card.Body>
        </Card>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  )
}
