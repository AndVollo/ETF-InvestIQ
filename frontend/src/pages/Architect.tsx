import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuckets } from '@/api/buckets'
import {
  useStartArchitectSession,
  useArchitectSession,
  useIngestCandidates,
  useAutoSelectCandidates,
  useEngineerPrompt,
  useIngestAllocation,
  useReviewDrawdown,
  useConfirmArchitectSession,
} from '@/api/architect'
import type { AllocationItem, DrawdownSimulationResponse, UcitsAdvisory } from '@/types/api'
import {
  Card,
  Button,
  Badge,
  Field,
  Input,
  Select,
  Textarea,
  Stepper,
  Icon,
} from '@/components/design'
import { Toast } from '@/components/common/Toast'
import { formatCurrency } from '@/utils/formatting'

type Step = 0 | 1 | 2 | 3 | 4 | 5

export default function Architect() {
  const { t } = useTranslation()
  const { data: bucketsData } = useBuckets()
  const buckets = (bucketsData ?? []).filter((b) => !b.is_archived)

  const [step, setStep] = useState<Step>(0)
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
  const autoSelect = useAutoSelectCandidates(sessionId)
  const { data: engineerPrompt } = useEngineerPrompt(sessionId)
  const ingestAllocation = useIngestAllocation(sessionId)
  const reviewDrawdown = useReviewDrawdown(sessionId)
  const confirmSession = useConfirmArchitectSession(sessionId)

  const STEPS = [
    { label: t('architect.step1_title') },
    { label: t('architect.step2_title') },
    { label: t('architect.step3_title') },
    { label: t('architect.step4_title') },
    { label: t('architect.step5_title') },
    { label: t('architect.step6_title') },
  ]

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
    setStep(1)
  }

  const handleIngestCandidates = async () => {
    const tickers = tickersInput.split(/[\s,]+/).filter(Boolean).map((tk) => tk.toUpperCase())
    await ingestCandidates.mutateAsync(tickers)
    setStep(2)
  }

  const handleAutoSelect = async () => {
    try {
      const res = await autoSelect.mutateAsync()
      const accepted = res.accepted.length
      setToast({ msg: t('architect.auto_select_success', { n: accepted }), type: 'success' })
      setStep(2)
    } catch {
      setToast({ msg: t('common.error'), type: 'error' })
    }
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
    setDrawdownReport(null)
    if (res.status === 'PENDING_REVIEW') {
      setToast({ msg: t('architect.cooling_off', { time: res.cooling_off_until ?? '' }), type: 'error' })
    } else {
      setStep(4)
    }
  }

  const handleReviewDrawdown = async () => {
    const res = await reviewDrawdown.mutateAsync()
    setDrawdownReport(res)
    setStep(5)
  }

  const handleConfirm = async () => {
    const res = await confirmSession.mutateAsync()
    setToast({ msg: t('architect.confirmed', { n: res.holdings_written }), type: 'success' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Stepper steps={STEPS} current={step} />
      <div className="content">
        <div className="content__inner">
          {step === 0 && (
            <Card>
              <Card.Header title={t('architect.step1_title')} subtitle={t('architect.title')} />
              <Card.Body>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Field label={t('buckets.title')}>
                    <Select value={bucketId} onChange={(e) => setBucketId(Number(e.target.value))}>
                      {buckets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </Select>
                  </Field>
                  <Field label={t('architect.goal_desc')}>
                    <Input value={goalDesc} onChange={(e) => setGoalDesc(e.target.value)} />
                  </Field>
                  <Field label={t('architect.target_amount_ils')}>
                    <Input
                      type="number"
                      value={targetAmount ?? ''}
                      onChange={(e) => setTargetAmount(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </Field>
                  <Field label={t('architect.monthly_deposit_ils')}>
                    <Input
                      type="number"
                      value={monthlyDeposit ?? ''}
                      onChange={(e) => setMonthlyDeposit(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </Field>
                  <div>
                    <Button onClick={handleStart} loading={startSession.isPending}>
                      {t('architect.start')}
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <Card.Header
                title={t('architect.step2_title')}
                subtitle={t('architect.step2_subtitle')}
              />
              <Card.Body>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{
                    background: 'var(--surface-2, #f5f5f7)',
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      ✨ {t('architect.auto_select_title')}
                    </div>
                    <div className="text-muted" style={{ fontSize: 13, marginBottom: 10 }}>
                      {t('architect.auto_select_subtitle')}
                    </div>
                    <Button onClick={handleAutoSelect} loading={autoSelect.isPending}>
                      {t('architect.auto_select_button')}
                    </Button>
                  </div>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    color: 'var(--text-muted)', fontSize: 12,
                  }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                    {t('common.or')}
                    <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                  </div>

                  <Field label={t('architect.manual_tickers_label')}>
                    <Input
                      placeholder={t('architect.tickers_placeholder')}
                      value={tickersInput}
                      onChange={(e) => setTickersInput(e.target.value)}
                    />
                  </Field>
                  <div>
                    <Button
                      variant="secondary"
                      onClick={handleIngestCandidates}
                      loading={ingestCandidates.isPending}
                      disabled={!tickersInput.trim()}
                    >
                      {t('architect.ingest')}
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <Card.Header title={t('architect.step3_title')} />
              <Card.Body>
                {session?.shortlist && (
                  <div className="grid-2" style={{ marginBottom: 14 }}>
                    <div>
                      <div className="section-title">{t('architect.accepted')}</div>
                      {session.shortlist.filter((c) => c.is_valid).map((c) => (
                        <div key={c.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                          <span className="mono" style={{ fontSize: 13 }}>{c.ticker}</span>
                          {c.composite_score != null && (
                            <Badge variant="success">{c.composite_score.toFixed(1)}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="section-title">{t('architect.rejected')}</div>
                      {session.shortlist.filter((c) => !c.is_valid).map((c) => (
                        <div key={c.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                          <span className="mono" style={{ fontSize: 13 }}>{c.ticker}</span>
                          {c.rejection_reason && (
                            <Badge variant="danger">{c.rejection_reason}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {engineerPrompt && (
                  <div>
                    <div className="section-title">Engineer Prompt</div>
                    <pre
                      style={{
                        fontSize: 11,
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: 12,
                        overflow: 'auto',
                        maxHeight: 200,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {engineerPrompt.engineer_prompt}
                    </pre>
                    <Button
                      variant="secondary"
                      size="sm"
                      style={{ marginTop: 8 }}
                      onClick={() => { void navigator.clipboard.writeText(engineerPrompt.engineer_prompt) }}
                    >
                      {t('architect.copy_prompt')}
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <Card.Header title={t('architect.step4_title')} subtitle={t('architect.paste_json')} />
              <Card.Body>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Textarea
                    rows={8}
                    value={allocationJson}
                    onChange={(e) => setAllocationJson(e.target.value)}
                    placeholder='{"allocation":[{"ticker":"VTI","weight_pct":60}],"rationale":"..."}'
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  <Field label={t('architect.rationale')}>
                    <Input value={rationale} onChange={(e) => setRationale(e.target.value)} />
                  </Field>
                  <div>
                    <Button onClick={handleIngestAllocation} loading={ingestAllocation.isPending}>
                      {t('architect.ingest')}
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          {step === 4 && (
            <>
              {ucitsAdvisory && !ucitsDismissed && (
                <Card style={{ borderColor: 'var(--success)' }}>
                  <Card.Body>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div
                        style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: 'var(--success-bg)', color: 'var(--success)',
                          display: 'grid', placeItems: 'center', flexShrink: 0,
                        }}
                      >
                        <Icon name="info" size={14} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                          {t('architect.ucits_advisory_title')}
                        </div>
                        <div style={{ fontSize: 13, marginBottom: 8 }}>
                          {t('architect.ucits_advisory_body', { us_pct: ucitsAdvisory.params.us_pct })}
                        </div>
                        <ul style={{ paddingInlineStart: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                          {Object.entries(ucitsAdvisory.params.suggestions)
                            .slice(0, showAllUcits ? undefined : 3)
                            .map(([usTicker, alts]) => (
                              <li key={usTicker} className="mono" style={{ padding: '2px 0' }}>
                                {usTicker} → {alts.join(' / ')}
                              </li>
                            ))}
                        </ul>
                        <div className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>
                          {t('architect.ucits_disclaimer')}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          {!showAllUcits &&
                            Object.keys(ucitsAdvisory.params.suggestions).length > 3 && (
                              <Button size="sm" variant="secondary" onClick={() => setShowAllUcits(true)}>
                                {t('architect.ucits_show_all')}
                              </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setUcitsDismissed(true)}>
                            {t('architect.ucits_dismiss')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              )}

              <Card>
                <Card.Header title={t('architect.step5_title')} />
                <Card.Body>
                  {session?.final_allocation?.map((a) => (
                    <div
                      key={a.ticker}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: 13,
                      }}
                    >
                      <span className="mono" style={{ fontWeight: 500 }}>{a.ticker}</span>
                      <span className="tnum">{a.weight_pct}%</span>
                    </div>
                  ))}
                  <div className="hint" style={{ marginTop: 12 }}>
                    <Icon name="info" size={12} /> {t('architect.drawdown_review_hint')}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Button onClick={handleReviewDrawdown} loading={reviewDrawdown.isPending}>
                      <Icon name="drawdown" size={14} /> {t('architect.review_drawdown')}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </>
          )}

          {step === 5 && (
            <>
              {drawdownReport && (
                <Card style={{ background: 'var(--warning-bg)', borderColor: 'transparent' }}>
                  <Card.Body>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                      {t('architect.drawdown_report_title')}
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 12 }}>
                      {t('architect.drawdown_report_worst', {
                        pct: drawdownReport.worst_case_pct?.toFixed(1) ?? '—',
                        amount: drawdownReport.worst_case_amount_usd?.toFixed(0) ?? '—',
                      })}
                    </div>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>{t('architect.drawdown_scenario')}</th>
                          <th className="num">{t('architect.drawdown_loss_pct')}</th>
                          <th className="num">{t('architect.drawdown_loss_usd')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drawdownReport.scenarios.map((s) => (
                          <tr key={s.name}>
                            <td>{s.name}</td>
                            <td className="num tnum">{s.portfolio_drawdown_pct?.toFixed(1) ?? '—'}%</td>
                            <td className="num tnum">{formatCurrency(Math.abs(s.portfolio_loss_usd ?? 0), 'USD')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card.Body>
                </Card>
              )}

              <Card>
                <Card.Body>
                  <div className="hint" style={{ marginBottom: 12 }}>
                    {t('architect.confirm_acknowledgement')}
                  </div>
                  <Button onClick={handleConfirm} loading={confirmSession.isPending}>
                    <Icon name="check" size={14} /> {t('architect.confirm_session')}
                  </Button>
                </Card.Body>
              </Card>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}>
              {t('common.back')}
            </Button>
            <Button variant="secondary" disabled={step === 5} onClick={() => setStep((s) => Math.min(5, s + 1) as Step)}>
              {t('common.next')} <Icon name="chevronRight" size={14} />
            </Button>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
