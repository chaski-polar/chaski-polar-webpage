/* Cámara semilibre que acompaña al personaje, como en Bug Fables: se puede girar un poco arrastrando
   y acercar con la rueda, pero siempre mira al personaje desde un ángulo de tres cuartos. */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface Seguidor {
  /** dirección "adelante" y "derecha" de la cámara sobre el plano horizontal, para mover al personaje */
  readonly adelante: THREE.Vector3;
  readonly derecha: THREE.Vector3;
  seguir(posicion: THREE.Vector3): void;
  destruir(): void;
}

export interface OpcionesSeguidor {
  distancia?: number;
  /** cuánto se puede girar a cada lado (radianes) */
  giro?: number;
}

export function crearSeguidor(camara: THREE.PerspectiveCamera, elemento: HTMLElement, inicio: THREE.Vector3, opciones: OpcionesSeguidor = {}): Seguidor {
  const distancia = opciones.distancia ?? 14;
  const giro = opciones.giro ?? 1.2;
  camara.position.copy(inicio).add(new THREE.Vector3(0, distancia * 0.36, distancia * 0.93));
  const controles = new OrbitControls(camara, elemento);
  controles.enablePan = false;
  controles.enableDamping = true;
  controles.minDistance = distancia * 0.45;
  controles.maxDistance = distancia * 1.45;
  controles.minPolarAngle = 0.75;
  controles.maxPolarAngle = 1.5;
  controles.minAzimuthAngle = -giro;
  controles.maxAzimuthAngle = giro;
  controles.target.copy(inicio);

  const anterior = inicio.clone(), delta = new THREE.Vector3(), arriba = new THREE.Vector3(0, 1, 0);
  const adelante = new THREE.Vector3(), derecha = new THREE.Vector3();
  return {
    adelante, derecha,
    seguir(posicion) {
      // la cámara se desplaza con el personaje sin perder el ángulo elegido; la altura se suaviza
      delta.subVectors(posicion, anterior);
      delta.y = 0;
      camara.position.add(delta);
      controles.target.add(delta);
      controles.target.y += (posicion.y - controles.target.y) * 0.1;
      anterior.copy(posicion);
      controles.update();
      camara.getWorldDirection(adelante);
      adelante.y = 0;
      adelante.normalize();
      derecha.crossVectors(adelante, arriba).normalize();
    },
    destruir: () => controles.dispose(),
  };
}
