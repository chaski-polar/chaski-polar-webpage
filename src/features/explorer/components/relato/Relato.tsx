import { useEffect, useRef } from 'react'
import { useExplorerStore } from '../../store'
import Base from './Base'
import Comparar from './Comparar'
import Corriente from './Corriente'
import General from './General'
import Punto from './Punto'
import Nino2026 from './Nino2026'
import Recorrido from './Recorrido'
import Zona from './Zona'
import Biologia from './Biologia'

/** Panel lateral: muestra una vista según lo que se tocó en el globo */
export default function Relato() {
  const panel = useExplorerStore((s) => s.panel)
  const section = useExplorerStore((s) => s.section)
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
    case 'nino2026': vista = <Nino2026 />; break
    default: vista = <General />
  }
  const zona = panel.tipo === 'zona' ? panel.z : undefined
  return section === 'anchoveta'
    ? <div className="relato-contenido" key={`biologia-${clave}`} ref={raiz}><Biologia zona={zona} /></div>
    : <div className="relato-contenido" key={clave} ref={raiz}>{vista}</div>
}
