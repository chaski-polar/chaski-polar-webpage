import type { ReactNode } from 'react'
import { useExplorer } from '../../ExplorerContext'
import { useAcciones } from '../../hooks/useAcciones'
import type { IdZona } from '../../lib/tipos'
import { VARIABLES, variablesDeSeccion } from '../../lib/variables'
import { useExplorerStore } from '../../store'

/** Texto con **negritas** */
export function Rico({ texto }: { texto: string }): ReactNode {
  return texto.split(/\*\*(.+?)\*\*/g).map((parte, k) => (k % 2 ? <strong key={k}>{parte}</strong> : parte))
}

export function BotonVolver({ texto = 'Volver a todas las zonas' }: { texto?: string }) {
  const { general } = useAcciones()
  return <button className="volver" type="button" onClick={() => general()}>{texto}</button>
}

/** Botones para cambiar el dato (solo los que tienen datos en la zona) */
export function ChipsVariables({ zona }: { zona: IdZona | null }) {
  const { modelo } = useExplorer()
  const { section, variable, setVariable } = useExplorerStore()
  if (section === 'pacifico_sur') return null
  return <div className="chips" role="group" aria-label="Cambiar el dato">
    {variablesDeSeccion(section).filter((v) => modelo.tieneDato(zona, v)).map((v) =>
      <button key={v.id} className="chip" type="button" aria-pressed={v.id === variable} onClick={() => setVariable(v.id)}>{v.nombre.replace(/ \(.*\)/, '')}</button>)}
  </div>
}

/** Saltos a cada El Niño (cambian a temperatura si el dato no tiene mapa) */
export function ChipsEventos() {
  const { modelo } = useExplorer()
  const { fijarMes, nino2026 } = useAcciones()
  return <div className="chips" role="group" aria-label="Saltar a un evento de El Niño">
    {modelo.eventosNino().map((e) => <button key={e.anio} className="chip" type="button" onClick={() => {
      if (e.anio === 2026) { nino2026(); return }
      const st = useExplorerStore.getState()
      if (!VARIABLES.find((v) => v.id === st.variable)?.mapa) st.setVariable('temperatura_superficial_C')
      fijarMes(e.i)
    }}>{e.nombre}</button>)}
  </div>
}
