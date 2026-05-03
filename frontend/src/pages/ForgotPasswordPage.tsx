import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForgotPassword } from '@/api/auth'
import { Button, Input, Field } from '@/components/design'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const forgot = useForgotPassword()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await forgot.mutateAsync({ email })
    setSent(true)
  }

  return (
    <div className="auth-page">
      <div className="auth-card" dir="ltr">
        <div className="auth-brand">
          <div className="brand-mark">IQ</div>
          <div className="brand-name">IQ Invest ETF</div>
        </div>

        <h1 className="auth-title">{t('auth.forgot_title')}</h1>

        {sent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
            <p style={{ color: 'var(--success)', fontSize: 14 }}>{t('auth.code_sent')}</p>
            <Link to="/reset-password" style={{ fontSize: 14, color: 'var(--accent)' }}>
              {t('auth.enter_reset_code')} →
            </Link>
            <Link to="/login" className="text-muted" style={{ fontSize: 13 }}>
              {t('auth.back_to_login')}
            </Link>
          </div>
        ) : (
          <>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 8 }}>
              {t('auth.forgot_subtitle')}
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label={t('auth.email')}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </Field>

              <Button type="submit" loading={forgot.isPending} style={{ width: '100%' }}>
                {t('auth.send_code')}
              </Button>
            </form>
            <div className="auth-footer">
              <Link to="/login">{t('auth.back_to_login')}</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
