import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DomicileFilter = 'all' | 'ucits' | 'us'
export type Theme = 'dark' | 'light'
export type Density = 'compact' | 'comfortable'
export type Accent = 'indigo' | 'emerald' | 'amber'
export type DriftVariant = 'diverging' | 'tick' | 'stacked'

interface UiStore {
  activeBucketId: number | null
  setActiveBucketId: (id: number | null) => void

  domicileFilter: DomicileFilter
  setDomicileFilter: (f: DomicileFilter) => void

  theme: Theme
  setTheme: (t: Theme) => void

  density: Density
  setDensity: (d: Density) => void

  accent: Accent
  setAccent: (a: Accent) => void

  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void

  driftVariant: DriftVariant
  setDriftVariant: (v: DriftVariant) => void

  showValuation: boolean
  setShowValuation: (v: boolean) => void
}

export const ACCENTS: Record<Accent, { name: string; color: string; hover: string; muted: string }> = {
  indigo:  { name: 'Indigo',  color: '#5E6AD2', hover: '#6E78DC', muted: 'rgba(94,106,210,0.12)' },
  emerald: { name: 'Emerald', color: '#2A9D7F', hover: '#3BAF91', muted: 'rgba(42,157,127,0.12)' },
  amber:   { name: 'Amber',   color: '#C18A2A', hover: '#D69A37', muted: 'rgba(193,138,42,0.12)' },
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      activeBucketId: null,
      setActiveBucketId: (id) => set({ activeBucketId: id }),

      domicileFilter: 'all',
      setDomicileFilter: (f) => set({ domicileFilter: f }),

      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      density: 'comfortable',
      setDensity: (density) => set({ density }),

      accent: 'indigo',
      setAccent: (accent) => set({ accent }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      driftVariant: 'diverging',
      setDriftVariant: (driftVariant) => set({ driftVariant }),

      showValuation: true,
      setShowValuation: (showValuation) => set({ showValuation }),
    }),
    {
      name: 'iq-ui',
      partialize: (s) => ({
        theme: s.theme,
        density: s.density,
        accent: s.accent,
        sidebarCollapsed: s.sidebarCollapsed,
        driftVariant: s.driftVariant,
        showValuation: s.showValuation,
        activeBucketId: s.activeBucketId,
        domicileFilter: s.domicileFilter,
      }),
    },
  ),
)
