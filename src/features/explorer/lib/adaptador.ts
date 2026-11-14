/* Convierte los datos que carga DataContext (datos.js, monitor-data.js y el CSV de escenarios)
   a los tipos estrictos que usa el modelo del explorador */
import type { MonitorData, PredictionRow, ProjectData } from "../../../data/types";
import type { DatosEscenarios, DatosMonitor, DatosSeries, FilaEscenario, NombreEscenario } from "./tipos";

export interface DatosExplorador {
  series: DatosSeries;
  monitor: DatosMonitor | null;
  escenarios: DatosEscenarios | null;
}

const NOMBRES: readonly NombreEscenario[] = ["weak", "central", "intense"];
const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);

/** Filas del CSV de escenarios de El Niño (una por mes y escenario) */
export function escenariosDesdeFilas(filas: PredictionRow[]): DatosEscenarios | null {
  const lista: FilaEscenario[] = filas.flatMap((r) => {
    const fecha = typeof r.date === "string" ? r.date.slice(0, 7) : "";
    const escenario = NOMBRES.find((n) => n === r.scenario);
    if (!fecha || !escenario) return [];
    return [{
      fecha, escenario,
      sst_c: num(r.sst), sss_psu: num(r.sss), chlorophyll_a_mg_m3: num(r.chlorophyll_a),
      nitrate_mmol_m3: num(r.nitrate), phosphate_mmol_m3: num(r.phosphate), oxygen_ml_l: num(r.oxygen),
      phytoplankton_carbon_mg_c_m3: num(r.phytoplankton_carbon), nino12_anom_c: num(r.nino12), icen: num(r.icen),
    }];
  });
  if (!lista.length) return null;
  const fechas = lista.map((f) => f.fecha).sort();
  const multiplicadores = Object.fromEntries(NOMBRES.map((n) => [n, num(filas.find((r) => r.scenario === n)?.scenario_multiplier) ?? 1])) as Record<NombreEscenario, number>;
  return { periodo: { inicio: fechas[0] ?? "", fin: fechas.at(-1) ?? "" }, ultimo_observado: "", multiplicadores, avisos: [], filas: lista };
}

export function adaptarDatos(data: ProjectData, monitor: MonitorData | null, predicciones: PredictionRow[]): DatosExplorador {
  if (!data.meses_inicio || !data.indices || !data.pesca || !data.juego) throw new Error("Explorer data is incomplete");
  return {
    series: data as unknown as DatosSeries,
    monitor: monitor?.records.length ? (monitor as unknown as DatosMonitor) : null,
    escenarios: escenariosDesdeFilas(predicciones),
  };
}
