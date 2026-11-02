/* Escena pixel del juego: corte del mar desde la costa del Perú hasta la Península Antártica.
   320x180 píxeles, escalada en múltiplos enteros. Cada señal cambia algo del dibujo. */
(function () {
  const { C, S, ICONOS, Lienzo, Sonido, anchoTexto } = window.PIX;
  const ICONO_DE = { hielo: "hielo", sam: "sam", chl_rj: "fito", tsm_rj: "temp", nino12: "nino", chl_cn: "fito", tsm_cn: "temp" };
  const M = 17; // lado de la insignia de cada señal (ícono de 13 px + borde)
  const W = 320, H = 180, SUP = 58, AGUA = 61;
  const COSTA_PE = 30, COSTA_AN = 276;

  /* fondo marino: puntos (x, y) unidos por rectas */
  const FONDO = [[24, 61], [30, 66], [38, 84], [50, 108], [64, 118], [96, 124], [126, 129], [150, 164], [232, 168], [256, 142], [268, 120], [276, 104], [320, 96]];
  function fondo(x) {
    for (let i = 1; i < FONDO.length; i++) {
      const [x0, y0] = FONDO[i - 1], [x1, y1] = FONDO[i];
      if (x <= x1) return Math.round(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
    }
    return 96;
  }

  /* azar con semilla para que la escena sea siempre igual */
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 9301 + 49297) % 233280) / 233280);

  /* zona que barre el satélite al leer cada señal */
  const ZONAS = {
    sam: { x: 196, y: 10, w: 110, h: 32 },
    chl_rj: { x: 170, y: 62, w: 92, h: 36 },
    tsm_rj: { x: 170, y: 62, w: 92, h: 40 },
    nino12: { x: 30, y: 57, w: 136, h: 16 },
    chl_cn: { x: 34, y: 62, w: 116, h: 38 },
    tsm_cn: { x: 34, y: 72, w: 96, h: 34 },
  };
  const RANGO = { hielo: 1.5, sam: 1.2, chl_rj: 45, tsm_rj: 0.41, nino12: 1.75, chl_cn: 50, tsm_cn: 2.66 };

  function Escena(canvas, { alMarcador, alHover } = {}) {
    canvas.width = W; canvas.height = H;
    const L = Lienzo(canvas);
    const quietoMQ = matchMedia("(prefers-reduced-motion: reduce)");
    let quieto = quietoMQ.matches;
    quietoMQ.addEventListener?.("change", (e) => { quieto = e.matches; pedir(); });

    /* ---------- fondo estático ---------- */
    const base = new Uint32Array(W * H);
    (function pintarBase() {
      const B = Lienzo({ width: W, height: H, getContext: () => canvas.getContext("2d") });
      // cielo
      B.rect(0, 0, W, AGUA, C.noche);
      B.dither(0, 18, W, 20, C.hondo, 0.5); B.rect(0, 38, W, AGUA - 38, C.hondo);
      B.dither(0, 46, W, AGUA - 46, C.marMedio, 0.3); B.dither(0, 53, W, AGUA - 53, C.marMedio, 0.55);
      // luna
      B.rect(147, 11, 5, 5, C.hielo); B.rect(146, 12, 7, 3, C.hielo); B.px(151, 12, C.hieloSombra); B.px(150, 14, C.hieloSombra);
      // agua por capas
      const capas = [[AGUA, C.marClaro], [72, C.marMedio], [104, C.mar], [140, C.hondo], [166, C.noche]];
      for (let i = 0; i < capas.length; i++) {
        const [y0, c] = capas[i], y1 = capas[i + 1] ? capas[i + 1][0] : H;
        B.rect(0, y0, W, y1 - y0, c);
        if (capas[i + 1]) B.dither(0, y1 - 5, W, 5, capas[i + 1][1], 0.5);
      }
      // rayos de luz bajo la superficie
      for (let k = 0; k < 6; k++) { const x0 = 44 + k * 38; for (let y = AGUA; y < 92; y++) B.ditherPx(x0 + ((y - AGUA) * 0.4) | 0, y, C.marClaro, 0.35); }
      // fondo marino
      for (let x = 0; x < W; x++) {
        const fy = fondo(x);
        B.rect(x, fy, 1, H - fy, C.roca);
        for (let y = fy; y < H; y++) if (y > fy + 3) B.ditherPx(x, y, C.noche, Math.min(0.85, (y - fy) / 16));
        if (fy < 135) { B.px(x, fy, C.arena); B.ditherPx(x, fy + 1, C.arenaOscura, 0.8); B.ditherPx(x, fy + 2, C.arenaOscura, 0.4); }
        else B.px(x, fy, C.arenaOscura);
      }
      // rocas y algas en la plataforma del Perú
      for (let k = 0; k < 10; k++) { const x = 48 + ((k * 37) % 84), fy = fondo(x); B.rect(x, fy - 2, 3, 2, C.roca); B.px(x + 1, fy - 3, C.arenaOscura); }
      for (let k = 0; k < 7; k++) { const x = 54 + k * 12, fy = fondo(x); for (let j = 1; j < 7 + (k % 3) * 2; j++) B.px(x + ((j >> 1) & 1), fy - j, j % 3 ? C.fitoOscuro : C.fito); }
      // Andes al fondo
      for (let x = 0; x < 58; x++) {
        const pico = Math.min(Math.abs(x - 10) * 1.1 + 24, Math.abs(x - 34) * 0.9 + 30, Math.abs(x - 50) * 1.2 + 40);
        B.rect(x, Math.round(pico), 1, 50 - Math.round(pico), C.pezOscuro);
        B.dither(x, Math.round(pico) + 3, 1, 50 - Math.round(pico), C.roca, 0.5);
        if (pico < 30) B.rect(x, Math.round(pico), 1, 2, C.hielo);
      }
      // desierto costero y acantilado
      for (let x = 0; x <= 34; x++) {
        const top = x < 26 ? 45 : 45 + Math.round((x - 26) * 2);
        const bot = fondo(x);
        if (top >= bot) continue;
        B.rect(x, top, 1, bot - top, C.arenaOscura);
        B.rect(x, top, 1, 2, C.arena);
        B.dither(x, top + 4, 1, bot - top, C.roca, 0.45);
      }
      // casitas de Chimbote
      [[3, "blanco"], [8, "nino"], [13, "blanco"], [18, "hieloSombra"]].forEach(([x, c], k) => { B.rect(x, 41 - (k % 2), 4, 4 + (k % 2), C[c]); B.px(x + 1, 44, C.hondo); });
      // Antártida: roca con casquete de hielo
      for (let x = COSTA_AN; x < W; x++) {
        const top = x < 290 ? 44 - Math.round((x - COSTA_AN) * 0.5) : 37 + Math.round(Math.sin(x * 0.3) * 1.5);
        const bot = fondo(x);
        B.rect(x, top, 1, bot - top, C.roca);
        B.dither(x, top + 6, 1, bot - top, C.noche, 0.4);
        B.rect(x, top, 1, 4 + ((x * 7) % 3), C.hielo);
        B.px(x, top, C.blanco);
        B.ditherPx(x, top + 4, C.hieloSombra, 0.7);
      }
      B.sprite(S.base, S.base.w > 12 ? 289 : 290, S.base.w > 12 ? 37 - S.base.h : 31);
      if (S.base.w <= 12) { B.rect(301, 27, 1, 9, C.gris); B.rect(302, 27, 1, 3, C.rojo); B.rect(303, 27, 1, 3, C.blanco); B.rect(304, 27, 1, 3, C.rojo); }
      // estrellas fijas
      semilla = 3;
      for (let k = 0; k < 40; k++) { const x = (azar() * W) | 0, y = (azar() * 34) | 0; if (x > 140 && x < 156 && y < 18) continue; B.px(x, y, azar() > 0.7 ? C.niebla : C.gris); }
      base.set(B.buf);
    })();

    /* ---------- estado ---------- */
    const V = {};
    for (const id of Object.keys(RANGO)) V[id] = { v: 0, obj: 0, conocido: false, etiqueta: "", dir: "" };
    let especie = "anchoveta", tiempo = 0, ultimo = 0, corriendo = false, activo = false, sucio = true;
    let hover = null, banner = null, numeros = {}, guia = null;
    const estados = {}; // id -> 'nuevo' | 'escaneando' | 'visto' | 'revelado' | 'bloqueado'

    semilla = 21;
    const FITO = {
      cn: Array.from({ length: 80 }, () => ({ x: 34 + azar() * 118, y: AGUA + 1 + azar() ** 1.8 * 38, f: azar() * 6.28, g: azar() * 6.28, k: azar() })),
      rj: Array.from({ length: 80 }, () => ({ x: 168 + azar() * 96, y: AGUA + 1 + azar() ** 1.8 * 38, f: azar() * 6.28, g: azar() * 6.28, k: azar() })),
    };
    const KRIL = Array.from({ length: 5 }, () => ({ x: 182 + azar() * 66, y: 104 + azar() * 30, f: azar() * 6.28 }));
    const TEMPLOS = Array.from({ length: 14 }, (_, i) => ({ d: 6 + i * 4 + azar() * 3, w: 4 + ((azar() * 5) | 0), f: azar() * 6.28 }));
    const PINGUINOS = [6, 13, 19];
    const SLOTS_CONCHA = Array.from({ length: 18 }, (_, i) => 54 + ((i * 29) % 86) + azar() * 2).map((x) => ({ x: Math.round(x), y: fondo(Math.round(x) + 5) - S.concha.h + 1 }));
    let peces = [], conchas = [], objPeces = 20, objConchas = 12;
    let fx = [], textos = [];
    let sat = null; const cola = [];
    const viento = Array.from({ length: 14 }, () => ({ x: 176 + azar() * 144, y: 6 + azar() * 34, l: 5 + ((azar() * 8) | 0), v: 0.7 + azar() * 0.6 }));

    /* ---------- utilidades ---------- */
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function ola(x) {
      const fuerza = V.sam.conocido && x > 168 ? 1 + Math.max(0, V.sam.v) * 1.3 : 1;
      return SUP + Math.round((Math.sin(x * 0.16 + tiempo * 2.1) + Math.sin(x * 0.05 - tiempo * 1.3) * 0.7) * fuerza);
    }
    const bordeHielo = () => Math.round(256 - V.hielo.v * 12);
    function marca(id) {
      if (id === "hielo") return { x: clamp(bordeHielo() - 6, 232, 250), y: 64 };
      return { sam: { x: 204, y: 15 }, chl_rj: { x: 176, y: 66 }, tsm_rj: { x: 220, y: 94 }, nino12: { x: 36, y: 64 }, chl_cn: { x: 100, y: 64 }, tsm_cn: { x: 62, y: 100 } }[id];
    }
    function zona(id) {
      if (id === "hielo") { const e = bordeHielo(); return { x: e - 28, y: 42, w: COSTA_AN - e + 34, h: 26 }; }
      return ZONAS[id];
    }

    /* ---------- peces y conchas ---------- */
    function nuevoPez(llega) {
      const a = azar() * 6.28, r = Math.sqrt(azar());
      return {
        ox: Math.cos(a) * r * 38, oy: Math.sin(a) * r * 14, f: azar() * 6.28,
        x: llega ? 160 + azar() * 20 : 90, y: llega ? 140 + azar() * 16 : 94, dir: llega ? -1 : 1, estado: llega ? "llega" : "ok",
      };
    }
    function ajustarPeces(n, animar) {
      const vivos = peces.filter((p) => p.estado !== "va");
      if (!animar) { peces = Array.from({ length: n }, () => nuevoPez(false)); peces.forEach((p) => { p.x = 90 + p.ox; p.y = 94 + p.oy; }); return; }
      if (n > vivos.length) for (let i = vivos.length; i < n; i++) { const p = nuevoPez(true); p.retraso = (i - vivos.length) * 0.05; peces.push(p); }
      else for (let i = n; i < vivos.length; i++) { vivos[i].estado = "va"; vivos[i].retraso = (i - n) * 0.04; }
    }
    function ajustarConchas(n, animar) {
      const vivas = conchas.filter((c) => c.estado !== "va");
      if (!animar) { conchas = SLOTS_CONCHA.slice(0, n).map((s) => ({ ...s, estado: "ok", t: 0 })); return; }
      if (n > vivas.length) {
        const usados = new Set(vivas.map((c) => c.x));
        const libres = SLOTS_CONCHA.filter((s) => !usados.has(s.x));
        for (let i = 0; i < n - vivas.length && i < libres.length; i++) conchas.push({ ...libres[i], estado: "llega", t: -i * 0.08 });
      } else for (let i = n; i < vivas.length; i++) { vivas[i].estado = "va"; vivas[i].t = -(i - n) * 0.06; }
    }

    /* ---------- dibujo ---------- */
    function dibujar() {
      const b = L.buf;
      b.set(base);
      const t = tiempo;
      // estrellas que titilan
      for (let k = 0; k < 6; k++) { const x = (k * 53 + 11) % W, y = (k * 7 + 3) % 30; if (((t * 2 + k) | 0) % 3 === 0) L.px(x, y, C.blanco); }
      // viento del oeste (SAM)
      const nV = V.sam.conocido ? clamp(Math.round(7 + V.sam.v * 9), 1, 14) : 3;
      const velV = V.sam.conocido ? 30 + V.sam.v * 26 : 18;
      for (let i = 0; i < nV; i++) {
        const w = viento[i], x = 176 + ((w.x - 176 + t * velV * w.v) % 150);
        const c = V.sam.conocido ? (i % 3 ? C.niebla : C.hielo) : C.gris;
        L.rect(x, w.y, w.l, 1, c);
        if (V.sam.conocido && V.sam.v > 0.3) L.px(x + w.l, w.y - 1, c);
      }
      // nubes
      for (let k = 0; k < 3; k++) { const x = ((k * 120 + t * (3 + k)) % 380) - 40, y = 24 + k * 6; L.rect(x, y, 16 + k * 4, 2, C.pezOscuro); L.rect(x + 3, y - 2, 8 + k * 2, 2, C.pezOscuro); L.dither(x, y + 2, 16 + k * 4, 1, C.pezOscuro, 0.5); }

      // olas
      const calido = V.nino12.conocido && V.nino12.v > 0.5;
      for (let x = COSTA_PE; x < COSTA_AN; x++) {
        const ys = ola(x);
        L.rect(x, ys, 1, AGUA + 1 - ys, C.marClaro);
        L.px(x, ys, calido && x < 166 ? C.sol : C.celeste);
        if (((x * 13 + ((t * 6) | 0)) % 23) === 0) L.px(x, ys, C.blanco);
      }
      // temperatura del mar: tinte cálido (naranja) o frío (celeste)
      tinte("nino12", 30, 0, 136, 72, true);
      tinte("tsm_cn", 34, 72, 96, 34);
      tinte("tsm_rj", 168, 62, 96, 40);

      // fitoplancton
      fito("cn", V.chl_cn); fito("rj", V.chl_rj);
      // kril (decorado)
      KRIL.forEach((k) => L.sprite(S.kril, k.x + Math.sin(t * 1.2 + k.f) * 4, k.y + Math.sin(t * 2 + k.f) * 2, Math.cos(t * 1.2 + k.f) < 0));

      // corriente de Humboldt: flechas hacia el norte (hacia el Perú)
      for (let k = 0; k < 8; k++) {
        const x = 262 - ((k * 16 + t * 14) % 128);
        L.texto("<", x, 132, C.marMedio);
      }
      L.texto("CORRIENTE DE HUMBOLDT", 166, 142, C.marClaro, C.hondo);

      // anchoveta o conchas
      dibujarPeces();
      dibujarConchas();

      // hielo marino antártico
      dibujarHielo();

      // barcos
      L.sprite(S.bolichera, 58, ola(70) - S.bolichera.h + 3);
      L.sprite(S.buque, 186, ola(203) - S.buque.h + 4);

      // etiquetas
      L.texto("PERÚ", 4, 4, C.hielo, C.abismo);
      L.texto("CHIMBOTE", 2, 34, C.arena, C.abismo);
      L.texto("ANTÁRTIDA", W - anchoTexto("ANTÁRTIDA") - 4, 4, C.hielo, C.abismo);
      L.texto("REY JORGE", 281, 50, C.hieloSombra, C.abismo);
      for (let x = 24; x < 280; x += 4) if (x > 26 && x < 268 && (x < 140 || x > 160)) L.px(x, 6, C.pezOscuro);

      // satélite
      dibujarSatelite();
      // recuadros de señales
      for (const id of Object.keys(RANGO)) dibujarMarca(id);
      dibujarGuia();

      // efectos
      for (const p of fx) L.rect(p.x, p.y, p.s, p.s, p.c);
      for (const s of textos) L.texto(s.txt, s.x - anchoTexto(s.txt, s.e) / 2, s.y, s.c, C.abismo, s.e);
      if (banner) {
        const e = 3, tw = anchoTexto(banner.txt, e);
        const k = quieto ? 1 : clamp(banner.t / 0.25, 0, 1) * clamp((banner.dur - banner.t) / 0.25, 0, 1);
        const alto = Math.round(26 * k);
        if (alto > 0) {
          L.rect(0, 74 - alto / 2, W, alto, C.abismo);
          L.rect(0, 74 - alto / 2, W, 1, C.sol); L.rect(0, 74 + alto / 2 - 1, W, 1, C.sol);
          if (k > 0.8) L.texto(banner.txt, (W - tw) / 2, 67, C.hielo, C.marMedio, e);
        }
      }
      L.volcar();
    }

    function tinte(id, x, y, w, h, desdeOla) {
      const s = V[id];
      if (!s.conocido) return;
      const r = s.v / RANGO[id];
      if (Math.abs(r) < 0.06) return;
      const color = r > 0 ? C.nino : C.celeste, d = r > 0 ? clamp(r, 0, 1) * 0.5 : clamp(-r, 0, 1) * 0.32;
      for (let xx = x; xx < x + w; xx++) {
        const y0 = desdeOla ? ola(xx) + 1 : y;
        const y1 = desdeOla ? h : y + h;
        // el tinte se desvanece hacia los bordes y en forma ondulada
        const onda = Math.sin(xx * 0.21 + tiempo * 0.8) * 3;
        for (let yy = y0; yy < y1; yy++) {
          const bx = Math.min(xx - x, x + w - xx) / 12;
          const by = desdeOla ? 1 - (yy - y0) / (y1 - y0 + 1) * 0.5 : Math.min(yy - y - onda, y + h - yy + onda) / 10;
          L.ditherPx(xx, yy, color, d * clamp(Math.min(bx, by), 0, 1));
        }
      }
    }

    function fito(z, s) {
      const n = s.conocido ? clamp(Math.round(36 * (1 + s.v / 55)), 4, 80) : 30;
      const ps = FITO[z];
      for (let i = 0; i < n; i++) {
        const p = ps[i], x = p.x + Math.sin(tiempo * 0.5 + p.f) * 2.5, y = p.y + Math.sin(tiempo * 0.8 + p.g) * 1.2;
        let c;
        if (!s.conocido) c = (i & 1) ? C.gris : C.pezOscuro;
        else c = p.k > 0.8 && ((tiempo * 3 + p.f) | 0) % 4 === 0 ? C.fitoClaro : p.k > 0.4 ? C.fito : C.fitoClaro;
        L.px(x, y, c);
        if (s.conocido && p.k > 0.9) L.px(x + 1, y, C.fitoOscuro);
      }
    }

    function dibujarPeces() {
      if (especie !== "anchoveta") {
        // pocos peces de decorado
        for (let i = 0; i < 4; i++) { const x = 66 + Math.sin(tiempo * 0.6 + i) * 30 + i * 10, y = 82 + Math.sin(tiempo + i * 2) * 4 + (i % 3) * 6; L.sprite(S.pez, x, y, Math.cos(tiempo * 0.6 + i) < 0); }
        return;
      }
      for (const p of peces) {
        if (p.oculto) continue;
        L.sprite(S.pez, p.x, p.y, p.dir < 0);
      }
    }
    function dibujarConchas() {
      if (especie !== "concha") return;
      for (const c of conchas) {
        if (c.t < 0) { if (c.estado === "va") L.sprite(S.concha, c.x, c.y); continue; }
        if (c.estado === "llega") {
          const sube = Math.round((1 - clamp(c.t / 0.5, 0, 1)) * 5);
          L.sprite(S.concha, c.x, c.y + sube);
          L.rect(c.x - 1, c.y + S.concha.h, S.concha.w + 2, 2, C.roca);
          if (((c.t * 10) | 0) % 2 === 0) L.px(c.x + (S.concha.w >> 1), c.y - 3 - ((c.t * 20) | 0) % 6, C.celeste);
        } else if (c.estado === "va") {
          if (((c.t * 12) | 0) % 2 === 0) L.sprite(S.concha, c.x, c.y, false, C.gris);
        } else L.sprite(S.concha, c.x, c.y);
      }
    }

    function dibujarHielo() {
      const e = bordeHielo();
      for (let x = e; x < COSTA_AN + 2; x++) {
        const top = 51 + ((x * 7) % 3 === 0 ? 1 : 0), bot = 66;
        L.rect(x, top, 1, AGUA - top, C.hielo);
        L.px(x, top, C.blanco);
        L.dither(x, top + 4, 1, AGUA - top - 4, C.hieloSombra, 0.5);
        L.dither(x, AGUA, 1, bot - AGUA, C.celeste, 0.6);
      }
      L.rect(e, 52, 1, AGUA - 52, C.hieloSombra); L.rect(e + 1, 53, 1, AGUA - 53, C.hieloSombra);
      // témpanos sueltos: más hielo, más témpanos
      const n = V.hielo.conocido ? clamp(Math.round(6 + V.hielo.v * 5), 0, 14) : 5;
      for (let i = 0; i < n; i++) {
        const tp = TEMPLOS[i], x = e - tp.d, y = ola(x) - 1;
        if (x < 166) continue;
        L.rect(x, y, tp.w, 2, C.hielo); L.px(x, y, C.blanco); L.rect(x + 1, y + 2, tp.w - 1, 1, C.celeste);
      }
      PINGUINOS.forEach((d, i) => L.sprite(S.pinguino, e + d, 52 - S.pinguino.h + (i === 1 && ((tiempo * 2) | 0) % 5 === 0 ? -1 : 0)));
    }

    function dibujarSatelite() {
      if (!sat) return;
      const sx = Math.round(sat.x), sy = 1, mx = sx + (S.satelite.w >> 1);
      if (sat.estado === "escaneo" && sat.job) {
        const z = zona(sat.job.id), k = clamp(sat.t / 0.8, 0, 1);
        const top = sy + S.satelite.h, bot = z.y + z.h;
        for (let y = top; y < bot; y++) {
          const f = (y - top) / Math.max(1, z.y - top);
          const x0 = f < 1 ? mx - f * (mx - z.x) : z.x, x1 = f < 1 ? mx + f * (z.x + z.w - mx) : z.x + z.w;
          for (let x = Math.round(x0); x <= Math.round(x1); x++) L.ditherPx(x, y, C.celeste, y < z.y ? 0.18 : 0.12);
        }
        const ly = Math.round(z.y + k * z.h);
        L.rect(z.x, ly, z.w, 1, C.fitoClaro);
        const esq = (x, y, dx, dy) => { L.rect(x, y, 4 * dx || 1, 1, C.sol); L.rect(x, y, 1, 4 * dy || 1, C.sol); };
        esq(z.x, z.y, 1, 1); L.rect(z.x + z.w - 4, z.y, 4, 1, C.sol); L.rect(z.x + z.w - 1, z.y, 1, 4, C.sol);
        L.rect(z.x, z.y + z.h - 1, 4, 1, C.sol); L.rect(z.x, z.y + z.h - 4, 1, 4, C.sol);
        L.rect(z.x + z.w - 4, z.y + z.h - 1, 4, 1, C.sol); L.rect(z.x + z.w - 1, z.y + z.h - 4, 1, 4, C.sol);
      }
      L.sprite(S.satelite, sx, sy);
      if (((tiempo * 4) | 0) % 2 === 0) L.px(mx, sy, C.rojo);
    }

    function dibujarMarca(id) {
      const m = marca(id), st = estados[id] || "nuevo";
      if (st === "oculto") return;
      const n = numeros[id];
      const parpadeo = ((tiempo * 3) | 0) % 2 === 0;
      let borde = C.celeste, fondoC = C.hondo, num = C.blanco;
      if (st === "visto") { borde = C.fito; num = C.fitoClaro; }
      else if (st === "revelado") { borde = C.gris; num = C.niebla; }
      else if (st === "bloqueado") { borde = C.pezOscuro; num = C.gris; }
      else if (st === "escaneando") { borde = parpadeo ? C.sol : C.nino; }
      if ((hover === id || guia === id) && st === "nuevo") { borde = guia === id && !parpadeo ? C.nino : C.sol; fondoC = C.mar; }
      // insignia: ícono de la señal dentro de un marco, en el lugar del mar que mide
      L.rect(m.x + 1, m.y + 1, M, M, C.abismo);
      L.rect(m.x, m.y, M, M, borde); L.rect(m.x + 1, m.y + 1, M - 2, M - 2, fondoC);
      const ico = ICONOS[ICONO_DE[id]];
      if (ico) L.sprite(ico, m.x + 2, m.y + 2, false, st === "bloqueado" ? C.gris : 0);
      // al lado: número y nombre corto; debajo, "?" o la flecha con el valor leído
      const nombre = `${n} ${CORTOS[id]}`, et = V[id].etiqueta, leido = (st === "visto" || st === "revelado") && et;
      const dir = V[id].dir;
      const ancho = Math.max(anchoTexto(nombre), leido ? anchoTexto(et) + (S.flecha ? 9 : 0) : 4);
      let x = m.x + M + 2; if (x + ancho > W - 2) x = m.x - ancho - 3;
      L.rect(x - 1, m.y + 1, ancho + 2, 15, C.abismo);
      L.texto(nombre, x, m.y + 2, st === "bloqueado" ? C.gris : C.hielo);
      if (leido) {
        let tx = x;
        if (S.flecha && dir) { L.sprite(S.flecha[dir], x, m.y + 8); tx += 9; }
        L.texto(et, tx, m.y + 9, st === "visto" ? C.fitoClaro : C.niebla);
      } else if (st === "nuevo" && (parpadeo || quieto)) L.texto("?", x, m.y + 9, C.sol);
      else if (st === "escaneando") L.texto("...", x, m.y + 9, C.sol);
      if (hover === id && st === "nuevo") {
        const nom = NOMBRES_CORTOS[id], tw = anchoTexto(nom);
        let x = clamp(m.x + 4 - tw / 2, 2, W - tw - 2);
        const y = m.y > 30 ? m.y - 9 : m.y + M + 3;
        L.rect(x - 2, y - 2, tw + 4, 9, C.abismo); L.rect(x - 2, y - 2, tw + 4, 1, C.sol);
        L.texto(nom, x, y, C.hielo);
      }
    }
    const CORTOS = { hielo: "HIELO", sam: "VIENTO", chl_rj: "FITO", tsm_rj: "TEMP", nino12: "NIÑO", chl_cn: "FITO", tsm_cn: "TEMP" };
    /* guía de la primera ronda: flecha que rebota sobre la señal que conviene mirar */
    function dibujarGuia() {
      if (!guia || estados[guia] !== "nuevo") return;
      const m = marca(guia), b = quieto ? 0 : Math.round(Math.abs(Math.sin(tiempo * 5)) * 3);
      const txt = "TOCA AQUÍ", tw = anchoTexto(txt);
      const abajo = m.y < 24; // si no hay lugar arriba, la flecha va debajo y apunta hacia arriba
      const cx = m.x + (M >> 1);
      const ay = abajo ? m.y + M + 3 + b : m.y - 9 - b;
      for (let k = 0; k < 4; k++) L.rect(cx - k, abajo ? ay + k : ay + 3 - k, 2 * k + 1, 1, C.sol);
      const tx = clamp(cx - tw / 2, 2, W - tw - 2), ty = abajo ? ay + 6 : ay - 8;
      L.rect(tx - 2, ty - 2, tw + 4, 9, C.abismo);
      L.texto(txt, tx, ty, C.sol);
    }
    const NOMBRES_CORTOS = { hielo: "HIELO MARINO", sam: "VIENTOS DEL OESTE", chl_rj: "FITOPLANCTON REY JORGE", tsm_rj: "TEMPERATURA REY JORGE", nino12: "EL NIÑO COSTERO", chl_cn: "FITOPLANCTON CHIMBOTE", tsm_cn: "TEMPERATURA CHIMBOTE" };

    /* ---------- actualización ---------- */
    function actualizar(dt) {
      const k = quieto ? 1 : Math.min(1, dt * 3);
      let mueve = false;
      for (const id in V) { const s = V[id]; if (Math.abs(s.obj - s.v) > 0.001) { const antes = bordeHielo(); s.v += (s.obj - s.v) * k; mueve = true; if (id === "hielo" && bordeHielo() > antes && !quieto) for (let i = 0; i < 2; i++) fx.push({ x: bordeHielo() + azar() * 3, y: 56 + azar() * 4, vx: 0, vy: 10, c: C.celeste, s: 1, vida: 0.6 }); } }
      // peces
      const cx = 88 + Math.sin(tiempo * 0.35) * 26, cy = 94 + Math.sin(tiempo * 0.7) * 8;
      for (const p of peces) {
        let espera = false;
        if (p.retraso > 0) { p.retraso -= dt; espera = true; if (p.estado === "llega") { p.oculto = true; continue; } }
        p.oculto = false;
        if (p.estado === "va" && !espera) {
          if (quieto) { p.fuera = true; continue; }
          p.x += 46 * dt; p.y += 22 * dt; p.dir = 1;
          if (p.x > 176 || p.y > 158) p.fuera = true;
          continue;
        }
        const hx = cx + p.ox + Math.sin(tiempo * 1.7 + p.f) * 3, hy = cy + p.oy + Math.sin(tiempo * 2.3 + p.f) * 1.5;
        const f = quieto ? 1 : Math.min(1, dt * (p.estado === "llega" ? 1.3 : 2.2));
        const dx = (hx - p.x) * f;
        p.x += dx; p.y += (hy - p.y) * f;
        if (Math.abs(dx) > 0.05) p.dir = dx > 0 ? 1 : -1;
        if (p.estado === "llega" && Math.abs(hx - p.x) < 2) p.estado = "ok";
      }
      peces = peces.filter((p) => !p.fuera);
      for (const c of conchas) { c.t += dt; if (c.estado === "llega" && c.t > 0.6) c.estado = "ok"; if (c.estado === "va" && (c.t > 0.7 || quieto)) c.fuera = true; }
      conchas = conchas.filter((c) => !c.fuera);
      // efectos
      for (const p of fx) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.vida -= dt; }
      fx = fx.filter((p) => p.vida > 0 && p.y < H);
      for (const s of textos) { if (!quieto) s.y -= 10 * dt; s.vida -= dt; }
      textos = textos.filter((s) => s.vida > 0);
      if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }
      // satélite
      if (!sat && cola.length) { sat = { x: -S.satelite.w, estado: "ida", job: cola.shift(), t: 0 }; Sonido.tocar("mirar"); }
      if (sat) {
        if (sat.estado === "ida") {
          const tx = clamp(marca(sat.job.id).x + (M >> 1) - (S.satelite.w >> 1), 2, W - S.satelite.w - 2), paso = 260 * dt;
          if (Math.abs(tx - sat.x) <= paso) { sat.x = tx; sat.estado = "escaneo"; sat.t = 0; Sonido.tocar("escaneo"); }
          else sat.x += Math.sign(tx - sat.x) * paso;
        } else if (sat.estado === "escaneo") {
          sat.t += dt;
          if (sat.t >= 0.8) {
            aplicar(sat.job);
            if (cola.length) { sat.job = cola.shift(); sat.estado = "ida"; }
            else { sat.estado = "salida"; sat.job = null; }
          }
        } else { sat.x += 260 * dt; if (sat.x > W + S.satelite.w) sat = null; }
      }
      return mueve;
    }

    function aplicar(job) {
      const s = V[job.id];
      s.conocido = true; s.obj = job.valor; s.etiqueta = job.etiqueta || ""; s.dir = job.dir || "";
      if (quieto) s.v = job.valor;
      estados[job.id] = job.estado || "visto";
      Sonido.tocar("lectura");
      job.resolver && job.resolver();
    }

    function cuadro(ahora) {
      if (!corriendo) return;
      const dt = Math.min(0.05, (ahora - (ultimo || ahora)) / 1000);
      ultimo = ahora;
      tiempo += dt;
      actualizar(dt);
      dibujar();
      if (quieto && !sat && !cola.length && !banner && !textos.length && !fx.length) { corriendo = false; return; }
      requestAnimationFrame(cuadro);
    }
    function pedir() {
      if (!activo) return;
      if (!corriendo) { corriendo = true; ultimo = 0; requestAnimationFrame(cuadro); }
    }

    /* ---------- interacción con el mouse y el toque ---------- */
    function idEn(ev) {
      const r = canvas.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * W, y = ((ev.clientY - r.top) / r.height) * H;
      let mejor = null, d = 1e9;
      for (const id of Object.keys(RANGO)) {
        const m = marca(id), dx = x - (m.x + M / 2), dy = y - (m.y + M / 2), dd = dx * dx + dy * dy;
        if (Math.abs(dx) < M * 0.75 && Math.abs(dy) < M * 0.75 && dd < d) { d = dd; mejor = id; }
      }
      return mejor;
    }
    canvas.addEventListener("pointermove", (ev) => {
      const id = idEn(ev);
      if (id !== hover) { hover = id; canvas.style.cursor = id && estados[id] === "nuevo" ? "pointer" : "default"; alHover && alHover(id); pedir(); if (quieto) dibujar(); }
    });
    canvas.addEventListener("pointerleave", () => { hover = null; pedir(); if (quieto) dibujar(); });
    canvas.addEventListener("click", (ev) => { const id = idEn(ev); if (id && alMarcador) alMarcador(id); });

    /* ---------- API ---------- */
    return {
      activar(si) { activo = si; if (si) { pedir(); dibujar(); } },
      nuevaRonda({ especie: esp, fraccion, numeros: nums, banner: txt }) {
        especie = esp; numeros = nums;
        cola.length = 0; sat = sat ? { ...sat, estado: "salida", job: null } : null;
        for (const id in V) Object.assign(V[id], { v: 0, obj: 0, conocido: false, etiqueta: "", dir: "" });
        for (const id in V) estados[id] = "nuevo";
        fx = []; textos = [];
        if (esp === "anchoveta") { objPeces = Math.round(3 + 27 * fraccion); ajustarPeces(objPeces, false); conchas = []; }
        else { objConchas = Math.round(3 + 15 * fraccion); ajustarConchas(objConchas, false); peces = []; }
        if (txt) banner = { txt, t: 0, dur: quieto ? 0.9 : 1.3 };
        pedir(); dibujar();
      },
      guia(id) { guia = id || null; pedir(); if (quieto) dibujar(); },
      estado(id, st) { estados[id] = st; pedir(); if (quieto) dibujar(); },
      escanear(id, valor, etiqueta, dir) {
        return new Promise((resolver) => {
          estados[id] = "escaneando";
          const job = { id, valor, etiqueta, dir, resolver };
          if (quieto) { aplicar(job); dibujar(); return; }
          cola.push(job); pedir();
        });
      },
      /* al confirmar: termina los escaneos pendientes y muestra todo */
      revelarTodo(lista) {
        while (cola.length) aplicar(cola.shift());
        if (sat && sat.job) { aplicar(sat.job); sat.job = null; sat.estado = "salida"; }
        for (const { id, valor, etiqueta, dir, visto } of lista) if (!V[id].conocido) aplicar({ id, valor, etiqueta, dir, estado: visto ? "visto" : "revelado" });
        pedir(); if (quieto) dibujar();
      },
      captura(fraccion) {
        if (especie === "anchoveta") { objPeces = Math.round(3 + 27 * fraccion); ajustarPeces(objPeces, !quieto); }
        else { objConchas = Math.round(3 + 15 * fraccion); ajustarConchas(objConchas, !quieto); }
        pedir(); if (quieto) { actualizar(0); dibujar(); }
      },
      celebrar(txt) {
        textos.push({ txt, x: W / 2, y: 60, c: C.fitoClaro, e: 2, vida: quieto ? 1.6 : 1.8 });
        if (!quieto) for (let i = 0; i < 90; i++) {
          const cs = [C.sol, C.fitoClaro, C.celeste, C.nino, C.blanco, C.rojo];
          fx.push({ x: W / 2 + (azar() - 0.5) * 40, y: 50, vx: (azar() - 0.5) * 220, vy: -60 - azar() * 120, g: 160, c: cs[i % cs.length], s: 1 + (i % 3 === 0 ? 1 : 0), vida: 1.6 + azar() });
        }
        pedir();
        if (quieto) { dibujar(); setTimeout(() => pedir(), 1700); }
      },
      fallar(txt) {
        textos.push({ txt, x: W / 2, y: 60, c: C.rojo, e: 2, vida: quieto ? 1.6 : 1.8 });
        pedir();
        if (quieto) { dibujar(); setTimeout(() => pedir(), 1700); }
      },
      get quieto() { return quieto; },
    };
  }

  window.EscenaPixel = Escena;
})();
