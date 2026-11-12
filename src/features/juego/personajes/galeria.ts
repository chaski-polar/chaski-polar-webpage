/* Imágenes de los protagonistas para la pantalla de título (se dibujan una sola vez) */
import { dibujarKiri, dibujarLumi, dibujarNara } from "./antartida";
import { dibujarAnchi } from "./costa";

export interface Protagonista { nombre: string; que: string; src: string }

let cache: Protagonista[] | null = null;

export function protagonistas(): Protagonista[] {
  cache ??= [
    { nombre: "Lumi", que: "fitoplancton", src: dibujarLumi().toDataURL("image/png") },
    { nombre: "Kiri", que: "krill", src: dibujarKiri().toDataURL("image/png") },
    { nombre: "Nara", que: "ballena jorobada", src: dibujarNara().toDataURL("image/png") },
    { nombre: "Anchi", que: "anchoveta", src: dibujarAnchi().toDataURL("image/png") },
  ];
  return cache;
}
