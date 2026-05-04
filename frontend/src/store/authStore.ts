import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  id: number
  email: string
  full_name: string
  is_active: boolean
  latest_terms_version?: string | null
}

interface AuthStore {
  token: string | null
  user: AuthUser | null
  pendingTermsVersion: string | null
  setAuth: (
    token: string,
    user: AuthUser,
    opts?: { requiresTerms?: boolean; currentTermsVersion?: string | null },
  ) => void
  clearPendingTerms: (acceptedVersion: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      pendingTermsVersion: null,
      setAuth: (token, user, opts) =>
        set({
          token,
          user,
          pendingTermsVersion: opts?.requiresTerms ? (opts.currentTermsVersion ?? null) : null,
        }),
      clearPendingTerms: (acceptedVersion) =>
        set((s) => ({
          pendingTermsVersion: null,
          user: s.user ? { ...s.user, latest_terms_version: acceptedVersion } : s.user,
        })),
      clearAuth: () => set({ token: null, user: null, pendingTermsVersion: null }),
    }),
    {
      name: 'iq-auth',
      partialize: (s) => ({
        token: s.token,
        user: s.user,
        pendingTermsVersion: s.pendingTermsVersion,
      }),
    },
  ),
)
