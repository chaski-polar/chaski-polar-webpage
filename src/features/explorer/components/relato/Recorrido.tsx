import { useEffect, useRef } from 'react'
import { useExplorer } from '../../ExplorerContext'
import { useAcciones } from '../../hooks/useAcciones'
import { esAngosto } from '../../lib/entorno'
import { RECORRIDO } from '../../lib/recorrido'
import { useExplorerStore } from '../../store'
import { BotonVolver, Rico } from './comun'

/** Un paso del recorrido guiado "Del hielo a la anchoveta" */
export default function Recorrido({ paso }: { paso: number }) {
  const { modelo, mapa, mapaEstado } = useExplorer()
  const acciones = useAcciones()
  const month = useExplorerStore((s) => s.month)
  const siguiente = useRef<HTMLButtonElement>(null)
  const p = RECORRIDO[paso]
  useEffect(() => { if (!esAngosto()) siguiente.current?.focus({ preventScroll: true }) }, [paso])
  if (!p) return null
  // el texto usa el mapa del satélite: se recalcula cuando termina de cargar
  void mapaEstado
  const t = p.texto(modelo, mapa, month)
  const final = paso === RECORRIDO.length - 1

  return <>
    <BotonVolver texto="Salir del recorrido" />
    <ol className="pasos" aria-hidden="true">{RECORRIDO.map((_, k) => <li key={k} className={k <= paso ? 'hecho' : ''} />)}</ol>
    <p className="paso-num">Paso {paso + 1} de {RECORRIDO.length}</p>
    <h2>{p.titulo}</h2>
    {t.parrafos.map((x) => <p key={x}><Rico texto={x} /></p>)}
    {t.dato && <div className="dato-clave"><b className="num">{t.dato.valor}</b><span>{t.dato.texto}</span></div>}
    <div className="nav-pasos">
      {paso > 0 && <button className="btn" type="button" onClick={() => acciones.paso(paso - 1)}>Anterior</button>}
      {final
        ? <><button ref={siguiente} className="btn btn-claro" type="button" onClick={() => acciones.general()}>Explorar por mi cuenta</button><a className="btn" href="#hallazgos">Ver los hallazgos</a></>
        : <button ref={siguiente} className="btn btn-claro" type="button" onClick={() => acciones.paso(paso + 1)}>Siguiente</button>}
    </div>
    <p className="nota" style={{ marginTop: 16 }}>También puedes avanzar o retroceder con las flechas del teclado.</p>
  </>
}
