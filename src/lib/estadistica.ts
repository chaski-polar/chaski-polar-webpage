/* Estadística básica sobre series con huecos (null) */

export type Valor = number | null | undefined;

const esNumero = (x: Valor): x is number => x != null && !Number.isNaN(x);

export function media(xs: readonly Valor[]): number | null {
  const v = xs.filter(esNumero);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Correlación de Pearson con los pares completos (al menos 4) */
export function pearson(xs: readonly Valor[], ys: readonly Valor[]): number | null {
  const px: number[] = [], py: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i], y = ys[i];
    if (esNumero(x) && esNumero(y)) { px.push(x); py.push(y); }
  }
  if (px.length < 4) return null;
  const mx = media(px) ?? 0, my = media(py) ?? 0;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < px.length; i++) {
    const dx = (px[i] ?? 0) - mx, dy = (py[i] ?? 0) - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

/** Pendiente por unidad de x con mínimos cuadrados (al menos 6 puntos) */
export function pendiente(xs: readonly number[], ys: readonly Valor[]): number | null {
  const px: number[] = [], py: number[] = [];
  xs.forEach((x, i) => { const y = ys[i]; if (esNumero(y)) { px.push(x); py.push(y); } });
  if (px.length < 6) return null;
  const mx = media(px) ?? 0, my = media(py) ?? 0;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < px.length; i++) {
    const dx = (px[i] ?? 0) - mx;
    sxy += dx * ((py[i] ?? 0) - my); sxx += dx * dx;
  }
  return sxx ? sxy / sxx : null;
}

/** Media móvil de v meses; exige al menos el 60 % de la ventana con dato */
export function mediaMovil(xs: readonly Valor[], v = 12): (number | null)[] {
  return xs.map((_, i) => {
    if (i < v - 1) return null;
    const t = xs.slice(i - v + 1, i + 1).filter(esNumero);
    return t.length >= v * 0.6 ? media(t) : null;
  });
}
