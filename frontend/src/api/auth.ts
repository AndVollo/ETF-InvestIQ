import { useMutation, useQuery } from '@tanstack/react-query'
import client from './client'

export interface AuthUser {
  id: number
  email: string
  full_name: string
  is_active: boolean
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

export const useLogin = () =>
  useMutation<AuthResponse, unknown, { email: string; password: string }>({
    mutationFn: (data) => client.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  })

export const useSignup = () =>
  useMutation<AuthResponse, unknown, { email: string; full_name: string; password: string }>({
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
