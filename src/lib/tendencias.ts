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
  /** intervalo de confianza del 95 % de la pendiente de Sen (método de Sen), en unidades por año */
  ic95: [number, number]
}

export type ResultadoRegresion = {
  n: number
  /** pendiente de la regresión lineal, en unidades por año */
  pendiente: number
  errorEstandar: number
  t: number
  /** valor p de dos colas de la prueba t sobre la pendiente (n − 2 grados de libertad) */
  p: number
  /** intervalo de confianza del 95 % de la pendiente */
  ic95: [number, number]
  r2: number
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
  // intervalo de Sen: se ordenan las N pendientes y se toman las de rango (N − C)/2 y (N + C)/2 + 1, con C = 1,96·√Var(S)
  const orden = [...pendientes].sort((a, b) => a - b)
  const c = 1.959964 * Math.sqrt(varS)
  const i1 = Math.max(0, Math.floor((orden.length - c) / 2)), i2 = Math.min(orden.length - 1, Math.ceil((orden.length + c) / 2))
  return {
    n,
    pendiente,
    intercepto: mediana(pts.map((p) => p.y - pendiente * p.x)),
    tau: s / ((n * (n - 1)) / 2),
    z,
    p: Math.min(1, 2 * (1 - normalCdf(Math.abs(z)))),
    ic95: [orden[i1] ?? pendiente, orden[i2] ?? pendiente],
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

/* ---- Regresión lineal con prueba t ---- */

function lnGamma(x: number): number {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]
  let y = x, t = x + 5.5
  t -= (x + 0.5) * Math.log(t)
  let s = 1.000000000190015
  for (const c of g) s += c / ++y
  return -t + Math.log((2.5066282746310005 * s) / x)
}

/** Fracción continua de la beta incompleta (Numerical Recipes) */
function betaCf(a: number, b: number, x: number): number {
  const tiny = 1e-30
  let c = 1, d = 1 - ((a + b) * x) / (a + 1)
  if (Math.abs(d) < tiny) d = tiny
  d = 1 / d
  let h = d
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((a - 1 + m2) * (a + m2))
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny
    d = 1 / d; h *= d * c
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + 1 + m2))
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 3e-12) break
  }
  return h
}

function betaIncompleta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  return x < (a + 1) / (a + b + 2) ? (bt * betaCf(a, b, x)) / a : 1 - (bt * betaCf(b, a, 1 - x)) / b
}

/** Valor p de dos colas de una t de Student con gl grados de libertad */
export function valorPT(t: number, gl: number): number {
  return betaIncompleta(gl / (gl + t * t), gl / 2, 0.5)
}

/** Valor crítico de dos colas al 95 % (por bisección sobre valorPT) */
function tCritico(gl: number): number {
  let lo = 0, hi = 50
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (valorPT(m, gl) > 0.05) lo = m; else hi = m }
  return (lo + hi) / 2
}

/** Regresión lineal por mínimos cuadrados sobre (año, valor), con prueba t de la pendiente e intervalo del 95 % */
export function regresion(puntos: Punto[]): ResultadoRegresion | null {
  const pts = puntos.filter((p) => Number.isFinite(p.y))
  const n = pts.length
  if (n < 8) return null
  const mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n
  let sxx = 0, sxy = 0, syy = 0
  for (const p of pts) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); syy += (p.y - my) ** 2 }
  if (sxx === 0) return null
  const b = sxy / sxx, a = my - b * mx
  const sce = pts.reduce((s, p) => s + (p.y - a - b * p.x) ** 2, 0)
  const ee = Math.sqrt(sce / (n - 2) / sxx)
  const t = ee > 0 ? b / ee : 0
  const tc = tCritico(n - 2)
  return { n, pendiente: b, errorEstandar: ee, t, p: ee > 0 ? valorPT(t, n - 2) : 1, ic95: [b - tc * ee, b + tc * ee], r2: syy > 0 ? 1 - sce / syy : 0 }
}
