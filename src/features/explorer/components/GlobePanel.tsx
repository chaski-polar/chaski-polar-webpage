import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import * as THREE from 'three'
import { PALETAS } from '../../../lib/atlas'
import { puntoDeVistaDesdeGiro, tomarGiro } from '../../../lib/encuadre'
import { fmtCoord, fmtR, MESES_LARGOS, nf, signo } from '../../../lib/formato'
import { useTamano } from '../../../hooks/useTamano'
import { useExplorer } from '../ExplorerContext'
import { useAcciones, VISTA_INICIAL } from '../hooks/useAcciones'
import { useAtlas } from '../hooks/useAtlas'
import { useEnlace } from '../hooks/useEnlace'
import { esAngosto, menosMovimiento, punteroFino } from '../lib/entorno'
import { zonaActiva, type IdCorriente, type Pov } from '../lib/estado'
import { RECUADRO } from '../lib/mapa'
import { BASE_MACHU_PICCHU } from '../lib/modelo'
import { RECORRIDO } from '../lib/recorrido'
import type { IdZona } from '../lib/tipos'
import { variablePorId } from '../lib/variables'
import { useExplorerStore } from '../store'
import { GlobeViewToggle } from './GlobeViewToggle'
import RegionesPanel from './RegionesPanel'
import Relato from './relato/Relato'
import { TimelinePanel } from './TimelinePanel'

type Lado = 'der' | 'izq' | 'der-arriba' | 'der-abajo'
type Marca = { z: string; lat: number; lng: number; texto: string; lado?: Lado; forma?: 'punto' | 'base' | 'rio' | 'grupo'; soloCerca?: number; soloLejos?: number }
type Corriente = { id: IdCorriente; nombre: string; pts: [number, number][]; color: [string, string] }
type Arco = { de: IdZona; a: IdZona; r: number; startLat: number; startLng: number; endLat: number; endLng: number; color: [string, string]; grosor: number }
type Anillo = { lat: number; lng: number; r?: number }

const CORRIENTES: Corriente[] = [
  { id: 'circumpolar', nombre: 'Corriente Circumpolar Antártica', pts: Array.from({ length: 37 }, (_, k): [number, number] => [-58 + 2 * Math.sin(k / 3), -180 + k * 10]), color: ['rgba(159,224,242,0.08)', 'rgba(159,224,242,0.75)'] },
  { id: 'humboldt', nombre: 'Corriente de Humboldt', pts: [[-45, -79], [-40, -76.5], [-33, -74], [-26, -72.5], [-19, -73], [-14, -77.5], [-9, -80.5], [-4, -82.5]], color: ['rgba(159,224,242,0.25)', 'rgba(159,224,242,0.95)'] },
]
// los nombres de las zonas van a lados alternos para que no se monten
const LADO: Partial<Record<IdZona, Lado>> = {
  peru_norte_paita_sechura: 'izq', peru_centro_norte_chimbote: 'der', peru_centro_callao: 'izq', peru_sur_pisco: 'der',
  peru_sur_ilo: 'der', antartida_rey_jorge: 'der-arriba', antartida_peninsula: 'izq',
}
// con el globo lejos (altitud > 1,15) las zonas de cada región se juntan en una sola pastilla
const AGRUPAR = 1.15
const ANILLO_BASE: Anillo = { ...BASE_MACHU_PICCHU, r: 2.6 }

/** La altitud hace que el globo llene el espacio libre (cámara de 50° vertical) */
function encuadreInicial(w: number, h: number): Pov {
  const fraccion = Math.min(1, (0.9 * (w || 800)) / (h || 500))
  const ang = Math.atan(fraccion * Math.tan((25 * Math.PI) / 180))
  return { ...VISTA_INICIAL, altitude: Math.max(1.05, Math.min(3, 1 / Math.sin(ang) - 1)) }
}

const desdeEtiqueta = (ev: Event | undefined): boolean => ev?.target instanceof Element && ev.target.closest('.etq') != null

export default function GlobePanel() {
  const { modelo, mapa, mapaEstado, pedirMapa } = useExplorer()
  const acciones = useAcciones()
  const { variable: idVariable, month, view, panel, mapStyle, camera, setView, setMapStyle } = useExplorerStore()
  const v = variablePorId(idVariable)
  useEnlace()

  const globo = useRef<GlobeMethods | undefined>(undefined)
  const contenedor = useRef<HTMLDivElement>(null)
  const lienzo = useRef<HTMLDivElement>(null)
  const vistaAnterior = useRef({ panel, section: useExplorerStore.getState().section })
  const section = useExplorerStore((s) => s.section)
  const { width, height } = useTamano(contenedor)
  const material = useMemo(() => new THREE.MeshPhongMaterial({ color: PALETAS.noche.marSimple, shininess: 4, specular: new THREE.Color(0x080808) }), [])
  const atlasListo = useAtlas(view, material)

  // si se llega desde la portada, el globo empieza con el mismo giro y encuadre con que terminó la transición
  const [giroPortada] = useState(() => tomarGiro())
  const [veloAbierto, setVeloAbierto] = useState(giroPortada == null)
  const [pistaOculta, setPistaOculta] = useState(false)
  const [lectura, setLectura] = useState<{ x: number; y: number; titulo: string; detalle: string[] } | null>(null)

  // Al elegir otra vista desde el globo fijo, volver al inicio de su explicación.
  useEffect(() => {
    const anterior = vistaAnterior.current
    vistaAnterior.current = { panel, section }
    if (anterior.panel === panel && anterior.section === section) return
    if (window.matchMedia('(max-width: 900px)').matches) return
    const escenario = lienzo.current?.parentElement
    if (escenario && escenario.getBoundingClientRect().top < -2) {
      window.scrollTo({ top: escenario.offsetTop, behavior: menosMovimiento ? 'auto' : 'smooth' })
    }
  }, [panel, section])

  /* ---------- etiquetas de zonas, base y corrientes ---------- */
  const marcas = useMemo<Marca[]>(() => [
    ...modelo.ids.map((z): Marca => ({ z, lat: modelo.zona(z).lat, lng: modelo.zona(z).lon, texto: modelo.zona(z).nombre, lado: LADO[z] ?? 'der', soloCerca: AGRUPAR })),
    { z: 'grupo-peru', lat: -11, lng: -78.2, texto: '5 Peruvian zones', lado: 'der', forma: 'grupo', soloLejos: AGRUPAR },
    { z: 'grupo-antartida', lat: -62, lng: -62, texto: 'Antarctic Peninsula', lado: 'der-arriba', forma: 'grupo', soloLejos: AGRUPAR },
    { z: 'base', ...BASE_MACHU_PICCHU, texto: 'Base Machu Picchu', lado: 'der-abajo', forma: 'base', soloCerca: AGRUPAR },
    { z: 'rio-humboldt', lat: -27, lng: -78.4, texto: 'Humboldt Current ↑', forma: 'rio' },
    { z: 'rio-circumpolar', lat: -55.2, lng: -96, texto: 'Antarctic Circumpolar Current →', forma: 'rio' },
  ], [modelo])
  const elementos = useRef(new Map<Marca, HTMLElement>())
  // las etiquetas se crean una sola vez: sus manejadores leen siempre la versión más reciente
  const manejadores = useRef({ clic: (m: Marca) => { void m }, pasar: (m: Marca | null) => { void m } })

  const interaccion = useCallback(() => {
    setPistaOculta(true)
    const c = globo.current?.controls()
    if (c) c.autoRotate = false
  }, [])

  useEffect(() => {
    manejadores.current.clic = (m) => {
      interaccion()
      if (m.z === 'grupo-peru') acciones.irARegion('peru')
      else if (m.z === 'grupo-antartida') acciones.irARegion('antartida')
      else if (m.z === 'base') acciones.base()
      else if (modelo.esZona(m.z)) acciones.irAZona(m.z)
    }
    manejadores.current.pasar = (m) => {
      const z = m && modelo.esZona(m.z) ? m.z : null
      const el = m ? elementos.current.get(m) : undefined
      if (!z || !el || !contenedor.current) { setLectura(null); return }
      const a = modelo.anomaliaTxt(z, v, month), x = modelo.valorZona(z, v, month)
      const r = contenedor.current.getBoundingClientRect(), b = el.getBoundingClientRect()
      setLectura({ x: b.left - r.left + 16, y: b.top - r.top + 30, titulo: modelo.zona(z).nombre, detalle: [`${v.nombre}: ${x == null ? 'no data this month' : modelo.valorTxt(v, x)}${a ? `, ${a.frase}` : ''}`, 'Tap to see more'] })
    }
  }, [acciones, interaccion, modelo, month, v])

  const crearEtiqueta = useCallback((d: object) => {
    const m = d as Marca
    const e = document.createElement(m.forma === 'rio' ? 'div' : 'button')
    if (e instanceof HTMLButtonElement) e.type = 'button'
    e.className = `etq ${m.lado ?? 'der'} ${m.forma ?? 'punto'}`
    const punto = document.createElement('i'), nombre = document.createElement('span')
    punto.setAttribute('aria-hidden', 'true')
    nombre.textContent = m.texto
    e.append(punto, nombre)
    if (m.forma === 'rio') e.style.pointerEvents = 'none'
    else {
      // que el clic no llegue también al globo (que lo tomaría como un clic en el mar)
      for (const t of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend']) e.addEventListener(t, (ev) => ev.stopPropagation())
      e.addEventListener('click', (ev) => { ev.stopPropagation(); manejadores.current.clic(m) })
      e.addEventListener('pointerenter', () => manejadores.current.pasar(m))
      e.addEventListener('pointerleave', () => manejadores.current.pasar(null))
    }
    elementos.current.set(m, e)
    return e
  }, [])

  // color de cada punto = dato del mes en esa zona (la misma escala que la leyenda)
  useEffect(() => {
    for (const [m, e] of elementos.current) {
      if (m.z === 'grupo-peru') e.setAttribute('aria-label', '5 zonas del Perú: acercar el globo')
      if (m.z === 'grupo-antartida') e.setAttribute('aria-label', 'Península Antártica: acercar el globo')
      if (!modelo.esZona(m.z)) { e.classList.toggle('activa', m.z === 'base' && panel.tipo === 'base'); continue }
      const punto = e.querySelector('i')
      if (punto) punto.style.background = modelo.colorZona(m.z, v, month, 1)
      e.classList.toggle('activa', m.z === zonaActiva(panel))
      e.setAttribute('aria-label', `${modelo.zona(m.z).nombre}: ver sus datos`)
    }
  })

  const agrupar = useCallback((altitud: number) => {
    for (const [m, e] of elementos.current) e.classList.toggle('agrupada', (m.soloCerca != null && altitud > m.soloCerca) || (m.soloLejos != null && altitud <= m.soloLejos))
  }, [])

  /* ---------- capas que dependen de lo que se está viendo ---------- */
  const corrienteResaltada: IdCorriente | null = panel.tipo === 'corriente' ? panel.id : panel.tipo === 'recorrido' ? RECORRIDO[panel.paso]?.corriente ?? null : null
  const zonaArcos: IdZona | null = panel.tipo === 'zona' ? panel.z : panel.tipo === 'recorrido' ? RECORRIDO[panel.paso]?.arcos ?? null : null

  const arcos = useMemo<Arco[]>(() => {
    if (!zonaArcos) return []
    const p = modelo.zona(zonaArcos)
    return modelo.conexionesDe(zonaArcos, v).map(({ o, r }) => {
      const a = 0.25 + Math.min(1, Math.abs(r)) * 0.75, q = modelo.zona(o)
      return {
        de: zonaArcos, a: o, r, startLat: p.lat, startLng: p.lon, endLat: q.lat, endLng: q.lon,
        color: r >= 0 ? [`rgba(63,194,140,${a})`, `rgba(63,194,140,${a * 0.6})`] : [`rgba(240,138,75,${a})`, `rgba(240,138,75,${a * 0.6})`],
        grosor: 0.25 + Math.abs(r) * 0.9,
      }
    })
  }, [modelo, zonaArcos, v])

  const anillos = useMemo<Anillo[]>(() => {
    if (panel.tipo === 'zona') { const p = modelo.zona(panel.z); return [ANILLO_BASE, { lat: p.lat, lng: p.lon, r: panel.z === 'antartida_peninsula' ? 7 : 4 }] }
    if (panel.tipo === 'base') return [{ ...BASE_MACHU_PICCHU, r: 5 }]
    if (panel.tipo === 'punto') return [ANILLO_BASE, { lat: panel.lat, lng: panel.lng, r: 2 }]
    return [ANILLO_BASE]
  }, [modelo, panel])

  /* ---------- mapa del satélite ---------- */
  useEffect(() => { mapa.dibujar({ iMes: month, variable: v, vista: view, estilo: mapStyle }) }, [mapa, mapaEstado, month, v, view, mapStyle])
  const tiles = useMemo(() => (mapaEstado === 'listo' && mapa.material ? [RECUADRO] : []), [mapa, mapaEstado])
  const mapaActivo = mapaEstado === 'listo' && mapa.activo({ variable: v, vista: view })

  /* ---------- cámara ---------- */
  const alListo = useCallback(() => {
    const g = globo.current
    if (!g) return
    const c = g.controls()
    c.enableDamping = true
    c.minDistance = 130
    c.maxDistance = 520
    c.autoRotateSpeed = 0.35
    g.renderer().setPixelRatio(Math.min(devicePixelRatio || 1, 2))
    const inicio = useExplorerStore.getState().panel.tipo === 'general'
    if (giroPortada != null) g.pointOfView(puntoDeVistaDesdeGiro(giroPortada), 0)
    else if (inicio && !menosMovimiento) g.pointOfView({ lat: -66, lng: -60, altitude: 1.4 }, 0)
    if (inicio) setTimeout(() => g.pointOfView(encuadreInicial(contenedor.current?.clientWidth ?? 0, contenedor.current?.clientHeight ?? 0), menosMovimiento ? 0 : giroPortada != null ? 3200 : 4200), 900)
    // el mapa pesa unos 3 MB: se pide cuando el globo ya está en pantalla
    setTimeout(pedirMapa, 300)
  }, [giroPortada, pedirMapa])

  useEffect(() => {
    if (!camera || !globo.current) return
    const pov = camera.pov === VISTA_INICIAL ? encuadreInicial(contenedor.current?.clientWidth ?? 0, contenedor.current?.clientHeight ?? 0) : camera.pov
    globo.current.pointOfView(pov, menosMovimiento ? 0 : camera.ms)
  }, [camera])

  useEffect(() => {
    if (!atlasListo) return
    const t = setTimeout(() => { setVeloAbierto(true); document.documentElement.classList.remove('entrando') }, 150)
    return () => clearTimeout(t)
  }, [atlasListo])

  // giro automático cuando nadie toca el globo durante 30 s (solo en la vista general)
  useEffect(() => {
    if (menosMovimiento || panel.tipo !== 'general') return
    const t = setTimeout(() => { const c = globo.current?.controls(); if (c) c.autoRotate = true }, 30000)
    return () => clearTimeout(t)
  }, [panel, month, pistaOculta])

  // el globo deja de dibujar cuando no se ve (ahorra batería al leer los hallazgos)
  useEffect(() => {
    const el = lienzo.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) globo.current?.resumeAnimation(); else globo.current?.pauseAnimation() }, { threshold: 0.02 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  /* ---------- lectura del mapa bajo el cursor ---------- */
  const pendiente = useRef(0)
  const alMover = (e: React.PointerEvent) => {
    if (!punteroFino || pendiente.current) return
    const { clientX, clientY, buttons } = e
    pendiente.current = requestAnimationFrame(() => {
      pendiente.current = 0
      const g = globo.current, r = contenedor.current?.getBoundingClientRect()
      const ocultarMapa = () => setLectura((l) => (l && l.detalle.length === 1 ? null : l))
      if (!g || !r || buttons || !mapaActivo) { ocultarMapa(); return }
      const c = g.toGlobeCoords(clientX - r.left, clientY - r.top)
      const l = c ? mapa.leer(c.lat, c.lng) : null
      if (!c || !l) { ocultarMapa(); return }
      const txt = l.valor == null ? 'sin dato este mes' : l.esClorofila ? `${nf(l.valor < 1 ? 2 : 1).format(l.valor)} mg/m³ de clorofila` : `${signo(l.valor)}${nf(1).format(Math.abs(l.valor))} °C frente a lo normal`
      const m = modelo.mes(month)
      setLectura({ x: Math.min(clientX - r.left + 14, r.width - 220), y: clientY - r.top + 16, titulo: txt, detalle: [`${fmtCoord(c.lat, c.lng)}, ${MESES_LARGOS[m.mes]} de ${m.anio}`] })
    })
  }

  /* ---------- texto bajo el interruptor de vista ---------- */
  let nota: string
  if (view === 'illustrated') nota = "Each point is a zone, colored by the selected month's data."
  else if (mapaEstado === 'error') nota = 'The satellite map could not be loaded in this browser.'
  else if (mapaEstado !== 'listo') nota = 'Loading the satellite map…'
  else if (!v.mapa) nota = `${v.corto.charAt(0).toUpperCase() + v.corto.slice(1)}: data is available by zone only, without a map.`
  else nota = `${view === 'satellite' ? 'Earth imagery with the satellite map' : 'Monthly satellite map'}. ${punteroFino ? 'Hover' : 'Tap the sea'} to read it.`

  const textoVer = esAngosto() && panel.tipo !== 'general'
    ? panel.tipo === 'zona' ? `View ${modelo.zona(panel.z).nombre} data` : panel.tipo === 'recorrido' ? `Read step ${panel.paso + 1}` : 'View the explanation'
    : null

  // Escape vuelve a la vista general; en el recorrido, las flechas avanzan o retroceden
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      const escribiendo = e.target instanceof Element && e.target.closest('input, select, textarea')
      const p = useExplorerStore.getState().panel
      if (e.key === 'Escape' && p.tipo !== 'general') acciones.general()
      else if (p.tipo === 'recorrido' && !escribiendo && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault()
        acciones.paso(p.paso + (e.key === 'ArrowRight' ? 1 : -1))
      }
    }
    addEventListener('keydown', alTeclear)
    return () => removeEventListener('keydown', alTeclear)
  }, [acciones])

  return <section className="escenario" aria-label="Explorador del globo">
    <div className="lienzo-globo" ref={lienzo}>
      <div id="globo" ref={contenedor} role="img" aria-label={`Globo terrestre con ${v.nombre.toLowerCase()}. Las ${modelo.ids.length} zonas de estudio están en la lista del panel.`}
        onPointerDown={interaccion} onWheel={interaccion} onPointerMove={alMover} onPointerLeave={() => setLectura(null)}>
        {width > 0 && <Globe
          ref={globo}
          width={width}
          height={height}
          animateIn={false}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={material}
          showAtmosphere
          atmosphereColor={PALETAS.noche.atm}
          atmosphereAltitude={0.14}
          onGlobeReady={alListo}
          onZoom={(pov) => agrupar(pov.altitude)}
          onGlobeClick={({ lat, lng }, ev) => { if (!desdeEtiqueta(ev)) { interaccion(); acciones.clicMar(lat, lng) } }}
          pathsData={CORRIENTES}
          pathPoints="pts"
          pathPointLat={(p: [number, number]) => p[0]}
          pathPointLng={(p: [number, number]) => p[1]}
          pathPointAlt={0.008}
          pathColor={(d: object) => (d as Corriente).color}
          pathStroke={(d: object) => ((d as Corriente).id === corrienteResaltada ? 4 : 2)}
          pathDashLength={0.06}
          pathDashGap={0.02}
          pathDashAnimateTime={menosMovimiento ? 0 : 14000}
          pathLabel={(d: object) => `<div class="tip"><b>${(d as Corriente).nombre}</b><br><i>Tap to learn what it does</i></div>`}
          onPathClick={(d, ev) => { if (!desdeEtiqueta(ev)) { interaccion(); acciones.corriente((d as Corriente).id) } }}
          ringsData={anillos}
          ringColor={() => (t: number) => `rgba(99,205,232,${1 - t})`}
          ringMaxRadius={(d: object) => (d as Anillo).r ?? 3.2}
          ringPropagationSpeed={1.6}
          ringRepeatPeriod={menosMovimiento ? 0 : 1500}
          arcsData={arcos}
          arcColor={(d: object) => (d as Arco).color}
          arcStroke={(d: object) => (d as Arco).grosor}
          arcAltitudeAutoScale={0.32}
          arcDashLength={0.45}
          arcDashGap={0.12}
          arcDashAnimateTime={menosMovimiento ? 0 : 2600}
          arcLabel={(d: object) => { const a = d as Arco; return `<div class="tip"><b>${modelo.zona(a.de).nombre} y ${modelo.zona(a.a).nombre}</b><br>Se parecen r = ${fmtR(a.r)} en ${v.corto}</div>` }}
          onArcClick={(d, ev) => { if (!desdeEtiqueta(ev)) { interaccion(); acciones.irAZona((d as Arco).a) } }}
          htmlElementsData={marcas}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.012}
          htmlTransitionDuration={0}
          htmlElement={crearEtiqueta}
          tilesData={tiles}
          tileLat="lat"
          tileLng="lng"
          tileWidth="w"
          tileHeight="h"
          tileAltitude={0.0035}
          tileUseGlobeProjection
          tileCurvatureResolution={1}
          tileMaterial={() => mapa.material ?? material}
          tilesTransitionDuration={0}
          onTileClick={(_t, ev, c) => { if (!desdeEtiqueta(ev)) { interaccion(); acciones.clicMar(c.lat, c.lng) } }}
        />}
      </div>
      <div className="globe-toolbar">
        <GlobeViewToggle value={view} onChange={(x) => { interaccion(); setView(x) }} />
        <RegionesPanel alElegir={interaccion} />
        <p className="vista-nota" aria-live="polite" title={nota}>{nota}</p>
        {mapaActivo && <div className="estilos-mapa" role="group" aria-label="Estilo del mapa del satélite"><span>Mapa:</span>
          {(['bandas', 'celdas', 'suave'] as const).map((e) => <button className="control-pill" key={e} type="button" aria-pressed={mapStyle === e} onClick={() => setMapStyle(e)}>{{ bandas: 'Bands', celdas: 'Cells', suave: 'Smooth' }[e]}</button>)}
        </div>}
        <p className={`pista-globo${pistaOculta ? ' oculta' : ''}`}>Drag to rotate. Tap a zone, current or the sea.</p>
      </div>
      {textoVer && <button className="btn ver-relato" type="button" onClick={() => document.getElementById('relato')?.scrollIntoView({ behavior: menosMovimiento ? 'auto' : 'smooth' })}>{textoVer}</button>}
      {lectura && <div className="lectura" aria-hidden="true" style={{ transform: `translate(${Math.max(8, lectura.x)}px, ${lectura.y}px)` }}><b>{lectura.titulo}</b>{lectura.detalle.map((d) => <small key={d}>{d}</small>)}</div>}
      <TimelinePanel />
    </div>
    <aside className="relato" id="relato" aria-label="What the globe shows">
      <div className="relato-orientacion"><span>Explore the selected view below</span><a href="#hallazgos">Skip to findings <span aria-hidden="true">↓</span></a></div>
      <div aria-live="polite"><Relato /></div>
    </aside>
    <div className={`velo-entrada${veloAbierto ? ' abierto' : ''}`} aria-hidden="true" />
  </section>
}
