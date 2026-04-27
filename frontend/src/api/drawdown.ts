import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { DrawdownSimulationResponse } from '@/types/api'

export const useLatestSimulation = (bucketId: number) =>
  useQuery<DrawdownSimulationResponse>({
    queryKey: ['drawdown', bucketId],
    queryFn: () =>
      client.get<DrawdownSimulationResponse>(`/drawdown/${bucketId}/latest`).then(r => r.data),
    enabled: bucketId > 0,
    retry: false,
  })

export const useRunSimulation = (bucketId: number) => {
  const qc = useQueryClient()
  return useMutation<DrawdownSimulationResponse, unknown, void>({
    mutationFn: () =>
      client.post<DrawdownSimulationResponse>(`/drawdown/simulate/${bucketId}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drawdown', bucketId] }),
  })
}
