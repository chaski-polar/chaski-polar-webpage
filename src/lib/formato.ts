/* Formato de números, fechas y coordenadas en español */

export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"] as const;
export const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"] as const;

/** Un mes del calendario: año y mes (0 = enero) */
export interface Mes {
  anio: number;
  mes: number;
}

const formatos = new Map<number, Intl.NumberFormat>();
/** Formato con una cantidad fija de decimales (se reutiliza para no crearlo en cada llamada) */
export function nf(decimales = 0): Intl.NumberFormat {
  let f = formatos.get(decimales);
  if (!f) {
    f = new Intl.NumberFormat("es", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    formatos.set(decimales, f);
  }
  return f;
}

export const signo = (x: number): string => (x >= 0 ? "+" : "−");
export const mayus = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/** Lista de n meses consecutivos desde "AAAA-MM" */
export function mesesDesde(inicio: string, n: number): Mes[] {
  const [a = 0, m = 1] = inicio.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const t = a * 12 + (m - 1) + i;
    return { anio: Math.floor(t / 12), mes: t % 12 };
  });
}

/** Diferencia en meses entre dos fechas "AAAA-MM" */
export function mesesEntre(desde: string, hasta: string): number {
  const [a1 = 0, m1 = 1] = desde.split("-").map(Number);
  const [a2 = 0, m2 = 1] = hasta.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}

export const etiquetaMes = (x: Mes): string => `${MESES[x.mes]} ${x.anio}`;
export const mesLargo = (x: Mes): string => `${MESES_LARGOS[x.mes]} de ${x.anio}`;
export const claveMes = (x: Mes): string => `${x.anio}-${String(x.mes + 1).padStart(2, "0")}`;

export const fmtCoord = (lat: number, lng: number): string =>
  `${nf(1).format(Math.abs(lat))}° ${lat < 0 ? "S" : "N"}, ${nf(1).format(Math.abs(lng))}° ${lng < 0 ? "O" : "E"}`;

/** Correlación con signo tipográfico y dos decimales */
export const fmtR = (r: number | null): string => (r == null ? "—" : (r < 0 ? "−" : "") + nf(2).format(Math.abs(r)));

/** Escapa texto para insertarlo en HTML */
export const html = (t: string): string =>
  t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
