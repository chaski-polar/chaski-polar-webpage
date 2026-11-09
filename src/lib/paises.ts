/* Contornos de países de Natural Earth 1:110m (dominio público) */
import datos from "./paises.json";

type Anillo = [number, number][];

export interface Pais {
  properties: { n: string; c: string };
  geometry: { type: "Polygon"; coordinates: Anillo[] } | { type: "MultiPolygon"; coordinates: Anillo[][] };
}

export const PAISES: readonly Pais[] = (datos as unknown as { features: Pais[] }).features;

/** Polígonos de un país, siempre como lista de polígonos */
export const poligonos = (p: Pais): Anillo[][] => (p.geometry.type === "Polygon" ? [p.geometry.coordinates] : p.geometry.coordinates);

export const esHielo = (p: Pais): boolean => p.properties.c === "Antarctica" || p.properties.n === "Greenland";
