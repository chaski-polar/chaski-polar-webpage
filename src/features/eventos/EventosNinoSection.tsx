import { media } from '../../lib/estadistica'
import { nf, signo } from '../../lib/formato'
import { useExplorer } from '../explorer/ExplorerContext'
import { useAcciones } from '../explorer/hooks/useAcciones'
import type { ClaveZonaMonitor, IdZona } from '../explorer/lib/tipos'
import { useExplorerStore } from '../explorer/store'

const ZONAS_PERU: ClaveZonaMonitor[] = ['paita', 'chimbote', 'callao', 'pisco', 'ilo']

/** Meses que se promediaron en cada evento */
const PERIODOS: Record<string, string> = {
  '1997-98': 'ene–jun 1998',
  '2015-16': 'jun 2015–abr 2016',
  '2017': 'ene–may 2017',
  '2023-24': 'mar 2023–ene 2024',
  '2026': 'may–sep 2026, parcial',
}
const periodo = (nombre: string): string | undefined => Object.entries(PERIODOS).find(([k]) => nombre.includes(k))?.[1]

/** Color de la celda: naranja si la clorofila cayó, verde si subió (más intenso cuanto mayor el cambio) */
function colorCambio(p: number): string {
  const a = Math.min(1, Math.abs(p) / 60) * 0.75 + 0.1
  return p < 0 ? `rgba(240,138,75,${a})` : `rgba(63,194,140,${a})`
}

/** Cada El Niño, zona por zona: cuánto cambió la clorofila frente a lo normal */
export default function EventosNinoSection() {
  const { modelo } = useExplorer()
  const acciones = useAcciones()
  const eventos = modelo.metadataMonitor.eventos_nino ?? []
  const zonas = modelo.metadataMonitor.zonas ?? {}
  if (!eventos.length) return null

  const completos = eventos.filter((e) => e.cambio_clorofila_pct && !e.nombre.includes('2026'))
  const promedio = ZONAS_PERU.map((c) => ({ c, p: media(completos.map((e) => e.cambio_clorofila_pct?.[c])) }))
  const picos = modelo.eventosNino()
  const vulnerables = modelo.metadataMonitor.hallazgos?.find((h) => h.id === 'zonas_vulnerables')

  // tocar una celda lleva al globo: esa zona, con la clorofila del mes más cálido de ese El Niño
  const ir = (nombre: string, c: ClaveZonaMonitor) => {
    const z = zonas[c]?.id_original as IdZona | undefined
    if (!z) return
    const anio = Number(nombre.match(/\d{4}/)?.[0])
    const pico = picos.find((p) => p.anio === anio || p.anio === anio + 1)
    useExplorerStore.getState().setVariable('clorofila_mg_m3')
    if (pico) acciones.fijarMes(pico.i)
    acciones.irAZona(z)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return <section className="seccion" id="eventos-nino" aria-labelledby="t-eventos">
    <div className="encabezado-seccion">
      <h2 id="t-eventos">Cada El Niño, zona por zona</h2>
      <p>Cuánto cambió el fitoplancton (clorofila) frente a lo normal durante cada El Niño en las cinco zonas de la costa peruana. Naranja es una caída; verde, un aumento. {vulnerables?.resumen ?? ''}</p>
    </div>
    <div className="tabla-envoltura">
      <table className="eventos-nino">
        <thead><tr><th scope="col">El Niño</th>{ZONAS_PERU.map((c) => <th scope="col" key={c}>{zonas[c]?.nombre ?? c}</th>)}</tr></thead>
        <tbody>
          {eventos.map((e) => <tr key={e.nombre}>
            <th scope="row">{e.nombre}{periodo(e.nombre) && <small>{periodo(e.nombre)}</small>}{e.nombre.includes('2026') && <button type="button" className="enlace" onClick={() => { acciones.nino2026(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Ver en el globo</button>}</th>
            {e.cambio_clorofila_pct
              ? ZONAS_PERU.map((c) => {
                const p = e.cambio_clorofila_pct?.[c]
                return <td key={c}>{p == null ? '—' : <button type="button" style={{ background: colorCambio(p) }} onClick={() => ir(e.nombre, c)} title={`Ver ${zonas[c]?.nombre ?? c} en el globo`}>{signo(p)}{nf(0).format(Math.abs(p))} %</button>}</td>
              })
              : <td colSpan={ZONAS_PERU.length} className="evento-nota">{e.nota ?? 'Sin datos todavía.'} <button type="button" className="enlace" onClick={() => { acciones.nino2026(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Ver El Niño 2026 en el globo</button></td>}
          </tr>)}
          <tr className="fila-promedio">
            <th scope="row">Promedio de los eventos<small>sin 2026, que sigue en curso</small></th>
            {promedio.map(({ c, p }) => <td key={c}>{p == null ? '—' : <span style={{ background: colorCambio(p) }}>{signo(p)}{nf(0).format(Math.abs(p))} %</span>}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
    <p className="nota">Promedio de la clorofila (OC-CCI) en los meses indicados de cada evento, comparada con el mismo mes de un año normal (media geométrica). Toca una celda para ver esa zona en el globo. Es una asociación con El Niño, no una medida de su causa.</p>
  </section>
}
