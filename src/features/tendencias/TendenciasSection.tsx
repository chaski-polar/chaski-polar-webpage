import { useEffect, useMemo, useState, useRef } from 'react'
import { CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../../contexts/DataContext'
import { promediosAnuales, sensibilidadInicio, tendencia, type Estacion } from '../../lib/tendencias'
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
  const [comparar, setComparar] = useState(false)
  const [guiado, setGuiado] = useState(false)
  const [paso, setPaso] = useState(0)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)
  const pregunta = useRef<HTMLHeadingElement>(null)

  useEffect(() => { if (guiado) pregunta.current?.focus() }, [paso, guiado])
  useEffect(() => {
    const leer = () => {
      const q = new URLSearchParams(location.search)
      if (q.get('trend') === 'antarctic') aplicar(EJEMPLOS[1]!)
      if (q.get('trend') === 'long-record') aplicar(EJEMPLOS[2]!)
    }
    leer()
    addEventListener('popstate', leer)
    return () => removeEventListener('popstate', leer)
  }, [])

  useEffect(() => {
    let vivo = true
    fetch('/assets/data/tendencias-largas.json').then((r) => { if (!r.ok) throw new Error('data'); return r.json() }).then((d: Largas) => { if (vivo) { setLargas(d); setError(false) } }).catch(() => { if (vivo) setError(true) })
    return () => { vivo = false }
  }, [intento])

  const fuentesDisponibles: Fuente[] = variable === 'sst' ? ['crw'] : ['chimbote', 'paita'].includes(zona) ? ['occci', 'modis'] : ['occci']
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
  const puedeComparar = variable === 'chl' && fuentesDisponibles.length === 2
  const otraFuente: Fuente = fuenteActiva === 'occci' ? 'modis' : 'occci'
  const otros = useMemo(() => {
    if (!comparar || !puedeComparar || !largas) return []
    const datos = otraFuente === 'occci'
      ? (monitor?.records ?? []).map((r) => ({ mes: r.date.slice(0, 7), valor: typeof r[`chl_${zona}_mg_m3`] === 'number' ? r[`chl_${zona}_mg_m3`] as number : null }))
      : (largas.chl_modis[zona]?.valores ?? []).map((valor, i) => {
        const inicio = largas.chl_modis[zona]!.inicio
        const fecha = new Date(Date.UTC(Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7)) - 1 + i, 1))
        return { mes: fecha.toISOString().slice(0, 7), valor }
      })
    return promediosAnuales(datos, estacion).filter((p) => p.x >= ini && p.x <= fi)
  }, [comparar, puedeComparar, largas, otraFuente, monitor, zona, estacion, ini, fi])
  // Ambas fuentes se prueban en los mismos años con dato, sin interpolar huecos.
  const comunes = puntos.filter((p) => otros.some((o) => o.x === p.x))
  const resComun = tendencia(comunes)
  const resOtra = tendencia(otros.filter((p) => comunes.some((o) => o.x === p.x)))
  const sens = useMemo(() => sensibilidadInicio(todos.filter((p) => p.x <= fi)), [todos, fi])
  const anios = Array.from({ length: ultimo - primero + 1 }, (_, i) => primero + i)

  const media = puntos.length ? puntos.reduce((a, p) => a + p.y, 0) / puntos.length : 0
  const dec = variable === 'chl' ? 3 : 2
  const datosGrafico = puntos.map((p) => ({ x: p.x, valor: p.y, otra: otros.find((o) => o.x === p.x)?.y, sen: res ? res.intercepto + res.pendiente * p.x : undefined }))
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
      <div className="tend-modos" role="group" aria-label="Exploration mode">
        <button className="btn" aria-pressed={!guiado} onClick={() => setGuiado(false)}>Explore freely</button>
        <button className="btn" aria-pressed={guiado} onClick={() => { setGuiado(true); setPaso(0) }}>Guide me with questions</button>
        <a href="#trend-glossary">What do these terms mean?</a>
      </div>
      {guiado && <div className="tend-asistente">
        <p className="tend-nota">Step {paso + 1} of 3</p>
        <h3 ref={pregunta} tabIndex={-1}>{['What do you want to look into?', 'Where?', 'Over which years?'][paso]}</h3>
        {paso === 0 && <div className="tend-modos"><button className="btn" onClick={() => { cambiarVariable('chl'); setPaso(1) }}>Phytoplankton</button><button className="btn" onClick={() => { cambiarVariable('sst'); setPaso(1) }}>Ocean warming</button></div>}
        {paso === 1 && <div className="tend-modos">{ZONAS.map((z) => <button className="btn" key={z.id} onClick={() => { setZona(z.id); setPaso(2) }}>{z.nombre}</button>)}</div>}
        {paso === 2 && <div className="tend-modos"><button className="btn" onClick={() => { setInicio(variable === 'sst' ? 1986 : 1998); setFin(2025); setEstacion('year'); setGuiado(false) }}>Full available record</button><button className="btn" onClick={() => { setInicio(1998); setFin(2025); setEstacion('year'); setGuiado(false) }}>1998–2025</button></div>}
        {paso > 0 && <button className="btn" onClick={() => setPaso(paso - 1)}>Back</button>}
      </div>}
      {error && <p role="alert">Long-record data could not be loaded. <button className="btn" onClick={() => setIntento(intento + 1)}>Retry data loading</button></p>}

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
          <select value={ini} onChange={(ev) => { setInicio(Number(ev.target.value)); if (Number(ev.target.value) > fin) setFin(Number(ev.target.value)) }}>{anios.map((a) => <option key={a}>{a}</option>)}</select>
        </label>
        <label>To
          <select value={fi} onChange={(ev) => setFin(Number(ev.target.value))}>{anios.filter((a) => a >= ini).map((a) => <option key={a}>{a}</option>)}</select>
        </label>
        <label>Season
          <select value={estacion} onChange={(ev) => setEstacion(ev.target.value as Estacion)}>
            {(Object.keys(ESTACIONES) as Estacion[]).map((k) => <option key={k} value={k}>{ESTACIONES[k]}</option>)}
          </select>
        </label>
      </div>
      <p className="tend-def">{DEFINICION[variable]}</p>
      {puedeComparar && <label className="tend-comparar"><input type="checkbox" checked={comparar} onChange={(e) => setComparar(e.target.checked)} /> Compare ESA OC-CCI and NASA MODIS-Aqua</label>}

      {res === null ? <p className="monitor-aviso">Not enough years in this period: at least 8 yearly values are needed.</p> : <>
        <div className={`tend-veredicto ${significativa ? 'si' : 'no'}`} role="status">
          <b>{significativa ? 'Significant trend' : 'Not significant'}</b>
          <span>
            {signo(res.pendiente)}{nf(dec).format(Math.abs(res.pendiente * 10))} {UNIDAD[variable]} per decade
            {variable === 'chl' && media > 0 ? ` (${signo(res.pendiente)}${nf(1).format(Math.abs((res.pendiente * 10 * 100) / media))}% of the mean)` : ''}
            {' · '}Mann-Kendall {textoP(res.p)} · {res.n} years
          </span>
        </div>
        <dl className="tend-estadisticas">
          <div><dt>Sen slope · 95% confidence interval</dt><dd>{nf(dec).format(res.intervalo95[0] * 10)} to {nf(dec).format(res.intervalo95[1] * 10)} {UNIDAD[variable]}/decade</dd></div>
          <div><dt>Linear regression · two-sided t-test</dt><dd>{textoP(res.pLineal)}</dd></div>
        </dl>
        {!significativa && <p className="tend-nota">The evidence is insufficient to establish a consistent trend in this period. This does not prove that no change exists.</p>}

        <p className="tend-nota">{variable === 'chl' ? 'Green' : 'Orange'}: yearly mean · Dashed white: Sen trend line. {ini}–{fi}, {UNIDAD[variable]}.</p>
        <div className="tend-grafico" role="group" aria-label={`Yearly averages of ${variable === 'chl' ? 'chlorophyll' : 'sea surface temperature'} with the trend line`}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={datosGrafico} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="rgba(163,188,203,.16)" />
              <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tick={{ fill: '#a3bccb', fontSize: 12 }} allowDecimals={false} />
              <YAxis tick={{ fill: '#a3bccb', fontSize: 12 }} domain={['auto', 'auto']} tickFormatter={(v: number) => nf(variable === 'chl' ? 2 : 1).format(v)} label={{ value: UNIDAD[variable], angle: -90, position: 'insideLeft', fill: '#a3bccb', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'rgba(7,30,51,.95)', border: '1px solid rgba(163,188,203,.3)', borderRadius: 6 }} labelStyle={{ color: '#eaf3f5' }} formatter={(v, n) => [`${nf(dec).format(Number(v))} ${UNIDAD[variable]}`, n === 'valor' ? FUENTES[fuenteActiva] : n === 'otra' ? FUENTES[otraFuente] : 'Trend line (Sen)']} />
              <Line dataKey="valor" stroke={variable === 'chl' ? '#3fc28c' : '#f08a4b'} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              <Line dataKey="sen" stroke="#eaf3f5" strokeDasharray="6 4" strokeWidth={1.6} dot={false} isAnimationActive={false} />
              {comparar && puedeComparar && <Line dataKey="otra" stroke="#63cde8" strokeDasharray="3 3" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <details className="tend-data-table"><summary>View yearly values as a table</summary><div className="tabla-envoltura"><table><caption>{FUENTES[fuenteActiva]} · {UNIDAD[variable]}</caption><thead><tr><th scope="col">Year</th><th scope="col">Yearly mean</th><th scope="col">Sen line</th>{comparar && puedeComparar && <th scope="col">{FUENTES[otraFuente]}</th>}</tr></thead><tbody>{datosGrafico.map((p) => <tr key={p.x}><th scope="row">{p.x}</th><td>{nf(dec).format(p.valor)}</td><td>{p.sen == null ? 'Not available' : nf(dec).format(p.sen)}</td>{comparar && puedeComparar && <td>{p.otra == null ? 'Not available' : nf(dec).format(p.otra)}</td>}</tr>)}</tbody></table></div></details>
        {comparar && puedeComparar && <div className="tend-comparacion">
          <p>Solid green: {FUENTES[fuenteActiva]}. Dotted blue: {FUENTES[otraFuente]}. Dashed white: selected source’s Sen line. Tests below use only shared years; the chart retains all available yearly means.</p>
          <div className="tend-estadisticas">{[[fuenteActiva, resComun], [otraFuente, resOtra]].map(([f, r]) => {
            const t = r as ReturnType<typeof tendencia>
            return <article key={String(f)}><h3>{FUENTES[f as Fuente]}</h3>{t ? <><p>{comunes[0]?.x}–{comunes.at(-1)?.x} · {t.n} shared years</p><p>{t.p < .05 ? 'Significant trend' : 'Not significant'} · {nf(dec).format(t.pendiente * 10)} {UNIDAD[variable]}/decade</p><p>Mann-Kendall {textoP(t.p)}<br />Regression t-test {textoP(t.pLineal)}<br />95% CI: {nf(dec).format(t.intervalo95[0] * 10)} to {nf(dec).format(t.intervalo95[1] * 10)}</p></> : <p>At least 8 shared years are needed.</p>}</article>
          })}</div>
        </div>}

        {sens.length > 0 && <div className="tend-sens">
          <h3>How much does the result depend on the start year?</h3>
          {frases.map((f) => <p key={f} className="tend-nota">{f}</p>)}
          <p className="tend-nota"><a href="#hallazgos">Read the findings on period and source sensitivity</a>. Significance in one period does not establish a robust long-term change.</p>
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
      <p className="tend-nota">Whole-year averages require at least 6 valid months; seasonal averages require 3 of 4 months. December belongs to its calendar year. These exploratory tests assume independent yearly observations and are not corrected for multiple comparisons. The regression t-test assumes independent, normally distributed residuals. Neither test establishes causation.</p>
      <details className="tend-glosario" id="trend-glossary"><summary>Glossary · understand the result</summary><dl>
        <dt>Chlorophyll-a</dt><dd>The pigment used by phytoplankton to capture light. Satellite water color provides an estimate of its concentration.</dd>
        <dt>Sea surface temperature</dt><dd>The temperature of the ocean’s upper layer, measured here by satellite.</dd>
        <dt>Mann-Kendall</dt><dd>A test of whether values consistently rise or fall over time, without assuming a straight-line relationship.</dd>
        <dt>Sen slope</dt><dd>The median slope between all pairs of yearly observations. Its 95% confidence interval describes uncertainty under the test’s assumptions.</dd>
        <dt>p-value</dt><dd>The probability of a result at least as extreme as observed if the no-trend hypothesis and the test’s assumptions hold. It is not the probability that the hypothesis is true.</dd>
      </dl></details>
    </section>
  )
}
