/* Escalas de color de los datos */

type RGB = readonly [number, number, number];

/* escala del océano (poca → mucha clorofila), t entre 0 y 1 */
const PARADAS: readonly RGB[] = [[59, 28, 110], [44, 90, 160], [29, 154, 138], [127, 207, 74], [242, 225, 76]];

const limitar = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));

export function colorRampa(t: number, alfa = 1): string {
  const x = limitar(t, 0, 1) * (PARADAS.length - 1);
  const i = Math.min(PARADAS.length - 2, Math.floor(x)), f = x - i;
  const a = PARADAS[i] as RGB, b = PARADAS[i + 1] as RGB;
  const c = a.map((v, k) => Math.round(v + ((b[k] ?? v) - v) * f));
  return `rgba(${c[0]},${c[1]},${c[2]},${alfa})`;
}

/* escala divergente frío → neutro → cálido, t entre −1 y 1 */
const FRIO: RGB = [43, 108, 176], NEUTRO: RGB = [214, 226, 232], CALIDO: RGB = [228, 87, 46];
export function colorDiverge(t: number, alfa = 1): string {
  const u = limitar(t, -1, 1), extremo = u < 0 ? FRIO : CALIDO, f = Math.abs(u);
  const c = NEUTRO.map((v, k) => Math.round(v + ((extremo[k] ?? v) - v) * f));
  return `rgba(${c[0]},${c[1]},${c[2]},${alfa})`;
}

export const DEGRADADO_DIVERGE = "linear-gradient(90deg, rgb(43,108,176), rgb(214,226,232), rgb(228,87,46))";

/* clorofila en escala logarítmica de 0,03 a 10 mg/m³ (la misma en el mapa, las zonas y la leyenda) */
const CHL_LOG0 = Math.log10(0.03), CHL_LOG1 = 1;
export const tClorofila = (v: number): number => (Math.log10(v) - CHL_LOG0) / (CHL_LOG1 - CHL_LOG0);

/** Componentes numéricos de un color "rgba(r,g,b,a)" */
export const componentes = (s: string): number[] => (s.match(/[\d.]+/g) ?? []).map(Number);

export const SIN_DATO = "rgba(120,140,155,0.28)";
