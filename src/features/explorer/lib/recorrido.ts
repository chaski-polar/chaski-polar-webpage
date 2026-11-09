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
    titulo: 'El mar más verde del Pacífico sur',
    preparar: (m) => ({ variable: 'clorofila_mg_m3', mes: m.mesExtremo(CN, chl(), m.anioMasVerde(CN), 1), pov: { lat: -13, lng: -86, altitude: 1.1 } }),
    texto(m, mapa, i) {
      const v = m.valorSerie(CN, 'clorofila_mg_m3', i)
      const lejos = mapa.valorEn('clorofila', -9.25, -89.75, i)
      const veces = v && lejos ? v / lejos : null
      return {
        parrafos: [
          'Mira la franja amarilla y verde pegada a la costa del Perú: es **fitoplancton**, visto por satélites que miden el color del mar. Mar adentro el agua es morada: tiene muy poco fitoplancton.',
          `Es ${mesLargo(m.mes(i))}, el mes más verde de ${m.anioMasVerde(CN)} frente a Chimbote según la serie cargada. Pasa el cursor sobre el mapa para leer cada punto.`,
        ],
        dato: v ? { valor: `${nf(1).format(v)} mg/m³`, texto: `de clorofila frente a Chimbote${veces && lejos ? `: unas ${nf(0).format(veces)} veces más que a 1 200 km mar adentro (${nf(2).format(lejos)} mg/m³)` : ''}.` } : undefined,
      }
    },
  },
  {
    titulo: 'El motor: viento y agua fría que sube',
    corriente: 'humboldt',
    preparar: () => ({ pov: { lat: -20, lng: -82, altitude: 1.45 } }),
    texto(m, mapa, i) {
      const mes = m.mes(i).mes
      const costa = mapa.climaEn(-12.5, -77.5, mes), afuera = mapa.climaEn(-12.5, -88.5, mes)
      return {
        parrafos: ['La **corriente de Humboldt**, la línea animada, trae agua fría desde el sur. El viento empuja el agua de la superficie mar adentro y desde abajo sube agua fría cargada de nitrato y fosfato: el **afloramiento**. Con esos nutrientes y el sol de todo el año, el fitoplancton crece.'],
        dato: costa != null && afuera != null
          ? { valor: `${nf(1).format(afuera - costa)} °C más fría`, texto: `es el agua junto a Callao que a 1 200 km mar adentro, en un ${MESES_LARGOS[mes]} promedio de 1998–2020 (${nf(1).format(costa)} °C frente a ${nf(1).format(afuera)} °C).` }
          : undefined,
      }
    },
  },
  {
    titulo: 'Llega El Niño',
    preparar: (m) => ({ variable: 'temperatura_superficial_C', mes: mesNino2023(m), pov: { lat: -10, lng: -86, altitude: 1.25 } }),
    texto(m, _mapa, i) {
      const n = m.nino[i], a = m.anomaliaTxt(CN, sst(), i)
      return {
        parrafos: [
          `En ${mesLargo(m.mes(i))} el agua frente al norte del Perú se calentó. En el globo, el naranja muestra dónde el mar estuvo más cálido que lo normal para ese mes. El agua cálida forma una tapa en la superficie y el agua fría con nutrientes ya no llega arriba.`,
          'Debajo del globo, en la línea de tiempo, las marcas naranjas señalan cada vez que pasó lo mismo.',
        ],
        dato: n != null ? { valor: `${signo(n)}${nf(1).format(Math.abs(n))} °C`, texto: `sobre lo normal en la región Niño 1+2 (índice de NOAA)${a ? `; frente a Chimbote, ${a.frase}` : ''}.` } : undefined,
      }
    },
  },
  {
    titulo: 'El fitoplancton se apaga y la pesca cae',
    preparar: (m) => ({ variable: 'clorofila_mg_m3', mes: mesNino2023(m), pov: { lat: -10, lng: -84, altitude: 1.05 } }),
    texto(m, _mapa, i) {
      const a = m.anomaliaTxt(CN, chl(), i)
      const anio = m.mes(i).anio, anterior = anio - 1
      const p0 = m.pescaAnio(anterior), p1 = m.pescaAnio(anio)
      const caida = p0 && p1 ? (1 - p1 / p0) * 100 : null
      const biomasa = m.mediaMonitorAnio('biomass_total_t_interpolated', anio)
      const ultima = m.ultimoMonitor('biomass_total_t_interpolated')
      const monitor = biomasa != null
        ? `En el monitor, la biomasa interpolada media de ${anio} fue de ${nf(1).format(biomasa / 1e6)} millones de toneladas; es una reconstrucción para visualizar entre cruceros, no una observación mensual.`
        : `El monitor de biomasa no tiene cobertura interpolada para ${anio}; su último valor disponible es ${ultima?.biomass_total_t_interpolated != null ? `${nf(1).format(ultima.biomass_total_t_interpolated / 1e6)} millones de toneladas en ${ultima.date.slice(0, 7)}` : 'sin dato'}.`
      return {
        parrafos: [
          `El mismo mes, ahora con el fitoplancton${a ? `: frente a Chimbote hubo ${a.frase}` : ''}. Menos fitoplancton puede significar menos alimento disponible para el zooplancton y la anchoveta, pero esta página muestra una asociación, no una causa demostrada.`,
          ...(caida != null && p0 && p1 ? [`En ${anio}, el Perú pescó ${nf(1).format(p1 / 1e6)} millones de toneladas de anchoveta, frente a ${nf(1).format(p0 / 1e6)} millones en ${anterior} (FAO).`] : []),
          monitor,
        ],
        dato: caida != null
          ? { valor: `${nf(0).format(Math.abs(caida))} % ${caida >= 0 ? 'menos' : 'más'}`, texto: `cambio de anchoveta pescada entre ${anterior} y ${anio}. La pesca también depende de las cuotas: no mide directamente cuántos peces hay.` }
          : { valor: 'sin comparación', texto: 'FAO no tiene dos años consecutivos disponibles para este paso.' },
      }
    },
  },
  {
    titulo: 'Mientras tanto, en la Antártida',
    preparar: (m) => ({ variable: 'clorofila_mg_m3', mes: m.mesExtremo(RJ, chl(), 2023, 1), pov: { lat: -55, lng: -62, altitude: 1.15 } }),
    texto(m, _mapa, i) {
      const a = m.anomaliaTxt(RJ, chl(), i), min = m.hieloMinimo()
      return {
        parrafos: [
          `A unos 6 000 km al sur, junto a la Base Machu Picchu, el mar de la isla Rey Jorge tuvo mucho fitoplancton en ${mesLargo(m.mes(i))}${a ? ` (${a.frase})` : ''}.`,
          `En la serie cargada, ${min?.anio ?? '—'} fue el año con menor anomalía media de hielo marino antártico. Bajo ese hielo vive el krill, la base de la cadena antártica.`,
        ],
        dato: min?.hielo != null ? { valor: `${nf(1).format(Math.abs(min.hielo))} millones de km²`, texto: `por debajo de lo normal en ${min.anio}, según la serie NSIDC cargada.` } : undefined,
      }
    },
  },
  {
    titulo: '¿Hay un hilo que los une?',
    arcos: RJ,
    preparar: () => ({ variable: 'clorofila_mg_m3', pov: { lat: -38, lng: -72, altitude: 2.35 } }),
    texto(m) {
      const J = m.anual
      const r = pearson(J.map((j) => j.chl_rj), J.map((j) => j.chl_cn))
      return {
        parrafos: [
          'El agua antártica sí viaja al norte: la corriente circumpolar alimenta a la de Humboldt. Pero tarda meses o años y en el camino se mezcla. Las líneas del globo muestran cuánto se parecen, mes a mes, el fitoplancton de Rey Jorge y el de cada zona del Perú.',
          'La pregunta queda abierta: ¿el vínculo aparece con retraso, a través de los nutrientes o del viento? Para eso sirven estos datos.',
        ],
        dato: r != null ? { valor: `r = ${fmtR(r)}`, texto: `entre el fitoplancton anual de Rey Jorge y el de Chimbote (${J[0]?.anio ?? '—'}–${J.at(-1)?.anio ?? '—'}): relación en el mismo año.` } : undefined,
      }
    },
  },
]
