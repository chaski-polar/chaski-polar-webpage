import { useEffect, useMemo, useRef, useState } from 'react'
import './tendencias.css'

type Inicio = '1998' | '2003' | '2012'
type Capa = {
  celda: number
  filas: number
  cols: number
  indices: number[]
  unidad: string
  por_inicio: Record<Inicio, { pendiente: (number | null)[]; significativa: number[] }>
}
type Datos = { lat_n: number; lon_o: number; inicios: number[]; clorofila: Capa; temperatura: Capa }
type Variable = 'clorofila' | 'temperatura'

const PX = 8 // píxeles por celda de 0,5° (las celdas de 1° se dibujan del doble)
const ESCALA: Record<Variable, number> = { clorofila: 20, temperatura: 0.4 }
const nf = (d: number) => new Intl.NumberFormat('en', { maximumFractionDigits: d, minimumFractionDigits: d })
const signo = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')

/** Rampa divergente: bajar = ocre, subir = verde (clorofila) o rojo (temperatura) */
function color(v: number, variable: Variable, fuerte: boolean): string {
  const t = Math.max(-1, Math.min(1, v / ESCALA[variable]))
  const base = t >= 0 ? (variable === 'clorofila' ? [63, 194, 140] : [240, 110, 75]) : variable === 'clorofila' ? [214, 160, 70] : [90, 160, 225]
  const a = fuerte ? 0.35 + 0.65 * Math.abs(t) : 0.1 + 0.18 * Math.abs(t)
  return `rgba(${base[0]},${base[1]},${base[2]},${a.toFixed(2)})`
}

/** Mapa de tendencia por celda: dónde sube o baja la variable y dónde el cambio es significativo (Mann-Kendall con FDR entre celdas) */
export default function MapaTendencias() {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [variable, setVariable] = useState<Variable>('clorofila')
  const [inicio, setInicio] = useState<Inicio>('1998')
  const [aviso, setAviso] = useState('Move over the map to read a cell.')
  const lienzo = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let vivo = true
    fetch('/assets/data/tendencias-celdas.json').then((r) => r.json()).then((d: Datos) => { if (vivo) setDatos(d) }).catch(() => {})
    return () => { vivo = false }
  }, [])

  const capa = datos?.[variable]
  const t = capa?.por_inicio[inicio]
  const resumen = useMemo(() => {
    if (!capa || !t) return null
    let n = 0, sig = 0, sube = 0, baja = 0
    t.pendiente.forEach((p, i) => {
      if (p == null) return
      n++
      if (t.significativa[i]) { sig++; if (p > 0) sube++; else baja++ }
    })
    return { n, sig, sube, baja }
  }, [capa, t])

  const ancho = capa ? capa.cols * capa.celda * 2 * PX : 0
  const alto = capa ? capa.filas * capa.celda * 2 * PX : 0

  useEffect(() => {
    const c = lienzo.current
    if (!c || !capa || !t) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    const px = capa.celda * 2 * PX
    capa.indices.forEach((g, i) => {
      const p = t.pendiente[i]
      if (p == null) return
      const fila = Math.floor(g / capa.cols), col = g % capa.cols
      ctx.fillStyle = color(p, variable, t.significativa[i] === 1)
      ctx.fillRect(col * px, fila * px, px, px)
    })
  }, [capa, t, variable])

  const leer = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    if (!capa || !t || !datos) return
    const r = ev.currentTarget.getBoundingClientRect()
    const px = capa.celda * 2 * PX
    const col = Math.floor(((ev.clientX - r.left) / r.width) * capa.cols)
    const fila = Math.floor(((ev.clientY - r.top) / r.height) * capa.filas)
    const k = capa.indices.indexOf(fila * capa.cols + col)
    if (k < 0 || t.pendiente[k] == null || px === 0) { setAviso('No data in this cell (land or no coverage).'); return }
    const p = t.pendiente[k] as number
    const lat = datos.lat_n - (fila + 0.5) * capa.celda, lon = datos.lon_o + (col + 0.5) * capa.celda
    const dec = variable === 'clorofila' ? 1 : 2
    setAviso(`${nf(1).format(Math.abs(lat))}°${lat < 0 ? 'S' : 'N'}, ${nf(1).format(Math.abs(lon))}°${lon < 0 ? 'W' : 'E'}: ${signo(p)}${nf(dec).format(Math.abs(p))} ${capa.unidad} · ${t.significativa[k] ? 'significant' : 'not significant'}`)
  }

  return (
    <section className="seccion tendencias" id="trend-map" aria-labelledby="t-mapa-tend">
      <p className="puente-kicker">Where is it changing?</p>
      <h2 id="t-mapa-tend">A map of trends, cell by cell</h2>
      <p className="nota">Each cell of the satellite maps gets its own Mann-Kendall test on the yearly average. Bright cells have a significant trend after correcting for testing thousands of cells at once; faint cells have a trend that cannot be told apart from chance.</p>

      <div className="tend-controles">
        <label>Variable
          <select value={variable} onChange={(ev) => setVariable(ev.target.value as Variable)}>
            <option value="clorofila">Chlorophyll-a (change per decade, %)</option>
            <option value="temperatura">Sea surface temperature (anomaly, °C per decade)</option>
          </select>
        </label>
        <label>Start year
          <select value={inicio} onChange={(ev) => setInicio(ev.target.value as Inicio)}>
            <option value="1998">1998 (whole record)</option>
            <option value="2003">2003 (MODIS era)</option>
            <option value="2012">2012 (last 14 years)</option>
          </select>
        </label>
      </div>

      {resumen && <div className={`tend-veredicto ${resumen.sig > 0 ? 'si' : 'no'}`} role="status">
        <b>{nf(0).format((100 * resumen.sig) / resumen.n)}% of cells significant</b>
        <span>{resumen.sig} of {resumen.n} cells · {resumen.sube} rising, {resumen.baja} falling · {inicio}–2025</span>
      </div>}

      <div className="tend-mapa">
        {capa && <canvas ref={lienzo} width={ancho} height={alto} onMouseMove={leer} onMouseLeave={() => setAviso('Move over the map to read a cell.')} role="img" aria-label="Map of the trend of each cell, off the west coast of South America" />}
        <p className="tend-nota" aria-live="polite">{aviso}</p>
        <p className="tend-nota">{variable === 'clorofila' ? 'Green: rising. Ocher: falling.' : 'Red: warming. Blue: cooling.'} Bright cells are significant; faint cells are not. Color strength follows the size of the trend (full color at {variable === 'clorofila' ? '±20% per decade' : '±0.4 °C per decade'}).</p>
      </div>
      <p className="monitor-aviso"><strong>How to read it:</strong> the result depends on where the record starts. For chlorophyll, about a third of the cells are significant from 1998, about 8% from 2003 and almost none from 2012: the first year of the series is the lowest, and it weighs heavily on the longest trend. Neighboring cells are not independent, so the correction for many cells is optimistic. Source: OC-CCI v6 (ESA) chlorophyll and NOAA Coral Reef Watch temperature, yearly averages of cells with at least 8 months of data.</p>
    </section>
  )
}
