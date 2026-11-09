/* Mapa del satélite sobre el globo: grillas mensuales de clorofila y temperatura, pintadas en un recuadro
   de alta resolución del Pacífico sureste y la Antártida. También responde qué valor hay en un punto. */
import * as THREE from "three";
import { colorDiverge, colorRampa, componentes, tClorofila } from "../../../lib/color";
import { PALETAS, costaEnVentana, desvanecerBordes, pintarRegion, type CapasAtlas, type Ventana } from "../../../lib/atlas";
import { contexto2d, lienzo } from "../../../lib/lienzo";
import type { ArchivoMapas, ClaveCapa, GrillaMapa } from "./tipos";
import { esAngosto } from "./entorno";
import type { GlobeView } from "../store";
import type { IdRegion, MapStyle } from "./estado";
import type { Modelo } from "./modelo";
import { VARIABLES, type Variable } from "./variables";

export const RELIEVE = "/assets/globe/earth-topology.png";
const RANGO_TEMPERATURA = VARIABLES[1]?.modo === "dif" ? VARIABLES[1].rango : 3;

export interface CapaMapa {
  clave: ClaveCapa;
  g: GrillaMapa;
  latN: number;
  lonO: number;
  /** índice en el calendario del primer mes de la grilla */
  i0: number;
  nM: number;
  /** índice de grilla de cada celda con datos */
  celdas: number[];
  /** de índice de grilla a índice de celda con datos (−1 si no tiene) */
  pos: Int32Array;
  esClorofila: boolean;
  datos: Uint8Array;
  clima: Uint8Array | null;
  lut: Uint8ClampedArray;
  bandaDe: Int16Array;
  lutBanda: Uint8ClampedArray;
  lienzo: HTMLCanvasElement;
  img: ImageData;
  valLienzo: HTMLCanvasElement;
  valImg: ImageData;
}

export interface Region {
  nombre: string;
  frase: string;
  mar: string;
  lat: [number, number];
  lon: [number, number];
  pov: { lat: number; lng: number; altitude: number };
}

export const REGIONES: Record<IdRegion, Region> = {
  peru: { nombre: "Costa del Perú", frase: "la costa del Perú", mar: "el mar del Perú", lat: [-2, -20], lon: [-86, -70], pov: { lat: -12, lng: -80, altitude: 0.95 } },
  antartida: { nombre: "Península Antártica", frase: "la Península Antártica", mar: "el mar de la Península Antártica", lat: [-58, -68], lon: [-72, -52], pov: { lat: -58, lng: -62, altitude: 1.0 } },
};

export interface DatosPunto {
  tierra: boolean;
  chl?: number | null;
  chlNormal?: number | null;
  serie?: (number | null)[];
  anom?: number | null;
  sst?: number | null;
}

/* ---------- lectura de las grillas ---------- */
function bytesDe(b64: string): Uint8Array {
  const s = atob(b64), u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
async function descomprimir(b64: string): Promise<Uint8Array> {
  const flujo = new Blob([bytesDe(b64) as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

async function prepararCapa(clave: ClaveCapa, g: GrillaMapa, archivo: ArchivoMapas, i0: number): Promise<CapaMapa> {
  const masc = bytesDe(g.mascara);
  const total = g.filas * g.cols, celdas: number[] = [], pos = new Int32Array(total).fill(-1);
  for (let k = 0; k < total; k++) if ((masc[k >> 3] ?? 0) & (128 >> (k & 7))) { pos[k] = celdas.length; celdas.push(k); }
  const esClorofila = g.tipo === "clorofila" || clave === "clorofila";
  const log0 = g.log0 ?? -1.7, log1 = g.log1 ?? 1.3, paso = g.paso ?? 0.05;

  const lut = new Uint8ClampedArray(256 * 4);
  for (let q = 1; q < 256; q++) {
    const c = componentes(esClorofila
      ? colorRampa(tClorofila(10 ** (log0 + ((q - 1) / 254) * (log1 - log0))), 1)
      : colorDiverge(((q - 128) * paso) / RANGO_TEMPERATURA, 1));
    // temperatura: lo normal (cerca de 0) casi transparente, para que solo resalten las diferencias
    const alfaT = Math.round(50 + 180 * Math.min(1, Math.abs((q - 128) * paso) / 1.5));
    lut.set([c[0] ?? 0, c[1] ?? 0, c[2] ?? 0, esClorofila ? 236 : alfaT], q * 4);
  }
  // bandas: cortes "redondos" (mg/m³ o °C) pasados al valor guardado q, y un color por banda
  const cortes = esClorofila
    ? [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 3, 5, 10].map((b) => 1 + ((Math.log10(b) - log0) / (log1 - log0)) * 254)
    : [-2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5].map((t) => 128 + t / paso);
  const bandaDe = new Int16Array(256);
  for (let q = 1; q < 256; q++) bandaDe[q] = cortes.filter((c) => c <= q).length;
  const lutBanda = new Uint8ClampedArray((cortes.length + 1) * 4);
  for (let b = 0; b <= cortes.length; b++) {
    const lo = b === 0 ? 1 : cortes[b - 1] ?? 1, hi = b === cortes.length ? 255 : cortes[b] ?? 255;
    const q = Math.max(1, Math.min(255, Math.round((Math.max(1, lo) + Math.min(255, hi)) / 2)));
    lutBanda.set(lut.subarray(q * 4, q * 4 + 4), b * 4);
  }
  const lz = lienzo(g.cols, g.filas), valLz = lienzo(g.cols, g.filas);
  return {
    clave, g, latN: archivo.lat_n, lonO: archivo.lon_o, i0, nM: archivo.meses, celdas, pos, esClorofila,
    datos: await descomprimir(g.datos), clima: g.clima ? await descomprimir(g.clima) : null,
    lut, bandaDe, lutBanda,
    lienzo: lz, img: contexto2d(lz).createImageData(g.cols, g.filas),
    valLienzo: valLz, valImg: contexto2d(valLz).createImageData(g.cols, g.filas),
  };
}

/** Valor de una capa en una celda (j) y un mes de la grilla (mi) */
export function valorCapa(capa: CapaMapa, j: number, mi: number): number | null {
  if (j < 0 || mi < 0 || mi >= capa.nM) return null;
  const q = capa.datos[j * capa.nM + mi];
  if (!q) return null;
  const { log0 = -1.7, log1 = 1.3, paso = 0.05 } = capa.g;
  return capa.esClorofila ? 10 ** (log0 + ((q - 1) / 254) * (log1 - log0)) : (q - 128) * paso;
}
/** Temperatura media de un mes calendario en una celda */
export function climaCapa(capa: CapaMapa, j: number, m: number): number | null {
  if (!capa.clima || j < 0) return null;
  const q = capa.clima[j * 12 + m];
  return q ? (q - 1) * 0.15 - 2 : null;
}
/** Clorofila de un mes calendario en 1998–2020 (media geométrica = media del valor guardado) */
export function climaClorofila(capa: CapaMapa, j: number, m: number): number | null {
  let s = 0, n = 0;
  for (let a = 0; a <= 22; a++) { const q = capa.datos[j * capa.nM + a * 12 + m]; if (q) { s += q; n++; } }
  const { log0 = -1.7, log1 = 1.3 } = capa.g;
  return n >= 6 ? 10 ** (log0 + ((s / n - 1) / 254) * (log1 - log0)) : null;
}
export function celdaDe(capa: CapaMapa, lat: number, lng: number): { fuera: boolean; j: number } {
  const { g } = capa;
  const r = Math.floor((capa.latN - lat) / g.celda), c = Math.floor((lng - capa.lonO) / g.celda);
  if (r < 0 || c < 0 || r >= g.filas || c >= g.cols) return { fuera: true, j: -1 };
  return { fuera: false, j: capa.pos[r * g.cols + c] ?? -1 };
}

export type EstadoMapa = "esperando" | "cargando" | "listo" | "error";

/** Lo que se está viendo y que decide cómo se pinta el mapa */
export interface VistaMapa {
  iMes: number;
  variable: Variable;
  vista: GlobeView;
  estilo: MapStyle;
}

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
async function leerMapas(nombre: string): Promise<ArchivoMapas> {
  const r = await fetch(`/assets/data/mapas/${nombre}`);
  if (!r.ok) throw new Error(`No se pudo cargar ${nombre} (${r.status})`);
  const x: unknown = await r.json();
  if (!esObjeto(x) || !esObjeto(x.capas) || typeof x.meses !== "number") throw new Error(`${nombre} no tiene la forma esperada`);
  return x as unknown as ArchivoMapas;
}

/** Recuadro del globo donde se pinta el mapa (Pacífico sureste y Antártida) */
export const RECUADRO = { lat: -34, lng: -72, w: 40, h: 72 };

export class MapaSatelital {
  estado: EstadoMapa = "esperando";
  readonly capas: Partial<Record<ClaveCapa, CapaMapa>> = {};
  /** material del recuadro sobre el globo (null hasta que carga) */
  material: THREE.MeshLambertMaterial | null = null;
  private grande: HTMLCanvasElement | null = null;
  private tmp: HTMLCanvasElement | null = null;
  private idx: Int16Array | null = null;
  private textura: THREE.CanvasTexture | null = null;
  private ventana: Ventana | null = null;
  private readonly fondos = new Map<GlobeView, CapasAtlas | "pintando">();
  private vista: VistaMapa | null = null;
  private readonly modelo: Modelo;

  constructor(modelo: Modelo) {
    this.modelo = modelo;
  }

  /** ¿Se ve el mapa del satélite con el dato elegido? */
  activo(v: { variable: Variable; vista: GlobeView } | null = this.vista): boolean {
    return !!v && v.vista !== "illustrated" && this.estado === "listo" && !!v.variable.mapa && !!this.capas[v.variable.mapa];
  }
  capaDe(variable: Variable): CapaMapa | undefined {
    return variable.mapa ? this.capas[variable.mapa] : undefined;
  }
  private capaActual(): CapaMapa | undefined {
    return this.vista ? this.capaDe(this.vista.variable) : undefined;
  }

  /** Descarga y prepara las grillas (unos 3 MB) */
  async cargar(): Promise<void> {
    if (this.estado !== "esperando") return;
    if (!("DecompressionStream" in window)) { this.estado = "error"; return; }
    this.estado = "cargando";
    try {
      const archivos = await Promise.all([
        leerMapas("mapas.json"),
        leerMapas("mapas-monitor.json").catch((e: unknown) => { console.warn("Sin el mapa del monitor", e); return null; }),
      ]);
      for (const archivo of archivos) {
        if (!archivo) continue;
        const [a, m] = archivo.inicio.split("-").map(Number);
        const i0 = this.modelo.idxMes(a ?? 1998, (m ?? 1) - 1);
        for (const [clave, g] of Object.entries(archivo.capas) as [ClaveCapa, GrillaMapa][]) this.capas[clave] = await prepararCapa(clave, g, archivo, i0);
        this.ventana ??= { lonO: archivo.lon_o, latN: archivo.lat_n, lonE: archivo.lon_o + 40, latS: archivo.lat_n - 72 };
      }
      this.crearMaterial();
      this.estado = "listo";
    } catch (e) {
      console.warn("No se pudo cargar el mapa satelital", e);
      this.estado = "error";
    }
  }

  private crearMaterial(): void {
    // 40 píxeles por grado (20 en pantallas angostas): la costa y los datos se ven nítidos al acercarse
    const ppg = esAngosto() ? 20 : 40;
    this.grande = lienzo(40 * ppg, 72 * ppg);
    this.tmp = lienzo(this.grande.width, this.grande.height);
    this.idx = new Int16Array(this.grande.width * this.grande.height);
    const tex = new THREE.CanvasTexture(this.grande);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter; // también se ve bien de lejos
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    this.textura = tex;
    // color negro + emisivo blanco con la misma textura: el mapa se ve con sus colores reales, sin sombras
    this.material = new THREE.MeshLambertMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, color: 0x000000, transparent: true, depthWrite: false });
  }

  /* mar y tierra de la región en alta resolución (se pintan una vez por vista y se guardan) */
  private fondoRegion(v: GlobeView): CapasAtlas | null {
    const f = this.fondos.get(v);
    if (f) return f === "pintando" ? null : f;
    if (!this.grande || !this.ventana) return null;
    this.fondos.set(v, "pintando");
    pintarRegion({ paleta: "noche", detalle: v === "detailed", ventana: this.ventana, w: this.grande.width, h: this.grande.height, relieveSrc: RELIEVE })
      .then((r) => { this.fondos.set(v, r); if (this.vista) this.dibujar(this.vista); })
      .catch((e: unknown) => { console.warn("No se pudo pintar la región", e); this.fondos.delete(v); });
    return null;
  }

  /** Repinta el recuadro con la vista, el dato y el mes indicados */
  dibujar(vista: VistaMapa): void {
    this.vista = vista;
    if (this.estado !== "listo" || !this.grande || !this.textura) return;
    const ctx = contexto2d(this.grande), w = this.grande.width, h = this.grande.height;
    ctx.clearRect(0, 0, w, h);
    if (vista.vista === "satellite") {
      // sobre la foto de la Tierra: solo el dato en el mar y la línea de costa
      if (this.activo() && this.ventana) {
        this.pintarDatos(ctx, w, h);
        costaEnVentana(ctx, w, h, this.ventana);
        desvanecerBordes(ctx, w, h, 0.11, 0.06);
      }
    } else {
      const fondo = this.fondoRegion(vista.vista);
      if (fondo) {
        // orden: mar → datos del satélite → tierra y costa encima (así el dato queda solo en el mar)
        ctx.drawImage(fondo.mar, 0, 0);
        if (this.activo()) this.pintarDatos(ctx, w, h);
        ctx.drawImage(fondo.tierra, 0, 0);
        desvanecerBordes(ctx, w, h, 0.11, 0.06);
      }
    }
    this.textura.needsUpdate = true;
  }

  /* datos del mes sobre el mar, según el estilo elegido */
  private pintarDatos(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const capa = this.capaActual();
    if (!capa || !this.tmp || !this.idx) return;
    const mi = (this.vista?.iMes ?? 0) - capa.i0, { lut } = capa;
    if (mi < 0 || mi >= capa.nM) return;
    const px = capa.img.data, val = capa.valImg.data;
    px.fill(0); val.fill(0);
    for (let j = 0; j < capa.celdas.length; j++) {
      const q = capa.datos[j * capa.nM + mi];
      if (!q) continue;
      const k = (capa.celdas[j] ?? 0) * 4, l = q * 4;
      px[k] = lut[l] ?? 0; px[k + 1] = lut[l + 1] ?? 0; px[k + 2] = lut[l + 2] ?? 0; px[k + 3] = lut[l + 3] ?? 0;
      val[k] = q; val[k + 3] = 255;
    }
    const estilo = this.vista?.estilo ?? "bandas";
    if (estilo !== "bandas") {
      contexto2d(capa.lienzo).putImageData(capa.img, 0, 0);
      ctx.imageSmoothingEnabled = estilo === "suave";
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(capa.lienzo, 0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      return;
    }
    // bandas: el valor se amplía con suavizado a la resolución final y recién ahí se corta en clases,
    // así los bordes son curvas nítidas (como un mapa del tiempo) y no manchas borrosas
    contexto2d(capa.valLienzo).putImageData(capa.valImg, 0, 0);
    const tc = contexto2d(this.tmp, { willReadFrequently: true });
    tc.clearRect(0, 0, w, h);
    tc.imageSmoothingEnabled = true; tc.imageSmoothingQuality = "high";
    tc.drawImage(capa.valLienzo, 0, 0, w, h);
    const d = tc.getImageData(0, 0, w, h), a = d.data, idx = this.idx, { bandaDe, lutBanda: L } = capa, n = w * h;
    for (let i = 0; i < n; i++) idx[i] = (a[i * 4 + 3] ?? 0) >= 128 ? bandaDe[a[i * 4] ?? 0] ?? -1 : -1;
    for (let i = 0; i < n; i++) {
      const bi = idx[i] ?? -1, o = i * 4;
      if (bi < 0) { a[o + 3] = 0; continue; }
      const c = bi * 4;
      let r = L[c] ?? 0, g = L[c + 1] ?? 0, b = L[c + 2] ?? 0, al = L[c + 3] ?? 0;
      // línea fina entre bandas (curva de nivel), un poco más oscura
      const der = i % w < w - 1 ? idx[i + 1] ?? -1 : -1, aba = i + w < n ? idx[i + w] ?? -1 : -1;
      if ((der >= 0 && der !== bi) || (aba >= 0 && aba !== bi)) { r *= 0.7; g *= 0.7; b *= 0.7; al = Math.max(al, 190); }
      a[o] = r; a[o + 1] = g; a[o + 2] = b; a[o + 3] = al;
    }
    tc.putImageData(d, 0, 0);
    ctx.drawImage(this.tmp, 0, 0);
  }

  /* ---------- consultas ---------- */
  /** Valor de la capa actual en un punto y el mes elegido */
  leer(lat: number, lng: number): { valor: number | null; esClorofila: boolean } | null {
    const capa = this.capaActual();
    if (!this.activo()) return null;
    if (!capa) return null;
    const { fuera, j } = celdaDe(capa, lat, lng);
    if (fuera || j < 0) return null;
    return { valor: valorCapa(capa, j, (this.vista?.iMes ?? 0) - capa.i0), esClorofila: capa.esClorofila };
  }

  /** Valor de una capa en un punto y un mes del calendario */
  valorEn(clave: ClaveCapa, lat: number, lng: number, iMes: number): number | null {
    const capa = this.capas[clave];
    return capa ? valorCapa(capa, celdaDe(capa, lat, lng).j, iMes - capa.i0) : null;
  }
  /** Temperatura normal de un mes calendario en un punto */
  climaEn(lat: number, lng: number, mes: number): number | null {
    const capa = this.capas.temperatura;
    return capa ? climaCapa(capa, celdaDe(capa, lat, lng).j, mes) : null;
  }

  /** Clorofila y temperatura de un punto cualquiera del mar */
  datosPunto(lat: number, lng: number, iMes: number, variable: Variable): DatosPunto | null {
    if (this.estado !== "listo") return null;
    const chl = this.capas[variable.mapa === "monitor-clorofila" ? "monitor-clorofila" : "clorofila"], sst = this.capas.temperatura;
    const cc = chl ? celdaDe(chl, lat, lng) : { fuera: true, j: -1 }, cs = sst ? celdaDe(sst, lat, lng) : { fuera: true, j: -1 };
    if (cc.fuera && cs.fuera) return null;
    const m = this.modelo.mes(iMes).mes;
    const r: DatosPunto = { tierra: cc.j < 0 && cs.j < 0 };
    if (chl && cc.j >= 0) {
      r.chl = valorCapa(chl, cc.j, iMes - chl.i0);
      r.chlNormal = climaClorofila(chl, cc.j, m);
      r.serie = this.modelo.meses.map((_, i) => (i < this.modelo.i0 ? null : valorCapa(chl, cc.j, i - chl.i0))).slice(this.modelo.i0);
    }
    if (sst && cs.j >= 0) {
      r.anom = valorCapa(sst, cs.j, iMes - sst.i0);
      const c = climaCapa(sst, cs.j, m);
      r.sst = r.anom != null && c != null ? c + r.anom : null;
    }
    return r;
  }

  /* ---------- comparar dos años ---------- */
  private valorCmp(capa: CapaMapa, j: number, mi: number | "prom", mCal: number): number | null {
    return mi === "prom" ? (capa.esClorofila ? climaClorofila(capa, j, mCal) : 0) : valorCapa(capa, j, mi);
  }
  private recorrerRegion(capa: CapaMapa, reg: Region, fn: (j: number, lat: number, lng: number) => void): void {
    const { g } = capa;
    for (let r = 0; r < g.filas; r++) {
      const lat = capa.latN - r * g.celda; // borde norte de la celda
      if (lat - g.celda >= reg.lat[0] || lat <= reg.lat[1]) continue;
      for (let c = 0; c < g.cols; c++) {
        const lng = capa.lonO + c * g.celda; // borde oeste
        if (lng + g.celda <= reg.lon[0] || lng >= reg.lon[1]) continue;
        fn(capa.pos[r * g.cols + c] ?? -1, lat, lng);
      }
    }
  }
  /** Promedio de una región en un mes de la grilla ("prom" = mes normal): media geométrica para la clorofila */
  promedioRegion(capa: CapaMapa, reg: Region, mi: number | "prom", mCal: number): number | null {
    let s = 0, n = 0;
    this.recorrerRegion(capa, reg, (j) => {
      if (j < 0) return;
      const v = this.valorCmp(capa, j, mi, mCal);
      if (v == null) return;
      s += capa.esClorofila ? Math.log10(v) : v; n++;
    });
    return n ? (capa.esClorofila ? 10 ** (s / n) : s / n) : null;
  }
  dibujarRegion(canvas: HTMLCanvasElement, capa: CapaMapa, reg: Region, mi: number | "prom", mCal: number): void {
    const lado = 6 / capa.g.celda; // píxeles por grado
    const w = Math.round((reg.lon[1] - reg.lon[0]) * lado), h = Math.round((reg.lat[0] - reg.lat[1]) * lado);
    canvas.width = w; canvas.height = h;
    const ctx = contexto2d(canvas);
    ctx.fillStyle = PALETAS.noche.tierraSimple; ctx.fillRect(0, 0, w, h); // tierra o hielo permanente
    const tam = Math.ceil(capa.g.celda * lado);
    this.recorrerRegion(capa, reg, (j, lat, lng) => {
      if (j < 0) return;
      const v = this.valorCmp(capa, j, mi, mCal);
      ctx.fillStyle = v == null ? "rgba(120,140,155,0.45)" : capa.esClorofila ? colorRampa(tClorofila(v), 1) : colorDiverge(v / RANGO_TEMPERATURA, 1);
      ctx.fillRect(Math.floor((lng - reg.lon[0]) * lado), Math.floor((reg.lat[0] - lat) * lado), tam, tam);
    });
  }
}
