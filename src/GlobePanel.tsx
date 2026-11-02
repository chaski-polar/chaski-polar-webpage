import { useEffect, useRef, useState } from 'react'

type RuntimeWindow = Window & { DATOS?: any; Globe?: any }
type Variable = string
type PredictionRow = Record<string, string | number | null>

const scripts = ['/assets/vendor/globe.gl.min.js', '/assets/data/datos.js?v=14']
let scriptsPromise: Promise<void> | null = null

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

function useGlobeRuntime() {
  const [ready, setReady] = useState(Boolean((window as RuntimeWindow).DATOS && (window as RuntimeWindow).Globe))
  useEffect(() => {
    if (!scriptsPromise) scriptsPromise = scripts.reduce((promise, src) => promise.then(() => loadScript(src)), Promise.resolve())
    let active = true
    scriptsPromise.then(() => active && setReady(true)).catch(console.error)
    return () => { active = false }
  }, [])
  return ready
}

function parseCsv(text: string): PredictionRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',')
  return lines.slice(1).map((line) => {
    const values = line.split(',')
    return Object.fromEntries(headers.map((header, index) => {
      const raw = values[index] ?? ''
      const numeric = Number(raw)
      return [header, raw === '' ? null : Number.isNaN(numeric) ? raw : numeric]
    }))
  })
}

function usePredictionRows(ready: boolean) {
  const [rows, setRows] = useState<PredictionRow[]>([])
  useEffect(() => {
    if (!ready) return
    fetch('/assets/data/prediction/enso_scenarios_monitor.csv').then((response) => response.ok ? response.text() : '').then((text) => setRows(parseCsv(text))).catch(() => setRows([]))
  }, [ready])
  return rows
}

const labels: Record<string, string> = {
  clorofila_mg_m3: 'Clorofila-a', corriente_u_m_s: 'Corriente U', corriente_v_m_s: 'Corriente V', nivel_mar_anomalia_m: 'Nivel del mar',
  salinidad_psu: 'Salinidad', temperatura_superficial_C: 'Temperatura superficial', 'turbidez_kd490_m-1': 'Turbidez Kd490', viento_u_m_s: 'Viento U', viento_v_m_s: 'Viento V',
}
const powerLabels: Record<string, string> = { ALLSKY_SFC_SW_DWN: 'Radiación solar', PRECTOTCORR: 'Precipitación', T2M: 'Temperatura del aire', WS10M: 'Viento a 10 m' }
const powerZones: Record<string, string> = { antartida_peninsula: 'antartida_peninsula_centro', peru_centro_norte_chimbote: 'peru_chimbote', peru_centro_callao: 'peru_callao', peru_norte_paita_sechura: 'peru_paita_sechura', peru_sur_pisco: 'peru_pisco', peru_sur_ilo: 'peru_ilo' }
const indexLabels: Record<string, string> = { nino12: 'Niño 1+2', sam: 'SAM', hielo: 'Hielo marino', hielo_anom: 'Anomalía del hielo' }
const variableUnits: Record<string, string> = { clorofila_mg_m3: 'mg/m³', temperatura_superficial_C: '°C', salinidad_psu: 'PSU', nivel_mar_anomalia_m: 'm', corriente_u_m_s: 'm/s', corriente_v_m_s: 'm/s', 'turbidez_kd490_m-1': 'm⁻¹', viento_u_m_s: 'm/s', viento_v_m_s: 'm/s', nino12: '°C', sam: 'índice', hielo: 'M km²', hielo_anom: 'M km²' }

function value(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'sin dato'
}

function GlobePanel() {
  const ready = useGlobeRuntime()
  const predictionRows = usePredictionRows(ready)
  const container = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)
  const [variable, setVariable] = useState<Variable>('clorofila_mg_m3')
  const [month, setMonth] = useState(300)
  const [selected, setSelected] = useState<string | null>(null)
  const data = (window as RuntimeWindow).DATOS
  const zones = data ? Object.entries(data.zonas || {}) as [string, any][] : []
  const year = 1998 + Math.floor(month / 12)
  const seriesKeys = data?.series ? Object.keys(data.series[zones[0]?.[0]] || {}) : []
  const indexKeys = data?.indices ? Object.keys(data.indices).filter((key) => key !== 'inicio') : []
  const powerKeys = data?.power?.sitios ? Object.keys(data.power.sitios[Object.keys(data.power.sitios)[0]] || {}) : []
  const variableGroups = [{ title: 'Dataset mensual', keys: seriesKeys }, { title: 'Índices globales', keys: indexKeys }, { title: 'NASA POWER', keys: powerKeys }]
  const zoneValue = (key: string) => {
    if (indexKeys.includes(variable)) return data?.indices?.[variable]?.[month]
    if (powerKeys.includes(variable)) return data?.power?.sitios?.[powerZones[key]]?.[variable]?.[month + 168]
    return data?.series?.[key]?.[variable]?.[month]
  }
  const selectedZone = selected ? data?.zonas?.[selected] : null
  const selectedSeries = selected ? data?.series?.[selected] : null
  const nutrients = selected ? data?.nutrientes?.[selected] : null
  const annual = data?.juego?.find((row: any) => row.anio === year)
  const power = selected ? data?.power?.sitios?.[powerZones[selected]] : null
  const pescaIndex = Math.max(0, year - Number(data?.pesca?.inicio || 1995))

  useEffect(() => {
    const target = container.current
    const runtime = window as RuntimeWindow
    if (!target || !ready || !runtime.Globe || !runtime.DATOS) return
    const globe = runtime.Globe({ animateIn: false })(target)
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl('/assets/globe/earth-blue-marble.jpg')
      .bumpImageUrl('/assets/globe/earth-topology.png')
      .showAtmosphere(true).atmosphereColor('#63cde8').atmosphereAltitude(0.12)
      .pointLat((point: any) => point.lat).pointLng((point: any) => point.lon)
      .pointLabel((point: any) => `<b>${point.nombre}</b><br/>${point.region}<br/>Valor: ${value(point.measurement)}`)
      .onPointClick((point: any) => setSelected(point.key))
    globe.pointOfView({ lat: -35, lng: -68, altitude: 1.9 }, 0)
    globeRef.current = globe
    const resize = () => globe.width(target.clientWidth).height(target.clientHeight)
    resize(); window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); globeRef.current = null; target.replaceChildren() }
  }, [ready])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !data) return
    const points = zones.map(([key, zone]) => ({ ...zone, key, measurement: Number(zoneValue(key) ?? 0) }))
    const maximum = Math.max(...points.map((point) => Math.abs(point.measurement)), 1)
    globe.pointsData(points)
      .pointColor((point: any) => point.key === selected ? '#eaf3f5' : variable.includes('temperatura') || variable.includes('viento') ? `hsl(${205 - Math.round(Math.abs(point.measurement) / maximum * 165)} 78% 62%)` : `hsl(${165 - Math.round(Math.abs(point.measurement) / maximum * 110)} 62% 56%)`)
      .pointRadius((point: any) => point.key === selected ? 1.2 : 0.7)
      .pointAltitude((point: any) => point.key === selected ? 0.045 : 0.02)
  }, [data, month, variable, selected])

  return <section className="escenario" aria-label="Explorador del globo"><div className="lienzo-globo"><div ref={container} id="globo" role="img" aria-label="Globo terrestre con las zonas de estudio" />{!ready && <p className="globe-status">Cargando el atlas y las zonas de estudio…</p>}<div className="mando" role="group" aria-label="Controles del globo"><label className="fila var">Dato <select value={variable} onChange={(event) => setVariable(event.target.value)}>{variableGroups.map((group) => <optgroup key={group.title} label={group.title}>{group.keys.map((key) => <option key={key} value={key}>{labels[key] || indexLabels[key] || powerLabels[key] || key}</option>)}</optgroup>)}</select></label><label className="fila tiempo">Mes <input type="range" min="0" max="395" value={month} onChange={(event) => setMonth(Number(event.target.value))} /></label><span className="mes-actual num">{year}-{String(month % 12 + 1).padStart(2, '0')}</span><div className="zonas-inferior" role="group" aria-label="Zonas de estudio">{zones.map(([key, zone]) => <button key={key} className="zona-punto" type="button" aria-pressed={selected === key} onClick={() => setSelected(key)}><span className="punto" />{zone.nombre}</button>)}</div><div className="leyenda"><span>menos que lo normal</span><div className="rampa" /><span>más que lo normal</span></div></div></div><aside className="relato"><div className="relato-contenido">{selectedZone ? <><h2>{selectedZone.nombre}</h2><p className="region">{selectedZone.region} · {year}-{String(month % 12 + 1).padStart(2, '0')}</p><h3>Dato seleccionado</h3><div className="cifras"><div className="cifra"><b className="num">{value(zoneValue(selected!))}</b><span>{labels[variable] || indexLabels[variable] || powerLabels[variable] || variable} · {variableUnits[variable] || 'valor'}</span></div></div><h3>Dataset mensual completo</h3><div className="metric-grid">{Object.entries(selectedSeries || {}).map(([key, series]: [string, any]) => <div className="metric-row" key={key}><span>{labels[key] || key}</span><b className="num">{value(series?.[month])}</b></div>)}</div><h3>Nutrientes históricos</h3><div className="metric-grid">{Object.entries(nutrients || {}).map(([key, series]: [string, any]) => <div className="metric-row" key={key}><span>{key}</span><b className="num">{value(series?.reduce((sum: number, item: number) => sum + item, 0) / (series?.length || 1))}</b></div>)}</div>{power && <><h3>Datos POWER</h3><div className="metric-grid">{Object.entries(power).map(([key, series]: [string, any]) => <div className="metric-row" key={key}><span>{powerLabels[key] || key}</span><b className="num">{value(series?.[month + 168])}</b></div>)}</div></>}<h3>Índices globales</h3><div className="metric-grid">{(['nino12', 'sam', 'hielo', 'hielo_anom'] as const).map((key) => <div className="metric-row" key={key}><span>{key}</span><b className="num">{value(data?.indices?.[key]?.[month])}</b></div>)}</div><h3>Pesquerías anuales</h3><div className="metric-grid">{Object.entries(data?.pesca || {}).filter(([key]) => key !== 'inicio').map(([key, series]: [string, any]) => <div className="metric-row" key={key}><span>{key}</span><b className="num">{value(series?.[pescaIndex])}</b></div>)}</div><h3>Datos anuales</h3>{annual ? <div className="metric-grid">{Object.entries(annual).map(([key, item]) => <div className="metric-row" key={key}><span>{key}</span><b className="num">{typeof item === 'number' ? item.toFixed(2) : String(item)}</b></div>)}</div> : <p className="nota">No hay registro para {year}.</p>}<h3>Predicción de escenarios</h3>{predictionRows.length ? <div className="prediction-table">{predictionRows.map((row, index) => <details className="prediction-card" key={`${row.scenario}-${row.horizon_month}-${index}`}><summary>{String(row.scenario)} · mes {String(row.horizon_month)} · {String(row.date)}</summary>{Object.entries(row).map(([key, item]) => <div className="metric-row" key={key}><span>{key}</span><b className="num">{typeof item === 'number' ? item.toFixed(2) : item == null ? 'sin dato' : String(item)}</b></div>)}</details>)}</div> : <p className="nota">Cargando escenarios…</p>}<button className="volver" type="button" onClick={() => setSelected(null)}>Volver al resumen de zonas</button></> : <><h2>Datos del globo</h2><p>Selecciona un punto para consultar todas las variables generadas por los datasets.</p><h3>Las 7 zonas</h3><ul className="lista-zonas">{zones.map(([key, zone]) => <li key={key}><button className="fila-zona" type="button" onClick={() => setSelected(key)}><span className="punto" /><span>{zone.nombre}<small>{zone.region}</small></span><span className="valor num">{value(zoneValue(key))}</span></button></li>)}</ul></>}</div></aside></section>
}

export default GlobePanel
