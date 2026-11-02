/* Atlas ilustrado para el globo: pinta en un canvas equirectangular una textura plana, tipo mapa de atlas
   (no fotográfica): mar en tonos según la distancia a la costa, tierra con bandas suaves de relieve,
   hielo blanco azulado y costas con una línea fina oscura.
   Lo usan index.html (explorador.js) y prototipos-globo/opcion-b2-atlas-color.html.
   Necesita window.PAISES (paises.js, Natural Earth 1:110m) y, para el relieve, la imagen earth-topology. */
(function () {
  const PALETAS = {
    noche: {
      nombre: "Mar nocturno",
      nota: "Mar azul marino en tres tonos y tierra salvia y ocre. Combina con el fondo oscuro de la página.",
      mar: ["#0a2742", "#11385a", "#1c5278"], marSimple: "#0f3352",
      tierra: ["#5f8069", "#8f9068", "#a08a68", "#cdbfa4"], tierraSimple: "#5f7d68", peru: "#7b9a74",
      hielo: ["#dde9f0", "#c3d5e1"], costa: "#04121f", borde: "rgba(4,18,31,0.35)", atm: "#4a8fbf",
    },
    papel: {
      nombre: "Papel de atlas",
      nota: "Mar celeste claro y tierra color papel, como un atlas escolar impreso. Más luminoso.",
      mar: ["#6f9fbd", "#8fb7cf", "#b4d2e0"], marSimple: "#8db5cd",
      tierra: ["#e3d8b8", "#d2c193", "#b79d72", "#8f7756"], tierraSimple: "#e1d6b6", peru: "#efe3bf",
      hielo: ["#f7fafc", "#dde8ef"], costa: "#3e5463", borde: "rgba(62,84,99,0.35)", atm: "#9cc8e6",
    },
    turquesa: {
      nombre: "Turquesa y arena",
      nota: "Mar turquesa más vivo cerca de la costa y tierra verde y arena. El más colorido, sin llegar a foto.",
      mar: ["#123f60", "#1d5f80", "#2f8a9e"], marSimple: "#1a5576",
      tierra: ["#7fa877", "#bdb27a", "#a7835e", "#e2d7c2"], tierraSimple: "#86ab7d", peru: "#9cc28f",
      hielo: ["#eef6fa", "#cfe1ec"], costa: "#0b2436", borde: "rgba(11,36,54,0.35)", atm: "#5fb3d0",
    },
  };

  const lienzo = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const cargar = (src) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
  const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  const esHielo = (f) => f.properties.c === "Antarctica" || f.properties.n === "Greenland";

  /* proyección equirectangular de una ventana (por defecto, el mundo entero) */
  const ventanaMundo = { lonO: -180, latN: 90, lonE: 180, latS: -90 };
  function trazar(ctx, feats, W, H, v = ventanaMundo) {
    const kx = W / (v.lonE - v.lonO), ky = H / (v.latN - v.latS);
    ctx.beginPath();
    for (const f of feats) {
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const poly of polys) for (const anillo of poly) {
        anillo.forEach(([lo, la], k) => { const x = (lo - v.lonO) * kx, y = (v.latN - la) * ky; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.closePath();
      }
    }
  }

  /* mar: tres tonos según la distancia a la costa (no hay batimetría; se usa un desenfoque de la máscara de tierra).
     El umbral se aplica a la resolución final, así los bordes entre tonos quedan nítidos y no borrosos. */
  function marPorDistancia(pal, w, h, v = ventanaMundo) {
    const feats = window.PAISES.features;
    const grados = v.lonE - v.lonO;
    // máscara de tierra a resolución media (≈0,25° por píxel), luego se desenfoca bajando de tamaño
    const mw = Math.max(16, Math.round(grados * 4)), mh = Math.max(16, Math.round(mw * h / w));
    const m = lienzo(mw, mh), mc = m.getContext("2d");
    mc.fillStyle = "#000"; mc.fillRect(0, 0, mw, mh);
    mc.fillStyle = "#fff"; trazar(mc, feats, mw, mh, v); mc.fill("evenodd");
    const borroso = (gradosPorPx) => {
      const pw = Math.max(2, Math.round(grados / gradosPorPx)), ph = Math.max(2, Math.round(pw * h / w));
      const chico = lienzo(pw, ph), cc = chico.getContext("2d");
      cc.imageSmoothingEnabled = true; cc.imageSmoothingQuality = "high";
      cc.drawImage(m, 0, 0, pw, ph);
      const g = lienzo(w, h), gc = g.getContext("2d");
      gc.imageSmoothingEnabled = true; gc.imageSmoothingQuality = "high"; gc.drawImage(chico, 0, 0, w, h);
      return gc.getImageData(0, 0, w, h).data;
    };
    const cerca = borroso(1.4), medio = borroso(5.6);
    const out = lienzo(w, h), oc = out.getContext("2d"), img = oc.createImageData(w, h), px = img.data;
    const [c0, c1, c2] = pal.mar.map(hex);
    for (let i = 0; i < w * h; i++) {
      const col = cerca[i * 4] > 26 ? c2 : medio[i * 4] > 14 ? c1 : c0;
      px[i * 4] = col[0]; px[i * 4 + 1] = col[1]; px[i * 4 + 2] = col[2]; px[i * 4 + 3] = 255;
    }
    oc.putImageData(img, 0, 0);
    return out;
  }

  /* relieve: pocas bandas planas de altura, como curvas de nivel de un atlas. La altura se amplía con
     suavizado hasta la resolución final y RECIÉN AHÍ se corta en bandas: bordes nítidos y redondeados. */
  function relieve(img, pal, hielo, w, h, v = ventanaMundo) {
    const sx = ((v.lonO + 180) / 360) * img.width, sy = ((90 - v.latN) / 180) * img.height;
    const sw = ((v.lonE - v.lonO) / 360) * img.width, sh = ((v.latN - v.latS) / 180) * img.height;
    const c0 = lienzo(w, h), x0 = c0.getContext("2d");
    x0.imageSmoothingEnabled = true; x0.imageSmoothingQuality = "high";
    x0.filter = `blur(${Math.max(1, (w / sw) * 0.8).toFixed(1)}px)`; // quita el escalonado de la imagen de origen
    x0.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    x0.filter = "none";
    const alt = x0.getImageData(0, 0, w, h).data;
    const out = x0.createImageData(w, h), px = out.data;
    const bandas = hielo ? [hex(pal.hielo[0]), hex(pal.hielo[0]), hex(pal.hielo[1]), hex(pal.hielo[1])] : pal.tierra.map(hex);
    const cortes = [12, 45, 110];
    for (let i = 0; i < w * h; i++) {
      const a = alt[i * 4];
      const col = bandas[a < cortes[0] ? 0 : a < cortes[1] ? 1 : a < cortes[2] ? 2 : 3];
      px[i * 4] = col[0]; px[i * 4 + 1] = col[1]; px[i * 4 + 2] = col[2]; px[i * 4 + 3] = 255;
    }
    x0.putImageData(out, 0, 0);
    return c0;
  }

  /* pinta mar y tierra de una ventana en dos capas: "mar" (fondo) y "tierra" (tierra, hielo, costa y fronteras,
     con el mar transparente) para poder poner los datos del satélite entre las dos */
  function capas({ pal, detalle, w, h, v = ventanaMundo, img = null, lineas = 1 }) {
    const feats = window.PAISES.features, tierra = feats.filter((f) => !esHielo(f)), hielo = feats.filter(esHielo), peru = feats.filter((f) => f.properties.n === "Peru");
    const mar = detalle ? marPorDistancia(pal, w, h, v) : (() => { const c = lienzo(w, h), x = c.getContext("2d"); x.fillStyle = pal.marSimple; x.fillRect(0, 0, w, h); return c; })();
    const t = lienzo(w, h), ctx = t.getContext("2d");
    ctx.fillStyle = detalle ? pal.tierra[0] : pal.tierraSimple; trazar(ctx, tierra, w, h, v); ctx.fill("evenodd");
    ctx.fillStyle = pal.hielo[0]; trazar(ctx, hielo, w, h, v); ctx.fill("evenodd");
    if (detalle && img) {
      for (const [grupo, esH] of [[tierra, false], [hielo, true]]) {
        const capa = lienzo(w, h), cc = capa.getContext("2d");
        cc.fillStyle = "#000"; trazar(cc, grupo, w, h, v); cc.fill("evenodd");
        cc.globalCompositeOperation = "source-in";
        cc.drawImage(relieve(img, pal, esH, w, h, v), 0, 0);
        ctx.drawImage(capa, 0, 0);
      }
    }
    if (!detalle) { ctx.fillStyle = pal.peru; trazar(ctx, peru, w, h, v); ctx.fill("evenodd"); }
    // costa (línea oscura, del lado del mar) y fronteras finas
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.lineJoin = "round"; ctx.strokeStyle = pal.costa; ctx.lineWidth = 2.6 * lineas;
    trazar(ctx, feats, w, h, v); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = pal.borde; ctx.lineWidth = 1 * lineas; ctx.lineJoin = "round";
    trazar(ctx, tierra, w, h, v); ctx.stroke();
    return { mar, tierra: t };
  }

  /* textura completa. detalle=false: atlas simple (mar de un tono, tierra plana); true: mar en 3 tonos y relieve */
  async function pintar({ paleta = "noche", detalle = false, ancho = 4096, relieveSrc = null } = {}) {
    const pal = PALETAS[paleta] || PALETAS.noche;
    const W = ancho, H = ancho / 2, esc = W / 4096;
    let img = null;
    if (detalle && relieveSrc) { try { img = await cargar(relieveSrc); } catch (e) { console.warn("Sin relieve para el atlas", e); } }
    const { mar, tierra } = capas({ pal, detalle, w: W, h: H, img, lineas: Math.max(0.6, esc * 1.2) });
    const cv = lienzo(W, H), ctx = cv.getContext("2d");
    ctx.drawImage(mar, 0, 0); ctx.drawImage(tierra, 0, 0);
    return cv;
  }

  /* lo mismo para una región (lonO, latN, lonE, latS) en alta resolución: se usa encima del globo para que la
     costa del Perú y la Antártida se vean nítidas al acercarse. Devuelve { mar, tierra } */
  async function pintarRegion({ paleta = "noche", detalle = false, ventana, w, h, relieveSrc = null }) {
    const pal = PALETAS[paleta] || PALETAS.noche;
    let img = null;
    if (detalle && relieveSrc) { try { img = await cargar(relieveSrc); } catch (e) { console.warn("Sin relieve para la región", e); } }
    return capas({ pal, detalle, w, h, v: ventana, img, lineas: Math.max(1, w / 1600) });
  }

  /* recorta un canvas de datos al mar y le dibuja la costa encima (para la capa del satélite) */
  function costaEnVentana(ctx, w, h, lonO, latN, lonE, latS, pal) {
    const feats = window.PAISES.features;
    const proy = (lo, la) => [((lo - lonO) / (lonE - lonO)) * w, ((latN - la) / (latN - latS)) * h];
    ctx.beginPath();
    for (const f of feats) {
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const poly of polys) for (const anillo of poly) {
        anillo.forEach(([lo, la], k) => { const [x, y] = proy(lo, la); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.closePath();
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = "destination-out"; ctx.fill("evenodd");
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = (PALETAS[pal] || PALETAS.noche).costa; ctx.lineWidth = 1.6; ctx.lineJoin = "round"; ctx.stroke();
    ctx.restore();
  }

  /* imagen de 2×1 px de un color, para que globe.gl cree su textura (luego se reemplaza por el atlas) */
  function pixel(color) { const c = lienzo(2, 1), x = c.getContext("2d"); x.fillStyle = color; x.fillRect(0, 0, 2, 1); return c.toDataURL(); }

  /* pone un canvas como textura del globo. Devuelve la textura (para guardarla y volver a usarla) */
  function aplicar(globo, cv) {
    return new Promise((ok) => {
      const intentar = (n) => {
        const mat = globo.globeMaterial();
        const T = mat && mat.map && mat.map.constructor;
        if (!T) return n > 0 ? setTimeout(() => intentar(n - 1), 100) : ok(null);
        const tex = new T(cv);
        tex.colorSpace = mat.map.colorSpace || "srgb";
        tex.anisotropy = 4;
        tex.needsUpdate = true;
        usar(globo, tex);
        ok(tex);
      };
      intentar(150);
    });
  }
  function usar(globo, tex) {
    const mat = globo.globeMaterial();
    mat.map = tex; mat.needsUpdate = true;
    if (mat.color) mat.color.setRGB(1, 1, 1);
    if (mat.specular) mat.specular.setRGB(0.03, 0.03, 0.03);
    mat.shininess = 4;
  }

  /* desvanece los bordes de un canvas de datos (fx, fy: fracción del ancho y del alto) para que no se vea un parche rectangular */
  function desvanecerBordes(ctx, w, h, fx, fy) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    const gx = ctx.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, "rgba(0,0,0,0)"); gx.addColorStop(fx, "#000"); gx.addColorStop(1 - fx, "#000"); gx.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gx; ctx.fillRect(0, 0, w, h);
    const gy = ctx.createLinearGradient(0, 0, 0, h);
    gy.addColorStop(0, "rgba(0,0,0,0)"); gy.addColorStop(fy, "#000"); gy.addColorStop(1 - fy, "#000"); gy.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gy; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* etiquetas HTML sobre el globo: punto + nombre con fondo oscuro, legibles a cualquier zoom.
     datos: [{ lat, lng, texto, lado: "der" | "izq" | "der-arriba" | "der-abajo", forma: "punto" | "base" | "rio" | "grupo",
               ocultarSobre: altitud (solo el punto si el globo está más lejos),
               soloCerca: altitud (se esconde si está más lejos), soloLejos: altitud (se ve solo si está más lejos) }] */
  const CSS_ETQ = `
    .etq { position: absolute; width: 0; height: 0; padding: 0; margin: 0; border: 0; background: none; cursor: pointer; pointer-events: auto; transition: opacity .25s; font: 700 13px/1.2 "Atkinson Hyperlegible", system-ui, sans-serif; }
    .etq i { position: absolute; left: -7px; top: -7px; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #f4f8fa; box-shadow: 0 0 0 2px rgba(4,18,31,.75), 0 2px 6px rgba(0,0,0,.5); background: #f2e14c; }
    .etq.base i { border-radius: 3px; transform: rotate(45deg) scale(.85); background: #f08a4b; }
    .etq.rio i { display: none; }
    .etq span { position: absolute; top: -11px; left: 12px; white-space: nowrap; color: #f4f8fa; padding: 3px 8px; border-radius: 6px; background: rgba(4,18,31,.82); box-shadow: 0 1px 4px rgba(0,0,0,.4); }
    .etq.izq span { left: auto; right: 12px; }
    .etq.der-arriba span { top: -30px; }
    .etq.der-abajo span { top: 8px; }
    .etq.rio span { left: 0; top: 0; transform: translate(-50%, -50%); background: rgba(4,18,31,.6); color: #9fe0f2; font-weight: 400; font-size: 12px; font-style: italic; }
    .etq.activa span { background: #3fc28c; color: #04121f; }
    .etq:hover span { background: #eaf3f5; color: #04121f; }
    .etq:focus-visible { outline: none; }
    .etq:focus-visible span { outline: 3px solid #63cde8; outline-offset: 1px; }
    .etq.oculta { opacity: 0; pointer-events: none; }
    .etq.sin-nombre span { display: none; }
    .etq.agrupada { display: none; }
    .etq.grupo i { width: 18px; height: 18px; left: -9px; top: -9px; background: #63cde8; box-shadow: 0 0 0 2px rgba(4,18,31,.75), 4px -4px 0 -1px #3fc28c, 8px -8px 0 -2px #f2e14c; }
    .etq.grupo span { left: 18px; }
    .etq.sin-nombre:hover span, .etq.sin-nombre:focus-visible span, .etq.sin-nombre.activa span { display: block; }
    @media (max-width: 640px) { .etq { font-size: 12px; } .etq span { padding: 2px 6px; } }`;
  function etiquetas(globo, datos, { alClic, alPasar } = {}) {
    if (!document.getElementById("css-etq")) {
      const s = document.createElement("style"); s.id = "css-etq"; s.textContent = CSS_ETQ; document.head.appendChild(s);
    }
    globo.htmlElementsData(datos).htmlLat("lat").htmlLng("lng").htmlAltitude((d) => d.alt ?? 0.012).htmlTransitionDuration(0)
      .htmlElement((d) => {
        const e = document.createElement(d.forma === "rio" ? "div" : "button");
        if (d.forma !== "rio") e.type = "button";
        e.className = `etq ${d.lado || "der"} ${d.forma || "punto"}`;
        e.innerHTML = `<i aria-hidden="true"></i><span>${d.texto}</span>`;
        if (d.forma === "rio") e.style.pointerEvents = "none";
        if (alClic) {
          // que el clic no llegue también al globo (que lo tomaría como un clic en el mar)
          for (const t of ["pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend"]) e.addEventListener(t, (ev) => ev.stopPropagation());
          e.addEventListener("click", (ev) => { ev.stopPropagation(); alClic(d); });
        }
        if (alPasar) { e.addEventListener("pointerenter", () => alPasar(d)); e.addEventListener("pointerleave", () => alPasar(null)); }
        d._el = e;
        return e;
      });
    // las etiquetas que quedan detrás del planeta se ocultan
    let pausa = false;
    const mirar = () => {
      if (!pausa) {
        const cam = globo.camera().position, alt = globo.pointOfView().altitude;
        for (const d of datos) {
          if (!d._el) continue;
          // con el globo lejos, algunas etiquetas muestran solo el punto (el nombre aparece al pasar el mouse)
          d._el.classList.toggle("sin-nombre", !!d.ocultarSobre && alt > d.ocultarSobre);
          // grupos: con el globo lejos se muestra una sola pastilla en vez de varias zonas juntas
          d._el.classList.toggle("agrupada", (!!d.soloCerca && alt > d.soloCerca) || (!!d.soloLejos && alt <= d.soloLejos));
          const p = globo.getCoords(d.lat, d.lng, 0);
          const ve = p.x * cam.x + p.y * cam.y + p.z * cam.z > (p.x * p.x + p.y * p.y + p.z * p.z) * 1.08;
          d._el.classList.toggle("oculta", !ve);
        }
      }
      requestAnimationFrame(mirar);
    };
    requestAnimationFrame(mirar);
    return {
      pausar(v) { pausa = v; },
      pintar(fn) { for (const d of datos) if (d._el) fn(d, d._el); },
    };
  }

  window.ATLAS = { PALETAS, pintar, pintarRegion, costaEnVentana, esHielo, pixel, aplicar, usar, desvanecerBordes, etiquetas };
})();
