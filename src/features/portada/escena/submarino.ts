import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Y_FONDO } from "../scroll";
import type { Calidad } from "./calidad";
import { azar, fbm, nube, type Capa } from "./materiales";
import { cargarModelo, geometriaNormalizada, materialDe, mallas, MODELO_FONDO } from "./modelos";

/** La superficie vista desde abajo: un techo claro que ondula */
function crearTecho(): THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
  const techo = new THREE.Mesh(new THREE.PlaneGeometry(600, 600, 1, 1), new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: false, fog: false,
    uniforms: { uT: { value: 0 } },
    vertexShader: "varying vec3 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }",
    fragmentShader: `uniform float uT; varying vec3 vP;
      float o(vec2 p){ return sin(p.x*1.7+uT*1.1)*sin(p.y*1.3-uT*0.9) + sin((p.x+p.y)*2.3+uT*1.7)*0.5; }
      void main(){ vec2 p = vP.xz*0.35; float c = o(p) + o(p*2.1+3.0)*0.5; float d = length(vP.xz - cameraPosition.xz);
        float brillo = smoothstep(0.6, 1.4, c) * 0.9 + 0.25; float lejos = exp(-d*0.018);
        gl_FragColor = vec4(mix(vec3(0.10,0.42,0.55), vec3(0.75,0.95,1.0), brillo*lejos), 0.92*lejos + 0.05); }`,
  }));
  techo.rotation.x = Math.PI / 2;
  techo.position.y = -0.02;
  return techo;
}

/** Rayos de luz que bajan desde la superficie */
function crearRayos(n: number): { rayos: THREE.Group; material: THREE.ShaderMaterial } {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uT: { value: 0 }, uFuerza: { value: 1 } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: "uniform float uT; uniform float uFuerza; varying vec2 vU; void main(){ float franjas = 0.55 + 0.45*sin(vU.x*40.0 + uT*0.7)*sin(vU.x*17.0 - uT*0.4); float a = pow(vU.y, 1.6) * franjas * 0.09 * uFuerza; gl_FragColor = vec4(0.75,0.95,1.0, a); }",
  });
  const rayos = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(azar(0.4, 1.2), azar(2.5, 4), 34, 12, 1, true), material);
    r.position.set(azar(-24, 24), -17, azar(-36, -8));
    r.rotation.z = azar(0.12, 0.22);
    r.rotation.x = azar(-0.05, 0.05);
    rayos.add(r);
  }
  return { rayos, material };
}

/** Anchoveta: cuerpo fusiforme plateado, lomo azul verdoso y cola */
function geometriaAnchoveta(): THREE.BufferGeometry {
  const perfil: THREE.Vector2[] = [];
  for (let k = 0; k <= 14; k++) { const t = k / 14; perfil.push(new THREE.Vector2(Math.sin(Math.PI * t) ** 0.8 * 0.065 * (1 - 0.35 * t), (t - 0.5) * 0.62)); }
  const cuerpo = new THREE.LatheGeometry(perfil, 10);
  cuerpo.rotateZ(-Math.PI / 2);
  cuerpo.scale(1, 1, 0.62);
  const cola = new THREE.BufferGeometry();
  cola.setAttribute("position", new THREE.Float32BufferAttribute([-0.29, 0, 0, -0.42, 0.075, 0, -0.42, -0.075, 0, -0.29, 0, 0, -0.42, -0.075, 0, -0.42, 0.075, 0], 3));
  cola.computeVertexNormals();
  const partes = [cuerpo.toNonIndexed(), cola].map((g) => { g.deleteAttribute("uv"); g.deleteAttribute("normal"); return g; });
  const g = mergeGeometries(partes);
  if (!g) throw new Error("No se pudo armar la anchoveta");
  const p = g.getAttribute("position"), col = new Float32Array(p.count * 3);
  const plata = new THREE.Color(0xf2f7fa), lomo = new THREE.Color(0x3a7f96), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    c.copy(plata).lerp(lomo, THREE.MathUtils.smoothstep(p.getY(i), -0.01, 0.04));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

interface Pez { a: number; r: number; y: number; v: number; d: number; s: number }

/** Fondo: arena con ondulaciones y rocas naturales */
function crearFondo(C: Calidad): THREE.Group {
  const grupo = new THREE.Group();
  const seg = C.alta ? 220 : 110;
  const g = new THREE.PlaneGeometry(220, 220, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute("position"), col = new Float32Array(p.count * 3);
  const arena = new THREE.Color(0x8a7f68), limo = new THREE.Color(0x4e5a52), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, fbm(x * 0.05, z * 0.05, 5) * 3 + Math.sin(x * 0.9 + fbm(x * 0.1, z * 0.1) * 6) * 0.08);
    c.copy(arena).lerp(limo, fbm(x * 0.08 + 7, z * 0.08, 3));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const suelo = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  suelo.position.y = Y_FONDO - 5.5;
  grupo.add(suelo);
  const v = new THREE.Vector3();
  for (let i = 0; i < C.rocas; i++) {
    const rg = new THREE.IcosahedronGeometry(1, 3), rp = rg.getAttribute("position");
    for (let k = 0; k < rp.count; k++) {
      v.fromBufferAttribute(rp, k).multiplyScalar(0.75 + fbm(v.x * 1.8 + i, v.y * 1.8 + v.z, 4) * 0.6);
      rp.setXYZ(k, v.x, v.y, v.z);
    }
    rg.computeVertexNormals();
    const roca = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(azar(0.05, 0.12), 0.18, azar(0.09, 0.16)), roughness: 1, flatShading: true }));
    roca.position.set(azar(-30, 30), Y_FONDO - 4.6, azar(-44, -8));
    roca.scale.set(azar(1, 3.2), azar(0.6, 1.8), azar(1, 3));
    roca.rotation.y = azar(0, 6);
    roca.userData.proceso = true;
    grupo.add(roca);
  }
  return grupo;
}

/** Rocas, guijarros, conchas, erizos y estrellas del modelo del equipo, en instancias y apoyados en el relieve del fondo */
function poblarFondo(fondo: THREE.Group, C: Calidad): void {
  void cargarModelo(MODELO_FONDO).then((raiz) => {
    if (!raiz) return;
    const piezas: [string, number, number, number][] = [ // prefijo, cantidad, tamaño mínimo, tamaño máximo
      ["Roca", C.rocas, 2, 6], ["Guijarro", C.rocas * 3, 0.4, 1], ["Concha", C.rocas, 0.5, 1.1], ["Erizo", Math.round(C.rocas / 3), 0.5, 0.9], ["Estrella", Math.round(C.rocas / 4), 0.7, 1.3],
    ];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    let hay = false;
    for (const [prefijo, n, mini, maxi] of piezas) {
      const fuentes = mallas(raiz, prefijo);
      if (!fuentes.length) continue;
      hay = true;
      const por = Math.ceil(n / fuentes.length);
      for (const f of fuentes) {
        const inst = new THREE.InstancedMesh(geometriaNormalizada(f, 1), materialDe(f) as THREE.Material, por);
        for (let i = 0; i < por; i++) {
          const x = azar(-30, 30), z = azar(-44, -8);
          p.set(x, Y_FONDO - 5.5 + fbm(x * 0.05, z * 0.05, 5) * 3 - 0.05, z);
          q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, azar(0, 6.28));
          s.setScalar(azar(mini, maxi));
          inst.setMatrixAt(i, m4.compose(p, q, s));
        }
        inst.frustumCulled = false;
        fondo.add(inst);
      }
    }
    if (hay) for (const o of [...fondo.children]) if (o.userData.proceso) fondo.remove(o);
  });
}

/** Zona sin oxígeno: una capa turbia donde se acaba el oxígeno (oxiclina) */
function crearOxiclina(): THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
  const oxiclina = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 } },
    vertexShader: "varying vec3 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }",
    fragmentShader: `uniform float uT; varying vec3 vP;
      float o(vec2 p){ return sin(p.x*0.3+uT*0.2)*sin(p.y*0.25-uT*0.15)+sin((p.x-p.y)*0.17+uT*0.1); }
      void main(){ float d = length(vP.xz - cameraPosition.xz); float n = 0.5 + 0.25*o(vP.xz);
        gl_FragColor = vec4(vec3(0.35,0.2,0.25), (0.28 + 0.18*n) * exp(-d*0.012)); }`,
  }));
  oxiclina.rotation.x = -Math.PI / 2;
  oxiclina.position.y = -11.5;
  return oxiclina;
}

/** Bajo el agua: techo, rayos de luz, fitoplancton, cardumen, zona sin oxígeno, nieve marina y fondo */
export function crearSubmarino(escena: THREE.Scene, C: Calidad): Capa {
  const grupo = new THREE.Group();
  const techo = crearTecho();
  const { rayos, material: matRayo } = crearRayos(C.rayos);
  const plancton = nube(C.plancton, [-30, 30, -11, -0.3, -34, 2], 0x7dffb0, 0.14);
  const nieve = nube(C.nieve, [-30, 30, Y_FONDO - 4, -12, -40, 2], 0xd8e6f0, 0.1);
  const turbidez = nube(C.turbidez, [-30, 30, -30, -11, -40, 2], 0xc98a7a, 0.16);
  const oxiclina = crearOxiclina();

  // el cardumen ondula al nadar: la cola se mueve más que la cabeza
  const matPez = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.25, roughness: 0.3, emissive: 0x1c3f4c, emissiveIntensity: 0.55, side: THREE.DoubleSide });
  const tiempoPez = { value: 0 };
  matPez.onBeforeCompile = (s) => {
    s.uniforms.uT = tiempoPez;
    s.vertexShader = "uniform float uT;\n" + s.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\nfloat fase = dot(instanceMatrix[3].xyz, vec3(1.3, 2.1, 0.7));\nfloat haciaCola = smoothstep(0.15, -0.42, position.x);\ntransformed.z += sin(uT * 11.0 + fase + position.x * 9.0) * 0.07 * haciaCola;");
  };
  const peces = new THREE.InstancedMesh(geometriaAnchoveta(), matPez, C.peces);
  const datos: Pez[] = Array.from({ length: C.peces }, () => ({ a: azar(0, Math.PI * 2), r: azar(1.5, 7.5), y: azar(-1.6, 1.6), v: azar(0.22, 0.32), d: azar(-0.5, 0.5), s: azar(1.1, 1.5) }));

  const fondo = crearFondo(C);
  poblarFondo(fondo, C);
  grupo.add(techo, rayos, plancton, nieve, turbidez, oxiclina, peces, fondo);
  escena.add(grupo);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), vp = new THREE.Vector3(), esc = new THREE.Vector3();
  return {
    actualizar(t, y) {
      grupo.visible = y < 2;
      if (!grupo.visible) return;
      techo.visible = y < 0;
      techo.material.uniforms.uT!.value = t;
      oxiclina.material.uniforms.uT!.value = t;
      turbidez.rotation.y = -t * 0.006;
      matRayo.uniforms.uT!.value = t;
      matRayo.uniforms.uFuerza!.value = THREE.MathUtils.clamp(1 + y / 18, 0, 1);
      rayos.visible = y < 1 && y > -20;
      plancton.rotation.y = t * 0.01;
      nieve.position.y = -((t * 0.15) % 6);
      tiempoPez.value = t;
      // cada pez gira alrededor de un centro que se desplaza y se orienta hacia donde nada
      const cx = Math.sin(t * 0.13) * 3, cz = -15 + Math.cos(t * 0.11) * 2.5, cy = -7.2 + Math.sin(t * 0.17) * 0.6;
      for (let i = 0; i < datos.length; i++) {
        const f = datos[i]!;
        f.a += f.v * 0.016;
        const r = f.r + Math.sin(t * 0.5 + i) * 0.35;
        vp.set(cx + Math.cos(f.a) * r, cy + f.y + Math.sin(t * 0.9 + i * 0.3) * 0.15, cz + Math.sin(f.a) * r * 0.55);
        e.set(0, -f.a - Math.PI / 2 + f.d * 0.2, Math.sin(t + i) * 0.06);
        q.setFromEuler(e);
        esc.setScalar(f.s);
        peces.setMatrixAt(i, m4.compose(vp, q, esc));
      }
      peces.instanceMatrix.needsUpdate = true;
    },
  };
}
