// Relación entre el scroll y la altura de la cámara. y = 0 es la superficie del mar.
export const Y_ESPACIO = 80;
export const Y_FONDO = -40;

// [progreso, altura]: cada tramo dura lo necesario para que su texto coincida con la capa visible
const TRAMOS: readonly (readonly [number, number])[] = [[0, Y_ESPACIO], [0.22, 25], [0.4, 0], [0.55, -4.5], [0.7, -9], [0.86, -30], [1, Y_FONDO]];

export function alturaEn(p: number): number {
  for (let i = 0; i < TRAMOS.length - 1; i++) {
    const [pa, ya] = TRAMOS[i]!, [pb, yb] = TRAMOS[i + 1]!;
    if (p <= pb) return ya + ((yb - ya) * (p - pa)) / (pb - pa);
  }
  return Y_FONDO;
}

export interface EstadoScroll {
  /** 0 arriba, 1 al fondo */
  progreso: number;
}

export function seguirScroll(): EstadoScroll & { detener(): void } {
  const estado = { progreso: 0, detener: () => {} };
  const leer = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    estado.progreso = max > 0 ? Math.min(1, scrollY / max) : 0;
  };
  history.scrollRestoration = "manual";
  scrollTo(0, 0);
  addEventListener("scroll", leer, { passive: true });
  addEventListener("resize", leer);
  leer();
  estado.detener = () => { removeEventListener("scroll", leer); removeEventListener("resize", leer); };
  return estado;
}
