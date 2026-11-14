/* Tendencias lineales de series de tiempo: Mann-Kendall (con corrección por empates), pendiente de Sen y
   promedios anuales por estación. Solo aritmética: no depende de librerías. */

export type Punto = { x: number; y: number }

export type ResultadoTendencia = {
  n: number
  /** pendiente de Sen, en unidades por año */
  pendiente: number
  /** intercepto de la recta de Sen (mediana de y - pendiente·x) */
  intercepto: number
  tau: number
  z: number
  /** valor p de dos colas (aproximación normal) */
  p: number
}

/** Función de distribución normal estándar (aproximación de Abramowitz y Stegun, error < 1e-7) */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp((-z * z) / 2)
  const c = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z > 0 ? 1 - c : c
}

const mediana = (v: number[]): number => {
  const a = [...v].sort((p, q) => p - q)
  const m = a.length >> 1
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2
}

/** Mann-Kendall y pendiente de Sen sobre puntos (año, valor). Devuelve null si hay menos de 8 puntos. */
export function tendencia(puntos: Punto[]): ResultadoTendencia | null {
  const pts = puntos.filter((p) => Number.isFinite(p.y)).sort((a, b) => a.x - b.x)
  const n = pts.length
  if (n < 8) return null
  let s = 0
  const pendientes: number[] = []
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = pts[j]!.y - pts[i]!.y
      s += Math.sign(d)
      if (pts[j]!.x !== pts[i]!.x) pendientes.push(d / (pts[j]!.x - pts[i]!.x))
    }
  }
  const empates = new Map<number, number>()
  for (const p of pts) empates.set(p.y, (empates.get(p.y) ?? 0) + 1)
  let varS = (n * (n - 1) * (2 * n + 5)) / 18
  for (const t of empates.values()) if (t > 1) varS -= (t * (t - 1) * (2 * t + 5)) / 18
  const z = varS > 0 ? (s - Math.sign(s)) / Math.sqrt(varS) : 0
  const pendiente = mediana(pendientes)
  return {
    n,
    pendiente,
    intercepto: mediana(pts.map((p) => p.y - pendiente * p.x)),
    tau: s / ((n * (n - 1)) / 2),
    z,
    p: Math.min(1, 2 * (1 - normalCdf(Math.abs(z)))),
  }
}

export type Estacion = 'year' | 'summer' | 'winter'
/** Meses de cada estación en el hemisferio sur; null = todo el año */
export const MESES_ESTACION: Record<Estacion, number[] | null> = { year: null, summer: [12, 1, 2, 3], winter: [6, 7, 8, 9] }

/** Promedio por año de una serie mensual (claves "AAAA-MM"). Un año cuenta solo si tiene suficientes meses con dato. */
export function promediosAnuales(mensual: { mes: string; valor: number | null }[], estacion: Estacion): Punto[] {
  const meses = MESES_ESTACION[estacion]
  const minimo = meses ? 3 : 6
  const por = new Map<number, number[]>()
  for (const { mes, valor } of mensual) {
    if (valor == null || !Number.isFinite(valor)) continue
    const anio = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7))
    if (meses && !meses.includes(m)) continue
    const l = por.get(anio) ?? []
    l.push(valor)
    por.set(anio, l)
  }
  return [...por.entries()].filter(([, l]) => l.length >= minimo).map(([x, l]) => ({ x, y: l.reduce((a, b) => a + b, 0) / l.length })).sort((a, b) => a.x - b.x)
}

/** Tendencia desde cada año de inicio posible (al menos 15 años de serie): muestra cuánto depende el resultado del periodo elegido */
export function sensibilidadInicio(puntos: Punto[]): { inicio: number; pendiente: number; p: number; n: number }[] {
  const r: { inicio: number; pendiente: number; p: number; n: number }[] = []
  for (const { x } of puntos) {
    const t = tendencia(puntos.filter((p) => p.x >= x))
    if (t && t.n >= 15) r.push({ inicio: x, pendiente: t.pendiente, p: t.p, n: t.n })
  }
  return r
}
