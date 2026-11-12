/* Monta la escena de la portada sobre el canvas #escena y devuelve una función para desmontarla */
import * as THREE from "three";
import { porId } from "../../lib/lienzo";
import { crearAmbiente } from "./escena/ambiente";
import { elegirCalidad } from "./escena/calidad";
import { crearEspacio } from "./escena/espacio";
import { crearSubmarino } from "./escena/submarino";
import { crearSuperficie } from "./escena/superficie";
import { crearSecciones } from "./interfaz";
import { alturaEn, seguirScroll } from "./scroll";
import { crearTransicion } from "./transicion";

// Si el equipo no llega a este ritmo, se baja la resolución de dibujo poco a poco
const FPS_MINIMO = 30;
const PIXEL_MINIMO = 0.75;

export function montarPortada(alEntrar: () => void): () => void {
  const C = elegirCalidad();
  const renderer = new THREE.WebGLRenderer({ canvas: porId<HTMLCanvasElement>("escena"), antialias: C.alta, powerPreference: "high-performance" });
  let pixel = C.pixel;
  renderer.setPixelRatio(pixel);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 3000);
  const alRedimensionar = () => {
    camara.aspect = innerWidth / innerHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  };
  addEventListener("resize", alRedimensionar);

  const scroll = seguirScroll();
  const ambiente = crearAmbiente(escena, renderer);
  const espacio = crearEspacio(escena, C);
  const capas = [espacio, crearSuperficie(escena, C), crearSubmarino(escena, C)];
  const transicion = crearTransicion(espacio.globo, alEntrar);
  const interfaz = crearSecciones(() => transicion.iniciar());

  const reloj = new THREE.Clock();
  let cuadros = 0, inicioMedida = 2; // los primeros segundos se ignoran: cargan texturas y se compilan los shaders
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, reloj.getDelta()), t = reloj.elapsedTime;
    const y = alturaEn(scroll.progreso);
    camara.position.set(Math.sin(t * 0.2) * 0.6, y, 6);
    camara.lookAt(0, y - 1.5, -20);
    transicion.actualizar(dt, camara);
    ambiente.actualizar(y, camara);
    for (const capa of capas) capa.actualizar(t, y);
    interfaz.actualizar(scroll.progreso, y, transicion.activa);
    renderer.render(escena, camara);

    // ajuste automático de calidad según los cuadros por segundo
    if (t < inicioMedida) return;
    cuadros++;
    if (t - inicioMedida >= 2) {
      const fps = cuadros / (t - inicioMedida);
      if (fps < FPS_MINIMO && pixel > PIXEL_MINIMO && !document.hidden) {
        pixel = Math.max(PIXEL_MINIMO, pixel - 0.25);
        renderer.setPixelRatio(pixel);
        renderer.setSize(innerWidth, innerHeight);
      }
      cuadros = 0;
      inicioMedida = t;
    }
  });

  return () => {
    renderer.setAnimationLoop(null);
    removeEventListener("resize", alRedimensionar);
    scroll.detener();
    escena.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose();
        for (const m of [o.material].flat() as THREE.Material[]) {
          for (const valor of Object.values(m)) if (valor instanceof THREE.Texture) valor.dispose();
          m.dispose();
        }
      }
    });
    renderer.dispose();
  };
}
