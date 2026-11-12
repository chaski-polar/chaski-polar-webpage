/* Personajes del prólogo antártico, dibujados con código (provisionales hasta tener los dibujos finales) */
import { lienzo, ojo, recortar, rellenar, rubor, silueta, TINTA, trazo, type Forma } from "../motor/dibujo";

/** Kiri, el krill antártico (mira a la derecha) */
export const dibujarKiri = (): HTMLCanvasElement => lienzo((g) => {
  const segmentos: Forma[] = [0, 1, 2, 3, 4, 5].map((i) => (c) => c.ellipse(56 + i * 19, 128 - i * 2, 19, 20 + i * 3, 0, 0, 7));
  const cola: Forma[] = [(c) => c.ellipse(30, 116, 22, 9, -0.6, 0, 7), (c) => c.ellipse(26, 132, 22, 9, 0, 0, 7), (c) => c.ellipse(30, 148, 22, 9, 0.6, 0, 7)];
  const cabeza: Forma[] = [(c) => c.ellipse(180, 116, 50, 42, -0.08, 0, 7), (c) => { c.moveTo(220, 100); c.lineTo(248, 106); c.lineTo(222, 118); }];
  const cuerpo = [...cola, ...segmentos, ...cabeza];
  for (let i = 0; i < 6; i++) trazo(g, (c) => { const x = 92 + i * 22; c.moveTo(x, 150); c.quadraticCurveTo(x - 10, 172, x - 4, 190); }, "#f39b80", 5); // patas nadadoras
  trazo(g, (c) => { c.moveTo(214, 92); c.bezierCurveTo(232, 52, 250, 40, 246, 18); }, "#f7b79c", 5); // antenas
  trazo(g, (c) => { c.moveTo(206, 88); c.bezierCurveTo(210, 50, 236, 52, 228, 30); }, "#f7b79c", 5);
  silueta(g, cuerpo, 16);
  rellenar(g, cuerpo, "#f07a5c");
  g.save();
  recortar(g, cuerpo);
  g.fillStyle = "#cf543b"; g.beginPath(); g.moveTo(0, 140); g.bezierCurveTo(80, 160, 160, 150, 256, 132); g.lineTo(256, 256); g.lineTo(0, 256); g.fill(); // sombra
  g.fillStyle = "#ffb59a"; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(52 + i * 19, 112 - i * 3, 8, 4, -0.3, 0, 7); g.fill(); } // brillos
  g.globalAlpha = 0.85; g.fillStyle = "#86c98a"; g.beginPath(); g.ellipse(162, 124, 22, 14, -0.1, 0, 7); g.fill(); // estómago verde: comió fitoplancton
  g.restore();
  g.strokeStyle = TINTA; g.lineWidth = 4;
  for (let i = 1; i < 6; i++) { g.beginPath(); const x = 46 + i * 19; g.arc(x, 128 - i * 2, 18 + i * 3, -0.9, 0.9); g.stroke(); } // segmentos
  ojo(g, 198, 104, 21);
  rubor(g, 214, 134);
  g.lineWidth = 4; g.beginPath(); g.arc(228, 126, 6, 0.3, 2.2); g.stroke(); // sonrisa
});

/** Pingüino de Adelia, de frente */
export const dibujarPinguino = (): HTMLCanvasElement => lienzo((g) => {
  const pies: Forma[] = [(c) => c.ellipse(98, 236, 24, 10, 0.1, 0, 7), (c) => c.ellipse(158, 236, 24, 10, -0.1, 0, 7)];
  const aletas: Forma[] = [(c) => c.ellipse(50, 160, 17, 48, 0.45, 0, 7), (c) => c.ellipse(206, 160, 17, 48, -0.45, 0, 7)];
  const cuerpo: Forma[] = [(c) => c.ellipse(128, 146, 76, 96, 0, 0, 7)];
  silueta(g, [...pies, ...aletas, ...cuerpo], 16);
  rellenar(g, pies, "#f39c12"); rellenar(g, aletas, "#273444"); rellenar(g, cuerpo, "#273444");
  g.save();
  recortar(g, [...cuerpo, ...aletas]);
  g.fillStyle = "#1a232e"; g.beginPath(); g.ellipse(214, 150, 70, 120, 0, 0, 7); g.fill(); // sombra lateral
  g.fillStyle = "#3d5168"; g.beginPath(); g.ellipse(84, 70, 22, 12, -0.6, 0, 7); g.fill(); // brillo en la cabeza
  g.restore();
  g.fillStyle = "#f6f8fb"; g.beginPath(); g.ellipse(128, 172, 54, 66, 0, 0, 7); g.fill(); // pecho blanco
  g.save(); g.beginPath(); g.ellipse(128, 172, 54, 66, 0, 0, 7); g.clip(); g.fillStyle = "#d5e1eb"; g.beginPath(); g.ellipse(176, 182, 30, 80, 0, 0, 7); g.fill(); g.restore();
  g.strokeStyle = TINTA; g.lineWidth = 5; g.beginPath(); g.ellipse(128, 172, 54, 66, 0, 0, 7); g.stroke();
  for (const x of [100, 156]) { // ojos con anillo blanco, propios del pingüino de Adelia
    g.fillStyle = "#fff"; g.beginPath(); g.arc(x, 92, 21, 0, 7); g.fill(); g.lineWidth = 5; g.strokeStyle = TINTA; g.stroke();
    g.fillStyle = TINTA; g.beginPath(); g.ellipse(x + 3, 94, 11, 13, 0, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(x + 7, 88, 4.5, 0, 7); g.fill();
  }
  rubor(g, 92, 122); rubor(g, 164, 122);
  g.fillStyle = "#3a2a25"; g.strokeStyle = TINTA; g.lineWidth = 5; // pico
  g.beginPath(); g.moveTo(112, 112); g.quadraticCurveTo(128, 104, 144, 112); g.lineTo(128, 136); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#e8603c"; g.beginPath(); g.moveTo(121, 126); g.lineTo(135, 126); g.lineTo(128, 136); g.closePath(); g.fill();
});

/** Mancha de fitoplancton: un grupo de células verdes */
export const dibujarFito = (): HTMLCanvasElement => lienzo((g) => {
  const celulas: [number, number, number][] = [[128, 128, 46], [70, 100, 30], [186, 96, 32], [80, 178, 28], [180, 176, 30], [128, 58, 24], [128, 206, 22]];
  for (const [x, y, r] of celulas) {
    g.fillStyle = "#4fd18b"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.lineWidth = 7; g.strokeStyle = TINTA; g.stroke();
    g.fillStyle = "#b8f5cf"; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, 7); g.fill();
  }
  g.fillStyle = TINTA; g.beginPath(); g.arc(116, 124, 6, 0, 7); g.arc(142, 124, 6, 0, 7); g.fill();
  g.lineWidth = 5; g.beginPath(); g.arc(129, 138, 10, 0.2, Math.PI - 0.2); g.stroke();
});

/** Lumi, una diatomea: caja de vidrio con cloroplastos verdes (vista de lado) */
export const dibujarLumi = (): HTMLCanvasElement => lienzo((g) => {
  const caja: Forma[] = [(c) => c.roundRect(40, 70, 176, 116, 50)];
  silueta(g, caja, 14);
  rellenar(g, caja, "#d9f3e6");
  g.save();
  recortar(g, caja);
  g.fillStyle = "#b5e3cc"; g.fillRect(140, 60, 90, 140); // sombra
  g.fillStyle = "#e9f8f1"; g.fillRect(40, 118, 176, 18); // banda donde se unen las dos mitades de la caja
  for (const [x, y, r] of [[78, 98, 14], [110, 160, 12], [176, 96, 12], [186, 156, 14], [70, 158, 10]] as const) { // cloroplastos
    g.fillStyle = "#4fb36f"; g.beginPath(); g.ellipse(x, y, r * 1.4, r, 0.4, 0, 7); g.fill();
  }
  g.restore();
  g.strokeStyle = TINTA; g.lineWidth = 4;
  g.beginPath(); g.moveTo(44, 118); g.lineTo(212, 118); g.moveTo(44, 136); g.lineTo(212, 136); g.stroke();
  for (let x = 62; x < 210; x += 18) { g.beginPath(); g.moveTo(x, 74); g.lineTo(x, 82); g.moveTo(x, 174); g.lineTo(x, 182); g.stroke(); } // poros del vidrio
  ojo(g, 110, 112, 15); ojo(g, 150, 112, 15);
  rubor(g, 96, 142, 0.8); rubor(g, 166, 142, 0.8);
  g.lineWidth = 4; g.beginPath(); g.arc(130, 140, 9, 0.3, Math.PI - 0.3); g.stroke();
});

/** Nutriente: una chispa azul (nitrato, fosfato y silicato que suben del fondo) */
export const dibujarNutriente = (): HTMLCanvasElement => lienzo((g) => {
  const estrella: Forma[] = [(c) => {
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 22 : 54; const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
    c.closePath();
  }];
  silueta(g, estrella, 10);
  rellenar(g, estrella, "#7fd3ff");
  g.fillStyle = "#e6f7ff"; g.beginPath(); g.arc(56, 54, 9, 0, 7); g.fill();
}, 128, 128);

/** Nara, la ballena jorobada (mira a la derecha): aletas pectorales largas y blancas, surcos en la garganta */
export const dibujarNara = (): HTMLCanvasElement => lienzo((g) => {
  const cuerpo: Forma[] = [
    (c) => { c.moveTo(40, 128); c.quadraticCurveTo(120, 70, 250, 104); c.quadraticCurveTo(268, 128, 250, 150); c.quadraticCurveTo(140, 186, 40, 140); c.closePath(); },
    (c) => { c.moveTo(48, 132); c.quadraticCurveTo(20, 96, 6, 92); c.quadraticCurveTo(22, 124, 6, 166); c.quadraticCurveTo(24, 160, 48, 138); c.closePath(); }, // cola
    (c) => { c.moveTo(118, 84); c.lineTo(132, 66); c.lineTo(140, 84); c.closePath(); }, // joroba y aleta dorsal
  ];
  const aleta: Forma[] = [(c) => { c.moveTo(178, 150); c.quadraticCurveTo(160, 200, 116, 226); c.quadraticCurveTo(150, 214, 194, 156); c.closePath(); }];
  silueta(g, [...cuerpo, ...aleta], 14);
  rellenar(g, cuerpo, "#33475b");
  g.save();
  recortar(g, cuerpo);
  g.fillStyle = "#26374a"; g.fillRect(0, 70, 300, 40); // lomo más oscuro
  g.fillStyle = "#dfe7ec"; g.beginPath(); g.ellipse(200, 160, 60, 18, -0.15, 0, 7); g.fill(); // garganta clara
  g.strokeStyle = "#9fb0bd"; g.lineWidth = 3;
  for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(150, 152 + k * 6); g.quadraticCurveTo(200, 160 + k * 5, 248, 142 + k * 4); g.stroke(); } // surcos
  g.restore();
  rellenar(g, aleta, "#eef3f6");
  g.fillStyle = "#c9d5dc"; g.beginPath(); g.ellipse(150, 196, 14, 6, -0.9, 0, 7); g.fill();
  ojo(g, 212, 124, 9);
  g.fillStyle = "#56697a"; for (const [x, y] of [[236, 112], [226, 104], [242, 122]] as const) { g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); } // tubérculos de la cabeza
  rubor(g, 214, 142, 0.6);
}, 272, 256);

/** Flecha de corriente (apunta hacia arriba del lienzo) */
export const dibujarFlecha = (): HTMLCanvasElement => lienzo((g) => {
  g.fillStyle = "rgba(255,255,255,0.85)"; g.strokeStyle = "rgba(29,43,54,0.7)"; g.lineWidth = 6;
  g.beginPath(); g.moveTo(64, 8); g.lineTo(112, 64); g.lineTo(82, 64); g.lineTo(82, 120); g.lineTo(46, 120); g.lineTo(46, 64); g.lineTo(16, 64); g.closePath(); g.fill(); g.stroke();
}, 128, 128);
