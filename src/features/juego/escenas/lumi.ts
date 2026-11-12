/* Escena de Lumi, el fitoplancton: el agua antártica bajo el hielo marino que se abre en primavera.
   Lumi necesita dos cosas para crecer: luz (más cerca de la superficie, fuera de la sombra del hielo)
   y nutrientes (suben desde abajo). Al llenarse, se divide. Meta: DIVISIONES_META divisiones. */
import * as THREE from "three";
import { crearSeguidor } from "../motor/camara";
import type { Entrada } from "../motor/entrada";
import { azar, sinContorno, toon, type Escena, type Motor } from "../motor/escena";
import { crearPersonaje, type Personaje } from "../motor/personaje";
import { dibujarLumi, dibujarNutriente } from "../personajes/antartida";

export const DIVISIONES_META = 3;
const X = 14, Y_MIN = -13, Y_MAX = -0.8, Z = 5;
const VELOCIDAD = 5;
const CRECIMIENTO = 0.16; // por segundo con luz y nutrientes plenos
const CONSUMO = 0.07; // nutrientes que gasta al crecer, por segundo
const NUTRIENTES_POR_CHISPA = 0.22;
const SOMBRA_HIELO = 0.12; // la luz que pasa bajo el hielo

export interface EstadoLumi {
  luz: number;
  nutrientes: number;
  crecimiento: number;
  divisiones: number;
  bajoHielo: boolean;
}

export interface EventosLumi {
  estado(e: EstadoLumi): void;
  division(n: number): void;
  terminado(): void;
}

interface Placa { malla: THREE.Mesh; sombra: THREE.Mesh; vel: number; ancho: number }

export function escenaLumi(entrada: Entrada, eventos: EventosLumi, pausa: () => boolean): (motor: Motor) => Escena {
  return (motor) => {
    const { escena, camara, renderer } = motor;
    escena.background = new THREE.Color(0x1b5f86);
    escena.fog = new THREE.Fog(0x1b5f86, 16, 48);
    escena.add(new THREE.HemisphereLight(0xe6f6ff, 0x0d2c44, 1.2));
    const sol = new THREE.DirectionalLight(0xffffff, 1.3);
    sol.position.set(0, 20, 5);
    escena.add(sol);

    // agua que se oscurece con la profundidad (fondo lejano con degradado)
    const c = Object.assign(document.createElement("canvas"), { width: 4, height: 256 });
    const g = c.getContext("2d");
    if (g) { const d = g.createLinearGradient(0, 0, 0, 256); d.addColorStop(0, "#5fb8dc"); d.addColorStop(0.45, "#1d6b94"); d.addColorStop(1, "#06223a"); g.fillStyle = d; g.fillRect(0, 0, 4, 256); }
    const fondo = new THREE.Mesh(new THREE.PlaneGeometry(90, 20), sinContorno(new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), fog: false })));
    fondo.position.set(0, (Y_MIN + 1) / 2, -18);
    escena.add(fondo);

    // hielo marino: placas que derivan en la superficie y dan sombra debajo
    const hielo = toon(0xeef8fc);
    const matSombra = sinContorno(new THREE.MeshBasicMaterial({ color: 0x041526, transparent: true, opacity: 0.32, depthWrite: false }));
    const placas: Placa[] = [-11, 1, 11].map((x, i) => {
      const ancho = azar(5, 7.5);
      const malla = new THREE.Mesh(new THREE.BoxGeometry(ancho, 1.2, Z * 2 + 4), hielo);
      malla.position.set(x, 0.2, 0);
      const sombra = new THREE.Mesh(new THREE.BoxGeometry(ancho, -Y_MIN, Z * 2 + 3.8), matSombra);
      sombra.position.set(x, Y_MIN / 2, 0);
      escena.add(malla, sombra);
      return { malla, sombra, vel: (i % 2 ? -1 : 1) * azar(0.6, 1.1), ancho };
    });
    const superficie = new THREE.Mesh(new THREE.PlaneGeometry(90, 30).rotateX(Math.PI / 2), sinContorno(new THREE.MeshBasicMaterial({ color: 0xd8f3ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })));
    escena.add(superficie);

    const lumi = crearPersonaje(escena, dibujarLumi(), { ancho: 2, alto: 2 });
    lumi.posicion.set(-4.5, -6, 0); // en un claro entre las placas de hielo
    const seguidor = crearSeguidor(camara, renderer.domElement, lumi.posicion, { distancia: 14, giro: 0.5, inclinacion: 1.5, inclinacionLimites: [1.35, 1.75] }); // casi de lado: la cámara queda bajo el agua
    const dibujo = dibujarLumi();
    const hijas: Personaje[] = [];

    // nutrientes: suben desde el fondo y se agotan cerca de la superficie, donde otros los consumen
    const dibujoChispa = dibujarNutriente();
    const chispas = Array.from({ length: 22 }, () => {
      const p = crearPersonaje(escena, dibujoChispa, { ancho: 0.8, alto: 0.8 });
      p.posicion.set(azar(-X, X), azar(Y_MIN, -3), azar(-Z, Z));
      return { p, vel: azar(0.5, 1.1), fase: azar(0, 6) };
    });
    const renacer = (ch: (typeof chispas)[number]) => ch.p.posicion.set(azar(-X, X), Y_MIN, azar(-Z, Z));

    const vel = new THREE.Vector3(), mov = new THREE.Vector3(), quieto = new THREE.Vector3();
    const estado: EstadoLumi = { luz: 1, nutrientes: 0.3, crecimiento: 0, divisiones: 0, bajoHielo: false };
    let tEstado = 0, fin = false;

    return {
      actualizar(dt, t) {
        const detenido = pausa() || fin;
        const d = detenido ? { x: 0, y: 0 } : entrada.direccion();
        // Lumi casi no nada: se deja llevar, pero puede moverse un poco
        mov.set(0, 0, 0).addScaledVector(seguidor.adelante, d.y).addScaledVector(seguidor.derecha, d.x);
        if (mov.lengthSq() > 1) mov.normalize();
        mov.multiplyScalar(VELOCIDAD);
        mov.y += detenido ? 0 : entrada.vertical() * VELOCIDAD * 0.8;
        vel.lerp(mov, 1 - Math.pow(0.01, dt));
        lumi.posicion.addScaledVector(vel, dt);
        lumi.posicion.x = THREE.MathUtils.clamp(lumi.posicion.x, -X, X);
        lumi.posicion.y = THREE.MathUtils.clamp(lumi.posicion.y + Math.sin(t * 1.3) * 0.004, Y_MIN, Y_MAX);
        lumi.posicion.z = THREE.MathUtils.clamp(lumi.posicion.z, -Z, Z);
        seguidor.seguir(lumi.posicion);
        lumi.animar(t, vel, seguidor.derecha, VELOCIDAD);
        lumi.sprite.material.rotation = Math.sin(t * 0.8) * 0.15;

        // el hielo deriva y rebota en los bordes
        estado.bajoHielo = false;
        for (const pl of placas) {
          if (!detenido) pl.malla.position.x += pl.vel * dt;
          if (Math.abs(pl.malla.position.x) > X + 2) pl.vel *= -1;
          pl.sombra.position.x = pl.malla.position.x;
          if (Math.abs(lumi.posicion.x - pl.malla.position.x) < pl.ancho / 2) estado.bajoHielo = true;
        }

        // luz: se apaga con la profundidad; bajo el hielo casi no llega
        estado.luz = Math.exp(lumi.posicion.y / 5) * (estado.bajoHielo ? SOMBRA_HIELO : 1);

        for (const ch of chispas) {
          if (!detenido) ch.p.posicion.y += ch.vel * dt;
          ch.p.posicion.x += Math.sin(t + ch.fase) * 0.01;
          ch.p.sprite.material.rotation = t * 0.8 + ch.fase;
          ch.p.animar(t, quieto, seguidor.derecha, 1);
          if (ch.p.posicion.y > -2.5) renacer(ch); // cerca de la superficie ya no quedan nutrientes
          if (!detenido && ch.p.posicion.distanceTo(lumi.posicion) < 1.5) {
            estado.nutrientes = Math.min(1, estado.nutrientes + NUTRIENTES_POR_CHISPA);
            renacer(ch);
          }
        }

        if (!detenido) {
          // crecer necesita las dos cosas a la vez: luz y nutrientes
          const ritmo = CRECIMIENTO * Math.min(1, estado.luz * 1.6) * (estado.nutrientes > 0 ? 1 : 0);
          estado.crecimiento += ritmo * dt;
          estado.nutrientes = Math.max(0, estado.nutrientes - CONSUMO * dt * (ritmo > 0 ? 1 : 0));
          if (estado.crecimiento >= 1) {
            estado.crecimiento = 0;
            estado.divisiones++;
            const h = crearPersonaje(escena, dibujo, { ancho: 1.6, alto: 1.6 });
            h.posicion.copy(lumi.posicion);
            hijas.push(h);
            eventos.division(estado.divisiones);
            if (estado.divisiones >= DIVISIONES_META) { fin = true; eventos.terminado(); }
          }
        }
        // las hijas acompañan a Lumi
        hijas.forEach((h, k) => {
          const a = t * 0.6 + (k * Math.PI * 2) / Math.max(1, hijas.length);
          h.posicion.lerp(quieto.set(lumi.posicion.x + Math.cos(a) * 2.4, lumi.posicion.y + Math.sin(a * 1.3) * 0.8, lumi.posicion.z + Math.sin(a) * 1.5), Math.min(1, dt * 2));
          h.animar(t, vel, seguidor.derecha, VELOCIDAD);
          quieto.set(0, 0, 0);
        });

        tEstado -= dt;
        if (tEstado <= 0) { tEstado = 0.15; eventos.estado({ ...estado }); }
      },
      destruir: () => seguidor.destruir(),
    };
  };
}
