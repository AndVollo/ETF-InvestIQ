import { useQuery } from '@tanstack/react-query'
import client from './client'
import type { UniverseListResponse, ValuationResponse } from '@/types/api'

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
