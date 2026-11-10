import { useMemo } from 'react'
import { useExplorer } from '../ExplorerContext'
import type { Comparacion, IdCorriente, NotaHistoria, Pov } from '../lib/estado'
import { HISTORIAS, type IdHistoria } from '../lib/historias'
import { BASE_MACHU_PICCHU, distanciaKm, esPeru, zonasCercanas } from '../lib/modelo'
import { RECORRIDO } from '../lib/recorrido'
import type { IdZona } from '../lib/tipos'
import { variablePorId } from '../lib/variables'
import { useExplorerStore } from '../store'

/** Encuadre que muestra a la vez la costa del Perú y la Península Antártica */
export const VISTA_INICIAL: Pov = { lat: -37, lng: -73, altitude: 1.7 }

/** Acciones de navegación del explorador: cambian el estado y mueven la cámara */
export function useAcciones() {
  const { modelo, mapa } = useExplorer()
  return useMemo(() => {
    const st = () => useExplorerStore.getState()

    const fijarMes = (i: number | null) => {
      if (i == null) return
      st().setMonth(Math.max(modelo.i0, Math.min(modelo.ultimo, i)))
    }

    const irAZona = (z: IdZona, nota?: NotaHistoria) => {
      const p = modelo.zona(z), peru = esPeru(z)
      st().flyTo({ lat: p.lat + (peru ? -3 : 4), lng: p.lon + (peru ? -4 : 0), altitude: z === 'antartida_peninsula' ? 1.15 : peru ? 0.95 : 1.0 }, 1600)
      st().setPanel(nota ? { tipo: 'zona', z, nota } : { tipo: 'zona', z })
    }

    const general = (volar = true) => {
      st().setPanel({ tipo: 'general' })
      if (volar) st().flyTo(VISTA_INICIAL, 1500)
    }

    const base = () => {
      st().setPanel({ tipo: 'base' })
      st().flyTo({ lat: -58.5, lng: -58.5, altitude: 0.9 }, 1600)
    }

    const corriente = (id: IdCorriente) => {
      st().setPanel({ tipo: 'corriente', id })
      st().flyTo(id === 'humboldt' ? { lat: -22, lng: -80, altitude: 1.35 } : { lat: -62, lng: -60, altitude: 2.2 }, 1500)
    }

    /** Clic en el mar: la base, una zona cercana o un punto cualquiera */
    const clicMar = (lat: number, lng: number) => {
      const cerca = zonasCercanas(modelo, lat, lng)[0]
      if (distanciaKm(lat, lng, BASE_MACHU_PICCHU.lat, BASE_MACHU_PICCHU.lng) < 120) base()
      else if (cerca && cerca.d < 220) irAZona(cerca.z)
      else st().setPanel({ tipo: 'punto', lat, lng })
    }

    const historia = (id: IdHistoria) => {
      const h = HISTORIAS.find((x) => x.id === id)
      if (!h) return
      st().setVariable(h.variable)
      const i = h.mes(modelo)
      fijarMes(i)
      irAZona(h.zona, { titulo: h.titulo, texto: h.nota(modelo, useExplorerStore.getState().month) })
    }

    const comparar = (cambio: Partial<Comparacion> = {}) => {
      if (mapa.estado !== 'listo') return
      const v = variablePorId(st().variable)
      if (!v.mapa) st().setVariable('clorofila_mg_m3')
      const primera = st().panel.tipo !== 'comparar' || cambio.region != null
      const cmp = { ...st().comparison, ...cambio }
      st().setComparison(cmp)
      st().setPanel({ tipo: 'comparar' })
      if (primera) st().flyTo(cmp.region === 'peru' ? { lat: -12, lng: -80, altitude: 0.95 } : { lat: -58, lng: -62, altitude: 1.0 }, 1400)
    }

    const paso = (n: number) => {
      const k = Math.max(0, Math.min(RECORRIDO.length - 1, n))
      const p = RECORRIDO[k]
      if (!p) return
      const actual = st().panel
      if (actual.tipo === 'recorrido' && actual.paso === k) return
      st().setPlaying(false)
      // el recorrido necesita ver el mapa del satélite: pasa a la vista detallada
      if (st().view === 'illustrated') st().setView('detailed')
      const prep = p.preparar(modelo)
      if (prep.variable) st().setVariable(prep.variable)
      if (prep.mes !== undefined) fijarMes(prep.mes)
      st().flyTo(prep.pov, 2000)
      st().setPanel({ tipo: 'recorrido', paso: k })
    }

    /** El Niño 2026, en curso: costa del Perú */
    const nino2026 = () => {
      st().setPlaying(false)
      st().setPanel({ tipo: 'nino2026' })
      st().flyTo({ lat: -9, lng: -84, altitude: 1.1 }, 1600)
    }

    return { fijarMes, irAZona, general, base, corriente, clicMar, historia, comparar, paso, nino2026 }
  }, [modelo, mapa])
}
