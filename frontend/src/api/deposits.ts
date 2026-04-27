import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { DepositConfirmResponse, DepositLogResponse, DepositPlan } from '@/types/api'

export const useCalculateDeposit = () =>
  useMutation<DepositPlan, unknown, { bucket_id: number; amount: number; currency: string }>({
    mutationFn: (data) => client.post<DepositPlan>('/deposits/calculate', data).then(r => r.data),
  })

export const useConfirmDeposit = () => {
  const qc = useQueryClient()
  return useMutation<DepositConfirmResponse, unknown, string>({
    mutationFn: (plan_token) =>
      client.post<DepositConfirmResponse>('/deposits/confirm', { plan_token }).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bucket', data.bucket_id] })
      qc.invalidateQueries({ queryKey: ['holdings', data.bucket_id] })
      qc.invalidateQueries({ queryKey: ['deposit-history', data.bucket_id] })
    },
  })
}

export const useDepositHistory = (bucketId: number) =>
  useQuery<DepositLogResponse[]>({
    queryKey: ['deposit-history', bucketId],
    queryFn: () =>
      client.get<DepositLogResponse[]>('/deposits/history', { params: { bucket_id: bucketId } }).then(r => r.data),
    enabled: bucketId > 0,
  })
