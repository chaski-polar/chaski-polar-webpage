/* Explorador: globo 3D interactivo con relato lateral que cambia según lo que se toca.
   v3: mapa satelital mes a mes sobre el globo, línea de tiempo con El Niño, recorrido guiado,
   comparación de dos años, lectura bajo el cursor y enlaces que guardan el estado. */
(function () {
  const { D, nf, media, pearson, pendiente, mesesDesde, etiquetaMes, mediaMovil, estiloGraficos, colorRampa, colorDiverge, MESES_LARGOS } = window.MF;
  estiloGraficos();
  const menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esAngosto = () => window.innerWidth <= 900;
  const punteroFino = window.matchMedia("(pointer: fine)").matches;

  /* ---------- variables ---------- */
  const VARIABLES = [
    { id: "clorofila_mg_m3", clave: "clorofila", nombre: "Fitoplancton (clorofila-a)", corto: "fitoplancton", unidad: "mg/m³", dec: 2, modo: "log", rango: 1.2, escala: "rampa", mapa: "clorofila",
      que: "Los satélites miden el color del mar: más verde quiere decir más clorofila, o sea más fitoplancton, la base de la cadena alimenticia.",
      fuente: "Clorofila-a de ESA Ocean Colour CCI v6, que mezcla varios satélites, entre ellos SeaWiFS y MODIS-Aqua de la NASA. Mediana mensual de la zona." },
    { id: "temperatura_superficial_C", clave: "temperatura", nombre: "Temperatura del mar", corto: "temperatura del mar", unidad: "°C", dec: 1, modo: "dif", rango: 3, escala: "diverge", mapa: "temperatura",
      que: "El agua fría frente al Perú viene de abajo, cargada de nutrientes. Cuando se calienta, como en El Niño, el mar se vuelve menos productivo.",
      fuente: "Temperatura superficial de NOAA Coral Reef Watch v3.1." },
    { id: "turbidez_kd490_m-1", clave: "turbidez", nombre: "Turbidez del agua (Kd490)", corto: "turbidez", unidad: "m⁻¹", dec: 3, modo: "log", rango: 0.8, escala: "diverge",
      que: "Mide qué tan rápido se apaga la luz al bajar. Agua más turbia quiere decir más partículas o más plancton.",
      fuente: "Kd490 de ESA OC-CCI v6." },
    { id: "viento", clave: "viento", nombre: "Viento sobre el mar", corto: "viento", unidad: "m/s", dec: 1, modo: "dif", rango: 1.5, escala: "diverge",
      que: "Frente al Perú, el viento empuja el agua de la superficie mar adentro y hace subir agua profunda fría con nutrientes: el afloramiento.",
      fuente: "Velocidad del viento CCMP v2 (1993 a diciembre de 2018)." },
    { id: "salinidad_psu", clave: "salinidad", nombre: "Salinidad", corto: "salinidad", unidad: "PSU", dec: 2, modo: "dif", rango: 0.35, escala: "diverge",
      que: "Qué tan salada está el agua. Cambia con las lluvias, los ríos, el hielo que se derrite y la llegada de otras masas de agua.",
      fuente: "Salinidad superficial del satélite SMOS (desde 2010)." },
    { id: "nivel_mar_anomalia_m", clave: "nivel", nombre: "Nivel del mar", corto: "nivel del mar", unidad: "cm", dec: 1, modo: "directo", rango: 0.12, escala: "diverge", factor: 100,
      que: "Cuántos centímetros está el mar por encima o por debajo de lo normal. Frente al Perú sube cuando llega El Niño.",
      fuente: "Anomalía del nivel del mar de NOAA/NESDIS (2012–2018)." },
    { id: "monitor_chlorophyll", clave: "monitor-chlorophyll", mapa: "monitor-clorofila", nombre: "Monitor · clorofila-a", corto: "clorofila del monitor", unidad: "mg/m³", dec: 2, modo: "monitor", monitorId: "chlorophyll_a_mg_m3", escala: "rampa",
      que: "Lectura mensual del panel ambiental integrado: clorofila-a de OC-CCI/CMEMS para el periodo del monitor.",
      fuente: "Monitor de condiciones: OC-CCI y reanálisis CMEMS." },
    { id: "monitor_sst", clave: "monitor-sst", nombre: "Monitor · temperatura superficial", corto: "temperatura del monitor", unidad: "°C", dec: 1, modo: "monitor", monitorId: "sst_c", escala: "diverge",
      que: "Temperatura superficial mensual de la serie ambiental que alimenta el panel de monitoreo.",
      fuente: "Monitor de condiciones: reanálisis CMEMS." },
    { id: "monitor_biomass", clave: "monitor-biomass", nombre: "Monitor · biomasa de anchoveta", corto: "biomasa interpolada", unidad: "t", dec: 0, modo: "monitor", monitorId: "biomass_total_t_interpolated", escala: "diverge",
      que: "Biomasa de anchoveta del panel de monitoreo. La línea usa interpolación solo para visualizar el tramo entre cruceros; los puntos observados permanecen identificables.",
      fuente: "Monitor de condiciones: intervalos de cruceros IMARPE; interpolación lineal para visualización." },
  ];

  const ZONAS = D.zonas;
  const IDS = Object.keys(ZONAS);
  const nMeses = D.series[IDS[0]].clorofila_mg_m3.length;
  const MESES_TODOS = mesesDesde(D.meses_inicio, nMeses);
  const I0 = MESES_TODOS.findIndex((m) => m.anio === 1998 && m.mes === 0);
  const idxMes = (a, m) => MESES_TODOS.findIndex((x) => x.anio === a && x.mes === m);
  const esPeru = (z) => z.startsWith("peru");
  const MONITOR = window.MONITOR_DATA;
  const MONITOR_BY_DATE = new Map((MONITOR?.records || []).map((r) => [r.date.slice(0, 7), r]));
  const monitorRecord = (i) => MONITOR_BY_DATE.get(`${MESES_TODOS[i].anio}-${String(MESES_TODOS[i].mes + 1).padStart(2, "0")}`);
  const monitorValue = (vdef, i) => { const r = monitorRecord(i); return r && vdef.monitorId ? r[vdef.monitorId] : null; };
  const monitorValues = (vdef) => Array.from({ length: nMeses }, (_, i) => monitorValue(vdef, i));
  const monitorScale = (v) => {
    const xs = monitorValues(vSel).filter((x) => x != null);
    if (!xs.length || v == null) return null;
    const lo = Math.min(...xs), hi = Math.max(...xs);
    return hi === lo ? 0.5 : (v - lo) / (hi - lo);
  };
  const BASE = { lat: -62.09, lng: -58.47 };
  const CN = "peru_centro_norte_chimbote", RJ = "antartida_rey_jorge";

  for (const z of IDS) {
    const s = D.series[z];
    if (s.viento_u_m_s && s.viento_v_m_s) s.viento = s.viento_u_m_s.map((u, i) => (u == null || s.viento_v_m_s[i] == null ? null : Math.hypot(u, s.viento_v_m_s[i])));
  }

  const clima = {};
  function climatologia(z, v) {
    const k = z + "|" + v;
    if (clima[k]) return clima[k];
    const s = D.series[z][v] || [];
    return (clima[k] = Array.from({ length: 12 }, (_, m) => media(s.filter((_, i) => MESES_TODOS[i].mes === m))));
  }
  function anomalia(z, vdef, i) {
    if (vdef.modo === "monitor") {
      const value = monitorValue(vdef, i);
      if (value == null) return null;
      const month = MESES_TODOS[i].mes;
      const xs = monitorValues(vdef).filter((x, k) => x != null && MESES_TODOS[k].mes === month);
      const baseline = media(xs);
      return baseline == null ? null : (value - baseline) / (Math.max(...monitorValues(vdef).filter((x) => x != null)) - Math.min(...monitorValues(vdef).filter((x) => x != null)) || 1);
    }
    const s = D.series[z][vdef.id];
    if (!s || s[i] == null) return null;
    if (vdef.modo === "directo") return s[i] / vdef.rango;
    const c = climatologia(z, vdef.id)[MESES_TODOS[i].mes];
    if (c == null) return null;
    return vdef.modo === "log" ? Math.log2(s[i] / c) / vdef.rango : (s[i] - c) / vdef.rango;
  }

  /* escala de la clorofila: logarítmica de 0,03 a 10 mg/m³ (la misma en el mapa y en las zonas) */
  const CHL_LOG0 = Math.log10(0.03), CHL_LOG1 = 1;
  const tChl = (v) => (Math.log10(v) - CHL_LOG0) / (CHL_LOG1 - CHL_LOG0);
  function colorZona(z, vdef, i, alfa = 0.85) {
    if (vdef.modo === "monitor") {
      if (!esPeru(z)) return "rgba(120,140,155,0.2)";
      const value = monitorValue(vdef, i);
      if (value == null) return "rgba(120,140,155,0.28)";
      const t = monitorScale(value);
      return vdef.escala === "rampa" ? colorRampa(t, alfa) : colorDiverge((t - 0.5) * 2, alfa);
    }
    if (vdef.mapa === "clorofila") {
      const v = D.series[z][vdef.id]?.[i];
      return v == null ? "rgba(120,140,155,0.28)" : colorRampa(tChl(v), alfa);
    }
    const t = anomalia(z, vdef, i);
    if (t == null) return "rgba(120,140,155,0.28)";
    return vdef.escala === "rampa" ? colorRampa((t + 1) / 2, alfa) : colorDiverge(t, alfa);
  }
  const valorTxt = (vdef, v) => `${nf(vdef.dec).format(v * (vdef.factor || 1))} ${vdef.unidad}`;
  const signo = (x) => (x >= 0 ? "+" : "−");

  function anomaliaTxt(z, vdef, i) {
    if (vdef.modo === "monitor") {
      const v = monitorValue(vdef, i);
      if (v == null) return null;
      const all = monitorValues(vdef).filter((x) => x != null);
      const p = ((v - media(all)) / (media(all) || 1)) * 100;
      return { corto: `${signo(p)}${nf(0).format(Math.abs(p))} %`, frase: `${nf(vdef.dec).format(v)} ${vdef.unidad}; ${nf(0).format(Math.abs(p))} % ${p >= 0 ? "sobre" : "bajo"} el promedio del monitor`, valor: p };
    }
    const s = D.series[z][vdef.id];
    if (!s || s[i] == null) return null;
    const v = s[i];
    if (vdef.modo === "directo") {
      const d = v * (vdef.factor || 1);
      return { corto: `${signo(d)}${nf(vdef.dec).format(Math.abs(d))} ${vdef.unidad}`, frase: `${nf(vdef.dec).format(Math.abs(d))} ${vdef.unidad} ${d >= 0 ? "por encima" : "por debajo"} de lo normal`, valor: d };
    }
    const c = climatologia(z, vdef.id)[MESES_TODOS[i].mes];
    if (c == null) return null;
    const mes = MESES_LARGOS[MESES_TODOS[i].mes];
    if (vdef.modo === "log") {
      const p = (v / c - 1) * 100;
      return { corto: `${signo(p)}${nf(0).format(Math.abs(p))} %`, frase: `${nf(0).format(Math.abs(p))} % ${p >= 0 ? "más" : "menos"} que un ${mes} normal`, valor: p };
    }
    const d = v - c;
    return { corto: `${signo(d)}${nf(vdef.dec).format(Math.abs(d))} ${vdef.unidad}`, frase: `${nf(vdef.dec).format(Math.abs(d))} ${vdef.unidad} ${d >= 0 ? "sobre" : "bajo"} lo normal para ${mes}`, valor: d };
  }

  const cacheR = {};
  function rZonas(a, b, vdef) {
    const k = [a, b].sort().join("|") + vdef.id;
    if (k in cacheR) return cacheR[k];
    const xa = [], xb = [];
    for (let i = I0; i < nMeses; i++) { xa.push(anomalia(a, vdef, i)); xb.push(anomalia(b, vdef, i)); }
    return (cacheR[k] = pearson(xa, xb));
  }

  /* ---------- estado ---------- */
  const selVar = document.getElementById("variable");
  const rango = document.getElementById("mes");
  const mesTxt = document.getElementById("mes-txt");
  VARIABLES.forEach((v, k) => selVar.add(new Option(v.nombre, k)));
  let ultimo = I0;
  for (let i = I0; i < nMeses; i++) if (IDS.some((z) => D.series[z].clorofila_mg_m3[i] != null)) ultimo = i;
  rango.min = I0;
  rango.max = ultimo;
  let iMes = idxMes(2023, 4);
  rango.value = iMes;
  let vSel = VARIABLES[0];
  let vista = { tipo: "general" };
  let zonaHover = null;
  const fmtR = (r) => (r == null ? "—" : (r < 0 ? "−" : "") + nf(2).format(Math.abs(r)));
  const fmtCoord = (lat, lng) => `${nf(1).format(Math.abs(lat))}° ${lat < 0 ? "S" : "N"}, ${nf(1).format(Math.abs(lng))}° ${lng < 0 ? "O" : "E"}`;
  const mesLargo = (i) => `${MESES_LARGOS[MESES_TODOS[i].mes]} de ${MESES_TODOS[i].anio}`;
  const mayus = (t) => t[0].toUpperCase() + t.slice(1);

  /* estado del mapa satelital (se llena al cargar mapas.js) */
  const MAPA = { estado: "esperando", capas: {}, textura: null, material: null, grande: null, mostrado: false, fondos: {}, tmp: null, idx: null };
  /* estilo del mapa del satélite en la vista Detallada: "bandas" (clases con borde nítido), "celdas" (cada celda de 0,5° tal cual) o "suave" */
  const ESTILOS_MAPA = ["bandas", "celdas", "suave"];
  let estiloMapa = "bandas";
  /* dos vistas del atlas: "simple" (plano, zonas y conexiones) y "detallada" (relieve, mar en tonos y mapa del satélite) */
  const PALETA = "noche";
  let vistaGlobo = "simple";
  const mapaActivo = () => vistaGlobo === "detallada" && MAPA.estado === "listo" && !!vSel.mapa && !!MAPA.capas[vSel.mapa];
  const esMapaClorofila = (capa) => capa?.esClorofila === true;

  /* ---------- globo (atlas ilustrado, ver atlas.js) ---------- */
  const A = window.ATLAS;
  const el = document.getElementById("globo");
  const globo = Globe({ animateIn: !menosMovimiento })(el);
  const zonaActiva = () => (vista.tipo === "zona" ? vista.z : null);

  const CORRIENTES = [
    { id: "circumpolar", nombre: "Corriente Circumpolar Antártica", pts: Array.from({ length: 37 }, (_, k) => [-58 + 2 * Math.sin(k / 3), -180 + k * 10]), color: ["rgba(159,224,242,0.08)", "rgba(159,224,242,0.75)"] },
    { id: "humboldt", nombre: "Corriente de Humboldt", pts: [[-45, -79], [-40, -76.5], [-33, -74], [-26, -72.5], [-19, -73], [-14, -77.5], [-9, -80.5], [-4, -82.5]], color: ["rgba(159,224,242,0.25)", "rgba(159,224,242,0.95)"] },
  ];
  /* zonas como puntos con nombre (sin cajas). Los nombres van a lados alternos para que no se monten */
  const LADO = { peru_norte_paita_sechura: "izq", peru_centro_norte_chimbote: "der", peru_centro_callao: "izq", peru_sur_pisco: "der", peru_sur_ilo: "der", antartida_rey_jorge: "der-arriba", antartida_peninsula: "izq" };
  // con el globo lejos (altitud > 1,15) las 5 zonas del Perú se juntan en una sola pastilla
  const AGRUPAR = 1.15;
  const MARCAS = [
    ...IDS.map((z) => ({ z, lat: ZONAS[z].lat, lng: ZONAS[z].lon, texto: ZONAS[z].nombre, lado: LADO[z] || "der", soloCerca: esPeru(z) ? AGRUPAR : undefined })),
    { z: "grupo-peru", lat: -11, lng: -78.2, texto: "5 zonas del Perú", lado: "der", forma: "grupo", soloLejos: AGRUPAR },
    { z: "base", lat: BASE.lat, lng: BASE.lng, texto: "Base Machu Picchu", lado: "der-abajo", forma: "base" },
    { z: "rio-humboldt", lat: -27, lng: -78.4, texto: "Corriente de Humboldt ↑", forma: "rio" },
    { z: "rio-circumpolar", lat: -55.2, lng: -96, texto: "Corriente Circumpolar →", forma: "rio" },
  ];

  const tip = (z) => {
    const a = anomaliaTxt(z, vSel, iMes);
    const v = vSel.modo === "monitor" ? monitorValue(vSel, iMes) : D.series[z][vSel.id]?.[iMes];
    return `<b>${ZONAS[z].nombre}</b><small>${vSel.nombre}: ${v == null ? "sin dato este mes" : valorTxt(vSel, v)}${a ? `, ${a.frase}` : ""}</small><small>Toca para ver más</small>`;
  };

  // globe.gl escucha el clic en fase de captura: si el clic fue sobre una etiqueta, el globo lo ignora
  const desdeEtiqueta = (ev) => !!(ev && ev.target && ev.target.closest && ev.target.closest(".etq"));
  const etq = A.etiquetas(globo, MARCAS, {
    alClic: (d) => {
      interaccion();
      if (d.z === "grupo-peru") volar({ lat: -12, lng: -80, altitude: 1.0 }, 1400);
      else if (d.z === "base") mostrarBase();
      else irAZona(d.z);
    },
    alPasar: (d) => {
      zonaHover = d && ZONAS[d.z] ? d.z : null;
      if (!zonaHover) return ocultarLectura();
      const r = el.getBoundingClientRect(), b = d._el.getBoundingClientRect();
      lectura.innerHTML = tip(zonaHover);
      lectura.hidden = false;
      const x = Math.max(8, Math.min(b.left - r.left + 16, r.width - lectura.offsetWidth - 8));
      lectura.style.transform = `translate(${x}px, ${b.top - r.top + 30}px)`;
    },
  });
  /* color de cada punto = dato del mes en esa zona (misma escala que la leyenda) */
  function pintarPines() {
    etq.pintar((d, e) => {
      if (d.z === "grupo-peru") e.setAttribute("aria-label", "5 zonas del Perú: acercar el globo");
      if (!ZONAS[d.z]) { e.classList.toggle("activa", d.z === "base" && vista.tipo === "base"); return; }
      e.querySelector("i").style.background = colorZona(d.z, vSel, iMes, 1);
      e.classList.toggle("activa", d.z === zonaActiva());
      e.setAttribute("aria-label", `${ZONAS[d.z].nombre}: ver sus datos`);
    });
  }

  globo
    .globeImageUrl(A.pixel(A.PALETAS[PALETA].marSimple))
    .backgroundColor("rgba(0,0,0,0)")
    .atmosphereColor(A.PALETAS[PALETA].atm)
    .atmosphereAltitude(0.14)
    .pathsData(CORRIENTES)
    .pathPoints("pts")
    .pathPointLat((p) => p[0])
    .pathPointLng((p) => p[1])
    .pathPointAlt(0.008)
    .pathColor((d) => d.color)
    .pathStroke((d) => (vista.id === d.id && (vista.tipo === "corriente" || vista.tipo === "recorrido") ? 4 : 2))
    .pathDashLength(0.06)
    .pathDashGap(0.02)
    .pathDashAnimateTime(menosMovimiento ? 0 : 14000)
    .pathLabel((d) => `<div class="tip"><b>${d.nombre}</b><br><i>Toca para saber qué hace</i></div>`)
    .onPathClick((d, ev) => { if (desdeEtiqueta(ev)) return; interaccion(); mostrarCorriente(d.id); })
    .onPathHover((d) => { el.style.cursor = d ? "pointer" : "grab"; })
    .onGlobeClick(({ lat, lng }, ev) => { if (!desdeEtiqueta(ev)) clicMar(lat, lng); })
    .ringColor(() => (t) => `rgba(99,205,232,${1 - t})`)
    .ringMaxRadius((d) => d.r || 3.2)
    .ringPropagationSpeed(1.6)
    .ringRepeatPeriod(menosMovimiento ? 0 : 1500)
    .arcColor((d) => d.color)
    .arcStroke((d) => d.grosor)
    .arcAltitudeAutoScale(0.32)
    .arcDashLength(0.45)
    .arcDashGap(0.12)
    .arcDashAnimateTime(menosMovimiento ? 0 : 2600)
    .arcLabel((d) => `<div class="tip"><b>${ZONAS[d.de].nombre} y ${ZONAS[d.a].nombre}</b><br>Se parecen r = ${fmtR(d.r)} en ${vSel.corto}</div>`)
    .onArcClick((d, ev) => { if (desdeEtiqueta(ev)) return; interaccion(); irAZona(d.a); });

  /* textura del atlas: se pinta una vez por vista y se guarda */
  const TEXTURAS = {};
  const relieveSrc = location.protocol === "file:" ? window.TEX?.["earth-topology"] : "img/earth-topology.png";
  let pintando = null;
  async function ponerAtlas() {
    const v = vistaGlobo;
    if (TEXTURAS[v]) return A.usar(globo, TEXTURAS[v]);
    if (pintando === v) return;
    pintando = v;
    const cv = await A.pintar({ paleta: PALETA, detalle: v === "detallada", ancho: esAngosto() ? 2048 : 4096, relieveSrc });
    const tex = await A.aplicar(globo, cv);
    pintando = null;
    if (tex) TEXTURAS[v] = tex;
    if (vistaGlobo !== v && TEXTURAS[vistaGlobo]) A.usar(globo, TEXTURAS[vistaGlobo]);
    else if (vistaGlobo !== v) ponerAtlas();
  }

  function clicMar(lat, lng) {
    interaccion();
    const cerca = IDS.map((z) => ({ z, d: distanciaKm(lat, lng, ZONAS[z].lat, ZONAS[z].lon) })).sort((a, b) => a.d - b.d)[0];
    if (distanciaKm(lat, lng, BASE.lat, BASE.lng) < 120) mostrarBase();
    else if (cerca.d < 220) irAZona(cerca.z);
    else mostrarPunto(lat, lng);
  }

  function anillos(extra = []) { globo.ringsData([{ ...BASE, r: 2.6 }, ...extra]); }
  anillos();

  const fijarControles = () => {
    const ctl = globo.controls && globo.controls();
    if (!ctl) return setTimeout(fijarControles, 200);
    ctl.enableDamping = true;
    ctl.minDistance = 130;
    ctl.maxDistance = 520;
    ctl.autoRotateSpeed = 0.35;
  };
  fijarControles();
  try { globo.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch (e) { /* sin acceso al renderizador */ }

  /* el globo ocupa el espacio libre real entre el interruptor de vista (arriba) y el mando (abajo) */
  const lienzoGlobo = document.querySelector(".lienzo-globo");
  const notaArriba = document.getElementById("vista-nota");
  const mando = document.querySelector(".mando");
  // el canvas llega hasta arriba (así el globo no se corta en línea recta al acercarse), pero la imagen se corre
  // hacia abajo con setViewOffset para que el globo quede centrado entre el interruptor y el mando
  let reservaArriba = 0;
  function ajustarTamano() {
    const L = lienzoGlobo.getBoundingClientRect(), arriba = notaArriba.getBoundingClientRect(), abajo = mando.getBoundingClientRect();
    if (L.height && abajo.height) {
      const bottom = Math.max(0, Math.round(L.bottom - abajo.top + 6));
      if (el.style.top !== "0px") el.style.top = "0px";
      if (el.style.bottom !== bottom + "px") el.style.bottom = bottom + "px";
      reservaArriba = Math.max(0, Math.round(arriba.bottom - L.top + 6));
    }
    const w = el.clientWidth, h = el.clientHeight;
    globo.width(w).height(h);
    try {
      const cam = globo.camera();
      if (reservaArriba > 0 && reservaArriba < h * 0.5) cam.setViewOffset(w, h, 0, -reservaArriba / 2, w, h);
      else cam.clearViewOffset();
      cam.updateProjectionMatrix();
    } catch (e) { /* sin cámara todavía */ }
    dibujarFranja();
  }
  window.addEventListener("resize", ajustarTamano);
  if ("ResizeObserver" in window) { const ro = new ResizeObserver(ajustarTamano); ro.observe(el); ro.observe(mando); }

  /* el globo deja de dibujar cuando no se ve (ahorra batería al leer los hallazgos) */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { if (e.isIntersecting) globo.resumeAnimation(); else globo.pauseAnimation(); etq.pausar(!e.isIntersecting); }, { threshold: 0.02 })
      .observe(document.querySelector(".lienzo-globo"));
  }

  // encuadre que muestra a la vez la costa del Perú y la Península Antártica (el relato es la conexión entre ambas)
  // la altitud se calcula para que el globo llene el espacio (cámara de 50° vertical): diámetro ≈ el alto libre o 0,9 del ancho
  const VISTA_INICIAL = () => {
    const w = el.clientWidth || 800, h = el.clientHeight || 500, libre = Math.max(h * 0.5, h - reservaArriba);
    const fraccion = Math.min(libre / h, (0.9 * w) / h);
    const ang = Math.atan(fraccion * Math.tan((25 * Math.PI) / 180));
    return { lat: -37, lng: -73, altitude: Math.max(1.05, Math.min(3, 1 / Math.sin(ang) - 1)) };
  };
  const volar = (pov, ms = 1500) => globo.pointOfView(pov, menosMovimiento ? 0 : ms);

  /* giro automático cuando nadie toca el globo */
  let relojQuieto = null;
  const pista = document.getElementById("pista");
  const programarGiro = () => {
    clearTimeout(relojQuieto);
    relojQuieto = setTimeout(() => { const c = globo.controls(); if (c && !menosMovimiento && vista.tipo === "general") c.autoRotate = true; }, 30000);
  };
  function interaccion() {
    const ctl = globo.controls && globo.controls();
    if (ctl) ctl.autoRotate = false;
    pista.classList.add("oculta");
    programarGiro();
  }
  ["pointerdown", "wheel", "touchstart"].forEach((ev) => el.addEventListener(ev, interaccion, { passive: true }));
  programarGiro();

  /* ---------- mapa satelital: grillas mensuales de mapas.js ---------- */
  const notaVista = document.getElementById("vista-nota");

  function bytesDe(b64) {
    const s = atob(b64), u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  }
  async function descomprimir(b64) {
    const flujo = new Blob([bytesDe(b64)]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(flujo).arrayBuffer());
  }
  const rgba = (s) => s.match(/[\d.]+/g).map(Number);

  async function prepararCapa(clave) {
    const M = clave === "monitor-clorofila" ? window.MONITOR_MAPAS : window.MAPAS, g = M[clave];
    const masc = bytesDe(g.mascara);
    const total = g.filas * g.cols, celdas = [], pos = new Int32Array(total).fill(-1);
    for (let k = 0; k < total; k++) if (masc[k >> 3] & (128 >> (k & 7))) { pos[k] = celdas.length; celdas.push(k); }
    const capa = { clave, g, celdas, pos, nM: M.meses, esClorofila: g.tipo === "clorofila" || clave === "clorofila", datos: await descomprimir(g.datos), clima: g.clima ? await descomprimir(g.clima) : null };
    const lut = new Uint8ClampedArray(256 * 4);
    for (let q = 1; q < 256; q++) {
      const c = capa.esClorofila
        ? rgba(colorRampa(tChl(10 ** (g.log0 + ((q - 1) / 254) * (g.log1 - g.log0))), 1))
        : rgba(colorDiverge(((q - 128) * g.paso) / VARIABLES[1].rango, 1));
      // temperatura: lo normal (cerca de 0) casi transparente, para que solo resalten las diferencias
      const alfaT = Math.round(50 + 180 * Math.min(1, Math.abs((q - 128) * g.paso) / 1.5));
      lut.set([c[0], c[1], c[2], capa.esClorofila ? 236 : alfaT], q * 4);
    }
    capa.lut = lut;
    capa.lienzo = document.createElement("canvas");
    capa.lienzo.width = g.cols; capa.lienzo.height = g.filas;
    capa.img = capa.lienzo.getContext("2d").createImageData(g.cols, g.filas);
    // bandas: cortes "redondos" (mg/m³ o °C) pasados al valor guardado q, y un color por banda
    const cortesQ = capa.esClorofila
      ? [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 3, 5, 10].map((b) => 1 + ((Math.log10(b) - g.log0) / (g.log1 - g.log0)) * 254)
      : [-2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5].map((t) => 128 + t / g.paso);
    capa.bandaDe = new Int16Array(256);
    for (let q = 1; q < 256; q++) capa.bandaDe[q] = cortesQ.filter((c) => c <= q).length;
    capa.lutBanda = new Uint8ClampedArray((cortesQ.length + 1) * 4);
    for (let b = 0; b <= cortesQ.length; b++) {
      const lo = b === 0 ? 1 : cortesQ[b - 1], hi = b === cortesQ.length ? 255 : cortesQ[b];
      const q = Math.max(1, Math.min(255, Math.round((Math.max(1, lo) + Math.min(255, hi)) / 2)));
      capa.lutBanda.set(lut.subarray(q * 4, q * 4 + 4), b * 4);
    }
    capa.valLienzo = document.createElement("canvas");
    capa.valLienzo.width = g.cols; capa.valLienzo.height = g.filas;
    capa.valImg = capa.valLienzo.getContext("2d").createImageData(g.cols, g.filas);
    return capa;
  }

  /* valor guardado de una capa en una celda (j) y un mes de la grilla (mi) */
  function valorCapa(capa, j, mi) {
    if (j < 0 || mi < 0 || mi >= capa.nM) return null;
    const q = capa.datos[j * capa.nM + mi];
    if (!q) return null;
    return capa.esClorofila ? 10 ** (capa.g.log0 + ((q - 1) / 254) * (capa.g.log1 - capa.g.log0)) : (q - 128) * capa.g.paso;
  }
  function climaCapa(capa, j, m) {
    if (!capa.clima || j < 0) return null;
    const q = capa.clima[j * 12 + m];
    return q ? (q - 1) * 0.15 - 2 : null;
  }
  function celdaDe(capa, lat, lng) {
    const { g } = capa;
    const r = Math.floor((window.MAPAS.lat_n - lat) / g.celda), c = Math.floor((lng - window.MAPAS.lon_o) / g.celda);
    if (r < 0 || c < 0 || r >= g.filas || c >= g.cols) return { fuera: true, j: -1 };
    return { fuera: false, j: capa.pos[r * g.cols + c] };
  }
  /* clorofila de un mes calendario en 1998–2020 (media geométrica = media del valor guardado) */
  function climaChl(capa, j, m) {
    let s = 0, n = 0;
    for (let a = 0; a <= 22; a++) { const q = capa.datos[j * capa.nM + a * 12 + m]; if (q) { s += q; n++; } }
    return n >= 6 ? 10 ** (capa.g.log0 + ((s / n - 1) / 254) * (capa.g.log1 - capa.g.log0)) : null;
  }

  /* ventana de la grilla del satélite (la misma región que el recuadro de alta resolución) */
  const ventanaMapa = () => { const M = window.MAPAS; return { lonO: M.lon_o, latN: M.lat_n, lonE: M.lon_o + 40, latS: M.lat_n - 72 }; };

  /* mar y tierra de la región en alta resolución (se pintan una vez por vista y se guardan) */
  function fondoRegion(v) {
    const f = MAPA.fondos[v];
    if (f) return f.listo ? f : null;
    MAPA.fondos[v] = { listo: false };
    A.pintarRegion({ paleta: PALETA, detalle: v === "detallada", ventana: ventanaMapa(), w: MAPA.grande.width, h: MAPA.grande.height, relieveSrc })
      .then((r) => { MAPA.fondos[v] = { listo: true, ...r }; dibujarMapa(); })
      .catch((e) => { console.warn("No se pudo pintar la región", e); delete MAPA.fondos[v]; });
    return null;
  }

  /* datos del mes sobre el mar, según el estilo elegido */
  function pintarDatos(ctx, w, h) {
    const capa = MAPA.capas[vSel.mapa], mi = iMes - I0, { lut } = capa;
    if (mi < 0 || mi >= capa.nM) return;
    const px = capa.img.data, val = capa.valImg.data;
    px.fill(0); val.fill(0);
    for (let j = 0; j < capa.celdas.length; j++) {
      const q = capa.datos[j * capa.nM + mi];
      if (!q) continue;
      const k = capa.celdas[j] * 4, l = q * 4;
      px[k] = lut[l]; px[k + 1] = lut[l + 1]; px[k + 2] = lut[l + 2]; px[k + 3] = lut[l + 3];
      val[k] = q; val[k + 3] = 255;
    }
    if (estiloMapa !== "bandas") {
      capa.lienzo.getContext("2d").putImageData(capa.img, 0, 0);
      ctx.imageSmoothingEnabled = estiloMapa === "suave";
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(capa.lienzo, 0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      return;
    }
    // bandas: el valor se amplía con suavizado a la resolución final y recién ahí se corta en clases,
    // así los bordes son curvas nítidas (como un mapa del tiempo) y no manchas borrosas
    capa.valLienzo.getContext("2d").putImageData(capa.valImg, 0, 0);
    const t = MAPA.tmp, tc = t.getContext("2d", { willReadFrequently: true });
    tc.clearRect(0, 0, w, h);
    tc.imageSmoothingEnabled = true; tc.imageSmoothingQuality = "high";
    tc.drawImage(capa.valLienzo, 0, 0, w, h);
    const d = tc.getImageData(0, 0, w, h), a = d.data, idx = MAPA.idx, bandaDe = capa.bandaDe, L = capa.lutBanda, n = w * h;
    for (let i = 0; i < n; i++) idx[i] = a[i * 4 + 3] >= 128 ? bandaDe[a[i * 4]] : -1;
    for (let i = 0; i < n; i++) {
      const bi = idx[i], o = i * 4;
      if (bi < 0) { a[o + 3] = 0; continue; }
      const c = bi * 4;
      let r = L[c], g = L[c + 1], bl = L[c + 2], al = L[c + 3];
      // línea fina entre bandas (curva de nivel), un poco más oscura
      const der = (i % w) < w - 1 ? idx[i + 1] : -1, aba = i + w < n ? idx[i + w] : -1;
      if ((der >= 0 && der !== bi) || (aba >= 0 && aba !== bi)) { r *= 0.7; g *= 0.7; bl *= 0.7; al = Math.max(al, 190); }
      a[o] = r; a[o + 1] = g; a[o + 2] = bl; a[o + 3] = al;
    }
    tc.putImageData(d, 0, 0);
    ctx.drawImage(t, 0, 0);
  }

  function dibujarMapa() {
    if (MAPA.estado !== "listo") return;
    if (!MAPA.mostrado) { globo.tilesData([{ lat: -34, lng: -72, w: 40, h: 72 }]); MAPA.mostrado = true; }
    const ctx = MAPA.grande.getContext("2d"), w = MAPA.grande.width, h = MAPA.grande.height;
    const fondo = fondoRegion(vistaGlobo);
    ctx.clearRect(0, 0, w, h);
    if (fondo) {
      // orden: mar → datos del satélite → tierra y costa encima (así el dato queda solo en el mar)
      ctx.drawImage(fondo.mar, 0, 0);
      if (mapaActivo()) pintarDatos(ctx, w, h);
      ctx.drawImage(fondo.tierra, 0, 0);
      A.desvanecerBordes(ctx, w, h, 0.11, 0.06);
    }
    MAPA.textura.needsUpdate = true;
  }

  /* interruptor Simple / Detallada (arriba del globo) */
  const botonesVista = document.querySelectorAll("[data-vista]");
  function actualizarBotonCapa() {
    botonesVista.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vista === vistaGlobo)));
    let t;
    // una sola línea (si no cabe, el texto completo queda en el title)
    if (vistaGlobo === "simple") t = "Cada punto es una zona, coloreada con el dato del mes.";
    else if (MAPA.estado === "error") t = "El mapa del satélite no cargó en este navegador.";
    else if (MAPA.estado !== "listo") t = "Cargando el mapa del satélite…";
    else if (!vSel.mapa) t = `${mayus(vSel.corto)}: solo hay datos por zona, sin mapa.`;
    else t = `Mapa del satélite mes a mes. ${punteroFino ? "Pasa el cursor" : "Toca el mar"} para leerlo.`;
    notaVista.textContent = t;
    notaVista.title = t;
    estilosMapa.hidden = !mapaActivo();
    botonesEstilo.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.estilo === estiloMapa)));
  }
  function fijarVista(v, repintar = true) {
    if (v !== "simple" && v !== "detallada") return;
    vistaGlobo = v;
    ponerAtlas();
    actualizarBotonCapa(); actualizarLeyenda(); dibujarMapa(); ocultarLectura();
    if (!repintar) return;
    guardarEstado();
    if (vista.tipo === "general") mostrarGeneral();
  }
  botonesVista.forEach((b) => b.addEventListener("click", () => { interaccion(); fijarVista(b.dataset.vista); }));

  /* estilo del mapa del satélite (solo en la vista Detallada) */
  const estilosMapa = document.getElementById("estilos-mapa");
  const botonesEstilo = estilosMapa.querySelectorAll("[data-estilo]");
  botonesEstilo.forEach((b) => b.addEventListener("click", () => {
    interaccion();
    estiloMapa = b.dataset.estilo;
    actualizarBotonCapa(); dibujarMapa(); guardarEstado();
  }));

  function crearCapaGlobo() {
    const base = globo.globeMaterial();
    const Textura = base && base.map && base.map.constructor;
    if (!Textura) return false;
    MAPA.grande = document.createElement("canvas");
    // 40 píxeles por grado (20 en pantallas angostas): la costa y los datos se ven nítidos al acercarse
    const ppg = esAngosto() ? 20 : 40;
    MAPA.grande.width = 40 * ppg; MAPA.grande.height = 72 * ppg;
    MAPA.tmp = document.createElement("canvas");
    MAPA.tmp.width = MAPA.grande.width; MAPA.tmp.height = MAPA.grande.height;
    MAPA.idx = new Int16Array(MAPA.grande.width * MAPA.grande.height);
    const tex = new Textura(MAPA.grande);
    tex.colorSpace = base.map.colorSpace || "srgb";
    tex.generateMipmaps = true;
    tex.minFilter = 1008; // LinearMipmapLinearFilter: también se ve bien de lejos
    tex.magFilter = 1006; // LinearFilter
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    const Lambert = globo.tileMaterial()().constructor;
    // color negro + emisivo blanco con la misma textura: el mapa se ve con sus colores reales, sin sombras
    MAPA.material = new Lambert({ map: tex, emissiveMap: tex, emissive: 0xffffff, color: 0x000000, transparent: true, depthWrite: false });
    MAPA.textura = tex;
    globo
      .tileLat("lat").tileLng("lng").tileWidth("w").tileHeight("h")
      .tileAltitude(0.0035)
      .tileUseGlobeProjection(true)
      .tileCurvatureResolution(1)
      .tileMaterial(() => MAPA.material)
      .tilesTransitionDuration(0)
      .onTileClick((t, ev, c) => {
        if (desdeEtiqueta(ev)) return;
        if (c && c.lat != null) return clicMar(c.lat, c.lng);
        const r = el.getBoundingClientRect(), gc = globo.toGlobeCoords(ev.clientX - r.left, ev.clientY - r.top);
        if (gc) clicMar(gc.lat, gc.lng);
      })
      .onTileHover((t) => { if (!zonaHover) el.style.cursor = t && mapaActivo() ? "crosshair" : "grab"; });
    return true;
  }

  async function cargarMapas() {
    if (!("DecompressionStream" in window)) { MAPA.estado = "error"; actualizarBotonCapa(); return; }
    MAPA.estado = "cargando"; actualizarBotonCapa();
    try {
      if (!window.MAPAS) {
        await new Promise((ok, mal) => {
          const s = document.createElement("script");
          s.src = "/legacy/mapas.js?v=14"; s.onload = ok; s.onerror = mal;
          document.body.appendChild(s);
        });
      }
      if (!window.MONITOR_MAPAS) {
        await new Promise((ok, mal) => {
          const s = document.createElement("script");
          s.src = "/legacy/monitor-mapas.js?v=1"; s.onload = ok; s.onerror = mal;
          document.body.appendChild(s);
        });
      }
      for (const clave of ["clorofila", "temperatura", "monitor-clorofila"]) {
        const fuente = clave === "monitor-clorofila" ? window.MONITOR_MAPAS : window.MAPAS;
        if (fuente?.[clave]) MAPA.capas[clave] = await prepararCapa(clave);
      }
      for (let k = 0; k < 60 && !crearCapaGlobo(); k++) await new Promise((r) => setTimeout(r, 250));
      if (!MAPA.textura) throw new Error("La textura del globo no terminó de cargar");
      MAPA.estado = "listo";
    } catch (e) {
      console.warn("No se pudo cargar el mapa satelital", e);
      MAPA.estado = "error";
    }
    actualizarBotonCapa(); actualizarLeyenda(); dibujarMapa();
    if (vista.tipo === "general") mostrarGeneral();
    else if (vista.tipo === "punto") mostrarPunto(vista.lat, vista.lng);
    else if (vista.tipo === "recorrido") mostrarPaso(vista.paso);
    else if (vista.tipo === "zona") mostrarZona(vista.z);
  }

  /* lectura del mapa bajo el cursor */
  const lectura = document.getElementById("lectura");
  let pendienteLectura = null;
  function ocultarLectura() { lectura.hidden = true; }
  if (punteroFino) {
    el.addEventListener("pointermove", (e) => {
      if (pendienteLectura) return;
      pendienteLectura = requestAnimationFrame(() => {
        pendienteLectura = null;
        if (!mapaActivo() || zonaHover || e.buttons) return ocultarLectura();
        const r = el.getBoundingClientRect();
        const c = globo.toGlobeCoords(e.clientX - r.left, e.clientY - r.top);
        if (!c) return ocultarLectura();
        const capa = MAPA.capas[vSel.mapa], { fuera, j } = celdaDe(capa, c.lat, c.lng);
        if (fuera || j < 0) return ocultarLectura();
        const v = valorCapa(capa, j, iMes - I0);
        const txt = v == null ? "sin dato este mes" : esMapaClorofila(capa) ? `${nf(v < 1 ? 2 : 1).format(v)} mg/m³ de clorofila` : `${signo(v)}${nf(1).format(Math.abs(v))} °C frente a lo normal`;
        lectura.innerHTML = `<b>${txt}</b><small>${fmtCoord(c.lat, c.lng)}, ${MESES_LARGOS[MESES_TODOS[iMes].mes]} de ${MESES_TODOS[iMes].anio}</small>`;
        lectura.hidden = false;
        const x = Math.min(e.clientX - r.left + 14, r.width - lectura.offsetWidth - 8);
        lectura.style.transform = `translate(${x}px, ${e.clientY - r.top + 16}px)`;
      });
    });
    el.addEventListener("pointerleave", ocultarLectura);
  }

  /* ---------- línea de tiempo con El Niño ---------- */
  const franja = document.getElementById("franja-nino");
  const cajaEventos = document.getElementById("eventos");
  const NINO = D.indices.nino12; // anomalía mensual Niño 1+2, mismo inicio que las series
  const EVENTOS = [
    { anio: 1998, nombre: "El Niño 1997–98" },
    { anio: 2016, nombre: "El Niño 2015–16" },
    { anio: 2017, nombre: "El Niño costero 2017" },
    { anio: 2023, nombre: "El Niño 2023" },
  ].map((e) => {
    let mejor = null;
    for (let i = I0; i <= ultimo; i++) if (MESES_TODOS[i].anio === e.anio && NINO[i] != null && (mejor == null || NINO[i] > NINO[mejor])) mejor = i;
    return { ...e, i: mejor };
  }).filter((e) => e.i != null);
  const RADIO_PERILLA = 8;
  const xDeMes = (i, w) => RADIO_PERILLA + ((i - I0) / (ultimo - I0)) * (w - 2 * RADIO_PERILLA);

  function dibujarFranja() {
    const w = franja.clientWidth, h = franja.clientHeight;
    if (!w) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    franja.width = Math.round(w * dpr); franja.height = Math.round(h * dpr);
    const c = franja.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const ancho = Math.max(1, (w - 2 * RADIO_PERILLA) / (ultimo - I0));
    for (let i = I0; i <= ultimo; i++) {
      const v = NINO[i];
      if (v == null || Math.abs(v) < 0.25) continue;
      // línea base abajo: lo cálido (El Niño) sube con más espacio; lo frío baja poco
      const base = Math.round(h * 0.72);
      const alto = Math.min(1, Math.abs(v) / 3.5) * (v > 0 ? base : h - base);
      c.fillStyle = v > 0 ? "rgba(240,138,75,0.9)" : "rgba(99,160,220,0.6)";
      c.fillRect(xDeMes(i, w) - ancho / 2, v > 0 ? base - alto : base, ancho, alto);
    }
    // si dos marcas quedan muy juntas, la primera se corre a la izquierda y la segunda a la derecha
    const marcas = [...cajaEventos.querySelectorAll(".evento")];
    marcas.forEach((b, k) => {
      const x = xDeMes(+b.dataset.i, w);
      const antes = marcas[k - 1] && x - xDeMes(+marcas[k - 1].dataset.i, w) < 44;
      const despues = marcas[k + 1] && xDeMes(+marcas[k + 1].dataset.i, w) - x < 44;
      b.style.left = `${x}px`;
      b.style.transform = despues ? "translateX(calc(-100% + 6px))" : antes ? "translateX(-6px)" : "";
    });
  }
  cajaEventos.innerHTML = EVENTOS.map((e) => `<button class="evento" type="button" data-i="${e.i}" aria-label="${e.nombre}: ir a ${mesLargo(e.i)}" title="${e.nombre} (pico en ${mesLargo(e.i)})">${e.anio}</button>`).join("");
  cajaEventos.addEventListener("click", (e) => {
    const b = e.target.closest(".evento");
    if (!b) return;
    interaccion();
    if (!vSel.mapa) cambiarVariable(1, false);
    fijarMes(+b.dataset.i);
  });

  /* ---------- relato ---------- */
  const relato = document.getElementById("relato");
  const btnVer = document.getElementById("ver-relato");
  let graf = null;

  function pintar(html, alTerminar) {
    if (graf) { graf.destroy(); graf = null; }
    relato.innerHTML = `<div class="relato-contenido">${html}</div>`;
    relato.scrollTop = 0;
    if (alTerminar) alTerminar();
    if (esAngosto() && vista.tipo !== "general") {
      btnVer.hidden = false;
      btnVer.textContent = vista.tipo === "zona" ? `Ver los datos de ${ZONAS[vista.z].nombre}` : vista.tipo === "recorrido" ? `Leer el paso ${vista.paso + 1}` : "Ver la explicación";
    } else btnVer.hidden = true;
    pintarPines();
    globo.pathStroke(globo.pathStroke());
    guardarEstado();
  }
  btnVer.addEventListener("click", () => relato.scrollIntoView({ behavior: menosMovimiento ? "auto" : "smooth" }));

  const chipsVariables = (z) => `<div class="chips" role="group" aria-label="Cambiar el dato">${VARIABLES.map((v, k) => {
    const hay = v.modo === "monitor" ? !!MONITOR : !z || (D.series[z][v.id] || []).some((x) => x != null);
    return hay ? `<button class="chip" type="button" data-accion="var" data-k="${k}" aria-pressed="${v === vSel}">${v.nombre.replace(/ \(.*\)/, "")}</button>` : "";
  }).join("")}</div>`;
  const chipsEventos = () => `<div class="chips" role="group" aria-label="Saltar a un evento de El Niño">${EVENTOS.map((e) => `<button class="chip" type="button" data-accion="mes" data-i="${e.i}" data-var="1">${e.nombre}</button>`).join("")}</div>`;

  const HISTORIAS = [
    { id: "nino2023", titulo: "El Niño costero de 2023", desc: "El mar peruano se calentó y el fitoplancton se desplomó." },
    { id: "record2013", titulo: "2013, un mar muy productivo", desc: "El año con más fitoplancton frente al Perú en 27 años." },
    { id: "antartida2023", titulo: "La Antártida en 2023", desc: "Récord de poco hielo y mucho fitoplancton, al revés que en el Perú." },
    { id: "nitrato", titulo: "Mucho nitrato, poco fitoplancton", desc: "Por qué el mar antártico, tan rico en nutrientes, no es más verde." },
  ];

  function mostrarGeneral() {
    vista = { tipo: "general" };
    globo.arcsData([]);
    anillos();
    pintarPines();
    const filas = IDS.map((z) => ({ z, t: anomalia(z, vSel, iMes), a: anomaliaTxt(z, vSel, iMes) }))
      .sort((x, y) => (y.t == null ? -1 : x.t == null ? 1 : Math.abs(y.t) - Math.abs(x.t)));
    const top = filas[0];
    const mes = mesLargo(iMes);
    const resumen = top && top.a
      ? `En ${mes}, la zona más fuera de lo normal fue <strong>${ZONAS[top.z].nombre}</strong>: ${top.a.frase}.`
      : `En ${mes} no hay datos de ${vSel.corto} para estas zonas.`;
    const sinDatoAnt = filas.filter((f) => !esPeru(f.z) && f.t == null).length;
    const notaMapa = mapaActivo()
      ? vSel.mapa === "clorofila"
        ? " El mapa sobre el globo muestra la clorofila en celdas de medio grado: amarillo y verde es mucho fitoplancton; morado, poco."
        : vSel.mapa === "monitor-clorofila"
          ? " El mapa sobre el globo muestra la clorofila del monitor en celdas de medio grado: amarillo y verde es más clorofila; morado, menos."
        : " El mapa sobre el globo muestra cuánto se alejó la temperatura de lo normal en celdas de un grado: naranja es más cálido; azul, más frío; donde el mar estuvo normal casi no hay color."
      : vistaGlobo === "simple" && vSel.mapa ? " Cada punto del globo es una zona de estudio, coloreada según su dato del mes. Para ver el mapa completo del satélite, cambia arriba a la vista <strong>Detallada</strong>." : "";
    pintar(`
      <h2>${vSel.nombre}</h2>
      <p>${vSel.que}${notaMapa}</p>
      <button class="recorrido-cta" type="button" data-accion="recorrido" data-paso="0">
        <b>Del hielo a la anchoveta</b>
        <span>Recorrido guiado en 6 pasos, con datos reales. Unos 3 minutos.</span>
        <svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="16" fill="none" stroke="#3fc28c" stroke-width="1.5"/><path d="M14 11l8 6-8 6z" fill="#eaf3f5"/></svg>
      </button>
      <p>${resumen}${sinDatoAnt && vSel.id === "clorofila_mg_m3" ? " En el invierno antártico no hay datos de color del mar: está oscuro y cubierto de hielo." : ""}</p>
      <h3>Las 7 zonas en ${mes}</h3>
      <ul class="lista-zonas">${filas.map((f) => `<li><button class="fila-zona" type="button" data-accion="zona" data-z="${f.z}">
        <span class="punto" style="background:${colorZona(f.z, vSel, iMes, 1)}"></span>
        <span>${ZONAS[f.z].nombre}<small>${ZONAS[f.z].region}</small></span>
        <span class="valor">${f.a ? f.a.corto : "sin dato"}</span></button></li>`).join("")}</ul>
      <h3>Saltar a un Niño</h3>
      ${chipsEventos()}
      <h3>Historias para explorar</h3>
      <div class="historias">${HISTORIAS.map((h) => `<button class="historia" type="button" data-accion="historia" data-id="${h.id}"><b>${h.titulo}</b><span>${h.desc}</span></button>`).join("")}
        ${MAPA.estado === "listo" && vSel.mapa !== "monitor-clorofila" ? `<button class="historia" type="button" data-accion="comparar"><b>Comparar dos años</b><span>Dos mapas del mismo mes, lado a lado.</span></button>` : ""}</div>
      <div class="acciones-relato">
        <a class="btn btn-claro" href="juego.html">Jugar: del hielo a la anchoveta</a>
        <a class="btn" href="#contenido">Ver los hallazgos</a>
      </div>`);
  }

  function irAZona(z, opciones = {}) {
    const p = ZONAS[z];
    volar({ lat: p.lat + (esPeru(z) ? -3 : 4), lng: p.lon + (esPeru(z) ? -4 : 0), altitude: z === "antartida_peninsula" ? 1.15 : esPeru(z) ? 0.95 : 1.0 }, 1600);
    mostrarZona(z, opciones);
  }

  function conexionesDe(z) {
    return IDS.filter((o) => o !== z).map((o) => ({ o, r: rZonas(z, o, vSel) })).filter((c) => c.r != null).sort((a, b) => b.r - a.r);
  }

  function dibujarArcos(z) {
    const p = ZONAS[z];
    globo.arcsData(conexionesDe(z).map(({ o, r }) => {
      const a = 0.25 + Math.min(1, Math.abs(r)) * 0.75;
      return {
        de: z, a: o, r,
        startLat: p.lat, startLng: p.lon, endLat: ZONAS[o].lat, endLng: ZONAS[o].lon,
        color: r >= 0 ? [`rgba(63,194,140,${a})`, `rgba(63,194,140,${a * 0.6})`] : [`rgba(240,138,75,${a})`, `rgba(240,138,75,${a * 0.6})`],
        grosor: 0.25 + Math.abs(r) * 0.9,
      };
    }));
  }

  function mostrarZona(z, { nota } = {}) {
    vista = { tipo: "zona", z };
    const p = ZONAS[z];
    anillos([{ lat: p.lat, lng: p.lon, r: z === "antartida_peninsula" ? 7 : 4 }]);
    pintarPines();
    dibujarArcos(z);
    const nut = D.nutrientes?.[z] || {};
    const maximos = {};
    for (const n of ["nitrato", "fosfato", "silicato"]) maximos[n] = Math.max(...IDS.map((k) => media(D.nutrientes?.[k]?.[n] || []) || 0));
    const con = conexionesDe(z);
    const masParecida = con[0];
    pintar(`
      <button class="volver" type="button" data-accion="general">Volver a todas las zonas</button>
      ${nota ? `<div class="nota-historia">${nota}</div>` : ""}
      <h2>${p.nombre}</h2>
      <div class="region">${p.region}</div>
      <div class="cifras">
        <div class="cifra"><b class="num" id="z-valor">—</b><span id="z-valor-txt"></span></div>
        <div class="cifra"><b class="num" id="z-tend">—</b><span>tendencia por década (1998–2025)</span></div>
      </div>
      <div class="grafico"><canvas id="grafico-zona" aria-label="Serie mensual de ${vSel.nombre} en ${p.nombre}"></canvas></div>
      <p class="nota">${vSel.fuente} Toca el gráfico para saltar a ese mes.</p>
      <h3>Cambiar el dato</h3>
      ${chipsVariables(z)}
      <h3>Saltar en el tiempo</h3>
      <div class="chips">
        <button class="chip" type="button" data-accion="extremo" data-signo="1">Su mes más alto</button>
        <button class="chip" type="button" data-accion="extremo" data-signo="-1">Su mes más bajo</button>
        <button class="chip" type="button" data-accion="mes" data-i="${idxMes(2023, 4)}">Mayo de 2023</button>
        ${MAPA.estado === "listo" && vSel.mapa !== "monitor-clorofila" ? `<button class="chip" type="button" data-accion="comparar" data-region="${esPeru(z) ? "peru" : "antartida"}">Comparar dos años</button>` : ""}
      </div>
      <h3>¿Con quién se parece?</h3>
      <p>Las líneas del globo unen esta zona con las otras. Verde quiere decir que su ${vSel.corto} sube y baja al mismo tiempo; naranja, que va al revés. ${masParecida ? `La más parecida es <strong>${ZONAS[masParecida.o].nombre}</strong>.` : ""}</p>
      <ul class="conexiones">${con.map(({ o, r }) => `<li><button type="button" data-accion="zona" data-z="${o}">
        <span>${ZONAS[o].nombre}</span>
        <span class="eje"><i style="width:${Math.abs(r) * 100}%;background:${r >= 0 ? "var(--fito)" : "var(--nino)"}"></i></span>
        <span class="r">${fmtR(r)}</span></button></li>`).join("")}</ul>
      <h3>Nutrientes en la superficie</h3>
      <div class="barras-nut">${["nitrato", "fosfato", "silicato"].map((n) => {
        const m = media(nut[n] || []);
        return `<div><span>${mayus(n)}</span><i style="width:${m == null ? 0 : ((m / maximos[n]) * 100).toFixed(0)}%"></i><span class="valor">${m == null ? "—" : nf(1).format(m)}</span></div>`;
      }).join("")}</div>
      <p class="nota">Promedio histórico 1955–2022 en µmol/kg (World Ocean Atlas 2023).</p>
      ${z === RJ ? `<div class="acciones-relato"><button class="btn" type="button" data-accion="base">Ver la Base Machu Picchu</button></div>` : ""}
    `, () => { actualizarZona(); });
  }

  const marcador = {
    id: "marcador",
    afterDatasetsDraw(chart) {
      const x = chart.scales.x.getPixelForValue(iMes - I0);
      const { top, bottom } = chart.chartArea;
      const c = chart.ctx;
      c.save(); c.strokeStyle = "rgba(234,243,245,0.75)"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(x, top); c.lineTo(x, bottom); c.stroke(); c.restore();
    },
  };
  const etiquetasX = MESES_TODOS.slice(I0, ultimo + 1).map((m) => (m.mes === 0 ? String(m.anio) : ""));
  function graficoMensual(canvas, serie, color, ejeY = {}) {
    return new Chart(canvas, {
      type: "line",
      data: { labels: etiquetasX, datasets: [
        { label: "Cada mes", data: serie, borderColor: "rgba(163,188,203,0.45)", borderWidth: 1, pointRadius: 0, spanGaps: false },
        { label: "Promedio de 12 meses", data: mediaMovil(serie), borderColor: color, borderWidth: 2.4, pointRadius: 0, spanGaps: true },
      ] },
      options: {
        animation: false,
        interaction: { mode: "index", intersect: false },
        onClick: (e, els) => { if (els.length) { interaccion(); fijarMes(I0 + els[0].index); } },
        plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { title: (it) => etiquetaMes(MESES_TODOS[I0 + it[0].dataIndex]) } } },
        scales: {
          x: { ticks: { autoSkip: false, maxRotation: 0, callback: (v, i) => { const l = etiquetasX[i]; return l && +l % 5 === 0 ? l : ""; } }, grid: { display: false } },
          y: { ticks: { maxTicksLimit: 5 }, ...ejeY },
        },
      },
      plugins: [marcador],
    });
  }

  function actualizarZona() {
    const z = vista.z;
    const v = vSel.modo === "monitor" ? monitorValue(vSel, iMes) : D.series[z][vSel.id]?.[iMes];
    const a = anomaliaTxt(z, vSel, iMes);
    document.getElementById("z-valor").textContent = v == null ? "sin dato" : valorTxt(vSel, v);
    const invierno = v == null && !esPeru(z) && vSel.id.match(/clorofila|turbidez/) && [4, 5, 6, 7].includes(MESES_TODOS[iMes].mes);
    document.getElementById("z-valor-txt").textContent = `${etiquetaMes(MESES_TODOS[iMes])}${a ? ", " + a.frase : invierno ? ": invierno antártico, el satélite no ve el color del mar" : ""}`;
    if (graf) { graf.update("none"); return; }
    const s = (vSel.modo === "monitor" ? monitorValues(vSel) : (D.series[z][vSel.id] || [])).slice(I0, ultimo + 1).map((x) => (x == null ? null : x * (vSel.factor || 1)));
    const anios = [], vals = [];
    for (let y = 1998; y <= 2025; y++) {
      const t = s.filter((x, i) => MESES_TODOS[I0 + i].anio === y && x != null);
      if (t.length >= 6) { anios.push(y); vals.push(media(t)); }
    }
    const pend = pendiente(anios, vals);
    document.getElementById("z-tend").textContent = pend == null ? "—" : vSel.modo === "log"
      ? `${signo(pend)}${nf(1).format(Math.abs((pend * 10) / media(vals) * 100))} %`
      : `${signo(pend)}${nf(vSel.dec).format(Math.abs(pend * 10))} ${vSel.unidad}`;
    graf = graficoMensual(document.getElementById("grafico-zona"), s, vSel.escala === "rampa" ? "#3fc28c" : "#63cde8");
  }

  function mostrarBase() {
    vista = { tipo: "base" };
    globo.arcsData([]);
    anillos([{ ...BASE, r: 5 }]);
    volar({ lat: -58.5, lng: -58.5, altitude: 0.9 }, 1600);
    const P = D.power;
    const serie = P?.sitios?.base_machu_picchu?.T2M || [];
    const a0 = +P.inicio.slice(0, 4);
    const anios = [], temps = [];
    for (let k = 0; k * 12 < serie.length; k++) {
      const t = serie.slice(k * 12, k * 12 + 12);
      if (t.filter((x) => x != null).length === 12) { anios.push(a0 + k); temps.push(media(t)); }
    }
    const pend = pendiente(anios, temps);
    pintar(`
      <button class="volver" type="button" data-accion="general">Volver a todas las zonas</button>
      <h2>Base Machu Picchu</h2>
      <div class="region">Ensenada Mackellar, isla Rey Jorge, Antártida</div>
      <p>Es la base científica del Perú en la Antártida. Funciona en el verano austral, cuando llegan las expediciones peruanas a estudiar el mar, el hielo y la vida antártica.</p>
      <div class="cifras">
        <div class="cifra"><b class="num">${media(temps) < 0 ? "−" : ""}${nf(1).format(Math.abs(media(temps)))} °C</b><span>temperatura promedio del aire, ${anios[0]}–${anios[anios.length - 1]}</span></div>
        <div class="cifra"><b class="num">${signo(pend)}${nf(2).format(Math.abs(pend * 10))} °C</b><span>tendencia por década</span></div>
      </div>
      <div class="grafico"><canvas id="grafico-base" aria-label="Temperatura anual del aire en la Base Machu Picchu"></canvas></div>
      <p class="nota">Aire a 2 m del suelo, NASA POWER (MERRA-2). La tendencia es débil: los inviernos cambian mucho de un año a otro.</p>
      <h3>¿Qué quieres ver?</h3>
      <div class="chips">
        <button class="chip" type="button" data-accion="zona" data-z="antartida_rey_jorge">El mar de Rey Jorge</button>
        <button class="chip" type="button" data-accion="zona" data-z="antartida_peninsula">La Península Antártica</button>
        <button class="chip" type="button" data-accion="historia" data-id="antartida2023">La Antártida en 2023</button>
      </div>`, () => {
      graf = new Chart(document.getElementById("grafico-base"), {
        type: "bar",
        data: { labels: anios, datasets: [{ label: "°C", data: temps, backgroundColor: temps.map((t) => colorDiverge((t - media(temps)) / 1.2, 0.9)), borderRadius: 2 }] },
        options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 6, maxRotation: 0 } }, y: { ticks: { maxTicksLimit: 5 } } } },
      });
    });
  }

  function mostrarCorriente(id) {
    vista = { tipo: "corriente", id };
    globo.arcsData([]);
    anillos();
    if (id === "humboldt") {
      volar({ lat: -22, lng: -80, altitude: 1.35 }, 1500);
      pintar(`
        <button class="volver" type="button" data-accion="general">Volver a todas las zonas</button>
        <h2>Corriente de Humboldt</h2>
        <div class="region">Del sur de Chile al norte del Perú</div>
        <p>Lleva agua fría hacia el norte, pegada a la costa. Junto con el viento, que empuja el agua de la superficie mar adentro, hace subir agua profunda, fría y llena de nutrientes. A eso se le llama <strong>afloramiento</strong>, y por eso el mar peruano es uno de los más productivos del planeta.</p>
        <p>Cuando llega El Niño, el agua cálida tapa ese afloramiento: hay menos nutrientes, menos fitoplancton y menos anchoveta.</p>
        <h3>¿Qué quieres ver en el globo?</h3>
        ${chipsVariables(null)}
        <h3>Zonas a lo largo de la corriente</h3>
        <div class="chips">${IDS.filter(esPeru).map((z) => `<button class="chip" type="button" data-accion="zona" data-z="${z}">${ZONAS[z].nombre}</button>`).join("")}</div>`);
    } else {
      volar({ lat: -62, lng: -60, altitude: 2.2 }, 1500);
      pintar(`
        <button class="volver" type="button" data-accion="general">Volver a todas las zonas</button>
        <h2>Corriente Circumpolar Antártica</h2>
        <div class="region">Alrededor de toda la Antártida</div>
        <p>Es la corriente más grande del mundo: gira de oeste a este alrededor de la Antártida, empujada por los vientos del oeste, y mantiene sus aguas frías separadas del resto. Frente al sur de Chile, parte de su agua se desvía hacia el norte y alimenta la corriente de Humboldt.</p>
        <p>Por eso la Antártida y el Perú están conectados por el océano. Pero el agua tarda meses o años en llegar y en el camino se mezcla. Los datos muestran que el fitoplancton de los dos lugares casi no cambia al mismo tiempo.</p>
        <h3>¿Qué quieres ver?</h3>
        <div class="chips">
          <button class="chip" type="button" data-accion="zona" data-z="antartida_peninsula">La Península Antártica</button>
          <button class="chip" type="button" data-accion="corriente" data-id="humboldt">La corriente de Humboldt</button>
          <button class="chip" type="button" data-accion="base">La Base Machu Picchu</button>
        </div>`);
    }
  }

  function distanciaKm(a, b, c, d) {
    const R = 6371, rad = Math.PI / 180;
    const x = Math.sin(((c - a) * rad) / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  /* un punto cualquiera del mar: si cae dentro del mapa, se muestran sus datos de satélite */
  function datosPunto(lat, lng) {
    if (MAPA.estado !== "listo") return null;
    const chl = MAPA.capas[vSel.mapa === "monitor-clorofila" ? "monitor-clorofila" : "clorofila"], sst = MAPA.capas.temperatura;
    const cc = chl ? celdaDe(chl, lat, lng) : { fuera: true, j: -1 }, cs = sst ? celdaDe(sst, lat, lng) : { fuera: true, j: -1 };
    if (cc.fuera && cs.fuera) return null;
    const mi = iMes - I0, m = MESES_TODOS[iMes].mes;
    const r = { tierra: cc.j < 0 && cs.j < 0 };
    if (cc.j >= 0) {
      r.chl = valorCapa(chl, cc.j, mi);
      r.chlNormal = climaChl(chl, cc.j, m);
      r.serie = Array.from({ length: ultimo - I0 + 1 }, (_, k) => valorCapa(chl, cc.j, k));
    }
    if (cs.j >= 0) {
      r.anom = valorCapa(sst, cs.j, mi);
      const c = climaCapa(sst, cs.j, m);
      r.sst = r.anom != null && c != null ? c + r.anom : null;
    }
    return r;
  }

  function mostrarPunto(lat, lng) {
    vista = { tipo: "punto", lat, lng };
    globo.arcsData([]);
    anillos([{ lat, lng, r: 2 }]);
    const cerca = IDS.map((z) => ({ z, d: distanciaKm(lat, lng, ZONAS[z].lat, ZONAS[z].lon) })).sort((a, b) => a.d - b.d);
    const dBase = distanciaKm(lat, lng, BASE.lat, BASE.lng);
    const dp = datosPunto(lat, lng);
    const km = (d) => nf(0).format(Math.round(d / 10) * 10);
    let bloque = "";
    if (dp && !dp.tierra) {
      const pc = dp.chl != null && dp.chlNormal ? (dp.chl / dp.chlNormal - 1) * 100 : null;
      bloque = `
        <div class="cifras">
          <div class="cifra"><b class="num">${dp.chl == null ? "sin dato" : nf(dp.chl < 1 ? 2 : 1).format(dp.chl) + " mg/m³"}</b><span>clorofila en ${mesLargo(iMes)}${pc != null ? `, ${nf(0).format(Math.abs(pc))} % ${pc >= 0 ? "más" : "menos"} que un ${MESES_LARGOS[MESES_TODOS[iMes].mes]} normal` : ""}</span></div>
          <div class="cifra"><b class="num">${dp.sst == null ? "sin dato" : nf(1).format(dp.sst) + " °C"}</b><span>temperatura del mar${dp.anom != null ? `, ${signo(dp.anom)}${nf(1).format(Math.abs(dp.anom))} °C frente a lo normal` : ""}</span></div>
        </div>
        ${dp.serie ? `<div class="grafico"><canvas id="grafico-punto" aria-label="Clorofila mensual en este punto, 1998 a 2025"></canvas></div>
        <p class="nota">Clorofila de la celda de medio grado del mapa (ESA OC-CCI v6), en escala logarítmica. Toca el gráfico para saltar a ese mes.</p>` : ""}`;
    } else if (dp && dp.tierra) {
      bloque = `<p>Este punto cae en tierra o en un lugar donde el satélite nunca ve el mar, como el hielo permanente.</p>`;
    }
    pintar(`
      <button class="volver" type="button" data-accion="general">Volver a todas las zonas</button>
      <h2>${fmtCoord(lat, lng)}</h2>
      ${bloque}
      <p>${dp ? "No es una de las 7 zonas de estudio." : "Aquí no hay mapa del satélite ni una zona de estudio."} La zona más cercana es <strong>${ZONAS[cerca[0].z].nombre}</strong>, a unos ${km(cerca[0].d)} km.${dBase < 3000 ? ` La Base Machu Picchu queda a ${km(dBase)} km.` : ""}</p>
      <h3>Ir a una zona cercana</h3>
      <div class="chips">${cerca.slice(0, 3).map(({ z, d }) => `<button class="chip" type="button" data-accion="zona" data-z="${z}">${ZONAS[z].nombre} (${km(d)} km)</button>`).join("")}</div>
      <p class="nota" style="margin-top:18px">El mapa del satélite cubre del ecuador al sur de la Península Antártica, entre los 92° y los 52° O.</p>`, () => {
      const c = document.getElementById("grafico-punto");
      if (c && dp.serie) graf = graficoMensual(c, dp.serie, "#3fc28c", { type: "logarithmic", ticks: { maxTicksLimit: 6, callback: (v) => ([0.03, 0.1, 0.3, 1, 3, 10, 30].includes(+v.toPrecision(1)) ? nf(v < 1 ? 2 : 0).format(v) : "") } });
    });
  }

  function mesExtremo(z, vdef, anio, sgn) {
    let mejor = null, iMejor = null;
    for (let i = I0; i < nMeses; i++) {
      if (anio && MESES_TODOS[i].anio !== anio) continue;
      const t = anomalia(z, vdef, i);
      if (t != null && (mejor == null || t * sgn > mejor * sgn)) { mejor = t; iMejor = i; }
    }
    return iMejor;
  }

  function historia(id) {
    if (id === "nino2023") {
      cambiarVariable(1, false);
      fijarMes(mesExtremo(CN, vSel, 2023, 1), false);
      const a = anomaliaTxt(CN, vSel, iMes);
      const chl = anomaliaTxt(CN, VARIABLES[0], iMes);
      irAZona(CN, { nota: `<b>El Niño costero de 2023</b><p>En ${etiquetaMes(MESES_TODOS[iMes])} el mar frente a Chimbote estaba ${a ? a.frase : "más cálido"}. ${chl ? `Su fitoplancton: ${chl.frase}.` : ""} Ese año se canceló la primera temporada de pesca de anchoveta. Prueba el botón de reproducir para ver cómo avanza el calor.</p>` });
    } else if (id === "record2013") {
      cambiarVariable(0, false);
      fijarMes(mesExtremo(CN, vSel, 2013, 1), false);
      const a = anomaliaTxt(CN, vSel, iMes);
      irAZona(CN, { nota: `<b>2013, un mar muy productivo</b><p>Fue el año con más fitoplancton frente al centro-norte del Perú en 27 años. En ${etiquetaMes(MESES_TODOS[iMes])} había ${a ? a.frase : "mucho fitoplancton"}. El agua estuvo fría y la cosecha de concha de abanico llegó a su máximo.</p>` });
    } else if (id === "antartida2023") {
      cambiarVariable(0, false);
      fijarMes(mesExtremo(RJ, vSel, 2023, 1), false);
      const a = anomaliaTxt(RJ, vSel, iMes);
      const h = D.juego.find((j) => j.anio === 2023)?.hielo;
      irAZona(RJ, { nota: `<b>La Antártida en 2023</b><p>En ${etiquetaMes(MESES_TODOS[iMes])} el mar de Rey Jorge tenía ${a ? a.frase : "mucho fitoplancton"}. El hielo marino antártico quedó, en promedio, ${h != null ? nf(1).format(Math.abs(h)) : "1,8"} millones de km² por debajo de lo normal, el más bajo registrado. Mientras tanto, frente al Perú, El Niño hacía lo contrario.</p>` });
    } else if (id === "nitrato") {
      cambiarVariable(0, false);
      fijarMes(idxMes(2023, 0), false);
      irAZona(RJ, { nota: `<b>Mucho nitrato, poco fitoplancton</b><p>Mira las barras de nutrientes más abajo: aquí hay varias veces más nitrato que frente al Perú. Aun así hay menos fitoplancton, porque falta hierro y, en invierno, luz. Compáralo tocando Chimbote en el globo.</p>` });
    }
  }

  /* ---------- comparar dos años (mapas lado a lado) ---------- */
  const REGIONES = {
    peru: { nombre: "Costa del Perú", frase: "la costa del Perú", mar: "el mar del Perú", lat: [-2, -20], lon: [-86, -70], pov: { lat: -12, lng: -80, altitude: 0.95 } },
    antartida: { nombre: "Península Antártica", frase: "la Península Antártica", mar: "el mar de la Península Antártica", lat: [-58, -68], lon: [-72, -52], pov: { lat: -58, lng: -62, altitude: 1.0 } },
  };
  let cmp = { region: "peru", mes: 4, a: "prom", b: 2023 };
  const valorCmp = (capa, j, mi, mCal) => (mi === "prom" ? (capa.clave === "clorofila" ? climaChl(capa, j, mCal) : 0) : valorCapa(capa, j, mi));

  function recorrerRegion(capa, reg, fn) {
    const { g } = capa, M = window.MAPAS;
    for (let r = 0; r < g.filas; r++) {
      const lat = M.lat_n - r * g.celda; // borde norte de la celda
      if (lat - g.celda >= reg.lat[0] || lat <= reg.lat[1]) continue;
      for (let c = 0; c < g.cols; c++) {
        const lng = M.lon_o + c * g.celda; // borde oeste
        if (lng + g.celda <= reg.lon[0] || lng >= reg.lon[1]) continue;
        fn(capa.pos[r * g.cols + c], lat, lng);
      }
    }
  }
  function promedioRegion(capa, reg, mi, mCal) {
    // media geométrica para la clorofila, simple para la anomalía de temperatura
    let s = 0, n = 0;
    recorrerRegion(capa, reg, (j) => {
      if (j < 0) return;
      const v = valorCmp(capa, j, mi, mCal);
      if (v == null) return;
      s += capa.clave === "clorofila" ? Math.log10(v) : v; n++;
    });
    return n ? (capa.clave === "clorofila" ? 10 ** (s / n) : s / n) : null;
  }
  function dibujarRegion(canvas, capa, reg, mi, mCal) {
    const lado = 6 / capa.g.celda; // píxeles por grado
    const w = Math.round((reg.lon[1] - reg.lon[0]) * lado), h = Math.round((reg.lat[0] - reg.lat[1]) * lado);
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = A.PALETAS[PALETA].tierraSimple; ctx.fillRect(0, 0, w, h); // tierra o hielo permanente (mismo color que el atlas)
    const tam = Math.ceil(capa.g.celda * lado);
    recorrerRegion(capa, reg, (j, lat, lng) => {
      if (j < 0) return;
      const v = valorCmp(capa, j, mi, mCal);
      ctx.fillStyle = v == null ? "rgba(120,140,155,0.45)" : capa.clave === "clorofila" ? colorRampa(tChl(v), 1) : colorDiverge(v / VARIABLES[1].rango, 1);
      ctx.fillRect(Math.floor((lng - reg.lon[0]) * lado), Math.floor((reg.lat[0] - lat) * lado), tam, tam);
    });
  }

  function mostrarComparar(opc = {}) {
    if (MAPA.estado !== "listo") return;
    if (!vSel.mapa) cambiarVariable(0, false);
    cmp = { ...cmp, ...opc };
    const capaClave = vSel.mapa, capa = MAPA.capas[capaClave], reg = REGIONES[cmp.region];
    if (capaClave === "temperatura" && cmp.a === "prom") cmp.a = 2013;
    const primera = vista.tipo !== "comparar" || opc.region;
    vista = { tipo: "comparar" };
    globo.arcsData([]);
    anillos();
    if (primera) volar(reg.pov, 1400);
    const anioFin = MESES_TODOS[ultimo].anio;
    const anios = Array.from({ length: anioFin - 1998 + 1 }, (_, k) => 1998 + k).filter((a) => idxMes(a, cmp.mes) <= ultimo);
    if (!anios.includes(+cmp.b)) cmp.b = anios[anios.length - 1];
    const opAnio = (sel) => `${capaClave === "clorofila" ? `<option value="prom"${sel === "prom" ? " selected" : ""}>Promedio 1998–2020</option>` : ""}${anios.map((a) => `<option value="${a}"${+sel === a ? " selected" : ""}>${a}</option>`).join("")}`;
    const miDe = (x) => (x === "prom" ? "prom" : idxMes(+x, cmp.mes) - I0);
    const va = promedioRegion(capa, reg, miDe(cmp.a), cmp.mes), vb = promedioRegion(capa, reg, miDe(cmp.b), cmp.mes);
    const mesN = MESES_LARGOS[cmp.mes];
    const nomA = cmp.a === "prom" ? `Un ${mesN} promedio` : `${mayus(mesN)} de ${cmp.a}`;
    const nomB = `${mayus(mesN)} de ${cmp.b}`;
    const fmtV = (v) => (v == null ? "sin dato" : capaClave === "clorofila" ? `${nf(v < 1 ? 2 : 1).format(v)} mg/m³ en promedio` : `${signo(v)}${nf(1).format(Math.abs(v))} °C frente a lo normal`);
    let conclusion = "";
    if (va != null && vb != null) {
      if (capaClave === "clorofila") {
        const p = (vb / va - 1) * 100;
        conclusion = `En ${nomB.toLowerCase()}, ${reg.frase} tuvo <strong>${nf(0).format(Math.abs(p))} % ${p >= 0 ? "más" : "menos"} clorofila</strong> que en ${nomA.toLowerCase()}, en promedio de todas sus celdas con dato.`;
      } else {
        const d = vb - va;
        conclusion = `Frente a lo normal, en ${nomB.toLowerCase()} ${reg.mar} estuvo en promedio <strong>${nf(1).format(Math.abs(d))} °C ${d >= 0 ? "más cálido" : "más frío"}</strong> que en ${nomA.toLowerCase()}.`;
      }
    }
    pintar(`
      <button class="volver" type="button" data-accion="general">Volver a todas las zonas</button>
      <h2>Comparar dos años</h2>
      <p>El mismo mes en dos años distintos, celda por celda. ${capaClave === "clorofila" ? "Los colores son los del mapa del globo: amarillo y verde es mucho fitoplancton; morado, poco." : "Naranja es más cálido que lo normal; azul, más frío."} El gris es un mes sin dato (nubes o hielo) y el verde grisáceo, tierra.</p>
      <div class="selectores">
        <label>Lugar<select id="cmp-region">${Object.entries(REGIONES).map(([k, r]) => `<option value="${k}"${k === cmp.region ? " selected" : ""}>${r.nombre}</option>`).join("")}</select></label>
        <label>Mes<select id="cmp-mes">${MESES_LARGOS.map((m, k) => `<option value="${k}"${k === cmp.mes ? " selected" : ""}>${m}</option>`).join("")}</select></label>
        <label>Mapa de la izquierda<select id="cmp-a">${opAnio(cmp.a)}</select></label>
        <label>Mapa de la derecha<select id="cmp-b">${opAnio(cmp.b)}</select></label>
      </div>
      <div class="comparar">
        <figure><canvas id="cmp-ca" role="img" aria-label="Mapa de ${nomA.toLowerCase()}: ${fmtV(va)}"></canvas><figcaption><b>${nomA}</b>${fmtV(va)}</figcaption></figure>
        <figure><canvas id="cmp-cb" role="img" aria-label="Mapa de ${nomB.toLowerCase()}: ${fmtV(vb)}"></canvas><figcaption><b>${nomB}</b>${fmtV(vb)}</figcaption></figure>
      </div>
      <p>${conclusion}</p>
      <div class="chips">
        <button class="chip" type="button" data-accion="var" data-k="0" aria-pressed="${capaClave === "clorofila"}">Fitoplancton</button>
        <button class="chip" type="button" data-accion="var" data-k="1" aria-pressed="${capaClave === "temperatura"}">Temperatura</button>
        <button class="chip" type="button" data-accion="mes" data-i="${idxMes(+cmp.b, cmp.mes)}">Ver ${nomB.toLowerCase()} en el globo</button>
      </div>
      <p class="nota" style="margin-top:16px">${capaClave === "clorofila" ? "Clorofila-a de ESA OC-CCI v6 en celdas de medio grado; el promedio es la media geométrica de 1998 a 2020." : "Anomalía de la temperatura de NOAA Coral Reef Watch en celdas de un grado, frente al promedio 1998–2020 de cada mes."}</p>`, () => {
      dibujarRegion(document.getElementById("cmp-ca"), capa, reg, miDe(cmp.a), cmp.mes);
      dibujarRegion(document.getElementById("cmp-cb"), capa, reg, miDe(cmp.b), cmp.mes);
    });
  }
  relato.addEventListener("change", (e) => {
    const id = e.target.id;
    if (!id || !id.startsWith("cmp-")) return;
    const v = e.target.value;
    const ajuste = { "cmp-region": { region: v }, "cmp-mes": { mes: +v }, "cmp-a": { a: v === "prom" ? "prom" : +v }, "cmp-b": { b: +v } }[id];
    mostrarComparar(ajuste);
    document.getElementById(id)?.focus();
  });

  /* ---------- recorrido guiado: del hielo a la anchoveta ---------- */
  const enGrilla = (clave, lat, lng, mi) => {
    const capa = MAPA.capas[clave];
    return capa ? valorCapa(capa, celdaDe(capa, lat, lng).j, mi) : null;
  };
  const pescaAnio = (a) => D.pesca.anchoveta_peru[a - D.pesca.inicio];
  const monitorYearValues = (id, anio) => (MONITOR?.records || []).filter((r) => r.date.startsWith(`${anio}-`) && r[id] != null).map((r) => Number(r[id]));
  const monitorYearMean = (id, anio) => {
    const xs = monitorYearValues(id, anio);
    return xs.length ? media(xs) : null;
  };
  const monitorLatest = (id) => [...(MONITOR?.records || [])].reverse().find((r) => r[id] != null);
  const hieloMinimo = D.juego.filter((j) => j.hielo != null).reduce((min, j) => !min || j.hielo < min.hielo ? j : min, null);
  const anioMasVerde = (() => {
    let mejor = null;
    for (let anio = 1998; anio <= 2025; anio++) {
      const xs = [];
      for (let i = 0; i < nMeses; i++) if (MESES_TODOS[i].anio === anio && D.series[CN].clorofila_mg_m3[i] != null) xs.push(D.series[CN].clorofila_mg_m3[i]);
      const valor = xs.length ? media(xs) : null;
      if (valor != null && (!mejor || valor > mejor.valor)) mejor = { anio, valor };
    }
    return mejor?.anio || 2013;
  })();
  const anioInicioJuego = D.juego[0]?.anio;
  const anioFinJuego = D.juego.at(-1)?.anio;

  const RECORRIDO = [
    {
      titulo: "El mar más verde del Pacífico sur",
      preparar() { cambiarVariable(0, false); fijarMes(mesExtremo(CN, VARIABLES[0], anioMasVerde, 1), false); volar({ lat: -13, lng: -86, altitude: 1.1 }, 2200); },
      texto() {
        const v = D.series[CN].clorofila_mg_m3[iMes];
        const lejos = enGrilla("clorofila", -9.25, -89.75, iMes - I0);
        const veces = v && lejos ? v / lejos : null;
        return {
          p: `<p>Mira la franja amarilla y verde pegada a la costa del Perú: es <strong>fitoplancton</strong>, visto por satélites que miden el color del mar. Mar adentro el agua es morada: tiene muy poco fitoplancton.</p><p>Es ${mesLargo(iMes)}, el mes más verde de ${anioMasVerde} frente a Chimbote según la serie cargada. Pasa el cursor sobre el mapa para leer cada punto.</p>`,
          dato: v ? `<b class="num">${nf(1).format(v)} mg/m³</b><span>de clorofila frente a Chimbote${veces ? `: unas ${nf(0).format(veces)} veces más que a 1 200 km mar adentro (${nf(2).format(lejos)} mg/m³)` : ""}.</span>` : "",
        };
      },
    },
    {
      titulo: "El motor: viento y agua fría que sube",
      preparar() { volar({ lat: -20, lng: -82, altitude: 1.45 }, 2000); },
      corriente: "humboldt",
      texto() {
        const sst = MAPA.capas.temperatura, m = MESES_TODOS[iMes].mes;
        const costa = sst ? climaCapa(sst, celdaDe(sst, -12.5, -77.5).j, m) : null;
        const afuera = sst ? climaCapa(sst, celdaDe(sst, -12.5, -88.5).j, m) : null;
        return {
          p: `<p>La <strong>corriente de Humboldt</strong>, la línea animada, trae agua fría desde el sur. El viento empuja el agua de la superficie mar adentro y desde abajo sube agua fría cargada de nitrato y fosfato: el <strong>afloramiento</strong>. Con esos nutrientes y el sol de todo el año, el fitoplancton crece.</p>`,
          dato: costa != null && afuera != null ? `<b class="num">${nf(1).format(afuera - costa)} °C más fría</b><span>es el agua junto a Callao que a 1 200 km mar adentro, en un ${MESES_LARGOS[m]} promedio de 1998–2020 (${nf(1).format(costa)} °C frente a ${nf(1).format(afuera)} °C).</span>` : "",
        };
      },
    },
    {
      titulo: "Llega El Niño",
      preparar() { cambiarVariable(1, false); fijarMes(EVENTOS.find((e) => e.anio === 2023)?.i ?? idxMes(2023, 2), false); volar({ lat: -10, lng: -86, altitude: 1.25 }, 2000); },
      texto() {
        const a = anomaliaTxt(CN, VARIABLES[1], iMes);
        return {
          p: `<p>En ${mesLargo(iMes)} el agua frente al norte del Perú se calentó. En el globo, el naranja muestra dónde el mar estuvo más cálido que lo normal para ese mes. El agua cálida forma una tapa en la superficie y el agua fría con nutrientes ya no llega arriba.</p><p>Debajo del globo, en la línea de tiempo, las barras naranjas marcan cada vez que pasó lo mismo.</p>`,
          dato: NINO[iMes] != null ? `<b class="num">${signo(NINO[iMes])}${nf(1).format(Math.abs(NINO[iMes]))} °C</b><span>sobre lo normal en la región Niño 1+2 (índice de NOAA)${a ? `; frente a Chimbote, ${a.frase}` : ""}.</span>` : "",
        };
      },
    },
    {
      titulo: "El fitoplancton se apaga y la pesca cae",
      preparar() { cambiarVariable(0, false); fijarMes(EVENTOS.find((e) => e.anio === 2023)?.i ?? idxMes(2023, 2), false); volar({ lat: -10, lng: -84, altitude: 1.05 }, 1600); },
      texto() {
        const a = anomaliaTxt(CN, VARIABLES[0], iMes);
        const anio = MESES_TODOS[iMes].anio, anioAnterior = anio - 1;
        const p22 = pescaAnio(anioAnterior), p23 = pescaAnio(anio);
        const caida = p22 && p23 ? (1 - p23 / p22) * 100 : null;
        const biomasa = monitorYearMean("biomass_total_t_interpolated", anio);
        const ultimaBiomasa = monitorLatest("biomass_total_t_interpolated");
        const monitorTexto = biomasa != null
          ? `En el monitor, la biomasa interpolada media de ${anio} fue de ${nf(1).format(biomasa / 1e6)} millones de toneladas; es una reconstrucción para visualizar entre cruceros, no una observación mensual.`
          : `El monitor de biomasa no tiene cobertura interpolada para ${anio}; su último valor disponible es ${ultimaBiomasa ? `${nf(1).format(ultimaBiomasa.biomass_total_t_interpolated / 1e6)} millones de toneladas en ${ultimaBiomasa.date.slice(0, 7)}` : "sin dato"}.`;
        return {
          p: `<p>El mismo mes, ahora con el fitoplancton${a ? `: frente a Chimbote hubo ${a.frase}` : ""}. Menos fitoplancton puede significar menos alimento disponible para el zooplancton y la anchoveta, pero esta página muestra una asociación, no una causa demostrada.</p>${caida != null ? `<p>En ${anio}, el Perú pescó ${nf(1).format(p23 / 1e6)} millones de toneladas de anchoveta, frente a ${nf(1).format(p22 / 1e6)} millones en ${anioAnterior} (FAO).</p>` : ""}<p>${monitorTexto}</p>`,
          dato: caida != null ? `<b class="num">${nf(0).format(Math.abs(caida))} % ${caida >= 0 ? "menos" : "más"}</b><span>cambio de anchoveta pescada entre ${anioAnterior} y ${anio}. La pesca también depende de las cuotas: no mide directamente cuántos peces hay.</span>` : `<b class="num">sin comparación</b><span>FAO no tiene dos años consecutivos disponibles para este paso.</span>`,
        };
      },
    },
    {
      titulo: "Mientras tanto, en la Antártida",
      preparar() { cambiarVariable(0, false); fijarMes(mesExtremo(RJ, VARIABLES[0], 2023, 1), false); volar({ lat: -55, lng: -62, altitude: 1.15 }, 2400); },
      texto() {
        const a = anomaliaTxt(RJ, VARIABLES[0], iMes);
        const h = hieloMinimo?.hielo;
        const hAnio = hieloMinimo?.anio;
        return {
          p: `<p>A unos 6 000 km al sur, junto a la Base Machu Picchu, el mar de la isla Rey Jorge tuvo mucho fitoplancton en ${mesLargo(iMes)}${a ? ` (${a.frase})` : ""}.</p><p>En la serie cargada, ${hAnio} fue el año con menor anomalía media de hielo marino antártico. Bajo ese hielo vive el krill, la base de la cadena antártica.</p>`,
          dato: h != null ? `<b class="num">${nf(1).format(Math.abs(h))} millones de km²</b><span>por debajo de lo normal en ${hAnio}, según la serie NSIDC cargada.</span>` : "",
        };
      },
    },
    {
      titulo: "¿Hay un hilo que los une?",
      preparar() { cambiarVariable(0, false); volar({ lat: -38, lng: -72, altitude: 2.35 }, 2600); },
      arcos: RJ,
      texto() {
        const r = pearson(D.juego.map((j) => j.chl_rj), D.juego.map((j) => j.chl_cn));
        return {
          p: `<p>El agua antártica sí viaja al norte: la corriente circumpolar alimenta a la de Humboldt. Pero tarda meses o años y en el camino se mezcla. Las líneas del globo muestran cuánto se parecen, mes a mes, el fitoplancton de Rey Jorge y el de cada zona del Perú.</p><p>La pregunta queda abierta para el equipo: ¿el vínculo aparece con retraso, a través de los nutrientes o del viento? Para eso sirven estos datos.</p>`,
          dato: r != null ? `<b class="num">r = ${fmtR(r)}</b><span>entre el fitoplancton anual de Rey Jorge y el de Chimbote (${anioInicioJuego}–${anioFinJuego}): relación en el mismo año.</span>` : "",
        };
      },
    },
  ];

  function mostrarPaso(n) {
    n = Math.max(0, Math.min(RECORRIDO.length - 1, n));
    const paso = RECORRIDO[n];
    const nuevo = !(vista.tipo === "recorrido" && vista.paso === n);
    if (nuevo) {
      pausar();
      // el recorrido necesita ver el mapa del satélite: pasa a la vista detallada
      if (vistaGlobo !== "detallada") fijarVista("detallada", false);
      vista = { tipo: "recorrido", paso: n }; paso.preparar();
    }
    vista = { tipo: "recorrido", paso: n, id: paso.corriente };
    anillos();
    if (paso.arcos) dibujarArcos(paso.arcos); else globo.arcsData([]);
    const t = paso.texto();
    const final = n === RECORRIDO.length - 1;
    pintar(`
      <button class="volver" type="button" data-accion="general">Salir del recorrido</button>
      <ol class="pasos" aria-hidden="true">${RECORRIDO.map((_, k) => `<li class="${k <= n ? "hecho" : ""}"></li>`).join("")}</ol>
      <p class="paso-num">Paso ${n + 1} de ${RECORRIDO.length}</p>
      <h2>${paso.titulo}</h2>
      ${t.p}
      ${t.dato ? `<div class="dato-clave">${t.dato}</div>` : ""}
      <div class="nav-pasos">
        ${n > 0 ? `<button class="btn" type="button" data-accion="recorrido" data-paso="${n - 1}">Anterior</button>` : ""}
        ${final
          ? `<button class="btn btn-claro" type="button" data-accion="general">Explorar por mi cuenta</button><a class="btn" href="juego.html">Jugar</a>`
          : `<button class="btn btn-claro" type="button" data-accion="recorrido" data-paso="${n + 1}">Siguiente</button>`}
      </div>
      <p class="nota" style="margin-top:16px">También puedes avanzar o retroceder con las flechas del teclado.</p>`);
    if (nuevo && !esAngosto()) relato.querySelector(".nav-pasos .btn-claro")?.focus({ preventScroll: true });
  }

  relato.addEventListener("click", (e) => {
    const b = e.target.closest("[data-accion]");
    if (!b) return;
    interaccion();
    const acc = b.dataset.accion;
    if (acc === "zona") irAZona(b.dataset.z);
    else if (acc === "general") { mostrarGeneral(); volar(VISTA_INICIAL(), 1500); }
    else if (acc === "var") cambiarVariable(+b.dataset.k);
    else if (acc === "historia") historia(b.dataset.id);
    else if (acc === "base") mostrarBase();
    else if (acc === "corriente") mostrarCorriente(b.dataset.id);
    else if (acc === "mes") { if (b.dataset.var && !vSel.mapa) cambiarVariable(+b.dataset.var, false); fijarMes(+b.dataset.i); }
    else if (acc === "extremo") { const i = mesExtremo(vista.z, vSel, null, +b.dataset.signo); if (i != null) fijarMes(i); }
    else if (acc === "recorrido") mostrarPaso(+b.dataset.paso);
    else if (acc === "comparar") mostrarComparar({ ...(b.dataset.region ? { region: b.dataset.region } : {}), mes: MESES_TODOS[iMes].mes, b: MESES_TODOS[iMes].anio });
  });

  /* ---------- controles ---------- */
  const leyMarcas = document.getElementById("ley-marcas");
  const DIVERGE = "linear-gradient(90deg, rgb(43,108,176), rgb(214,226,232), rgb(228,87,46))";
  function actualizarLeyenda() {
    const rampa = document.getElementById("ley-rampa");
    const conMapa = mapaActivo();
    if (vSel.mapa === "clorofila" || vSel.mapa === "monitor-clorofila") {
      rampa.style.background = "var(--rampa)";
      document.getElementById("ley-min").textContent = vSel.mapa === "monitor-clorofila" ? "menos clorofila" : "poco fitoplancton";
      document.getElementById("ley-max").textContent = vSel.mapa === "monitor-clorofila" ? "más clorofila" : "mucho fitoplancton (alimento)";
      leyMarcas.innerHTML = [0.03, 0.1, 0.3, 1, 3, 10].map((v, k, a) => `<span style="left:${(tChl(v) * 100).toFixed(1)}%;${k === 0 ? "transform:none" : k === a.length - 1 ? "transform:translateX(-100%)" : ""}">${nf(v < 0.1 ? 2 : v < 1 ? 1 : 0).format(v)}</span>`).join("");
    } else if (vSel.mapa === "temperatura") {
      rampa.style.background = DIVERGE;
      document.getElementById("ley-min").textContent = "más frío que lo normal";
      document.getElementById("ley-max").textContent = "más caliente que lo normal";
      leyMarcas.innerHTML = `<span style="left:0;transform:none">−3 °C</span><span style="left:50%">0</span><span style="left:100%;transform:translateX(-100%)">+3 °C</span>`;
    } else {
      rampa.style.background = DIVERGE;
      document.getElementById("ley-min").textContent = vSel.modo === "monitor" ? "valor bajo en el monitor" : "por debajo de lo normal";
      document.getElementById("ley-max").textContent = vSel.modo === "monitor" ? "valor alto en el monitor" : "por encima";
      leyMarcas.innerHTML = "";
    }
    el.setAttribute("aria-label", `Globo terrestre con ${vSel.nombre.toLowerCase()} en ${mesLargo(iMes)}${conMapa && vSel.mapa ? ", con el mapa del satélite sobre el Pacífico sureste y la Antártida" : ""}. Las 7 zonas de estudio están en la lista del panel.`);
  }
  function refrescarGlobo() {
    ocultarLectura();
    pintarPines();
    mesTxt.textContent = etiquetaMes(MESES_TODOS[iMes]);
    cajaEventos.querySelectorAll(".evento").forEach((b) => b.setAttribute("aria-current", String(+b.dataset.i === iMes)));
    dibujarMapa();
  }
  function refrescarRelato() {
    if (vista.tipo === "general") mostrarGeneral();
    else if (vista.tipo === "zona") actualizarZona();
    else if (vista.tipo === "punto") mostrarPunto(vista.lat, vista.lng);
    else if (vista.tipo === "recorrido") mostrarPaso(vista.paso);
    else guardarEstado();
  }
  function cambiarVariable(k, repintar = true) {
    vSel = VARIABLES[k];
    selVar.value = k;
    actualizarLeyenda();
    actualizarBotonCapa();
    refrescarGlobo();
    if (!repintar) return;
    if (vista.tipo === "zona") mostrarZona(vista.z);
    else if (vista.tipo === "general") mostrarGeneral();
    else if (vista.tipo === "comparar") mostrarComparar();
    else if (vista.tipo === "recorrido") mostrarPaso(vista.paso);
    else document.querySelectorAll('[data-accion="var"]').forEach((c) => c.setAttribute("aria-pressed", String(+c.dataset.k === k)));
  }
  function fijarMes(i, repintar = true) {
    if (i == null) return;
    iMes = Math.max(I0, Math.min(+rango.max, i));
    rango.value = iMes;
    refrescarGlobo();
    actualizarLeyenda();
    if (repintar) refrescarRelato();
  }

  selVar.addEventListener("change", () => { interaccion(); cambiarVariable(+selVar.value); });
  rango.addEventListener("input", () => { interaccion(); fijarMes(+rango.value); });

  let reloj = null;
  const btnPlay = document.getElementById("reproducir");
  const icono = document.getElementById("icono-play");
  function pausar() {
    if (!reloj) return;
    clearInterval(reloj); reloj = null;
    icono.innerHTML = '<path d="M4 2l10 6-10 6z" fill="currentColor"/>';
    btnPlay.setAttribute("aria-label", "Reproducir la animación por meses");
    guardarEstado();
  }
  btnPlay.addEventListener("click", () => {
    interaccion();
    if (reloj) return pausar();
    icono.innerHTML = '<path d="M4 2h3v12H4zM9 2h3v12H9z" fill="currentColor"/>';
    btnPlay.setAttribute("aria-label", "Pausar la animación");
    if (iMes >= +rango.max) iMes = I0;
    reloj = setInterval(() => fijarMes(iMes >= +rango.max ? I0 : iMes + 1), 300);
  });
  document.addEventListener("keydown", (e) => {
    const t = e.target, escribiendo = t.closest && t.closest("input, select, textarea");
    if (e.key === "Escape" && vista.tipo !== "general") { mostrarGeneral(); volar(VISTA_INICIAL(), 1500); }
    else if (vista.tipo === "recorrido" && !escribiendo && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault();
      mostrarPaso(vista.paso + (e.key === "ArrowRight" ? 1 : -1));
    }
  });

  /* ---------- el enlace guarda lo que se está viendo (para compartirlo con el equipo) ---------- */
  let relojHash = null;
  function guardarEstado() {
    if (reloj) return;
    clearTimeout(relojHash);
    relojHash = setTimeout(() => {
      const p = new URLSearchParams();
      const m = MESES_TODOS[iMes];
      p.set("mes", `${m.anio}-${String(m.mes + 1).padStart(2, "0")}`);
      p.set("dato", vSel.clave);
      if (vista.tipo === "zona") p.set("zona", vista.z);
      if (vista.tipo === "recorrido") p.set("paso", vista.paso + 1);
      p.set("vista", vistaGlobo);
      if (vistaGlobo === "detallada") p.set("estilo", estiloMapa);
      try { history.replaceState(null, "", "#" + p.toString()); } catch (e) { /* algunos navegadores lo bloquean en file: */ }
    }, 250);
  }
  function leerEstado() {
    const h = location.hash.slice(1);
    if (!h.includes("=")) return null;
    const p = new URLSearchParams(h);
    const k = VARIABLES.findIndex((v) => v.clave === p.get("dato"));
    if (k >= 0) cambiarVariable(k, false);
    const [a, m] = (p.get("mes") || "").split("-").map(Number);
    if (a && m) { const i = idxMes(a, m - 1); if (i >= 0) fijarMes(i, false); }
    if (p.get("vista") === "detallada" || p.get("vista") === "simple") vistaGlobo = p.get("vista");
    if (ESTILOS_MAPA.includes(p.get("estilo"))) estiloMapa = p.get("estilo");
    return { zona: ZONAS[p.get("zona")] ? p.get("zona") : null, paso: +p.get("paso") || 0 };
  }

  /* ---------- inicio ---------- */
  ajustarTamano();
  const inicial = leerEstado();
  ponerAtlas();
  actualizarLeyenda();
  actualizarBotonCapa();
  refrescarGlobo();
  if (inicial?.zona) irAZona(inicial.zona);
  else if (inicial?.paso) mostrarPaso(inicial.paso - 1);
  else {
    mostrarGeneral();
    if (menosMovimiento) globo.pointOfView(VISTA_INICIAL(), 0);
    else { globo.pointOfView({ lat: -66, lng: -60, altitude: 1.4 }, 0); setTimeout(() => { if (vista.tipo === "general") volar(VISTA_INICIAL(), 4200); }, 900); }
  }
  // el mapa pesa unos 3 MB: se pide cuando el globo ya está en pantalla
  let mapaPedido = false;
  const pedirMapa = () => { if (!mapaPedido) { mapaPedido = true; cargarMapas(); } };
  globo.onGlobeReady(() => { pintarPines(); setTimeout(pedirMapa, 300); });
  setTimeout(pintarPines, 600);
  setTimeout(pedirMapa, 2500);

  /* ---------- hallazgos (secciones de abajo) ---------- */
  const J = D.juego;
  const anios = J.map((j) => j.anio);
  const col = (k) => J.map((j) => j[k]);
  const fijarR = (id, txt) => { document.getElementById(id).firstChild.nodeValue = txt; };
  const ejes = (extra = {}) => ({ x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }, ...extra });

  fijarR("r1", "r = " + fmtR(pearson(col("nino12"), col("anchoveta"))));
  new Chart(document.getElementById("g1"), {
    data: { labels: anios, datasets: [
      { type: "bar", label: "Niño 1+2 (°C sobre lo normal)", data: col("nino12"), yAxisID: "y", backgroundColor: col("nino12").map((v) => (v > 0 ? "#f08a4b" : "#2b6cb0")), borderRadius: 3 },
      { type: "line", label: "Anchoveta pescada (millones de t)", data: col("anchoveta").map((v) => v / 1e6), yAxisID: "y1", borderColor: "#3fc28c", backgroundColor: "#3fc28c", borderWidth: 2.5, pointRadius: 2.5, tension: 0.25 },
    ] },
    options: { plugins: { legend: { position: "bottom" } }, scales: ejes({ y: { title: { display: true, text: "°C" } }, y1: { position: "right", grid: { display: false }, title: { display: true, text: "millones de t" } } }) },
  });

  fijarR("r2", "r = " + fmtR(pearson(col("chl_rj"), col("chl_cn"))));
  new Chart(document.getElementById("g2"), {
    type: "line",
    data: { labels: anios, datasets: [
      { label: "Rey Jorge (% sobre lo normal)", data: col("chl_rj"), borderColor: "#63cde8", backgroundColor: "#63cde8", borderWidth: 2.4, pointRadius: 2.5, tension: 0.25 },
      { label: "Chimbote (% sobre lo normal)", data: col("chl_cn"), borderColor: "#3fc28c", backgroundColor: "#3fc28c", borderWidth: 2.4, pointRadius: 2.5, tension: 0.25 },
    ] },
    options: { plugins: { legend: { position: "bottom" } }, scales: ejes({ y: { title: { display: true, text: "%" } } }) },
  });

  const P = D.pesca;
  const krill = anios.map((a) => P.krill_mundo[a - P.inicio]);
  const h23 = J.find((j) => j.anio === 2023)?.hielo;
  fijarR("r3", h23 == null ? "—" : nf(1).format(Math.abs(h23)));
  new Chart(document.getElementById("g3"), {
    data: { labels: anios, datasets: [
      { type: "bar", label: "Hielo marino (millones de km² frente a lo normal)", data: col("hielo"), yAxisID: "y", backgroundColor: col("hielo").map((v) => (v < 0 ? "rgba(99,205,232,0.45)" : "#63cde8")), borderRadius: 3 },
      { type: "line", label: "Krill pescado en el mundo (miles de t)", data: krill.map((v) => (v == null ? null : v / 1e3)), yAxisID: "y1", borderColor: "#eaf3f5", backgroundColor: "#eaf3f5", borderWidth: 2, pointRadius: 2, tension: 0.25 },
    ] },
    options: { plugins: { legend: { position: "bottom" } }, scales: ejes({ y: { title: { display: true, text: "millones de km²" } }, y1: { position: "right", grid: { display: false }, title: { display: true, text: "miles de t" } } }) },
  });

  const nitr = IDS.map((z) => media(D.nutrientes?.[z]?.nitrato || []));
  const chlm = IDS.map((z) => media((D.series[z].clorofila_mg_m3 || []).slice(I0)));
  const iRJ = IDS.indexOf(RJ), iCN = IDS.indexOf(CN);
  fijarR("r4", nitr[iRJ] && nitr[iCN] ? nf(0).format(nitr[iRJ] / nitr[iCN]) + " veces" : "—");
  new Chart(document.getElementById("g4"), {
    type: "bar",
    data: { labels: IDS.map((z) => ZONAS[z].nombre), datasets: [
      { label: "Nitrato en superficie (µmol/kg)", data: nitr, yAxisID: "y", backgroundColor: "#63cde8", borderRadius: 3 },
      { label: "Clorofila promedio (mg/m³)", data: chlm, yAxisID: "y1", backgroundColor: "#3fc28c", borderRadius: 3 },
    ] },
    options: { plugins: { legend: { position: "bottom" } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false, font: { size: 11 }, callback(v) { const l = this.getLabelForValue(v); return l.length > 12 ? l.split(" ") : l; } } }, y: { title: { display: true, text: "µmol/kg" } }, y1: { position: "right", grid: { display: false }, title: { display: true, text: "mg/m³" } } } },
  });

  const g = document.getElementById("peces");
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 9301 + 49297) % 233280) / 233280);
  for (let k = 0; k < 34; k++) {
    const x = 20 + azar() * 280, y = 20 + azar() * 120, s = 0.6 + azar() * 0.7;
    g.insertAdjacentHTML("beforeend", `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})" d="M0 0c6-5 14-5 20 0-6 5-14 5-20 0zM20 0l7-5v10z"/>`);
  }
})();
