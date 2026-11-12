/* Escena del cardumen: Anchi guía a su cardumen durante un año real frente a la costa peruana.
   La costa va de norte (Paita) a sur (Ilo) a lo largo del eje z; tierra a la derecha (x positivo).
   Cada mes dura SEGUNDOS_POR_MES y trae la comida medida por satélite en cada zona. */
import * as THREE from "three";
import { create } from "zustand";
import * as L from "../logica/cardumen";
import { crearSeguidor } from "../motor/camara";
import { textura } from "../motor/dibujo";
import type { Entrada } from "../motor/entrada";
import { azar, sinContorno, toon, type Escena, type Motor } from "../motor/escena";
import { NOMBRE_ZONA, ZONAS_PERU, type Mar, type ZonaMar } from "../motor/mar";
import { crearPersonaje, type Personaje } from "../motor/personaje";
import { dibujarFito } from "../personajes/antartida";
import { dibujarAnchi, dibujarAnchoveta, dibujarGuanay, dibujarLetrero, dibujarLobo } from "../personajes/costa";

const LARGO_ZONA = 30;
const X_MIN = -16, X_MAX = 9;
const Y_MIN = -12.5, Y_MAX = -0.6;
const Z_MAX = 0, Z_MIN = -LARGO_ZONA * ZONAS_PERU.length;
const VELOCIDAD = 7, VELOCIDAD_VERTICAL = 4;
const ZONA_INICIAL: ZonaMar = "chimbote";
const PECES_POR_DIBUJO = 250, DIBUJOS_MAX = 40;
const AGUA_FRIA = new THREE.Color(0x2a86ad), AGUA_CALIDA = new THREE.Color(0x5f8a63);

export const zonaEn = (z: number): ZonaMar => ZONAS_PERU[Math.min(ZONAS_PERU.length - 1, Math.max(0, Math.floor(-z / LARGO_ZONA)))]!;
const centroZona = (zona: ZonaMar) => -(ZONAS_PERU.indexOf(zona as (typeof ZONAS_PERU)[number]) + 0.5) * LARGO_ZONA;

/** Lo que muestra la interfaz (se actualiza unas pocas veces por segundo) */
export interface Hud {
  anio: number;
  mes: number;
  zona: ZonaMar;
  peces: number;
  inicial: number;
  energia: number;
  alimento: number;
  origen: L.Mes["origen"];
  anomaliaTemp: number | null;
  nino12: number | null;
  temporada: L.Temporada;
  compacto: boolean;
  bajoOxigeno: boolean;
  avanceMes: number;
}
export const useHud = create<{ hud: Hud | null; poner(h: Hud | null): void }>((set) => ({ hud: null, poner: (hud) => set({ hud }) }));

export interface EventosCardumen {
  aviso(texto: string): void;
  /** algo que merece un diálogo la primera vez que ocurre */
  hito(id: "nino" | "veda" | "oxigeno_alto" | "red" | "ave", mes: L.Mes): void;
  fin(informe: L.Informe, historia: L.Mes[]): void;
}

export interface OpcionesCardumen {
  anio: number;
  peces: number;
  pausa: () => boolean;
  compacto: () => boolean;
  /** acelera el calendario para probar (1 = normal) */
  rapidez?: number;
}

interface Parche { p: Personaje; zona: ZonaMar; activo: boolean; espera: number; fase: number }
interface Seguidor { p: Personaje; ox: number; oy: number; oz: number; fase: number }

function crearMundo(escena: THREE.Scene): { capaOxigeno: THREE.Mesh; superficie: THREE.Mesh } {
  escena.background = AGUA_FRIA.clone();
  escena.fog = new THREE.Fog(AGUA_FRIA.getHex(), 12, 46);
  escena.add(new THREE.HemisphereLight(0xe6f6ff, 0x1d3a4a, 1.15));
  const sol = new THREE.DirectionalLight(0xffffff, 1.4);
  sol.position.set(-6, 20, 6);
  escena.add(sol);

  const largo = -Z_MIN + 60;
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(80, largo, 20, 60).rotateX(-Math.PI / 2), toon(0xc2ad86));
  const pf = fondo.geometry.getAttribute("position");
  for (let i = 0; i < pf.count; i++) pf.setY(i, Math.random() * 0.5 + Math.max(0, pf.getX(i) - 6) * 0.9); // sube hacia la costa
  fondo.geometry.computeVertexNormals();
  fondo.position.set(0, -14, Z_MIN / 2);
  escena.add(fondo);

  const tierra = new THREE.Mesh(new THREE.BoxGeometry(20, 6, largo), toon(0xd9b98a)); // costa desértica
  tierra.position.set(22, 2, Z_MIN / 2);
  escena.add(tierra);
  for (let i = 0; i < 40; i++) { // rocas
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), toon(0x6d6a63));
    r.position.set(azar(-18, 8), -13.6, azar(Z_MIN, Z_MAX));
    r.scale.set(azar(0.8, 2.5), azar(0.5, 1.5), azar(0.8, 2.5));
    escena.add(r);
  }
  const superficie = new THREE.Mesh(new THREE.PlaneGeometry(80, largo).rotateX(Math.PI / 2),
    sinContorno(new THREE.MeshBasicMaterial({ color: 0xbfe9f5, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })));
  superficie.position.set(0, 0, Z_MIN / 2);
  escena.add(superficie);

  // capa sin oxígeno: agua rojiza y oscura bajo el límite
  const capaOxigeno = new THREE.Mesh(new THREE.BoxGeometry(80, 1, largo),
    sinContorno(new THREE.MeshBasicMaterial({ color: 0x4a1f33, transparent: true, opacity: 0.38, depthWrite: false })));
  capaOxigeno.position.set(0, -9, Z_MIN / 2);
  escena.add(capaOxigeno);

  // letreros con el nombre de cada zona, en su límite norte
  ZONAS_PERU.forEach((zona, i) => {
    const s = new THREE.Sprite(sinContorno(new THREE.SpriteMaterial({ map: textura(dibujarLetrero(NOMBRE_ZONA[zona])), transparent: true, depthWrite: false })));
    s.scale.set(8, 2, 1);
    s.position.set(-4, -1.6, -i * LARGO_ZONA - 2);
    escena.add(s);
  });
  return { capaOxigeno, superficie };
}

function crearBolichera(): THREE.Group {
  const barco = new THREE.Group();
  const casco = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 1.8), toon(0x1f4e8c)); casco.position.y = 0.2;
  const franja = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.25, 1.85), toon(0xb3261e)); franja.position.y = 0.7;
  const cabina = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), toon(0xf2f0ea)); cabina.position.set(1, 1.4, 0);
  barco.add(casco, franja, cabina);
  return barco;
}

export function escenaCardumen(mar: Mar, entrada: Entrada, eventos: EventosCardumen, o: OpcionesCardumen): (motor: Motor) => Escena {
  return (motor) => {
    const { escena, camara, renderer } = motor;
    const { capaOxigeno } = crearMundo(escena);
    const c = L.crearCardumen(o.anio, o.peces);
    const inicial = o.peces;

    const anchi = crearPersonaje(escena, dibujarAnchi(), { ancho: 2.2, alto: 2.2 });
    anchi.posicion.set(-3, -3, centroZona(ZONA_INICIAL));
    const seguidor = crearSeguidor(camara, renderer.domElement, anchi.posicion, { distancia: 15, giro: 0.9 });

    // el cardumen: un dibujo por cada PECES_POR_DIBUJO peces
    const dibujoPez = dibujarAnchoveta();
    const peces: Seguidor[] = Array.from({ length: DIBUJOS_MAX }, () => {
      const p = crearPersonaje(escena, dibujoPez, { ancho: 0.9, alto: 0.9 });
      p.posicion.copy(anchi.posicion);
      return { p, ox: azar(-1, 1), oy: azar(-1, 1), oz: azar(-1, 1), fase: azar(0, 6) };
    });

    // comida: manchas de fitoplancton en todas las zonas, según la clorofila de cada una ese mes
    const dibujoFito = dibujarFito();
    const parches: Parche[] = [];
    const colocar = (pa: Parche, yOx: number) => {
      const zi = ZONAS_PERU.indexOf(pa.zona as (typeof ZONAS_PERU)[number]);
      pa.p.posicion.set(azar(X_MIN + 1, X_MAX - 1), azar(Math.max(Y_MIN + 1, yOx + 0.8), Y_MAX - 0.3), azar(-(zi + 1) * LARGO_ZONA + 2, -zi * LARGO_ZONA - 2));
    };
    let condicionesMes = new Map<ZonaMar, L.Mes>();
    const prepararMes = () => {
      condicionesMes = new Map(ZONAS_PERU.map((z) => [z, L.condiciones(mar, c.anio, c.mes, z)]));
      for (const pa of parches) { pa.p.sprite.visible = false; pa.activo = false; }
      const yOx = L.limiteOxigeno(condicionesMes.get(ZONA_INICIAL)!.nino12);
      let k = 0;
      for (const zona of ZONAS_PERU) {
        const n = L.parchesDeComida(condicionesMes.get(zona)!.alimento);
        for (let j = 0; j < n; j++, k++) {
          let pa = parches[k];
          if (!pa) { pa = { p: crearPersonaje(escena, dibujoFito, { ancho: 1.3, alto: 1.3 }), zona, activo: true, espera: 0, fase: azar(0, 6) }; parches.push(pa); }
          pa.zona = zona; pa.activo = true; pa.espera = 0; pa.p.sprite.visible = true;
          colocar(pa, yOx);
        }
      }
      const m = condicionesMes.get(zonaEn(anchi.posicion.z))!;
      if ((m.nino12 ?? 0) >= 1) eventos.hito("nino", m);
      if (m.temporada === "veda") eventos.hito("veda", m);
      if (L.limiteOxigeno(m.nino12) > -5) eventos.hito("oxigeno_alto", m);
    };
    prepararMes();

    // depredadores y flota
    const guanay = crearPersonaje(escena, dibujarGuanay(), { ancho: 2, alto: 2 });
    guanay.sprite.visible = false;
    const sombraAve = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24).rotateX(Math.PI / 2), sinContorno(new THREE.MeshBasicMaterial({ color: 0x0d1b26, transparent: true, opacity: 0.35, depthWrite: false })));
    sombraAve.visible = false;
    escena.add(sombraAve);
    const ave = { estado: "espera" as "espera" | "aviso" | "picada", t: azar(5, 9), objetivo: new THREE.Vector3() };

    const lobo = crearPersonaje(escena, dibujarLobo(), { ancho: 3.6, alto: 3.6 });
    lobo.posicion.set(-10, -6, centroZona(ZONA_INICIAL) - 10);
    const loboEstado = { pausa: 0, rumbo: new THREE.Vector3(1, 0, 0), vel: new THREE.Vector3() };

    const barco = crearBolichera();
    barco.visible = false;
    escena.add(barco);
    const red = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 1, 32, 1, true), sinContorno(new THREE.MeshBasicMaterial({ color: 0x23402f, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, wireframe: true })));
    red.visible = false;
    escena.add(red);
    const flota = { estado: "espera" as "espera" | "calando", t: azar(6, 12), prof: 0, centro: new THREE.Vector3() };

    const vel = new THREE.Vector3(), mov = new THREE.Vector3(), quieto = new THREE.Vector3(), tmp = new THREE.Vector3();
    const colorAgua = new THREE.Color();
    let yOxActual = -9, hudT = 0, finAvisado = false;

    const publicarHud = (m: L.Mes, bajoOx: boolean) => useHud.getState().poner({
      anio: c.anio, mes: c.mes, zona: m.zona, peces: Math.round(c.peces), inicial, energia: c.energia, alimento: m.alimento, origen: m.origen,
      anomaliaTemp: (() => { const i = mar.indice(c.anio, c.mes + 1); return i >= 0 ? mar.estado(m.zona, i).anomaliaTemp : null; })(),
      nino12: m.nino12, temporada: m.temporada, compacto: c.compacto, bajoOxigeno: bajoOx, avanceMes: c.tMes / L.SEGUNDOS_POR_MES,
    });

    return {
      actualizar(dt, t) {
        const detenido = o.pausa() || c.terminado;
        const zona = zonaEn(anchi.posicion.z);
        const m = condicionesMes.get(zona)!;
        c.compacto = o.compacto();

        // movimiento de Anchi
        const d = detenido ? { x: 0, y: 0 } : entrada.direccion();
        mov.set(0, 0, 0).addScaledVector(seguidor.adelante, d.y).addScaledVector(seguidor.derecha, d.x);
        if (mov.lengthSq() > 1) mov.normalize();
        mov.multiplyScalar(VELOCIDAD * (c.compacto ? 0.85 : 1));
        mov.y = detenido ? 0 : entrada.vertical() * VELOCIDAD_VERTICAL;
        vel.lerp(mov, 1 - Math.pow(0.003, dt));
        anchi.posicion.addScaledVector(vel, dt);
        anchi.posicion.x = THREE.MathUtils.clamp(anchi.posicion.x, X_MIN, X_MAX);
        anchi.posicion.y = THREE.MathUtils.clamp(anchi.posicion.y, Y_MIN, Y_MAX);
        anchi.posicion.z = THREE.MathUtils.clamp(anchi.posicion.z, Z_MIN + 0.5, Z_MAX - 0.5);
        seguidor.seguir(anchi.posicion);
        tmp.set(vel.x, 0, vel.z);
        anchi.animar(t, tmp, seguidor.derecha, VELOCIDAD);

        // la zona sin oxígeno sube o baja poco a poco según El Niño
        const yOx = L.limiteOxigeno(m.nino12);
        yOxActual += (yOx - yOxActual) * Math.min(1, dt * 0.8);
        capaOxigeno.scale.y = Math.max(0.1, yOxActual + 14);
        capaOxigeno.position.y = (yOxActual - 14) / 2;
        const bajoOxigeno = anchi.posicion.y < yOxActual;

        // color del agua según la temperatura de la zona
        const i = mar.indice(c.anio, c.mes + 1);
        const anom = i >= 0 ? mar.estado(zona, i).anomaliaTemp ?? 0 : 0;
        colorAgua.copy(AGUA_FRIA).lerp(AGUA_CALIDA, THREE.MathUtils.clamp((anom + 0.5) / 3, 0, 1));
        (escena.background as THREE.Color).lerp(colorAgua, Math.min(1, dt * 2));
        (escena.fog as THREE.Fog).color.copy(escena.background as THREE.Color);

        // cardumen: cada pez sigue a Anchi a su distancia; compacto = más cerca
        const visibles = Math.min(DIBUJOS_MAX, Math.ceil(c.peces / PECES_POR_DIBUJO));
        const radio = c.compacto ? 1.3 : 3.2;
        peces.forEach((f, k) => {
          f.p.sprite.visible = k < visibles;
          if (k >= visibles) return;
          tmp.set(anchi.posicion.x + f.ox * radio + Math.sin(t * 1.3 + f.fase) * 0.3, anchi.posicion.y + f.oy * radio * 0.5, anchi.posicion.z + f.oz * radio);
          f.p.posicion.lerp(tmp, Math.min(1, dt * (2.5 + (k % 5) * 0.4)));
          f.p.animar(t, vel, seguidor.derecha, VELOCIDAD);
        });

        if (!detenido) {
          // comer
          for (const pa of parches) {
            if (!pa.activo) {
              pa.espera -= dt;
              if (pa.espera <= 0 && pa.zona === zona) { pa.activo = true; pa.p.sprite.visible = true; colocar(pa, yOxActual); }
              continue;
            }
            if (pa.p.posicion.distanceTo(anchi.posicion) < (c.compacto ? 1.8 : 2.6)) {
              L.comer(c);
              pa.activo = false; pa.p.sprite.visible = false;
              pa.espera = L.tiempoReaparicion(condicionesMes.get(pa.zona)!.alimento);
            }
          }

          // guanay: avisa con su sombra en la superficie y luego se lanza en picada
          ave.t -= dt;
          if (ave.estado === "espera" && ave.t <= 0) {
            if (anchi.posicion.y > -4) {
              ave.estado = "aviso"; ave.t = 1.6;
              ave.objetivo.copy(anchi.posicion);
              sombraAve.position.set(anchi.posicion.x, -0.05, anchi.posicion.z);
              sombraAve.visible = true;
              eventos.aviso("¡Guanay! Baja");
            } else ave.t = 1.5;
          } else if (ave.estado === "aviso") {
            sombraAve.position.x += (anchi.posicion.x - sombraAve.position.x) * dt;
            sombraAve.position.z += (anchi.posicion.z - sombraAve.position.z) * dt;
            if (ave.t <= 0) {
              ave.estado = "picada"; ave.t = 0.7;
              guanay.sprite.visible = true;
              ave.objetivo.set(sombraAve.position.x, -4.2, sombraAve.position.z);
              guanay.posicion.set(sombraAve.position.x, 6, sombraAve.position.z);
            }
          } else if (ave.estado === "picada") {
            guanay.posicion.lerp(ave.objetivo, Math.min(1, dt * 5));
            if (ave.t <= 0) {
              const dx = Math.hypot(anchi.posicion.x - ave.objetivo.x, anchi.posicion.z - ave.objetivo.z);
              if (dx < 3 && anchi.posicion.y > -4.2) { L.golpe(c, "ave"); eventos.aviso("¡Un guanay atrapó peces!"); eventos.hito("ave", m); }
              ave.estado = "espera"; ave.t = azar(6, 10);
              guanay.sprite.visible = false; sombraAve.visible = false;
            }
          }

          // lobo marino: patrulla y persigue al cardumen cuando lo ve
          loboEstado.pausa -= dt;
          const distLobo = lobo.posicion.distanceTo(anchi.posicion);
          if (loboEstado.pausa > 0 || distLobo > 14) {
            if (Math.random() < dt * 0.3) loboEstado.rumbo.set(azar(-1, 1), azar(-0.3, 0.3), azar(-1, 1)).normalize();
            loboEstado.vel.copy(loboEstado.rumbo).multiplyScalar(3);
            if (distLobo > 30) lobo.posicion.set(anchi.posicion.x + azar(-12, 12), azar(-9, -3), anchi.posicion.z - 18);
          } else {
            loboEstado.vel.subVectors(anchi.posicion, lobo.posicion).normalize().multiplyScalar(5.2);
          }
          lobo.posicion.addScaledVector(loboEstado.vel, dt);
          lobo.posicion.x = THREE.MathUtils.clamp(lobo.posicion.x, X_MIN, X_MAX);
          lobo.posicion.y = THREE.MathUtils.clamp(lobo.posicion.y, -11, -1.5);
          if (loboEstado.pausa <= 0 && distLobo < 2) {
            L.golpe(c, "lobo"); eventos.aviso("¡Lobo marino!");
            loboEstado.pausa = 5; loboEstado.rumbo.subVectors(lobo.posicion, anchi.posicion).normalize();
          }

          // bolichera: en temporada abierta tiende su red alrededor del cardumen
          flota.t -= dt;
          if (flota.estado === "espera" && flota.t <= 0) {
            if (m.temporada === "abierta") {
              flota.estado = "calando"; flota.t = 4; flota.prof = 0;
              flota.centro.set(anchi.posicion.x, 0, anchi.posicion.z);
              barco.position.set(flota.centro.x + 8, 0, flota.centro.z);
              barco.visible = red.visible = true;
              eventos.aviso("¡Bolichera! Sal del círculo o baja");
              eventos.hito("red", m);
            } else flota.t = 4;
          } else if (flota.estado === "calando") {
            flota.prof = Math.min(8, flota.prof + dt * 2.2);
            red.scale.y = flota.prof;
            red.position.set(flota.centro.x, -flota.prof / 2, flota.centro.z);
            if (flota.t <= 0) {
              const dentro = Math.hypot(anchi.posicion.x - flota.centro.x, anchi.posicion.z - flota.centro.z) < 7 && anchi.posicion.y > -8;
              if (dentro) { L.golpe(c, "red"); eventos.aviso("La red atrapó parte del cardumen"); }
              flota.estado = "espera"; flota.t = azar(14, 20);
              barco.visible = red.visible = false;
            }
          }

          // tiempo, hambre y oxígeno
          const mesNuevo = L.avanzar(c, dt, bajoOxigeno, m, dt * (o.rapidez ?? 1));
          if (c.terminado && !finAvisado) {
            finAvisado = true;
            eventos.fin(L.informe(c, inicial), c.historia);
          } else if (mesNuevo) prepararMes();
        }

        // animaciones que siguen aunque el juego esté en pausa
        for (const pa of parches) if (pa.activo) { pa.p.posicion.y += Math.sin(t * 1.5 + pa.fase) * 0.003; pa.p.sprite.material.rotation = Math.sin(t + pa.fase) * 0.2; }
        lobo.animar(t, loboEstado.vel, seguidor.derecha, 5);
        guanay.animar(t, quieto, seguidor.derecha, 1);
        barco.position.y = Math.sin(t * 1.2) * 0.1;

        hudT -= dt;
        if (hudT <= 0) { hudT = 0.2; publicarHud(m, bajoOxigeno); }
      },
      destruir() {
        seguidor.destruir();
        useHud.getState().poner(null);
      },
    };
  };
}
