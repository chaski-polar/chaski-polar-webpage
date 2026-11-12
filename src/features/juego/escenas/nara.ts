/* Escena de Nara, la ballena jorobada: migra desde la Península Antártica hasta el norte del Perú
   sobre un mapa (el mismo atlas del explorador). No come durante el viaje: vive de su grasa.
   Las corrientes ayudan o estorban: la Circumpolar empuja al este y la de Humboldt sube al norte
   pegada a la costa de Chile y el Perú. */
import * as THREE from "three";
import { pintarRegion, type Ventana } from "../../../lib/atlas";
import { crearSeguidor } from "../motor/camara";
import { textura } from "../motor/dibujo";
import type { Entrada } from "../motor/entrada";
import { sinContorno, type Escena, type Motor } from "../motor/escena";
import { crearPersonaje } from "../motor/personaje";
import { dibujarFlecha, dibujarNara } from "../personajes/antartida";
import { dibujarLetrero } from "../personajes/costa";
import { sonar } from "../motor/sonido";

const V: Ventana = { lonO: -105, latN: 0, lonE: -55, latS: -70 };
const K = 2; // unidades por grado
const aX = (lon: number) => (lon + 80) * K;
const aZ = (lat: number) => -(lat + 35) * K;
const aLon = (x: number) => x / K - 80;
const aLat = (z: number) => -z / K - 35;

const INICIO = { lat: -63.6, lon: -66 };
const META = { lat: -5.2, lon: -82 };
const RADIO_META = 4;
const VELOCIDAD = 6;
const GASTO = 0.011, GASTO_ESFUERZO = 0.012; // grasa por segundo
const PUNTOS = [
  { id: "drake", lat: -56 },
  { id: "chile", lat: -40 },
  { id: "peru", lat: -18 },
] as const;
export type PuntoNara = (typeof PUNTOS)[number]["id"];

export interface EstadoNara { grasa: number; lat: number; lon: number; corriente: "circumpolar" | "humboldt" | null; avance: number }
export interface EventosNara {
  estado(e: EstadoNara): void;
  punto(id: PuntoNara): void;
  agotada(): void;
  llego(): void;
}

export function escenaNara(entrada: Entrada, eventos: EventosNara, pausa: () => boolean): (motor: Motor) => Escena {
  return (motor) => {
    const { escena, camara, renderer } = motor;
    escena.background = new THREE.Color(0x0f3352);
    escena.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.3));

    // mapa: se pinta con el atlas del explorador; la capa de tierra sirve también para no cruzar la costa
    const W = 1000, H = 1400;
    const materialMapa = sinContorno(new THREE.MeshBasicMaterial({ color: 0x0f3352 }));
    const mapa = new THREE.Mesh(new THREE.PlaneGeometry((V.lonE - V.lonO) * K, (V.latN - V.latS) * K).rotateX(-Math.PI / 2), materialMapa);
    mapa.position.set(aX((V.lonO + V.lonE) / 2), 0, aZ((V.latN + V.latS) / 2));
    escena.add(mapa);
    let tierra: Uint8ClampedArray | null = null;
    let vivo = true;
    void pintarRegion({ paleta: "noche", ventana: V, w: W, h: H }).then(({ mar, tierra: capaTierra }) => {
      if (!vivo) return;
      const cv = Object.assign(document.createElement("canvas"), { width: W, height: H }), g = cv.getContext("2d");
      if (!g) return;
      g.drawImage(mar, 0, 0); g.drawImage(capaTierra, 0, 0);
      materialMapa.map = textura(cv); materialMapa.color.set(0xffffff); materialMapa.needsUpdate = true;
      tierra = capaTierra.getContext("2d")?.getImageData(0, 0, W, H).data ?? null;
    });
    const esTierra = (lat: number, lon: number): boolean => {
      if (!tierra) return false;
      const px = Math.floor(((lon - V.lonO) / (V.lonE - V.lonO)) * W), py = Math.floor(((V.latN - lat) / (V.latN - V.latS)) * H);
      if (px < 0 || py < 0 || px >= W || py >= H) return true; // fuera del mapa
      return (tierra[(py * W + px) * 4 + 3] ?? 0) > 100;
    };

    // corrientes: Circumpolar (al este, entre 62° y 50° S) y Humboldt (al norte, cerca de la costa de Chile y el Perú)
    const tierraAlEste = (lat: number, lon: number) => [1.5, 3, 4.5, 6].some((d) => esTierra(lat, lon + d));
    const corriente = (lat: number, lon: number): { v: THREE.Vector2; nombre: EstadoNara["corriente"] } => {
      if (lat > -62 && lat < -50) return { v: new THREE.Vector2(1.8, 0), nombre: "circumpolar" };
      if (lat > -45 && lat < -4 && tierraAlEste(lat, lon)) return { v: new THREE.Vector2(0, 2.8), nombre: "humboldt" };
      return { v: new THREE.Vector2(0, 0), nombre: null };
    };
    const flechas: THREE.Mesh[] = [];
    const texFlecha = textura(dibujarFlecha());
    const ponerFlechas = () => {
      for (let lat = -60; lat <= -6; lat += 4) for (let lon = -100; lon <= -60; lon += 4) {
        if (esTierra(lat, lon)) continue;
        const { v } = corriente(lat, lon);
        if (!v.lengthSq()) continue;
        const f = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2), sinContorno(new THREE.MeshBasicMaterial({ map: texFlecha, transparent: true, opacity: 0.5, depthWrite: false })));
        f.position.set(aX(lon), 0.05, aZ(lat));
        f.rotation.y = Math.atan2(-v.x, v.y); // la flecha del dibujo apunta al norte (−z)
        escena.add(f);
        flechas.push(f);
      }
    };

    // letreros
    for (const [texto, lat, lon] of [["Antártida", -67, -72], ["Chile", -32, -66], ["Perú", -10, -74], ["Océano Pacífico", -30, -95]] as const) {
      const s = new THREE.Sprite(sinContorno(new THREE.SpriteMaterial({ map: textura(dibujarLetrero(texto)), transparent: true, depthWrite: false })));
      s.scale.set(10, 2.5, 1);
      s.position.set(aX(lon), 2.5, aZ(lat));
      escena.add(s);
    }
    // meta: un anillo en el norte del Perú
    const meta = new THREE.Mesh(new THREE.RingGeometry(RADIO_META * K - 0.6, RADIO_META * K, 48).rotateX(-Math.PI / 2), sinContorno(new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.8, depthWrite: false })));
    meta.position.set(aX(META.lon), 0.1, aZ(META.lat));
    escena.add(meta);

    const nara = crearPersonaje(escena, dibujarNara(), { ancho: 5, alto: 4.7, suelo: 0 });
    nara.posicion.set(aX(INICIO.lon), 1.6, aZ(INICIO.lat));
    const seguidor = crearSeguidor(camara, renderer.domElement, nara.posicion, { distancia: 26, giro: 0.6 });

    const vel = new THREE.Vector3(), mov = new THREE.Vector3(), siguiente = new THREE.Vector3();
    let grasa = 1, descanso = 0, tEstado = 0, fin = false, flechasPuestas = false, puntoSig = 0;
    const distanciaTotal = Math.hypot(aX(META.lon) - aX(INICIO.lon), aZ(META.lat) - aZ(INICIO.lat));

    return {
      actualizar(dt, t) {
        if (tierra && !flechasPuestas) {
          flechasPuestas = true;
          ponerFlechas();
          // si el punto de partida quedó sobre el hielo del mapa, Nara empieza en el agua más cercana al norte
          for (let k = 0; k < 60 && esTierra(aLat(nara.posicion.z), aLon(nara.posicion.x)); k++) nara.posicion.z -= 0.5;
        }
        const detenido = pausa() || fin;
        const lat = aLat(nara.posicion.z), lon = aLon(nara.posicion.x);
        const cor = corriente(lat, lon);
        const d = detenido || descanso > 0 ? { x: 0, y: 0 } : entrada.direccion();
        mov.set(0, 0, 0).addScaledVector(seguidor.adelante, d.y).addScaledVector(seguidor.derecha, d.x);
        const esfuerzo = Math.min(1, mov.length());
        if (mov.lengthSq() > 1) mov.normalize();
        mov.multiplyScalar(VELOCIDAD);
        if (!detenido) { mov.x += cor.v.x; mov.z -= cor.v.y; } // la corriente arrastra (norte = −z)
        vel.lerp(mov, 1 - Math.pow(0.02, dt));
        if (!detenido) {
          // avanza por partes para deslizarse por la costa en lugar de atravesarla
          siguiente.copy(nara.posicion).addScaledVector(vel, dt);
          if (!esTierra(aLat(nara.posicion.z), aLon(siguiente.x))) nara.posicion.x = siguiente.x;
          if (!esTierra(aLat(siguiente.z), aLon(nara.posicion.x))) nara.posicion.z = siguiente.z;
        }
        nara.posicion.y = 1.6 + Math.sin(t * 1.2) * 0.25;
        seguidor.seguir(nara.posicion);
        nara.animar(t, vel, seguidor.derecha, VELOCIDAD);

        for (const f of flechas) (f.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.25 * Math.sin(t * 3 - f.position.z * 0.2);
        meta.scale.setScalar(1 + Math.sin(t * 3) * 0.05);

        if (!detenido) {
          descanso = Math.max(0, descanso - dt);
          grasa = Math.max(0, grasa - (GASTO + GASTO_ESFUERZO * esfuerzo) * dt);
          if (grasa <= 0 && descanso <= 0) { descanso = 4; grasa = 0.35; sonar("golpe"); eventos.agotada(); }
          const punto = PUNTOS[puntoSig];
          if (punto && lat > punto.lat) { puntoSig++; eventos.punto(punto.id); }
          if (Math.hypot(lat - META.lat, lon - META.lon) < RADIO_META) { fin = true; sonar("exito"); eventos.llego(); }
        }

        tEstado -= dt;
        if (tEstado <= 0) {
          tEstado = 0.2;
          const falta = Math.hypot(aX(META.lon) - nara.posicion.x, aZ(META.lat) - nara.posicion.z);
          eventos.estado({ grasa, lat, lon, corriente: cor.nombre, avance: Math.max(0, Math.min(1, 1 - falta / distanciaTotal)) });
        }
      },
      destruir() { vivo = false; seguidor.destruir(); },
    };
  };
}
