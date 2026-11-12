/* Personajes del mar peruano, dibujados con código (provisionales: primero la jugabilidad, luego el arte) */
import { lienzo, ojo, recortar, rellenar, rubor, silueta, TINTA, trazo, type Forma } from "../motor/dibujo";

const cuerpoAnchoveta: Forma[] = [
  (c) => { c.moveTo(20, 128); c.quadraticCurveTo(110, 66, 214, 112); c.quadraticCurveTo(236, 128, 214, 144); c.quadraticCurveTo(110, 186, 20, 128); },
  (c) => { c.moveTo(34, 128); c.lineTo(4, 96); c.lineTo(14, 128); c.lineTo(4, 160); c.closePath(); }, // cola
];

function pintarAnchoveta(g: CanvasRenderingContext2D, conCara: boolean): void {
  silueta(g, cuerpoAnchoveta, 14);
  rellenar(g, cuerpoAnchoveta, "#dfe9ef");
  g.save();
  recortar(g, cuerpoAnchoveta);
  g.fillStyle = "#3d7f97"; g.beginPath(); g.moveTo(0, 0); g.lineTo(256, 0); g.lineTo(256, 118); g.quadraticCurveTo(120, 100, 0, 124); g.fill(); // lomo azul verdoso
  g.fillStyle = "#b9c9d3"; g.fillRect(0, 140, 256, 60); // vientre en sombra
  g.strokeStyle = "#f4f8fa"; g.lineWidth = 6; g.beginPath(); g.moveTo(40, 128); g.quadraticCurveTo(120, 118, 200, 124); g.stroke(); // franja plateada
  g.restore();
  g.strokeStyle = TINTA; g.lineWidth = 4; g.beginPath(); g.arc(170, 126, 22, -1, 1); g.stroke(); // opérculo
  if (conCara) {
    ojo(g, 196, 116, 13);
    rubor(g, 186, 142, 0.7);
    g.lineWidth = 4; g.beginPath(); g.arc(214, 134, 6, 0.4, 2.2); g.stroke();
  } else {
    g.fillStyle = TINTA; g.beginPath(); g.arc(198, 118, 9, 0, 7); g.fill();
  }
}

/** Anchi, la anchoveta protagonista (mira a la derecha) */
export const dibujarAnchi = (): HTMLCanvasElement => lienzo((g) => pintarAnchoveta(g, true));

/** Una anchoveta del cardumen */
export const dibujarAnchoveta = (): HTMLCanvasElement => lienzo((g) => pintarAnchoveta(g, false), 128, 128);

/** Guanay en picada (cormorán guanay: negro con pecho blanco) */
export const dibujarGuanay = (): HTMLCanvasElement => lienzo((g) => {
  const alas: Forma[] = [(c) => { c.moveTo(128, 120); c.quadraticCurveTo(40, 60, 10, 20); c.quadraticCurveTo(70, 96, 112, 150); c.closePath(); },
    (c) => { c.moveTo(128, 120); c.quadraticCurveTo(216, 60, 246, 20); c.quadraticCurveTo(186, 96, 144, 150); c.closePath(); }];
  const cuerpo: Forma[] = [(c) => c.ellipse(128, 150, 30, 62, 0, 0, 7), (c) => c.ellipse(128, 222, 20, 22, 0, 0, 7)];
  silueta(g, [...alas, ...cuerpo], 14);
  rellenar(g, alas, "#22282f"); rellenar(g, cuerpo, "#22282f");
  g.fillStyle = "#f2f2ee"; g.beginPath(); g.ellipse(128, 132, 18, 36, 0, 0, 7); g.fill();
  trazo(g, (c) => { c.moveTo(128, 238); c.lineTo(128, 254); }, "#e9a23b", 5); // pico hacia abajo
  ojo(g, 116, 214, 7); ojo(g, 140, 214, 7);
  g.fillStyle = "#e05a4f"; g.beginPath(); g.arc(128, 204, 5, 0, 7); g.fill();
});

/** Lobo marino chusco (mira a la derecha) */
export const dibujarLobo = (): HTMLCanvasElement => lienzo((g) => {
  const cuerpo: Forma[] = [
    (c) => { c.moveTo(16, 150); c.quadraticCurveTo(60, 96, 150, 104); c.quadraticCurveTo(210, 92, 236, 118); c.quadraticCurveTo(240, 150, 196, 154); c.quadraticCurveTo(110, 190, 16, 150); },
    (c) => { c.moveTo(30, 150); c.lineTo(4, 126); c.lineTo(8, 176); c.closePath(); },
    (c) => c.ellipse(132, 170, 34, 14, 0.5, 0, 7),
  ];
  silueta(g, cuerpo, 14);
  rellenar(g, cuerpo, "#8a5a3c");
  g.save(); recortar(g, cuerpo); g.fillStyle = "#6c432c"; g.fillRect(0, 140, 256, 80); g.fillStyle = "#b07a55"; g.beginPath(); g.ellipse(190, 112, 26, 10, -0.2, 0, 7); g.fill(); g.restore();
  ojo(g, 206, 114, 11);
  g.fillStyle = TINTA; g.beginPath(); g.arc(234, 124, 6, 0, 7); g.fill();
  g.strokeStyle = TINTA; g.lineWidth = 3;
  for (const dy of [-4, 2, 8]) { g.beginPath(); g.moveTo(226, 130); g.lineTo(250, 128 + dy); g.stroke(); } // bigotes
});

/** Letrero con el nombre de una zona */
export const dibujarLetrero = (texto: string): HTMLCanvasElement => lienzo((g) => {
  g.font = "bold 44px Trebuchet MS, sans-serif";
  const w = Math.min(500, g.measureText(texto).width + 48);
  const x = (512 - w) / 2;
  g.fillStyle = TINTA; g.beginPath(); g.roundRect(x + 6, 22, w, 84, 16); g.fill();
  g.fillStyle = "#fbf6ea"; g.strokeStyle = TINTA; g.lineWidth = 6; g.beginPath(); g.roundRect(x, 16, w, 84, 16); g.fill(); g.stroke();
  g.fillStyle = TINTA; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(texto, 256, 60);
}, 512, 128);
