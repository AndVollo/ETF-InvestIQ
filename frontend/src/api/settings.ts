import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { SettingResponse, SettingsListResponse } from '@/types/api'

export const useSettings = () =>
  useQuery<SettingsListResponse>({
    queryKey: ['settings'],
    queryFn: () => client.get<SettingsListResponse>('/settings/').then(r => r.data),
    staleTime: 1000 * 60,
  })

export const useUpdateSetting = () => {
  const qc = useQueryClient()
  return useMutation<SettingResponse, unknown, { key: string; value: unknown }>({
    mutationFn: ({ key, value }) =>
      client.put<SettingResponse>(`/settings/${key}`, { value }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}

export interface BackupResponse {
  path: string
  bytes: number
}

export const useBackupDb = () =>
  useMutation<BackupResponse, unknown, void>({
    mutationFn: () => client.post<BackupResponse>('/settings/backup').then(r => r.data),
  })

/* ── FRED Validation ────────────────────────────────────────────────────────── */

export interface FredValidateResponse {
  valid: boolean
  message: string
}

export const useValidateFred = () =>
  useMutation<FredValidateResponse, unknown, { api_key: string }>({
    mutationFn: (payload) =>
      client.post<FredValidateResponse>('/settings/validate-fred', payload).then(r => r.data),
  })

/* ── Connection Status ──────────────────────────────────────────────────────── */

export interface ConnectionStatusResponse {
  fred: { connected: boolean; has_key: boolean; message: string }
  yfinance: { connected: boolean; message: string }
  internet: { connected: boolean; message: string }
}

export const useConnectionStatus = (enabled = true) =>
  useQuery<ConnectionStatusResponse>({
    queryKey: ['connection-status'],
    queryFn: () =>
      client.get<ConnectionStatusResponse>('/settings/connection-status').then(r => r.data),
    enabled,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  })
