/* Datos que se pueden mostrar sobre el globo */
import type { ClaveCapa } from "./tipos";
import type { ExplorerSection } from "./estado";
import type { Nutriente } from "./tipos";

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

export interface VariableNutriente extends Comun {
  id: string;
  modo: "nutriente";
  nutriente: Nutriente;
  rango: number;
}

export interface VariableRegional extends Comun {
  id: string;
  modo: "regional";
  campo: "oxygen_ml_l";
  rango: number;
}

export type Variable = VariableZona | VariableIndice | VariableNutriente | VariableRegional;

export const VARIABLES: readonly Variable[] = [
  { id: "clorofila_mg_m3", clave: "chlorophyll", nombre: "Phytoplankton (chlorophyll-a)", corto: "phytoplankton", unidad: "mg/m³", dec: 2, modo: "log", rango: 1.2, escala: "rampa", mapa: "clorofila", periodo: "1998–2026", cobertura: "Peru and Antarctica", secciones: ["austral", "humboldt"],
    que: "Satellites measure sea color: greener water means more chlorophyll, or more phytoplankton, the base of the food web.",
    fuente: "Chlorophyll-a from ESA Ocean Colour CCI v6, combining several satellites including NASA SeaWiFS and MODIS-Aqua. Monthly zone median." },
  { id: "temperatura_superficial_C", clave: "temperature", nombre: "Sea surface temperature", corto: "sea temperature", unidad: "°C", dec: 1, modo: "dif", rango: 3, escala: "diverge", mapa: "temperatura", periodo: "1998–2026", cobertura: "Peru and Antarctica", secciones: ["austral", "humboldt"],
    que: "Cold water off Peru rises from below, carrying nutrients. When it warms, as during El Niño, the sea becomes less productive.",
    fuente: "Sea surface temperature from NOAA Coral Reef Watch v3.1." },
  { id: "turbidez_kd490_m-1", clave: "turbidity", nombre: "Water turbidity (Kd490)", corto: "turbidity", unidad: "m⁻¹", dec: 3, modo: "log", rango: 0.8, escala: "diverge", periodo: "1998–2026", cobertura: "Peru and Antarctica", secciones: [],
    que: "Measures how quickly light fades with depth. More turbid water means more particles or plankton.",
    fuente: "Kd490 de ESA OC-CCI v6." },
  { id: "viento", clave: "wind", nombre: "Wind over the sea", corto: "wind", unidad: "m/s", dec: 1, modo: "dif", rango: 1.5, escala: "diverge", periodo: "1998–2026 Peru; 1993–2018 Antarctica", cobertura: "Peru and Antarctica", secciones: ["humboldt"],
    que: "Off Peru, wind pushes surface water offshore and brings cold, nutrient-rich deep water up: upwelling.",
    fuente: "10 m wind over the sea: ERA5 (ECMWF/Copernicus) in Peruvian zones, 1998–2026, sea points only; CCMP v2 in Antarctica, through 2018." },
  { id: "salinidad_psu", clave: "salinity", nombre: "Salinity", corto: "salinity", unidad: "PSU", dec: 2, modo: "dif", rango: 0.35, escala: "diverge", periodo: "2010–2026", cobertura: "Peru and Antarctica", secciones: ["austral", "humboldt"],
    que: "How salty the water is. It changes with rainfall, rivers, melting ice and the arrival of other water masses.",
    fuente: "Surface salinity from the SMOS satellite (since 2010)." },
  { id: "nivel_mar_anomalia_m", clave: "sea level", nombre: "Sea level", corto: "sea level", unidad: "cm", dec: 1, modo: "directo", rango: 0.12, escala: "diverge", factor: 100, periodo: "2012–2018", cobertura: "Peru and Antarctica", secciones: ["humboldt"],
    que: "How many centimeters the sea is above or below normal. Off Peru it rises when El Niño arrives.",
    fuente: "NOAA/NESDIS sea level anomaly (2012–2018)." },
  { id: "hielo", clave: "ice", nombre: "Antarctic sea ice extent", corto: "sea ice", unidad: "million km²", dec: 2, modo: "indice", indice: "hielo", rango: 1.5, escala: "diverge", periodo: "1979–2026", cobertura: "Entire Antarctica", secciones: ["austral"],
    que: "The extent of ice surrounding Antarctica. Krill live beneath it and support the Antarctic food web. This is a continent-wide value shown in both Antarctic zones.",
    fuente: "Monthly Antarctic sea ice extent, NSIDC Sea Ice Index G02135." },
  { id: "sam", clave: "sam", nombre: "SAM/AAO index", corto: "SAM/AAO", unidad: "index", dec: 2, modo: "indice", indice: "sam", rango: 2, escala: "diverge", periodo: "1998–2026", cobertura: "Southern atmosphere; not a local measurement", secciones: ["austral"],
    que: "An atmospheric index summarizing variability across the southern latitudes. It does not by itself represent ocean transport.", fuente: "Monthly SAM/AAO index from NOAA PSL." },
  { id: "corriente_m_s", clave: "currents", nombre: "Ocean circulation", corto: "circulation", unidad: "m/s", dec: 2, modo: "directo", rango: 0.2, escala: "rampa", periodo: "1993–2018", cobertura: "Peru and Antarctica", secciones: ["austral"],
    que: "Surface speed calculated from the available east–west and north–south components.", fuente: "OSCAR surface current components (NASA/ESR)." },
  { id: "nitrato", clave: "nitrate", nombre: "Nitrate", corto: "nitrate", unidad: "µmol/kg", dec: 1, modo: "nutriente", nutriente: "nitrato", rango: 12, escala: "rampa", periodo: "1955–2022", cobertura: "Zones with World Ocean Atlas data", secciones: ["humboldt"],
    que: "Historical monthly nitrate climatology. It indicates nutrient availability, not a direct observation for the selected month.", fuente: "World Ocean Atlas 2023 (NOAA NCEI), historical monthly climatology." },
  { id: "fosfato", clave: "phosphate", nombre: "Phosphate", corto: "phosphate", unidad: "µmol/kg", dec: 1, modo: "nutriente", nutriente: "fosfato", rango: 2, escala: "rampa", periodo: "1955–2022", cobertura: "Zones with World Ocean Atlas data", secciones: ["humboldt"],
    que: "Historical monthly phosphate climatology. It indicates nutrient availability, not a direct observation for the selected month.", fuente: "World Ocean Atlas 2023 (NOAA NCEI), historical monthly climatology." },
  { id: "oxigeno_disuelto", clave: "dissolved oxygen", nombre: "Dissolved oxygen", corto: "dissolved oxygen", unidad: "ml/L", dec: 2, modo: "regional", campo: "oxygen_ml_l", rango: 10, escala: "rampa", periodo: "1998–2026", cobertura: "Peruvian coastal average; not zone-specific", secciones: ["humboldt"],
    que: "Regional monthly dissolved oxygen average for the Peruvian coast. The current dataset does not provide independent values for each zone.", fuente: "CMEMS environmental reanalysis, summarized in the regional monitor." },
];

export const variablePorId = (id: string): Variable => VARIABLES.find((v) => v.id === id) ?? (VARIABLES[0] as Variable);
export const esRegional = (v: Variable): boolean => v.modo === "indice" || v.modo === "regional";
export const variablesDeSeccion = (seccion: ExplorerSection): readonly Variable[] => VARIABLES.filter((v) => v.secciones.includes(seccion));
