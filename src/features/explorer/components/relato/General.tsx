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
  const { variable, month: i, view } = useExplorerStore()
  const v = variablePorId(variable)
  const filas = modelo.ids.map((z) => ({ z, t: modelo.anomalia(z, v, i), a: modelo.anomaliaTxt(z, v, i) }))
    .sort((x, y) => (y.t == null ? -1 : x.t == null ? 1 : Math.abs(y.t) - Math.abs(x.t)))
  const top = filas[0]
  const mes = mesLargo(modelo.mes(i))
  const sinDatoAntartida = filas.some((f) => !esPeru(f.z) && f.t == null) && v.id === 'clorofila_mg_m3'
  const conMapa = mapaEstado === 'listo' && mapa.activo({ variable: v, vista: view })

  let notaMapa: React.ReactNode = null
  if (conMapa) {
    notaMapa = v.mapa === 'clorofila'
      ? ' El mapa sobre el globo muestra la clorofila en celdas de medio grado: amarillo y verde es mucho fitoplancton; morado, poco.'
        : ' El mapa sobre el globo muestra cuánto se alejó la temperatura de lo normal en celdas de un grado: naranja es más cálido; azul, más frío; donde el mar estuvo normal casi no hay color.'
  } else if (view === 'illustrated' && v.mapa) {
    notaMapa = <> Cada punto del globo es una zona de estudio, coloreada según su dato del mes. Para ver el mapa completo del satélite, cambia arriba a la vista <strong>Detallada</strong> o <strong>Satelital</strong>.</>
  }

  return <>
    <h2>{v.nombre}</h2>
    <p>{v.que}{notaMapa}</p>
    <button className="recorrido-cta" type="button" onClick={() => acciones.paso(0)}>
      <b>Del hielo a la anchoveta</b>
      <span>Recorrido guiado en 6 pasos, con datos reales. Unos 3 minutos.</span>
      <svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="16" fill="none" stroke="#3fc28c" strokeWidth="1.5" /><path d="M14 11l8 6-8 6z" fill="#eaf3f5" /></svg>
    </button>
    <p>
      {top?.a ? <>En {mes}, la zona más fuera de lo normal fue <strong>{modelo.zona(top.z).nombre}</strong>: {top.a.frase}.</> : `En ${mes} no hay datos de ${v.corto} para estas zonas.`}
      {sinDatoAntartida && ' En el invierno antártico no hay datos de color del mar: está oscuro y cubierto de hielo.'}
    </p>
    <h3>Las {modelo.ids.length} zonas en {mes}</h3>
    <ul className="lista-zonas">{filas.map((f) => <li key={f.z}><button className="fila-zona" type="button" onClick={() => acciones.irAZona(f.z)}>
      <span className="punto" style={{ background: modelo.colorZona(f.z, v, i, 1) }} />
      <span>{modelo.zona(f.z).nombre}<small>{modelo.zona(f.z).region}</small></span>
      <span className="valor">{f.a ? f.a.corto : 'sin dato'}</span>
    </button></li>)}</ul>
    <h3>Saltar a un Niño</h3>
    <ChipsEventos />
    <h3>Historias para explorar</h3>
    <div className="historias">
      <button className="historia destacada" type="button" onClick={acciones.nino2026}><b>El Niño 2026, en curso</b><span>El mar frente al Perú se está calentando: lo que dicen los datos hasta hoy.</span></button>
      {HISTORIAS.map((h) => <button key={h.id} className="historia" type="button" onClick={() => acciones.historia(h.id)}><b>{h.titulo}</b><span>{h.desc}</span></button>)}
      {mapaEstado === 'listo' && <button className="historia" type="button" onClick={() => { const m = modelo.mes(i); acciones.comparar({ mes: m.mes, b: m.anio }) }}><b>Comparar dos años</b><span>Dos mapas del mismo mes, lado a lado.</span></button>}
    </div>
    <div className="acciones-relato">
      <a className="btn" href="#hallazgos">Ver los hallazgos</a>
      <a className="btn" href="#monitor">Ver el monitor</a>
    </div>
  </>
}
