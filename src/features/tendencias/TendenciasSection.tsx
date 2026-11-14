import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../../contexts/DataContext'
import { promediosAnuales, regresion, sensibilidadInicio, tendencia, type Estacion } from '../../lib/tendencias'
import './tendencias.css'

type Variable = 'chl' | 'sst'
type Fuente = 'occci' | 'modis' | 'crw'
type Largas = {
  sst_crw: { inicio: string; zonas: Record<string, (number | null)[]> }
  chl_modis: Record<string, { inicio: string; valores: (number | null)[] }>
}

const ZONAS: { id: string; nombre: string }[] = [
  { id: 'paita', nombre: 'Paita–Sechura (north Peru)' },
  { id: 'chimbote', nombre: 'Chimbote (north-central Peru)' },
  { id: 'callao', nombre: 'Callao (central Peru)' },
  { id: 'pisco', nombre: 'Pisco (south-central Peru)' },
  { id: 'ilo', nombre: 'Ilo (south Peru)' },
  { id: 'rey_jorge', nombre: 'King George Island (Antarctica)' },
  { id: 'peninsula_antartica', nombre: 'Antarctic Peninsula' },
]
const FUENTES: Record<Fuente, string> = {
  occci: 'OC-CCI v6 (ESA), 1998–2025',
  modis: 'MODIS-Aqua (NASA, via Giovanni), 2002–2025',
  crw: 'Coral Reef Watch v3.1 (NOAA), 1986–2025',
}
const ESTACIONES: Record<Estacion, string> = { year: 'Whole year', summer: 'Summer (Dec–Mar)', winter: 'Winter (Jun–Sep)' }
const UNIDAD: Record<Variable, string> = { chl: 'mg/m³', sst: '°C' }
const DEFINICION: Record<Variable, string> = {
  chl: 'Chlorophyll-a is the pigment of phytoplankton. Satellites estimate it from the color of the water: more chlorophyll means more microscopic algae.',
  sst: 'Sea surface temperature measured from space. A warmer surface can change currents, nutrients and the life that depends on them.',
}
const ANIO_FINAL = 2025

type Ejemplo = { titulo: string; resumen: string; variable: Variable; zona: string; fuente: Fuente; inicio: number; fin: number; estacion: Estacion }
const EJEMPLOS: Ejemplo[] = [
  { titulo: 'Peruvian chlorophyll: no trend', resumen: 'Chimbote since 1998', variable: 'chl', zona: 'chimbote', fuente: 'occci', inicio: 1998, fin: ANIO_FINAL, estacion: 'year' },
  { titulo: 'Antarctic warming, 1998–2025', resumen: 'King George Island: a significant trend', variable: 'sst', zona: 'rey_jorge', fuente: 'crw', inicio: 1998, fin: ANIO_FINAL, estacion: 'year' },
  { titulo: 'The same series since 1986', resumen: 'The trend disappears with a longer record', variable: 'sst', zona: 'rey_jorge', fuente: 'crw', inicio: 1986, fin: ANIO_FINAL, estacion: 'year' },
]

const nf = (d: number) => new Intl.NumberFormat('en', { maximumFractionDigits: d, minimumFractionDigits: d })
const signo = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '')
const intervalo = (a: number, b: number, d: number) => `${signo(a)}${nf(d).format(Math.abs(a))} to ${signo(b)}${nf(d).format(Math.abs(b))}`
const textoP = (p: number) => (p < 0.001 ? 'p < 0.001' : `p = ${nf(3).format(p)}`)

/** Panel de tendencias: elegir variable, región y periodo, y comprobar si el cambio es estadísticamente significativo */
export default function TendenciasSection() {
  const { monitor } = useData()
  const [largas, setLargas] = useState<Largas | null>(null)
  const [variable, setVariable] = useState<Variable>('chl')
  const [zona, setZona] = useState('chimbote')
  const [fuente, setFuente] = useState<Fuente>('occci')
  const [inicio, setInicio] = useState(1998)
  const [fin, setFin] = useState(ANIO_FINAL)
  const [estacion, setEstacion] = useState<Estacion>('year')

  useEffect(() => {
    let vivo = true
    fetch('/assets/data/tendencias-largas.json').then((r) => r.json()).then((d: Largas) => { if (vivo) setLargas(d) }).catch(() => {})
    return () => { vivo = false }
  }, [])

  const fuentesDisponibles: Fuente[] = variable === 'sst' ? ['crw'] : zona === 'chimbote' ? ['occci', 'modis'] : ['occci']
  const fuenteActiva: Fuente = fuentesDisponibles.includes(fuente) ? fuente : fuentesDisponibles[0]!

  /** serie mensual completa de la fuente, antes de recortar el periodo */
  const mensual = useMemo(() => {
    if (fuenteActiva === 'occci') {
      return (monitor?.records ?? []).map((r) => ({ mes: r.date.slice(0, 7), valor: typeof r[`chl_${zona}_mg_m3`] === 'number' ? (r[`chl_${zona}_mg_m3`] as number) : null }))
    }
    if (!largas) return []
    const [serie, ini] = fuenteActiva === 'crw'
      ? [largas.sst_crw.zonas[zona] ?? [], largas.sst_crw.inicio]
      : [largas.chl_modis[zona]?.valores ?? [], largas.chl_modis[zona]?.inicio ?? '2002-07']
    let a = Number(ini.slice(0, 4)), m = Number(ini.slice(5, 7))
    return serie.map((valor) => {
      const mes = `${a}-${String(m).padStart(2, '0')}`
      if (++m > 12) { m = 1; a++ }
      return { mes, valor }
    })
  }, [monitor, largas, zona, fuenteActiva])

  const todos = useMemo(() => promediosAnuales(mensual, estacion).filter((p) => p.x <= ANIO_FINAL), [mensual, estacion])
  const primero = todos[0]?.x ?? 1998
  const ultimo = todos[todos.length - 1]?.x ?? ANIO_FINAL
  const ini = Math.max(primero, Math.min(inicio, ultimo))
  const fi = Math.min(ultimo, Math.max(fin, ini))
  const puntos = useMemo(() => todos.filter((p) => p.x >= ini && p.x <= fi), [todos, ini, fi])
  const res = useMemo(() => tendencia(puntos), [puntos])
  const reg = useMemo(() => regresion(puntos), [puntos])
  const sens = useMemo(() => sensibilidadInicio(todos.filter((p) => p.x <= fi)), [todos, fi])
  const anios = Array.from({ length: ultimo - primero + 1 }, (_, i) => primero + i)

  const media = puntos.length ? puntos.reduce((a, p) => a + p.y, 0) / puntos.length : 0
  const dec = variable === 'chl' ? 3 : 2
  const datosGrafico = puntos.map((p) => ({ x: p.x, valor: p.y, sen: res ? res.intercepto + res.pendiente * p.x : undefined }))
  const significativa = res !== null && res.p < 0.05
  const nSig = sens.filter((s) => s.p < 0.05).length
  const cambiaSigno = res !== null && sens.some((s) => Math.sign(s.pendiente) !== Math.sign(res.pendiente))
  const frases: string[] = []
  if (res && sens.length) {
    if (significativa && nSig < sens.length) frases.push(`Starting in other years the result changes: the trend is significant in ${nSig} of ${sens.length} possible start years.`)
    if (!significativa && nSig > 0) frases.push(`Starting in other years the trend is significant in ${nSig} of ${sens.length} cases: the result depends on the period you choose.`)
    if (cambiaSigno) frases.push('For some start years the direction of the trend even reverses.')
    if (!frases.length) frases.push(significativa ? 'The trend stays significant whatever start year you choose.' : 'No start year makes the trend significant.')
  }

  const aplicar = (e: Ejemplo) => { setVariable(e.variable); setZona(e.zona); setFuente(e.fuente); setInicio(e.inicio); setFin(e.fin); setEstacion(e.estacion) }
  const cambiarVariable = (v: Variable) => { setVariable(v); setFuente(v === 'sst' ? 'crw' : 'occci'); setInicio(v === 'sst' ? 1998 : 1998) }

  return (
    <section className="seccion tendencias" id="trends" aria-labelledby="t-tendencias">
      <p className="puente-kicker">Be a trend detective</p>
      <h2 id="t-tendencias">Is the change real? Test a trend yourself</h2>
      <p className="nota">Pick a variable, a place and a period. The panel draws the yearly averages and runs the Mann-Kendall test, which asks whether the values tend to rise or fall consistently. A p-value below 0.05 is the usual standard for a significant trend.</p>

      <div className="tend-ejemplos" role="group" aria-label="Guided examples">
        {EJEMPLOS.map((e) => (
          <button key={e.titulo} type="button" className="btn" onClick={() => aplicar(e)}>
            <b>{e.titulo}</b><span>{e.resumen}</span>
          </button>
        ))}
      </div>

      <div className="tend-controles">
        <label>Variable
          <select value={variable} onChange={(ev) => cambiarVariable(ev.target.value as Variable)}>
            <option value="chl">Chlorophyll-a (phytoplankton)</option>
            <option value="sst">Sea surface temperature</option>
          </select>
        </label>
        <label>Region
          <select value={zona} onChange={(ev) => setZona(ev.target.value)}>
            {ZONAS.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
          </select>
        </label>
        <label>Data source
          <select value={fuenteActiva} onChange={(ev) => setFuente(ev.target.value as Fuente)} disabled={fuentesDisponibles.length < 2}>
            {fuentesDisponibles.map((f) => <option key={f} value={f}>{FUENTES[f]}</option>)}
          </select>
        </label>
        <label>From
          <select value={ini} onChange={(ev) => setInicio(Number(ev.target.value))}>{anios.map((a) => <option key={a}>{a}</option>)}</select>
        </label>
        <label>To
          <select value={fi} onChange={(ev) => setFin(Number(ev.target.value))}>{anios.map((a) => <option key={a}>{a}</option>)}</select>
        </label>
        <label>Season
          <select value={estacion} onChange={(ev) => setEstacion(ev.target.value as Estacion)}>
            {(Object.keys(ESTACIONES) as Estacion[]).map((k) => <option key={k} value={k}>{ESTACIONES[k]}</option>)}
          </select>
        </label>
      </div>
      <p className="tend-def">{DEFINICION[variable]}</p>

      {res === null ? <p className="monitor-aviso">Not enough years in this period: at least 8 yearly values are needed.</p> : <>
        <div className={`tend-veredicto ${significativa ? 'si' : 'no'}`} role="status">
          <b>{significativa ? 'Significant trend' : 'Not significant'}</b>
          <span>
            {signo(res.pendiente)}{nf(dec).format(Math.abs(res.pendiente * 10))} {UNIDAD[variable]} per decade
            {variable === 'chl' && media > 0 ? ` (${signo(res.pendiente)}${nf(1).format(Math.abs((res.pendiente * 10 * 100) / media))}% of the mean)` : ''}
            {' · '}Mann-Kendall {textoP(res.p)} · {res.n} years
          </span>
        </div>
        {!significativa && <p className="tend-nota">Not significant does not mean there is no change: a longer series can make a trend significant, or confirm that there is none.</p>}
        {reg && <div className="tend-pruebas">
          <div>
            <h3>Mann-Kendall test and Sen slope</h3>
            <p><b>{signo(res.pendiente)}{nf(dec).format(Math.abs(res.pendiente * 10))} {UNIDAD[variable]}</b> per decade</p>
            <p>95% confidence interval: {intervalo(res.ic95[0] * 10, res.ic95[1] * 10, dec)}</p>
            <p>{textoP(res.p)} · {res.p < 0.05 ? 'significant' : 'not significant'}</p>
          </div>
          <div>
            <h3>Linear regression and t-test</h3>
            <p><b>{signo(reg.pendiente)}{nf(dec).format(Math.abs(reg.pendiente * 10))} {UNIDAD[variable]}</b> per decade</p>
            <p>95% confidence interval: {intervalo(reg.ic95[0] * 10, reg.ic95[1] * 10, dec)}</p>
            <p>t = {nf(2).format(reg.t)} ({reg.n - 2} degrees of freedom) · {textoP(reg.p)} · {reg.p < 0.05 ? 'significant' : 'not significant'}</p>
          </div>
        </div>}
        {reg && <p className="tend-nota">The two tests answer the same question in different ways. If the 95% interval includes zero, the trend is not significant. Mann-Kendall does not assume a straight line or normal data; the t-test does, so it is less reliable on short, uneven series.</p>}

        <div className="tend-grafico" role="img" aria-label={`Yearly averages of ${variable === 'chl' ? 'chlorophyll' : 'sea surface temperature'} with the trend line`}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={datosGrafico} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="rgba(163,188,203,.16)" />
              <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tick={{ fill: '#a3bccb', fontSize: 12 }} allowDecimals={false} />
              <YAxis tick={{ fill: '#a3bccb', fontSize: 12 }} domain={['auto', 'auto']} tickFormatter={(v: number) => nf(variable === 'chl' ? 2 : 1).format(v)} label={{ value: UNIDAD[variable], angle: -90, position: 'insideLeft', fill: '#a3bccb', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'rgba(7,30,51,.95)', border: '1px solid rgba(163,188,203,.3)', borderRadius: 6 }} labelStyle={{ color: '#eaf3f5' }} formatter={(v, n) => [`${nf(dec).format(Number(v))} ${UNIDAD[variable]}`, n === 'valor' ? 'Yearly mean' : 'Trend line (Sen)']} />
              <Line dataKey="valor" stroke={variable === 'chl' ? '#3fc28c' : '#f08a4b'} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              <Line dataKey="sen" stroke="#eaf3f5" strokeDasharray="6 4" strokeWidth={1.6} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {sens.length > 0 && <div className="tend-sens">
          <h3>How much does the result depend on the start year?</h3>
          {frases.map((f) => <p key={f} className="tend-nota">{f}</p>)}
          <div className="tend-sens-graficos">
            <figure>
              <figcaption>Trend per decade, by start year</figcaption>
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={sens.map((s) => ({ x: s.inicio, v: s.pendiente * 10 }))} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(163,188,203,.16)" />
                  <XAxis dataKey="x" tick={{ fill: '#a3bccb', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#a3bccb', fontSize: 11 }} tickFormatter={(v: number) => nf(2).format(v)} />
                  <ReferenceLine y={0} stroke="#a3bccb" />
                  <Tooltip contentStyle={{ background: 'rgba(7,30,51,.95)', border: '1px solid rgba(163,188,203,.3)', borderRadius: 6 }} formatter={(v) => [`${nf(dec).format(Number(v))} ${UNIDAD[variable]}/decade`, 'Trend']} labelFormatter={(l) => `Start: ${l}`} />
                  <Line dataKey="v" stroke="#9fe0f2" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </figure>
            <figure>
              <figcaption>p-value, by start year (below the line = significant)</figcaption>
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={sens.map((s) => ({ x: s.inicio, v: s.p }))} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(163,188,203,.16)" />
                  <XAxis dataKey="x" tick={{ fill: '#a3bccb', fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tick={{ fill: '#a3bccb', fontSize: 11 }} />
                  <ReferenceLine y={0.05} stroke="#f08a4b" strokeDasharray="5 4" label={{ value: '0.05', fill: '#f08a4b', fontSize: 11, position: 'insideTopRight' }} />
                  <Tooltip contentStyle={{ background: 'rgba(7,30,51,.95)', border: '1px solid rgba(163,188,203,.3)', borderRadius: 6 }} formatter={(v) => [nf(3).format(Number(v)), 'p-value']} labelFormatter={(l) => `Start: ${l}`} />
                  <Line dataKey="v" stroke="#3fc28c" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </figure>
          </div>
        </div>}
      </>}
      <p className="monitor-aviso"><strong>How to read it:</strong> the test uses yearly averages (a year counts only with enough months of data) and looks for a consistent rise or fall, not a straight line. The trend is the Theil–Sen slope. Series are short, so a result can change with a longer record or a different data product. Source: {FUENTES[fuenteActiva]}.</p>
    </section>
  )
}
