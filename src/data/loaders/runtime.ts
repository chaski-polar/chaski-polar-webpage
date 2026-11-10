import { CruisesSchema, MonitorDataSchema, ProjectDataSchema } from '../schemas'
import type { Cruise, MonitorData, PredictionRow, ProjectData } from '../types'

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
    runtimePromise = loadScript('/assets/data/datos.js?v=15').then(() => loadScript('/assets/data/monitor-data.js?v=3'))
  }
  await runtimePromise
  return {
    data: ProjectDataSchema.parse(window.DATOS) as ProjectData,
    monitor: MonitorDataSchema.parse(window.MONITOR_DATA) as MonitorData,
  }
}

/** Biomasa por crucero de IMARPE (opcional: si falta, la página sigue funcionando) */
export async function loadCruises(): Promise<Cruise[]> {
  const response = await fetch('/assets/data/cruceros.json')
  if (!response.ok) return []
  return CruisesSchema.parse(await response.json()).cruceros
}

export async function loadPredictions(): Promise<PredictionRow[]> {
  const response = await fetch('/assets/data/prediction/enso_scenarios_monitor.csv')
  if (!response.ok) return []
  const text = await response.text()
  const [header, ...lines] = text.trim().split(/\r?\n/).filter(Boolean)
  if (!header) return []
  const headers = header.split(',')
  return lines.map((line) => Object.fromEntries(line.split(',').map((raw, index) => {
    const numeric = Number(raw)
    return [headers[index], raw === '' ? null : Number.isNaN(numeric) ? raw : numeric]
  })))
}
