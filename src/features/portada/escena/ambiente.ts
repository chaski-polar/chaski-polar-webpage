import * as THREE from "three";
import { Y_ESPACIO, Y_FONDO } from "../scroll";

// Color de fondo y de niebla según la altura: espacio, atardecer, cielo, agua clara y agua profunda
const TRAMOS: readonly (readonly [number, number])[] = [[Y_ESPACIO, 0x02040a], [45, 0x0a1430], [22, 0xf2a46b], [6, 0x9ccbe6], [0.01, 0x9ccbe6],
  [-0.01, 0x2f87b3], [-10, 0x155a85], [-22, 0x0b2f52], [Y_FONDO, 0x061a33]];
const a = new THREE.Color(), b = new THREE.Color();

function colorEn(y: number): THREE.Color {
  for (let i = 0; i < TRAMOS.length - 1; i++) {
    const [ya, ca] = TRAMOS[i]!, [yb, cb] = TRAMOS[i + 1]!;
    if (y <= ya && y >= yb) return a.setHex(ca).lerp(b.setHex(cb), (ya - y) / (ya - yb));
  }
  return a.setHex(y > 0 ? 0x02040a : 0x061a33);
}

export function crearAmbiente(escena: THREE.Scene): { actualizar(y: number): void } {
  const niebla = new THREE.Fog(0x000000, 10, 60);
  const fondo = new THREE.Color();
  escena.fog = niebla;
  escena.background = fondo;
  escena.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
  const sol = new THREE.DirectionalLight(0xffffff, 1.4);
  sol.position.set(5, 30, 10);
  escena.add(sol);
  return {
    actualizar(y) {
      const c = colorEn(y);
      fondo.copy(c);
      niebla.color.copy(c);
      niebla.near = y < 0 ? 4 : 30;
      niebla.far = y < 0 ? 45 : 260;
    },
  };
}
