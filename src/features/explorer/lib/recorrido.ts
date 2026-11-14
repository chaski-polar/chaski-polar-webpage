/* Recorrido guiado "Del hielo a la anchoveta": 6 pasos con datos reales.
   Los textos marcan con **asteriscos** lo que va en negrita. */
import { pearson } from '../../../lib/estadistica'
import { MESES_LARGOS, fmtR, mesLargo, nf, signo } from '../../../lib/formato'
import type { IdCorriente, Pov } from './estado'
import type { MapaSatelital } from './mapa'
import { ZONA_CHIMBOTE, ZONA_REY_JORGE, type Modelo } from './modelo'
import type { IdZona } from './tipos'
import { variablePorId } from './variables'

export interface PreparacionPaso {
  variable?: string
  /** mes al que salta el paso (null = se queda en el actual) */
  mes?: number | null
  pov: Pov
}

export interface TextoPaso {
  parrafos: string[]
  dato?: { valor: string; texto: string }
}

export interface Paso {
  titulo: string
  /** corriente que se resalta en el globo */
  corriente?: IdCorriente
  /** zona desde la que se dibujan las conexiones */
  arcos?: IdZona
  preparar(m: Modelo): PreparacionPaso
  texto(m: Modelo, mapa: MapaSatelital, iMes: number): TextoPaso
}

const CN = ZONA_CHIMBOTE, RJ = ZONA_REY_JORGE
const chl = () => variablePorId('clorofila_mg_m3')
const sst = () => variablePorId('temperatura_superficial_C')
const mesNino2023 = (m: Modelo): number => m.eventosNino().find((e) => e.anio === 2023)?.i ?? m.idxMes(2023, 2)

export const RECORRIDO: readonly Paso[] = [
  {
    titulo: 'A productive sea in the South Pacific',
    preparar: (m) => ({ variable: 'clorofila_mg_m3', mes: m.mesExtremo(CN, chl(), m.anioMasVerde(CN), 1), pov: { lat: -13, lng: -86, altitude: 1.1 } }),
    texto(m, mapa, i) {
      const v = m.valorSerie(CN, 'clorofila_mg_m3', i)
      const lejos = mapa.valorEn('clorofila', -9.25, -89.75, i)
      const veces = v && lejos ? v / lejos : null
      return {
        parrafos: [
          'The yellow-green band along Peru’s coast is **phytoplankton**, observed by satellites measuring ocean color. Purple offshore water has much less phytoplankton.',
          `This is ${mesLargo(m.mes(i))}, the greenest month of ${m.anioMasVerde(CN)} off Chimbote in the loaded record. Hover over the map to read a point.`,
        ],
        dato: v ? { valor: `${nf(1).format(v)} mg/m³`, texto: `chlorophyll off Chimbote${veces && lejos ? `: about ${nf(0).format(veces)} times the value 1,200 km offshore (${nf(2).format(lejos)} mg/m³)` : ''}.` } : undefined,
      }
    },
  },
  {
    titulo: 'Wind and rising cold water',
    corriente: 'humboldt',
    preparar: () => ({ pov: { lat: -20, lng: -82, altitude: 1.45 } }),
    texto(m, mapa, i) {
      const mes = m.mes(i).mes
      const costa = mapa.climaEn(-12.5, -77.5, mes), afuera = mapa.climaEn(-12.5, -88.5, mes)
      return {
        parrafos: ['The **Humboldt Current**, shown by the animated line, carries cold water from the south. Wind pushes surface water offshore and cold water rich in nitrate and phosphate rises from below: **upwelling**. These nutrients and year-round sunlight support phytoplankton.'],
        dato: costa != null && afuera != null
          ? { valor: `${nf(1).format(afuera - costa)} °C colder`, texto: `is the water off Callao compared with water 1,200 km offshore, for an average ${MESES_LARGOS[mes]} over 1998–2020 (${nf(1).format(costa)} °C versus ${nf(1).format(afuera)} °C).` }
          : undefined,
      }
    },
  },
  {
    titulo: 'El Niño arrives',
    preparar: (m) => ({ variable: 'temperatura_superficial_C', mes: mesNino2023(m), pov: { lat: -10, lng: -86, altitude: 1.25 } }),
    texto(m, _mapa, i) {
      const n = m.nino[i], a = m.anomaliaTxt(CN, sst(), i)
      return {
        parrafos: [
          `In ${mesLargo(m.mes(i))}, water off northern Peru warmed. Orange on the globe shows water warmer than normal for that month. The warm surface layer reduces the supply of cold, nutrient-rich water.`,
          'Orange marks on the timeline indicate other El Niño events.',
        ],
        dato: n != null ? { valor: `${signo(n)}${nf(1).format(Math.abs(n))} °C`, texto: `above normal in the Niño 1+2 region (NOAA index)${a ? `; off Chimbote, ${a.frase}` : ''}.` } : undefined,
      }
    },
  },
  {
    titulo: 'Phytoplankton and fisheries during warming',
    preparar: (m) => ({ variable: 'clorofila_mg_m3', mes: mesNino2023(m), pov: { lat: -10, lng: -84, altitude: 1.05 } }),
    texto(m, _mapa, i) {
      const a = m.anomaliaTxt(CN, chl(), i)
      const anio = m.mes(i).anio, anterior = anio - 1
      const p0 = m.pescaAnio(anterior), p1 = m.pescaAnio(anio)
      const caida = p0 && p1 ? (1 - p1 / p0) * 100 : null
      const biomasa = m.mediaMonitorAnio('biomass_total_t_interpolated', anio)
      const ultima = m.ultimoMonitor('biomass_total_t_interpolated')
      const monitor = biomasa != null
        ? `The monitor’s mean interpolated biomass for ${anio} is ${nf(1).format(biomasa / 1e6)} million tonnes: a reconstruction between surveys, not a monthly observation.`
        : `No interpolated biomass is available for ${anio}; the latest available value is ${ultima?.biomass_total_t_interpolated != null ? `${nf(1).format(ultima.biomass_total_t_interpolated / 1e6)} million tonnes in ${ultima.date.slice(0, 7)}` : 'Not available'}.`
      return {
        parrafos: [
          `The same month, now showing phytoplankton${a ? `: off Chimbote there was ${a.frase}` : ''}. Less phytoplankton may mean less food for zooplankton and anchoveta, but this page shows an association, not a demonstrated cause.`,
          ...(caida != null && p0 && p1 ? [`In ${anio}, Peru caught ${nf(1).format(p1 / 1e6)} million tonnes of anchoveta, versus ${nf(1).format(p0 / 1e6)} million in ${anterior} (FAO).`] : []),
          monitor,
        ],
        dato: caida != null
          ? { valor: `${nf(0).format(Math.abs(caida))} % ${caida >= 0 ? 'less' : 'more'}`, texto: `change in anchoveta catch between ${anterior} and ${anio}. Fisheries also depend on quotas: catches do not directly measure how many fish are present.` }
          : { valor: 'No comparison', texto: 'FAO has no consecutive years available for this step.' },
      }
    },
  },
  {
    titulo: 'Meanwhile, in Antarctica',
    preparar: (m) => ({ variable: 'clorofila_mg_m3', mes: m.mesExtremo(RJ, chl(), 2023, 1), pov: { lat: -55, lng: -62, altitude: 1.15 } }),
    texto(m, _mapa, i) {
      const a = m.anomaliaTxt(RJ, chl(), i), min = m.hieloMinimo()
      return {
        parrafos: [
          `About 6,000 km south, near Machu Picchu Base, the sea around King George Island had abundant phytoplankton in ${mesLargo(m.mes(i))}${a ? ` (${a.frase})` : ''}.`,
          `In this record, ${min?.anio ?? '—'} had the lowest mean Antarctic sea-ice anomaly. Krill, the base of the Antarctic food web, lives beneath that ice.`,
        ],
        dato: min?.hielo != null ? { valor: `${nf(1).format(Math.abs(min.hielo))} million km²`, texto: `below normal in ${min.anio}, according to the loaded NSIDC series.` } : undefined,
      }
    },
  },
  {
    titulo: 'Is there a robust connection?',
    arcos: RJ,
    preparar: () => ({ variable: 'clorofila_mg_m3', pov: { lat: -38, lng: -72, altitude: 2.35 } }),
    texto(m) {
      const J = m.anual
      const r = pearson(J.map((j) => j.chl_rj), J.map((j) => j.chl_cn))
      return {
        parrafos: [
          'Southern waters feed the Humboldt system, but transport and mixing take time. The globe’s lines show exploratory similarities between King George Island and each Peruvian zone.',
          'More than 1,100 tests found no robust Southern Ocean–Peru relationship after controlling for El Niño and multiple testing. The apparent 3–4-year lag reflected the El Niño cycle.',
        ],
        dato: r != null ? { valor: `r = ${fmtR(r)}`, texto: `between annual phytoplankton at King George Island and Chimbote (${J[0]?.anio ?? '—'}–${J.at(-1)?.anio ?? '—'}): same-year association.` } : undefined,
      }
    },
  },
]
