/* Datos que se pueden mostrar sobre el globo */
import type { ClaveCapa } from "./tipos";
import type { ExplorerSection } from "./estado";

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
  periodo: string;
  cobertura: string;
  secciones: readonly ExplorerSection[];
}

/** Serie por zona: "log" compara con el mes normal en proporción, "dif" en diferencia y "directo" ya es una anomalía */
export interface VariableZona extends Comun {
  modo: "log" | "dif" | "directo";
  /** nombre de la serie en series.json */
  id: string;
  /** cuánto se aleja de lo normal para llegar al color más intenso */
  rango: number;
}

/** Índice de la Antártida (extensión del hielo marino) */
export interface VariableIndice extends Comun {
  modo: "indice";
  id: string;
  rango: number;
  indice: "hielo" | "sam";
}

export type Variable = VariableZona | VariableIndice;

export const VARIABLES: readonly Variable[] = [
  { id: "clorofila_mg_m3", clave: "clorofila", nombre: "Fitoplancton (clorofila-a)", corto: "fitoplancton", unidad: "mg/m³", dec: 2, modo: "log", rango: 1.2, escala: "rampa", mapa: "clorofila", periodo: "1998–2026", cobertura: "Perú y Antártida", secciones: ["austral", "humboldt"],
    que: "Los satélites miden el color del mar: más verde quiere decir más clorofila, o sea más fitoplancton, la base de la cadena alimenticia.",
    fuente: "Clorofila-a de ESA Ocean Colour CCI v6, que mezcla varios satélites, entre ellos SeaWiFS y MODIS-Aqua de la NASA. Mediana mensual de la zona." },
  { id: "temperatura_superficial_C", clave: "temperatura", nombre: "Temperatura superficial del mar", corto: "temperatura del mar", unidad: "°C", dec: 1, modo: "dif", rango: 3, escala: "diverge", mapa: "temperatura", periodo: "1998–2026", cobertura: "Perú y Antártida", secciones: ["austral", "humboldt"],
    que: "El agua fría frente al Perú viene de abajo, cargada de nutrientes. Cuando se calienta, como en El Niño, el mar se vuelve menos productivo.",
    fuente: "Temperatura superficial de NOAA Coral Reef Watch v3.1." },
  { id: "turbidez_kd490_m-1", clave: "turbidez", nombre: "Turbidez del agua (Kd490)", corto: "turbidez", unidad: "m⁻¹", dec: 3, modo: "log", rango: 0.8, escala: "diverge", periodo: "1998–2026", cobertura: "Perú y Antártida", secciones: [],
    que: "Mide qué tan rápido se apaga la luz al bajar. Agua más turbia quiere decir más partículas o más plancton.",
    fuente: "Kd490 de ESA OC-CCI v6." },
  { id: "viento", clave: "viento", nombre: "Viento sobre el mar", corto: "viento", unidad: "m/s", dec: 1, modo: "dif", rango: 1.5, escala: "diverge", periodo: "1998–2026 Perú; 1993–2018 Antártida", cobertura: "Perú y Antártida", secciones: ["humboldt"],
    que: "Frente al Perú, el viento empuja el agua de la superficie mar adentro y hace subir agua profunda fría con nutrientes: el afloramiento.",
    fuente: "Viento a 10 m sobre el mar: ERA5 (ECMWF/Copernicus) en las zonas del Perú, de 1998 a 2026, solo con los puntos de mar; CCMP v2 en la Antártida, hasta 2018." },
  { id: "salinidad_psu", clave: "salinidad", nombre: "Salinidad", corto: "salinidad", unidad: "PSU", dec: 2, modo: "dif", rango: 0.35, escala: "diverge", periodo: "2010–2026", cobertura: "Perú y Antártida", secciones: ["austral", "humboldt"],
    que: "Qué tan salada está el agua. Cambia con las lluvias, los ríos, el hielo que se derrite y la llegada de otras masas de agua.",
    fuente: "Salinidad superficial del satélite SMOS (desde 2010)." },
  { id: "nivel_mar_anomalia_m", clave: "nivel", nombre: "Nivel del mar", corto: "nivel del mar", unidad: "cm", dec: 1, modo: "directo", rango: 0.12, escala: "diverge", factor: 100, periodo: "2012–2018", cobertura: "Perú y Antártida", secciones: ["humboldt"],
    que: "Cuántos centímetros está el mar por encima o por debajo de lo normal. Frente al Perú sube cuando llega El Niño.",
    fuente: "Anomalía del nivel del mar de NOAA/NESDIS (2012–2018)." },
  { id: "hielo", clave: "hielo", nombre: "Extensión del hielo marino antártico", corto: "hielo marino", unidad: "millones de km²", dec: 2, modo: "indice", indice: "hielo", rango: 1.5, escala: "diverge", periodo: "1979–2026", cobertura: "Antártida completa", secciones: ["austral"],
    que: "Extensión del hielo que rodea la Antártida. Bajo ese hielo vive el krill, la base de la cadena antártica. Es un dato de todo el continente: se ve en las dos zonas antárticas.",
    fuente: "Extensión mensual del hielo marino antártico, NSIDC Sea Ice Index G02135." },
  { id: "sam", clave: "sam", nombre: "Índice SAM/AAO", corto: "SAM/AAO", unidad: "índice", dec: 2, modo: "indice", indice: "sam", rango: 2, escala: "diverge", periodo: "1998–2026", cobertura: "Atmósfera austral; no es una medición local", secciones: ["austral"],
    que: "Índice atmosférico que resume la variabilidad de las latitudes australes. No representa por sí solo transporte oceánico.", fuente: "Índice SAM/AAO mensual de NOAA PSL." },
  { id: "corriente_m_s", clave: "corriente", nombre: "Circulación oceánica", corto: "circulación", unidad: "m/s", dec: 2, modo: "directo", rango: 0.2, escala: "rampa", periodo: "1993–2018", cobertura: "Perú y Antártida", secciones: ["austral", "humboldt"],
    que: "Rapidez superficial calculada a partir de los componentes este–oeste y norte–sur disponibles.", fuente: "Componentes de corriente superficial OSCAR (NASA/ESR)." },
];

export const variablePorId = (id: string): Variable => VARIABLES.find((v) => v.id === id) ?? (VARIABLES[0] as Variable);
export const esRegional = (v: Variable): boolean => v.modo === "indice";
export const variablesDeSeccion = (seccion: ExplorerSection): readonly Variable[] => VARIABLES.filter((v) => v.secciones.includes(seccion));
