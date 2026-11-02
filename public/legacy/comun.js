/* Funciones compartidas entre el explorador y el juego */
(function () {
  const D = window.DATOS;
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
  const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];
  const nf = (dec = 0) => new Intl.NumberFormat("es", { minimumFractionDigits: dec, maximumFractionDigits: dec });

  function media(xs) {
    const v = xs.filter((x) => x != null && !Number.isNaN(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }

  function pearson(xs, ys) {
    const p = [];
    for (let i = 0; i < xs.length; i++) if (xs[i] != null && ys[i] != null) p.push([xs[i], ys[i]]);
    if (p.length < 4) return null;
    const mx = media(p.map((q) => q[0])), my = media(p.map((q) => q[1]));
    let sxy = 0, sxx = 0, syy = 0;
    for (const [x, y] of p) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  }

  /* pendiente por año con mínimos cuadrados */
  function pendiente(xs, ys) {
    const p = [];
    for (let i = 0; i < xs.length; i++) if (ys[i] != null) p.push([xs[i], ys[i]]);
    if (p.length < 6) return null;
    const mx = media(p.map((q) => q[0])), my = media(p.map((q) => q[1]));
    let sxy = 0, sxx = 0;
    for (const [x, y] of p) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
    return sxx ? sxy / sxx : null;
  }

  function mesesDesde(inicio, n) {
    const [a, m] = inicio.split("-").map(Number);
    return Array.from({ length: n }, (_, i) => {
      const t = a * 12 + (m - 1) + i;
      return { anio: Math.floor(t / 12), mes: t % 12 };
    });
  }
  const etiquetaMes = (x) => `${MESES[x.mes]} ${x.anio}`;

  function mediaMovil(xs, v = 12) {
    return xs.map((_, i) => {
      if (i < v - 1) return null;
      const t = xs.slice(i - v + 1, i + 1).filter((x) => x != null);
      return t.length >= v * 0.6 ? media(t) : null;
    });
  }

  /* estilo común de Chart.js */
  function estiloGraficos() {
    if (!window.Chart) return;
    const C = window.Chart;
    C.defaults.color = "#a3bccb";
    C.defaults.borderColor = "rgba(36, 80, 122, 0.55)";
    C.defaults.font.family = '"Atkinson Hyperlegible", system-ui, sans-serif';
    C.defaults.font.size = 13;
    C.defaults.plugins.legend.labels.boxWidth = 14;
    C.defaults.plugins.legend.labels.boxHeight = 3;
    C.defaults.plugins.tooltip.backgroundColor = "rgba(7, 30, 51, 0.96)";
    C.defaults.plugins.tooltip.borderColor = "#24507a";
    C.defaults.plugins.tooltip.borderWidth = 1;
    C.defaults.plugins.tooltip.padding = 10;
    C.defaults.animation.duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700;
    C.defaults.maintainAspectRatio = false;
  }

  /* escala de color del océano: t entre 0 y 1 */
  const PARADAS = [[59, 28, 110], [44, 90, 160], [29, 154, 138], [127, 207, 74], [242, 225, 76]];
  function colorRampa(t, alfa = 1) {
    t = Math.max(0, Math.min(1, t));
    const x = t * (PARADAS.length - 1), i = Math.min(PARADAS.length - 2, Math.floor(x)), f = x - i;
    const c = PARADAS[i].map((v, k) => Math.round(v + (PARADAS[i + 1][k] - v) * f));
    return `rgba(${c[0]},${c[1]},${c[2]},${alfa})`;
  }
  /* escala divergente frío → neutro → cálido */
  function colorDiverge(t, alfa = 1) {
    t = Math.max(-1, Math.min(1, t));
    const frio = [43, 108, 176], neutro = [214, 226, 232], calido = [228, 87, 46];
    const a = t < 0 ? frio : calido, f = Math.abs(t);
    const c = neutro.map((v, k) => Math.round(v + (a[k] - v) * f));
    return `rgba(${c[0]},${c[1]},${c[2]},${alfa})`;
  }

  window.MF = { D, MESES, MESES_LARGOS, nf, media, pearson, pendiente, mesesDesde, etiquetaMes, mediaMovil, estiloGraficos, colorRampa, colorDiverge };
})();
