import * as THREE from "three";

/* Utilidades compartidas por las escenas de la portada */

export const azar = (a: number, b: number): number => a + Math.random() * (b - a);

export const lienzo = (w: number, h: number): HTMLCanvasElement => Object.assign(document.createElement("canvas"), { width: w, height: h });

export function contexto(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const x = c.getContext("2d");
  if (!x) throw new Error("El navegador no permite dibujar en canvas");
  return x;
}

/** Ruido de valor suave, sin dependencias */
function ruido2(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
}

/** Ruido fractal: varias capas de ruido, cada una más fina */
export function fbm(x: number, y: number, octavas = 5): number {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < octavas; i++) { s += a * ruido2(x * f, y * f); f *= 2; a *= 0.5; }
  return s;
}

/** Textura de un punto con borde difuso (fitoplancton, nieve marina) */
function texturaPunto(): THREE.CanvasTexture {
  const c = lienzo(64, 64), x = contexto(c), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

type Caja = readonly [number, number, number, number, number, number];

/** Nube de partículas brillantes dentro de una caja [x0, x1, y0, y1, z0, z1] */
export function nube(n: number, caja: Caja, color: THREE.ColorRepresentation, tam: number): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([azar(caja[0], caja[1]), azar(caja[2], caja[3]), azar(caja[4], caja[5])], i * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ map: texturaPunto(), color, size: tam, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
}

/** Parte de la escena que se actualiza en cada cuadro según el tiempo y la altura de la cámara */
export interface Capa {
  actualizar(t: number, y: number): void;
}
