/* Retratos de los guías para los diálogos, dibujados con código (provisionales hasta tener los dibujos finales):
   ORBI, un satélite que mide el mar, y la Dra. Gaia, una científica del océano. */
import { lienzo, ojo, recortar, rellenar, rubor, silueta, TINTA, type Forma } from "../motor/dibujo";
import { dibujarKiri } from "./antartida";
import type { Hablante } from "../dialogo/estado";
import { sprite } from "./sprites";

/** ORBI: cuerpo dorado, paneles solares azules, antena y cara amable */
const dibujarOrbi = (): HTMLCanvasElement => lienzo((g) => {
  const paneles: Forma[] = [(c) => c.roundRect(8, 104, 62, 50, 6), (c) => c.roundRect(186, 104, 62, 50, 6)];
  const brazos: Forma[] = [(c) => c.rect(66, 122, 20, 12), (c) => c.rect(170, 122, 20, 12)];
  const cuerpo: Forma[] = [(c) => c.roundRect(80, 70, 96, 112, 22)];
  const antena: Forma[] = [(c) => c.ellipse(128, 202, 34, 14, 0, 0, 7), (c) => c.rect(122, 180, 12, 16)];
  silueta(g, [...paneles, ...brazos, ...cuerpo, ...antena], 14);
  rellenar(g, paneles, "#2d5fa8"); rellenar(g, brazos, "#9aa6b2"); rellenar(g, cuerpo, "#e2b93b"); rellenar(g, antena, "#e9edf2");
  g.save(); recortar(g, paneles); g.strokeStyle = "#7fa7e0"; g.lineWidth = 3;
  for (const x0 of [8, 186]) { for (let x = x0 + 15; x < x0 + 62; x += 15) { g.beginPath(); g.moveTo(x, 104); g.lineTo(x, 154); g.stroke(); } g.beginPath(); g.moveTo(x0, 129); g.lineTo(x0 + 62, 129); g.stroke(); }
  g.restore();
  g.save(); recortar(g, cuerpo); g.fillStyle = "#b98d22"; g.fillRect(146, 60, 40, 130); g.fillStyle = "#f6dc7d"; g.beginPath(); g.ellipse(102, 88, 12, 7, -0.5, 0, 7); g.fill(); g.restore();
  g.strokeStyle = TINTA; g.lineWidth = 6; g.beginPath(); g.moveTo(128, 70); g.lineTo(128, 40); g.stroke(); // varilla
  g.fillStyle = "#ff8a5c"; g.beginPath(); g.arc(128, 34, 10, 0, 7); g.fill(); g.lineWidth = 5; g.stroke();
  ojo(g, 108, 116, 15); ojo(g, 150, 116, 15);
  rubor(g, 96, 146, 0.8); rubor(g, 162, 146, 0.8);
  g.strokeStyle = TINTA; g.lineWidth = 5; g.beginPath(); g.arc(128, 146, 11, 0.25, Math.PI - 0.25); g.stroke();
});

/** Dra. Gaia: cabello con moño, lentes y chaqueta de campo */
const dibujarGaia = (): HTMLCanvasElement => lienzo((g) => {
  const pelo: Forma[] = [(c) => c.ellipse(128, 104, 74, 72, 0, 0, 7), (c) => c.arc(128, 30, 26, 0, 7)];
  const hombros: Forma[] = [(c) => { c.moveTo(40, 256); c.quadraticCurveTo(48, 184, 128, 180); c.quadraticCurveTo(208, 184, 216, 256); c.closePath(); }];
  const cara: Forma[] = [(c) => c.ellipse(128, 120, 54, 60, 0, 0, 7)];
  silueta(g, [...hombros, ...pelo, ...cara], 14);
  rellenar(g, hombros, "#2f7f8f"); rellenar(g, pelo, "#4a2f27"); rellenar(g, cara, "#c98f6b");
  g.save(); recortar(g, hombros); g.fillStyle = "#246573"; g.fillRect(140, 170, 90, 90); g.fillStyle = "#f2efe6"; g.beginPath(); g.moveTo(108, 182); g.lineTo(128, 214); g.lineTo(148, 182); g.fill(); g.restore();
  g.save(); recortar(g, cara); g.fillStyle = "#b07a58"; g.beginPath(); g.ellipse(170, 130, 30, 70, 0, 0, 7); g.fill(); g.restore();
  g.fillStyle = "#4a2f27"; g.beginPath(); g.moveTo(74, 100); g.quadraticCurveTo(110, 50, 182, 96); g.quadraticCurveTo(140, 78, 74, 100); g.fill(); // flequillo
  ojo(g, 108, 124, 13); ojo(g, 150, 124, 13);
  g.strokeStyle = TINTA; g.lineWidth = 5; // lentes
  g.beginPath(); g.arc(108, 124, 20, 0, 7); g.stroke(); g.beginPath(); g.arc(150, 124, 20, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(128, 122); g.lineTo(130, 122); g.stroke();
  rubor(g, 96, 152, 0.8); rubor(g, 162, 152, 0.8);
  g.beginPath(); g.arc(129, 154, 12, 0.3, Math.PI - 0.3); g.stroke();
});

const NOMBRES: Record<Hablante, string> = { orbi: "ORBI", gaia: "Dra. Gaia", kiri: "Kiri" };
const DIBUJOS: Record<Hablante, () => HTMLCanvasElement> = { orbi: dibujarOrbi, gaia: dibujarGaia, kiri: dibujarKiri };
const cache = new Map<Hablante, string>();

export const nombreDe = (h: Hablante): string => NOMBRES[h];

/** Retrato como imagen (data URL), dibujado una sola vez */
export function retratoDe(h: Hablante): string {
  let url = cache.get(h);
  if (!url) { url = sprite(h, DIBUJOS[h]).toDataURL("image/png"); cache.set(h, url); }
  return url;
}
