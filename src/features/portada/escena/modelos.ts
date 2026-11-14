import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/* Carga de los modelos 3D aportados por el equipo. Cada archivo se descarga una sola vez; si falla, la portada
   sigue con las piezas dibujadas en código. */

export const MODELO_PERU = "/assets/portada/cardumen_escenario_peru.glb";
export const MODELO_FONDO = "/assets/portada/fondo_submarino.glb";

const cache = new Map<string, Promise<THREE.Object3D | null>>();

export function cargarModelo(url: string): Promise<THREE.Object3D | null> {
  let p = cache.get(url);
  if (!p) {
    p = new GLTFLoader().loadAsync(url).then((g) => { g.scene.updateMatrixWorld(true); return g.scene; }).catch(() => null);
    cache.set(url, p);
  }
  return p;
}

/** Mallas del modelo cuyo nombre empieza por alguno de los prefijos */
export function mallas(raiz: THREE.Object3D, ...prefijos: string[]): THREE.Mesh[] {
  const r: THREE.Mesh[] = [];
  raiz.traverse((o) => { if (o instanceof THREE.Mesh && prefijos.some((p) => o.name.startsWith(p))) r.push(o); });
  return r;
}

/** Geometría con la transformación del nodo ya aplicada, centrada en x/z, apoyada en y=0 y con su lado mayor igual a `largo` */
export function geometriaNormalizada(m: THREE.Mesh, largo: number): THREE.BufferGeometry {
  const g = m.geometry.clone();
  g.applyMatrix4(m.matrixWorld);
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const c = b.getCenter(new THREE.Vector3());
  g.translate(-c.x, -b.min.y, -c.z);
  g.scale(largo / Math.max(b.max.x - b.min.x, b.max.z - b.min.z), largo / Math.max(b.max.x - b.min.x, b.max.z - b.min.z), largo / Math.max(b.max.x - b.min.x, b.max.z - b.min.z));
  g.computeVertexNormals();
  return g;
}

/** Material del modelo con sus colores; se copia para que cada capa pueda atenuarlo por su cuenta */
export function materialDe(m: THREE.Mesh): THREE.Material | THREE.Material[] {
  return Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
}
