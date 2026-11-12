/* Personaje 2D en un mundo 3D: conserva sus proporciones, mira a la cámara y se voltea al nadar.
   El pixel art se anima por cuadros con filtrado nítido; la sombra en el suelo es opcional. */
import * as THREE from "three";
import { sinContorno } from "./escena";
import { espejo, textura } from "./dibujo";
import { cuadrosSprite } from '../personajes/sprites';

export interface Personaje {
  readonly sprite: THREE.Sprite;
  readonly posicion: THREE.Vector3;
  /** multiplica el tamaño del dibujo (por ejemplo, para que crezca) */
  escala: number;
  /** anima el dibujo según su velocidad; "derecha" es la derecha de la cámara */
  animar(t: number, velocidad: THREE.Vector3, derecha: THREE.Vector3, velocidadMax: number): void;
  /** parpadeo cuando recibe un golpe */
  parpadear(activo: boolean, t: number): void;
}

export interface OpcionesPersonaje {
  ancho: number;
  alto: number;
  /** altura del suelo para la sombra; sin valor, no lleva sombra */
  suelo?: number;
  /** el dibujo original mira a la derecha (por defecto) o a la izquierda */
  miraIzquierda?: boolean;
}

const sombraMat = sinContorno(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));

export function crearPersonaje(escena: THREE.Scene, dibujo: HTMLCanvasElement, o: OpcionesPersonaje): Personaje {
  const pixel = cuadrosSprite(dibujo);
  const esPixel = dibujo.width <= 96;
  const preparar = (c: HTMLCanvasElement) => {
    const t = textura(c);
    if (esPixel) {
      t.magFilter = t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
    }
    return t;
  };
  const derechaTex = pixel.map((c) => preparar(o.miraIzquierda ? espejo(c) : c));
  const izquierdaTex = pixel.map((c) => preparar(o.miraIzquierda ? c : espejo(c)));
  const material = sinContorno(new THREE.SpriteMaterial({ map: derechaTex[0], transparent: true, alphaTest: 0.05 }));
  material.userData.cuadros = [...derechaTex, ...izquierdaTex];
  const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sprite = new THREE.Sprite(material);
  // El rectángulo del personaje conserva las proporciones originales del dibujo.
  const factor = Math.min(o.ancho / dibujo.width, o.alto / dibujo.height);
  const ancho = dibujo.width * factor, alto = dibujo.height * factor;
  sprite.scale.set(ancho, alto, 1);
  escena.add(sprite);

  let sombra: THREE.Mesh | null = null;
  if (o.suelo != null) {
    sombra = new THREE.Mesh(new THREE.CircleGeometry(o.ancho * 0.32, 20), sombraMat);
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = o.suelo + 0.06;
    escena.add(sombra);
  }
  let haciaDerecha = true;

  const p: Personaje = {
    sprite,
    posicion: sprite.position,
    escala: 1,
    animar(t, vel, derecha, max) {
      if (vel.lengthSq() > 0.2) {
        haciaDerecha = vel.dot(derecha) >= 0;
      }
      const mueve = Math.min(1, vel.length() / Math.max(0.001, max));
      const cuadro = reducirMovimiento ? 0 : Math.floor(t * (mueve > 0.1 ? 7 : 2)) % pixel.length;
      material.map = (haciaDerecha ? derechaTex : izquierdaTex)[cuadro]!;
      sprite.scale.set(ancho * p.escala, alto * p.escala, 1);
      material.rotation = (haciaDerecha ? -1 : 1) * 0.035 * mueve * Math.sin(t * 7);
      if (sombra) sombra.position.set(sprite.position.x, sombra.position.y, sprite.position.z);
    },
    parpadear(activo, t) {
      material.opacity = activo && Math.floor(t * 12) % 2 ? 0.35 : 1;
    },
  };
  return p;
}
