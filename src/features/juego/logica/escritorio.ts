/* Escritorio de fin de año, al estilo de Papers, Please: el jugador es analista del mar y revisa papeles.
   Todo sale de los datos reales del año jugado: el reporte satelital (comida en la costa central y
   Niño 1+2 por mes), la solicitud de la flota, notas de prensa con cifras (algunas falsas) y afirmaciones
   de causa. Cada expediente tiene una respuesta correcta que se puede comprobar cruzando los papeles. */
import type { Mar } from "../motor/mar";
import { anioDelMar, diagnosticar, type AnioDelMar } from "./cardumen";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export interface FilaReporte { mes: string; comida: number | null; nino: number | null }

export type Decision = "si" | "no";
export interface Expediente {
  id: string;
  tipo: "solicitud" | "prensa" | "causa";
  remitente: string;
  titulo: string;
  cuerpo: string;
  /** texto de cada sello */
  sellos: Record<Decision, string>;
  correcta: Decision;
  /** qué se le explica al jugador si se equivoca (la citación) */
  explicacion: string;
}

export type Bandeja = "nino" | "normal" | "variabilidad" | "tendencia";
export const BANDEJAS: { id: Bandeja; texto: string }[] = [
  { id: "nino", texto: "El Niño" },
  { id: "normal", texto: "Año normal" },
  { id: "variabilidad", texto: "Variabilidad" },
  { id: "tendencia", texto: "Tendencia" },
];

export interface Turno {
  anio: number;
  reporte: FilaReporte[];
  resumen: AnioDelMar;
  expedientes: Expediente[];
  bandejaCorrecta: Bandeja;
  /** reglas del manual */
  reglas: string[];
  /** cuántas reglas se marcan como nuevas (el primer año, todas) */
  reglasNuevas: number;
}

/** Azar reproducible por año: el mismo año siempre trae los mismos papeles */
function azarDe(semilla: number) {
  let s = semilla >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

const pct = (x: number) => `${Math.round(x * 100)} %`;
const signo = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(1).replace(".", ",")} °C`;

const REGLAS = [
  "Toda cifra de un expediente debe coincidir con el Reporte satelital (se acepta ±10 puntos). Si no coincide, se rechaza.",
  "Temporada de pesca: si la comida de la costa central promedia menos de 50 % entre abril y julio, se deniega (veda).",
  "El Niño: hay El Niño si el índice Niño 1+2 llega a +1 °C o más y la comida cae.",
  "Que dos cosas pasen juntas no prueba que una cause la otra. Ningún dato del reporte muestra que la Antártida cause cambios en el Perú.",
  "Una tendencia necesita muchos años de datos. Desde 1998 la clorofila frente al Perú no muestra tendencias significativas.",
];

export function crearTurno(mar: Mar, anio: number, meses: number, generacion: number): Turno {
  const azar = azarDe(anio * 7919);
  const reporte: FilaReporte[] = [];
  for (let m = 1; m <= meses; m++) {
    const i = mar.indice(anio, m);
    if (i < 0) continue;
    const ch = mar.estado("chimbote", i), ca = mar.estado("callao", i);
    reporte.push({ mes: MESES[m - 1]!, comida: (ch.alimento + ca.alimento) / 2, nino: ch.nino12 });
  }
  const resumen = anioDelMar(mar, anio, meses);
  const diag = diagnosticar(resumen);
  const expedientes: Expediente[] = [];

  // 1. Solicitud de la flota: abrir la temporada de abril a julio
  const temporada = reporte.slice(3, 7).map((f) => f.comida).filter((x): x is number => x != null);
  if (temporada.length) {
    const prom = temporada.reduce((a, b) => a + b, 0) / temporada.length;
    expedientes.push({
      id: "flota", tipo: "solicitud", remitente: "Flota Norte-Centro",
      titulo: `Solicitud de temporada · abril a julio de ${anio}`,
      cuerpo: `Solicitamos abrir la temporada de pesca de anchoveta de abril a julio de ${anio}. Según nuestros capitanes, «el mar está como siempre».`,
      sellos: { si: "APROBADO", no: "DENEGADO" },
      correcta: prom >= 0.5 ? "si" : "no",
      explicacion: `Entre abril y julio la comida de la costa central promedió ${pct(prom)}. ${prom >= 0.5 ? "Era suficiente: no correspondía veda." : "Menos de 50 %: correspondía veda."}`,
    });
  }

  // 2. Nota de prensa con una cifra: a veces verdadera, a veces inventada
  const conDato = reporte.map((f, k) => ({ ...f, k })).filter((f) => f.comida != null);
  const elegido = conDato.reduce((a, f) => ((f.comida ?? 9) < (a.comida ?? 9) ? f : a), conDato[0]!);
  if (elegido?.comida != null) {
    const real = elegido.comida;
    const falsa = azar() < 0.5;
    const citada = falsa ? (real < 0.6 ? real + 0.45 + azar() * 0.2 : real - 0.4) : real + (azar() - 0.5) * 0.08;
    expedientes.push({
      id: "prensa-cifra", tipo: "prensa", remitente: "Diario El Litoral",
      titulo: "Nota de prensa para verificar",
      cuerpo: `«En ${elegido.mes} de ${anio} el fitoplancton de la costa central llegó a ${pct(Math.max(0.05, citada))} de lo normal», afirma la nota.`,
      sellos: { si: "RESPALDADO", no: "RECHAZADO" },
      correcta: falsa ? "no" : "si",
      explicacion: `El Reporte satelital marca ${pct(real)} en ${elegido.mes}. ${falsa ? "La nota usaba una cifra que no coincide." : "La cifra de la nota coincidía."}`,
    });
  }

  // 3. Afirmaciones de causa: una sobre El Niño o una comparación de zonas, y otra que no se puede respaldar
  const zonas = (z: "paita" | "callao") => {
    const v = reporte.map((_, k) => { const i = mar.indice(anio, k + 1); return i >= 0 ? mar.estado(z, i).alimento : null; }).filter((x): x is number => x != null);
    return v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
  };
  if (azar() < 0.5) {
    expedientes.push({
      id: "causa-nino", tipo: "causa", remitente: "Consultora OceanData",
      titulo: "Informe técnico",
      cuerpo: `«La caída del fitoplancton frente a Chimbote en ${anio} se asocia a El Niño».`,
      sellos: { si: "RESPALDADO", no: "NO DEMOSTRADO" },
      correcta: diag === "nino" ? "si" : "no",
      explicacion: diag === "nino" ? `El Niño 1+2 llegó a ${signo(resumen.ninoMax ?? 0)} y la comida cayó: el reporte lo respalda.` : `El Niño 1+2 no pasó de +1 °C con caída de comida: el reporte no lo respalda.`,
    });
  } else {
    const p = zonas("paita"), c = zonas("callao");
    expedientes.push({
      id: "causa-zonas", tipo: "causa", remitente: "Gremio de pescadores artesanales",
      titulo: "Carta",
      cuerpo: `«Este año a Paita le fue mejor que a Callao: allá hubo más comida para la anchoveta».`,
      sellos: { si: "RESPALDADO", no: "NO DEMOSTRADO" },
      correcta: p > c ? "si" : "no",
      explicacion: `Comida promedio del año: Paita ${pct(p)}, Callao ${pct(c)}.`,
    });
  }
  const trampa = azar() < 0.5
    ? { remitente: "Revista Mar Abierto", cuerpo: `«El deshielo antártico causó la caída de la anchoveta en ${anio}».`, explicacion: "Nada en el reporte muestra que la Antártida cause cambios en el Perú. Que algo coincida no prueba la causa." }
    : { remitente: "Programa radial Mar y Pesca", cuerpo: "«El mar peruano se empobrece un poco cada año: es una tendencia».", explicacion: "Un año no muestra una tendencia; desde 1998 la clorofila frente al Perú no tiene una tendencia significativa." };
  expedientes.push({ id: "trampa", tipo: "prensa", titulo: "Afirmación pública", sellos: { si: "RESPALDADO", no: "NO DEMOSTRADO" }, correcta: "no", ...trampa });

  // los papeles llegan desordenados
  for (let i = expedientes.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [expedientes[i], expedientes[j]] = [expedientes[j]!, expedientes[i]!]; }

  return {
    anio, reporte, resumen, expedientes,
    bandejaCorrecta: diag === "nino" ? "nino" : diag === "suerte" ? "variabilidad" : "normal",
    reglas: REGLAS,
    reglasNuevas: generacion === 0 ? REGLAS.length : 0,
  };
}

/** Cada decisión correcta protege al cardumen siguiente; cada error lo perjudica (efecto ilustrativo) */
export const EFECTO_ACIERTO = 0.04;
export const EFECTO_ERROR = -0.05;
