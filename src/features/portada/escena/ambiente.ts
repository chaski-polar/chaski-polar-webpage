import * as THREE from "three";
import { Y_FONDO } from "../scroll";

/** Sol bajo de la tarde, hacia el mar */
export const DIR_SOL = new THREE.Vector3(-0.55, 0.32, -0.77).normalize();
/** En órbita el sol ilumina la cara visible de la Tierra */
export const DIR_SOL_ESPACIO = new THREE.Vector3(-0.75, 0.35, 0.55).normalize();

// Color del agua según la profundidad: la zona sin oxígeno se vuelve turbia y oscura
const BAJO_EL_AGUA: readonly (readonly [number, number])[] = [[0, 0x1a6f8f], [-10, 0x0f4d6e], [-18, 0x2a3348], [-28, 0x2b2236], [Y_FONDO, 0x0b1420]];
const cA = new THREE.Color(), cB = new THREE.Color();
function colorBajo(y: number): THREE.Color {
  for (let i = 0; i < BAJO_EL_AGUA.length - 1; i++) {
    const [ya, ca] = BAJO_EL_AGUA[i]!, [yb, cb] = BAJO_EL_AGUA[i + 1]!;
    if (y <= ya && y >= yb) return cA.setHex(ca).lerp(cB.setHex(cb), (ya - y) / (ya - yb));
  }
  return cA.setHex(0x070b14);
}

/** Luces, niebla, color de fondo y exposición según la altura de la cámara */
export function crearAmbiente(escena: THREE.Scene, renderer: THREE.WebGLRenderer): { actualizar(y: number, camara: THREE.Camera): void } {
  const sol = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sol.position.copy(DIR_SOL).multiplyScalar(100);
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x1d2b36, 0.8);
  // en el fondo no llega la luz del sol: una luz suave acompaña a la cámara, como la de un vehículo submarino
  const lampara = new THREE.PointLight(0xcfe6ff, 0, 60, 1.2);
  escena.add(sol, hemi, lampara);
  const niebla = new THREE.FogExp2(0x0f4d6e, 0.02);
  escena.fog = niebla;
  const fondo = new THREE.Color();
  const direccionSol = new THREE.Vector3();

  return {
    actualizar(y, camara) {
      const debajo = y < 0;
      const atmosfera = 1 - THREE.MathUtils.smoothstep(y, 34, 66);
      direccionSol.copy(DIR_SOL_ESPACIO).lerp(DIR_SOL, atmosfera).normalize();
      sol.position.copy(direccionSol).multiplyScalar(100);
      if (debajo) {
        fondo.copy(colorBajo(y));
        escena.background = fondo;
        niebla.color.copy(fondo);
        niebla.density = 0.018 + Math.min(0.016, -y * 0.0005);
        sol.intensity = Math.max(0.05, 2.6 * Math.exp(y / 9));
        hemi.intensity = 0.25 + 0.6 * Math.exp(y / 14);
        hemi.color.setHex(0x8fd3e8);
      } else {
        // en el cielo el fondo lo pinta el Sky de la superficie
        escena.background = fondo.setHex(0x02040a);
        niebla.color.setHex(0x9fb8c8);
        niebla.density = y > 40 ? 0 : 0.0016;
        sol.intensity = 2.6;
        hemi.intensity = 0.8;
        hemi.color.setHex(0xbfd9ff);
      }
      lampara.position.set(camara.position.x, y + 2, 2);
      lampara.intensity = THREE.MathUtils.clamp((-y - 22) / 10, 0, 1) * 90;
      renderer.toneMappingExposure = !debajo ? THREE.MathUtils.lerp(1, 0.55, atmosfera) : 0.95;
    },
  };
}
