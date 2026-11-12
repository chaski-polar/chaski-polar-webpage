import { mesLargo } from '../../../../lib/formato'
import { useExplorer } from '../../ExplorerContext'
import { useAcciones } from '../../hooks/useAcciones'
import { HISTORIAS } from '../../lib/historias'
import { esPeru } from '../../lib/modelo'
import { variablePorId } from '../../lib/variables'
import { useExplorerStore } from '../../store'
import { ChipsEventos } from './comun'

/** Resumen de todas las zonas en el mes elegido */
export default function General() {
  const { modelo, mapa, mapaEstado } = useExplorer()
  const acciones = useAcciones()
  const { section, variable, month: i, view } = useExplorerStore()
  const v = variablePorId(variable)
  const filas = modelo.ids.map((z) => ({ z, t: modelo.anomalia(z, v, i), a: modelo.anomaliaTxt(z, v, i) }))
    .sort((x, y) => (y.t == null ? -1 : x.t == null ? 1 : Math.abs(y.t) - Math.abs(x.t)))
  const top = filas[0]
  const mes = mesLargo(modelo.mes(i))
  const sinDatoAntartida = filas.some((f) => !esPeru(f.z) && f.t == null) && v.id === 'clorofila_mg_m3'
  const conMapa = mapaEstado === 'listo' && mapa.activo({ variable: v, vista: view })

  if (section === 'pacifico_sur') return <>
    <h2>South Pacific</h2>
    <p>This section identifies South Pacific regions the project intends to study, but the current dataset does not contain regional oceanographic fields for them.</p>
    <p className="nota">Peruvian or Antarctic values are not shown as substitutes. The planned boxes are the intermediate and subtropical South Pacific and the transition toward Humboldt.</p>
  </>

  let notaMapa: React.ReactNode = null
  if (conMapa) {
    notaMapa = v.mapa === 'clorofila'
      ? ' The globe map shows chlorophyll in half-degree cells: yellow and green mean more phytoplankton; purple means less.'
        : ' The globe map shows how far temperature moved from normal in one-degree cells: orange is warmer; blue is colder; normal water has little color.'
  } else if (view === 'illustrated' && v.mapa) {
    notaMapa = <> Each globe point is a study zone, colored by its value for the selected month. To see the full satellite map, switch above to <strong>Detailed</strong> or <strong>Satellite</strong> view.</>
  }

  return <>
    <h2>{v.nombre}</h2>
    <p>{v.que}{notaMapa}</p>
    <p className="variable-meta"><strong>Unit:</strong> {v.unidad} · <strong>Source:</strong> {v.fuente} · <strong>Period:</strong> {v.periodo} · <strong>Coverage:</strong> {v.cobertura}</p>
    <button className="recorrido-cta" type="button" onClick={() => acciones.paso(0)}>
      <b>From ice to anchoveta</b>
      <span>A guided six-step tour using real data. About three minutes.</span>
      <svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="16" fill="none" stroke="#3fc28c" strokeWidth="1.5" /><path d="M14 11l8 6-8 6z" fill="#eaf3f5" /></svg>
    </button>
    <p>
      {top?.a ? <>In {mes}, the zone farthest from normal was <strong>{modelo.zona(top.z).nombre}</strong>: {top.a.frase}.</> : `In ${mes} there is no ${v.corto} data for these zones.`}
      {sinDatoAntartida && ' During Antarctic winter there is no sea-color data: it is dark and ice-covered.'}
    </p>
    <h3>The {modelo.ids.length} zones in {mes}</h3>
    <ul className="lista-zonas">{filas.map((f) => <li key={f.z}><button className="fila-zona" type="button" onClick={() => acciones.irAZona(f.z)}>
      <span className="punto" style={{ background: modelo.colorZona(f.z, v, i, 1) }} />
      <span>{modelo.zona(f.z).nombre}<small>{modelo.zona(f.z).region}</small></span>
      <span className="valor">{f.a ? f.a.corto : 'no data'}</span>
    </button></li>)}</ul>
    <h3>Jump to an El Niño event</h3>
    <ChipsEventos />
    <h3>Stories to explore</h3>
    <div className="historias">
      <button className="historia destacada" type="button" onClick={acciones.nino2026}><b>El Niño 2026, ongoing</b><span>The sea off Peru is warming: what the data says so far.</span></button>
      {HISTORIAS.map((h) => <button key={h.id} className="historia" type="button" onClick={() => acciones.historia(h.id)}><b>{h.titulo}</b><span>{h.desc}</span></button>)}
      {mapaEstado === 'listo' && <button className="historia" type="button" onClick={() => { const m = modelo.mes(i); acciones.comparar({ mes: m.mes, b: m.anio }) }}><b>Compare two years</b><span>Two maps of the same month, side by side.</span></button>}
    </div>
    <div className="acciones-relato">
      <a className="btn" href="#hallazgos">View findings</a>
      <a className="btn" href="#monitor">View monitor</a>
    </div>
  </>
}
