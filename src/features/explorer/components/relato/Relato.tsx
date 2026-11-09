import { useEffect, useRef } from 'react'
import { useExplorerStore } from '../../store'
import Base from './Base'
import Comparar from './Comparar'
import Corriente from './Corriente'
import General from './General'
import Punto from './Punto'
import Recorrido from './Recorrido'
import Zona from './Zona'

/** Panel lateral: muestra una vista según lo que se tocó en el globo */
export default function Relato() {
  const panel = useExplorerStore((s) => s.panel)
  const raiz = useRef<HTMLDivElement>(null)

  // cada vista nueva empieza arriba
  const clave = JSON.stringify(panel)
  useEffect(() => { raiz.current?.parentElement?.scrollTo({ top: 0 }) }, [clave])

  let vista
  switch (panel.tipo) {
    case 'zona': vista = <Zona z={panel.z} nota={panel.nota} />; break
    case 'base': vista = <Base />; break
    case 'corriente': vista = <Corriente id={panel.id} />; break
    case 'punto': vista = <Punto lat={panel.lat} lng={panel.lng} />; break
    case 'comparar': vista = <Comparar />; break
    case 'recorrido': vista = <Recorrido paso={panel.paso} />; break
    default: vista = <General />
  }
  return <div className="relato-contenido" key={clave} ref={raiz}>{vista}</div>
}
