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
  /** ángulo desde la vertical: 0 = mirar desde arriba, π/2 = de lado. Por defecto, tres cuartos */
  inclinacion?: number;
  /** cuánto se puede inclinar hacia arriba y hacia abajo [mínimo, máximo] */
  inclinacionLimites?: [number, number];
}

export function crearSeguidor(camara: THREE.PerspectiveCamera, elemento: HTMLElement, inicio: THREE.Vector3, opciones: OpcionesSeguidor = {}): Seguidor {
  const distancia = opciones.distancia ?? 14;
  const giro = opciones.giro ?? 1.2;
  const inclinacion = opciones.inclinacion ?? 1.2;
  const [polarMin, polarMax] = opciones.inclinacionLimites ?? [0.75, 1.5];
  camara.position.copy(inicio).add(new THREE.Vector3(0, distancia * Math.cos(inclinacion), distancia * Math.sin(inclinacion)));
  const controles = new OrbitControls(camara, elemento);
  controles.enablePan = false;
  controles.enableDamping = true;
  controles.minDistance = distancia * 0.45;
  controles.maxDistance = distancia * 1.45;
  controles.minPolarAngle = polarMin;
  controles.maxPolarAngle = polarMax;
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
