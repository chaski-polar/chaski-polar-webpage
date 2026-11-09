import * as THREE from "three";
import { pintar } from "../../../lib/atlas";
import { GIRO_INICIAL, INCLINACION, RADIO_GLOBO } from "../../../lib/encuadre";
import { Y_ESPACIO } from "../scroll";
import { azar, sinContorno, toon, type Capa } from "./materiales";

// Globo ilustrativo: el mismo atlas que usa el explorador en su vista "Simple"
export function crearGlobo(): THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial> {
  const material = sinContorno(new THREE.MeshPhongMaterial({ color: 0x0f3352, shininess: 6 }));
  const globo = new THREE.Mesh(new THREE.SphereGeometry(RADIO_GLOBO, 64, 48), material);
  pintar({ paleta: "noche", detalle: false, ancho: innerWidth <= 900 ? 2048 : 4096 }).then((lienzo) => {
    const textura = new THREE.CanvasTexture(lienzo);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.anisotropy = 4;
    material.map = textura;
    material.color.set(0xffffff);
    material.needsUpdate = true;
  });
  return globo;
}

export function crearEstrellas(cantidad: number, posicion: () => [number, number, number]): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const pos = new Float32Array(cantidad * 3);
  for (let i = 0; i < cantidad; i++) pos.set(posicion(), i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, sinContorno(new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true })));
}

export function crearEspacio(escena: THREE.Scene): Capa & { globo: THREE.Object3D } {
  const globo = crearGlobo();
  globo.position.set(0, Y_ESPACIO, -28);
  globo.rotation.set(INCLINACION, GIRO_INICIAL, 0);
  escena.add(globo);

  const satelite = new THREE.Group();
  satelite.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.6), toon(0xd9dde2)));
  for (const lado of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.7), toon(0x2f6fb3));
    panel.position.x = lado * 1.25;
    satelite.add(panel);
  }
  escena.add(satelite);

  const estrellas = crearEstrellas(1500, () => [azar(-120, 120), azar(45, 200), azar(-150, -40)]);
  escena.add(estrellas);

  return {
    globo,
    actualizar(t, y) {
      globo.rotation.y += 0.0002;
      satelite.position.set(Math.cos(t * 0.3) * 15, Y_ESPACIO + 3 + Math.sin(t * 0.3) * 2, -28 + Math.sin(t * 0.3) * 10);
      satelite.rotation.y = t * 0.3;
      estrellas.material.opacity = Math.max(0, Math.min(1, (y - 35) / 15));
    },
  };
}
