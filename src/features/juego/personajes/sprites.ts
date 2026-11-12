/* Arte compartido por escenas, retratos y menú. Por defecto usa el pixel art original y sus cuadros.
   ?arte=png permite comparar los PNG de public/assets/juego/sprites/ sin sustituir la dirección actual.
   Las imágenes externas deben ser transparentes y, salvo pingüino, guanay y retratos, mirar a la derecha. */

import * as px from './pixelart';

export const NOMBRES_SPRITES = [
  "lumi", "kiri", "nara", "anchi", "anchoveta", "pinguino", "guanay", "lobo", "fito", "nutriente", "orbi", "gaia",
] as const;
export type NombreSprite = (typeof NOMBRES_SPRITES)[number];

const RUTA = "/assets/juego/sprites/";
const cargadas = new Map<NombreSprite, HTMLCanvasElement>();
const animaciones = new WeakMap<HTMLCanvasElement, readonly HTMLCanvasElement[]>();
const dibujantes: Record<NombreSprite, () => HTMLCanvasElement[]> = {
  lumi: px.lumiPixel, kiri: px.kiriPixel, nara: px.naraPixel,
  anchi: px.anchiPixel, anchoveta: px.anchovetaPixel, pinguino: px.pinguinoPixel,
  guanay: px.guanayPixel, lobo: px.loboPixel, fito: px.fitoPixel,
  nutriente: px.nutrientePixel, orbi: px.orbiPixel, gaia: px.gaiaPixel,
};

/** El pixel art es la dirección actual. Los PNG anteriores solo se prueban con ?arte=png. */
function prepararPixel(nombre: NombreSprite): HTMLCanvasElement {
  let c = cargadas.get(nombre);
  if (!c) {
    const cuadros = dibujantes[nombre]();
    c = cuadros[0]!;
    animaciones.set(c, cuadros);
    cargadas.set(nombre, c);
  }
  return c;
}

export const cuadrosSprite = (c: HTMLCanvasElement): readonly HTMLCanvasElement[] => animaciones.get(c) ?? [c];
let precarga: Promise<void> | null = null;

function cargar(nombre: NombreSprite): Promise<void> {
  return new Promise((resolver) => {
    const img = new Image();
    img.onload = () => {
      // se copia a un canvas para usarla igual que los dibujos hechos en código
      const c = Object.assign(document.createElement("canvas"), { width: img.naturalWidth, height: img.naturalHeight });
      const g = c.getContext("2d");
      if (g && img.naturalWidth > 0) { g.drawImage(img, 0, 0); cargadas.set(nombre, c); }
      resolver();
    };
    img.onerror = () => resolver(); // no existe: se usará el dibujo en código
    img.src = `${RUTA}${nombre}.png`;
  });
}

/** Intenta cargar todas las imágenes una vez (las que falten se ignoran) */
export function precargarSprites(): Promise<void> {
  precarga ??= new URLSearchParams(location.search).get('arte') === 'png'
    ? Promise.all(NOMBRES_SPRITES.map(cargar)).then(() => undefined)
    : Promise.resolve();
  return precarga;
}

/** La imagen del personaje si se cargó; si no, el dibujo de respaldo */
export function sprite(nombre: NombreSprite, respaldo: () => HTMLCanvasElement): HTMLCanvasElement {
  if (new URLSearchParams(location.search).get('arte') === 'png') return cargadas.get(nombre) ?? respaldo();
  return prepararPixel(nombre);
}
