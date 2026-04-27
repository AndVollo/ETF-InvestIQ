import { create } from 'zustand'

interface UiStore {
  activeBucketId: number | null
  setActiveBucketId: (id: number | null) => void
}

export const useUiStore = create<UiStore>((set) => ({
  activeBucketId: null,
  setActiveBucketId: (id) => set({ activeBucketId: id }),
}))
