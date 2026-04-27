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
