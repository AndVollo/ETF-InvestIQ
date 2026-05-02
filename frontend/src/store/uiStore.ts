import { create } from 'zustand'

export type DomicileFilter = 'all' | 'ucits' | 'us'

interface UiStore {
  activeBucketId: number | null
  setActiveBucketId: (id: number | null) => void
  domicileFilter: DomicileFilter
  setDomicileFilter: (f: DomicileFilter) => void
}

export const useUiStore = create<UiStore>((set) => ({
  activeBucketId: null,
  setActiveBucketId: (id) => set({ activeBucketId: id }),
  domicileFilter: 'all',
  setDomicileFilter: (f) => set({ domicileFilter: f }),
}))
