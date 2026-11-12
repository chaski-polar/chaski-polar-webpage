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
import { sonar } from "../motor/sonido";
import { sprite } from "../personajes/sprites";

const LARGO_ZONA = 30;
const X_MIN = -16, X_MAX = 9;
const Y_MIN = -12.5, Y_MAX = -0.6;
const Z_MAX = 0, Z_MIN = -LARGO_ZONA * ZONAS_PERU.length;
const VELOCIDAD = 7, VELOCIDAD_VERTICAL = 6;
// impulso: un arranque corto para escapar de redes y aves, que cuesta energía
const IMPULSO = { fuerza: 2.3, dura: 0.55, espera: 2.5, energia: 0.06 };
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
  /** comida de cada zona este mes, de norte a sur (el radar de ORBI) */
  radar: { zona: ZonaMar; alimento: number }[];
  /** 0 = listo; 1 = recién usado */
  impulsoEspera: number;
  /** profundidad de Anchi y del límite de la zona sin oxígeno (en unidades de la escena; 0 = superficie) */
  y: number;
  yOxigeno: number;
}
export const useHud = create<{ hud: Hud | null; poner(h: Hud | null): void }>((set) => ({ hud: null, poner: (hud) => set({ hud }) }));

export interface EventosCardumen {
  aviso(texto: string): void;
  /** algo que merece un diálogo la primera vez que ocurre */
  hito(id: "nino" | "veda" | "oxigeno_alto" | "red" | "ave", mes: L.Mes): void;
  /** empieza un mes nuevo */
  mes?(mes: number, condiciones: L.Mes): void;
  fin(informe: L.Informe, historia: L.Mes[]): void;
}

export interface OpcionesCardumen {
  anio: number;
  peces: number;
  pausa: () => boolean;
  compacto: () => boolean;
  /** acelera el calendario para probar (1 = normal) */
  rapidez?: number;
  estrategia?: L.Estrategia;
  /** el año termina al completar este mes (12 = diciembre) */
  mesFin?: number;
}

interface Parche { p: Personaje; zona: ZonaMar; activo: boolean; espera: number; fase: number }
interface Seguidor { p: Personaje; ox: number; oy: number; oz: number; fase: number }

interface Mundo { capaOxigeno: THREE.Mesh; animar(t: number): void }

function crearMundo(escena: THREE.Scene): Mundo {
  escena.background = AGUA_FRIA.clone();
  escena.fog = new THREE.Fog(AGUA_FRIA.getHex(), 12, 46);
  escena.add(new THREE.HemisphereLight(0xe6f6ff, 0x1d3a4a, 1.15));
  const sol = new THREE.DirectionalLight(0xffffff, 1.4);
  sol.position.set(-6, 20, 6);
  escena.add(sol);

  const largo = -Z_MIN + 60;
  // fondo de arena con ondulaciones que sube hacia la costa; manchas más oscuras de limo
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(80, largo, 40, 120).rotateX(-Math.PI / 2), toon(0xffffff, { vertexColors: true }));
  const pf = fondo.geometry.getAttribute("position"), colores = new Float32Array(pf.count * 3);
  const arena = new THREE.Color(0xd2bb8e), limo = new THREE.Color(0x9c8f6f), cf = new THREE.Color();
  for (let i = 0; i < pf.count; i++) {
    const x = pf.getX(i), z = pf.getZ(i);
    pf.setY(i, Math.sin(x * 0.9 + Math.sin(z * 0.15) * 2) * 0.12 + Math.random() * 0.25 + Math.max(0, x - 6) * 0.9);
    cf.copy(arena).lerp(limo, (Math.sin(x * 0.21) * Math.cos(z * 0.13) + 1) * 0.35);
    colores.set([cf.r, cf.g, cf.b], i * 3);
  }
  fondo.geometry.setAttribute("color", new THREE.BufferAttribute(colores, 3));
  fondo.geometry.computeVertexNormals();
  fondo.position.set(0, -14, Z_MIN / 2);
  escena.add(fondo);

  const tierra = new THREE.Mesh(new THREE.BoxGeometry(20, 6, largo), toon(0xd9b98a)); // costa desértica
  tierra.position.set(22, 2, Z_MIN / 2);
  escena.add(tierra);
  // rocas, estrellas de mar y erizos: cada tipo es un solo dibujo repetido (instancias), con su contorno
  const repetir = (geo: THREE.BufferGeometry, n: number, colores: number[], colocar: (i: number, pos: THREE.Vector3, esc: THREE.Vector3, rot: THREE.Euler) => void) => {
    const malla = new THREE.InstancedMesh(geo, toon(0xffffff), n);
    const m = new THREE.Matrix4(), pos = new THREE.Vector3(), esc = new THREE.Vector3(1, 1, 1), rot = new THREE.Euler(), q = new THREE.Quaternion(), col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      esc.set(1, 1, 1); rot.set(0, 0, 0);
      colocar(i, pos, esc, rot);
      malla.setMatrixAt(i, m.compose(pos, q.setFromEuler(rot), esc));
      malla.setColorAt(i, col.setHex(colores[i % colores.length]!));
    }
    escena.add(malla);
  };
  const enFondo = (x: number) => -14 + Math.max(0, x - 6) * 0.9;
  repetir(new THREE.IcosahedronGeometry(1, 0), 60, [0x6d6a63, 0x5b5e5f, 0x7a6f62], (i, pos, esc, rot) => { // rocas, más juntas cerca de la costa
    const x = i % 3 ? azar(0, 9) : azar(-18, 9);
    pos.set(x, enFondo(x) + 0.4, azar(Z_MIN, Z_MAX));
    esc.set(azar(0.8, 2.5), azar(0.5, 1.6), azar(0.8, 2.5));
    rot.set(azar(0, 3), azar(0, 3), 0);
  });
  repetir(new THREE.ConeGeometry(0.4, 0.15, 5), 40, [0xe4572e, 0xf39c12, 0xd96aa7], (_i, pos) => { const x = azar(-16, 8); pos.set(x, enFondo(x) + 0.3, azar(Z_MIN, Z_MAX)); }); // estrellas de mar
  repetir(new THREE.IcosahedronGeometry(0.3, 0), 30, [0x7b2d8e, 0x3b2a4f], (_i, pos) => { const x = azar(-16, 8); pos.set(x, enFondo(x) + 0.3, azar(Z_MIN, Z_MAX)); }); // erizos
  // algas: un solo dibujo repetido (instancias); se mecen en la tarjeta gráfica, más arriba más se mueven
  const N_ALGAS = 90;
  const tiempoAlgas = { value: 0 };
  const geoAlga = new THREE.CylinderGeometry(0.1, 0.16, 6, 5, 8).translate(0, 3, 0);
  const matAlga = sinContorno(toon(0xffffff));
  matAlga.onBeforeCompile = (sh) => {
    sh.uniforms.uT = tiempoAlgas;
    sh.vertexShader = "uniform float uT;\n" + sh.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\nfloat fase = dot(instanceMatrix[3].xyz, vec3(0.7, 0.0, 1.3));\nfloat h = position.y / 6.0;\n" +
      "transformed.x += sin(uT * 0.9 + fase + h * 2.5) * 0.7 * h * h;\ntransformed.z += cos(uT * 0.7 + fase) * 0.3 * h * h;");
  };
  const algas = new THREE.InstancedMesh(geoAlga, matAlga, N_ALGAS);
  const verdes = [0x6b8f3a, 0x8a9a3b, 0x557a35].map((h) => new THREE.Color(h));
  const m4 = new THREE.Matrix4(), escala = new THREE.Vector3(), q = new THREE.Quaternion(), pAlga = new THREE.Vector3();
  for (let i = 0; i < N_ALGAS; i++) {
    const x = i % 4 ? azar(1, 9) : azar(-14, 1);
    pAlga.set(x, -14 + Math.max(0, x - 6) * 0.9, azar(Z_MIN, Z_MAX));
    escala.set(azar(0.8, 1.3), azar(0.6, 1.4), azar(0.8, 1.3));
    algas.setMatrixAt(i, m4.compose(pAlga, q, escala));
    algas.setColorAt(i, verdes[i % 3]!);
  }
  escena.add(algas);
  // rayos de luz desde la superficie
  const rayos: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.5, azar(2, 3.5), 14, 7, 1, true),
      sinContorno(new THREE.MeshBasicMaterial({ color: 0xe6f8ff, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    r.position.set(azar(-16, 8), -7, azar(Z_MIN, Z_MAX));
    r.rotation.z = 0.18;
    escena.add(r);
    rayos.push(r);
  }
  // plancton y partículas en suspensión
  const n = 2500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([azar(-18, 10), azar(-13.5, -0.3), azar(Z_MIN, Z_MAX)], i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const plancton = new THREE.Points(geo, sinContorno(new THREE.PointsMaterial({ color: 0xe9fff4, size: 0.07, transparent: true, opacity: 0.6, depthWrite: false })));
  escena.add(plancton);

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

  return {
    capaOxigeno,
    animar(t) {
      tiempoAlgas.value = t;
      rayos.forEach((r, i) => { (r.material as THREE.MeshBasicMaterial).opacity = 0.045 + 0.025 * Math.sin(t * 0.7 + i); });
      plancton.position.y = Math.sin(t * 0.3) * 0.3;
    },
  };
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
    const mundo = crearMundo(escena);
    const { capaOxigeno } = mundo;
    const c = L.crearCardumen(o.anio, o.peces, o.estrategia, o.mesFin);
    const inicial = o.peces;

    const anchi = crearPersonaje(escena, sprite("anchi", dibujarAnchi), { ancho: 2.6, alto: 2.6 });
    anchi.posicion.set(-3, -3, centroZona(ZONA_INICIAL));
    const seguidor = crearSeguidor(camara, renderer.domElement, anchi.posicion, { distancia: 15, giro: 0.9 });

    // el cardumen: un dibujo por cada PECES_POR_DIBUJO peces
    const dibujoPez = sprite("anchoveta", dibujarAnchoveta);
    const peces: Seguidor[] = Array.from({ length: DIBUJOS_MAX }, () => {
      const p = crearPersonaje(escena, dibujoPez, { ancho: azar(1.15, 1.45), alto: azar(1.15, 1.45) });
      p.posicion.copy(anchi.posicion);
      return { p, ox: azar(-1, 1), oy: azar(-1, 1), oz: azar(-1, 1), fase: azar(0, 6) };
    });

    // comida: manchas de fitoplancton en todas las zonas, según la clorofila de cada una ese mes
    const dibujoFito = sprite("fito", dibujarFito);
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
    const guanay = crearPersonaje(escena, sprite("guanay", dibujarGuanay), { ancho: 2, alto: 2 });
    guanay.sprite.visible = false;
    const sombraAve = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24).rotateX(Math.PI / 2), sinContorno(new THREE.MeshBasicMaterial({ color: 0x0d1b26, transparent: true, opacity: 0.35, depthWrite: false })));
    sombraAve.visible = false;
    escena.add(sombraAve);
    const ave = { estado: "espera" as "espera" | "aviso" | "picada", t: azar(5, 9), objetivo: new THREE.Vector3() };

    const lobo = crearPersonaje(escena, sprite("lobo", dibujarLobo), { ancho: 3.6, alto: 3.6 });
    lobo.posicion.set(-12, -7, centroZona(ZONA_INICIAL) - 26);
    // al empezar el año el lobo marino espera un poco antes de cazar
    const loboEstado = { pausa: 10, rumbo: new THREE.Vector3(1, 0, 0), vel: new THREE.Vector3() };

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

    const impulso = { activo: 0, espera: 0 };
    const publicarHud = (m: L.Mes, bajoOx: boolean) => useHud.getState().poner({
      anio: c.anio, mes: c.mes, zona: m.zona, peces: Math.round(c.peces), inicial, energia: c.energia, alimento: m.alimento, origen: m.origen,
      anomaliaTemp: (() => { const i = mar.indice(c.anio, c.mes + 1); return i >= 0 ? mar.estado(m.zona, i).anomaliaTemp : null; })(),
      nino12: m.nino12, temporada: m.temporada, compacto: c.compacto, bajoOxigeno: bajoOx, avanceMes: c.tMes / L.SEGUNDOS_POR_MES,
      radar: ZONAS_PERU.map((zona) => ({ zona, alimento: condicionesMes.get(zona)?.alimento ?? 1 })), impulsoEspera: Math.max(0, impulso.espera / IMPULSO.espera), y: anchi.posicion.y, yOxigeno: yOxActual,
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
        // impulso: Shift o el botón en pantalla
        impulso.espera = Math.max(0, impulso.espera - dt);
        impulso.activo = Math.max(0, impulso.activo - dt);
        if (entrada.impulso() && !detenido && impulso.espera <= 0 && c.energia > IMPULSO.energia) {
          impulso.activo = IMPULSO.dura; impulso.espera = IMPULSO.espera;
          c.energia -= IMPULSO.energia;
          sonar("boton");
        }
        mov.multiplyScalar(VELOCIDAD * c.estrategia.velocidad * (c.compacto ? 0.85 : 1) * (impulso.activo > 0 ? IMPULSO.fuerza : 1));
        mov.y = detenido ? 0 : entrada.vertical() * VELOCIDAD_VERTICAL;
        vel.lerp(mov, 1 - Math.pow(0.003, dt));
        anchi.posicion.addScaledVector(vel, dt);
        anchi.posicion.x = THREE.MathUtils.clamp(anchi.posicion.x, X_MIN, X_MAX);
        anchi.posicion.y = THREE.MathUtils.clamp(anchi.posicion.y, Y_MIN, Y_MAX);
        anchi.posicion.z = THREE.MathUtils.clamp(anchi.posicion.z, Z_MIN + 0.5, Z_MAX - 0.5);
        seguidor.seguir(anchi.posicion, vel.y);
        tmp.set(vel.x, 0, vel.z);
        anchi.animar(t, tmp, seguidor.derecha, VELOCIDAD);
        // al subir o bajar, Anchi apunta la cabeza hacia donde va (según mire a la derecha o a la izquierda)
        const haciaDer = tmp.dot(seguidor.derecha) >= 0 ? 1 : -1;
        const cabeceo = THREE.MathUtils.clamp(vel.y * 0.07, -0.45, 0.45) * haciaDer;
        anchi.sprite.material.rotation = cabeceo;

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
          f.p.sprite.material.rotation = cabeceo;
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
              sonar("comer");
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
              eventos.aviso("¡Guanay! Baja"); sonar("aviso");
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
              if (dx < 3 && anchi.posicion.y > -4.2) { L.golpe(c, "ave"); sonar("golpe"); eventos.aviso("¡Un guanay atrapó peces!"); eventos.hito("ave", m); }
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
            L.golpe(c, "lobo"); sonar("golpe"); eventos.aviso("¡Lobo marino!");
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
              eventos.aviso("¡Bolichera! Sal del círculo o baja"); sonar("aviso");
              eventos.hito("red", m);
            } else flota.t = 4;
          } else if (flota.estado === "calando") {
            flota.prof = Math.min(8, flota.prof + dt * 2.2);
            red.scale.y = flota.prof;
            red.position.set(flota.centro.x, -flota.prof / 2, flota.centro.z);
            if (flota.t <= 0) {
              const dentro = Math.hypot(anchi.posicion.x - flota.centro.x, anchi.posicion.z - flota.centro.z) < 7 && anchi.posicion.y > -8;
              if (dentro) { L.golpe(c, "red"); sonar("golpe"); eventos.aviso("La red atrapó parte del cardumen"); }
              flota.estado = "espera"; flota.t = azar(14, 20);
              barco.visible = red.visible = false;
            }
          }

          // tiempo, hambre y oxígeno
          const mesNuevo = L.avanzar(c, dt, bajoOxigeno, m, dt * (o.rapidez ?? 1));
          if (c.terminado && !finAvisado) {
            finAvisado = true;
            eventos.fin(L.informe(c, inicial), c.historia);
          } else if (mesNuevo) { prepararMes(); eventos.mes?.(c.mes, condicionesMes.get(zonaEn(anchi.posicion.z))!); }
        }

        // animaciones que siguen aunque el juego esté en pausa
        // solo se dibujan las manchas de la zona actual y las vecinas: las demás las tapa la niebla
        const zi = ZONAS_PERU.indexOf(zona as (typeof ZONAS_PERU)[number]);
        for (const pa of parches) {
          const cerca = Math.abs(ZONAS_PERU.indexOf(pa.zona as (typeof ZONAS_PERU)[number]) - zi) <= 1;
          pa.p.sprite.visible = pa.activo && cerca;
          if (pa.p.sprite.visible) { pa.p.posicion.y += Math.sin(t * 1.5 + pa.fase) * 0.003; pa.p.sprite.material.rotation = Math.sin(t + pa.fase) * 0.2; }
        }
        mundo.animar(t);
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
