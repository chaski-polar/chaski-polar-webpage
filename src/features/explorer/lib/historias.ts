/* Historias cortas: cada una elige un dato, un mes y una zona, y agrega una nota arriba del detalle */
import { etiquetaMes, nf } from '../../../lib/formato'
import { ZONA_CHIMBOTE, ZONA_REY_JORGE, type Modelo } from './modelo'
import type { IdZona } from './tipos'
import { variablePorId } from './variables'

export type IdHistoria = 'nino2023' | 'record2013' | 'antartida2023' | 'nitrato'

export interface Historia {
  id: IdHistoria
  titulo: string
  desc: string
  variable: string
  zona: IdZona
  mes(m: Modelo): number | null
  /** se calcula después de fijar el dato y el mes */
  nota(m: Modelo, iMes: number): string
}

const CN = ZONA_CHIMBOTE, RJ = ZONA_REY_JORGE
const chl = () => variablePorId('clorofila_mg_m3')
const sst = () => variablePorId('temperatura_superficial_C')

export const HISTORIAS: readonly Historia[] = [
  {
    id: 'nino2023', titulo: 'The 2023 coastal El Niño', desc: 'The Peruvian sea warmed and phytoplankton collapsed.',
    variable: 'temperatura_superficial_C', zona: CN,
    mes: (m) => m.mesExtremo(CN, sst(), 2023, 1),
    nota(m, i) {
      const a = m.anomaliaTxt(CN, sst(), i), c = m.anomaliaTxt(CN, chl(), i)
      return `In ${etiquetaMes(m.mes(i))}, the sea off Chimbote was ${a ? a.frase : 'warmer'}. ${c ? `Its phytoplankton: ${c.frase}.` : ''} That year, the first anchoveta fishing season was cancelled. Press play to see the heat advance.`
    },
  },
  {
    id: 'record2013', titulo: '2004, Chimbote’s greenest year', desc: 'The highest annual chlorophyll in the Chimbote series.',
    variable: 'clorofila_mg_m3', zona: CN,
    mes: (m) => m.mesExtremo(CN, chl(), 2004, 1),
    nota(m, i) {
      const a = m.anomaliaTxt(CN, chl(), i)
      return `2004 has the highest annual chlorophyll in the Chimbote series. In ${etiquetaMes(m.mes(i))} there was ${a ? a.frase : 'a lot of phytoplankton'}. Compare the monthly values and test the full record in Trends.`
    },
  },
  {
    id: 'antartida2023', titulo: 'Antarctica in 2023', desc: 'Record-low ice and high phytoplankton, the opposite of Peru.',
    variable: 'clorofila_mg_m3', zona: RJ,
    mes: (m) => m.mesExtremo(RJ, chl(), 2023, 1),
    nota(m, i) {
      const a = m.anomaliaTxt(RJ, chl(), i)
      const h = m.anual.find((j) => j.anio === 2023)?.hielo
      return `In ${etiquetaMes(m.mes(i))}, the sea around King George had ${a ? a.frase : 'a lot of phytoplankton'}. Antarctic sea ice averaged ${h != null ? nf(1).format(Math.abs(h)) : '1.8'} million km² below normal, the lowest on record. Meanwhile, El Niño was doing the opposite off Peru.`
    },
  },
  {
    id: 'nitrato', titulo: 'High nitrate, low phytoplankton', desc: 'Why the nutrient-rich Antarctic sea is not greener.',
    variable: 'clorofila_mg_m3', zona: RJ,
    mes: (m) => m.idxMes(2023, 0),
    nota: () => 'Look at the nutrient bars below: there is several times more nitrate here than off Peru. Yet there is less phytoplankton because iron and winter light are scarce. Compare it by tapping Chimbote on the globe.',
  },
]
