/* Datos que comparten la portada y el explorador para que el paso de una página a la otra sea continuo:
   el mismo globo, el mismo giro y la misma distancia de cámara. */

export const RADIO_GLOBO = 10;
export const GIRO_INICIAL = -0.55; // deja Sudamérica al frente
export const INCLINACION = 0.15;
export const DISTANCIA_FINAL = RADIO_GLOBO + 3.5;
const CLAVE_GIRO = "giroGlobo";

export function guardarGiro(giro: number): void {
  try { sessionStorage.setItem(CLAVE_GIRO, String(giro)); } catch { /* almacenamiento bloqueado */ }
}

/** Giro con que terminó la transición de la portada (se lee una sola vez) */
export function tomarGiro(): number | null {
  try {
    const v = sessionStorage.getItem(CLAVE_GIRO);
    sessionStorage.removeItem(CLAVE_GIRO);
    const n = v == null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Punto de vista equivalente en globe.gl (latitud, longitud y altitud en radios del globo).
    En la portada la cámara mira el globo de frente: el centro de la imagen es el punto que el giro
    y la inclinación dejan mirando hacia la cámara. */
export function puntoDeVistaDesdeGiro(giro: number): { lat: number; lng: number; altitude: number } {
  const grados = 180 / Math.PI;
  const lng = ((((-90 - giro * grados) % 360) + 540) % 360) - 180;
  return { lat: INCLINACION * grados, lng, altitude: DISTANCIA_FINAL / RADIO_GLOBO - 1 };
}
