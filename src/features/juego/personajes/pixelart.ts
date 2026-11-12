/* Personajes en pixel art (estilo de la hoja de sprites de la ballena del equipo): paleta corta de azules,
   crema y rosa, sombreado por franjas y contorno oscuro de 1 píxel. Cada función devuelve los cuadros
   de su animación (todos miran a la derecha, salvo el pingüino, el guanay y los retratos). */
import { franjas, PALETA as P, Pixeles } from "../motor/pixel";

type Cuadros = HTMLCanvasElement[];
const suave = (u: number) => u * u * (3 - 2 * u);

/** Perfil de un cuerpo alargado: medio alto según la posición (0 = cola, 1 = hocico) */
function perfil(u: number, maxU: number, punta: number): number {
  if (u < 0 || u > 1) return 0;
  return u < maxU ? 0.18 + 0.82 * suave(u / maxU) : Math.cos(((u - maxU) / (1 - maxU)) * Math.PI * 0.5) ** punta;
}

/* ---------------- Nara, ballena jorobada (64 × 28) ---------------- */
export function naraPixel(): Cuadros {
  // Cuatro poses: cola y aleta reman, el cuerpo conserva una silueta estable.
  return [0, 1, 0, -1].map((f) => {
    const p = new Pixeles(72, 36);
    p.poligono([[11, 17], [20, 13], [29, 9], [37, 8], [48, 9], [60, 12], [68, 16], [69, 20], [65, 23], [54, 25], [39, 25], [26, 22], [16, 20]], P.oscuro);
    p.poligono([[13, 18], [26, 17], [40, 19], [55, 20], [68, 19], [65, 23], [53, 24], [39, 24], [26, 21]], P.claro);
    p.poligono([[27, 20], [42, 22], [59, 21], [67, 20], [64, 23], [51, 24], [39, 24]], P.blanco);
    p.poligono([[8, 17], [2, 10 + f * 2], [6, 11 + f], [12, 15], [16, 17], [12, 21], [3, 24 + f * 2], [5, 19 + f]], P.medio);
    p.poligono([[28, 10], [30, 7], [33, 6], [34, 9]], P.oscuro);
    p.linea(26, 12, 38, 10, P.medio).linea(39, 10, 49, 11, P.medio);
    p.poligono([[47, 20], [45, 25], [34 + f, 32], [30 + f, 33], [34, 28], [41, 20]], P.crema);
    p.linea(44, 22, 33 + f, 31, P.blanco);
    for (let x = 52; x < 64; x += 3) p.linea(x, 22, x + 1, 23, P.claro);
    p.linea(57, 19, 68, 19, P.medio);
    p.puntos([[59, 16]], P.contorno).puntos([[60, 16]], P.blanco);
    p.puntos([[64, 13], [67, 15], [65, 21]], P.claro);
    return p.contorno().lienzo();
  });
}

/* ---------------- Anchoveta (Anchi y el cardumen) ---------------- */
function anchoveta(f: number, w: number, h: number, heroe: boolean): HTMLCanvasElement {
  const p = new Pixeles(w, h);
  const x0 = Math.round(w * 0.2), x1 = w - 2, cy = h / 2 - 0.5, alto = h * 0.24;
  const top = (x: number) => cy - alto * perfil((x - x0) / (x1 - x0), 0.55, 0.9);
  const bot = (x: number) => cy + alto * perfil((x - x0) / (x1 - x0), 0.55, 0.9) * 1.05;
  p.forma((x, y) => x >= x0 && x <= x1 && y >= top(x) && y <= bot(x), franjas(top, bot, [P.oscuro, P.medio, P.claro, P.blanco, P.crema]));
  // franja plateada a lo largo del cuerpo
  for (let x = x0 + 2; x < x1 - 3; x++) p.set(x, Math.round(cy), P.blanco);
  // Aletas dorsal y ventral: una silueta de pez, no una cápsula con ojos.
  const aletaX = Math.round(w * 0.52);
  p.poligono([[aletaX - 2, Math.round(cy - alto + 1)], [aletaX + 1, 1], [aletaX + 5, Math.round(cy - alto + 2)]], P.medio);
  p.linea(aletaX + 2, Math.round(cy + alto - 1), aletaX - 1, h - 2, P.claro);
  p.linea(x1 - 7, Math.round(cy + 1), x1 - 10, Math.round(cy + 3), P.medio);
  // cola en horquilla que se mueve
  const d = f ? 1 : -1;
  for (let k = 0; k <= x0; k++) {
    const x = x0 - k, abre = Math.round(k * 0.75);
    p.set(x, Math.round(cy) - abre + (k > 1 ? d : 0), P.medio);
    p.set(x, Math.round(cy) + abre + (k > 1 ? d : 0), P.medio);
    if (k < 2) p.set(x, Math.round(cy), P.medio);
  }
  // ojo grande y boca
  const ex = x1 - Math.round(w * 0.14), ey = Math.round(cy) - 1;
  if (heroe) { p.puntos([[ex, ey], [ex + 1, ey], [ex, ey + 1], [ex + 1, ey + 1]], P.contorno); p.set(ex + 1, ey, P.blanco); }
  else p.set(ex, ey, P.contorno);
  p.set(x1 - 1, Math.round(cy) + 1, P.oscuro);
  return p.contorno().lienzo();
}
export const anchiPixel = (): Cuadros => [0, 1].map((f) => anchoveta(f, 34, 15, true));
export const anchovetaPixel = (): Cuadros => [0, 1].map((f) => anchoveta(f, 22, 10, false));

/* ---------------- Kiri, krill antártico (32 × 18) ---------------- */
export function kiriPixel(): Cuadros {
  return [0, 1].map((f) => {
    const p = new Pixeles(32, 18);
    const top = (x: number) => 7 - 3.2 * perfil((x - 3) / 25, 0.7, 1.2) + (x < 10 ? (10 - x) * 0.25 : 0);
    const bot = (x: number) => 8 + 3.2 * perfil((x - 3) / 25, 0.7, 1.2) + (x < 10 ? (10 - x) * 0.25 : 0);
    p.forma((x, y) => x >= 3 && x <= 28 && y >= top(x) && y <= bot(x), franjas(top, bot, [P.coralOscuro, P.coral, P.coral, P.coralClaro]));
    for (let x = 6; x < 22; x += 3) { p.set(x, Math.round(top(x)) + 1, P.coralOscuro); p.set(x, Math.round(top(x)) + 2, P.coralOscuro); } // segmentos
    p.puntos([[19, 8], [20, 8], [19, 9], [20, 9], [21, 9]], P.verde); // estómago lleno de fitoplancton
    // abanico de la cola
    p.puntos([[1, 9], [2, 10], [1, 11], [2, 11], [0, 12], [2, 12]], P.coral);
    // patas nadadoras que se alternan
    for (let k = 0; k < 6; k++) { const x = 9 + k * 3, y = Math.round(bot(x)) + 1; p.set(x + ((k + f) % 2), y, P.coralClaro); p.set(x + ((k + f) % 2 ? 0 : -1), y + 1, P.coralClaro); }
    // ojo en pedúnculo y antenas
    p.puntos([[25, 5], [26, 5], [25, 6], [26, 6]], P.contorno); p.set(26, 5, P.blanco);
    p.linea(27, 4, 31, 0 + f, P.coralClaro); p.linea(26, 4, 29, 1, P.coralClaro);
    return p.contorno().lienzo();
  });
}

/* ---------------- Lumi, diatomea (24 × 18) ---------------- */
export function lumiPixel(): Cuadros {
  return [0, 1].map((f) => {
    const p = new Pixeles(24, 18);
    const caja = (x: number, y: number) => x >= 2 && x <= 21 && y >= 3 && y <= 14 && !((x < 4 || x > 19) && (y < 5 || y > 12));
    p.forma(caja, (_x, y) => (y < 6 ? P.blanco : y < 11 ? P.claro : P.medio));
    for (let x = 3; x <= 20; x++) p.set(x, 9, P.blanco); // banda donde se unen las dos mitades
    p.puntos(f ? [[5, 6], [6, 7], [16, 11], [17, 12], [9, 12]] : [[5, 7], [6, 6], [16, 12], [17, 11], [10, 12]], P.verde); // cloroplastos
    p.puntos([[6, 6], [17, 12]], P.verdeClaro);
    for (let x = 4; x <= 19; x += 3) { p.set(x, 3, P.claro); p.set(x, 14, P.oscuro); } // poros
    p.puntos([[9, 7], [9, 8], [14, 7], [14, 8]], P.contorno); p.puntos([[9, 7], [14, 7]], P.blanco); p.puntos([[9, 8], [14, 8]], P.contorno);
    p.puntos([[10, 7], [15, 7]], P.contorno);
    p.puntos([[7, 10], [16, 10]], P.rosa);
    return p.contorno().lienzo();
  });
}

/* ---------------- fitoplancton (comida) y nutriente ---------------- */
export function fitoPixel(): Cuadros {
  const p = new Pixeles(20, 16);
  for (const [x, y, r] of [[5, 6, 3], [10, 4, 3], [15, 7, 3], [7, 11, 3], [12, 10, 3.5], [16, 12, 2]] as const) {
    p.elipse(x, y, r, r, P.verdeOscuro);
    p.elipse(x, y - 0.5, r - 1, r - 1, P.verde);
    p.set(x - 1, y - 1, P.verdeClaro);
  }
  return [p.contorno().lienzo()];
}
export function nutrientePixel(): Cuadros {
  return [0, 1].map((f) => {
    const p = new Pixeles(11, 11);
    const r = f ? 4 : 3;
    for (let k = -r; k <= r; k++) { p.set(5 + k, 5, P.claro); p.set(5, 5 + k, P.claro); }
    p.puntos([[4, 4], [6, 4], [4, 6], [6, 6]], P.claro);
    p.set(5, 5, P.blanco);
    return p.lienzo();
  });
}

/* ---------------- pingüino de Adelia, de frente (20 × 26) ---------------- */
export function pinguinoPixel(): Cuadros {
  return [0, 1].map((f) => {
    const p = new Pixeles(20, 26);
    p.elipse(10, 13, 6.5, 10, (x) => (x > 12 ? P.contorno : P.noche));
    p.elipse(10, 16, 4.2, 6.5, (x) => (x > 11.5 ? P.claro : P.blanco));
    // aletas que se abren y cierran
    p.linea(3, 11, 2 - f, 18, P.noche); p.linea(4, 11, 3 - f, 18, P.noche);
    p.linea(17, 11, 18 + f, 18, P.contorno); p.linea(16, 11, 17 + f, 18, P.contorno);
    // anillo blanco del ojo y pico
    p.puntos([[7, 6], [8, 6], [7, 7], [12, 6], [13, 6], [13, 7]], P.blanco);
    p.puntos([[8, 7], [12, 7]], P.contorno);
    p.puntos([[9, 9], [10, 9], [11, 9], [10, 10]], P.coralOscuro); p.set(10, 9, P.coral);
    p.puntos([[6, 10], [14, 10]], P.rosa);
    p.puntos([[7, 23], [8, 23], [12, 23], [13, 23]], P.naranja);
    return p.contorno().lienzo();
  });
}

/* ---------------- guanay en picada, cabeza abajo (16 × 28) ---------------- */
export function guanayPixel(): Cuadros {
  return [0, 1].map((f) => {
    const p = new Pixeles(16, 28);
    p.elipse(8, 12, 3.5, 8, (x) => (x < 8 ? P.blanco : P.noche)); // pecho blanco y lomo negro
    p.elipse(8, 21, 2.4, 2.6, P.noche); // cabeza
    p.puntos([[7, 21], [8, 21]], P.coral); p.set(8, 21, P.contorno);
    p.linea(8, 24, 8, 27, P.naranja); // pico hacia abajo
    // alas plegadas hacia atrás que vibran
    p.linea(5, 6 - f, 2, 0, P.noche); p.linea(6, 7, 3, 1 + f, P.noche);
    p.linea(11, 6 - f, 14, 0, P.contorno); p.linea(10, 7, 13, 1 + f, P.contorno);
    p.puntos([[7, 3], [9, 3]], P.rosa); // patas
    return p.contorno().lienzo();
  });
}

/* ---------------- lobo marino chusco (40 × 18) ---------------- */
export function loboPixel(): Cuadros {
  return [0, 1].map((f) => {
    const p = new Pixeles(40, 20);
    const x0 = 6, x1 = 37, cy = 10;
    const top = (x: number) => cy - 5 * perfil((x - x0) / (x1 - x0), 0.68, 0.8);
    const bot = (x: number) => cy + 5.4 * perfil((x - x0) / (x1 - x0), 0.68, 0.8);
    p.forma((x, y) => x >= x0 && x <= x1 && y >= top(x) && y <= bot(x), franjas(top, bot, [P.cafeOscuro, P.cafe, P.cafe, P.cafeClaro]));
    // aletas traseras y delanteras que reman
    p.linea(x0, cy, 1, cy - 3 + f * 2, P.cafeOscuro); p.linea(x0, cy + 1, 1, cy + 3 - f * 2, P.cafeOscuro);
    p.linea(27, 14, 23 - f * 2, 18, P.cafeOscuro); p.linea(28, 14, 24 - f * 2, 18, P.cafe);
    // cabeza: ojo, hocico y bigotes
    p.puntos([[33, 8], [34, 8]], P.contorno); p.set(34, 8, P.blanco);
    p.set(37, 10, P.contorno);
    p.puntos([[38, 11], [39, 10], [38, 12], [39, 13]], P.cafeClaro);
    return p.contorno().lienzo();
  });
}

/* ---------------- retratos para los diálogos (32 × 32) ---------------- */
export function orbiPixel(): Cuadros {
  const p = new Pixeles(32, 32);
  p.forma((x, y) => x >= 1 && x <= 8 && y >= 12 && y <= 21, (x, y) => ((Math.floor(x) + Math.floor(y)) % 3 === 0 ? P.claro : P.medio)); // panel izquierdo
  p.forma((x, y) => x >= 23 && x <= 30 && y >= 12 && y <= 21, (x, y) => ((Math.floor(x) + Math.floor(y)) % 3 === 0 ? P.claro : P.medio));
  p.linea(9, 16, 10, 16, P.claro); p.linea(21, 16, 22, 16, P.claro);
  p.forma((x, y) => x >= 10 && x <= 21 && y >= 9 && y <= 24, (x, y) => (x > 18 ? P.doradoOscuro : y < 12 ? P.crema : P.dorado)); // cuerpo dorado
  p.linea(15, 8, 15, 4, P.claro); p.puntos([[14, 3], [15, 3], [16, 3], [15, 2]], P.naranja); // antena
  p.elipse(15.5, 26.5, 4, 1.6, P.blanco); // plato
  p.puntos([[13, 14], [13, 15], [18, 14], [18, 15]], P.contorno); p.puntos([[13, 14], [18, 14]], P.blanco);
  p.puntos([[12, 18], [19, 18]], P.rosa);
  p.puntos([[14, 19], [15, 20], [16, 20], [17, 19]], P.contorno);
  return [p.contorno().lienzo()];
}
export function gaiaPixel(): Cuadros {
  const p = new Pixeles(32, 32);
  p.forma((x, y) => y >= 24 && Math.abs(x - 16) <= 8 + (y - 24) * 0.9, (x) => (x > 18 ? P.turquesaOscuro : P.turquesa)); // chaqueta
  p.forma((x, y) => y >= 24 && Math.abs(x - 16) <= 2 - (y - 24) * 0.3, P.blanco); // cuello de la camisa
  p.elipse(16, 6, 3.5, 3, P.pelo); // moño
  p.elipse(16, 15, 7.5, 8.5, P.pelo); // pelo
  p.elipse(16, 17, 5.6, 7, (x) => (x > 18.5 ? P.pielOscura : P.piel)); // cara
  p.forma((x, y) => y >= 9 && y <= 12 && Math.abs(x - 15) < 6, P.pelo); // flequillo
  // lentes, ojos, rubor y sonrisa
  p.puntos([[11, 15], [12, 15], [13, 15], [11, 17], [12, 17], [13, 17], [11, 16], [13, 16], [17, 15], [18, 15], [19, 15], [17, 17], [18, 17], [19, 17], [17, 16], [19, 16], [14, 16], [15, 16], [16, 16]], P.contorno);
  p.puntos([[12, 16], [18, 16]], P.noche);
  p.puntos([[11, 19], [20, 19]], P.rosa);
  p.puntos([[14, 21], [15, 22], [16, 22], [17, 21]], P.pielOscura);
  return [p.contorno().lienzo()];
}
