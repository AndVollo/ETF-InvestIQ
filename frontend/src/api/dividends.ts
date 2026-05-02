import { useQuery } from '@tanstack/react-query'
import client from './client'
import type { DividendAnnualResponse, DividendHistoryResponse } from '@/types/api'

export const useBucketAnnualIncome = (bucketId: number) =>
  useQuery<DividendAnnualResponse>({
    queryKey: ['dividends', 'annual', bucketId],
    queryFn: () =>
      client.get<DividendAnnualResponse>(`/dividends/annual/${bucketId}`).then(r => r.data),
    enabled: bucketId > 0,
    staleTime: 5 * 60 * 1000,
  })

export const useDividendHistory = (ticker: string, years = 5) =>
  useQuery<DividendHistoryResponse>({
    queryKey: ['dividends', 'history', ticker, years],
    queryFn: () =>
      client
        .get<DividendHistoryResponse>(`/dividends/history/${ticker}`, { params: { years } })
        .then(r => r.data),
    enabled: ticker.length > 0,
    staleTime: 60 * 60 * 1000,
  })
