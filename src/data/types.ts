export type NumericValue = number | null

export type Zone = {
  nombre: string
  region: string
  lat: number
  lon: number
  [key: string]: unknown
}

export type Series = Record<string, NumericValue[]>

export type ProjectData = {
  generado?: string
  meses_inicio?: string
  zonas: Record<string, Zone>
  series: Record<string, Series>
  nutrientes?: Record<string, Record<string, number[]>>
  indices?: Record<string, NumericValue[] | number | string>
  power?: { inicio?: string; sitios?: Record<string, Series> }
  pesca?: Record<string, number[] | number>
  juego?: Array<Record<string, number>>
}

export type MonitorRecord = {
  date: string
  [key: string]: string | number | boolean | null | undefined
}

export type MonitorData = {
  records: MonitorRecord[]
  metadata?: Record<string, unknown>
}

export type PredictionRow = Record<string, string | number | null>

declare global {
  interface Window {
    DATOS?: unknown
    MONITOR_DATA?: unknown
    PAISES?: unknown
    ATLAS?: {
      pintar: (options: { paleta: string; detalle: boolean; ancho: number }) => Promise<HTMLCanvasElement>
    }
  }
}
