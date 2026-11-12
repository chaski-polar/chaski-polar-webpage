import { porId } from "../../lib/lienzo";
import { SECCIONES, nombreCapa } from "./contenido";

export interface Interfaz {
  actualizar(progreso: number, y: number, enTransicion: boolean): void;
}

// Crea los textos de cada tramo a partir de contenido.ts y mueve los medidores de profundidad
export function crearSecciones(alEntrar: () => void): Interfaz {
  const contenedor = porId("secciones");
  const etiqueta = porId("mEtiqueta"), valor = porId("mValor"), marca = porId("marca"), capa = porId("mCapa"), pista = porId("pista");

  const nodos = SECCIONES.map((s) => {
    const sec = document.createElement("section");
    sec.className = "portada-seccion";
    const titulo = document.createElement(s.principal ? "h1" : "h2");
    titulo.textContent = s.titulo;
    const texto = document.createElement("p");
    texto.textContent = s.texto;
    sec.append(titulo, texto);
    for (const b of s.botones ?? []) {
      const boton = b.href ? Object.assign(document.createElement("a"), { href: b.href }) : Object.assign(document.createElement("button"), { type: "button" });
      boton.className = "portada-boton";
      boton.textContent = b.texto;
      if (b.accion === "entrar") boton.addEventListener("click", alEntrar);
      sec.append(boton);
    }
    contenedor.append(sec);
    return { nodo: sec, de: s.de, a: s.a };
  });

  return {
    actualizar(progreso, y, enTransicion) {
  etiqueta.textContent = y > 30 ? "ORBIT" : y > 0 ? "ALTITUDE" : "DEPTH";
      valor.textContent = y > 30 ? "700 km" : y > 0 ? `${Math.round(y * 20)} m` : `${Math.round(-y * 5)} m`;
      marca.style.top = `calc(${progreso * 100}% - 6px)`;
      capa.textContent = nombreCapa(y);
      for (const { nodo, de, a } of nodos) {
        const dentro = progreso >= de && progreso <= a;
        const borde = de === 0 ? a - progreso : Math.min(progreso - de, a - progreso);
        nodo.style.opacity = String(dentro ? Math.min(1, borde / 0.025) : 0);
        nodo.classList.toggle("activa", dentro);
      }
      pista.style.opacity = progreso < 0.03 && !enTransicion ? "0.8" : "0";
    },
  };
}
