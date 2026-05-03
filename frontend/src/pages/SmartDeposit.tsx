import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useBuckets } from '@/api/buckets'
import { useCalculateDeposit, useConfirmDeposit, useDepositHistory } from '@/api/deposits'
import type { DepositPlan } from '@/types/api'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Badge } from '@/components/common/Badge'
import { Toast } from '@/components/common/Toast'
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
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('deposit.title')}</h1>

      <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('deposit.bucket_label')}</label>
            <select
              className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800"
              value={bucketId}
              onChange={(e) => { setBucketId(Number(e.target.value)); setPlan(null) }}
            >
              {buckets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Input
            id="deposit-amount"
            label={t('deposit.amount_label')}
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('deposit.currency_label')}</label>
            <select
              className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'USD' | 'ILS')}
            >
              <option value="USD">{t('common.usd')}</option>
              <option value="ILS">{t('common.ils')}</option>
            </select>
          </div>
        </div>
        <Button onClick={handleCalculate} loading={calculateDeposit.isPending}>{t('deposit.calculate')}</Button>
      </div>

      {plan && (
        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm mb-6">
          <h2 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('deposit.plan_title')}</h2>
          {plan.prices_stale && <p className="text-xs text-warning mb-3">{t('deposit.prices_stale')}</p>}
          {plan.warning && <p className="text-xs text-warning mb-3">{t(plan.warning as Parameters<typeof t>[0])}</p>}

          <div className="divide-y divide-gray-100 dark:divide-gray-700 mb-4">
            {plan.orders.map((order) => (
              <div key={order.ticker} className="flex justify-between py-2.5 text-sm">
                <span>
                  <span className="font-mono font-medium">{order.ticker}</span>
                  {' — '}
                  {t('deposit.buy')} {order.units} {t('deposit.units')} {t('deposit.at_price')} ${order.est_price_usd.toFixed(2)}
                </span>
                <span className="font-medium">${order.est_total_usd.toFixed(0)}</span>
              </div>
            ))}
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            <div className="flex justify-between"><span>{t('deposit.total_allocated')}</span><span>${plan.total_allocated_usd.toFixed(0)}</span></div>
            <div className="flex justify-between"><span>{t('deposit.remainder')}</span><span>${plan.remainder_usd.toFixed(2)}</span></div>
          </div>

          <Button onClick={handleConfirm} loading={confirmDeposit.isPending}>{t('deposit.confirm_btn')}</Button>
        </div>
      )}

      <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
        <h2 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('deposit.history_title')}</h2>
        {!history || history.length === 0 ? (
          <p className="text-sm text-gray-400">{t('deposit.no_history')}</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
            {history.map((h) => (
              <div key={h.id} className="flex justify-between py-2.5">
                <span>{formatDate(h.created_at)}</span>
                <span>{formatCurrency(h.amount, 'USD')}</span>
                <Badge color="green">{h.orders.length} orders</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
