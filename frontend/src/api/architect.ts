import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type {
  AllocationIngestResponse,
  ArchitectConfirmResponse,
  ArchitectSessionResponse,
  ArchitectStartResponse,
  CandidateIngestResponse,
  DrawdownSimulationResponse,
} from '@/types/api'

export const useArchitectSession = (sessionId: number) =>
  useQuery<ArchitectSessionResponse>({
    queryKey: ['architect-session', sessionId],
    queryFn: () =>
      client.get<ArchitectSessionResponse>(`/architect/sessions/${sessionId}`).then(r => r.data),
    enabled: sessionId > 0,
  })

export const useStartArchitectSession = () => {
  const qc = useQueryClient()
  return useMutation<
    ArchitectStartResponse,
    unknown,
    { bucket_id: number; investor_profile: { goal_description: string; target_amount_ils?: number; monthly_deposit_ils?: number; risk_notes?: string } }
  >({
    mutationFn: (data) =>
      client.post<ArchitectStartResponse>('/architect/sessions', data).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['architect-session', data.session_id] })
    },
  })
}

export const useIngestCandidates = (sessionId: number) => {
  const qc = useQueryClient()
  return useMutation<CandidateIngestResponse, unknown, string[]>({
    mutationFn: (tickers) =>
      client
        .post<CandidateIngestResponse>(`/architect/sessions/${sessionId}/candidates`, { tickers })
        .then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['architect-session', sessionId] }),
  })
}

export const useEngineerPrompt = (sessionId: number) =>
  useQuery<{ session_id: number; engineer_prompt: string; status: string }>({
    queryKey: ['engineer-prompt', sessionId],
    queryFn: () =>
      client
        .get(`/architect/sessions/${sessionId}/engineer-prompt`)
        .then(r => r.data),
    enabled: sessionId > 0,
  })

export const useIngestAllocation = (sessionId: number) => {
  const qc = useQueryClient()
  return useMutation<
    AllocationIngestResponse,
    unknown,
    { allocation: Array<{ ticker: string; weight_pct: number }>; rationale: string }
  >({
    mutationFn: (data) =>
      client
        .post<AllocationIngestResponse>(`/architect/sessions/${sessionId}/allocation`, data)
        .then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['architect-session', sessionId] }),
  })
}

export const useReviewDrawdown = (sessionId: number) => {
  const qc = useQueryClient()
  return useMutation<DrawdownSimulationResponse, unknown, void>({
    mutationFn: () =>
      client
        .post<DrawdownSimulationResponse>(`/architect/sessions/${sessionId}/drawdown`)
        .then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['architect-session', sessionId] }),
  })
}

export const useConfirmArchitectSession = (sessionId: number) => {
  const qc = useQueryClient()
  return useMutation<ArchitectConfirmResponse, unknown, void>({
    mutationFn: () =>
      client.post<ArchitectConfirmResponse>(`/architect/sessions/${sessionId}/confirm`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['architect-session', sessionId] })
      qc.invalidateQueries({ queryKey: ['bucket', data.bucket_id] })
      qc.invalidateQueries({ queryKey: ['holdings', data.bucket_id] })
    },
  })
}
