/* Imágenes de los protagonistas para la pantalla de título (se dibujan una sola vez) */
import { dibujarKiri, dibujarLumi, dibujarNara } from "./antartida";
import { dibujarAnchi } from "./costa";
import { sprite } from "./sprites";

export interface Protagonista { nombre: string; que: string; src: string }

let cache: Protagonista[] | null = null;

export function protagonistas(): Protagonista[] {
  cache ??= [
    { nombre: "Lumi", que: "fitoplancton", src: sprite("lumi", dibujarLumi).toDataURL("image/png") },
    { nombre: "Kiri", que: "krill", src: sprite("kiri", dibujarKiri).toDataURL("image/png") },
    { nombre: "Nara", que: "ballena jorobada", src: sprite("nara", dibujarNara).toDataURL("image/png") },
    { nombre: "Anchi", que: "anchoveta", src: sprite("anchi", dibujarAnchi).toDataURL("image/png") },
  ];
  return cache;
}
