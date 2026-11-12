/* Personaje 2D en un mundo 3D: un dibujo plano que siempre mira a la cámara, con sombra en el suelo.
   Se voltea según hacia dónde nada, rebota al moverse y se inclina un poco, como en Bug Fables. */
import * as THREE from "three";
import { sinContorno } from "./escena";
import { espejo, textura } from "./dibujo";

export interface Personaje {
  readonly sprite: THREE.Sprite;
  readonly posicion: THREE.Vector3;
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
  const derechaTex = textura(o.miraIzquierda ? espejo(dibujo) : dibujo);
  const izquierdaTex = textura(o.miraIzquierda ? dibujo : espejo(dibujo));
  const material = sinContorno(new THREE.SpriteMaterial({ map: derechaTex, transparent: true, alphaTest: 0.05 }));
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(o.ancho, o.alto, 1);
  escena.add(sprite);

  let sombra: THREE.Mesh | null = null;
  if (o.suelo != null) {
    sombra = new THREE.Mesh(new THREE.CircleGeometry(o.ancho * 0.32, 20), sombraMat);
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = o.suelo + 0.06;
    escena.add(sombra);
  }
  let haciaDerecha = true;

  return {
    sprite,
    posicion: sprite.position,
    animar(t, vel, derecha, max) {
      if (vel.lengthSq() > 0.2) {
        haciaDerecha = vel.dot(derecha) >= 0;
        material.map = haciaDerecha ? derechaTex : izquierdaTex;
      }
      const mueve = Math.min(1, vel.length() / Math.max(0.001, max));
      sprite.scale.set(o.ancho * (1 - 0.06 * mueve * Math.sin(t * 14)), o.alto * (1 + 0.08 * mueve * Math.sin(t * 14)), 1);
      material.rotation = (haciaDerecha ? -1 : 1) * 0.12 * mueve * Math.sin(t * 7);
      if (sombra) sombra.position.set(sprite.position.x, sombra.position.y, sprite.position.z);
    },
    parpadear(activo, t) {
      material.opacity = activo && Math.floor(t * 12) % 2 ? 0.35 : 1;
    },
  };
}
