import { create } from 'zustand'

export type ExplorerVariable = 'clorofila_mg_m3' | 'temperatura_superficial_C' | 'hielo'
export type GlobeView = 'illustrated' | 'satellite'

type ExplorerState = {
  variable: ExplorerVariable
  view: GlobeView
  month: number
  playing: boolean
  selectedZone: string | null
  setVariable: (variable: ExplorerVariable) => void
  setView: (view: GlobeView) => void
  setMonth: (month: number) => void
  setPlaying: (playing: boolean) => void
  setSelectedZone: (zone: string | null) => void
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  variable: 'clorofila_mg_m3',
  view: 'illustrated',
  month: 300,
  playing: false,
  selectedZone: null,
  setVariable: (variable) => set({ variable }),
  setView: (view) => set({ view }),
  setMonth: (month) => set({ month }),
  setPlaying: (playing) => set({ playing }),
  setSelectedZone: (selectedZone) => set({ selectedZone }),
}))
