/* Ayudas para crear canvas y obtener su contexto 2D con tipos estrictos */

export function lienzo(ancho: number, alto: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  return c;
}

export function contexto2d(c: HTMLCanvasElement, opciones?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
  const ctx = c.getContext("2d", opciones);
  if (!ctx) throw new Error("El navegador no permite dibujar en canvas 2D");
  return ctx;
}

export function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = mal;
    img.src = src;
  });
}

/** Busca un elemento por id y falla con un mensaje claro si la página no lo tiene */
export function porId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en la página`);
  return el as T;
}
