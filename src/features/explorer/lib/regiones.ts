/* Los cuatro apartados del explorador. Cada variable declara en variables.ts a cuáles pertenece. */
import type { ExplorerSection } from "./estado";

export interface Apartado {
  id: ExplorerSection;
  nombre: string;
  detalle: string;
  /** punto de vista del globo al elegirlo */
  pov: { lat: number; lng: number; altitude: number };
}

export const APARTADOS: readonly Apartado[] = [
  { id: "austral", nombre: "Southern Ocean & Antarctica", detalle: "Antarctic climate variability", pov: { lat: -62, lng: -62, altitude: 1.1 } },
  { id: "pacifico_sur", nombre: "South Pacific", detalle: "Intermediate ocean conditions", pov: { lat: -35, lng: -115, altitude: 1.6 } },
  { id: "humboldt", nombre: "Humboldt system & Peruvian sea", detalle: "Physical and biogeochemical processes", pov: { lat: -12, lng: -80, altitude: 0.95 } },
  { id: "anchoveta", nombre: "Anchoveta biological response", detalle: "Environment–biology relationship", pov: { lat: -12, lng: -80, altitude: 0.95 } },
];

/** Parámetros previstos para un apartado que todavía no tienen datos cargados: se muestran como no disponibles, sin valores */
export const NO_DISPONIBLE: Partial<Record<ExplorerSection, readonly string[]>> = {
  pacifico_sur: ["Sea surface temperature", "Salinity", "Ocean currents", "Subsurface oxygen", "Sea level", "Chlorophyll-a"],
  humboldt: ["Upwelling index"],
};
