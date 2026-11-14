import * as THREE from "three";
import { crearSateliteObservacion } from "../modelos/instrumentos";
import { GIRO_INICIAL, INCLINACION, RADIO_GLOBO } from "../../../lib/encuadre";
import { Y_ESPACIO } from "../scroll";
import { DIR_SOL_ESPACIO } from "./ambiente";
import type { Calidad } from "./calidad";
import { azar, contexto, fbm, lienzo, type Capa } from "./materiales";

// La misma foto y el mismo relieve que usa el explorador en su vista Satelital
const FOTO_TIERRA = "/assets/globe/earth-blue-marble.jpg";
const RELIEVE_TIERRA = "/assets/globe/earth-topology.png";

/** Nubes: ruido fractal pintado en una textura equirectangular */
function texturaNubes(ancho: number): THREE.CanvasTexture {
  const alto = ancho / 2, c = lienzo(ancho, alto), x = contexto(c), img = x.createImageData(ancho, alto);
  for (let j = 0; j < alto; j++) for (let i = 0; i < ancho; i++) {
    const u = i / ancho, v = j / alto;
    const n = fbm(Math.cos(u * Math.PI * 2) * 3 + 10, v * 8 + Math.sin(u * Math.PI * 2) * 3, 6);
    const lat = Math.abs(v - 0.5) * 2, banda = 0.6 + 0.4 * Math.cos(lat * Math.PI * 1.6);
    const a = Math.max(0, Math.min(1, (n * banda - 0.42) * 3.2));
    const k = (j * ancho + i) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
    img.data[k + 3] = a * 235;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function crearTierra(C: Calidad): { tierra: THREE.Group; nubes: THREE.Mesh } {
  const tierra = new THREE.Group();
  const cargador = new THREE.TextureLoader();
  const mapa = cargador.load(FOTO_TIERRA);
  mapa.colorSpace = THREE.SRGBColorSpace;
  mapa.anisotropy = 8;
  const relieve = cargador.load(RELIEVE_TIERRA);
  tierra.add(new THREE.Mesh(new THREE.SphereGeometry(RADIO_GLOBO, C.segTierra, C.segTierra / 2),
    new THREE.MeshStandardMaterial({ map: mapa, bumpMap: relieve, bumpScale: 2.2, roughness: 0.82, metalness: 0 })));

  const nubes = new THREE.Mesh(new THREE.SphereGeometry(RADIO_GLOBO * 1.009, C.segTierra, C.segTierra / 2),
    new THREE.MeshStandardMaterial({ map: texturaNubes(C.nubesAncho), transparent: true, depthWrite: false, roughness: 1 }));
  tierra.add(nubes);

  // atmósfera: brillo azul en el borde (efecto Fresnel), más fuerte en el lado iluminado
  tierra.add(new THREE.Mesh(new THREE.SphereGeometry(RADIO_GLOBO * 1.09, 64, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSol: { value: DIR_SOL_ESPACIO } },
    vertexShader: "varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }",
    fragmentShader: "uniform vec3 uSol; varying vec3 vN; varying vec3 vP; void main(){ vec3 v = normalize(cameraPosition - vP); float f = pow(1.0 - abs(dot(vN, v)), 3.0); float luz = 0.35 + 0.65*max(0.0, dot(-vN, uSol)); gl_FragColor = vec4(vec3(0.33,0.62,1.0)*f*1.6*luz, f); }",
  })));
  return { tierra, nubes };
}

/** Estrellas de distintos tamaños y colores */
function crearEstrellas(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const n = 2500, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const v = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    v.randomDirection().multiplyScalar(azar(600, 900));
    pos.set([v.x, Math.abs(v.y) * 0.8 + 40 + Y_ESPACIO, v.z - 200], i * 3);
    c.setHSL(azar(0.55, 0.7), 0.4, azar(0.7, 1));
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, fog: false }));
}

/** Espacio: Tierra con relieve, nubes y atmósfera; satélite; estrellas */
export function crearEspacio(escena: THREE.Scene, C: Calidad): Capa & { globo: THREE.Object3D } {
  const grupo = new THREE.Group();
  const { tierra, nubes } = crearTierra(C);
  tierra.position.set(0, Y_ESPACIO, -28);
  tierra.rotation.set(INCLINACION, GIRO_INICIAL, 0);
  const satelite = crearSateliteObservacion();
  satelite.scale.setScalar(0.55);
  const movimiento = matchMedia('(prefers-reduced-motion: reduce)');
  const estrellas = crearEstrellas();
  grupo.add(tierra, satelite, estrellas);
  escena.add(grupo);

  return {
    globo: tierra,
    actualizar(t, y) {
      grupo.visible = y > 28;
      tierra.rotation.y += 0.0002;
      nubes.rotation.y += 0.00012;
      // Encuadre ilustrativo frente al globo: visible también en pantallas estrechas.
      const tiempo = movimiento.matches ? 0 : t;
      const lateral = Math.max(0, Math.min(6, 7.29 * innerWidth / innerHeight - 3.2));
      satelite.position.set(lateral + Math.sin(tiempo * 0.18) * 0.25, Y_ESPACIO + 5 + Math.sin(tiempo * 0.2) * 0.25, -8);
      satelite.rotation.set(0.85, -0.35 + Math.sin(tiempo * 0.12) * 0.2, -0.12);
      estrellas.material.opacity = THREE.MathUtils.clamp((y - 40) / 18, 0, 1);
    },
  };
}
