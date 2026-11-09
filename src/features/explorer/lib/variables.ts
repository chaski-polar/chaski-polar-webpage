/* Datos que se pueden mostrar sobre el globo */
import type { CampoMonitor, ClaveCapa } from "./tipos";

interface Comun {
  /** nombre corto para el enlace (#dato=...) */
  clave: string;
  nombre: string;
  corto: string;
  unidad: string;
  dec: number;
  escala: "rampa" | "diverge";
  /** capa del mapa del satélite que la acompaña, si existe */
  mapa?: ClaveCapa;
  /** multiplica el valor guardado para mostrarlo (por ejemplo, metros a centímetros) */
  factor?: number;
  que: string;
  fuente: string;
}

/** Serie por zona: "log" compara con el mes normal en proporción, "dif" en diferencia y "directo" ya es una anomalía */
export interface VariableZona extends Comun {
  modo: "log" | "dif" | "directo";
  /** nombre de la serie en series.json */
  id: string;
  /** cuánto se aleja de lo normal para llegar al color más intenso */
  rango: number;
}

/** Serie regional del monitor de condiciones (costa del Perú), con escenarios de El Niño al final */
export interface VariableMonitor extends Comun {
  modo: "monitor";
  id: string;
  campo: CampoMonitor;
}

/** Índice de la Antártida (extensión del hielo marino) */
export interface VariableIndice extends Comun {
  modo: "indice";
  id: string;
  rango: number;
}

export type Variable = VariableZona | VariableMonitor | VariableIndice;

export const VARIABLES: readonly Variable[] = [
  { id: "clorofila_mg_m3", clave: "clorofila", nombre: "Fitoplancton (clorofila-a)", corto: "fitoplancton", unidad: "mg/m³", dec: 2, modo: "log", rango: 1.2, escala: "rampa", mapa: "clorofila",
    que: "Los satélites miden el color del mar: más verde quiere decir más clorofila, o sea más fitoplancton, la base de la cadena alimenticia.",
    fuente: "Clorofila-a de ESA Ocean Colour CCI v6, que mezcla varios satélites, entre ellos SeaWiFS y MODIS-Aqua de la NASA. Mediana mensual de la zona." },
  { id: "temperatura_superficial_C", clave: "temperatura", nombre: "Temperatura del mar", corto: "temperatura del mar", unidad: "°C", dec: 1, modo: "dif", rango: 3, escala: "diverge", mapa: "temperatura",
    que: "El agua fría frente al Perú viene de abajo, cargada de nutrientes. Cuando se calienta, como en El Niño, el mar se vuelve menos productivo.",
    fuente: "Temperatura superficial de NOAA Coral Reef Watch v3.1." },
  { id: "turbidez_kd490_m-1", clave: "turbidez", nombre: "Turbidez del agua (Kd490)", corto: "turbidez", unidad: "m⁻¹", dec: 3, modo: "log", rango: 0.8, escala: "diverge",
    que: "Mide qué tan rápido se apaga la luz al bajar. Agua más turbia quiere decir más partículas o más plancton.",
    fuente: "Kd490 de ESA OC-CCI v6." },
  { id: "viento", clave: "viento", nombre: "Viento sobre el mar", corto: "viento", unidad: "m/s", dec: 1, modo: "dif", rango: 1.5, escala: "diverge",
    que: "Frente al Perú, el viento empuja el agua de la superficie mar adentro y hace subir agua profunda fría con nutrientes: el afloramiento.",
    fuente: "Velocidad del viento CCMP v2 (1993 a diciembre de 2018)." },
  { id: "salinidad_psu", clave: "salinidad", nombre: "Salinidad", corto: "salinidad", unidad: "PSU", dec: 2, modo: "dif", rango: 0.35, escala: "diverge",
    que: "Qué tan salada está el agua. Cambia con las lluvias, los ríos, el hielo que se derrite y la llegada de otras masas de agua.",
    fuente: "Salinidad superficial del satélite SMOS (desde 2010)." },
  { id: "nivel_mar_anomalia_m", clave: "nivel", nombre: "Nivel del mar", corto: "nivel del mar", unidad: "cm", dec: 1, modo: "directo", rango: 0.12, escala: "diverge", factor: 100,
    que: "Cuántos centímetros está el mar por encima o por debajo de lo normal. Frente al Perú sube cuando llega El Niño.",
    fuente: "Anomalía del nivel del mar de NOAA/NESDIS (2012–2018)." },
  { id: "hielo", clave: "hielo", nombre: "Hielo marino antártico", corto: "hielo marino", unidad: "millones de km²", dec: 2, modo: "indice", rango: 1.5, escala: "diverge",
    que: "Extensión del hielo que rodea la Antártida. Bajo ese hielo vive el krill, la base de la cadena antártica. Es un dato de todo el continente: se ve en las dos zonas antárticas.",
    fuente: "Extensión mensual del hielo marino antártico, NSIDC Sea Ice Index G02135." },
  { id: "monitor_chlorophyll", clave: "monitor-chlorophyll", mapa: "monitor-clorofila", nombre: "Monitor · clorofila-a", corto: "clorofila del monitor", unidad: "mg/m³", dec: 2, modo: "monitor", campo: "chlorophyll_a_mg_m3", escala: "rampa",
    que: "Lectura mensual de la costa peruana en el monitor de condiciones: clorofila-a de OC-CCI y CMEMS. Los últimos meses son escenarios de El Niño, no observaciones.",
    fuente: "Monitor de condiciones: OC-CCI y reanálisis CMEMS; escenarios de El Niño hasta febrero de 2027." },
  { id: "monitor_sst", clave: "monitor-sst", nombre: "Monitor · temperatura superficial", corto: "temperatura del monitor", unidad: "°C", dec: 1, modo: "monitor", campo: "sst_c", escala: "diverge",
    que: "Temperatura superficial mensual de la costa peruana en el monitor de condiciones. Los últimos meses son escenarios de El Niño, no observaciones.",
    fuente: "Monitor de condiciones: reanálisis CMEMS; escenarios de El Niño hasta febrero de 2027." },
  { id: "monitor_biomass", clave: "monitor-biomass", nombre: "Monitor · biomasa de anchoveta", corto: "biomasa interpolada", unidad: "t", dec: 0, modo: "monitor", campo: "biomass_total_t_interpolated", escala: "diverge",
    que: "Biomasa de anchoveta del monitor de condiciones. La línea usa interpolación solo para visualizar el tramo entre cruceros; los puntos observados permanecen identificables.",
    fuente: "Monitor de condiciones: intervalos de cruceros IMARPE; interpolación lineal para visualización." },
];

export const variablePorId = (id: string): Variable => VARIABLES.find((v) => v.id === id) ?? (VARIABLES[0] as Variable);
export const esRegional = (v: Variable): boolean => v.modo === "monitor" || v.modo === "indice";
