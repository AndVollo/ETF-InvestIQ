import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSignup, useTerms } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Button, Input, Field } from '@/components/design'
import { TermsModal } from '@/components/common/TermsModal'

export default function SignupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const signup = useSignup()
  const [showTerms, setShowTerms] = useState(false)
  const { data: terms } = useTerms(true)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!agreed) {
      setError(t('terms.must_agree'))
      return
    }
    if (!terms?.version) {
      setError(t('terms.loading_failed'))
      return
    }
    if (password !== confirm) {
      setError(t('auth.passwords_no_match'))
      return
    }
    if (password.length < 8) {
      setError(t('auth.password_min_length'))
      return
    }
    try {
      const res = await signup.mutateAsync({
        email,
        full_name: fullName,
        password,
        terms_version_accepted: terms.version,
      })
      setAuth(res.access_token, res.user, {
        requiresTerms: !!res.requires_terms_acceptance,
        currentTermsVersion: res.current_terms_version ?? null,
      })
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const e = err as { message_key?: string }
      if (e?.message_key === 'error.email_taken') {
        setError(t('auth.email_taken'))
      } else if (e?.message_key === 'error.terms_version_mismatch') {
        setError(t('terms.version_mismatch'))
      } else {
        setError(t('auth.signup_error'))
      }
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" dir="ltr">
        <div className="auth-brand">
          <div className="brand-mark">IQ</div>
          <div className="brand-name">IQ Invest ETF</div>
        </div>

        <h1 className="auth-title">{t('auth.signup_title')}</h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label={t('auth.full_name')}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus required />
          </Field>

          <Field label={t('auth.email')}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>

          <Field label={t('auth.password')}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>

          <Field label={t('auth.confirm_password')}>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: 13,
              lineHeight: 1.45,
              padding: '10px 12px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>
              {t('terms.signup_consent_prefix')}{' '}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: 'var(--accent, #0066cc)', cursor: 'pointer',
                  textDecoration: 'underline', font: 'inherit',
                }}
              >
                {t('terms.read_full')}
              </button>
              .
            </span>
          </label>

          {error && <p className="auth-error">{error}</p>}

          <Button type="submit" loading={signup.isPending} style={{ width: '100%' }} disabled={!agreed}>
            {t('auth.create_account')}
          </Button>
        </form>

        <div className="auth-footer">
          <span className="text-muted">{t('auth.have_account')}</span>
          <Link to="/login">{t('auth.sign_in_link')}</Link>
        </div>
      </div>

      <TermsModal
        open={showTerms}
        variant="view"
        onClose={() => setShowTerms(false)}
      />
    </div>
  )
}
