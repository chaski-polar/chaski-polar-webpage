import { useEffect, useRef, useState } from 'react'
import './App.css'
import './estilos.css'

type LegacyWindow = Window & { DATOS?: any; Globe?: any }
type GlobeVariable = 'clorofila' | 'temperatura' | 'hielo'
type GlobePoint = { nombre: string; region: string; lat: number; lon: number; value: number; key: string }

const runtimeScripts = ['/assets/vendor/globe.gl.min.js', '/assets/data/datos.js?v=14']

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
    ;(async () => {
      for (const src of runtimeScripts) await loadScript(src)
      if (!cancelled) setReady(true)
    })().catch(console.error)
    return () => { cancelled = true }
  }, [])
  return ready
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

function ChartPlaceholder({ title, text }: { title: string; text: string }) { return <article className="hallazgo"><div className="texto"><h3>{title}</h3><div className="r num">—<small>{text}</small></div><p>El gráfico React conservará los datos y estilos de la página original.</p></div><div className="lienzo chart-placeholder" aria-label={title}><span>Gráfico</span></div></article> }

function Monitor() { const [variable, setVariable] = useState('chlorophyll_a_mg_m3'); return <section className="seccion"><div className="monitor"><div className="monitor-cabecera"><div><h2>Monitor de condiciones</h2><p>Explora la señal ambiental mensual que alimenta los experimentos A y B.</p></div><span className="monitor-meta">1998–2026</span></div><div className="monitor-controles"><label>Variable <select value={variable} onChange={(e) => setVariable(e.target.value)}><option value="chlorophyll_a_mg_m3">Clorofila-a / fitoplancton</option><option value="sst_c">Temperatura superficial</option><option value="nitrate_mmol_m3">Nitrato</option><option value="biomass_total_t">Biomasa observada</option></select></label><label>Escala <select defaultValue="absolute"><option value="absolute">Valores</option><option value="anomaly">Anomalía frente al promedio mensual</option></select></label></div><p className="monitor-estado">Seleccionada: {variable}</p><div className="monitor-grafico chart-placeholder"><span>Serie mensual del monitor</span></div><div className="monitor-notas"><div className="monitor-nota"><b>—</b><span>último valor disponible</span></div><div className="monitor-nota"><b>23</b><span>meses con biomasa observada</span></div><div className="monitor-nota"><b>—</b><span>Niño 1+2 en el último mes</span></div></div><p className="monitor-aviso"><strong>Cómo leerlo:</strong> la biomasa solo aparece durante intervalos de crucero IMARPE.</p></div></section> }

function ExplorerPage() { return <><Header /><GlobeView /><main id="contenido"><section className="seccion pregunta"><blockquote>¿Cómo se asocian los cambios del fitoplancton antártico con la vida marina del Perú?</blockquote><div className="cuerpo"><p>El <strong>fitoplancton</strong> son algas microscópicas que flotan en el mar. Son la base de la cadena alimenticia.</p><p>Los satélites miden el fitoplancton por el color del agua: más verde quiere decir más <strong>clorofila</strong>.</p><p>La idea es buscar <strong>asociaciones</strong>. Que dos cosas cambien juntas no prueba que una cause a la otra.</p></div></section><section className="seccion" id="hallazgos"><div className="encabezado-seccion"><h2>Lo que muestran los datos</h2><p>Resultados calculados con las series de esta página.</p></div><ChartPlaceholder title="La costa manda: El Niño frente al Perú" text="temperatura de Niño 1+2 frente a la pesca de anchoveta" /><ChartPlaceholder title="La Antártida va a su propio ritmo" text="fitoplancton de Rey Jorge frente al de Chimbote" /><ChartPlaceholder title="El hielo marino antártico se desplomó" text="millones de km² por debajo de lo normal" /><ChartPlaceholder title="Mucho nitrato, poco fitoplancton" text="veces más nitrato en Rey Jorge que en Chimbote" /></section><Monitor /><section className="seccion"><div className="llamada"><div><h2>¿Puedes predecir la pesca leyendo satélites?</h2><p>Observa señales de la Antártida y del Perú y decide si la anchoveta subió o bajó.</p><a className="btn btn-claro" href="/juego.html">Empezar el juego</a></div></div></section></main><footer>Borrador de idea para el equipo de NASA Space Apps Challenge 2026.</footer></> }

function App() { if (window.location.pathname === '/juego' || window.location.pathname === '/juego.html') return <div className="game-placeholder"><h1>Juego</h1><p>La estructura del juego se migrará en el siguiente bloque React.</p><a className="btn" href="/">Volver al explorador</a></div>; return <ExplorerPage /> }

export default App
