/* Monta la escena de la portada sobre el canvas #escena y devuelve una función para desmontarla */
import * as THREE from "three";
import { OutlineEffect } from "three/examples/jsm/effects/OutlineEffect.js";
import { porId } from "../../lib/lienzo";
import { crearAmbiente } from "./escena/ambiente";
import { crearEspacio } from "./escena/espacio";
import { crearSubmarino } from "./escena/submarino";
import { crearSuperficie } from "./escena/superficie";
import { crearSecciones } from "./interfaz";
import { alturaEn, seguirScroll } from "./scroll";
import { crearTransicion } from "./transicion";

export function montarPortada(alEntrar: () => void): () => void {
  const renderer = new THREE.WebGLRenderer({ canvas: porId<HTMLCanvasElement>("escena"), antialias: true });
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio));
  renderer.setSize(innerWidth, innerHeight);
  const contorno = new OutlineEffect(renderer, { defaultThickness: 0.004, defaultColor: [0.07, 0.1, 0.13] });

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400);
  const alRedimensionar = () => {
    camara.aspect = innerWidth / innerHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  };
  addEventListener("resize", alRedimensionar);

  const scroll = seguirScroll();
  const ambiente = crearAmbiente(escena);
  const espacio = crearEspacio(escena);
  const capas = [espacio, crearSuperficie(escena), crearSubmarino(escena)];
  const transicion = crearTransicion(espacio.globo, alEntrar);
  const interfaz = crearSecciones(() => transicion.iniciar());

  const reloj = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, reloj.getDelta()), t = reloj.elapsedTime;
    const y = alturaEn(scroll.progreso);
    camara.position.set(Math.sin(t * 0.2) * 0.6, y, 6);
    camara.lookAt(0, y - 1.5, -20);
    transicion.actualizar(dt, camara);
    ambiente.actualizar(y);
    for (const capa of capas) capa.actualizar(t, y);
    interfaz.actualizar(scroll.progreso, y, transicion.activa);
    contorno.render(escena, camara);
  });

  return () => {
    renderer.setAnimationLoop(null);
    removeEventListener("resize", alRedimensionar);
    scroll.detener();
    escena.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose();
        for (const m of [o.material].flat()) m.dispose();
      }
    });
    renderer.dispose();
  };
}
