import { useTranslation } from 'react-i18next'
import { Modal, Button, Spinner } from '@/components/design'
import { useTerms } from '@/api/auth'

type Variant = 'view' | 'accept'

interface Props {
  open: boolean
  variant: Variant
  onClose: () => void
  onAccept?: () => void
  accepting?: boolean
  errorMessage?: string
}

export function TermsModal({ open, variant, onClose, onAccept, accepting, errorMessage }: Props) {
  const { t, i18n } = useTranslation()
  const { data, isLoading } = useTerms(open)
  const isHebrew = i18n.language?.startsWith('he')
  const text = data ? (isHebrew ? data.text_he : data.text_en) : ''

  if (!open) return null

  return (
    <Modal
      open
      title={`${t('terms.title')} — v${data?.version ?? '…'}`}
      onClose={onClose}
      footer={
        variant === 'accept' ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={accepting}>
              {t('terms.decline')}
            </Button>
            <Button onClick={onAccept} loading={accepting} disabled={!data}>
              {t('terms.accept')}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>{t('common.close')}</Button>
        )
      }
    >
      {isLoading ? (
        <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
          <Spinner />
        </div>
      ) : (
        <>
          {data && (
            <p className="text-muted" style={{ marginBottom: 8, fontSize: 12 }}>
              {t('terms.effective_date')}: {data.effective_date}
            </p>
          )}
          <pre
            dir={isHebrew ? 'rtl' : 'ltr'}
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: 13,
              lineHeight: 1.55,
              maxHeight: '55vh',
              overflowY: 'auto',
              padding: '12px 14px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
          >
            {text}
          </pre>
          {errorMessage && (
            <p style={{ color: 'var(--error, red)', marginTop: 12 }}>{errorMessage}</p>
          )}
        </>
      )}
    </Modal>
  )
}
