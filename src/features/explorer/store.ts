import { create } from 'zustand'

export type ExplorerVariable = 'clorofila_mg_m3' | 'temperatura_superficial_C' | 'hielo'

type ExplorerState = {
  variable: ExplorerVariable
  month: number
  selectedZone: string | null
  setVariable: (variable: ExplorerVariable) => void
  setMonth: (month: number) => void
  setSelectedZone: (zone: string | null) => void
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  variable: 'clorofila_mg_m3',
  month: 300,
  selectedZone: null,
  setVariable: (variable) => set({ variable }),
  setMonth: (month) => set({ month }),
  setSelectedZone: (selectedZone) => set({ selectedZone }),
}))
