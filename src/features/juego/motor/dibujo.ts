/* Herramientas para dibujar personajes en 2D con la técnica "sticker": primero la silueta en tinta
   (un contorno grueso y parejo), después los colores, la sombra recortada y los detalles encima.
   Los dibujos se hacen en un canvas y se usan como textura de un personaje (ver personaje.ts).
   Si el equipo dibuja los personajes a mano, basta con cargar su PNG en lugar de estos lienzos. */
import * as THREE from "three";

export const TINTA = "#1d2b36";

export type Forma = (g: CanvasRenderingContext2D) => void;

export function lienzo(dibujar: (g: CanvasRenderingContext2D) => void, w = 256, h = 256): HTMLCanvasElement {
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const g = c.getContext("2d");
  if (!g) throw new Error("El navegador no permite dibujar en canvas");
  g.lineJoin = g.lineCap = "round";
  dibujar(g);
  return c;
}

/** El mismo dibujo mirando al otro lado */
export const espejo = (c: HTMLCanvasElement): HTMLCanvasElement =>
  lienzo((g) => { g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); }, c.width, c.height);

export function silueta(g: CanvasRenderingContext2D, formas: readonly Forma[], grosor: number): void {
  g.save();
  g.fillStyle = g.strokeStyle = TINTA;
  g.lineWidth = grosor;
  for (const f of formas) { g.beginPath(); f(g); g.fill(); g.stroke(); }
  g.restore();
}

export function rellenar(g: CanvasRenderingContext2D, formas: readonly Forma[], color: string): void {
  g.fillStyle = color;
  for (const f of formas) { g.beginPath(); f(g); g.fill(); }
}

/** Limita lo que se dibuje después al interior de las formas (para sombras y brillos) */
export function recortar(g: CanvasRenderingContext2D, formas: readonly Forma[]): void {
  g.beginPath();
  for (const f of formas) f(g);
  g.clip();
}

/** Línea de color con borde de tinta (patas, antenas) */
export function trazo(g: CanvasRenderingContext2D, dibujar: Forma, color: string, ancho: number): void {
  g.save();
  g.strokeStyle = TINTA; g.lineWidth = ancho + 7; g.beginPath(); dibujar(g); g.stroke();
  g.strokeStyle = color; g.lineWidth = ancho; g.beginPath(); dibujar(g); g.stroke();
  g.restore();
}

export function ojo(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.fillStyle = "#fff"; g.beginPath(); g.ellipse(x, y, r, r * 1.15, 0, 0, 7); g.fill();
  g.lineWidth = Math.max(3, r * 0.28); g.strokeStyle = TINTA; g.stroke();
  g.fillStyle = TINTA; g.beginPath(); g.ellipse(x + r * 0.25, y + r * 0.1, r * 0.55, r * 0.7, 0, 0, 7); g.fill();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(x + r * 0.45, y - r * 0.25, r * 0.2, 0, 7); g.fill();
}

export function rubor(g: CanvasRenderingContext2D, x: number, y: number, escala = 1): void {
  g.save();
  g.globalAlpha = 0.6; g.fillStyle = "#ff8fa3";
  g.beginPath(); g.ellipse(x, y, 11 * escala, 6 * escala, 0, 0, 7); g.fill();
  g.restore();
}

export function textura(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
