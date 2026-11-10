import { useMemo } from 'react'
import { Area, Bar, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { media } from '../../../../lib/estadistica'
import { etiquetaMes, mesLargo, nf, signo } from '../../../../lib/formato'
import { useData } from '../../../../contexts/DataContext'
import { useExplorer } from '../../ExplorerContext'
import { useAcciones } from '../../hooks/useAcciones'
import { esPeru } from '../../lib/modelo'
import type { NombreEscenario } from '../../lib/tipos'
import { variablePorId } from '../../lib/variables'
import { useExplorerStore } from '../../store'
import { BotonVolver } from './comun'

const ESCENARIOS: { id: NombreEscenario; nombre: string }[] = [
  { id: 'weak', nombre: 'débil' },
  { id: 'central', nombre: 'central' },
  { id: 'intense', nombre: 'intenso' },
]
const pct = (x: number) => `${signo(x)}${nf(0).format(Math.abs(x))} %`

/** El Niño 2026, en curso: lo que dicen los datos hasta el último mes disponible y los escenarios hasta 2027 */
export default function Nino2026() {
  const { modelo } = useExplorer()
  const { cruises } = useData()
  const acciones = useAcciones()

  const d = useMemo(() => {
    const desde = modelo.idxMes(2025, 0)
    const meses = modelo.meses.slice(desde).map((_, k) => desde + k)
    const esc = Object.fromEntries(ESCENARIOS.map((e) => [e.id, modelo.serieEscenario('nino12_anom_c', e.id)])) as Record<NombreEscenario, (number | null)[]>
    const filas = meses.map((i) => {
      const a = esc.weak[i], b = esc.intense[i]
      return { i, mes: etiquetaMes(modelo.mes(i)), nino: modelo.nino[i] ?? null, central: esc.central[i], banda: a != null && b != null ? [Math.min(a, b), Math.max(a, b)] : null }
    }).filter((f) => f.nino != null || f.central != null)

    // pico de 2026 en lo observado
    let pico: number | null = null
    for (let i = modelo.idxMes(2026, 0); i <= modelo.ultimoObservado; i++) if (modelo.nino[i] != null && (pico == null || (modelo.nino[i] as number) > (modelo.nino[pico] as number))) pico = i
    const icen = modelo.ultimoMonitor('icen')

    // clorofila de la costa en cada escenario frente a un mes normal (promedio de los meses de escenario)
    const normal = Array.from({ length: 12 }, (_, m) => media(modelo.registrosMonitor.filter((r) => Number(r.date.slice(5, 7)) - 1 === m).map((r) => r.chlorophyll_a_mg_m3)))
    const clorofila = ESCENARIOS.map((e) => {
      const serie = modelo.serieEscenario('chlorophyll_a_mg_m3', e.id)
      const cambios = modelo.meses.map((_, i) => (modelo.esEscenario(i) && serie[i] != null && normal[modelo.mes(i).mes] ? ((serie[i] as number) / (normal[modelo.mes(i).mes] as number) - 1) * 100 : null))
      return { ...e, cambio: media(cambios) }
    })
    const inicioEsc = modelo.inicioEscenario, finEsc = filas.at(-1)?.i

    // última clorofila por zona (antes de que llegue el calor)
    const chl = variablePorId('clorofila_mg_m3')
    const zonas = modelo.ids.filter(esPeru).map((z) => ({ z, a: modelo.anomaliaTxt(z, chl, modelo.ultimoSeries) }))

    return { filas, pico, icen, clorofila, inicioEsc, finEsc, zonas }
  }, [modelo])

  // cruceros de primavera en la región norte-centro (código AA09-..): el último es de este año
  const primavera = cruises.filter((c) => c.stock === 'norte_centro' && c.crucero.slice(2, 4) === '09').sort((a, b) => a.anio - b.anio)
  const ultimo = primavera.at(-1)
  const anteriores = primavera.filter((c) => c !== ultimo)
  const promAnteriores = media(anteriores.map((c) => c.biomasa_t))
  const nota = modelo.metadataMonitor.eventos_nino?.find((e) => e.nombre.includes('2026'))?.nota
  const prediccion = modelo.metadataMonitor.hallazgos?.find((h) => h.id === 'prediccion_2026')
  const pico = d.pico

  return <>
    <BotonVolver />
    <h2>El Niño 2026, en curso</h2>
    <div className="region">Costa del Perú · datos observados hasta {mesLargo(modelo.mes(modelo.ultimoObservado))}</div>
    <div className="cifras">
      {pico != null && <div className="cifra"><b className="num">{signo(modelo.nino[pico] as number)}{nf(2).format(Math.abs(modelo.nino[pico] as number))} °C</b><span>Niño 1+2 en {mesLargo(modelo.mes(pico))}: el mar frente al norte del Perú, sobre lo normal</span></div>}
      {d.icen?.icen != null && <div className="cifra"><b className="num">{signo(d.icen.icen)}{nf(2).format(Math.abs(d.icen.icen))} °C</b><span>índice costero ICEN de {d.icen.date.slice(0, 7)} (IGP/ENFEN)</span></div>}
    </div>
    <div className="grafico" role="img" aria-label="Niño 1+2 mensual desde 2025 y escenarios hasta febrero de 2027">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={d.filas} margin={{ top: 6, right: 18, bottom: 0, left: -14 }}>
          <XAxis dataKey="mes" tick={{ fill: "#a3bccb", fontSize: 11 }} stroke="rgba(36,80,122,.55)" interval={5} />
          <YAxis tick={{ fill: '#a3bccb', fontSize: 12 }} stroke="rgba(36,80,122,.55)" unit=" °C" width={58} />
          <ReferenceLine y={0} stroke="rgba(234,243,245,.5)" />
          <Tooltip contentStyle={{ background: 'rgba(7,30,51,.96)', border: '1px solid #24507a', borderRadius: 8 }} formatter={(x, n) => [Array.isArray(x) ? x.map((y: number) => nf(2).format(y)).join(' – ') : `${nf(2).format(Number(x))} °C`, String(n)]} />
          <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12, color: '#a3bccb' }} />
          <Bar dataKey="nino" name="Niño 1+2 observado" fill="#f08a4b" isAnimationActive={false}>{d.filas.map((f) => <Cell key={f.i} fill={(f.nino ?? 0) >= 0 ? '#f08a4b' : '#2b6cb0'} />)}</Bar>
          <Area dataKey="banda" name="Escenarios débil a intenso" stroke="none" fill="rgba(240,138,75,0.22)" isAnimationActive={false} />
          <Line dataKey="central" name="Escenario central" stroke="#f08a4b" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <p className="nota">Niño 1+2 de NOAA PSL. Desde {d.inicioEsc != null ? etiquetaMes(modelo.mes(d.inicioEsc)) : 'septiembre de 2026'} la línea discontinua y la banda son escenarios construidos con la climatología y una trayectoria asumida de El Niño: no son observaciones ni pronósticos.</p>

    <h3>¿Qué pasaría con el fitoplancton?</h3>
    <p>Comparado con un mes normal, la clorofila de la costa en los meses de escenario{d.finEsc != null && d.inicioEsc != null ? ` (${etiquetaMes(modelo.mes(d.inicioEsc))} a ${etiquetaMes(modelo.mes(d.finEsc))})` : ''} quedaría en promedio:</p>
    <div className="cifras">{d.clorofila.map((e) => <div className="cifra" key={e.id}><b className="num">{e.cambio == null ? '—' : pct(e.cambio)}</b><span>escenario {e.nombre}</span></div>)}</div>
    <p className="nota">Clorofila del monitor (reanálisis CMEMS para toda la costa). {nota ?? ''} {prediccion ? `La predicción por zona está ${prediccion.estado}.` : ''}</p>

    {ultimo && <>
      <h3>La anchoveta este año</h3>
      <p>El crucero {ultimo.crucero} estimó <strong>{nf(2).format(ultimo.biomasa_t / 1e6)} millones de t</strong> en la región norte-centro{ultimo.provisional ? ' (cifra provisional)' : ''}.{promAnteriores ? ` Es ${nf(0).format(Math.abs((ultimo.biomasa_t / promAnteriores - 1) * 100))} % ${ultimo.biomasa_t < promAnteriores ? 'menos' : 'más'} que el promedio de los cruceros de primavera anteriores de esa región (${anteriores.map((c) => c.anio).join(', ')}).` : ''}</p>
    </>}

    <h3>Antes del calor</h3>
    <p>La clorofila por zona llega hasta {mesLargo(modelo.mes(modelo.ultimoSeries))}, antes de que el mar se calentara. En ese mes:</p>
    <ul className="lista-zonas">{d.zonas.map(({ z, a }) => <li key={z}><button className="fila-zona" type="button" onClick={() => acciones.irAZona(z)}>
      <span className="punto" />
      <span>{modelo.zona(z).nombre}</span>
      <span className="valor">{a ? a.corto : 'sin dato'}</span>
    </button></li>)}</ul>

    <div className="acciones-relato">
      <button className="btn" type="button" onClick={() => { useExplorerStore.getState().setMonitorZone(null); document.getElementById('monitor')?.scrollIntoView({ behavior: 'smooth' }) }}>Ver el monitor</button>
      <a className="btn" href="#eventos-nino">Comparar con otros El Niño</a>
      <a className="btn" href="#cruceros">Ver los cruceros</a>
    </div>
  </>
}
