// Textos de cada tramo del descenso. "de" y "a" son el progreso del scroll (0 = arriba, 1 = fondo)
// en el que aparece cada texto. Las cifras provienen de análisis exploratorios con datos satelitales
// (clorofila ESA OC-CCI, temperatura NOAA, índice Niño 1+2 NOAA) para cinco zonas de la costa peruana.

export interface Boton {
  texto: string;
  accion?: "entrar";
  href?: string;
}

export interface Seccion {
  de: number;
  a: number;
  principal?: boolean;
  titulo: string;
  texto: string;
  botones?: Boton[];
}

export const SECCIONES: readonly Seccion[] = [
  {
    de: 0, a: 0.05, principal: true,
    titulo: "Chaski Polar",
    texto: "Explore a changing ocean, from satellite to seafloor",
    botones: [{ texto: "Enter the explorer →", accion: "entrar" }, { texto: "Play Cardumen", href: "/juego" }],
  },
  {
    de: 0.08, a: 0.19,
    titulo: "Seen from space",
    texto: "Satellites measure sea temperature and color every day. Chlorophyll, and therefore phytoplankton, is estimated from that color.",
  },
  {
    de: 0.27, a: 0.39,
    titulo: "The Peruvian coast",
    texto: "Wind pushes surface water offshore and brings up cold, nutrient-rich water: upwelling. That is why this sea is among the most productive in the world.",
  },
  {
    de: 0.43, a: 0.54,
    titulo: "0–50 m · Phytoplankton",
    texto: "In the central and southern zones, chlorophyll falls by about 18% to 30% per degree of warming. Cooling responses differ by zone: this is an observed pattern, not a forecast.",
  },
  {
    de: 0.58, a: 0.69,
    titulo: "25–45 m · The school",
    texto: "Anchoveta live in this layer and depend on phytoplankton and zooplankton. During El Niño years, their food declines along the central coast.",
  },
  {
    de: 0.74, a: 0.85,
    titulo: "50–150 m · Oxygen minimum zone",
    texto: "In normal years this layer rises and compresses the school toward the surface. During El Niño it sinks: there is more space, but less food.",
  },
  {
    de: 0.9, a: 1.05,
    titulo: "200 m · The seafloor",
    texto: "What changes, where, and how much? Explore the satellite record and test whether a trend is significant.",
    botones: [{ texto: "Enter the explorer →", accion: "entrar" }, { texto: "Play Cardumen", href: "/juego" }],
  },
];

// Nombre de la capa según la altura de la cámara (y = 0 es la superficie; 1 unidad = 5 m bajo el agua)
export function nombreCapa(y: number): string {
  if (y > 30) return "Space";
  if (y > 0) return "Surface";
  if (y > -10) return "Light and phytoplankton";
  if (y > -30) return "Oxygen minimum zone";
  return "Seafloor";
}
