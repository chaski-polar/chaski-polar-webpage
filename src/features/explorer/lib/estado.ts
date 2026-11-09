/* Tipos de lo que se está viendo en el explorador (el estado vive en store.ts) */
import type { IdZona } from "./tipos";

export type IdCorriente = "humboldt" | "circumpolar";
export type IdRegion = "peru" | "antartida";

/** Bandas: clases con borde nítido. Celdas: cada celda de 0,5° tal cual. Suave: interpolado */
export type MapStyle = "bandas" | "celdas" | "suave";
export const MAP_STYLES: readonly MapStyle[] = ["bandas", "celdas", "suave"];

/** Nota de una historia, arriba del detalle de la zona */
export interface NotaHistoria {
  titulo: string;
  texto: string;
}

/** Lo que muestra el panel lateral */
export type Panel =
  | { tipo: "general" }
  | { tipo: "zona"; z: IdZona; nota?: NotaHistoria }
  | { tipo: "base" }
  | { tipo: "corriente"; id: IdCorriente }
  | { tipo: "punto"; lat: number; lng: number }
  | { tipo: "comparar" }
  | { tipo: "recorrido"; paso: number };

/** Comparación de dos años del mismo mes */
export interface Comparacion {
  region: IdRegion;
  mes: number;
  a: number | "prom";
  b: number;
}

export interface Pov {
  lat: number;
  lng: number;
  altitude: number;
}

export const zonaActiva = (p: Panel): IdZona | null => (p.tipo === "zona" ? p.z : null);
