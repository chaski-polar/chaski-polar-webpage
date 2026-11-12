/* Controles: teclado (WASD o flechas) y, en pantallas táctiles, una palanca virtual abajo a la izquierda.
   Devuelve la dirección pedida: x hacia la derecha y y hacia adelante, cada una entre -1 y 1. */

export interface Entrada {
  direccion(): { x: number; y: number };
  destruir(): void;
}

const ARRIBA = new Set(["w", "arrowup"]), ABAJO = new Set(["s", "arrowdown"]);
const IZQUIERDA = new Set(["a", "arrowleft"]), DERECHA = new Set(["d", "arrowright"]);

export function crearEntrada(contenedor: HTMLElement): Entrada {
  const teclas = new Set<string>();
  const escribe = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
  const bajar = (e: KeyboardEvent) => {
    if (escribe(e)) return;
    const k = e.key.toLowerCase();
    teclas.add(k);
    if (k.startsWith("arrow")) e.preventDefault(); // que las flechas no muevan la página
  };
  const subir = (e: KeyboardEvent) => teclas.delete(e.key.toLowerCase());
  const soltarTodo = () => teclas.clear();
  addEventListener("keydown", bajar);
  addEventListener("keyup", subir);
  addEventListener("blur", soltarTodo);

  // palanca virtual (solo se ve en pantallas táctiles, ver juego.css)
  const base = document.createElement("div");
  base.className = "juego-palanca";
  base.setAttribute("aria-hidden", "true");
  const mando = document.createElement("div");
  mando.className = "juego-palanca-mando";
  base.append(mando);
  contenedor.append(base);
  const palanca = { x: 0, y: 0, id: -1 };
  const mover = (e: PointerEvent) => {
    if (e.pointerId !== palanca.id) return;
    const r = base.getBoundingClientRect(), radio = r.width / 2;
    let dx = (e.clientX - (r.left + radio)) / radio, dy = (e.clientY - (r.top + radio)) / radio;
    const largo = Math.hypot(dx, dy);
    if (largo > 1) { dx /= largo; dy /= largo; }
    palanca.x = dx; palanca.y = -dy;
    mando.style.transform = `translate(${dx * radio * 0.6}px, ${dy * radio * 0.6}px)`;
  };
  const empezar = (e: PointerEvent) => { palanca.id = e.pointerId; base.setPointerCapture(e.pointerId); mover(e); };
  const terminar = (e: PointerEvent) => {
    if (e.pointerId !== palanca.id) return;
    palanca.id = -1; palanca.x = palanca.y = 0;
    mando.style.transform = "";
  };
  base.addEventListener("pointerdown", empezar);
  base.addEventListener("pointermove", mover);
  base.addEventListener("pointerup", terminar);
  base.addEventListener("pointercancel", terminar);

  const hay = (grupo: Set<string>) => [...grupo].some((k) => teclas.has(k));
  return {
    direccion() {
      let x = (hay(DERECHA) ? 1 : 0) - (hay(IZQUIERDA) ? 1 : 0) + palanca.x;
      let y = (hay(ARRIBA) ? 1 : 0) - (hay(ABAJO) ? 1 : 0) + palanca.y;
      const largo = Math.hypot(x, y);
      if (largo > 1) { x /= largo; y /= largo; }
      return { x, y };
    },
    destruir() {
      removeEventListener("keydown", bajar);
      removeEventListener("keyup", subir);
      removeEventListener("blur", soltarTodo);
      base.remove();
    },
  };
}
