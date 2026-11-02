import { useEffect, useRef, useState } from 'react'
import './App.css'
import './estilos.css'

type LegacyWindow = Window & { DATOS?: any; Globe?: any; MONITOR_DATA?: any }
type GlobeVariable = 'clorofila' | 'temperatura' | 'hielo'
type GlobePoint = { nombre: string; region: string; lat: number; lon: number; value: number; key: string }

const runtimeScripts = ['/assets/vendor/globe.gl.min.js', '/assets/data/datos.js?v=14', '/assets/data/monitor-data.js?v=1']
let runtimePromise: Promise<void> | null = null

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`))
    document.body.appendChild(script)
  })
}

function useRuntime() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    if (!runtimePromise) {
      runtimePromise = (async () => {
        for (const src of runtimeScripts) await loadScript(src)
      })()
    }
    runtimePromise.then(() => { if (!cancelled) setReady(true) }).catch(console.error)
    return () => { cancelled = true }
  }, [])
  return ready
}

type ChartSeries = { label: string; data: Array<number | null>; color: string }

function pearson(xs: number[], ys: number[]) {
  const pairs = xs.map((x, i) => [x, ys[i]] as const).filter((pair) => Number.isFinite(pair[0]) && Number.isFinite(pair[1]))
  if (pairs.length < 3) return null
  const meanX = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length
  const meanY = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length
  const numerator = pairs.reduce((sum, pair) => sum + (pair[0] - meanX) * (pair[1] - meanY), 0)
  const denominator = Math.sqrt(pairs.reduce((sum, pair) => sum + (pair[0] - meanX) ** 2, 0) * pairs.reduce((sum, pair) => sum + (pair[1] - meanY) ** 2, 0))
  return denominator ? numerator / denominator : null
}

function MiniChart({ series, bars = false }: { series: ChartSeries[]; bars?: boolean }) {
  const width = 620
  const height = 250
  const pad = { top: 18, right: 18, bottom: 30, left: 18 }
  const all = series.flatMap((item) => item.data.filter((value): value is number => Number.isFinite(value)))
  const min = Math.min(...all, 0)
  const max = Math.max(...all, 1)
  const range = max - min || 1
  const x = (index: number, count: number) => pad.left + (index / Math.max(count - 1, 1)) * (width - pad.left - pad.right)
  const y = (value: number) => pad.top + (1 - (value - min) / range) * (height - pad.top - pad.bottom)
  const zeroY = y(0)
  return <div className="data-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de datos"><line className="chart-axis" x1={pad.left} x2={width - pad.right} y1={zeroY} y2={zeroY} /><line className="chart-grid" x1={pad.left} x2={width - pad.right} y1={pad.top} y2={pad.top} /><line className="chart-grid" x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} />{bars && series[0]?.data.map((value, index) => value == null ? null : <rect key={`bar-${index}`} x={x(index, series[0].data.length) - 5} y={Math.min(zeroY, y(value))} width="10" height={Math.max(Math.abs(zeroY - y(value)), 1)} rx="2" fill={value >= 0 ? '#f08a4b' : '#2b6cb0'} opacity=".82" />)}{series.map((item) => { const points = item.data.map((value, index) => value == null ? null : `${x(index, item.data.length)},${y(value)}`).filter(Boolean).join(' '); return <polyline key={item.label} points={points} fill="none" stroke={item.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /> })}<text className="chart-label" x={pad.left} y={height - 8}>{series[0]?.data.length ? '1998' : ''}</text><text className="chart-label" textAnchor="end" x={width - pad.right} y={height - 8}>{series[0]?.data.length ? '2024' : ''}</text></svg><div className="chart-legend">{series.map((item) => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}</div></div>
}

function Header() {
  return <><a className="saltar" href="#contenido">Saltar al contenido</a><header className="barra barra-explorar"><a className="marca" href="/" aria-label="Mar Frío, inicio"><span aria-hidden="true">◌</span><span>Mar Frío</span></a><h1 className="titulo-barra">Del hielo antártico al mar peruano</h1><nav className="nav" aria-label="Secciones"><a href="/" aria-current="page">Explorar</a><a href="#hallazgos">Hallazgos</a><a href="/juego.html">Jugar</a></nav></header></>
}

function GlobeView() {
  const ref = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)
  const [variable, setVariable] = useState<GlobeVariable>('clorofila')
  const [month, setMonth] = useState(300)
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const ready = useRuntime()

  useEffect(() => {
    const target = ref.current
    const runtime = window as LegacyWindow
    if (!target || !ready || !runtime.Globe || !runtime.DATOS) return
    const globe = runtime.Globe({ animateIn: false })(target)
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl('/assets/globe/earth-blue-marble.jpg')
      .bumpImageUrl('/assets/globe/earth-topology.png')
      .showAtmosphere(true)
      .atmosphereColor('#63cde8')
      .atmosphereAltitude(0.12)
      .pointLat((d: GlobePoint) => d.lat)
      .pointLng((d: GlobePoint) => d.lon)
      .pointLabel((d: GlobePoint) => `<b>${d.nombre}</b><br/>${d.region}<br/>Valor: ${d.value.toFixed(2)}`)
      .pointColor((d: GlobePoint) => d.key === selectedZone ? '#eaf3f5' : '#3fc28c')
      .pointRadius((d: GlobePoint) => d.key === selectedZone ? 1.2 : 0.7)
      .pointAltitude((d: GlobePoint) => d.key === selectedZone ? 0.045 : 0.02)
      .onPointClick((d: GlobePoint) => setSelectedZone(d.key))
    globe.pointOfView({ lat: -35, lng: -68, altitude: 1.9 }, 0)
    globeRef.current = globe
    const resize = () => globe.width(target.clientWidth).height(target.clientHeight)
    resize(); window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); globeRef.current = null; target.replaceChildren() }
  }, [ready])

  useEffect(() => {
    const runtime = window as LegacyWindow
    const globe = globeRef.current
    if (!ready || !globe || !runtime.DATOS) return

    const zones = Object.entries(runtime.DATOS.zonas || {}) as [string, any][]
    const seriesKey = variable === 'clorofila' ? 'clorofila_mg_m3' : 'temperatura_superficial_C'
    const values = zones.map(([key, zone]) => {
      const valuesForZone = variable === 'hielo' ? runtime.DATOS.indices?.hielo : runtime.DATOS.series?.[key]?.[seriesKey]
      const value = Number(valuesForZone?.[month] ?? 0)
      return { ...zone, value, key }
    }) as GlobePoint[]
    const max = Math.max(...values.map((point) => Math.abs(point.value)), 1)
    const color = (point: GlobePoint) => {
      if (point.key === selectedZone) return '#eaf3f5'
      const strength = Math.min(Math.abs(point.value) / max, 1)
      return variable === 'temperatura'
        ? `hsl(${Math.round(205 - strength * 165)} 78% 62%)`
        : `hsl(${Math.round(165 - strength * 110)} 62% 56%)`
    }
    globe.pointsData(values).pointColor(color).pointRadius((point: GlobePoint) => point.key === selectedZone ? 1.2 : 0.7)
  }, [ready, variable, month, selectedZone])

  const runtime = window as LegacyWindow
  const zone = selectedZone ? runtime.DATOS?.zonas?.[selectedZone] : null
  const label = variable === 'clorofila' ? 'El color del mar cuenta una historia' : variable === 'temperatura' ? 'El calor cambia el océano' : 'El hielo conecta los ecosistemas'

  return <section className="escenario" aria-label="Explorador del globo"><div className="lienzo-globo"><div ref={ref} id="globo" role="img" aria-label="Globo terrestre con las zonas de estudio" />{!ready && <p className="globe-status">Cargando el atlas y las zonas de estudio…</p>}<div className="mando" role="group" aria-label="Controles del globo"><label className="fila var">Dato <select value={variable} onChange={(e) => setVariable(e.target.value as GlobeVariable)}><option value="clorofila">Fitoplancton (clorofila-a)</option><option value="temperatura">Temperatura del mar</option><option value="hielo">Hielo marino antártico</option></select></label><label className="fila tiempo">Mes <input type="range" min="0" max="395" value={month} onChange={(e) => setMonth(Number(e.target.value))} /></label><span className="mes-actual num">{1998 + Math.floor(month / 12)}-{String((month % 12) + 1).padStart(2, '0')}</span><div className="leyenda"><span>menos que lo normal</span><div className="rampa" /><span>más que lo normal</span></div></div></div><aside className="relato"><div className="relato-contenido"><h2>{label}</h2><p>Explora las zonas del Perú y la Antártida y compara sus señales ambientales mes a mes.</p>{zone ? <><p className="region">Zona seleccionada: <strong>{zone.nombre}</strong>, {zone.region}.</p><p>El punto resaltado corresponde al mes seleccionado y cambia al mover el control temporal.</p></> : <p>Haz clic en una zona para ver su señal ambiental.</p>}</div></aside></section>
}

function ChartPanel({ title, text, kind }: { title: string; text: string; kind: 'coast' | 'antarctica' | 'ice' | 'nutrients' }) {
  const ready = useRuntime()
  const data = (window as LegacyWindow).DATOS
  let chart: ChartSeries[] = []
  let result = 'Calculando…'
  if (ready && data) {
    if (kind === 'coast') {
      const rows = data.juego || []
      const x = rows.map((row: any) => row.nino12)
      const y = rows.map((row: any) => row.anchoveta)
      const r = pearson(x, y)
      chart = [{ label: 'Niño 1+2', data: x, color: '#f08a4b' }, { label: 'Anchoveta (Mt)', data: y.map((value: number) => value / 1e6), color: '#3fc28c' }]
      result = r == null ? 'sin comparación' : `r = ${r.toFixed(2)}`
    } else if (kind === 'antarctica') {
      const rows = data.juego || []
      const x = rows.map((row: any) => row.chl_rj)
      const y = rows.map((row: any) => row.chl_cn)
      const r = pearson(x, y)
      chart = [{ label: 'Rey Jorge', data: x, color: '#63cde8' }, { label: 'Chimbote', data: y, color: '#3fc28c' }]
      result = r == null ? 'sin comparación' : `r = ${r.toFixed(2)}`
    } else if (kind === 'ice') {
      const rows = data.juego || []
      const minimum = rows.reduce((best: any, row: any) => row.hielo < best.hielo ? row : best, rows[0])
      chart = [{ label: 'Hielo marino (anom.)', data: rows.map((row: any) => row.hielo), color: '#63cde8' }]
      result = minimum ? `${minimum.hielo.toFixed(2)} M km² en ${minimum.anio}` : 'sin dato'
    } else {
      const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
      const peru = mean(data.nutrientes?.peru_centro_norte_chimbote?.nitrato || [])
      const antarctica = mean(data.nutrientes?.antartida_rey_jorge?.nitrato || [])
      chart = [{ label: 'Chimbote', data: [peru], color: '#63cde8' }, { label: 'Rey Jorge', data: [antarctica], color: '#3fc28c' }]
      result = peru ? `${(antarctica / peru).toFixed(1)}× más nitrato` : 'sin dato'
    }
  }
  return <article className="hallazgo"><div className="texto"><h3>{title}</h3><div className="r num">{result}<small>{text}</small></div><p>{kind === 'coast' ? 'La relación es negativa: los años más cálidos suelen coincidir con menos anchoveta, aunque no demuestra causalidad.' : kind === 'antarctica' ? 'Las dos señales no avanzan al mismo ritmo; la correlación resume una asociación anual.' : kind === 'ice' ? 'La anomalía negativa indica una superficie menor que el promedio de referencia.' : 'La diferencia de nutrientes no basta por sí sola: también importan la luz, el hierro y la mezcla.'}</p></div><div className="lienzo data-chart-wrap">{ready ? <MiniChart series={chart} bars={kind === 'coast' || kind === 'ice'} /> : <div className="chart-placeholder"><span>Cargando datos…</span></div>}</div></article>
}

function Monitor() {
  const ready = useRuntime()
  const [variable, setVariable] = useState('chlorophyll_a_mg_m3')
  const records = (window as LegacyWindow).MONITOR_DATA?.records || []
  const values = records.map((row: any) => row[variable] == null ? null : Number(row[variable])) as Array<number | null>
  const latest = [...values].reverse().find((value) => value != null)
  const observed = records.filter((row: any) => row.biomass_observed).length
  const latestNino = [...records].reverse().find((row: any) => row.nino12_anom_c != null)?.nino12_anom_c
  const labels: Record<string, string> = { chlorophyll_a_mg_m3: 'Clorofila-a / fitoplancton', sst_c: 'Temperatura superficial', nitrate_mmol_m3: 'Nitrato', biomass_total_t: 'Biomasa observada' }
  return <section className="seccion"><div className="monitor"><div className="monitor-cabecera"><div><h2>Monitor de condiciones</h2><p>Explora la señal ambiental mensual que alimenta los experimentos A y B.</p></div><span className="monitor-meta">1998–2026</span></div><div className="monitor-controles"><label>Variable <select value={variable} onChange={(e) => setVariable(e.target.value)}><option value="chlorophyll_a_mg_m3">Clorofila-a / fitoplancton</option><option value="sst_c">Temperatura superficial</option><option value="nitrate_mmol_m3">Nitrato</option><option value="biomass_total_t">Biomasa observada</option></select></label><label>Escala <select defaultValue="absolute"><option value="absolute">Valores</option><option value="anomaly">Anomalía frente al promedio mensual</option></select></label></div><p className="monitor-estado">Seleccionada: {labels[variable]}</p><div className="monitor-grafico data-chart-wrap">{ready ? <MiniChart series={[{ label: labels[variable], data: values, color: '#3fc28c' }]} /> : <div className="chart-placeholder"><span>Cargando monitor…</span></div>}</div><div className="monitor-notas"><div className="monitor-nota"><b>{latest == null ? '—' : latest.toFixed(2)}</b><span>último valor disponible</span></div><div className="monitor-nota"><b>{observed}</b><span>meses con biomasa observada</span></div><div className="monitor-nota"><b>{latestNino == null ? '—' : `${latestNino.toFixed(2)} °C`}</b><span>Niño 1+2 en el último mes</span></div></div><p className="monitor-aviso"><strong>Cómo leerlo:</strong> la biomasa solo aparece durante intervalos de crucero IMARPE.</p></div></section>
}

function ExplorerPage() { return <><Header /><GlobeView /><main id="contenido"><section className="seccion pregunta"><blockquote>¿Cómo se asocian los cambios del fitoplancton antártico con la vida marina del Perú?</blockquote><div className="cuerpo"><p>El <strong>fitoplancton</strong> son algas microscópicas que flotan en el mar. Son la base de la cadena alimenticia.</p><p>Los satélites miden el fitoplancton por el color del agua: más verde quiere decir más <strong>clorofila</strong>.</p><p>La idea es buscar <strong>asociaciones</strong>. Que dos cosas cambien juntas no prueba que una cause a la otra.</p></div></section><section className="seccion" id="hallazgos"><div className="encabezado-seccion"><h2>Lo que muestran los datos</h2><p>Resultados calculados con las series de esta página.</p></div><ChartPanel kind="coast" title="La costa manda: El Niño frente al Perú" text="temperatura de Niño 1+2 frente a la pesca de anchoveta" /><ChartPanel kind="antarctica" title="La Antártida va a su propio ritmo" text="fitoplancton de Rey Jorge frente al de Chimbote" /><ChartPanel kind="ice" title="El hielo marino antártico se desplomó" text="millones de km² por debajo de lo normal" /><ChartPanel kind="nutrients" title="Mucho nitrato, poco fitoplancton" text="veces más nitrato en Rey Jorge que en Chimbote" /></section><Monitor /><section className="seccion"><div className="llamada"><div><h2>¿Puedes predecir la pesca leyendo satélites?</h2><p>Observa señales de la Antártida y del Perú y decide si la anchoveta subió o bajó.</p><a className="btn btn-claro" href="/juego.html">Empezar el juego</a></div></div></section></main><footer>Borrador de idea para el equipo de NASA Space Apps Challenge 2026.</footer></> }

function App() { if (window.location.pathname === '/juego' || window.location.pathname === '/juego.html') return <div className="game-placeholder"><h1>Juego</h1><p>La estructura del juego se migrará en el siguiente bloque React.</p><a className="btn" href="/">Volver al explorador</a></div>; return <ExplorerPage /> }

export default App
