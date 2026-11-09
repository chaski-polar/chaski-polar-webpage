import * as THREE from "three";
import { azar, sinContorno, toon, type Capa } from "./materiales";

// Mar low-poly animado, bolichera y aves
export function crearSuperficie(escena: THREE.Scene): Capa {
  const marGeo = new THREE.PlaneGeometry(240, 240, 48, 48);
  marGeo.rotateX(-Math.PI / 2);
  const posiciones = marGeo.getAttribute("position") as THREE.BufferAttribute;
  const base = Float32Array.from(posiciones.array);
  const mar = new THREE.Mesh(marGeo, sinContorno(toon(0x2f87b3, { transparent: true, opacity: 0.92, side: THREE.DoubleSide })));
  escena.add(mar);

  const barco = new THREE.Group();
  const casco = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1, 1.6), toon(0xc0392b)); casco.position.y = 0.3;
  const cabina = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1.2), toon(0xf7f3e8)); cabina.position.set(-0.8, 1.2, 0);
  const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), toon(0x333333)); mastil.position.set(0.9, 1.6, 0);
  barco.add(casco, cabina, mastil);
  barco.position.set(4, 0, -16);
  barco.rotation.y = 0.5;
  escena.add(barco);

  const aves = Array.from({ length: 6 }, () => {
    const ave = new THREE.Group();
    const alas = [-1, 1].map((lado) => {
      const ala = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.25), toon(0xffffff));
      ala.position.x = lado * 0.4;
      ave.add(ala);
      return { ala, lado };
    });
    ave.position.set(azar(-12, 12), azar(5, 9), azar(-24, -12));
    escena.add(ave);
    return { ave, alas };
  });

  return {
    actualizar(t, y) {
      const visible = y < 40;
      mar.visible = barco.visible = visible;
      if (!visible) return;
      const arr = posiciones.array;
      for (let i = 0; i < arr.length; i += 3) {
        const x = base[i] ?? 0, z = base[i + 2] ?? 0;
        arr[i + 1] = (base[i + 1] ?? 0) + Math.sin(x * 0.25 + t) * 0.25 + Math.cos(z * 0.2 + t * 0.8) * 0.2;
      }
      posiciones.needsUpdate = true;
      marGeo.computeVertexNormals();
      barco.position.y = Math.sin(t * 1.2) * 0.15;
      barco.rotation.z = Math.sin(t) * 0.04;
      aves.forEach(({ ave, alas }, i) => {
        ave.position.x += 0.02;
        if (ave.position.x > 14) ave.position.x = -14;
        for (const { ala, lado } of alas) ala.rotation.z = lado * Math.sin(t * 6 + i) * 0.5;
      });
    },
  };
}
