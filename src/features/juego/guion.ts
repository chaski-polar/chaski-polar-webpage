/* Lo que dicen los guías en cada momento del juego. Las cifras salen de los datos reales del motor del mar.
   Cuidado científico: la Antártida y el Perú se conectan por los animales que migran, no por el mar
   (los análisis del proyecto no encontraron relación entre el fitoplancton antártico y el peruano). */
import type { Linea } from "./dialogo/estado";
import type { PuntoNara } from "./escenas/nara";
import type { Mes } from "./logica/cardumen";
import type { Mar } from "./motor/mar";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const n1 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1, signDisplay: "exceptZero" });
const n2 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });

export const META_KIRI = 10;

/** Clorofila real del último verano antártico medido, como frase de ORBI */
function ultimoVeranoAntartico(mar: Mar): string {
  for (let i = mar.fechas.length - 1; i >= 0; i--) {
    const e = mar.estado("peninsula_antartica", i);
    const mes = Number(e.fecha.slice(5, 7));
    if (e.clorofila != null && (mes <= 3 || mes >= 11)) return `En ${MESES[mes - 1]} de ${e.fecha.slice(0, 4)} medí ${n2.format(e.clorofila)} mg/m³ de clorofila frente a la Península Antártica.`;
  }
  return "";
}

export function introLumi(mar: Mar): Linea[] {
  const dato = ultimoVeranoAntartico(mar);
  return [
    { quien: "orbi", texto: "Hola, soy ORBI, un satélite. Desde aquí arriba mido el color del mar: donde hay fitoplancton, el mar se ve más verde." },
    ...(dato ? [{ quien: "orbi" as const, texto: `${dato} Es primavera y el hielo marino empieza a abrirse.` }] : []),
    { quien: "gaia", texto: "Lumi es una diatomea, un tipo de fitoplancton. Para crecer necesita luz, que llega desde arriba, y nutrientes, que suben desde abajo." },
    { quien: "gaia", texto: "Busca las chispas azules y vuelve a la luz. Bajo el hielo casi no llega el sol. Cuando estés llena, te dividirás. WASD para moverte; Q sube y E baja." },
  ];
}

export const finLumi: Linea[] = [
  { quien: "gaia", texto: "Así nace una floración: cada célula se divide una y otra vez. Aquí sobran nutrientes; lo que suele faltar es luz, y también hierro." },
  { quien: "orbi", texto: "Y alguien ya viene a comer…" },
];

export function introKiri(): Linea[] {
  return [
    { quien: "gaia", texto: "Kiri es un krill antártico, un crustáceo pequeño que se alimenta de fitoplancton." },
    { quien: "gaia", texto: `Come ${META_KIRI} manchas verdes y esquiva a los pingüinos: si te alcanzan, pierdes parte de lo comido.` },
    { quien: "kiri", texto: "¡Entendido! Nada de acercarme a los pingüinos." },
  ];
}

export const finKiri: Linea[] = [
  { quien: "gaia", texto: "El krill es el alimento de pingüinos, focas y ballenas: sostiene casi toda la vida antártica." },
  { quien: "orbi", texto: "Ahí viene una de esas ballenas. Y está a punto de emprender un viaje muy largo." },
];

export const introNara: Linea[] = [
  { quien: "gaia", texto: "Nara es una ballena jorobada. En verano come krill en la Antártida y en invierno viaja al norte para tener a su cría en aguas cálidas, frente a Ecuador y el norte del Perú." },
  { quien: "gaia", texto: "Durante el viaje casi no come: vive de la grasa que juntó. Aprovecha las corrientes (las flechas) para gastar menos." },
  { quien: "orbi", texto: "Nada hasta el anillo amarillo, frente a Piura." },
];

export const puntoNara: Record<PuntoNara, Linea[]> = {
  drake: [{ quien: "orbi", texto: "Estás en la Corriente Circumpolar Antártica: da la vuelta al continente y empuja hacia el este. Sal de ella hacia el norte." }],
  chile: [{ quien: "gaia", texto: "Pegada a la costa sube la Corriente de Humboldt: agua fría que va hacia el norte. ¡Aprovéchala!" }],
  peru: [{ quien: "orbi", texto: "Ya estás frente al Perú. Aquí el viento hace subir agua fría con nutrientes: por eso este mar es tan rico en anchoveta." }],
};

export const finNara: Linea[] = [
  { quien: "gaia", texto: "Nara llegó al norte del Perú, como las jorobadas que cada año llegan entre junio y octubre." },
  { quien: "gaia", texto: "La ballena une la Antártida y el Perú, pero la anchoveta depende del mar frente a su costa." },
  { quien: "orbi", texto: "En nuestros datos, el fitoplancton antártico no sube ni baja junto con el del Perú. Aquí lo que más pesa es El Niño." },
  { quien: "orbi", texto: "Mira ahí abajo: un cardumen de anchovetas. Anchi, te toca." },
];

/** Contexto de cada año de la campaña */
const CONTEXTO_ANIO: Record<number, Linea> = {
  2004: { quien: "gaia", texto: "Un año de agua fría y comida abundante: buen momento para aprender." },
  1998: { quien: "gaia", texto: "Es El Niño de 1997-98, uno de los más fuertes que se han medido. Prepárate." },
  2000: { quien: "gaia", texto: "Después del gran Niño el agua volvió a enfriarse. El cardumen es más pequeño: toca reconstruirlo." },
  2017: { quien: "gaia", texto: "Este año llega un Niño costero: un golpe corto y desigual a inicios de año, frente al Perú y Ecuador." },
  2023: { quien: "gaia", texto: "Otro Niño costero, más largo. Ese año se suspendió la primera temporada de pesca de anchoveta." },
  2026: { quien: "orbi", texto: "El Niño 2026 está en curso. Tengo datos hasta agosto: jugarás de enero a agosto." },
};

/** Lo que dicen los guías al empezar cada año del cardumen, con los datos reales de enero frente a Chimbote */
export function introCardumen(mar: Mar, anio: number, primera: boolean): Linea[] {
  const e = mar.estado("chimbote", mar.indice(anio, 1));
  const temp = e.anomaliaTemp == null ? "" : ` el mar estaba ${n1.format(e.anomaliaTemp)} °C frente a lo normal y`;
  const lineas: Linea[] = [{ quien: "orbi", texto: `Año ${anio}. En enero, frente a Chimbote,${temp} la comida estaba al ${Math.round(e.alimento * 100)} % de lo normal.` }];
  const contexto = CONTEXTO_ANIO[anio];
  if (contexto) lineas.push(contexto);
  if (primera) lineas.unshift(
    { quien: "gaia", texto: "Anchi, tú guías al cardumen durante un año. Come las manchas verdes: es el fitoplancton que mide ORBI desde el espacio." },
    { quien: "gaia", texto: "Nada con WASD o flechas; Q sube y E baja. Con C juntas al cardumen: así se protege de los depredadores, pero come menos." },
    { quien: "gaia", texto: "Cada zona de la costa tiene su propia comida cada mes. Si una zona se queda sin alimento, busca en otra." },
  );
  return lineas;
}

/** Diálogos que aparecen la primera vez que ocurre algo durante el año del cardumen */
export function hitoCardumen(id: string, m: Mes): Linea[] {
  switch (id) {
    case "nino": return [
      { quien: "orbi", texto: `El índice Niño 1+2 está en ${n1.format(m.nino12 ?? 0)} °C: es El Niño. El agua cálida trae pocos nutrientes y el fitoplancton cae, sobre todo en Chimbote y Callao.` },
      { quien: "gaia", texto: "Con El Niño la zona sin oxígeno se hunde: hay más espacio abajo, pero menos comida. Paita casi no cambia: puede ser un refugio." },
    ];
    case "oxigeno_alto": return [{ quien: "gaia", texto: "La zona sin oxígeno subió y nos aprieta hacia la superficie, donde cazan los guanayes. Si ves una sombra arriba, baja." }];
    case "veda": return [{ quien: "orbi", texto: "La comida en la costa central cayó a menos de la mitad: este mes hay veda y las bolicheras no salen." }];
    case "red": return [{ quien: "gaia", texto: "¡Una bolichera tiende su red! Sal del círculo o baja más hondo de lo que llega la red. Juntos, el cardumen es más fácil de atrapar." }];
    default: return [];
  }
}

/** Cierre de la campaña con los datos reales de 2026 */
export function finalCampana(mar: Mar): Linea[] {
  const ene = mar.indice(2026, 1);
  let max = -Infinity, mesMax = 1;
  for (let m = 1; m <= 12; m++) {
    const i = mar.indice(2026, m);
    const n = i >= 0 ? mar.estado("chimbote", i).nino12 : null;
    if (n != null && n > max) { max = n; mesMax = m; }
  }
  const inicio = ene >= 0 ? mar.estado("chimbote", ene).nino12 : null;
  const lineas: Linea[] = [];
  if (inicio != null && Number.isFinite(max)) lineas.push({ quien: "orbi", texto: `En 2026 el índice Niño 1+2 pasó de ${n1.format(inicio)} °C en enero a ${n1.format(max)} °C en ${MESES[mesMax - 1]}. La segunda temporada de pesca de anchoveta de 2026 se canceló: cuota cero.` });
  lineas.push(
    { quien: "gaia", texto: "Generación tras generación, el cardumen vivió los mismos años que midieron los satélites." },
    { quien: "orbi", texto: "Esta historia aún no termina: los satélites siguen midiendo." },
  );
  return lineas;
}
