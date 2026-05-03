import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useResetPassword } from '@/api/auth'
import { Button, Input, Field } from '@/components/design'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const reset = useResetPassword()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError(t('auth.passwords_no_match'))
      return
    }
    try {
      await reset.mutateAsync({ email, code: code.toUpperCase(), new_password: password })
      navigate('/login', { replace: true })
    } catch {
      setError(t('auth.invalid_code'))
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" dir="ltr">
        <div className="auth-brand">
          <div className="brand-mark">IQ</div>
          <div className="brand-name">IQ Invest ETF</div>
        </div>

        <h1 className="auth-title">{t('auth.reset_title')}</h1>

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

          <Field label={t('auth.reset_code')}>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXXXXXX"
              maxLength={8}
              style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
              required
            />
          </Field>

          <Field label={t('auth.new_password')}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          <Field label={t('auth.confirm_password')}>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </Field>

          {error && <p className="auth-error">{error}</p>}

          <Button type="submit" loading={reset.isPending} style={{ width: '100%' }}>
            {t('auth.reset_password_btn')}
          </Button>
        </form>

        <div className="auth-footer">
          <Link to="/login">{t('auth.back_to_login')}</Link>
        </div>
      </div>
    </div>
  )
}
