import { create } from 'zustand'
import type { Comparacion, MapStyle, Panel, Pov } from './lib/estado'
import type { IdZona } from './lib/tipos'

/** id de una de las variables de lib/variables.ts */
export type ExplorerVariable = string
/** illustrated: atlas plano con zonas. detailed: relieve y mapa del satélite. satellite: foto de la Tierra con el mapa encima */
export type GlobeView = 'illustrated' | 'detailed' | 'satellite'

/** Pedido de movimiento de cámara: el globo lo ejecuta cuando cambia el id */
type CameraRequest = { pov: Pov; ms: number; id: number }

type ExplorerState = {
  variable: ExplorerVariable
  view: GlobeView
  month: number
  playing: boolean
  panel: Panel
  mapStyle: MapStyle
  comparison: Comparacion
  camera: CameraRequest | null
  /** zona elegida en el monitor de condiciones (null = promedio de la costa) */
  monitorZone: IdZona | null
  setVariable: (variable: ExplorerVariable) => void
  setView: (view: GlobeView) => void
  setMonth: (month: number) => void
  setPlaying: (playing: boolean) => void
  setPanel: (panel: Panel) => void
  setMapStyle: (mapStyle: MapStyle) => void
  setComparison: (comparison: Comparacion) => void
  flyTo: (pov: Pov, ms?: number) => void
  setMonitorZone: (zone: IdZona | null) => void
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  variable: 'clorofila_mg_m3',
  view: 'illustrated',
  month: 364, // mayo de 2023 (las series empiezan en enero de 1993)
  playing: false,
  panel: { tipo: 'general' },
  mapStyle: 'bandas',
  comparison: { region: 'peru', mes: 4, a: 'prom', b: 2023 },
  camera: null,
  monitorZone: null,
  setVariable: (variable) => set({ variable }),
  setView: (view) => set({ view }),
  setMonth: (month) => set({ month }),
  setPlaying: (playing) => set({ playing }),
  setPanel: (panel) => set({ panel }),
  setMapStyle: (mapStyle) => set({ mapStyle }),
  setComparison: (comparison) => set({ comparison }),
  flyTo: (pov, ms = 1500) => set((s) => ({ camera: { pov, ms, id: (s.camera?.id ?? 0) + 1 } })),
  setMonitorZone: (monitorZone) => set({ monitorZone }),
}))
