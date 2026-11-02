/* Juego "Del hielo a la anchoveta": predecir la pesca con señales satelitales reales.
   Versión pixel: la mecánica, los datos y los textos son los mismos de la v1 (juego.v1.js.bak). */
(function () {
  const { D, nf, pearson } = window.MF;
  const { ICONOS, aURL, Sonido, Voxel, Hoja, modeloBarco, modeloIceberg } = window.PIX;
  const IMG = window.PIX_IMAGENES || {};
  const RONDAS = 8;
  const HORAS = 14;
  const PUNTOS = { dudas: [50, -20], certeza: [100, -70] };
  const quietoMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const quieto = () => quietoMQ.matches;

  const ESPECIES = {
    anchoveta: { nombre: "anchoveta", Nombre: "Anchoveta", clave: "anchoveta", verbo: "la pesca de anchoveta",
      cautela: "La pesca también depende de las cuotas y vedas que fija el Estado y del esfuerzo de la flota." },
    concha: { nombre: "concha de abanico", Nombre: "Concha de abanico", clave: "concha", verbo: "la cosecha de concha de abanico",
      cautela: "La cosecha también depende de cuánta semilla siembran los productores en Sechura, Samanco y Paracas." },
  };

  const SENALES = [
    { id: "hielo", frase: "el hielo marino antártico", grupo: "antartida", nombre: "Hielo marino antártico", que: "Cuánto mar alrededor de la Antártida está congelado.",
      unidad: "mill. km²", dec: 2, rango: 1.5, icono: "hielo", escala: "hielo", mas: "más hielo que lo normal", menos: "menos hielo que lo normal" },
    { id: "sam", frase: "los vientos del oeste antárticos", grupo: "antartida", nombre: "Vientos del oeste (índice SAM)", que: "La fuerza de los vientos que giran alrededor de la Antártida.",
      unidad: "", dec: 2, rango: 1.2, icono: "sam", escala: "viento", mas: "vientos más fuertes y más al sur", menos: "vientos más débiles" },
    { id: "chl_rj", frase: "el fitoplancton de Rey Jorge", grupo: "antartida", nombre: "Fitoplancton en Rey Jorge", que: "Clorofila medida por satélite junto a la Base Machu Picchu.",
      unidad: "%", dec: 0, rango: 45, icono: "fito", escala: "verde", mas: "más fitoplancton que lo normal", menos: "menos fitoplancton que lo normal" },
    { id: "tsm_rj", frase: "la temperatura del mar en Rey Jorge", grupo: "antartida", nombre: "Temperatura del mar en Rey Jorge", que: "Temperatura de la superficie del mar antártico.",
      unidad: "°C", dec: 2, rango: 0.5, icono: "temp", escala: "temp", mas: "más cálido que lo normal", menos: "más frío que lo normal" },
    { id: "nino12", frase: "El Niño costero (Niño 1+2)", grupo: "peru", nombre: "El Niño costero (Niño 1+2)", que: "Temperatura del mar frente al norte del Perú y Ecuador.",
      unidad: "°C", dec: 2, rango: 1.6, icono: "nino", escala: "temp", mas: "agua más cálida: El Niño", menos: "agua más fría: La Niña" },
    { id: "chl_cn", frase: "el fitoplancton de Chimbote", grupo: "peru", nombre: "Fitoplancton en Chimbote", que: "Clorofila medida por satélite frente a Áncash.",
      unidad: "%", dec: 0, rango: 50, icono: "fito", escala: "verde", mas: "más fitoplancton que lo normal", menos: "menos fitoplancton que lo normal" },
    { id: "tsm_cn", frase: "la temperatura del mar en Chimbote", grupo: "peru", nombre: "Temperatura del mar en Chimbote", que: "Temperatura de la superficie frente a Áncash.",
      unidad: "°C", dec: 2, rango: 2, icono: "temp", escala: "temp", mas: "más cálido que lo normal", menos: "más frío que lo normal" },
  ];
  const NUMERO = Object.fromEntries(SENALES.map((s, i) => [s.id, i + 1]));
  const ESCALAS = {
    temp: ["#1b5a8c", "#2a86b8", "#63cde8", "#a9d3e6", "#eaf6fa", "#f2d14c", "#f08a4b", "#c4502a", "#e0474c"],
    verde: ["#0d2747", "#123a66", "#1b5a8c", "#1e7a5a", "#3fc28c", "#3fc28c", "#9be86a", "#9be86a", "#f2d14c"],
    hielo: ["#c4502a", "#f08a4b", "#6f8ea3", "#a3bccb", "#a9d3e6", "#a9d3e6", "#eaf6fa", "#eaf6fa", "#ffffff"],
    viento: ["#123a66", "#1b5a8c", "#4f7396", "#6f8ea3", "#a3bccb", "#a3bccb", "#c8dbe6", "#eaf6fa", "#ffffff"],
  };

  const NOTAS = {
    anchoveta: {
      1998: "1997–98 fue uno de los El Niño más fuertes del siglo XX.",
      2017: "En 2017 hubo un El Niño costero con lluvias muy fuertes en el norte del Perú.",
      2023: "En 2023 se canceló la primera temporada de pesca de anchoveta por la gran cantidad de juveniles.",
    },
    concha: {
      2017: "El Niño costero de 2017 trajo lluvias y agua dulce que causaron mortandad de conchas en la bahía de Sechura.",
      2023: "En 2023 el agua cálida de El Niño costero volvió a golpear la producción.",
    },
  };

  const $ = (s) => document.querySelector(s);
  const fmtPts = (v) => (v < 0 ? "−" : "") + nf(0).format(Math.abs(v));
  const J = D.juego;
  const porAnio = Object.fromEntries(J.map((j) => [j.anio, j]));

  /* cambio relativo de la captura respecto al año anterior */
  function cambio(especie, anio) {
    const a = porAnio[anio]?.[ESPECIES[especie].clave], b = porAnio[anio - 1]?.[ESPECIES[especie].clave];
    return a && b ? a / b - 1 : null;
  }

  /* correlación de cada señal con el cambio (en logaritmo) */
  function correlaciones(especie) {
    const anios = J.map((j) => j.anio).filter((a) => cambio(especie, a) != null);
    const y = anios.map((a) => Math.log(1 + cambio(especie, a)));
    const out = {};
    for (const s of SENALES) out[s.id] = pearson(anios.map((a) => porAnio[a][s.id]), y);
    return out;
  }

  /* ---------- animaciones de números ---------- */
  function contar(el, desde, hasta, ms, fmt) {
    if (quieto() || ms <= 0) { el.textContent = fmt(hasta); return; }
    const t0 = performance.now();
    const paso = (ahora) => {
      const k = Math.min(1, (ahora - t0) / ms), e = 1 - (1 - k) ** 3;
      el.textContent = fmt(desde + (hasta - desde) * e);
      if (k < 1 && el.isConnected) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  /* ---------- iconos y sonido ---------- */
  const URL_ICONO = {};
  for (const k of Object.keys(ICONOS)) URL_ICONO[k] = aURL(ICONOS[k], 3);
  /* escala entera para que los píxeles no se deformen: el ícono cabe en ~"tope" px */
  const escalaPara = (spr, tope) => Math.min(4, Math.max(1, Math.floor(tope / Math.max(spr.w, spr.h))));
  function imgIcono(k, tope = 40) {
    const spr = ICONOS[k];
    return spr ? `<img src="${aURL(spr, escalaPara(spr, tope))}" alt="" class="px-ico">` : "";
  }
  document.querySelectorAll("[data-icono]").forEach((img) => { const spr = ICONOS[img.dataset.icono]; img.src = aURL(spr, escalaPara(spr, 48)); });
  const icoSonido = {
    si: aURL(spriteParlante(true), 2),
    no: aURL(spriteParlante(false), 2),
  };
  function spriteParlante(on) {
    const filas = on
      ? ["........", "...s..o.", "..ss...o", "ssss.o.o", "ssss.o.o", "..ss...o", "...s..o.", "........"]
      : ["........", "...s....", "..ss.r.r", "ssss..r.", "ssss.r.r", "..ss....", "...s....", "........"];
    const mapa = { s: "niebla", o: "fitoClaro", r: "rojo" };
    const C = window.PIX.C, h = filas.length, w = filas[0].length, data = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = filas[y][x] === "." ? 0 : C[mapa[filas[y][x]]];
    return { w, h, data, filas, mapa };
  }
  function pintarSonido() {
    const on = Sonido.activo;
    $("#sonido").setAttribute("aria-pressed", String(on));
    $("#sonido-txt").textContent = on ? "Sonido: sí" : "Sonido: no";
    $("#sonido-ico").src = on ? icoSonido.si : icoSonido.no;
  }
  $("#sonido").addEventListener("click", () => { Sonido.alternar(); pintarSonido(); });
  pintarSonido();

  /* ---------- voxels (barco al inicio, iceberg al final) ---------- */
  function animarVoxel(canvas, modelo, angulo0) {
    const vx = Voxel(canvas, { escala: 3, cy: 64 });
    let corriendo = false, ant = 0, t = 0;
    const cuadro = (ahora) => {
      if (!corriendo) return;
      if (ahora - ant > 33) { t += (ahora - ant) / 1000 || 0; ant = ahora; vx.dibujar(modelo(t), angulo0 + t * 0.35); }
      requestAnimationFrame(cuadro);
    };
    function ajustar() {
      const w = canvas.parentElement.clientWidth - 4;
      const s = Math.max(1, Math.min(3, Math.floor(w / canvas.width)));
      canvas.style.width = canvas.width * s + "px";
    }
    new ResizeObserver(ajustar).observe(canvas.parentElement);
    return {
      iniciar() {
        ajustar();
        if (quieto()) { vx.dibujar(modelo(0), angulo0); return; }
        if (!corriendo) { corriendo = true; ant = performance.now() - 40; requestAnimationFrame(cuadro); }
      },
      parar() { corriendo = false; },
    };
  }
  /* renders de Blender (12 cuadros girando); si no están, se usan los voxels de siempre */
  function animarHoja(canvas, url, cuadros) {
    const h = Hoja(canvas, url, cuadros);
    let corriendo = false, ant = 0, n = 0;
    const cuadro = (ahora) => {
      if (!corriendo) return;
      if (ahora - ant > 220) { ant = ahora; h.cuadro(n++); }
      requestAnimationFrame(cuadro);
    };
    function ajustar() {
      const w = canvas.parentElement.clientWidth - 4;
      const s = Math.max(1, Math.min(3, Math.floor(w / canvas.width)));
      canvas.style.width = canvas.width * s + "px";
    }
    new ResizeObserver(ajustar).observe(canvas.parentElement);
    return {
      iniciar() {
        ajustar();
        if (quieto()) { h.cuadro(0); return; }
        if (!corriendo) { corriendo = true; requestAnimationFrame(cuadro); }
      },
      parar() { corriendo = false; },
    };
  }
  const voxInicio = IMG.hangarBarco ? animarHoja($("#voxel-inicio"), IMG.hangarBarco, 12) : animarVoxel($("#voxel-inicio"), modeloBarco, 0.7);
  const voxFinal = IMG.hangarIceberg ? animarHoja($("#voxel-final"), IMG.hangarIceberg, 12) : animarVoxel($("#voxel-final"), modeloIceberg, 0.3);

  /* ---------- escena ---------- */
  const lienzo = $("#escena");
  const escena = window.EscenaPixel(lienzo, { alMarcador: (id) => mirar(id) });
  function ajustarEscena() {
    const marco = $("#escena-marco");
    const cs = getComputedStyle(marco);
    const w = marco.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const unaColumna = innerWidth <= 1100;
    const maxH = unaColumna ? innerHeight * 0.42 : innerHeight - 190;
    // Escala en pasos de 0,25 (no solo enteros) para que la escena aproveche el espacio.
    const s = Math.max(1, Math.floor(Math.min(w / 320, maxH / 180) * 4) / 4);
    lienzo.style.width = 320 * s + "px";
  }
  new ResizeObserver(ajustarEscena).observe($("#escena-marco"));
  addEventListener("resize", ajustarEscena);

  /* ---------- estado ---------- */
  let E = null;

  /* ---------- guía corta de la primera ronda (pistas dentro del juego, se puede saltar) ---------- */
  const GUIA_SENAL = "nino12";
  let guiaPaso = 0; // 0 sin guía, 1 mirar una señal, 2 elegir subió o bajó
  function guiaVista() { try { return localStorage.getItem("marfrio-guia") === "1"; } catch (_) { return false; } }
  function avanzarGuia(paso) {
    if (!guiaPaso || paso <= guiaPaso) return;
    guiaPaso = paso >= 3 ? 0 : paso;
    if (!guiaPaso) { try { localStorage.setItem("marfrio-guia", "1"); } catch (_) { /* sin almacenamiento */ } }
    pintarGuia();
  }
  function pintarGuia() {
    const caja = $("#guia");
    escena.guia(guiaPaso === 1 ? GUIA_SENAL : null);
    document.querySelectorAll(".senal.guia").forEach((el) => el.classList.remove("guia"));
    if (guiaPaso === 1) document.querySelector(`.senal[data-id="${GUIA_SENAL}"]`)?.classList.add("guia");
    $(".opciones").classList.toggle("guia", guiaPaso === 2);
    caja.hidden = !guiaPaso;
    if (guiaPaso === 1) $("#guia-txt").innerHTML = "<b>Paso 1 de 2.</b> Toca la señal <b>5, El Niño costero</b> (el sol sobre la ola) para mandar el satélite. Cuesta 1 hora.";
    if (guiaPaso === 2) $("#guia-txt").innerHTML = "<b>Paso 2 de 2.</b> Con lo que viste, elige si la pesca <b>subió</b> o <b>bajó</b> y confirma. Puedes mirar más señales antes.";
  }

  function aniosValidos(especie) {
    return J.filter((j) => j.anio >= 1999 && cambio(especie, j.anio) != null && SENALES.every((s) => j[s.id] != null)).map((j) => j.anio);
  }

  function nuevaPartida(especie) {
    const pool = aniosValidos(especie);
    for (let i = pool.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [pool[i], pool[k]] = [pool[k], pool[i]]; }
    guiaPaso = guiaVista() ? 0 : 1;
    E = { especie, anios: pool.slice(0, RONDAS), i: 0, horas: HORAS, puntos: 0, historial: [], r: correlaciones(especie), maxCaptura: Math.max(...J.map((j) => j[ESPECIES[especie].clave] || 0)) };
    mostrar("p-ronda");
    pintarLeyenda();
    empezarRonda();
  }

  function mostrar(id) {
    for (const p of document.querySelectorAll(".pantalla")) p.hidden = p.id !== id;
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    escena.activar(id === "p-ronda");
    if (id === "p-inicio") voxInicio.iniciar(); else voxInicio.parar();
    if (id === "p-final") voxFinal.iniciar(); else voxFinal.parar();
    if (id === "p-ronda") requestAnimationFrame(ajustarEscena);
  }

  function pintarHoras(gastada) {
    $("#n-horas").textContent = E.horas;
    $("#horas").innerHTML = Array.from({ length: HORAS }, (_, k) => `<i class="${k < E.horas ? "" : "gastada"}${k === gastada ? " gastando" : ""}"></i>`).join("");
  }

  function textoValor(s, v) {
    const signo = v > 0 ? "+" : v < 0 ? "−" : "";
    const num = nf(s.dec).format(Math.abs(v));
    if (s.id === "sam") return `${signo}${num}`;
    if (s.unidad === "%") return `${signo}${num} %`;
    return `${signo}${num} ${s.unidad}`;
  }
  /* versión corta para el dibujo (letras 3x5) */
  function textoCorto(s, v) {
    const signo = v > 0 ? "+" : v < 0 ? "-" : "";
    const num = nf(s.dec === 2 && s.id !== "hielo" && s.id !== "sam" ? 1 : s.dec).format(Math.abs(v));
    if (s.unidad === "%") return `${signo}${num}%`;
    if (s.unidad === "°C") return `${signo}${num}°C`;
    return `${signo}${num}`;
  }

  const dirDe = (s, v) => (Math.abs(v / s.rango) < 0.12 ? "igual" : v > 0 ? "sube" : "baja");

  function medidor(s, v) {
    const pos = Math.max(0, Math.min(100, 50 + (v / s.rango) * 50));
    const celdas = ESCALAS[s.escala].map((c) => `<span style="--c:${c}"></span>`).join("");
    return `<div class="medidor" aria-hidden="true">${celdas}<b style="left:50%" data-pos="${pos.toFixed(1)}"></b></div>
      <div class="medidor-ejes" aria-hidden="true"><span>◀ menos</span><span>normal</span><span>más ▶</span></div>`;
  }

  function tarjeta(s, ronda) {
    const visto = ronda.vistas.has(s.id), escaneando = ronda.escaneando.has(s.id);
    const leida = (visto && !escaneando) || ronda.revelada;
    const v = porAnio[ronda.anio][s.id];
    let cuerpo, clase = "";
    if (leida) {
      clase = visto ? "vista" : "revelada-sin-mirar";
      cuerpo = `<div class="lectura"><div class="valor" data-valor="${v}">${textoValor(s, v)}</div>
        ${medidor(s, v)}
        <div class="texto">${imgIcono(dirDe(s, v), 21)} ${Math.abs(v / s.rango) < 0.12 ? "casi normal" : v > 0 ? s.mas : s.menos}</div></div>`;
    } else if (escaneando) {
      clase = "escaneando";
      cuerpo = `<div class="escaneo-txt" role="status">Satélite leyendo</div>`;
    } else {
      const sin = E.horas <= 0;
      cuerpo = `<button class="btn" type="button" data-mirar="${s.id}" ${sin ? "disabled" : ""} aria-label="${sin ? "Sin horas de satélite" : `Mirar ${s.nombre}, cuesta 1 hora`}">${sin ? "Sin horas" : "Mirar (1 hora)"}</button>`;
    }
    let insignia = "";
    if (ronda.revelada) {
      const r = E.r[s.id];
      if (r == null || Math.abs(r) < 0.2) insignia = `<span class="acierto neutro">casi no ayuda</span>`;
      else {
        const predice = v * Math.sign(r) > 0 ? "sube" : "baja";
        insignia = predice === ronda.real ? `<span class="acierto si">apuntó bien</span>` : `<span class="acierto no">apuntó mal</span>`;
      }
    }
    const noVista = ronda.revelada && !visto ? `<span class="acierto neutro">no la miraste</span>` : "";
    const pie = insignia || noVista ? `<div class="insignias">${insignia}${noVista}</div>` : "";
    if (guiaPaso === 1 && s.id === GUIA_SENAL && !ronda.revelada) clase += " guia";
    return `<article class="senal px-caja ${clase}" data-id="${s.id}" tabindex="-1">
      <header><img src="${URL_ICONO[s.icono]}" alt="" class="px-ico"><h3>${s.nombre}</h3><kbd title="Tecla ${NUMERO[s.id]}">${NUMERO[s.id]}</kbd></header>
      <p class="que">${s.que}</p>${cuerpo}${pie}</article>`;
  }

  /* mueve las agujas de los medidores y cuenta los valores recién leídos */
  function animarLecturas(raiz, contarIds) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      raiz.querySelectorAll(".medidor b").forEach((b) => { b.style.left = b.dataset.pos + "%"; });
    }));
    for (const id of contarIds || []) {
      const el = raiz.querySelector(`.senal[data-id="${id}"] .valor`);
      if (!el) continue;
      const s = SENALES.find((x) => x.id === id), v = +el.dataset.valor;
      contar(el, 0, v, 650, (x) => textoValor(s, Math.abs(x) < Math.pow(10, -s.dec) / 2 ? 0 : x));
    }
  }

  function pintarSenales(contarIds) {
    const ronda = E.ronda;
    $("#senales-antartida").innerHTML = SENALES.filter((s) => s.grupo === "antartida").map((s) => tarjeta(s, ronda)).join("");
    $("#senales-peru").innerHTML = SENALES.filter((s) => s.grupo === "peru").map((s) => tarjeta(s, ronda)).join("");
    animarLecturas($(".col-panel"), contarIds);
  }

  function actualizarTarjeta(id, contarla) {
    const vieja = document.querySelector(`.senal[data-id="${id}"]`);
    if (!vieja) return;
    const teniaFoco = vieja.contains(document.activeElement);
    const caja = document.createElement("div");
    caja.innerHTML = tarjeta(SENALES.find((s) => s.id === id), E.ronda);
    const nueva = caja.firstElementChild;
    vieja.replaceWith(nueva);
    const medidorB = nueva.querySelector(".medidor b");
    if (medidorB) { const p = medidorB.dataset.pos; requestAnimationFrame(() => requestAnimationFrame(() => { medidorB.style.left = p + "%"; })); }
    if (contarla) animarLecturas(nueva.parentElement, [id]);
    if (teniaFoco) nueva.focus({ preventScroll: true });
  }

  function estadoMarcas() {
    const R = E.ronda;
    for (const s of SENALES) {
      if (R.revelada) continue;
      if (R.escaneando.has(s.id)) escena.estado(s.id, "escaneando");
      else if (R.vistas.has(s.id)) escena.estado(s.id, "visto");
      else escena.estado(s.id, E.horas > 0 ? "nuevo" : "bloqueado");
    }
  }

  function empezarRonda() {
    const anio = E.anios[E.i];
    const c = cambio(E.especie, anio);
    E.ronda = { anio, vistas: new Set(), escaneando: new Set(), dir: null, seg: "dudas", revelada: false, real: c > 0 ? "sube" : "baja", cambio: c, ficha: Symbol(anio) };
    $("#t-anio").textContent = anio;
    $("#t-anio").classList.remove("aparece"); void $("#t-anio").offsetWidth; $("#t-anio").classList.add("aparece");
    $("#n-ronda").textContent = E.i + 1;
    $("#n-puntos").textContent = fmtPts(E.puntos);
    $("#pregunta").textContent = `¿Cómo le fue a ${ESPECIES[E.especie].verbo} en ${anio}, comparada con ${anio - 1}?`;
    document.querySelectorAll(".opcion").forEach((b) => b.setAttribute("aria-pressed", "false"));
    document.querySelectorAll("[data-seg]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.seg === "dudas" ? "true" : "false"));
    $("#confirmar").disabled = true;
    $("#decision").hidden = false;
    $("#revelacion").hidden = true;
    pintarHoras();
    pintarSenales();
    const clave = ESPECIES[E.especie].clave;
    escena.nuevaRonda({ especie: E.especie, fraccion: porAnio[anio - 1][clave] / E.maxCaptura, numeros: NUMERO, banner: `AÑO ${anio}` });
    estadoMarcas();
    if (E.i > 0 && guiaPaso) avanzarGuia(3);
    pintarGuia();
    Sonido.tocar("ronda");
    anunciar(`Año ${anio}. Ronda ${E.i + 1} de ${RONDAS}. Te quedan ${E.horas} horas de satélite.`);
  }

  function anunciar(txt) { $("#anuncio").textContent = txt; }

  /* ---------- acciones ---------- */
  function mirar(id) {
    if (!E || !E.ronda || E.ronda.revelada || $("#p-ronda").hidden) return;
    const R = E.ronda;
    if (R.vistas.has(id)) return;
    if (E.horas <= 0) { Sonido.tocar("negado"); anunciar("Ya no te quedan horas de satélite."); return; }
    const s = SENALES.find((x) => x.id === id), v = porAnio[R.anio][id];
    R.vistas.add(id); R.escaneando.add(id);
    E.horas -= 1;
    pintarHoras(E.horas);
    actualizarTarjeta(id);
    if (E.horas <= 0) for (const o of SENALES) if (!R.vistas.has(o.id)) actualizarTarjeta(o.id);
    estadoMarcas();
    anunciar(`El satélite está leyendo: ${s.nombre}.`);
    const ficha = R.ficha;
    avanzarGuia(2);
    escena.escanear(id, v, textoCorto(s, v), dirDe(s, v)).then(() => {
      if (!E.ronda || E.ronda.ficha !== ficha) return;
      R.escaneando.delete(id);
      if (!R.revelada) { actualizarTarjeta(id, true); estadoMarcas(); }
      anunciar(`${s.nombre}: ${textoValor(s, v)}, ${Math.abs(v / s.rango) < 0.12 ? "casi normal" : v > 0 ? s.mas : s.menos}.`);
    });
  }

  function elegir(dir) {
    if (!E || E.ronda.revelada) return;
    E.ronda.dir = dir;
    document.querySelectorAll(".opcion").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.dir === dir)));
    $("#confirmar").disabled = false;
    Sonido.tocar("clic");
    if (guiaPaso === 2) avanzarGuia(3);
  }
  function seguridad(seg) {
    if (!E || E.ronda.revelada) return;
    E.ronda.seg = seg;
    document.querySelectorAll("[data-seg]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.seg === seg)));
    Sonido.tocar("clic");
  }
  function siguiente() {
    if (!E || !E.ronda.revelada) return;
    E.i += 1;
    if (E.i >= RONDAS) terminar();
    else { empezarRonda(); window.scrollTo({ top: 0, behavior: quieto() ? "auto" : "smooth" }); }
  }

  document.addEventListener("click", (e) => {
    const m = e.target.closest("[data-mirar]");
    if (m) { mirar(m.dataset.mirar); return; }
    const o = e.target.closest(".opcion");
    if (o) { elegir(o.dataset.dir); return; }
    const s = e.target.closest("[data-seg]");
    if (s) seguridad(s.dataset.seg);
  });
  $("#confirmar").addEventListener("click", revelar);
  $("#siguiente").addEventListener("click", siguiente);

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (!E || $("#p-ronda").hidden) return;
    const k = e.key.toLowerCase(), R = E.ronda;
    const sobreControl = tag === "button" || tag === "a";
    if (!R.revelada) {
      if (k >= "1" && k <= "7") { e.preventDefault(); mirar(SENALES[+k - 1].id); }
      else if (k === "s") elegir("sube");
      else if (k === "b") elegir("baja");
      else if (k === "d") seguridad("dudas");
      else if (k === "c") seguridad("certeza");
      else if (k === "enter" && !sobreControl && R.dir) { e.preventDefault(); revelar(); }
    } else if (k === "enter" && !sobreControl) { e.preventDefault(); siguiente(); }
  });

  /* ---------- revelación ---------- */
  function revelar() {
    const R = E.ronda, esp = ESPECIES[E.especie];
    if (R.revelada || !R.dir) return;
    R.revelada = true;
    const acierto = R.dir === R.real;
    const pts = PUNTOS[R.seg][acierto ? 0 : 1];
    const antes = E.puntos;
    E.puntos += pts;
    E.historial.push({ anio: R.anio, acierto, pts, vistas: [...R.vistas], cambio: R.cambio, dir: R.dir });
    contar($("#n-puntos"), antes, E.puntos, 900, (x) => fmtPts(Math.round(x)));
    $("#n-puntos").className = pts > 0 ? "sube" : "baja";
    $("#decision").hidden = true;

    // escena: aparece todo lo que no se miró y luego el cardumen o las conchas cambian
    escena.revelarTodo(SENALES.map((s) => ({ id: s.id, valor: porAnio[R.anio][s.id], etiqueta: textoCorto(s, porAnio[R.anio][s.id]), dir: dirDe(s, porAnio[R.anio][s.id]), visto: R.vistas.has(s.id) })));
    if (guiaPaso) avanzarGuia(3);
    R.escaneando.clear();
    const hoy = porAnio[R.anio][esp.clave], ayer = porAnio[R.anio - 1][esp.clave];
    const espera = quieto() ? 0 : 450;
    setTimeout(() => escena.captura(hoy / E.maxCaptura), espera);
    setTimeout(() => {
      const marco = $("#escena-marco");
      if (acierto) {
        escena.celebrar(`+${pts}`);
        Sonido.tocar("acierto");
        if (!quieto()) { marco.classList.remove("destello"); void marco.offsetWidth; marco.classList.add("destello"); }
      } else {
        escena.fallar(`-${Math.abs(pts)}`);
        Sonido.tocar("fallo");
        if (!quieto()) { marco.classList.remove("sacudir"); void marco.offsetWidth; marco.classList.add("sacudir"); }
      }
    }, quieto() ? 0 : 1300);

    const pct = Math.abs(R.cambio * 100);
    const titulo = $("#r-titulo");
    titulo.className = R.real;
    const verbo = R.real === "sube" ? "Subió" : "Bajó";
    contar(titulo, 0, pct, 1100, (x) => `${verbo} ${nf(0).format(x)} %`);
    const rp = $("#r-puntos");
    rp.textContent = `${acierto ? "Acertaste" : "Fallaste"}: ${pts > 0 ? "+" : "−"}${Math.abs(pts)} puntos`;
    rp.className = "puntos-ronda " + (acierto ? "mas" : "menos");

    const max = Math.max(hoy, ayer);
    $("#r-comparar").innerHTML = `
      <div class="previo"><span class="anio-b">${R.anio - 1}</span><div class="pista-barra"><i data-w="${(ayer / max) * 100}"></i></div><span class="t">${nf(0).format(ayer)} t</span></div>
      <div><span class="anio-b">${R.anio}</span><div class="pista-barra"><i data-w="${(hoy / max) * 100}"></i></div><span class="t" id="r-hoy">${nf(0).format(ayer)} t</span></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll("#r-comparar i").forEach((i) => { i.style.width = i.dataset.w + "%"; })));
    contar($("#r-hoy"), ayer, hoy, 1100, (x) => `${nf(0).format(Math.round(x))} t`);

    $("#r-cadena").innerHTML = cadena(R);
    $("#r-explicacion").innerHTML = explicar(R);
    const rev = $("#revelacion");
    rev.hidden = false;
    rev.classList.remove("aparece"); void rev.offsetWidth; rev.classList.add("aparece");
    $("#siguiente span").textContent = E.i + 1 >= RONDAS ? "Ver mi resultado" : "Siguiente año";
    pintarSenales();

    // en una columna la escena queda fija arriba: el panel debe aparecer debajo de ella
    const col = $(".col-escena"), barra = $(".barra").offsetHeight;
    const fija = getComputedStyle(col).position === "sticky" && innerWidth <= 1100;
    rev.style.scrollMarginTop = (fija ? barra + col.offsetHeight + 12 : barra + 16) + "px";
    rev.scrollIntoView({ behavior: quieto() ? "auto" : "smooth", block: "start" });
    $("#siguiente").focus({ preventScroll: true });
  }

  /* cadena visual: mar frente al Perú -> fitoplancton -> la especie. Asociación, no causa. */
  function cadena(R) {
    const j = porAnio[R.anio], sN = SENALES[4], sC = SENALES[5];
    const dN = dirDe(sN, j.nino12), dC = dirDe(sC, j.chl_cn);
    const txtN = dN === "igual" ? "mar casi normal" : dN === "sube" ? "mar más cálido" : "mar más frío";
    const txtC = dC === "igual" ? "fitoplancton casi normal" : dC === "sube" ? "más fitoplancton" : "menos fitoplancton";
    const esp = ESPECIES[E.especie];
    const txtE = `${esp.Nombre}: ${R.real === "sube" ? "subió" : "bajó"} ${nf(0).format(Math.abs(R.cambio * 100))} %`;
    const paso = (ico, dir, txt) => `<li>${imgIcono(ico, 66)}<span>${imgIcono(dir, 21)} ${txt}</span></li>`;
    return `<ol class="cadena-lista">${paso("nino", dN, `Perú: ${txtN}`)}${paso("fito", dC, `Chimbote: ${txtC}`)}${paso(E.especie === "anchoveta" ? "cardumen" : "concha", R.real, txtE)}</ol>
      <p class="cadena-nota">Así se movieron en ${R.anio}. Muchas veces van juntos, pero es una asociación, no una causa probada.</p>`;
  }

  function explicar(R) {
    const j = porAnio[R.anio], esp = ESPECIES[E.especie], partes = [];
    const n = j.nino12;
    if (Math.abs(n) >= 0.4) {
      if (n > 0) partes.push(`<strong>El mar frente al Perú estuvo ${nf(1).format(n)} °C más cálido que lo normal.</strong> Con agua cálida, el viento hace subir menos agua profunda rica en nutrientes y el fitoplancton costero disminuye.` + (E.especie === "anchoveta" ? " La anchoveta se va más al sur o más profundo, y hay menos para pescar." : " A la concha a veces le favorece algo de calor, pero las lluvias y el agua dulce de un El Niño fuerte la pueden matar."));
      else partes.push(`<strong>El mar frente al Perú estuvo ${nf(1).format(-n)} °C más frío que lo normal.</strong> Agua fría significa afloramiento fuerte: muchos nutrientes y mucho fitoplancton.`);
    } else partes.push(`El mar frente al Perú estuvo cerca de lo normal (Niño 1+2: ${textoValor(SENALES[4], n)}).`);
    partes.push(`El fitoplancton frente a Chimbote estuvo ${nf(0).format(Math.abs(j.chl_cn))} % ${j.chl_cn >= 0 ? "por encima" : "por debajo"} de lo normal. En la Antártida, el de Rey Jorge estuvo ${nf(0).format(Math.abs(j.chl_rj))} % ${j.chl_rj >= 0 ? "por encima" : "por debajo"}; esa señal casi no se relaciona con la pesca peruana del mismo año.`);
    const rN = E.r.nino12, rC = E.r.chl_cn;
    const votos = (rN && Math.abs(n) >= 0.4 ? Math.sign(n * rN) : 0) + (rC && Math.abs(j.chl_cn) >= 15 ? Math.sign(j.chl_cn * rC) : 0);
    const esperado = votos > 0 ? "sube" : votos < 0 ? "baja" : null;
    if (Math.abs(R.cambio) < 0.05) partes.push(`<strong>En realidad casi no cambió</strong> (menos de 5 %). En un año así cualquier pronóstico es casi una moneda al aire.`);
    else if (esperado && esperado !== R.real) partes.push(`<strong>Esta vez el mar no bastó para explicarlo.</strong> Las señales de la costa apuntaban a que ${esperado === "sube" ? "subiría" : "bajaría"}, pero no fue así. Pasa con frecuencia: la naturaleza no es lo único que decide cuánto se pesca.`);
    const nota = NOTAS[E.especie][R.anio];
    if (nota) partes.push(nota);
    partes.push(esp.cautela);
    return partes.map((p) => `<p>${p.replace(/ (%|°C)/g, " $1")}</p>`).join("");
  }

  /* ---------- final ---------- */
  function terminar() {
    const esp = ESPECIES[E.especie];
    const bonus = E.horas * 10;
    const total = E.puntos + bonus;
    const aciertos = E.historial.filter((h) => h.acierto).length;
    mostrar("p-final");
    Sonido.tocar("final");
    contar($("#f-total"), 0, total, 1400, (x) => (x < 0 ? "-" : "") + nf(0).format(Math.abs(Math.round(x))));
    const frac = total / (RONDAS * 100 + HORAS * 10);
    $("#f-rango").textContent = frac >= 0.7 ? "Jefatura de crucero oceanográfico" : frac >= 0.45 ? "Analista del Humboldt" : frac >= 0.2 ? "Practicante de a bordo" : "Grumete del satélite";
    $("#f-resumen").textContent = `Acertaste ${aciertos} de ${RONDAS} años${bonus ? ` y te sobraron ${E.horas} horas de satélite (+${bonus} puntos)` : ""}.`;

    // récord personal (solo en este navegador)
    try {
      const k = "marfrio-record-" + E.especie;
      const prev = +localStorage.getItem(k) || 0;
      if (total > prev) localStorage.setItem(k, total);
    } catch (_) { /* sin almacenamiento */ }

    const orden = SENALES.map((s) => ({ s, r: E.r[s.id] })).filter((x) => x.r != null).sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    $("#f-barras").innerHTML = orden.map(({ s, r }) => {
      const w = Math.abs(r) * 50, izq = r >= 0 ? 50 : 50 - w;
      const color = s.grupo === "peru" ? "var(--px-fito)" : "var(--px-celeste)";
      return `<div class="barra-r"><span>${s.nombre}</span><div class="eje"><i style="left:50%;width:0;background:${color}" data-l="${izq}" data-w="${w}"></i></div><span class="r">${r < 0 ? "−" : ""}${nf(2).format(Math.abs(r))}</span></div>`;
    }).join("");
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll("#f-barras i").forEach((i) => { i.style.left = i.dataset.l + "%"; i.style.width = i.dataset.w + "%"; })));
    const mejor = orden[0];
    const ant = orden.filter((x) => x.s.grupo === "antartida").map((x) => Math.abs(x.r));
    const usadas = {};
    E.historial.forEach((h) => h.vistas.forEach((v) => { usadas[v] = (usadas[v] || 0) + 1; }));
    const masUsada = Object.entries(usadas).sort((a, b) => b[1] - a[1])[0];
    $("#f-leccion").innerHTML = `Con los ${aniosValidos(E.especie).length} años de datos, la señal que mejor acompaña a ${esp.verbo} es <strong>${mejor.s.frase}</strong> (r = ${mejor.r < 0 ? "−" : ""}${nf(2).format(Math.abs(mejor.r))}). Las señales antárticas quedan entre ${nf(2).format(Math.min(...ant))} y ${nf(2).format(Math.max(...ant))} en valor absoluto: la Antártida influye poco en la pesca peruana del mismo año.` +
      (masUsada ? ` Tu señal más mirada: ${SENALES.find((s) => s.id === masUsada[0]).frase}.` : " No miraste ninguna señal: jugaste a ciegas.");

    $("#f-historial").innerHTML = [...E.historial].sort((a, b) => a.anio - b.anio).map((h, k) => `<li class="${h.acierto ? "ok-li" : ""} aparece" style="animation-delay:${quieto() ? 0 : k * 90}ms"><b>${h.anio}</b><span class="${h.acierto ? "ok" : "mal"}">${h.acierto ? "acierto" : "fallo"}</span>. ${h.cambio > 0 ? "Subió" : "Bajó"} ${nf(0).format(Math.abs(h.cambio * 100))} %. ${h.vistas.length ? "Miraste " + h.vistas.length + (h.vistas.length === 1 ? " señal" : " señales") : "Sin señales"}.</li>`).join("");
    $("#otra-vez").focus({ preventScroll: true });
  }

  $("#guia-saltar").addEventListener("click", () => avanzarGuia(3));

  /* ---------- leyenda bajo la escena ---------- */
  function pintarLeyenda() {
    const pez = !E || E.especie === "anchoveta";
    const items = [
      ["fito", "Fitoplancton: algas microscópicas, la base de la cadena"],
      ["kril", "Kril: come fitoplancton en la Antártida"],
      pez ? ["cardumen", "Anchoveta: más peces, más pesca"] : ["concha", "Concha de abanico: más conchas, más cosecha"],
      ["hielo", "Hielo marino antártico"],
      ["satelite", "Satélite: lee la señal que tocas"],
      ["bolichera", "Barco pesquero (bolichera)"],
      ["buque", "Buque de investigación"],
      ["base", "Base Machu Picchu (Perú)"],
      ["sube", "Más que lo normal"], ["baja", "Menos que lo normal"], ["igual", "Casi normal"],
    ];
    $("#leyenda-lista").innerHTML = items.map(([k, t]) => `<li>${imgIcono(k, 66)}<span>${t}</span></li>`).join("");
  }
  pintarLeyenda();
  /* en una columna la escena queda fija arriba: la leyenda va debajo de las tarjetas para no tapar */
  const unaColMQ = matchMedia("(max-width: 1100px)");
  function ubicarLeyenda() {
    const ley = $("#leyenda");
    if (unaColMQ.matches) $(".col-panel").appendChild(ley);
    else $(".col-escena").insertBefore(ley, $("#anuncio"));
  }
  ubicarLeyenda();
  unaColMQ.addEventListener?.("change", ubicarLeyenda);
  if (!unaColMQ.matches) $("#leyenda").open = true;

  $("#otra-vez").addEventListener("click", () => { mostrar("p-inicio"); pintarRecord(); });

  /* ---------- inicio ---------- */
  function pintarRecord() {
    try {
      const a = +localStorage.getItem("marfrio-record-anchoveta") || 0, c = +localStorage.getItem("marfrio-record-concha") || 0;
      const partes = [];
      if (a) partes.push(`anchoveta ${nf(0).format(a)}`);
      if (c) partes.push(`concha ${nf(0).format(c)}`);
      $("#record").textContent = partes.length ? `Tu mejor puntaje en este navegador: ${partes.join(", ")}.` : "";
    } catch (_) { $("#record").textContent = ""; }
  }
  pintarRecord();
  voxInicio.iniciar();

  $("#form-inicio").addEventListener("submit", (e) => {
    e.preventDefault();
    const especie = new FormData(e.target).get("especie");
    Sonido.tocar("clic");
    nuevaPartida(especie);
  });
})();
