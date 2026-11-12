/* Motor del mar: convierte los datos satelitales del monitor (clorofila y temperatura por zona, mes a mes,
   desde 1998) en el "alimento" que encuentra un personaje del juego.

   - Si hay clorofila observada ese mes, el alimento sale de ella: 1 = lo normal para ese mes del año.
   - Si falta la clorofila pero hay temperatura, se estima con la respuesta medida en el proyecto
     (cuánto cae el fitoplancton por cada grado de calor y cuánto cambia por cada grado de frío).
   - Si no hay nada, se asume un mes normal.

   La respuesta al calor y al frío se lee de metadata.hallazgos del monitor (resultado "asimetria"),
   así el juego usa las mismas cifras que muestra la página. */
import type { MonitorData, MonitorRecord } from "../../../data/types";

export const ZONAS_PERU = ["paita", "chimbote", "callao", "pisco", "ilo"] as const;
export const ZONAS_ANTARTIDA = ["peninsula_antartica", "rey_jorge"] as const;
export type ZonaMar = (typeof ZONAS_PERU)[number] | (typeof ZONAS_ANTARTIDA)[number];

export const NOMBRE_ZONA: Record<ZonaMar, string> = {
  paita: "Paita", chimbote: "Chimbote", callao: "Callao", pisco: "Pisco", ilo: "Ilo",
  peninsula_antartica: "Península Antártica", rey_jorge: "Isla Rey Jorge",
};

/** Cambio porcentual del fitoplancton por cada °C sobre lo normal (cálido) o bajo lo normal (frío) */
export interface Respuesta {
  calido: number;
  frio: number;
}

// Valores de respaldo: los mismos del análisis del proyecto, por si el archivo no los trae
const RESPUESTA_RESPALDO: Partial<Record<ZonaMar, Respuesta>> = {
  paita: { calido: -5.8, frio: 2.1 },
  chimbote: { calido: -25.3, frio: 3.5 },
  callao: { calido: -23.9, frio: 6.3 },
  pisco: { calido: -17.7, frio: -4.9 },
  ilo: { calido: -32.8, frio: 7.9 },
};

export type Origen = "observado" | "estimado" | "normal";

export interface EstadoMar {
  /** primer día del mes, AAAA-MM-DD */
  fecha: string;
  zona: ZonaMar;
  /** clorofila del mes (mg/m³), si se midió */
  clorofila: number | null;
  /** temperatura del mar frente a lo normal (°C) */
  anomaliaTemp: number | null;
  /** índice Niño 1+2 (°C frente a lo normal) */
  nino12: number | null;
  /** alimento disponible: 1 = lo normal de ese mes; 0,5 = la mitad */
  alimento: number;
  origen: Origen;
}

const ALIMENTO_MIN = 0.1;
const ALIMENTO_MAX = 3;
const num = (x: MonitorRecord[string]): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
const limitar = (x: number) => Math.min(ALIMENTO_MAX, Math.max(ALIMENTO_MIN, x));

/** Lee la respuesta al calor y al frío de metadata.hallazgos (resultado "asimetria") */
function leerRespuestas(monitor: MonitorData): Partial<Record<ZonaMar, Respuesta>> {
  const salida: Partial<Record<ZonaMar, Respuesta>> = { ...RESPUESTA_RESPALDO };
  const hallazgos = monitor.metadata?.hallazgos;
  if (!Array.isArray(hallazgos)) return salida;
  const asimetria = hallazgos.find((h): h is { resultados: Record<string, unknown> } =>
    typeof h === "object" && h !== null && (h as { id?: unknown }).id === "asimetria" && typeof (h as { resultados?: unknown }).resultados === "object");
  if (!asimetria) return salida;
  for (const zona of ZONAS_PERU) {
    const r = asimetria.resultados[zona] as { pct_por_grado_calido?: unknown; pct_por_grado_frio?: unknown } | undefined;
    if (typeof r?.pct_por_grado_calido === "number" && typeof r.pct_por_grado_frio === "number") {
      salida[zona] = { calido: r.pct_por_grado_calido, frio: r.pct_por_grado_frio };
    }
  }
  return salida;
}

export interface Mar {
  /** fechas disponibles (AAAA-MM-DD), una por mes */
  readonly fechas: readonly string[];
  /** posición del mes en la serie, o -1 si no existe (mes: 1 a 12) */
  indice(anio: number, mes: number): number;
  estado(zona: ZonaMar, i: number): EstadoMar;
  /** los 12 meses de un año (los que existan) */
  anio(zona: ZonaMar, anio: number): EstadoMar[];
  respuesta(zona: ZonaMar): Respuesta | null;
  /** alimento esperado con cierta anomalía de temperatura, según la respuesta medida */
  alimentoPorTemperatura(zona: ZonaMar, anomaliaTemp: number): number;
}

export function crearMar(monitor: MonitorData): Mar {
  const registros = monitor.records;
  const fechas = registros.map((r) => r.date);
  const posicion = new Map(fechas.map((f, i) => [f.slice(0, 7), i]));
  const respuestas = leerRespuestas(monitor);

  const alimentoPorTemperatura = (zona: ZonaMar, dT: number): number => {
    const r = respuestas[zona];
    if (!r) return 1;
    // efecto multiplicativo: cada grado aplica el mismo porcentaje sobre lo que queda
    const pct = dT >= 0 ? r.calido : r.frio;
    return limitar(Math.pow(1 + pct / 100, Math.abs(dT)));
  };

  const estado = (zona: ZonaMar, i: number): EstadoMar => {
    const reg = registros[i];
    if (!reg) throw new RangeError(`No hay datos para el mes ${i}`);
    const clorofila = num(reg[`chl_${zona}_mg_m3`]);
    const anomChl = num(reg[`chl_${zona}_anom_pct`]);
    const anomaliaTemp = num(reg[`sst_${zona}_anom_c`]);
    const nino12 = num(reg.nino12_psl_c) ?? num(reg.nino12_anom_c);
    let alimento = 1, origen: Origen = "normal";
    if (anomChl != null) { alimento = limitar(1 + anomChl / 100); origen = "observado"; }
    else if (anomaliaTemp != null && respuestas[zona]) { alimento = alimentoPorTemperatura(zona, anomaliaTemp); origen = "estimado"; }
    return { fecha: reg.date, zona, clorofila, anomaliaTemp, nino12, alimento, origen };
  };

  const indice = (anio: number, mes: number) => posicion.get(`${anio}-${String(mes).padStart(2, "0")}`) ?? -1;

  return {
    fechas,
    indice,
    estado,
    anio(zona, anio) {
      const meses: EstadoMar[] = [];
      for (let m = 1; m <= 12; m++) { const i = indice(anio, m); if (i >= 0) meses.push(estado(zona, i)); }
      return meses;
    },
    respuesta: (zona) => respuestas[zona] ?? null,
    alimentoPorTemperatura,
  };
}
