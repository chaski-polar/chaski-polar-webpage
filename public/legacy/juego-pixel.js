/* Motor pixel del juego: paleta, letras 3x5, sprites, sonido 8-bit y voxels.
   Todo se dibuja por código para que funcione con doble clic (protocolo file:). */
(function () {
  /* ---------- paleta (24 colores) ---------- */
  const PAL = {
    abismo: "#050f1f", noche: "#0a1a33", hondo: "#0d2747", mar: "#123a66",
    marMedio: "#1b5a8c", marClaro: "#2a86b8", celeste: "#63cde8", hielo: "#eaf6fa",
    hieloSombra: "#a9d3e6", blanco: "#ffffff", fito: "#3fc28c", fitoClaro: "#9be86a",
    fitoOscuro: "#1e7a5a", nino: "#f08a4b", ninoOscuro: "#c4502a", sol: "#f2d14c",
    arena: "#d9b26f", arenaOscura: "#9c7444", roca: "#5a4a46", gris: "#6f8ea3",
    niebla: "#a3bccb", rojo: "#e0474c", plata: "#c8dbe6", pezOscuro: "#4f7396",
  };
  const RGB = {}, C = {};
  for (const k in PAL) {
    const n = parseInt(PAL[k].slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    RGB[k] = [r, g, b];
    C[k] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; // RGBA en little-endian
  }
  const LISTA = Object.keys(PAL).map((k) => RGB[k]);
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  /* ---------- letras 3x5 (las acentuadas usan una fila extra arriba) ---------- */
  const G = {
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
    E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
    I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
    M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
    Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
    U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
    Y: "101101010010010", Z: "111001010100111",
    0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110",
    4: "101101111001001", 5: "111100110001110", 6: "011100111101111", 7: "111001010010010",
    8: "111101111101111", 9: "111101111001110",
    "?": "110001010000010", "+": "000010111010000", "-": "000000111000000", ".": "000000000000010",
    ",": "000000000010100", "%": "101001010100101", ":": "000010000010000", "!": "010010010000010",
    "°": "010101010000000", "<": "001010100010001", ">": "100010001010100", " ": "000000000000000",
    "/": "001001010100100", "=": "000111000111000", "(": "010100100100010", ")": "010001001001010",
  };
  const ACENTO = { "Á": ["001", "A"], "É": ["001", "E"], "Í": ["001", "I"], "Ó": ["001", "O"], "Ú": ["001", "U"], "Ñ": ["111", "N"] };
  function glifo(ch) {
    if (ACENTO[ch]) { const [a, base] = ACENTO[ch]; return { filas: [a, ...partir(G[base])], arriba: 1 }; }
    const g = G[ch] || G["?"];
    return { filas: partir(g), arriba: 0 };
  }
  function partir(s) { return [s.slice(0, 3), s.slice(3, 6), s.slice(6, 9), s.slice(9, 12), s.slice(12, 15)]; }
  const anchoTexto = (s, e = 1) => (s.length * 4 - 1) * e;

  /* ---------- sprites ---------- */
  function sprite(filas, mapa) {
    const h = filas.length, w = filas[0].length, data = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = filas[y][x];
      data[y * w + x] = ch === "." ? 0 : C[mapa[ch]];
    }
    return { w, h, data, filas, mapa };
  }

  const S = {
    satelite: sprite([
      "......n......",
      "bbbb..s..bbbb",
      "bcbc.sws.bcbc",
      "bcbcssrssbcbc",
      "bcbc.sws.bcbc",
      "bbbb..s..bbbb",
    ], { b: "marMedio", c: "celeste", s: "plata", w: "blanco", r: "rojo", n: "sol" }),
    pez: sprite([
      "d..ddd..",
      "dddppppw",
      "d..ppp..",
    ], { d: "pezOscuro", p: "plata", w: "blanco" }),
    concha: sprite([
      ".nnnnn.",
      "nonnnon",
      "nonnnon",
      ".nonon.",
      "..rrr..",
    ], { n: "nino", o: "ninoOscuro", r: "arena" }),
    bolichera: sprite([
      "......m.........",
      "......m.........",
      "....hhhh........",
      "....hwwh....m...",
      "rrrrrrrrrrrrrrr.",
      ".rrrrrrrrrrrrr..",
      "..kkkkkkkkkkk...",
    ], { m: "gris", h: "blanco", w: "celeste", r: "rojo", k: "roca" }),
    buque: sprite([
      "..........n.........",
      "..........m.........",
      "........wwwww.......",
      "......wwcwcww...o...",
      "..wwwwwwwwwwwwwwo...",
      "rrrrrrrrrrrrrrrrrrr.",
      ".rrrrrrrrrrrrrrrrr..",
      "..kkkkkkkkkkkkkkk...",
    ], { n: "sol", m: "gris", w: "blanco", c: "marClaro", o: "nino", r: "rojo", k: "roca" }),
    base: sprite([
      "....ww....",
      "..wwwwww..",
      ".nnnnnnnn.",
      ".nkknnkkn.",
      ".nnnnnnnn.",
    ], { w: "blanco", n: "nino", k: "hondo" }),
    pinguino: sprite([
      ".k.",
      "kwk",
      "kwk",
      "s.s",
    ], { k: "abismo", w: "blanco", s: "sol" }),
    kril: sprite(["rn."], { r: "rojo", n: "nino" }),
  };

  /* iconos 8x8 de las señales y de las especies (para las tarjetas) */
  const ICONOS = {
    hielo: sprite([
      "...c....",
      ".c.c.c..",
      "..ccc...",
      "ccchccc.",
      "..ccc...",
      ".c.c.c..",
      "...c....",
      "........",
    ], { c: "hielo", h: "celeste" }),
    sam: sprite([
      "........",
      "nnnnn...",
      ".....n..",
      "nnnnnn..",
      "........",
      "bbbbbbb.",
      ".......b",
      "bbbbbb..",
    ], { n: "niebla", b: "hielo" }),
    fito: sprite([
      "..g.....",
      ".gfg..g.",
      "..g..gfg",
      "......g.",
      ".g......",
      "gfg..g..",
      ".g..gfg.",
      ".....g..",
    ], { g: "fito", f: "fitoClaro" }),
    temp: sprite([
      "...ww...",
      "..w..w..",
      "..wrrw..",
      "..wrrw..",
      "..wrrw..",
      ".wrrrrw.",
      ".wrrrrw.",
      "..wwww..",
    ], { w: "hielo", r: "rojo" }),
    nino: sprite([
      "...s....",
      ".s.s.s..",
      "..sss...",
      "sss.sss.",
      "..sss...",
      "........",
      "oo..oo..",
      ".oo..oo.",
    ], { s: "sol", o: "nino" }),
    anchoveta: sprite([
      "..........",
      "d...dddd..",
      "dd.dddddd.",
      "ddppppppwk",
      "d..pppppp.",
      "......pp..",
    ], { d: "pezOscuro", p: "plata", w: "blanco", k: "abismo" }),
    concha: S.concha,
  };

  function aURL(spr, escala = 4) {
    const cv = document.createElement("canvas");
    cv.width = spr.w * escala; cv.height = spr.h * escala;
    const cx = cv.getContext("2d");
    for (let y = 0; y < spr.h; y++) for (let x = 0; x < spr.w; x++) {
      const ch = spr.filas[y][x];
      if (ch === ".") continue;
      cx.fillStyle = PAL[spr.mapa[ch]];
      cx.fillRect(x * escala, y * escala, escala, escala);
    }
    return cv.toDataURL();
  }

  /* ---------- lienzo con búfer de píxeles ---------- */
  function Lienzo(canvas) {
    const w = canvas.width, h = canvas.height, ctx = canvas.getContext("2d");
    const img = ctx.createImageData(w, h), buf = new Uint32Array(img.data.buffer);
    const L = {
      w, h, buf,
      px(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < w && y < h) buf[y * w + x] = c; },
      rect(x, y, rw, rh, c) {
        const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0), x1 = Math.min(w, (x + rw) | 0), y1 = Math.min(h, (y + rh) | 0);
        for (let yy = y0; yy < y1; yy++) buf.fill(c, yy * w + x0, yy * w + x1);
      },
      dither(x, y, rw, rh, c, d) {
        if (d <= 0) return;
        const u = d * 16;
        const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0), x1 = Math.min(w, (x + rw) | 0), y1 = Math.min(h, (y + rh) | 0);
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) if (BAYER[(yy & 3) * 4 + (xx & 3)] < u) buf[yy * w + xx] = c;
      },
      ditherPx(x, y, c, d) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < w && y < h && BAYER[(y & 3) * 4 + (x & 3)] < d * 16) buf[y * w + x] = c; },
      sprite(s, x, y, voltear = false, color = 0) {
        x = Math.round(x); y = Math.round(y);
        for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) {
          const c = s.data[j * s.w + (voltear ? s.w - 1 - i : i)];
          if (c) L.px(x + i, y + j, color || c);
        }
      },
      texto(str, x, y, c, sombra = 0, e = 1) {
        x = Math.round(x); y = Math.round(y);
        for (const ch of str.toUpperCase()) {
          const g = glifo(ch);
          g.filas.forEach((f, j) => {
            for (let i = 0; i < 3; i++) if (f[i] === "1") {
              const px = x + i * e, py = y + (j - g.arriba) * e;
              if (sombra) L.rect(px + e, py + e, e, e, sombra);
              L.rect(px, py, e, e, c);
            }
          });
          x += 4 * e;
        }
      },
      volcar() { ctx.putImageData(img, 0, 0); },
    };
    return L;
  }

  /* ---------- sonido 8-bit (empieza en silencio) ---------- */
  const Sonido = (() => {
    let ac = null, activo = false;
    try { activo = localStorage.getItem("marfrio-sonido") === "1"; } catch (_) { activo = false; }
    function contexto() {
      if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ac = new AC(); }
      if (ac.state === "suspended") ac.resume();
      return ac;
    }
    function tono(f, dur, { tipo = "square", vol = 0.05, a = null, cuando = 0 } = {}) {
      if (!activo) return;
      const c = contexto(); if (!c) return;
      const t0 = c.currentTime + cuando, o = c.createOscillator(), g = c.createGain();
      o.type = tipo; o.frequency.setValueAtTime(f, t0);
      if (a) o.frequency.exponentialRampToValueAtTime(a, t0 + dur);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.03);
    }
    const E = {
      clic: () => tono(660, 0.05, { vol: 0.035 }),
      mirar: () => tono(440, 0.1, { a: 880 }),
      escaneo: () => [0, 1, 2, 3].forEach((i) => tono(880 + i * 110, 0.04, { cuando: i * 0.07, vol: 0.03 })),
      lectura: () => tono(1320, 0.08, { tipo: "triangle", vol: 0.08 }),
      acierto: () => [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.13, { cuando: i * 0.09 })),
      fallo: () => { tono(220, 0.3, { a: 98, tipo: "sawtooth", vol: 0.045 }); tono(233, 0.3, { a: 104, tipo: "square", vol: 0.02 }); },
      ronda: () => [392, 523].forEach((f, i) => tono(f, 0.09, { cuando: i * 0.08, vol: 0.04 })),
      final: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tono(f, 0.15, { cuando: i * 0.12 })),
      negado: () => tono(140, 0.15, { vol: 0.05 }),
    };
    return {
      get activo() { return activo; },
      alternar() {
        activo = !activo;
        try { localStorage.setItem("marfrio-sonido", activo ? "1" : "0"); } catch (_) { /* sin almacenamiento */ }
        if (activo) { contexto(); E.clic(); }
        return activo;
      },
      tocar(n) { try { if (E[n]) E[n](); } catch (_) { /* sin audio */ } },
    };
  })();

  /* ---------- voxels: render ortográfico en un canvas chico, cuantizado a la paleta ---------- */
  const RAMPA = {
    blanco: ["blanco", "hielo", "hieloSombra"], hielo: ["hielo", "hieloSombra", "niebla"],
    hieloSombra: ["hieloSombra", "niebla", "gris"], rojo: ["rojo", "ninoOscuro", "roca"],
    nino: ["sol", "nino", "ninoOscuro"], gris: ["niebla", "gris", "pezOscuro"], hondo: ["mar", "hondo", "noche"],
    marClaro: ["celeste", "marClaro", "marMedio"], marMedio: ["marClaro", "marMedio", "mar"], mar: ["marMedio", "mar", "hondo"],
    celeste: ["hielo", "celeste", "marClaro"], fito: ["fitoClaro", "fito", "fitoOscuro"], fitoOscuro: ["fito", "fitoOscuro", "hondo"],
    sol: ["sol", "sol", "nino"], abismo: ["noche", "abismo", "abismo"], roca: ["arenaOscura", "roca", "noche"],
    arena: ["arena", "arenaOscura", "roca"], plata: ["blanco", "plata", "niebla"], pezOscuro: ["gris", "pezOscuro", "mar"],
  };
  const cercano = new Map();
  function aPaleta(r, g, b) {
    const k = (r << 16) | (g << 8) | b;
    let v = cercano.get(k);
    if (v) return v;
    let mejor = 0, d = 1e9;
    for (let i = 0; i < LISTA.length; i++) {
      const q = LISTA[i], e = (q[0] - r) ** 2 + (q[1] - g) ** 2 + (q[2] - b) ** 2;
      if (e < d) { d = e; mejor = i; }
    }
    v = LISTA[mejor];
    cercano.set(k, v);
    return v;
  }

  function Voxel(canvas, { escala = 3, elev = 0.62, cx, cy } = {}) {
    const ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
    const cf = Math.cos(elev), sf = Math.sin(elev);
    cx = cx ?? W / 2; cy = cy ?? H / 2;
    const clave = (x, y, z) => ((x + 128) | ((y + 128) << 8) | ((z + 128) << 16));
    function dibujar(vox, theta) {
      const c = Math.cos(theta), s = Math.sin(theta);
      const hay = new Set();
      for (const v of vox) hay.add(clave(v[0], v[1], v[2]));
      const P = (x, y, z) => { const xr = x * c - z * s, zr = x * s + z * c; return [cx + xr * escala, cy + (-y * cf + zr * sf) * escala]; };
      const orden = vox.map((v) => { const x = v[0] + 0.5, z = v[2] + 0.5, y = v[1] + 0.5 + (v[4] || 0); return [(x * s + z * c) * cf + y * sf, v]; });
      orden.sort((a, b) => a[0] - b[0]);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 0.6; ctx.lineJoin = "miter";
      const cara = (pts, col) => {
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath(); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.fill(); ctx.stroke();
      };
      for (const [, v] of orden) {
        const [X, Y, Z, nom, off = 0] = v, r = RAMPA[nom] || [nom, nom, nom];
        const y0 = Y + off, y1 = Y + 1 + off;
        const lado = (nx) => PAL[nx >= 0 ? r[1] : r[2]];
        if (s > 0.001 && !hay.has(clave(X + 1, Y, Z))) cara([P(X + 1, y0, Z), P(X + 1, y1, Z), P(X + 1, y1, Z + 1), P(X + 1, y0, Z + 1)], lado(c));
        if (s < -0.001 && !hay.has(clave(X - 1, Y, Z))) cara([P(X, y0, Z), P(X, y1, Z), P(X, y1, Z + 1), P(X, y0, Z + 1)], lado(-c));
        if (c > 0.001 && !hay.has(clave(X, Y, Z + 1))) cara([P(X, y0, Z + 1), P(X, y1, Z + 1), P(X + 1, y1, Z + 1), P(X + 1, y0, Z + 1)], lado(-s));
        if (c < -0.001 && !hay.has(clave(X, Y, Z - 1))) cara([P(X, y0, Z), P(X, y1, Z), P(X + 1, y1, Z), P(X + 1, y0, Z)], lado(s));
        if (!hay.has(clave(X, Y + 1, Z))) cara([P(X, y1, Z), P(X + 1, y1, Z), P(X + 1, y1, Z + 1), P(X, y1, Z + 1)], PAL[r[0]]);
      }
      // cuantizar: sin semitransparencias y solo colores de la paleta
      const im = ctx.getImageData(0, 0, W, H), d = im.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
        const a = d[i + 3] / 255, q = aPaleta(Math.round(d[i] / a), Math.round(d[i + 1] / a), Math.round(d[i + 2] / a));
        d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2]; d[i + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
    }
    return { dibujar };
  }

  /* modelos voxel generados por código */
  function agua(t, rx, rz, extra) {
    const out = [];
    for (let x = -rx; x <= rx; x++) for (let z = -rz; z <= rz; z++) {
      if ((x * x) / (rx * rx) + (z * z) / (rz * rz) > 1.05) continue;
      const h = Math.sin(x * 0.55 + t * 1.8) * 0.6 + Math.cos(z * 0.8 + t * 1.3) * 0.5;
      const alto = h > 0.45 ? 0 : -1;
      const col = extra ? extra(x, z, alto) : null;
      out.push([x, -2, z, "mar"]);
      if (alto === 0) out.push([x, -1, z, "marMedio"]);
      out.push([x, alto, z, col || (alto === 0 ? "marClaro" : "marMedio")]);
    }
    return out;
  }

  function modeloBarco(t) {
    const v = [], bob = Math.sin(t * 1.6) * 0.25;
    const add = (x, y, z, c) => v.push([x, y, z, c, bob]);
    for (let x = -10; x <= 10; x++) {
      const ancho = x > 6 ? Math.max(0, 3 - Math.ceil((x - 6) * 0.8)) : x < -9 ? 2 : 3;
      for (let z = -ancho; z <= ancho; z++) {
        add(x, 0, z, Math.abs(z) < ancho || ancho === 0 ? "rojo" : "rojo");
        add(x, 1, z, "rojo");
        add(x, 2, z, Math.abs(z) === ancho || x === 10 || x === -10 ? "blanco" : "gris");
        if (x >= 7) add(x, 3, z, "blanco");
      }
    }
    for (let x = -4; x <= 3; x++) for (let z = -2; z <= 2; z++) for (let y = 3; y <= 5; y++) add(x, y, z, y === 5 && x === 3 ? "hondo" : y === 4 && Math.abs(z) === 2 && x % 2 === 0 ? "hondo" : "blanco");
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) add(x, 6, z, x === 2 ? "hondo" : "blanco");
    for (let z = -3; z <= 3; z++) add(0, 7, z, "blanco");
    for (let y = 7; y <= 10; y++) add(-1, y, 0, "gris");
    add(-1, 11, 0, "sol");
    add(-3, 7, 0, "nino"); add(-3, 8, 0, "nino"); add(-3, 9, 0, "abismo");
    for (let y = 3; y <= 6; y++) { add(-9, y, -2, "nino"); add(-9, y, 2, "nino"); }
    for (let z = -2; z <= 2; z++) add(-9, 7, z, "nino");
    add(5, 3, 1, "nino"); add(5, 4, 1, "nino"); add(6, 5, 1, "nino");
    return v.concat(agua(t, 15, 9, (x, z, alto) => {
      if ((((x * 73 + 11) * (z * 151 + 7)) >>> 0) % 9 === 2 && Math.abs(x) > 10) return "fito";
      if (alto === 0 && ((x + z) & 7) === 0) return "celeste";
      if (Math.abs(z) <= 3 && Math.abs(x) <= 11) return null;
      return null;
    }));
  }

  function modeloIceberg(t) {
    const v = [], bob = Math.sin(t * 1.1) * 0.15;
    // dos picos: uno alto hacia atrás y otro bajo hacia adelante
    const alto = (x, z) => {
      const a = 10 - Math.hypot((x + 2) * 1.1, (z + 1) * 1.3) * 1.5;
      const b = 6 - Math.hypot((x - 3) * 1.2, (z - 2) * 1.2) * 1.3;
      const ruido = (((x * 31 + z * 17) % 3) + 3) % 3 * 0.4;
      return Math.round(Math.max(a, b) + ruido);
    };
    for (let x = -8; x <= 8; x++) for (let z = -6; z <= 6; z++) {
      if ((x * x) / 64 + (z * z) / 36 > 1) continue;
      const h = Math.max(1, alto(x, z));
      for (let y = 0; y < h; y++) {
        const borde = (x * x) / 64 + (z * z) / 36 > 0.7;
        v.push([x, y, z, y >= h - 1 ? "blanco" : borde && y < 2 ? "celeste" : (x + y + z) % 4 === 0 ? "hieloSombra" : "hielo", bob]);
      }
    }
    v.push([4, alto(4, 2), 2, "abismo", bob], [4, alto(4, 2) + 1, 2, "abismo", bob], [5, alto(5, 1), 1, "abismo", bob]);
    const dentro = (x, z) => (x * x) / 64 + (z * z) / 36 <= 1;
    return v.concat(agua(t, 15, 10, (x, z) => { const h = (((x * 73 + 11) * (z * 151 + 7)) >>> 0) % 11; return h === 1 ? "fito" : h === 4 ? "fitoOscuro" : null; }).filter((w) => !(dentro(w[0], w[2]) && w[1] >= -1)));
  }

  /* ---------- sprites de Aseprite (juego-sprites.js, generado desde assets/) ----------
     Si el archivo está, reemplazan a los sprites hechos a mano de arriba; si no, el juego sigue con los viejos. */
  const A = window.PIX_ASSETS;
  if (A) {
    const de = (x) => sprite(x.filas, x.mapa);
    for (const k of ["anchoveta", "cardumen", "concha", "kril", "pinguino", "satelite", "bolichera", "buque", "base"]) if (A[k]) S[k] = de(A[k]);
    if (A.anchoveta) S.pez = S.anchoveta;
    if (A.flechas) S.flecha = { sube: de(A.flechas.sube), baja: de(A.flechas.baja), igual: de(A.flechas.igual) };
    if (A.iconos) for (const k of Object.keys(A.iconos)) ICONOS[k] = de(A.iconos[k]);
    for (const k of ["anchoveta", "cardumen", "concha", "kril", "bolichera", "buque", "satelite", "base", "pinguino"]) if (S[k]) ICONOS[k] = S[k];
    if (S.flecha) Object.assign(ICONOS, S.flecha);
  }

  /* hoja de cuadros (renders de Blender ya pixelados) dibujada en un canvas, un cuadro a la vez */
  function Hoja(canvas, url, cuadros) {
    const ctx = canvas.getContext("2d"), img = new Image();
    let listo = false, f = 0;
    img.onload = () => { listo = true; pintar(); };
    img.src = url;
    function pintar() {
      if (!listo) return;
      const w = img.width / cuadros;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, f * w, 0, w, img.height, Math.round((canvas.width - w) / 2), Math.round((canvas.height - img.height) / 2), w, img.height);
    }
    return { cuadro(n) { f = ((n % cuadros) + cuadros) % cuadros; pintar(); } };
  }

  window.PIX = { PAL, RGB, C, BAYER, S, ICONOS, aURL, Lienzo, Sonido, Voxel, Hoja, modeloBarco, modeloIceberg, anchoTexto };
})();
