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
    id: 'nino2023', titulo: 'El Niño costero de 2023', desc: 'El mar peruano se calentó y el fitoplancton se desplomó.',
    variable: 'temperatura_superficial_C', zona: CN,
    mes: (m) => m.mesExtremo(CN, sst(), 2023, 1),
    nota(m, i) {
      const a = m.anomaliaTxt(CN, sst(), i), c = m.anomaliaTxt(CN, chl(), i)
      return `En ${etiquetaMes(m.mes(i))} el mar frente a Chimbote estaba ${a ? a.frase : 'más cálido'}. ${c ? `Su fitoplancton: ${c.frase}.` : ''} Ese año se canceló la primera temporada de pesca de anchoveta. Prueba el botón de reproducir para ver cómo avanza el calor.`
    },
  },
  {
    id: 'record2013', titulo: '2013, un mar muy productivo', desc: 'El año con más fitoplancton frente al Perú en 27 años.',
    variable: 'clorofila_mg_m3', zona: CN,
    mes: (m) => m.mesExtremo(CN, chl(), 2013, 1),
    nota(m, i) {
      const a = m.anomaliaTxt(CN, chl(), i)
      return `Fue el año con más fitoplancton frente al centro-norte del Perú en 27 años. En ${etiquetaMes(m.mes(i))} había ${a ? a.frase : 'mucho fitoplancton'}. El agua estuvo fría y la cosecha de concha de abanico llegó a su máximo.`
    },
  },
  {
    id: 'antartida2023', titulo: 'La Antártida en 2023', desc: 'Récord de poco hielo y mucho fitoplancton, al revés que en el Perú.',
    variable: 'clorofila_mg_m3', zona: RJ,
    mes: (m) => m.mesExtremo(RJ, chl(), 2023, 1),
    nota(m, i) {
      const a = m.anomaliaTxt(RJ, chl(), i)
      const h = m.anual.find((j) => j.anio === 2023)?.hielo
      return `En ${etiquetaMes(m.mes(i))} el mar de Rey Jorge tenía ${a ? a.frase : 'mucho fitoplancton'}. El hielo marino antártico quedó, en promedio, ${h != null ? nf(1).format(Math.abs(h)) : '1,8'} millones de km² por debajo de lo normal, el más bajo registrado. Mientras tanto, frente al Perú, El Niño hacía lo contrario.`
    },
  },
  {
    id: 'nitrato', titulo: 'Mucho nitrato, poco fitoplancton', desc: 'Por qué el mar antártico, tan rico en nutrientes, no es más verde.',
    variable: 'clorofila_mg_m3', zona: RJ,
    mes: (m) => m.idxMes(2023, 0),
    nota: () => 'Mira las barras de nutrientes más abajo: aquí hay varias veces más nitrato que frente al Perú. Aun así hay menos fitoplancton, porque falta hierro y, en invierno, luz. Compáralo tocando Chimbote en el globo.',
  },
]
