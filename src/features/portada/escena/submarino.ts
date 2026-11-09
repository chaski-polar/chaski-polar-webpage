import * as THREE from "three";
import { Y_FONDO } from "../scroll";
import { azar, sinContorno, toon, type Capa } from "./materiales";

interface Pez {
  a: number;
  r: number;
  y: number;
  v: number;
}

// Fitoplancton (0-50 m), cardumen (25-45 m), zona sin oxígeno (50-150 m), fondo (200 m) y rayos de luz
export function crearSubmarino(escena: THREE.Scene): Capa {
  const m4 = new THREE.Matrix4();

  const fito = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.18, 0), toon(0x5fdc96), 500);
  for (let i = 0; i < 500; i++) { m4.makeTranslation(azar(-30, 30), azar(-10, -0.5), azar(-30, -4)); fito.setMatrixAt(i, m4); }
  escena.add(fito);

  const peces = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.6, 5).rotateZ(-Math.PI / 2), toon(0xb9d3e3), 220);
  const pez: Pez[] = Array.from({ length: 220 }, () => ({ a: azar(0, 6.28), r: azar(2, 7), y: azar(-9.5, -5.5), v: azar(0.35, 0.6) }));
  escena.add(peces);

  const sinOxigeno = new THREE.Mesh(new THREE.BoxGeometry(200, 20, 200),
    sinContorno(new THREE.MeshBasicMaterial({ color: 0x5a1f3a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.BackSide })));
  sinOxigeno.position.y = -20;
  escena.add(sinOxigeno);

  const sueloGeo = new THREE.PlaneGeometry(160, 160, 40, 40);
  sueloGeo.rotateX(-Math.PI / 2);
  const ps = sueloGeo.getAttribute("position");
  for (let i = 0; i < ps.count; i++) ps.setY(i, Math.random() * 0.8);
  sueloGeo.computeVertexNormals();
  const suelo = new THREE.Mesh(sueloGeo, toon(0x6d8ea3));
  suelo.position.y = Y_FONDO - 4;
  escena.add(suelo);
  for (let i = 0; i < 30; i++) {
    const roca = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), toon(0x4f6577));
    roca.position.set(azar(-30, 30), Y_FONDO - 3.6, azar(-40, -8));
    roca.scale.set(azar(1, 3), azar(0.6, 2), azar(1, 3));
    escena.add(roca);
  }

  const rayos = new THREE.Group();
  const materialRayo = sinContorno(new THREE.MeshBasicMaterial({ color: 0xd8f3ff, transparent: true, opacity: 0.06,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  for (let i = 0; i < 8; i++) {
    const rayo = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2.5, 30, 6, 1, true), materialRayo);
    rayo.position.set(azar(-20, 20), -15, azar(-30, -10));
    rayo.rotation.z = 0.15;
    rayos.add(rayo);
  }
  escena.add(rayos);

  return {
    actualizar(t, y) {
      pez.forEach((f, i) => {
        f.a += f.v * 0.016;
        m4.makeRotationY(-f.a - Math.PI / 2);
        m4.setPosition(Math.cos(f.a) * f.r, f.y + Math.sin(t + i) * 0.2, -14 + Math.sin(f.a) * f.r);
        peces.setMatrixAt(i, m4);
      });
      peces.instanceMatrix.needsUpdate = true;
      rayos.visible = y < 2 && y > -16;
    },
  };
}
