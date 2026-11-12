/* Escena de Kiri, el krill: fondo antártico bajo el hielo. Kiri come manchas de fitoplancton
   y esquiva a los pingüinos. Es la escena con la que se prueba la base del juego. */
import * as THREE from "three";
import { crearSeguidor } from "../motor/camara";
import type { Entrada } from "../motor/entrada";
import { azar, sinContorno, toon, type Escena, type Motor } from "../motor/escena";
import { crearPersonaje, type Personaje } from "../motor/personaje";
import { dibujarFito, dibujarKiri, dibujarPinguino } from "../personajes/antartida";
import { sonar } from "../motor/sonido";
import { sprite } from "../personajes/sprites";

const ALTURA_NADO = 4;
const LIMITE = 28;
const VELOCIDAD = 7;

export interface AvisosKiri {
  comio(total: number): void;
  golpe(): void;
}

function crearFondo(escena: THREE.Scene): { rayos: THREE.Mesh[]; nieve: THREE.Points } {
  escena.background = new THREE.Color(0x0e4a73);
  escena.fog = new THREE.Fog(0x0e4a73, 14, 52);
  escena.add(new THREE.HemisphereLight(0xd8f0ff, 0x16324a, 1.1));
  const sol = new THREE.DirectionalLight(0xffffff, 1.6);
  sol.position.set(6, 20, 8);
  escena.add(sol);

  const suelo = new THREE.PlaneGeometry(90, 90, 26, 26);
  suelo.rotateX(-Math.PI / 2);
  const pos = suelo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) pos.setY(i, -Math.random() * 0.9 - Math.max(0, Math.hypot(pos.getX(i), pos.getZ(i)) - 26) * 0.25);
  suelo.computeVertexNormals();
  escena.add(new THREE.Mesh(suelo, toon(0x5f879e)));

  for (let i = 0; i < 28; i++) { // rocas
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), toon(i % 3 ? 0x4f6577 : 0x6b7f8f));
    const a = azar(0, Math.PI * 2), d = azar(6, 30);
    r.position.set(Math.cos(a) * d, azar(-0.2, 0.4), Math.sin(a) * d);
    r.scale.set(azar(0.8, 2.6), azar(0.6, 1.8), azar(0.8, 2.4));
    r.rotation.set(azar(0, 3), azar(0, 3), 0);
    escena.add(r);
  }
  const colores = [0xf39c12, 0xe4572e, 0xffd166, 0xd96aa7];
  for (let i = 0; i < 30; i++) { // esponjas y estrellas de mar
    const g = i % 2 ? new THREE.CylinderGeometry(0.25, 0.35, azar(0.6, 1.6), 6) : new THREE.ConeGeometry(0.35, 0.3, 5);
    const m = new THREE.Mesh(g, toon(colores[i % 4]!));
    const a = azar(0, Math.PI * 2), d = azar(3, 26);
    m.position.set(Math.cos(a) * d, i % 2 ? 0.3 : 0.05, Math.sin(a) * d);
    escena.add(m);
  }
  // techo de hielo con carámbanos y grietas por donde entra la luz
  const hielo = toon(0xe9f6fd), carambano = toon(0xbfe2f5);
  for (let i = 0; i < 70; i++) {
    const x = azar(-40, 40), z = azar(-40, 40);
    if (Math.abs(x - 4) < 3 || Math.abs(z + 6) < 2.5) continue; // grietas
    const b = new THREE.Mesh(new THREE.BoxGeometry(azar(4, 9), azar(1, 2.5), azar(4, 9)), hielo);
    b.position.set(x, 15 + azar(0, 1), z);
    b.rotation.y = azar(0, 3);
    escena.add(b);
    if (i % 2) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(azar(0.3, 0.8), azar(1.5, 4), 5), carambano);
      c.rotation.x = Math.PI;
      c.position.set(x + azar(-2, 2), 13.2, z + azar(-2, 2));
      escena.add(c);
    }
  }
  const rayos: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const mat = sinContorno(new THREE.MeshBasicMaterial({ color: 0xd8f3ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.6, azar(2.5, 4), 16, 7, 1, true), mat);
    const enX = i < 5;
    r.position.set(enX ? 4 + azar(-1.5, 1.5) : azar(-20, 20), 7, enX ? azar(-25, 25) : -6 + azar(-1, 1));
    r.rotation.z = 0.15;
    escena.add(r);
    rayos.push(r);
  }
  // nieve marina: restos que caen lentamente
  const n = 500, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) p.set([azar(-30, 30), azar(0, 14), azar(-30, 30)], i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const nieve = new THREE.Points(geo, sinContorno(new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.7, depthWrite: false })));
  escena.add(nieve);
  return { rayos, nieve };
}

interface Pinguino { p: Personaje; ang: number; estado: "ronda" | "ataque"; dur: number }

/** Crea la escena. "pausa" devuelve true mientras hay un diálogo abierto */
export function escenaKiri(entrada: Entrada, avisos: AvisosKiri, pausa: () => boolean): (motor: Motor) => Escena {
  return (motor) => {
    const { escena, camara, renderer } = motor;
    const { rayos, nieve } = crearFondo(escena);
    const kiri = crearPersonaje(escena, sprite("kiri", dibujarKiri), { ancho: 2.6, alto: 2.6, suelo: 0 });
    kiri.posicion.set(0, ALTURA_NADO, 0);
    const seguidor = crearSeguidor(camara, renderer.domElement, kiri.posicion);

    const dibujoPinguino = sprite("pinguino", dibujarPinguino), dibujoFito = sprite("fito", dibujarFito);
    const pinguinos: Pinguino[] = Array.from({ length: 3 }, (_, i) => ({ p: crearPersonaje(escena, dibujoPinguino, { ancho: 2.4, alto: 2.4, suelo: 0 }), ang: i * 2.1, estado: "ronda", dur: 0 }));
    const colocar = (f: Personaje) => { const a = azar(0, Math.PI * 2), d = azar(3, 22); f.posicion.set(Math.cos(a) * d, azar(2, 9), Math.sin(a) * d); };
    const fitos = Array.from({ length: 14 }, () => { const f = crearPersonaje(escena, dibujoFito, { ancho: 1.4, alto: 1.4, suelo: 0 }); colocar(f); return { f, fase: azar(0, 6) }; });

    const vel = new THREE.Vector3(), mov = new THREE.Vector3(), quieto = new THREE.Vector3(), hacia = new THREE.Vector3();
    let comidos = 0, aturdido = 0;

    return {
      actualizar(dt, t) {
        const detenido = pausa();
        const d = detenido ? { x: 0, y: 0 } : entrada.direccion();
        mov.set(0, 0, 0).addScaledVector(seguidor.adelante, d.y).addScaledVector(seguidor.derecha, d.x);
        if (mov.lengthSq() > 1) mov.normalize();
        mov.multiplyScalar(aturdido > 0 ? 2 : VELOCIDAD);
        vel.lerp(mov, 1 - Math.pow(0.002, dt));
        kiri.posicion.addScaledVector(vel, dt);
        kiri.posicion.y = ALTURA_NADO + Math.sin(t * 2) * 0.3;
        const horizontal = Math.hypot(kiri.posicion.x, kiri.posicion.z);
        if (horizontal > LIMITE) { kiri.posicion.x *= LIMITE / horizontal; kiri.posicion.z *= LIMITE / horizontal; }
        seguidor.seguir(kiri.posicion);
        kiri.animar(t, vel, seguidor.derecha, VELOCIDAD);
        kiri.parpadear(aturdido > 0, t);
        aturdido = Math.max(0, aturdido - dt);

        for (const { f, fase } of fitos) {
          f.posicion.y += Math.sin(t * 1.5 + fase) * 0.004;
          f.sprite.material.rotation = Math.sin(t + fase) * 0.2;
          f.animar(t, quieto, seguidor.derecha, 1);
          if (!detenido && f.posicion.distanceTo(kiri.posicion) < 1.6) { sonar("comer"); comidos++; avisos.comio(comidos); colocar(f); }
        }
        // pingüinos: dan vueltas y de vez en cuando se lanzan sobre Kiri
        for (const u of pinguinos) {
          if (u.estado === "ronda" || detenido) {
            u.ang += dt * 0.5;
            u.p.posicion.set(Math.cos(u.ang) * 14, 9 + Math.sin(t + u.ang) * 0.6, Math.sin(u.ang) * 14);
            if (!detenido && Math.random() < dt / 6) { u.estado = "ataque"; u.dur = 0; }
          } else {
            u.dur += dt;
            hacia.subVectors(kiri.posicion, u.p.posicion).normalize();
            u.p.posicion.addScaledVector(hacia, dt * 9);
            if (aturdido <= 0 && u.p.posicion.distanceTo(kiri.posicion) < 1.5) {
              aturdido = 1.5; comidos = Math.max(0, comidos - 2); sonar("golpe");
              avisos.comio(comidos); avisos.golpe(); u.estado = "ronda";
            }
            if (u.dur > 3) u.estado = "ronda";
          }
          u.p.animar(t, quieto, seguidor.derecha, 1);
          u.p.sprite.material.rotation = Math.sin(t * 6 + u.ang) * 0.1;
        }

        const arr = nieve.geometry.getAttribute("position");
        for (let i = 0; i < arr.count; i++) { let y = arr.getY(i) - dt * 0.4; if (y < 0) y = 14; arr.setY(i, y); }
        arr.needsUpdate = true;
        rayos.forEach((r, i) => { (r.material as THREE.MeshBasicMaterial).opacity = 0.06 + 0.02 * Math.sin(t * 0.8 + i); });
      },
      destruir: () => seguidor.destruir(),
    };
  };
}
