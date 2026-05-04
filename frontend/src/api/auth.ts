import { useMutation, useQuery } from '@tanstack/react-query'
import client from './client'

export interface AuthUser {
  id: number
  email: string
  full_name: string
  is_active: boolean
  latest_terms_version?: string | null
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: AuthUser
  requires_terms_acceptance?: boolean
  current_terms_version?: string | null
}

export interface TermsResponse {
  version: string
  effective_date: string
  text_en: string
  text_he: string
}

export const useLogin = () =>
  useMutation<AuthResponse, unknown, { email: string; password: string }>({
    mutationFn: (data) => client.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  })

export const useSignup = () =>
  useMutation<
    AuthResponse,
    unknown,
    { email: string; full_name: string; password: string; terms_version_accepted: string }
  >({
    mutationFn: (data) => client.post<AuthResponse>('/auth/signup', data).then((r) => r.data),
  })

export const useForgotPassword = () =>
  useMutation<void, unknown, { email: string }>({
    mutationFn: (data) => client.post('/auth/forgot-password', data).then(() => undefined),
  })

export const useResetPassword = () =>
  useMutation<void, unknown, { email: string; code: string; new_password: string }>({
    mutationFn: (data) => client.post('/auth/reset-password', data).then(() => undefined),
  })

export const useChangePassword = () =>
  useMutation<void, unknown, { current_password: string; new_password: string }>({
    mutationFn: (data) => client.post('/auth/change-password', data).then(() => undefined),
  })

export const useMe = () =>
  useQuery<AuthUser>({
    queryKey: ['auth', 'me'],
    queryFn: () => client.get<AuthUser>('/auth/me').then((r) => r.data),
    retry: false,
  })

export const useTerms = (enabled: boolean) =>
  useQuery<TermsResponse>({
    queryKey: ['auth', 'terms'],
    queryFn: () => client.get<TermsResponse>('/auth/terms').then((r) => r.data),
    enabled,
    staleTime: 1000 * 60 * 60,
  })

export const useAcceptTerms = () =>
  useMutation<AuthUser, unknown, { terms_version: string }>({
    mutationFn: (data) => client.post<AuthUser>('/auth/terms/accept', data).then((r) => r.data),
  })
