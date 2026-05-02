import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuckets } from '@/api/buckets'
import {
  useStartArchitectSession,
  useArchitectSession,
  useIngestCandidates,
  useEngineerPrompt,
  useIngestAllocation,
  useReviewDrawdown,
  useConfirmArchitectSession,
} from '@/api/architect'
import type { AllocationItem, DrawdownSimulationResponse, UcitsAdvisory } from '@/types/api'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Badge } from '@/components/common/Badge'
import { Toast } from '@/components/common/Toast'

type Step = 1 | 2 | 3 | 4 | 5 | 6

export default function Architect() {
  const { t } = useTranslation()
  const { data: bucketsData } = useBuckets()
  const buckets = (bucketsData ?? []).filter((b) => !b.is_archived)

  const [step, setStep] = useState<Step>(1)
  const [bucketId, setBucketId] = useState<number>(buckets[0]?.id ?? 0)
  const [sessionId, setSessionId] = useState<number>(0)
  const [goalDesc, setGoalDesc] = useState('')
  const [targetAmount, setTargetAmount] = useState<number | undefined>()
  const [monthlyDeposit, setMonthlyDeposit] = useState<number | undefined>()
  const [tickersInput, setTickersInput] = useState('')
  const [allocationJson, setAllocationJson] = useState('')
  const [rationale, setRationale] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [ucitsAdvisory, setUcitsAdvisory] = useState<UcitsAdvisory | null>(null)
  const [ucitsDismissed, setUcitsDismissed] = useState(false)
  const [showAllUcits, setShowAllUcits] = useState(false)
  const [drawdownReport, setDrawdownReport] = useState<DrawdownSimulationResponse | null>(null)

  const startSession = useStartArchitectSession()
  const { data: session } = useArchitectSession(sessionId)
  const ingestCandidates = useIngestCandidates(sessionId)
  const { data: engineerPrompt } = useEngineerPrompt(sessionId)
  const ingestAllocation = useIngestAllocation(sessionId)
  const reviewDrawdown = useReviewDrawdown(sessionId)
  const confirmSession = useConfirmArchitectSession(sessionId)

  const STEP_TITLES: Record<Step, string> = {
    1: t('architect.step1_title'),
    2: t('architect.step2_title'),
    3: t('architect.step3_title'),
    4: t('architect.step4_title'),
    5: t('architect.step5_title'),
    6: t('architect.step6_title'),
  }

  const handleStart = async () => {
    const res = await startSession.mutateAsync({
      bucket_id: bucketId,
      investor_profile: {
        goal_description: goalDesc,
        target_amount_ils: targetAmount,
        monthly_deposit_ils: monthlyDeposit,
      },
    })
    setSessionId(res.session_id)
    setStep(2)
  }

  const handleIngestCandidates = async () => {
    const tickers = tickersInput.split(/[\s,]+/).filter(Boolean).map((tk) => tk.toUpperCase())
    await ingestCandidates.mutateAsync(tickers)
    setStep(3)
  }

  const handleIngestAllocation = async () => {
    let parsed: { allocation: AllocationItem[]; rationale?: string }
    try {
      parsed = JSON.parse(allocationJson) as { allocation: AllocationItem[]; rationale?: string }
    } catch {
      setToast({ msg: 'Invalid JSON', type: 'error' })
      return
    }
    const res = await ingestAllocation.mutateAsync({
      allocation: parsed.allocation,
      rationale: parsed.rationale ?? rationale,
    })
    setUcitsAdvisory(res.ucits_advisory)
    setUcitsDismissed(false)
    setShowAllUcits(false)
    setDrawdownReport(null)  // new allocation invalidates prior drawdown review
    if (res.status === 'PENDING_REVIEW') {
      setToast({ msg: t('architect.cooling_off', { time: res.cooling_off_until ?? '' }), type: 'error' })
    } else {
      setStep(5)
    }
  }

  const handleReviewDrawdown = async () => {
    const res = await reviewDrawdown.mutateAsync()
    setDrawdownReport(res)
    setStep(6)
  }

  const handleConfirm = async () => {
    const res = await confirmSession.mutateAsync()
    setToast({ msg: t('architect.confirmed', { n: res.holdings_written }), type: 'success' })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('architect.title')}</h1>

      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3, 4, 5] as Step[]).map((s) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}
          />
        ))}
      </div>

      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{STEP_TITLES[step]}</h2>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('buckets.title')}</label>
            <select
              className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800"
              value={bucketId}
              onChange={(e) => setBucketId(Number(e.target.value))}
            >
              {buckets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Input label={t('architect.goal_desc')} value={goalDesc} onChange={(e) => setGoalDesc(e.target.value)} />
          <Input
            label={t('architect.target_amount_ils')}
            type="number"
            value={targetAmount ?? ''}
            onChange={(e) => setTargetAmount(e.target.value ? Number(e.target.value) : undefined)}
          />
          <Input
            label={t('architect.monthly_deposit_ils')}
            type="number"
            value={monthlyDeposit ?? ''}
            onChange={(e) => setMonthlyDeposit(e.target.value ? Number(e.target.value) : undefined)}
          />
          <Button onClick={handleStart} loading={startSession.isPending}>{t('architect.start')}</Button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <Input
            label="Tickers"
            placeholder={t('architect.tickers_placeholder')}
            value={tickersInput}
            onChange={(e) => setTickersInput(e.target.value)}
          />
          <Button onClick={handleIngestCandidates} loading={ingestCandidates.isPending}>
            {t('architect.ingest')}
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          {session?.shortlist && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-semibold text-success mb-2">{t('architect.accepted')}</p>
                {session.shortlist.filter((c) => c.is_valid).map((c) => (
                  <div key={c.ticker} className="flex items-center gap-2 mb-1">
                    <span className="font-mono">{c.ticker}</span>
                    {c.composite_score != null && <Badge color="green">{c.composite_score.toFixed(1)}</Badge>}
                  </div>
                ))}
              </div>
              <div>
                <p className="font-semibold text-danger mb-2">{t('architect.rejected')}</p>
                {session.shortlist.filter((c) => !c.is_valid).map((c) => (
                  <div key={c.ticker} className="flex items-center gap-2 mb-1">
                    <span className="font-mono">{c.ticker}</span>
                    {c.rejection_reason && <Badge color="red">{c.rejection_reason}</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {engineerPrompt && (
            <div>
              <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Engineer Prompt</p>
              <pre className="text-xs bg-gray-50 dark:bg-gray-900 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                {engineerPrompt.engineer_prompt}
              </pre>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => { void navigator.clipboard.writeText(engineerPrompt.engineer_prompt) }}
              >
                {t('architect.copy_prompt')}
              </Button>
            </div>
          )}

          <Button onClick={() => setStep(4)}>{t('common.next')}</Button>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('architect.paste_json')}</label>
            <textarea
              className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 font-mono h-48"
              value={allocationJson}
              onChange={(e) => setAllocationJson(e.target.value)}
              placeholder='{"allocation":[{"ticker":"VTI","weight_pct":60}],"rationale":"..."}'
            />
          </div>
          <Input
            label={t('architect.rationale')}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
          />
          <Button onClick={handleIngestAllocation} loading={ingestAllocation.isPending}>
            {t('architect.ingest')}
          </Button>
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-4">
          {ucitsAdvisory && !ucitsDismissed && (
            <div
              role="region"
              aria-label="UCITS advisory"
              className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 p-4"
            >
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                ℹ️ {t('architect.ucits_advisory_title')}
              </p>
              <p className="text-sm text-emerald-900 dark:text-emerald-100 mb-3">
                {t('architect.ucits_advisory_body', { us_pct: ucitsAdvisory.params.us_pct })}
              </p>
              <ul className="text-sm text-emerald-900 dark:text-emerald-100 space-y-1 mb-3">
                {Object.entries(ucitsAdvisory.params.suggestions)
                  .slice(0, showAllUcits ? undefined : 3)
                  .map(([usTicker, alts]) => (
                    <li key={usTicker} className="font-mono">
                      • {usTicker} → {alts.join(' / ')}
                    </li>
                  ))}
              </ul>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-3">
                {t('architect.ucits_disclaimer')}
              </p>
              <div className="flex gap-2">
                {!showAllUcits && Object.keys(ucitsAdvisory.params.suggestions).length > 3 && (
                  <button
                    onClick={() => setShowAllUcits(true)}
                    className="text-xs px-3 py-1 rounded border border-emerald-400 text-emerald-700 dark:text-emerald-200 dark:border-emerald-600"
                  >
                    {t('architect.ucits_show_all')}
                  </button>
                )}
                <button
                  onClick={() => setUcitsDismissed(true)}
                  className="text-xs px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                >
                  {t('architect.ucits_dismiss')}
                </button>
              </div>
            </div>
          )}

          {session?.final_allocation?.map((a) => (
            <div key={a.ticker} className="flex justify-between text-sm py-1.5 border-b border-gray-100 dark:border-gray-700">
              <span className="font-mono">{a.ticker}</span>
              <span>{a.weight_pct}%</span>
            </div>
          ))}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('architect.drawdown_review_hint')}
          </p>
          <Button onClick={handleReviewDrawdown} loading={reviewDrawdown.isPending}>
            {t('architect.review_drawdown')}
          </Button>
        </div>
      )}

      {step === 6 && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-4">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
              ⚠️ {t('architect.drawdown_report_title')}
            </p>
            {drawdownReport && (
              <>
                <p className="text-sm text-amber-900 dark:text-amber-100 mb-3">
                  {t('architect.drawdown_report_worst', {
                    pct: drawdownReport.worst_case_pct?.toFixed(1) ?? '—',
                    amount: drawdownReport.worst_case_amount_usd?.toFixed(0) ?? '—',
                  })}
                </p>
                <table className="w-full text-xs text-amber-900 dark:text-amber-100">
                  <thead>
                    <tr className="border-b border-amber-300 dark:border-amber-700">
                      <th className="text-start py-1">{t('architect.drawdown_scenario')}</th>
                      <th className="text-end py-1">{t('architect.drawdown_loss_pct')}</th>
                      <th className="text-end py-1">{t('architect.drawdown_loss_usd')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drawdownReport.scenarios.map((s) => (
                      <tr key={s.name}>
                        <td className="py-1">{s.name}</td>
                        <td className="text-end py-1 font-mono">
                          {s.portfolio_drawdown_pct?.toFixed(1) ?? '—'}%
                        </td>
                        <td className="text-end py-1 font-mono">
                          ${s.portfolio_loss_usd?.toFixed(0) ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('architect.confirm_acknowledgement')}
          </p>
          <Button onClick={handleConfirm} loading={confirmSession.isPending}>
            {t('architect.confirm_session')}
          </Button>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
