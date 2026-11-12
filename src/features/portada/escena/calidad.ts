/* Nivel de detalle de la portada. Por defecto se elige según el equipo; se puede forzar con ?calidad=alta o ?calidad=baja.
   Además, montar.ts baja la resolución si el equipo no logra suficientes cuadros por segundo. */

export interface Calidad {
  alta: boolean;
  pixel: number;
  peces: number;
  plancton: number;
  nieve: number;
  turbidez: number;
  agua: number;
  rocas: number;
  segTierra: number;
  nubesAncho: number;
  aves: number;
  rayos: number;
}

export function elegirCalidad(): Calidad {
  const pedido = new URLSearchParams(location.search).get("calidad");
  const lento = /Mobi|Android/i.test(navigator.userAgent) || (navigator.hardwareConcurrency ?? 8) <= 4 || innerWidth < 700;
  const alta = pedido === "alta" || (pedido !== "baja" && !lento);
  return alta
    ? { alta, pixel: Math.min(devicePixelRatio, 1.75), peces: 900, plancton: 2600, nieve: 1800, turbidez: 1500, agua: 512, rocas: 40, segTierra: 96, nubesAncho: 1024, aves: 8, rayos: 9 }
    : { alta, pixel: 1, peces: 280, plancton: 900, nieve: 600, turbidez: 600, agua: 256, rocas: 18, segTierra: 64, nubesAncho: 512, aves: 5, rayos: 5 };
}
