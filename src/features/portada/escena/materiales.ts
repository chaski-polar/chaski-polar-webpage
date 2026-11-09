import * as THREE from "three";

// Sombreado de caricatura en tres tonos
const tonos = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
tonos.minFilter = tonos.magFilter = THREE.NearestFilter;
tonos.needsUpdate = true;

export const toon = (color: THREE.ColorRepresentation, opciones: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial =>
  new THREE.MeshToonMaterial({ color, gradientMap: tonos, ...opciones });

// Materiales que no llevan contorno negro (efectos de luz, partículas, globo)
export function sinContorno<M extends THREE.Material>(material: M): M {
  material.userData.outlineParameters = { visible: false };
  return material;
}

export const azar = (a: number, b: number): number => a + Math.random() * (b - a);

/** Parte de la escena que se actualiza en cada cuadro según el tiempo y la altura de la cámara */
export interface Capa {
  actualizar(t: number, y: number): void;
}
