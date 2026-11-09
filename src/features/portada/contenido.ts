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
    titulo: "MAR PERUANO 360",
    texto: "Del satélite al fondo del mar peruano",
    botones: [{ texto: "Entrar al explorador →", accion: "entrar" }],
  },
  {
    de: 0.08, a: 0.19,
    titulo: "Visto desde el espacio",
    texto: "Los satélites miden cada día la temperatura del mar y su color. Del color se estima la clorofila: el fitoplancton.",
  },
  {
    de: 0.27, a: 0.39,
    titulo: "La costa peruana",
    texto: "El viento empuja el agua de la superficie mar afuera y hace subir agua fría y rica en nutrientes: el afloramiento. Por eso este mar es uno de los más productivos del mundo.",
  },
  {
    de: 0.43, a: 0.54,
    titulo: "0–50 m · Fitoplancton",
    texto: "Por cada grado que se calienta el mar, el fitoplancton cae entre 18 % y 33 % según la zona. Cuando se enfría, casi no se recupera.",
  },
  {
    de: 0.58, a: 0.69,
    titulo: "25–45 m · El cardumen",
    texto: "La anchoveta vive en esta capa y depende del fitoplancton y del zooplancton. En los años de El Niño su alimento se reduce en la costa central.",
  },
  {
    de: 0.74, a: 0.85,
    titulo: "50–150 m · Zona sin oxígeno",
    texto: "En años normales esta capa sube y aprieta al cardumen hacia la superficie. Con El Niño se hunde: hay más espacio, pero menos comida.",
  },
  {
    de: 0.9, a: 1.05,
    titulo: "200 m · El fondo",
    texto: "Ahora explora los datos satelitales mes a mes, desde 1998.",
    botones: [{ texto: "Entrar al explorador →", accion: "entrar" }],
  },
];

// Nombre de la capa según la altura de la cámara (y = 0 es la superficie; 1 unidad = 5 m bajo el agua)
export function nombreCapa(y: number): string {
  if (y > 30) return "Espacio";
  if (y > 0) return "Superficie";
  if (y > -10) return "Luz y fitoplancton";
  if (y > -30) return "Zona sin oxígeno";
  return "Fondo";
}
