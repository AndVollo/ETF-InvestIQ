import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLogin } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Button, Input, Field } from '@/components/design'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const login = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await login.mutateAsync({ email, password })
      setAuth(res.access_token, res.user)
      navigate('/', { replace: true })
    } catch {
      setError(t('auth.invalid_credentials'))
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" dir="ltr">
        <div className="auth-brand">
          <div className="brand-mark">IQ</div>
          <div className="brand-name">IQ Invest ETF</div>
        </div>

        <h1 className="auth-title">{t('auth.login_title')}</h1>

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

          <Field label={t('auth.password')}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {error && <p className="auth-error">{error}</p>}

          <Button type="submit" loading={login.isPending} style={{ width: '100%' }}>
            {t('auth.sign_in')}
          </Button>
        </form>

        <div className="auth-footer">
          <div className="auth-footer__row">
            <span className="text-muted">{t('auth.no_account')}</span>
            <Link to="/signup">{t('auth.sign_up')}</Link>
          </div>
          <Link to="/forgot-password" className="auth-footer__link-muted">{t('auth.forgot_password')}</Link>
        </div>
      </div>
    </div>
  )
}
