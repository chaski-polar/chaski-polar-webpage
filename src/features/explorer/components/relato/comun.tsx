import type { ReactNode } from 'react'
import { useExplorer } from '../../ExplorerContext'
import { useAcciones } from '../../hooks/useAcciones'
import type { IdZona } from '../../lib/tipos'
import { VARIABLES } from '../../lib/variables'
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
  const { variable, setVariable } = useExplorerStore()
  return <div className="chips" role="group" aria-label="Cambiar el dato">
    {VARIABLES.filter((v) => modelo.tieneDato(zona, v)).map((v) =>
      <button key={v.id} className="chip" type="button" aria-pressed={v.id === variable} onClick={() => setVariable(v.id)}>{v.nombre.replace(/ \(.*\)/, '')}</button>)}
  </div>
}

/** Saltos a cada El Niño (cambian a temperatura si el dato no tiene mapa) */
export function ChipsEventos() {
  const { modelo } = useExplorer()
  const { fijarMes } = useAcciones()
  return <div className="chips" role="group" aria-label="Saltar a un evento de El Niño">
    {modelo.eventosNino().map((e) => <button key={e.anio} className="chip" type="button" onClick={() => {
      const st = useExplorerStore.getState()
      if (!VARIABLES.find((v) => v.id === st.variable)?.mapa) st.setVariable('temperatura_superficial_C')
      fijarMes(e.i)
    }}>{e.nombre}</button>)}
  </div>
}

/** Aviso cuando el mes elegido es un escenario de El Niño */
export function AvisoEscenario() {
  const { modelo } = useExplorer()
  const month = useExplorerStore((s) => s.month)
  if (!modelo.esEscenario(month)) return null
  return <p className="aviso-escenario"><strong>Este mes es un escenario, no una observación.</strong> De septiembre de 2026 a febrero de 2027 los valores se construyen con la climatología de cada mes y una trayectoria asumida de El Niño. Solo los datos del monitor tienen valores para estos meses.</p>
}
