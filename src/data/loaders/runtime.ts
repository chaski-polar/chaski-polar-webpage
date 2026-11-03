import { MonitorDataSchema, ProjectDataSchema } from '../schemas'
import type { MonitorData, PredictionRow, ProjectData } from '../types'

let runtimePromise: Promise<void> | null = null

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve()
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload = () => { script.dataset.loaded = 'true'; resolve() }
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`))
    document.body.appendChild(script)
  })
}

export async function loadRuntimeData(): Promise<{ data: ProjectData; monitor: MonitorData }> {
  if (!runtimePromise) {
    runtimePromise = loadScript('/assets/data/datos.js?v=15').then(() => loadScript('/assets/data/monitor-data.js?v=2'))
  }
  await runtimePromise
  return {
    data: ProjectDataSchema.parse(window.DATOS) as ProjectData,
    monitor: MonitorDataSchema.parse(window.MONITOR_DATA) as MonitorData,
  }
}

export async function loadPredictions(): Promise<PredictionRow[]> {
  const response = await fetch('/assets/data/prediction/enso_scenarios_monitor.json')
  if (!response.ok) return []
  const payload: unknown = await response.json()
  if (Array.isArray(payload)) return payload as PredictionRow[]
  if (payload && typeof payload === 'object' && 'records' in payload && Array.isArray(payload.records)) return payload.records as PredictionRow[]
  return []
}
