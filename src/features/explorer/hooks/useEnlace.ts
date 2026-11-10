import { useEffect } from 'react'
import { claveMes } from '../../../lib/formato'
import { useExplorer } from '../ExplorerContext'
import { MAP_STYLES } from '../lib/estado'
import { VARIABLES } from '../lib/variables'
import { useExplorerStore, type GlobeView } from '../store'
import { useAcciones } from './useAcciones'

const VISTAS: readonly GlobeView[] = ['illustrated', 'detailed', 'satellite']

/** La dirección de la página guarda lo que se está viendo (#mes=2023-05&dato=...&zona=...) para compartirlo */
export function useEnlace() {
  const { modelo } = useExplorer()
  const acciones = useAcciones()

  // al entrar: aplica lo que diga el enlace
  useEffect(() => {
    const h = location.hash.slice(1)
    if (!h.includes('=')) return
    const p = new URLSearchParams(h), st = useExplorerStore.getState()
    const dato = VARIABLES.find((v) => v.clave === p.get('dato'))
    if (dato) st.setVariable(dato.id)
    const [a, m] = (p.get('mes') ?? '').split('-').map(Number)
    const i = a && m ? modelo.idxMes(a, m - 1) : -1
    if (i >= modelo.i0) st.setMonth(i)
    const vista = VISTAS.find((x) => x === p.get('vista'))
    if (vista) st.setView(vista)
    const estilo = MAP_STYLES.find((x) => x === p.get('estilo'))
    if (estilo) st.setMapStyle(estilo)
    const zona = p.get('zona'), paso = Number(p.get('paso'))
    if (p.get('tema') === 'nino2026') acciones.nino2026()
    else if (modelo.esZona(zona)) acciones.irAZona(zona)
    else if (Number.isInteger(paso) && paso > 0) acciones.paso(paso - 1)
  }, [modelo, acciones])

  // después: cada cambio se guarda en la dirección (sin crear historial)
  useEffect(() => {
    let reloj = 0
    return useExplorerStore.subscribe((s) => {
      if (s.playing) return
      clearTimeout(reloj)
      reloj = window.setTimeout(() => {
        const p = new URLSearchParams()
        p.set('mes', claveMes(modelo.mes(s.month)))
        p.set('dato', VARIABLES.find((v) => v.id === s.variable)?.clave ?? 'clorofila')
        if (s.panel.tipo === 'zona') p.set('zona', s.panel.z)
        if (s.panel.tipo === 'recorrido') p.set('paso', String(s.panel.paso + 1))
        if (s.panel.tipo === 'nino2026') p.set('tema', 'nino2026')
        p.set('vista', s.view)
        if (s.view !== 'illustrated') p.set('estilo', s.mapStyle)
        history.replaceState(history.state, '', `#${p.toString()}`)
      }, 250)
    })
  }, [modelo])
}
