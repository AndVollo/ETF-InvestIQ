import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type {
  UniverseListResponse,
  ValuationResponse,
  UniverseETFAdmin,
  UniverseETFCreatePayload,
  UniverseETFUpdatePayload,
  BlacklistEntry,
  BlacklistEntryCreate,
  DiscoveryPromptResponse,
  BulkImportRequest,
  BulkImportResponse,
} from '@/types/api'

export const useUniverse = () =>
  useQuery<UniverseListResponse>({
    queryKey: ['universe'],
    queryFn: () => client.get<UniverseListResponse>('/universe/').then(r => r.data),
    staleTime: 1000 * 60 * 10,
  })

export const useValuation = (ticker: string) =>
  useQuery<ValuationResponse>({
    queryKey: ['valuation', ticker],
    queryFn: () => client.get<ValuationResponse>(`/valuation/${ticker}`).then(r => r.data),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 5,
  })

export const useETFDetail = (ticker: string) =>
  useQuery<import('@/types/api').ETFDetailResponse>({
    queryKey: ['etf-detail', ticker],
    queryFn: () => client.get<import('@/types/api').ETFDetailResponse>(`/universe/detail/${ticker}`).then(r => r.data),
    enabled: !!ticker,
    staleTime: 1000 * 60 * 30, // Detail info is more stable
  })

// ── Admin: ETFs ──────────────────────────────────────────────────────────────
export const useAdminETFs = (includeInactive = false) =>
  useQuery<UniverseETFAdmin[]>({
    queryKey: ['universe-admin-etfs', includeInactive],
    queryFn: () =>
      client
        .get<UniverseETFAdmin[]>('/universe/admin/etfs', { params: { include_inactive: includeInactive } })
        .then(r => r.data),
  })

const invalidateUniverse = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['universe-admin-etfs'] })
  qc.invalidateQueries({ queryKey: ['universe'] })
  qc.invalidateQueries({ queryKey: ['universe-admin-blacklist'] })
}

export const useCreateETF = () => {
  const qc = useQueryClient()
  return useMutation<UniverseETFAdmin, unknown, UniverseETFCreatePayload>({
    mutationFn: (data) => client.post<UniverseETFAdmin>('/universe/admin/etfs', data).then(r => r.data),
    onSuccess: () => invalidateUniverse(qc),
  })
}

export const useUpdateETF = () => {
  const qc = useQueryClient()
  return useMutation<UniverseETFAdmin, unknown, { ticker: string; data: UniverseETFUpdatePayload }>({
    mutationFn: ({ ticker, data }) =>
      client.put<UniverseETFAdmin>(`/universe/admin/etfs/${ticker}`, data).then(r => r.data),
    onSuccess: () => invalidateUniverse(qc),
  })
}

export const useDeleteETF = () => {
  const qc = useQueryClient()
  return useMutation<void, unknown, string>({
    mutationFn: (ticker) => client.delete(`/universe/admin/etfs/${ticker}`).then(() => undefined),
    onSuccess: () => invalidateUniverse(qc),
  })
}

// ── Admin: Blacklist ─────────────────────────────────────────────────────────
export const useAdminBlacklist = () =>
  useQuery<BlacklistEntry[]>({
    queryKey: ['universe-admin-blacklist'],
    queryFn: () => client.get<BlacklistEntry[]>('/universe/admin/blacklist').then(r => r.data),
  })

export const useAddBlacklist = () => {
  const qc = useQueryClient()
  return useMutation<BlacklistEntry, unknown, BlacklistEntryCreate>({
    mutationFn: (data) => client.post<BlacklistEntry>('/universe/admin/blacklist', data).then(r => r.data),
    onSuccess: () => invalidateUniverse(qc),
  })
}

export const useRemoveBlacklist = () => {
  const qc = useQueryClient()
  return useMutation<void, unknown, string>({
    mutationFn: (ticker) => client.delete(`/universe/admin/blacklist/${ticker}`).then(() => undefined),
    onSuccess: () => invalidateUniverse(qc),
  })
}

// ── Admin: AI Discovery + Bulk Import ────────────────────────────────────────
export const useDiscoveryPrompt = (enabled: boolean) =>
  useQuery<DiscoveryPromptResponse>({
    queryKey: ['universe-discovery-prompt'],
    queryFn: () =>
      client.get<DiscoveryPromptResponse>('/universe/admin/discovery-prompt').then(r => r.data),
    enabled,
    staleTime: 1000 * 60 * 5,
  })

export const useBulkImport = () => {
  const qc = useQueryClient()
  return useMutation<BulkImportResponse, unknown, BulkImportRequest>({
    mutationFn: (data) => client.post<BulkImportResponse>('/universe/admin/bulk-import', data).then(r => r.data),
    onSuccess: () => invalidateUniverse(qc),
  })
}
