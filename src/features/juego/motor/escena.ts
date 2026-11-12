/* Escena base del juego: renderizador con contorno negro (estilo caricatura), sombreado en tres tonos,
   cámara y un bucle que llama a la escena activa en cada cuadro. */
import * as THREE from "three";
import { OutlineEffect } from "three/examples/jsm/effects/OutlineEffect.js";

// Sombreado de caricatura en tres tonos
const tonos = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
tonos.minFilter = tonos.magFilter = THREE.NearestFilter;
tonos.needsUpdate = true;

export const toon = (color: THREE.ColorRepresentation, opciones: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial =>
  new THREE.MeshToonMaterial({ color, gradientMap: tonos, ...opciones });

/** Materiales que no llevan contorno negro (luces, partículas, dibujos 2D que ya traen su propio borde) */
export function sinContorno<M extends THREE.Material>(material: M): M {
  material.userData.outlineParameters = { visible: false };
  return material;
}

export const azar = (a: number, b: number): number => a + Math.random() * (b - a);

/** Una escena del juego (prólogo, cardumen, balance…) */
export interface Escena {
  actualizar(dt: number, t: number): void;
  destruir(): void;
}

export interface Motor {
  readonly renderer: THREE.WebGLRenderer;
  readonly escena: THREE.Scene;
  readonly camara: THREE.PerspectiveCamera;
  /** cambia la escena activa; la anterior se destruye y se vacía la escena 3D */
  usar(crear: (motor: Motor) => Escena): void;
  destruir(): void;
}

export function crearMotor(lienzo: HTMLCanvasElement): Motor {
  const lento = /Mobi|Android/i.test(navigator.userAgent) || (navigator.hardwareConcurrency ?? 8) <= 4;
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !lento, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(lento ? 1.25 : 2, devicePixelRatio));
  const contorno = new OutlineEffect(renderer, { defaultThickness: 0.004, defaultColor: [0.07, 0.1, 0.13] });
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(50, 1, 0.1, 300);

  const ajustar = () => {
    const w = lienzo.clientWidth || innerWidth, h = lienzo.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  };
  ajustar();
  addEventListener("resize", ajustar);

  let actual: Escena | null = null;
  const vaciar = () => {
    escena.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
        o.geometry.dispose();
        for (const m of [o.material].flat() as THREE.Material[]) {
          for (const valor of Object.values(m)) if (valor instanceof THREE.Texture && valor !== tonos) valor.dispose();
          m.dispose();
        }
      }
    });
    escena.clear();
    escena.fog = null;
    escena.background = null;
  };

  const reloj = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, reloj.getDelta());
    if (!actual) return;
    actual.actualizar(dt, reloj.elapsedTime);
    contorno.render(escena, camara);
  });

  const motor: Motor = {
    renderer, escena, camara,
    usar(crear) {
      actual?.destruir();
      vaciar();
      actual = crear(motor);
    },
    destruir() {
      renderer.setAnimationLoop(null);
      removeEventListener("resize", ajustar);
      actual?.destruir();
      actual = null;
      vaciar();
      renderer.dispose();
    },
  };
  return motor;
}
