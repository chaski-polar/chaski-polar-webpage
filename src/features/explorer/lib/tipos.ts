/* Forma de los archivos de public/datos */

/** Serie mensual con huecos */
export type Serie = (number | null)[];

export type IdZona =
  | "peru_norte_paita_sechura"
  | "peru_centro_norte_chimbote"
  | "peru_centro_callao"
  | "peru_sur_pisco"
  | "peru_sur_ilo"
  | "antartida_rey_jorge"
  | "antartida_peninsula";

export interface Zona {
  nombre: string;
  region: string;
  lat: number;
  lon: number;
  /** [lat sur, lat norte, lon oeste, lon este] */
  caja?: [number, number, number, number];
}

export type Nutriente = "nitrato" | "fosfato" | "silicato";

/** Resumen anual que usan los hallazgos (anomalías y totales por año) */
export interface FilaAnual {
  anio: number;
  hielo: number | null;
  sam: number | null;
  chl_rj: number | null;
  tsm_rj: number | null;
  nino12: number | null;
  tsm_cn: number | null;
  chl_cn: number | null;
  anchoveta: number | null;
  concha: number | null;
}

export type Especie = "anchoveta_peru" | "anchoveta_chile" | "concha_peru" | "jurel_peru" | "jurel_chile" | "pota_peru" | "sardina_peru" | "krill_mundo";

/** series.json: series mensuales por zona, índices climáticos, nutrientes, aire (NASA POWER) y pesca (FAO) */
export interface DatosSeries {
  meses_inicio: string;
  zonas: Record<IdZona, Zona>;
  series: Record<IdZona, Record<string, Serie>>;
  nutrientes: Partial<Record<IdZona, Partial<Record<Nutriente, number[]>>>>;
  indices: { inicio: string; nino12: Serie; sam: Serie; hielo: Serie; hielo_anom: Serie };
  power: { inicio: string; sitios: Record<string, Record<string, Serie>> };
  pesca: { inicio: number } & Record<Especie, Serie>;
  juego: FilaAnual[];
}

/** Variables mensuales del monitor de condiciones (región costera del Perú) */
export type CampoMonitor =
  | "sst_c"
  | "sss_psu"
  | "chlorophyll_a_mg_m3"
  | "nitrate_mmol_m3"
  | "phosphate_mmol_m3"
  | "oxygen_ml_l"
  | "phytoplankton_carbon_mg_c_m3"
  | "nino12_anom_c"
  | "icen"
  | "biomass_total_t"
  | "biomass_total_t_interpolated";

/** Zonas con series propias en el monitor (clave corta del archivo de datos) */
export type ClaveZonaMonitor = "paita" | "chimbote" | "callao" | "pisco" | "ilo" | "peninsula_antartica" | "rey_jorge";

/** Clorofila y temperatura de cada zona, con su anomalía ya calculada frente al mismo mes de 1998–2025 */
export type CampoZonaMonitor =
  | `chl_${ClaveZonaMonitor}_mg_m3`
  | `chl_${ClaveZonaMonitor}_anom_pct`
  | `sst_${ClaveZonaMonitor}_c`
  | `sst_${ClaveZonaMonitor}_anom_c`;

/** Índices climáticos mensuales del monitor */
export type CampoIndiceMonitor = "nino12_psl_c" | "oni_c" | "sam_index" | "sea_ice_antarctic_mkm2" | "sea_ice_antarctic_anom_mkm2";

export type CampoSerieMonitor = CampoMonitor | CampoZonaMonitor | CampoIndiceMonitor;

export type RegistroMonitor = Record<CampoSerieMonitor, number | null> & {
  /** "AAAA-MM-01" */
  date: string;
  biomass_observed: boolean;
};

/** Cambio de clorofila en cada zona del Perú durante un El Niño */
export interface EventoNinoZonas {
  nombre: string;
  cambio_clorofila_pct: Partial<Record<ClaveZonaMonitor, number>> | null;
  nota?: string;
}

/** Resultado por zona de la asimetría: cuánto cambia la clorofila por cada grado más cálido o más frío */
export interface AsimetriaZona {
  pct_por_grado_calido: number;
  pct_por_grado_frio: number;
  p_asimetria: number;
}

export interface HallazgoDatos {
  id: string;
  estado: string;
  titulo: string;
  resumen?: string;
  resultados?: Partial<Record<ClaveZonaMonitor, AsimetriaZona>>;
}

export interface ZonaMonitor {
  nombre: string;
  id_original: IdZona;
  lat: number;
  lon: number;
}

export interface MetadataMonitor {
  zonas?: Partial<Record<ClaveZonaMonitor, ZonaMonitor>>;
  eventos_nino?: EventoNinoZonas[];
  hallazgos?: HallazgoDatos[];
}

export interface DatosMonitor {
  period: { start: string; end: string };
  records: RegistroMonitor[];
  metadata?: MetadataMonitor;
}

/** Escenarios de El Niño: no son observaciones */
export type NombreEscenario = "weak" | "central" | "intense";
export type CampoEscenario = Exclude<CampoMonitor, "biomass_total_t" | "biomass_total_t_interpolated">;

export type FilaEscenario = Record<CampoEscenario, number | null> & {
  /** "AAAA-MM" */
  fecha: string;
  escenario: NombreEscenario;
};

export interface DatosEscenarios {
  periodo: { inicio: string; fin: string };
  ultimo_observado: string;
  multiplicadores: Record<NombreEscenario, number>;
  avisos: string[];
  filas: FilaEscenario[];
}

/** Grilla mensual comprimida de un mapa del satélite */
export interface GrillaMapa {
  celda: number;
  filas: number;
  cols: number;
  /** bits en base64: 1 = la celda tiene datos */
  mascara: string;
  /** valores de 1 byte por celda y mes, gzip + base64 */
  datos: string;
  /** clorofila: escala logarítmica del valor guardado */
  log0?: number;
  log1?: number;
  /** temperatura: grados por paso del valor guardado */
  paso?: number;
  /** temperatura media de cada mes calendario, gzip + base64 */
  clima?: string;
  tipo?: string;
}

export type ClaveCapa = "clorofila" | "temperatura";

export interface ArchivoMapas {
  inicio: string;
  meses: number;
  lat_n: number;
  lon_o: number;
  capas: Partial<Record<ClaveCapa, GrillaMapa>>;
}
