import * as THREE from "three";
import { DISTANCIA_FINAL, guardarGiro } from "../../lib/encuadre";
import { porId } from "../../lib/lienzo";

export interface Transicion {
  readonly activa: boolean;
  iniciar(): void;
  actualizar(dt: number, camara: THREE.Camera): void;
}

// Al entrar al explorador: subir hasta el globo, acercar la cámara, fundir a oscuro y abrir la otra página.
// El explorador arranca con el mismo globo, el mismo giro y la misma distancia de cámara.
export function crearTransicion(globo: THREE.Object3D, alTerminar: () => void): Transicion {
  let avance = 0, activa = false, iniciada = false;
  const velo = porId("velo");
  const objetivo = new THREE.Vector3(), delante = new THREE.Vector3(0, 0, DISTANCIA_FINAL);
  // al volver con el botón "atrás" el navegador puede restaurar la página tal como quedó: se reinicia
  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    avance = 0; activa = false; iniciada = false;
    velo.style.opacity = "0";
  }, { once: true });

  return {
    get activa() { return activa; },
    iniciar() {
      if (iniciada) return;
      iniciada = true;
      scrollTo({ top: 0, behavior: scrollY < 2 ? "auto" : "smooth" });
      const esperar = () => { if (scrollY > 2) requestAnimationFrame(esperar); else setTimeout(() => { activa = true; }, 150); };
      esperar();
    },
    actualizar(dt, camara) {
      if (!activa) return;
      avance = Math.min(1, avance + dt * 0.75);
      const e = avance * avance * (3 - 2 * avance);
      objetivo.copy(globo.position).add(delante);
      camara.position.lerp(objetivo, e);
      camara.lookAt(globo.position);
      velo.style.opacity = String(Math.max(0, (avance - 0.55) / 0.45));
      if (avance >= 1) {
        activa = false;
        guardarGiro(globo.rotation.y);
        alTerminar();
      }
    },
  };
}
