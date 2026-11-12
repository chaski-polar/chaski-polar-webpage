/* Cola de diálogos: las escenas piden decir varias líneas y esperan (con await) a que el jugador las lea */
import { create } from "zustand";

export type Hablante = "orbi" | "gaia" | "kiri";

export interface Linea {
  quien: Hablante;
  texto: string;
}

interface EstadoDialogo {
  linea: Linea | null;
  cola: Linea[];
  terminar: (() => void) | null;
  /** muestra las líneas una tras otra; si ya hay un diálogo, se agregan al final.
      La promesa se cumple cuando se cierra la última línea */
  decir(lineas: Linea[]): Promise<void>;
  avanzar(): void;
  cerrar(): void;
}

export const useDialogo = create<EstadoDialogo>((set, get) => ({
  linea: null,
  cola: [],
  terminar: null,
  decir(lineas) {
    const [primera, ...resto] = lineas;
    if (!primera) return Promise.resolve();
    const { linea, cola, terminar } = get();
    return new Promise<void>((resolver) => {
      // al terminar se avisa a quien pidió el diálogo anterior y a este
      const ambos = () => { terminar?.(); resolver(); };
      if (linea) set({ cola: [...cola, ...lineas], terminar: ambos });
      else set({ linea: primera, cola: resto, terminar: resolver });
    });
  },
  avanzar() {
    const { cola, terminar } = get();
    const [siguiente, ...resto] = cola;
    if (siguiente) { set({ linea: siguiente, cola: resto }); return; }
    set({ linea: null, cola: [], terminar: null });
    terminar?.();
  },
  cerrar() {
    const { terminar } = get();
    set({ linea: null, cola: [], terminar: null });
    terminar?.();
  },
}));

/** Para las escenas: true mientras hay un diálogo en pantalla (el juego se detiene) */
export const hayDialogo = (): boolean => useDialogo.getState().linea !== null;
