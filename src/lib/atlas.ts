/* Atlas ilustrado para el globo: pinta en un canvas equirectangular una textura plana, tipo mapa de atlas
   (no fotográfica): mar en tonos según la distancia a la costa, tierra con bandas suaves de relieve,
   hielo blanco azulado y costas con una línea fina oscura. Lo usan la portada y el explorador. */
import { contexto2d, cargarImagen, lienzo } from "./lienzo";
import { PAISES, esHielo, poligonos, type Pais } from "./paises";

export interface Paleta {
  nombre: string;
  mar: readonly [string, string, string];
  marSimple: string;
  tierra: readonly [string, string, string, string];
  tierraSimple: string;
  peru: string;
  hielo: readonly [string, string];
  costa: string;
  borde: string;
  atm: string;
}

export const PALETAS = {
  noche: {
    nombre: "Mar nocturno",
    mar: ["#0a2742", "#11385a", "#1c5278"], marSimple: "#0f3352",
    tierra: ["#5f8069", "#8f9068", "#a08a68", "#cdbfa4"], tierraSimple: "#5f7d68", peru: "#7b9a74",
    hielo: ["#dde9f0", "#c3d5e1"], costa: "#04121f", borde: "rgba(4,18,31,0.35)", atm: "#4a8fbf",
  },
  papel: {
    nombre: "Papel de atlas",
    mar: ["#6f9fbd", "#8fb7cf", "#b4d2e0"], marSimple: "#8db5cd",
    tierra: ["#e3d8b8", "#d2c193", "#b79d72", "#8f7756"], tierraSimple: "#e1d6b6", peru: "#efe3bf",
    hielo: ["#f7fafc", "#dde8ef"], costa: "#3e5463", borde: "rgba(62,84,99,0.35)", atm: "#9cc8e6",
  },
  turquesa: {
    nombre: "Turquesa y arena",
    mar: ["#123f60", "#1d5f80", "#2f8a9e"], marSimple: "#1a5576",
    tierra: ["#7fa877", "#bdb27a", "#a7835e", "#e2d7c2"], tierraSimple: "#86ab7d", peru: "#9cc28f",
    hielo: ["#eef6fa", "#cfe1ec"], costa: "#0b2436", borde: "rgba(11,36,54,0.35)", atm: "#5fb3d0",
  },
} as const satisfies Record<string, Paleta>;

export type NombrePaleta = keyof typeof PALETAS;

/** Ventana geográfica: oeste, norte, este y sur en grados */
export interface Ventana {
  lonO: number;
  latN: number;
  lonE: number;
  latS: number;
}

const MUNDO: Ventana = { lonO: -180, latN: 90, lonE: 180, latS: -90 };
type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)) as RGB;

/* proyección equirectangular de una ventana */
function trazar(ctx: CanvasRenderingContext2D, paises: readonly Pais[], W: number, H: number, v: Ventana = MUNDO): void {
  const kx = W / (v.lonE - v.lonO), ky = H / (v.latN - v.latS);
  ctx.beginPath();
  for (const p of paises) {
    for (const poligono of poligonos(p)) {
      for (const anillo of poligono) {
        anillo.forEach(([lo, la], k) => {
          const x = (lo - v.lonO) * kx, y = (v.latN - la) * ky;
          if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        });
        ctx.closePath();
      }
    }
  }
}

function rellenar(w: number, h: number, color: string): HTMLCanvasElement {
  const c = lienzo(w, h), x = contexto2d(c);
  x.fillStyle = color;
  x.fillRect(0, 0, w, h);
  return c;
}

/* mar: tres tonos según la distancia a la costa (no hay batimetría; se usa un desenfoque de la máscara de tierra).
   El umbral se aplica a la resolución final, así los bordes entre tonos quedan nítidos y no borrosos. */
function marPorDistancia(pal: Paleta, w: number, h: number, v: Ventana = MUNDO): HTMLCanvasElement {
  const grados = v.lonE - v.lonO;
  // máscara de tierra a resolución media (≈0,25° por píxel), luego se desenfoca bajando de tamaño
  const mw = Math.max(16, Math.round(grados * 4)), mh = Math.max(16, Math.round((mw * h) / w));
  const m = lienzo(mw, mh), mc = contexto2d(m);
  mc.fillStyle = "#000"; mc.fillRect(0, 0, mw, mh);
  mc.fillStyle = "#fff"; trazar(mc, PAISES, mw, mh, v); mc.fill("evenodd");
  const borroso = (gradosPorPx: number): Uint8ClampedArray => {
    const pw = Math.max(2, Math.round(grados / gradosPorPx)), ph = Math.max(2, Math.round((pw * h) / w));
    const chico = lienzo(pw, ph), cc = contexto2d(chico);
    cc.imageSmoothingEnabled = true; cc.imageSmoothingQuality = "high";
    cc.drawImage(m, 0, 0, pw, ph);
    const g = lienzo(w, h), gc = contexto2d(g, { willReadFrequently: true });
    gc.imageSmoothingEnabled = true; gc.imageSmoothingQuality = "high";
    gc.drawImage(chico, 0, 0, w, h);
    return gc.getImageData(0, 0, w, h).data;
  };
  const cerca = borroso(1.4), medio = borroso(5.6);
  const out = lienzo(w, h), oc = contexto2d(out), img = oc.createImageData(w, h), px = img.data;
  const [c0, c1, c2] = pal.mar.map(hex) as [RGB, RGB, RGB];
  for (let i = 0; i < w * h; i++) {
    const col = (cerca[i * 4] ?? 0) > 26 ? c2 : (medio[i * 4] ?? 0) > 14 ? c1 : c0;
    px[i * 4] = col[0]; px[i * 4 + 1] = col[1]; px[i * 4 + 2] = col[2]; px[i * 4 + 3] = 255;
  }
  oc.putImageData(img, 0, 0);
  return out;
}

/* relieve: pocas bandas planas de altura, como curvas de nivel de un atlas. La altura se amplía con
   suavizado hasta la resolución final y recién ahí se corta en bandas: bordes nítidos y redondeados. */
function relieve(img: HTMLImageElement, pal: Paleta, hielo: boolean, w: number, h: number, v: Ventana = MUNDO): HTMLCanvasElement {
  const sx = ((v.lonO + 180) / 360) * img.width, sy = ((90 - v.latN) / 180) * img.height;
  const sw = ((v.lonE - v.lonO) / 360) * img.width, sh = ((v.latN - v.latS) / 180) * img.height;
  const c0 = lienzo(w, h), x0 = contexto2d(c0, { willReadFrequently: true });
  x0.imageSmoothingEnabled = true; x0.imageSmoothingQuality = "high";
  x0.filter = `blur(${Math.max(1, (w / sw) * 0.8).toFixed(1)}px)`; // quita el escalonado de la imagen de origen
  x0.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  x0.filter = "none";
  const alt = x0.getImageData(0, 0, w, h).data;
  const out = x0.createImageData(w, h), px = out.data;
  const bandas: RGB[] = hielo ? [hex(pal.hielo[0]), hex(pal.hielo[0]), hex(pal.hielo[1]), hex(pal.hielo[1])] : pal.tierra.map(hex);
  const [k1, k2, k3] = [12, 45, 110];
  for (let i = 0; i < w * h; i++) {
    const a = alt[i * 4] ?? 0;
    const col = bandas[a < k1 ? 0 : a < k2 ? 1 : a < k3 ? 2 : 3] as RGB;
    px[i * 4] = col[0]; px[i * 4 + 1] = col[1]; px[i * 4 + 2] = col[2]; px[i * 4 + 3] = 255;
  }
  x0.putImageData(out, 0, 0);
  return c0;
}

export interface CapasAtlas {
  mar: HTMLCanvasElement;
  tierra: HTMLCanvasElement;
}

/* pinta mar y tierra de una ventana en dos capas: "mar" (fondo) y "tierra" (tierra, hielo, costa y fronteras,
   con el mar transparente) para poder poner los datos del satélite entre las dos */
function capas(op: { pal: Paleta; detalle: boolean; w: number; h: number; v?: Ventana; img?: HTMLImageElement | null; lineas?: number }): CapasAtlas {
  const { pal, detalle, w, h, v = MUNDO, img = null, lineas = 1 } = op;
  const tierra = PAISES.filter((p) => !esHielo(p)), hielo = PAISES.filter(esHielo), peru = PAISES.filter((p) => p.properties.n === "Peru");
  const mar = detalle ? marPorDistancia(pal, w, h, v) : rellenar(w, h, pal.marSimple);
  const t = lienzo(w, h), ctx = contexto2d(t);
  ctx.fillStyle = detalle ? pal.tierra[0] : pal.tierraSimple; trazar(ctx, tierra, w, h, v); ctx.fill("evenodd");
  ctx.fillStyle = pal.hielo[0]; trazar(ctx, hielo, w, h, v); ctx.fill("evenodd");
  if (detalle && img) {
    for (const [grupo, esH] of [[tierra, false], [hielo, true]] as const) {
      const capa = lienzo(w, h), cc = contexto2d(capa);
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
  trazar(ctx, PAISES, w, h, v); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = pal.borde; ctx.lineWidth = lineas; ctx.lineJoin = "round";
  trazar(ctx, tierra, w, h, v); ctx.stroke();
  return { mar, tierra: t };
}

async function imagenRelieve(detalle: boolean, src: string | null): Promise<HTMLImageElement | null> {
  if (!detalle || !src) return null;
  try { return await cargarImagen(src); } catch (e) { console.warn("Sin relieve para el atlas", e); return null; }
}

export interface OpcionesAtlas {
  paleta?: NombrePaleta;
  /** false: atlas simple (mar de un tono, tierra plana); true: mar en 3 tonos y relieve */
  detalle?: boolean;
  ancho?: number;
  relieveSrc?: string | null;
}

/** Textura del mundo entero (ancho × ancho/2) */
export async function pintar({ paleta = "noche", detalle = false, ancho = 4096, relieveSrc = null }: OpcionesAtlas = {}): Promise<HTMLCanvasElement> {
  const pal = PALETAS[paleta], W = ancho, H = ancho / 2;
  const img = await imagenRelieve(detalle, relieveSrc);
  const { mar, tierra } = capas({ pal, detalle, w: W, h: H, img, lineas: Math.max(0.6, (W / 4096) * 1.2) });
  const cv = lienzo(W, H), ctx = contexto2d(cv);
  ctx.drawImage(mar, 0, 0);
  ctx.drawImage(tierra, 0, 0);
  return cv;
}

/** Lo mismo para una región en alta resolución, separado en mar y tierra */
export async function pintarRegion(op: OpcionesAtlas & { ventana: Ventana; w: number; h: number }): Promise<CapasAtlas> {
  const { paleta = "noche", detalle = false, ventana, w, h, relieveSrc = null } = op;
  const img = await imagenRelieve(detalle, relieveSrc);
  return capas({ pal: PALETAS[paleta], detalle, w, h, v: ventana, img, lineas: Math.max(1, w / 1600) });
}

/** Borra la tierra de un canvas de datos y le dibuja la costa encima (para mostrar datos sobre la vista satelital) */
export function costaEnVentana(ctx: CanvasRenderingContext2D, w: number, h: number, v: Ventana, paleta: NombrePaleta = "noche"): void {
  trazar(ctx, PAISES, w, h, v);
  ctx.save();
  ctx.globalCompositeOperation = "destination-out"; ctx.fill("evenodd");
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = PALETAS[paleta].costa; ctx.lineWidth = Math.max(1.2, w / 1000); ctx.lineJoin = "round"; ctx.stroke();
  ctx.restore();
}

/** Imagen de 2×1 px de un color (textura inicial del globo mientras se pinta el atlas) */
export function pixel(color: string): string {
  return rellenar(2, 1, color).toDataURL();
}

/** Desvanece los bordes de un canvas (fx, fy: fracción del ancho y del alto) para que no se vea un parche rectangular */
export function desvanecerBordes(ctx: CanvasRenderingContext2D, w: number, h: number, fx: number, fy: number): void {
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
