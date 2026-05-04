import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useAcceptTerms, useTerms } from '@/api/auth'
import { TermsModal } from './TermsModal'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const pendingTermsVersion = useAuthStore((s) => s.pendingTermsVersion)
  const clearPendingTerms = useAuthStore((s) => s.clearPendingTerms)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const accept = useAcceptTerms()
  // Pre-fetch terms when blocked, so the modal opens with content already loaded.
  useTerms(!!pendingTermsVersion)
  const [error, setError] = useState('')

  if (!token) return <Navigate to="/login" replace />

  if (pendingTermsVersion) {
    const handleAccept = async () => {
      setError('')
      try {
        await accept.mutateAsync({ terms_version: pendingTermsVersion })
        clearPendingTerms(pendingTermsVersion)
      } catch {
        setError(t('terms.accept_failed'))
      }
    }
    const handleDecline = () => {
      // Decline = log out. Keeps liability clean — no further use without acceptance.
      clearAuth()
    }
    return (
      <TermsModal
        open
        variant="accept"
        onClose={handleDecline}
        onAccept={handleAccept}
        accepting={accept.isPending}
        errorMessage={error}
      />
    )
  }

  return <>{children}</>
}
