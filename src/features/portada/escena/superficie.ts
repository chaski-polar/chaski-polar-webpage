import * as THREE from "three";
import { crearBoyaOceanografica } from "../modelos/instrumentos";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { DIR_SOL } from "./ambiente";
import type { Calidad } from "./calidad";
import { azar, contexto, fbm, lienzo, type Capa } from "./materiales";
import { cargarModelo, geometriaNormalizada, materialDe, mallas, MODELO_PERU } from "./modelos";

/** Mapa de normales de las olas: suma de ondas que se repite sin cortes */
function normalesOlas(): THREE.CanvasTexture {
  const n = 256, c = lienzo(n, n), x = contexto(c), img = x.createImageData(n, n), alto = new Float32Array(n * n), T = Math.PI * 2;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const u = (i / n) * T, v = (j / n) * T;
    alto[j * n + i] = Math.sin(u * 3 + v * 2) * 0.5 + Math.sin(u * 7 - v * 5 + 1.3) * 0.25 + Math.sin(u * 13 + v * 11 + 2.1) * 0.12
      + Math.sin(-u * 21 + v * 17) * 0.06 + Math.sin(u * 2 - v * 9 + 0.7) * 0.3;
  }
  const h = (a: number, b: number) => alto[((b + n) % n) * n + ((a + n) % n)] ?? 0;
  const v = new THREE.Vector3();
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    v.set(-(h(i + 1, j) - h(i - 1, j)) * 2.2, -(h(i, j + 1) - h(i, j - 1)) * 2.2, 1).normalize();
    const k = (j * n + i) * 4;
    img.data[k] = (v.x * 0.5 + 0.5) * 255; img.data[k + 1] = (v.y * 0.5 + 0.5) * 255; img.data[k + 2] = (v.z * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Costa: cerros desérticos a lo lejos (la costa peruana es árida) */
function crearCerros(): THREE.Mesh {
  const g = new THREE.PlaneGeometry(900, 70, 300, 30);
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), borde = Math.min(1, (35 - z) / 70);
    p.setY(i, Math.max(0, fbm(x * 0.012 + 3, z * 0.03, 5) * 38 * borde - 4));
  }
  g.computeVertexNormals();
  const cerros = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: 1 }));
  cerros.position.set(140, -0.4, -260);
  cerros.rotation.y = -0.35;
  return cerros;
}

/** Bolichera: casco azul con franja roja, cabina blanca, mástil, pluma, red y panga */
function crearBolichera(): THREE.Group {
  const barco = new THREE.Group();
  const forma = new THREE.Shape(); // perfil visto desde arriba: popa recta, proa en punta
  forma.moveTo(-2.4, -0.75); forma.lineTo(1.4, -0.75); forma.quadraticCurveTo(2.5, -0.5, 2.9, 0); forma.quadraticCurveTo(2.5, 0.5, 1.4, 0.75); forma.lineTo(-2.4, 0.75); forma.lineTo(-2.4, -0.75);
  const casco = new THREE.ExtrudeGeometry(forma, { depth: 1.0, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3 });
  casco.rotateX(-Math.PI / 2);
  casco.translate(0, -0.55, 0);
  const p = casco.getAttribute("position"); // se angosta hacia abajo
  for (let i = 0; i < p.count; i++) { const t = (p.getY(i) + 0.67) / 1.24; p.setZ(i, p.getZ(i) * (0.55 + 0.45 * t)); }
  casco.computeVertexNormals();

  const pintura = (c: number, r = 0.55) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.1 });
  const pieza = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); barco.add(o); return o; };
  pieza(casco, pintura(0x1f4e8c));
  pieza(new THREE.BoxGeometry(5.1, 0.12, 1.62), pintura(0xb3261e), 0.05, 0.38);
  pieza(new THREE.BoxGeometry(4.9, 0.06, 1.42), pintura(0x8a6f4d, 0.8), 0, 0.46);
  pieza(new THREE.BoxGeometry(1.1, 0.9, 1.1), pintura(0xf2f0ea, 0.4), 1.0, 0.94);
  pieza(new THREE.BoxGeometry(0.9, 0.42, 1.0), pintura(0xf2f0ea, 0.4), 1.05, 1.6);
  const vidrio = new THREE.MeshStandardMaterial({ color: 0x0d1b26, roughness: 0.05, metalness: 0.8 });
  for (const z of [-0.51, 0.51]) pieza(new THREE.BoxGeometry(0.7, 0.18, 0.02), vidrio, 1.05, 1.64, z);
  pieza(new THREE.BoxGeometry(0.02, 0.18, 0.8), vidrio, 1.51, 1.64);
  const acero = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, metalness: 0.9, roughness: 0.3 });
  pieza(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 10), acero, 0.4, 1.8);
  pieza(new THREE.CylinderGeometry(0.035, 0.04, 2.4, 8), acero, -0.6, 1.9).rotation.z = 0.95;
  pieza(new THREE.SphereGeometry(0.55, 16, 10), new THREE.MeshStandardMaterial({ color: 0x23402f, roughness: 1 }), -1.6, 0.66).scale.set(1.5, 0.45, 1);
  pieza(new THREE.TorusGeometry(0.42, 0.06, 8, 24), pintura(0xf2b134), -1.6, 0.86).rotation.x = Math.PI / 2;
  const panga = pieza(new THREE.CapsuleGeometry(0.22, 0.9, 4, 10), pintura(0xe36b2c), -2.1, 0.8, 0.45);
  panga.rotation.z = Math.PI / 2;
  panga.scale.set(1, 1, 0.7);
  barco.position.set(5, 0, -18);
  barco.rotation.y = 0.55;
  return barco;
}

interface Ave {
  ave: THREE.Group;
  v: number;
  f: number;
  alas: { pivote: THREE.Group; l: number }[];
}

/** Aves marinas (guanayes): cuerpo, pecho blanco, cabeza y alas que aletean */
function crearAve(): Ave {
  const ave = new THREE.Group();
  const plumaje = new THREE.MeshStandardMaterial({ color: 0x1e2328, roughness: 0.9 });
  const pecho = new THREE.MeshStandardMaterial({ color: 0xe8e6e1, roughness: 0.9 });
  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.38, 4, 8), plumaje); cuerpo.rotation.z = Math.PI / 2;
  const vientre = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.3, 4, 8), pecho); vientre.rotation.z = Math.PI / 2; vientre.position.y = -0.03;
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), plumaje); cabeza.position.x = 0.3;
  ave.add(cuerpo, vientre, cabeza);
  const matAla = new THREE.MeshStandardMaterial({ color: 0x23282e, roughness: 0.9, side: THREE.DoubleSide });
  const alas = [-1, 1].map((l) => {
    const forma = new THREE.Shape();
    forma.moveTo(0, 0); forma.quadraticCurveTo(0.25, 0.55 * l, -0.12, 0.95 * l); forma.lineTo(-0.2, 0.2 * l); forma.lineTo(0, 0);
    const ala = new THREE.Mesh(new THREE.ShapeGeometry(forma), matAla);
    ala.rotation.x = Math.PI / 2;
    const pivote = new THREE.Group();
    pivote.add(ala);
    ave.add(pivote);
    return { pivote, l };
  });
  ave.scale.setScalar(0.8);
  ave.position.set(azar(-20, 20), azar(5, 12), azar(-40, -18));
  return { ave, v: azar(0.02, 0.04), f: azar(5, 8), alas };
}

/** Superficie: cielo, mar con reflejos, costa desértica, bolichera y aves */
export function crearSuperficie(escena: THREE.Scene, C: Calidad): Capa {
  const grupo = new THREE.Group();
  const cielo = new Sky();
  cielo.scale.setScalar(1500);
  // El cielo se mezcla con el espacio durante el descenso, en vez de aparecer de golpe.
  cielo.material.transparent = true;
  cielo.material.depthWrite = false;
  cielo.material.uniforms.opacidadAtmosfera = { value: 0 };
  cielo.material.fragmentShader = cielo.material.fragmentShader
    .replace('void main() {', 'uniform float opacidadAtmosfera;\nvoid main() {')
    .replace('gl_FragColor = vec4( texColor, 1.0 );', 'gl_FragColor = vec4( texColor, opacidadAtmosfera );');
  escena.add(cielo);
  const u = cielo.material.uniforms;
  u.turbidity!.value = 8; u.rayleigh!.value = 2.2; u.mieCoefficient!.value = 0.004; u.mieDirectionalG!.value = 0.8;
  (u.sunPosition!.value as THREE.Vector3).copy(DIR_SOL);
  if (u.cloudCoverage) { u.cloudCoverage.value = 0.35; if (u.cloudDensity) u.cloudDensity.value = 0.45; }

  const agua = new Water(new THREE.PlaneGeometry(3000, 3000), {
    textureWidth: C.agua, textureHeight: C.agua, waterNormals: normalesOlas(), sunDirection: DIR_SOL.clone(),
    sunColor: 0xffd9a8, waterColor: 0x062b3a, distortionScale: 3.6, fog: true, alpha: 1,
  });
  agua.rotation.x = -Math.PI / 2;
  const tiempoAgua = agua.material.uniforms.time!;

  let barco = crearBolichera();
  const boya = crearBoyaOceanografica();
  const movimientoBoya = matchMedia('(prefers-reduced-motion: reduce)');
  boya.position.set(-5, 0, -12);
  boya.rotation.y = -0.4;
  grupo.add(boya);
  let aves = Array.from({ length: C.aves }, crearAve);
  grupo.add(agua, crearCerros(), barco, ...aves.map((a) => a.ave));
  escena.add(grupo);

  // La costa entra a través de la neblina mientras la cámara desciende.
  const materiales = new Map<THREE.Material, number>();
  const registrar = (raiz: THREE.Object3D) => raiz.traverse((objeto) => {
    if (!(objeto instanceof THREE.Mesh) || objeto === agua) return;
    for (const material of [objeto.material].flat() as THREE.Material[]) {
      if (!materiales.has(material)) materiales.set(material, material.opacity);
      material.transparent = true;
    }
  });
  registrar(grupo);
  agua.material.transparent = true;

  // Modelos del equipo: la bolichera y los guanayes reemplazan a los dibujados en código.
  void cargarModelo(MODELO_PERU).then((raiz) => {
    if (!raiz) return;
    const casco = mallas(raiz, "Bolichera")[0];
    if (casco) {
      const nuevo = new THREE.Group();
      const m = new THREE.Mesh(geometriaNormalizada(casco, 6.2), materialDe(casco));
      m.position.y = -0.35;
      nuevo.add(m);
      nuevo.position.copy(barco.position);
      nuevo.rotation.y = barco.rotation.y;
      grupo.remove(barco);
      barco = nuevo;
      grupo.add(barco);
      registrar(barco);
    }
    const guanay = mallas(raiz, "guanay")[0];
    if (guanay) {
      const g = geometriaNormalizada(guanay, 1.1), mat = materialDe(guanay);
      for (const a of aves) grupo.remove(a.ave);
      aves = Array.from({ length: C.aves }, () => {
        const ave = new THREE.Group();
        const m = new THREE.Mesh(g, mat);
        m.position.y = -0.1;
        ave.add(m);
        ave.position.set(azar(-20, 20), azar(5, 12), azar(-40, -18));
        return { ave, v: azar(0.02, 0.04), f: azar(5, 8), alas: [] };
      });
      for (const a of aves) grupo.add(a.ave);
      registrar(grupo);
    }
  });

  return {
    actualizar(t, y) {
      const atmosfera = 1 - THREE.MathUtils.smoothstep(y, 34, 66);
      cielo.visible = y >= 0 && atmosfera > 0;
      cielo.material.uniforms.opacidadAtmosfera!.value = atmosfera;
      const aparicion = 1 - THREE.MathUtils.smoothstep(y, 32, 64);
      grupo.visible = y > -1.5 && aparicion > 0;
      if (!grupo.visible) return;
      materiales.forEach((opacidad, material) => { material.opacity = opacidad * aparicion; });
      agua.material.uniforms.alpha!.value = aparicion;
      const debajo = y < 0;
      agua.visible = !debajo;
      tiempoAgua.value = t * 0.6;
      const tiempoBoya = movimientoBoya.matches ? 0 : t;
      boya.position.x = -Math.min(5, Math.max(1, 7 * innerWidth / innerHeight - 1.2));
      boya.position.y = Math.sin(tiempoBoya * 1.05 + 1) * 0.09;
      boya.rotation.z = Math.sin(tiempoBoya * 0.8) * 0.045;
      boya.rotation.x = Math.cos(tiempoBoya * 0.65) * 0.025;
      barco.position.y = Math.sin(t * 1.1) * 0.08;
      barco.rotation.z = Math.sin(t * 0.9) * 0.035;
      barco.rotation.x = Math.sin(t * 0.7) * 0.02;
      for (const a of aves) {
        a.ave.position.x += a.v;
        if (a.ave.position.x > 22) a.ave.position.x = -22;
        a.ave.position.y += Math.sin(t * 0.8 + a.ave.position.z) * 0.004;
        for (const { pivote, l } of a.alas) pivote.rotation.x = l * Math.sin(t * a.f + a.ave.position.z) * 0.6;
      }
    },
  };
}
