/* Pixel art hecho en código, con una paleta corta en los azules de la página (referencia: la hoja de
   sprites de la ballena del equipo). Las figuras se arman con formas, se sombrean por franjas
   (lomo oscuro, vientre claro) y llevan un contorno oscuro de 1 píxel. Se dibujan a su tamaño real
   (por ejemplo 48 × 20) y el juego las amplía sin suavizar, para que se vean los píxeles. */

export const PALETA = {
  contorno: "#0f1a2b",
  noche: "#1b2c45",
  oscuro: "#2a4466",
  medio: "#4f78a8",
  claro: "#9bb8d8",
  crema: "#f0e6c8",
  blanco: "#f7f1de",
  rosa: "#c48f9a",
  // colores propios de cada especie, apagados para convivir con los azules
  verde: "#3fae7c", verdeOscuro: "#24735a", verdeClaro: "#9fdcb4",
  coral: "#d9776a", coralOscuro: "#9e4a46", coralClaro: "#f2b49b",
  dorado: "#d9a93a", doradoOscuro: "#94701f",
  cafe: "#7a5236", cafeOscuro: "#4e3424", cafeClaro: "#b48a64",
  piel: "#c48a66", pielOscura: "#93603f", pelo: "#3a2620",
  turquesa: "#2f7f8f", turquesaOscuro: "#1f5966",
  naranja: "#e38a3e",
} as const;
export type Color = string;

export class Pixeles {
  readonly w: number;
  readonly h: number;
  private readonly c: (Color | null)[];
  constructor(w: number, h: number) { this.w = w; this.h = h; this.c = new Array<Color | null>(w * h).fill(null); }
  get(x: number, y: number): Color | null { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.c[y * this.w + x] ?? null; }
  set(x: number, y: number, color: Color | null): void {
    const px = Math.round(x), py = Math.round(y);
    if (px >= 0 && py >= 0 && px < this.w && py < this.h) this.c[py * this.w + px] = color;
  }

  /** Siluetas trazadas por vértices en la cuadrícula, sin suavizado. */
  poligono(puntos: readonly (readonly [number, number])[], color: Color): this {
    return this.forma((x, y) => {
      let dentro = false;
      for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
        const a = puntos[i]!, b = puntos[j]!;
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) dentro = !dentro;
      }
      return dentro;
    }, color);
  }

  /** rellena los píxeles donde dentro(x, y) es verdadero; el color puede depender de la posición */
  forma(dentro: (x: number, y: number) => boolean, color: Color | ((x: number, y: number) => Color)): this {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (dentro(x + 0.5, y + 0.5)) this.set(x, y, typeof color === "function" ? color(x + 0.5, y + 0.5) : color);
    }
    return this;
  }
  elipse(cx: number, cy: number, rx: number, ry: number, color: Color | ((x: number, y: number) => Color)): this {
    return this.forma((x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, color);
  }
  /** píxeles sueltos: [x, y] */
  puntos(lista: readonly (readonly [number, number])[], color: Color): this { for (const [x, y] of lista) this.set(x, y, color); return this; }
  linea(x0: number, y0: number, x1: number, y1: number, color: Color): this {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), color);
    return this;
  }

  /** contorno de 1 píxel alrededor de todo lo dibujado */
  contorno(color: Color = PALETA.contorno): this {
    const borde: [number, number][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) borde.push([x, y]);
    }
    for (const [x, y] of borde) this.set(x, y, color);
    return this;
  }

  lienzo(): HTMLCanvasElement {
    const cv = Object.assign(document.createElement("canvas"), { width: this.w, height: this.h });
    const g = cv.getContext("2d");
    if (!g) return cv;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const col = this.get(x, y);
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
    return cv;
  }
}

/** Sombreado por franjas: elige el color según la altura relativa dentro de la figura (0 arriba, 1 abajo) */
export const franjas = (top: (x: number) => number, bottom: (x: number) => number, colores: readonly Color[]) =>
  (x: number, y: number): Color => {
    const t = (y - top(x)) / Math.max(0.001, bottom(x) - top(x));
    return colores[Math.min(colores.length - 1, Math.max(0, Math.floor(t * colores.length)))]!;
  };
