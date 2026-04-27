import { useMutation, useQuery } from '@tanstack/react-query'
import client from './client'
import type { BucketSectorResponse } from '@/types/api'

export const useBucketSectors = (bucketId: number) =>
  useQuery<BucketSectorResponse>({
    queryKey: ['sectors', bucketId],
    queryFn: () => client.get<BucketSectorResponse>(`/sectors/${bucketId}`).then(r => r.data),
    enabled: bucketId > 0,
  })

export const useRefreshSectors = (bucketId: number) => {
  return useMutation<{ tickers_refreshed: number; stale: boolean }, unknown, void>({
    mutationFn: () =>
      client.post(`/sectors/${bucketId}/refresh`).then(r => r.data),
  })
}
