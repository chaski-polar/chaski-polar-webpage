/* Reglas del cardumen, separadas de los gráficos para poder probarlas y calibrarlas.

   Lo que viene de datos reales (motor del mar): la comida de cada zona y mes (clorofila satelital) y el
   índice Niño 1+2. Lo ilustrativo: el tamaño del cardumen, las pérdidas por depredadores, la flota
   y el hambre. Las reglas siguen los resultados del proyecto:
   - con El Niño la comida cae fuerte en la costa central y poco en Paita;
   - la zona sin oxígeno se HUNDE con El Niño (más espacio, menos comida) y sube en años fríos,
     apretando al cardumen hacia la superficie, donde atacan las aves. */
import type { EstadoMar, Mar, ZonaMar } from "../motor/mar";

export const PECES_INICIALES = 10_000;
export const SEGUNDOS_POR_MES = 15;

/** Constantes de juego (ilustrativas), reunidas para calibrarlas en un solo lugar */
export const REGLAS = {
  gastoEnergia: 0.07, // por segundo
  energiaPorParche: 0.12,
  factorCompacto: 0.65, // compacto come menos…
  parchesPorAlimento: 12,
  parchesMax: 24,
  /** segundos para que reaparezca un parche comido cuando la comida está normal */
  reaparicion: 5,
  hambreLeve: 0.004, // fracción del cardumen por segundo con poca energía
  hambreFuerte: 0.014, // …y sin energía
  oxigeno: 0.012, // por segundo bajo la capa sin oxígeno
  ave: { normal: 0.014, compacto: 0.005 }, // …y se protege mejor de los depredadores
  lobo: { normal: 0.018, compacto: 0.006 },
  red: { normal: 0.05, compacto: 0.08 }, // pero una red atrapa más si está todo junto
} as const;

export type Causa = "hambre" | "depredadores" | "flota" | "oxigeno";
export type Temporada = "abierta" | "veda" | "fuera";

export interface Mes {
  zona: ZonaMar;
  alimento: number;
  origen: EstadoMar["origen"];
  nino12: number | null;
  temporada: Temporada;
}

export interface Cardumen {
  anio: number;
  /** 0 = enero */
  mes: number;
  /** segundos transcurridos dentro del mes */
  tMes: number;
  peces: number;
  energia: number;
  compacto: boolean;
  perdidas: Record<Causa, number>;
  /** lo que vivió el cardumen cada mes (para el informe) */
  historia: Mes[];
  terminado: boolean;
}

export function crearCardumen(anio: number, peces = PECES_INICIALES): Cardumen {
  return { anio, mes: 0, tMes: 0, peces, energia: 0.8, compacto: false, perdidas: { hambre: 0, depredadores: 0, flota: 0, oxigeno: 0 }, historia: [], terminado: false };
}

/** Altura (y) del límite de la zona sin oxígeno: 0 es la superficie. Se hunde con El Niño y sube con agua fría */
export function limiteOxigeno(nino12: number | null): number {
  const n = nino12 ?? 0;
  const y = n >= 0 ? -6 - 2.5 * n : -6 - 1.5 * n;
  return Math.max(-12, Math.min(-3.2, y));
}

/** Cuántas manchas de comida hay en la zona, según el alimento del mes (1 = normal) */
export const parchesDeComida = (alimento: number): number =>
  Math.max(1, Math.min(REGLAS.parchesMax, Math.round(REGLAS.parchesPorAlimento * alimento)));

/** Segundos que tarda en reaparecer una mancha: con poca comida, el mar tarda más en reponerla */
export const tiempoReaparicion = (alimento: number): number => REGLAS.reaparicion / Math.max(0.1, alimento);

// Temporadas de pesca de anchoveta en la zona norte-centro (aproximadas): abril-julio y noviembre-diciembre
const MESES_TEMPORADA = new Set([3, 4, 5, 6, 10, 11]);

/** La temporada se cierra (veda) si ese mes la comida en la costa central cae a menos de la mitad */
export function temporadaDePesca(mar: Mar, anio: number, mes: number): Temporada {
  if (!MESES_TEMPORADA.has(mes)) return "fuera";
  const i = mar.indice(anio, mes + 1);
  if (i < 0) return "fuera";
  const centro = (mar.estado("chimbote", i).alimento + mar.estado("callao", i).alimento) / 2;
  return centro < 0.5 ? "veda" : "abierta";
}

/** Condiciones del mes en una zona */
export function condiciones(mar: Mar, anio: number, mes: number, zona: ZonaMar): Mes {
  const i = mar.indice(anio, mes + 1);
  const e = i >= 0 ? mar.estado(zona, i) : null;
  return { zona, alimento: e?.alimento ?? 1, origen: e?.origen ?? "normal", nino12: e?.nino12 ?? null, temporada: temporadaDePesca(mar, anio, mes) };
}

/** Quita una fracción del cardumen por una causa y la anota en el informe */
export function perder(c: Cardumen, causa: Causa, fraccion: number): number {
  const n = c.peces * Math.min(1, Math.max(0, fraccion));
  c.peces -= n;
  c.perdidas[causa] += n;
  return n;
}

export function comer(c: Cardumen): void {
  c.energia = Math.min(1, c.energia + REGLAS.energiaPorParche * (c.compacto ? REGLAS.factorCompacto : 1));
}

/** Pérdida por un ataque (ave o lobo marino) o por una red, según cómo va el cardumen */
export function golpe(c: Cardumen, tipo: "ave" | "lobo" | "red"): number {
  const r = REGLAS[tipo];
  return perder(c, tipo === "red" ? "flota" : "depredadores", c.compacto ? r.compacto : r.normal);
}

/** Avanza el tiempo: gasta energía, aplica hambre y falta de oxígeno. Devuelve true si empezó un mes nuevo.
    dtCalendario permite acelerar solo el paso de los meses (para probar) */
export function avanzar(c: Cardumen, dt: number, bajoOxigeno: boolean, mes: Mes, dtCalendario = dt): boolean {
  if (c.terminado) return false;
  c.energia = Math.max(0, c.energia - REGLAS.gastoEnergia * dt);
  if (c.energia <= 0) perder(c, "hambre", REGLAS.hambreFuerte * dt);
  else if (c.energia < 0.25) perder(c, "hambre", REGLAS.hambreLeve * dt);
  if (bajoOxigeno) perder(c, "oxigeno", REGLAS.oxigeno * dt);
  c.tMes += dtCalendario;
  if (c.tMes < SEGUNDOS_POR_MES) return false;
  c.historia.push(mes);
  c.tMes = 0;
  c.mes++;
  if (c.mes >= 12) { c.mes = 11; c.terminado = true; }
  return true;
}

export interface Informe {
  anio: number;
  inicial: number;
  sobrevivientes: number;
  perdidas: Record<Causa, number>;
  /** comida promedio que encontró el cardumen (1 = normal) */
  alimentoPromedio: number;
  /** cuántos meses la comida vino de clorofila medida por satélite */
  mesesObservados: number;
  vedas: number;
  mesesTemporada: number;
}

export function informe(c: Cardumen, inicial: number): Informe {
  const h = c.historia;
  const prom = h.length ? h.reduce((s, m) => s + m.alimento, 0) / h.length : 1;
  return {
    anio: c.anio, inicial, sobrevivientes: Math.round(c.peces), perdidas: { ...c.perdidas }, alimentoPromedio: prom,
    mesesObservados: h.filter((m) => m.origen === "observado").length,
    vedas: h.filter((m) => m.temporada === "veda").length,
    mesesTemporada: h.filter((m) => m.temporada !== "fuera").length,
  };
}
