/* Escena de Lumi, el fitoplancton: el agua antártica bajo el hielo marino que se abre en primavera.
   Se ve de lado, como un juego en 2D: A/D a los lados, W/S (o Q/E) arriba y abajo.
   Lumi necesita luz (arriba, fuera de la sombra del hielo) y nutrientes (suben desde abajo) a la vez.
   Como toda diatomea, se hunde poco a poco si no sube. Al llenarse se divide; con cada división
   avanza la primavera y el hielo se derrite un poco. Meta: DIVISIONES_META divisiones. */
import * as THREE from "three";
import { crearSeguidor } from "../motor/camara";
import type { Entrada } from "../motor/entrada";
import { azar, sinContorno, toon, type Escena, type Motor } from "../motor/escena";
import { crearPersonaje, type Personaje } from "../motor/personaje";
import { sonar } from "../motor/sonido";
import { dibujarFito, dibujarLumi, dibujarNutriente } from "../personajes/antartida";
import { sprite } from "../personajes/sprites";

export const DIVISIONES_META = 3;
const X = 14, Y_MIN = -13, Y_MAX = -0.8, Z = 5;
const VELOCIDAD = 5;
const HUNDIMIENTO = 0.55; // las diatomeas pesan: sin nadar, Lumi baja lentamente
const CRECIMIENTO = 0.16; // por segundo con luz y nutrientes plenos
const CONSUMO = 0.07; // nutrientes que gasta al crecer, por segundo
const NUTRIENTES_POR_CHISPA = 0.22;
const SOMBRA_HIELO = 0.12; // la luz que pasa bajo el hielo
const DESHIELO = 0.8; // cada división, las placas de hielo quedan a este ancho

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

interface Placa { grupo: THREE.Group; sombra: THREE.Mesh; vel: number; ancho: number }

/** Halo suave para el brillo de Lumi */
function texturaHalo(): THREE.CanvasTexture {
  const c = Object.assign(document.createElement("canvas"), { width: 128, height: 128 });
  const g = c.getContext("2d");
  if (g) {
    const r = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    r.addColorStop(0, "rgba(255,247,170,0.9)"); r.addColorStop(0.5, "rgba(190,255,170,0.35)"); r.addColorStop(1, "rgba(190,255,170,0)");
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

export function escenaLumi(entrada: Entrada, eventos: EventosLumi, pausa: () => boolean): (motor: Motor) => Escena {
  return (motor) => {
    const { escena, camara, renderer } = motor;
    escena.background = new THREE.Color(0x1b5f86);
    escena.fog = new THREE.Fog(0x1b5f86, 18, 50);
    escena.add(new THREE.HemisphereLight(0xe6f6ff, 0x0d2c44, 1.2));
    const sol = new THREE.DirectionalLight(0xffffff, 1.3);
    sol.position.set(0, 20, 5);
    escena.add(sol);

    // agua que se oscurece con la profundidad (fondo lejano con degradado)
    const c = Object.assign(document.createElement("canvas"), { width: 4, height: 256 });
    const g = c.getContext("2d");
    if (g) { const d = g.createLinearGradient(0, 0, 0, 256); d.addColorStop(0, "#7cc9e6"); d.addColorStop(0.4, "#2a7fa8"); d.addColorStop(1, "#06223a"); g.fillStyle = d; g.fillRect(0, 0, 4, 256); }
    const fondo = new THREE.Mesh(new THREE.PlaneGeometry(120, 22), sinContorno(new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), fog: false })));
    fondo.position.set(0, (Y_MIN + 1) / 2, -20);
    escena.add(fondo);

    // hielo marino: placas con carámbanos que derivan en la superficie y dan sombra debajo
    const hielo = toon(0xeef8fc), carambano = toon(0xbfe2f5);
    const matSombra = sinContorno(new THREE.MeshBasicMaterial({ color: 0x041526, transparent: true, opacity: 0.3, depthWrite: false }));
    const placas: Placa[] = [-11, 1, 11].map((x, i) => {
      const ancho = azar(5.5, 7.5);
      const grupo = new THREE.Group();
      grupo.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, Z * 2 + 4), hielo));
      for (let k = 0; k < 5; k++) {
        const cono = new THREE.Mesh(new THREE.ConeGeometry(azar(0.1, 0.18), azar(0.6, 1.4), 5), carambano);
        cono.rotation.x = Math.PI;
        cono.position.set(azar(-0.45, 0.45), -0.9, azar(-1, 1.5));
        grupo.add(cono);
      }
      grupo.scale.x = ancho;
      grupo.position.set(x, 0.2, 0);
      const sombra = new THREE.Mesh(new THREE.BoxGeometry(1, -Y_MIN, Z * 2 + 3.8), matSombra);
      sombra.scale.x = ancho;
      sombra.position.set(x, Y_MIN / 2, 0);
      escena.add(grupo, sombra);
      return { grupo, sombra, vel: (i % 2 ? -1 : 1) * azar(0.6, 1.1), ancho };
    });
    const superficie = new THREE.Mesh(new THREE.PlaneGeometry(120, 30).rotateX(Math.PI / 2), sinContorno(new THREE.MeshBasicMaterial({ color: 0xd8f3ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })));
    escena.add(superficie);

    // rayos de luz: se encienden donde no hay hielo encima
    const rayos = Array.from({ length: 12 }, (_, i) => {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 2.2, 13, 7, 1, true),
        sinContorno(new THREE.MeshBasicMaterial({ color: 0xf2ffd8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
      r.position.set(-X + (i + 0.5) * ((2 * X) / 12), -6.3, azar(-2, 1));
      r.rotation.z = 0.08;
      escena.add(r);
      return r;
    });

    // fitoplancton de fondo: otras células que flotan lejos (decoración)
    const dibujoFito = sprite("fito", dibujarFito);
    const fondoFito = Array.from({ length: 16 }, () => {
      const p = crearPersonaje(escena, dibujoFito, { ancho: 0.9, alto: 0.9 });
      p.posicion.set(azar(-X - 6, X + 6), azar(-9, -1), azar(-12, -6));
      (p.sprite.material as THREE.SpriteMaterial).opacity = 0.55;
      return { p, fase: azar(0, 6) };
    });
    // nieve marina
    const n = 400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([azar(-X - 4, X + 4), azar(Y_MIN, 0), azar(-8, 3)], i * 3);
    const geoNieve = new THREE.BufferGeometry();
    geoNieve.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const nieve = new THREE.Points(geoNieve, sinContorno(new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.6, depthWrite: false })));
    escena.add(nieve);

    const lumi = crearPersonaje(escena, sprite("lumi", dibujarLumi), { ancho: 2, alto: 2 });
    lumi.posicion.set(-4.5, -6, 0); // en un claro entre las placas de hielo
    const halo = new THREE.Sprite(sinContorno(new THREE.SpriteMaterial({ map: texturaHalo(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    escena.add(halo);
    const seguidor = crearSeguidor(camara, renderer.domElement, lumi.posicion, { distancia: 14, giro: 0.5, inclinacion: 1.5, inclinacionLimites: [1.35, 1.75], inclinacionVertical: 0 }); // casi de lado: la cámara queda bajo el agua
    const dibujo = sprite("lumi", dibujarLumi);
    const hijas: Personaje[] = [];

    // nutrientes: suben desde el fondo (en el mismo plano que Lumi) y se agotan cerca de la superficie
    const dibujoChispa = sprite("nutriente", dibujarNutriente);
    const chispas = Array.from({ length: 20 }, () => {
      const p = crearPersonaje(escena, dibujoChispa, { ancho: 0.8, alto: 0.8 });
      p.posicion.set(azar(-X, X), azar(Y_MIN, -3), azar(-0.3, 0.3));
      return { p, vel: azar(0.5, 1.1), fase: azar(0, 6) };
    });
    const renacer = (ch: (typeof chispas)[number]) => ch.p.posicion.set(azar(-X, X), Y_MIN, azar(-0.3, 0.3));

    const vel = new THREE.Vector3(), mov = new THREE.Vector3(), quieto = new THREE.Vector3(), objetivo = new THREE.Vector3();
    const estado: EstadoLumi = { luz: 1, nutrientes: 0.3, crecimiento: 0, divisiones: 0, bajoHielo: false };
    let tEstado = 0, fin = false, estallido = 0;
    const bajoHieloEn = (x: number) => placas.some((pl) => Math.abs(x - pl.grupo.position.x) < pl.ancho / 2);

    return {
      actualizar(dt, t) {
        const detenido = pausa() || fin;
        const d = detenido ? { x: 0, y: 0 } : entrada.direccion();
        // A/D a los lados; W/S (o Q/E) arriba y abajo; sin nadar, Lumi se hunde
        const subir = THREE.MathUtils.clamp(d.y + (detenido ? 0 : entrada.vertical()), -1, 1);
        mov.set(0, 0, 0).addScaledVector(seguidor.derecha, d.x);
        mov.y = subir;
        if (mov.lengthSq() > 1) mov.normalize();
        mov.multiplyScalar(VELOCIDAD);
        if (!detenido && subir === 0) mov.y -= HUNDIMIENTO;
        vel.lerp(mov, 1 - Math.pow(0.01, dt));
        lumi.posicion.addScaledVector(vel, dt);
        lumi.posicion.x = THREE.MathUtils.clamp(lumi.posicion.x, -X, X);
        lumi.posicion.y = THREE.MathUtils.clamp(lumi.posicion.y + Math.sin(t * 1.3) * 0.004, Y_MIN, Y_MAX);
        lumi.posicion.z += (0 - lumi.posicion.z) * Math.min(1, dt * 2); // se mantiene en el plano de la escena
        seguidor.seguir(lumi.posicion);
        // crece a la vista antes de dividirse; al dividirse da un pequeño salto
        estallido = Math.max(0, estallido - dt * 3);
        lumi.escala = 1 + estado.crecimiento * 0.4 + Math.sin(estallido * Math.PI) * 0.25;
        lumi.animar(t, vel, seguidor.derecha, VELOCIDAD);
        lumi.sprite.material.rotation = Math.sin(t * 0.8) * 0.15;

        // el hielo deriva y rebota en los bordes; se va derritiendo con cada división
        for (const pl of placas) {
          if (!detenido) pl.grupo.position.x += pl.vel * dt;
          if (Math.abs(pl.grupo.position.x) > X + 2) pl.vel *= -1;
          pl.grupo.scale.x += (pl.ancho - pl.grupo.scale.x) * Math.min(1, dt * 1.5);
          pl.sombra.scale.x = pl.grupo.scale.x;
          pl.sombra.position.x = pl.grupo.position.x;
        }
        estado.bajoHielo = bajoHieloEn(lumi.posicion.x);
        for (const r of rayos) {
          const m = r.material as THREE.MeshBasicMaterial;
          m.opacity += ((bajoHieloEn(r.position.x) ? 0 : 0.09 + 0.03 * Math.sin(t + r.position.x)) - m.opacity) * Math.min(1, dt * 3);
        }

        // luz: se apaga con la profundidad; bajo el hielo casi no llega
        estado.luz = Math.exp(lumi.posicion.y / 5) * (estado.bajoHielo ? SOMBRA_HIELO : 1);
        halo.position.copy(lumi.posicion).setZ(lumi.posicion.z - 0.1);
        halo.scale.setScalar(2.6 * lumi.escala * (0.6 + estado.luz));
        (halo.material as THREE.SpriteMaterial).opacity = Math.min(1, estado.luz * 1.3);

        for (const ch of chispas) {
          if (!detenido) ch.p.posicion.y += ch.vel * dt;
          ch.p.posicion.x += Math.sin(t + ch.fase) * 0.01;
          ch.p.sprite.material.rotation = t * 0.8 + ch.fase;
          ch.p.animar(t, quieto, seguidor.derecha, 1);
          if (ch.p.posicion.y > -2.5) renacer(ch); // cerca de la superficie ya no quedan nutrientes
          if (!detenido && ch.p.posicion.distanceTo(lumi.posicion) < 1.3 * lumi.escala) {
            estado.nutrientes = Math.min(1, estado.nutrientes + NUTRIENTES_POR_CHISPA);
            sonar("comer");
            renacer(ch);
          }
        }
        for (const f of fondoFito) { f.p.posicion.y += Math.sin(t * 0.6 + f.fase) * 0.003; f.p.sprite.material.rotation = Math.sin(t * 0.4 + f.fase) * 0.3; }
        nieve.position.y = -((t * 0.2) % 2);

        if (!detenido) {
          // crecer necesita las dos cosas a la vez: luz y nutrientes
          const ritmo = CRECIMIENTO * Math.min(1, estado.luz * 1.6) * (estado.nutrientes > 0 ? 1 : 0);
          estado.crecimiento += ritmo * dt;
          estado.nutrientes = Math.max(0, estado.nutrientes - CONSUMO * dt * (ritmo > 0 ? 1 : 0));
          if (estado.crecimiento >= 1) {
            estado.crecimiento = 0;
            estado.divisiones++;
            estallido = 1;
            const h = crearPersonaje(escena, dibujo, { ancho: 1.6, alto: 1.6 });
            h.posicion.copy(lumi.posicion);
            hijas.push(h);
            for (const pl of placas) pl.ancho *= DESHIELO; // avanza la primavera
            sonar("division");
            eventos.division(estado.divisiones);
            if (estado.divisiones >= DIVISIONES_META) { fin = true; eventos.terminado(); }
          }
        }
        // las hijas acompañan a Lumi en su mismo plano
        hijas.forEach((h, k) => {
          const a = t * 0.6 + (k * Math.PI * 2) / Math.max(1, hijas.length);
          h.posicion.lerp(objetivo.set(lumi.posicion.x + Math.cos(a) * 2.4, lumi.posicion.y + Math.sin(a) * 1.4, -0.4), Math.min(1, dt * 2));
          h.animar(t, vel, seguidor.derecha, VELOCIDAD);
        });

        tEstado -= dt;
        if (tEstado <= 0) { tEstado = 0.15; eventos.estado({ ...estado }); }
      },
      destruir: () => seguidor.destruir(),
    };
  };
}
