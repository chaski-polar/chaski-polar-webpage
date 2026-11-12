/* Imágenes de los personajes. Si existe public/assets/juego/sprites/<nombre>.png se usa esa imagen;
   si no, el dibujo hecho en código. Así se pueden reemplazar los dibujos de uno en uno, sin tocar el código.
   Las imágenes deben tener fondo transparente y, salvo el pingüino, el guanay y los retratos, mirar a la derecha. */

export const NOMBRES_SPRITES = [
  "lumi", "kiri", "nara", "anchi", "anchoveta", "pinguino", "guanay", "lobo", "fito", "nutriente", "orbi", "gaia",
] as const;
export type NombreSprite = (typeof NOMBRES_SPRITES)[number];

const RUTA = "/assets/juego/sprites/";
const cargadas = new Map<NombreSprite, HTMLCanvasElement>();
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
  precarga ??= Promise.all(NOMBRES_SPRITES.map(cargar)).then(() => undefined);
  return precarga;
}

/** La imagen del personaje si se cargó; si no, el dibujo de respaldo */
export function sprite(nombre: NombreSprite, respaldo: () => HTMLCanvasElement): HTMLCanvasElement {
  return cargadas.get(nombre) ?? respaldo();
}
