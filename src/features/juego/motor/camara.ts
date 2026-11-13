/* Cámara en tercera persona que acompaña al personaje (como en los juegos de nado 3D):
   - sube y baja junto con él, suavizada, para que el cambio de profundidad se note;
   - con el ratón se puede girar (arrastrar) y acercar (rueda); al soltar, vuelve sola detrás del personaje;
   - al subir o bajar se inclina un poco hacia donde va, para anticipar lo que hay arriba o abajo. */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface Seguidor {
  /** dirección "adelante" y "derecha" de la cámara sobre el plano horizontal, para mover al personaje */
  readonly adelante: THREE.Vector3;
  readonly derecha: THREE.Vector3;
  /** acompaña al personaje; vy es su velocidad vertical (para inclinar la cámara) */
  seguir(posicion: THREE.Vector3, vy?: number): void;
  destruir(): void;
}

export interface OpcionesSeguidor {
  /** órbita completa sin recentrado automático */
  libre?: boolean;
  distancia?: number;
  /** cuánto se puede girar a cada lado (radianes) */
  giro?: number;
  /** ángulo desde la vertical: 0 = mirar desde arriba, π/2 = de lado. Por defecto, tres cuartos */
  inclinacion?: number;
  /** cuánto se puede inclinar hacia arriba y hacia abajo [mínimo, máximo] */
  inclinacionLimites?: [number, number];
  /** cuánto se inclina la cámara por cada unidad de velocidad vertical (0 = nada) */
  inclinacionVertical?: number;
}

const ESPERA_RECENTRAR = 1.5; // segundos sin tocar el ratón antes de volver detrás del personaje
const SUAVIZADO_ALTURA = 6; // cuán rápido sigue la cámara los cambios de profundidad (por segundo)

export function crearSeguidor(camara: THREE.PerspectiveCamera, elemento: HTMLElement, inicio: THREE.Vector3, opciones: OpcionesSeguidor = {}): Seguidor {
  const distancia = opciones.distancia ?? 14;
  const giro = opciones.giro ?? 1.2;
  const inclinacion = opciones.inclinacion ?? 1.2;
  const porVertical = opciones.inclinacionVertical ?? 0.05;
  const [polarMin, polarMax] = opciones.libre ? [0, Math.PI] : opciones.inclinacionLimites ?? [0.75, 1.5];
  camara.position.copy(inicio).add(new THREE.Vector3(0, distancia * Math.cos(inclinacion), distancia * Math.sin(inclinacion)));
  const controles = new OrbitControls(camara, elemento);
  controles.enablePan = false;
  controles.enableDamping = true;
  controles.minDistance = distancia * 0.45;
  controles.maxDistance = distancia * 1.45;
  controles.minPolarAngle = polarMin;
  controles.maxPolarAngle = polarMax;
  controles.minAzimuthAngle = opciones.libre ? -Infinity : -giro;
  controles.maxAzimuthAngle = opciones.libre ? Infinity : giro;
  controles.target.copy(inicio);

  // mientras el jugador arrastra, la cámara es suya; al soltar, vuelve detrás del personaje
  let arrastrando = false, ultimoToque = -Infinity;
  const empezar = () => { arrastrando = true; };
  const terminar = () => { arrastrando = false; ultimoToque = performance.now() / 1000; };
  controles.addEventListener("start", empezar);
  controles.addEventListener("end", terminar);

  const anterior = inicio.clone(), delta = new THREE.Vector3(), arriba = new THREE.Vector3(0, 1, 0);
  const adelante = new THREE.Vector3(), derecha = new THREE.Vector3();
  const desplazamiento = new THREE.Vector3(), esfera = new THREE.Spherical();
  let alturaSuave = inicio.y, antes = performance.now() / 1000;

  return {
    adelante, derecha,
    seguir(posicion, vy = 0) {
      const ahora = performance.now() / 1000, dt = Math.min(0.1, ahora - antes);
      antes = ahora;
      // horizontal: la cámara acompaña sin retraso
      delta.subVectors(posicion, anterior);
      delta.y = 0;
      anterior.copy(posicion);
      // vertical: cámara y punto de mira bajan juntos, suavizados (antes solo bajaba el punto de mira)
      const nueva = alturaSuave + (posicion.y - alturaSuave) * Math.min(1, dt * SUAVIZADO_ALTURA);
      delta.y = nueva - alturaSuave;
      alturaSuave = nueva;
      camara.position.add(delta);
      controles.target.add(delta);

      // volver detrás del personaje e inclinarse según suba o baje
      if (!opciones.libre && !arrastrando && ahora - ultimoToque > ESPERA_RECENTRAR) {
        desplazamiento.subVectors(camara.position, controles.target);
        esfera.setFromVector3(desplazamiento);
        const k = Math.min(1, dt * 1.5);
        esfera.theta += (0 - esfera.theta) * k;
        const phiObjetivo = THREE.MathUtils.clamp(inclinacion + vy * porVertical, polarMin, polarMax);
        esfera.phi += (phiObjetivo - esfera.phi) * k;
        camara.position.copy(controles.target).add(desplazamiento.setFromSpherical(esfera));
      }
      controles.update();
      camara.getWorldDirection(adelante);
      adelante.y = 0;
      adelante.normalize();
      derecha.crossVectors(adelante, arriba).normalize();
    },
    destruir() {
      controles.removeEventListener("start", empezar);
      controles.removeEventListener("end", terminar);
      controles.dispose();
    },
  };
}
