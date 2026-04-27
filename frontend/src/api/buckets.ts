import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type {
  Bucket, BucketCreate, BucketHoldingsResponse, BucketSummaryResponse,
  Holding, HoldingCreate,
} from '@/types/api'

// ── Buckets ───────────────────────────────────────────────────────────────────
export const useBuckets = (includeArchived = false) =>
  useQuery<Bucket[]>({
    queryKey: ['buckets', includeArchived],
    queryFn: () =>
      client.get<Bucket[]>('/buckets/', { params: { include_archived: includeArchived } }).then(r => r.data),
  })

export const useBucketSummary = (bucketId: number) =>
  useQuery<BucketSummaryResponse>({
    queryKey: ['bucket', bucketId, 'summary'],
    queryFn: () => client.get<BucketSummaryResponse>(`/buckets/${bucketId}/summary`).then(r => r.data),
    enabled: bucketId > 0,
  })

export const useBucketHoldings = (bucketId: number) =>
  useQuery<BucketHoldingsResponse>({
    queryKey: ['bucket', bucketId, 'holdings'],
    queryFn: () => client.get<BucketHoldingsResponse>(`/buckets/${bucketId}/holdings`).then(r => r.data),
    enabled: bucketId > 0,
  })

export const useCreateBucket = () => {
  const qc = useQueryClient()
  return useMutation<Bucket, unknown, BucketCreate>({
    mutationFn: (data) => client.post<Bucket>('/buckets/', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buckets'] }),
  })
}

export const useUpdateBucket = (bucketId: number) => {
  const qc = useQueryClient()
  return useMutation<Bucket, unknown, Partial<BucketCreate>>({
    mutationFn: (data) => client.put<Bucket>(`/buckets/${bucketId}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buckets'] })
      qc.invalidateQueries({ queryKey: ['bucket', bucketId] })
    },
  })
}

export const useArchiveBucket = () => {
  const qc = useQueryClient()
  return useMutation<void, unknown, number>({
    mutationFn: (id) => client.delete(`/buckets/${id}`).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buckets'] }),
  })
}

// ── Holdings ──────────────────────────────────────────────────────────────────
export const useHoldings = (bucketId: number) =>
  useQuery<Holding[]>({
    queryKey: ['holdings', bucketId],
    queryFn: () =>
      client.get<Holding[]>('/holdings/', { params: { bucket_id: bucketId } }).then(r => r.data),
    enabled: bucketId > 0,
  })

export const useCreateHolding = () => {
  const qc = useQueryClient()
  return useMutation<Holding, unknown, HoldingCreate>({
    mutationFn: (data) => client.post<Holding>('/holdings/', data).then(r => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['holdings', vars.bucket_id] })
      qc.invalidateQueries({ queryKey: ['bucket', vars.bucket_id] })
    },
  })
}

export const useArchiveHolding = (bucketId: number) => {
  const qc = useQueryClient()
  return useMutation<void, unknown, number>({
    mutationFn: (id) => client.delete(`/holdings/${id}`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holdings', bucketId] })
      qc.invalidateQueries({ queryKey: ['bucket', bucketId] })
    },
  })
}
