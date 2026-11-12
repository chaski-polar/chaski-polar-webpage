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
  /** temperatura del mar en la zona frente a lo normal (°C) */
  anomaliaTemp: number | null;
  temporada: Temporada;
}

/** Estrategia que el jugador elige para la siguiente generación, como en el balance de Papers, Please.
    Son decisiones de juego del cardumen, no rasgos heredados. Cada una tiene una ventaja y un costo. */
export interface Estrategia {
  id: "ninguna" | "profundo" | "costero" | "apretado";
  nombre: string;
  ventaja: string;
  costo: string;
  /** multiplicadores sobre las reglas */
  gasto: number;
  gastoCalido: number;
  comida: number;
  depredadores: number;
  oxigeno: number;
  velocidad: number;
}

const BASE = { gasto: 1, gastoCalido: 1, comida: 1, depredadores: 1, oxigeno: 1, velocidad: 1 };
export const ESTRATEGIAS: Record<Estrategia["id"], Estrategia> = {
  ninguna: { id: "ninguna", nombre: "Sin estrategia", ventaja: "", costo: "", ...BASE },
  profundo: { id: "profundo", nombre: "Nadador profundo", ventaja: "Aguanta mucho mejor la falta de oxígeno.", costo: "Gasta más energía todo el año.", ...BASE, gasto: 1.1, oxigeno: 0.3 },
  costero: { id: "costero", nombre: "Migrador costero", ventaja: "Nada más rápido y aprovecha más cada mancha de comida.", costo: "Sufre mucho cuando el mar está cálido.", ...BASE, comida: 1.2, velocidad: 1.2, gastoCalido: 1.5 },
  apretado: { id: "apretado", nombre: "Cardumen apretado", ventaja: "Se defiende mejor de aves y lobos marinos.", costo: "Los peces compiten más por la comida.", ...BASE, comida: 0.85, depredadores: 0.6 },
};
/** se considera mar cálido para la estrategia "costero" desde esta anomalía de temperatura (°C) */
const MAR_CALIDO = 1;

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
  estrategia: Estrategia;
  /** el año termina al llegar a este mes (12 = diciembre completo; menos si aún no hay datos) */
  mesFin: number;
}

export function crearCardumen(anio: number, peces = PECES_INICIALES, estrategia: Estrategia = ESTRATEGIAS.ninguna, mesFin = 12): Cardumen {
  return { anio, mes: 0, tMes: 0, peces, energia: 0.8, compacto: false, perdidas: { hambre: 0, depredadores: 0, flota: 0, oxigeno: 0 }, historia: [], terminado: false, estrategia, mesFin: Math.max(1, Math.min(12, mesFin)) };
}

/** Último mes con datos del año (1 a 12), para no jugar meses que los satélites aún no midieron */
export function mesesConDatos(mar: Mar, anio: number): number {
  for (let m = 12; m >= 1; m--) if (mar.indice(anio, m) >= 0) return m;
  return 0;
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
  return { zona, alimento: e?.alimento ?? 1, origen: e?.origen ?? "normal", nino12: e?.nino12 ?? null, anomaliaTemp: e?.anomaliaTemp ?? null, temporada: temporadaDePesca(mar, anio, mes) };
}

/** Quita una fracción del cardumen por una causa y la anota en el informe */
export function perder(c: Cardumen, causa: Causa, fraccion: number): number {
  const n = c.peces * Math.min(1, Math.max(0, fraccion));
  c.peces -= n;
  c.perdidas[causa] += n;
  return n;
}

export function comer(c: Cardumen): void {
  c.energia = Math.min(1, c.energia + REGLAS.energiaPorParche * c.estrategia.comida * (c.compacto ? REGLAS.factorCompacto : 1));
}

/** Pérdida por un ataque (ave o lobo marino) o por una red, según cómo va el cardumen */
export function golpe(c: Cardumen, tipo: "ave" | "lobo" | "red"): number {
  const r = REGLAS[tipo];
  const base = c.compacto ? r.compacto : r.normal;
  return tipo === "red" ? perder(c, "flota", base) : perder(c, "depredadores", base * c.estrategia.depredadores);
}

/** Avanza el tiempo: gasta energía, aplica hambre y falta de oxígeno. Devuelve true si empezó un mes nuevo.
    dtCalendario permite acelerar solo el paso de los meses (para probar) */
export function avanzar(c: Cardumen, dt: number, bajoOxigeno: boolean, mes: Mes, dtCalendario = dt): boolean {
  if (c.terminado) return false;
  const calido = (mes.anomaliaTemp ?? 0) >= MAR_CALIDO;
  c.energia = Math.max(0, c.energia - REGLAS.gastoEnergia * c.estrategia.gasto * (calido ? c.estrategia.gastoCalido : 1) * dt);
  if (c.energia <= 0) perder(c, "hambre", REGLAS.hambreFuerte * dt);
  else if (c.energia < 0.25) perder(c, "hambre", REGLAS.hambreLeve * dt);
  if (bajoOxigeno) perder(c, "oxigeno", REGLAS.oxigeno * c.estrategia.oxigeno * dt);
  c.tMes += dtCalendario;
  if (c.tMes < SEGUNDOS_POR_MES) return false;
  c.historia.push(mes);
  c.tMes = 0;
  c.mes++;
  if (c.mes >= c.mesFin) { c.mes = c.mesFin - 1; c.terminado = true; }
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
  /** índice Niño 1+2 promedio de los meses jugados */
  ninoPromedio: number | null;
  mesesJugados: number;
  estrategia: Estrategia["id"];
}

export function informe(c: Cardumen, inicial: number): Informe {
  const h = c.historia;
  const prom = h.length ? h.reduce((s, m) => s + m.alimento, 0) / h.length : 1;
  return {
    anio: c.anio, inicial, sobrevivientes: Math.round(c.peces), perdidas: { ...c.perdidas }, alimentoPromedio: prom,
    mesesObservados: h.filter((m) => m.origen === "observado").length,
    vedas: h.filter((m) => m.temporada === "veda").length,
    mesesTemporada: h.filter((m) => m.temporada !== "fuera").length,
    ninoPromedio: (() => { const v = h.map((m) => m.nino12).filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; })(),
    mesesJugados: h.length,
    estrategia: c.estrategia.id,
  };
}

/** Qué explica el año según los datos. "Una tendencia" nunca es la respuesta: desde 1998 no hay tendencias
    significativas de clorofila frente al Perú (resultado del proyecto); dominan los golpes de El Niño. */
export type Diagnostico = "nino" | "suerte" | "bueno";

/** El año visto por el satélite, sin importar por dónde nadó el jugador: costa central e índice Niño 1+2 */
export interface AnioDelMar {
  anio: number;
  meses: number;
  /** comida promedio en la costa central (Chimbote y Callao), 1 = normal */
  alimentoCentro: number;
  /** Niño 1+2 promedio y máximo del año */
  nino: number | null;
  ninoMax: number | null;
  /** meses con Niño 1+2 de +1 °C o más, y la peor comida en la costa central en esos meses */
  mesesNino: number;
  peorConNino: number | null;
}
export function anioDelMar(mar: Mar, anio: number, meses: number): AnioDelMar {
  const centro: number[] = [], nino: number[] = [], conNino: number[] = [];
  for (let m = 1; m <= meses; m++) {
    const i = mar.indice(anio, m);
    if (i < 0) continue;
    const comida = (mar.estado("chimbote", i).alimento + mar.estado("callao", i).alimento) / 2;
    centro.push(comida);
    const n = mar.estado("chimbote", i).nino12;
    if (n != null) { nino.push(n); if (n >= 1) conNino.push(comida); }
  }
  const prom = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
  return {
    anio, meses: centro.length, alimentoCentro: prom(centro) ?? 1, nino: prom(nino), ninoMax: nino.length ? Math.max(...nino) : null,
    mesesNino: conNino.length, peorConNino: conNino.length ? Math.min(...conNino) : null,
  };
}

/** El Niño explica el año si hubo meses con Niño 1+2 ≥ +1 °C y en ellos la comida de la costa central cayó fuerte;
    así se reconocen también los golpes cortos, como el Niño costero de 2017 */
export function diagnosticar(a: AnioDelMar): Diagnostico {
  if (a.mesesNino > 0 && (a.peorConNino ?? 1) < 0.7) return "nino";
  if (a.alimentoCentro < 0.9) return "suerte";
  return "bueno";
}
