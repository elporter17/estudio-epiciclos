// Fondos dibujados a mano (estilo «garabato de cuaderno») para las historias «¿Y si pudieras ver…?»: todo animado, sin
// fotos. Hoja de cuaderno + escena en bolígrafo azul coloreada con «marcador» (manchas translúcidas un poco corridas
// del trazo), con la línea que tiembla un poco. El suelo queda a la altura de los personajes (y ≈ 930 de 1080).
const azar = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const TINTA = '#1d4ed8';

function lapiz(ctx, rnd, amp) {
  const j = (v) => v + (rnd() - 0.5) * amp;
  return {
    linea(pts, { ancho = 4, color = TINTA } = {}) { ctx.strokeStyle = color; ctx.lineWidth = ancho; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(j(x), j(y)) : ctx.moveTo(j(x), j(y)))); ctx.stroke(); },
    caja(x, y, w, h, opc = {}) { this.linea([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], opc); },
    circulo(cx, cy, r, opc = {}) { const n = 22; this.linea(Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r]), opc); },
    // Marcador: una mancha translúcida corrida unos píxeles del contorno (como coloreado a mano)
    marca(pts, color, alfa = 0.45) { ctx.save(); ctx.globalAlpha *= alfa; ctx.fillStyle = color; ctx.beginPath(); const dx = 6, dy = 5; pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx + (rnd() - 0.5) * 6, y + dy + (rnd() - 0.5) * 6) : ctx.moveTo(x + dx, y + dy))); ctx.closePath(); ctx.fill(); ctx.restore(); },
    rect(x, y, w, h, color, alfa) { this.marca([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, alfa); this.caja(x, y, w, h); },
    disco(cx, cy, r, color, alfa) { const n = 22; this.marca(Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r]), color, alfa); this.circulo(cx, cy, r); }
  };
}

// Hoja de cuaderno (cuadrícula + margen rojo)
function hoja(ctx, W, H, oscuro = false) {
  ctx.fillStyle = oscuro ? '#1b2340' : '#fbfaf3'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = oscuro ? 'rgba(147,197,253,0.12)' : 'rgba(59,130,246,0.16)'; ctx.lineWidth = 2;
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(239,68,68,0.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(110, 0); ctx.lineTo(110, H); ctx.stroke();
}
const SUELO = 930;
function piso(l, W, color = '#d6b98c') { l.marca([[0, SUELO - 20], [W, SUELO - 20], [W, 1080], [0, 1080]], color, 0.35); l.linea([[0, SUELO - 20], [W, SUELO - 24]], { ancho: 5 }); }
function ventana(l, x, y, w, h, cielo = '#7dd3fc') { l.rect(x, y, w, h, cielo, 0.4); l.linea([[x + w / 2, y], [x + w / 2, y + h]]); l.linea([[x, y + h / 2], [x + w, y + h / 2]]); }

const ESCENAS = {
  cuarto(ctx, W, H, l) {
    hoja(ctx, W, H); ventana(l, 1350, 160, 360, 300); l.disco(1600, 230, 40, '#fde047', 0.6);
    // Cama
    l.rect(180, 640, 620, 190, '#93c5fd'); l.rect(180, 580, 160, 70, '#ffffff', 0.2); l.linea([[180, 830], [180, 900]]); l.linea([[800, 830], [800, 900]]);
    // Póster y repisa
    l.rect(900, 220, 230, 300, '#fda4af'); l.linea([[930, 470], [1100, 260]]); l.circulo(1015, 330, 40);
    l.linea([[1300, 560], [1700, 560]], { ancho: 6 }); l.rect(1330, 480, 60, 80, '#86efac'); l.rect(1410, 500, 90, 60, '#fdba74');
    piso(l, W);
  },
  cocina(ctx, W, H, l) {
    hoja(ctx, W, H); ventana(l, 820, 150, 300, 240);
    // Mueble de cocina y estufa
    l.rect(140, 560, 640, 300, '#fcd34d', 0.35); for (const x of [140, 353, 566]) l.caja(x + 20, 600, 173, 230); l.rect(140, 520, 640, 40, '#e5e7eb', 0.4);
    l.circulo(300, 500, 30); l.circulo(420, 500, 30);
    // Refri
    l.rect(1500, 280, 260, 580, '#e0f2fe', 0.6); l.linea([[1500, 500], [1760, 500]]); l.linea([[1530, 340], [1530, 440]], { ancho: 7 }); l.linea([[1530, 540], [1530, 660]], { ancho: 7 });
    // Taza con humo
    l.rect(980, 560, 80, 90, '#f9a8d4'); for (const dx of [0, 25]) l.linea([[1000 + dx, 540], [990 + dx, 500], [1010 + dx, 470]], { ancho: 3 });
    l.linea([[860, 650], [1200, 650]], { ancho: 6 });
    piso(l, W, '#c4b5fd');
  },
  calle(ctx, W, H, l) {
    hoja(ctx, W, H); l.disco(1700, 140, 60, '#fde047', 0.6);
    // Casas de colores
    const casas = [[120, '#fca5a5'], [470, '#86efac'], [820, '#93c5fd'], [1170, '#fde68a']];
    for (const [x, c] of casas) { l.rect(x, 380, 320, 460, c, 0.45); l.linea([[x - 15, 380], [x + 160, 280], [x + 335, 380]], { ancho: 5 }); l.rect(x + 40, 470, 90, 90, '#ffffff', 0.2); l.rect(x + 200, 640, 80, 200, '#a16207', 0.3); }
    // Puesto de aguacates
    l.rect(1530, 600, 330, 160, '#bbf7d0', 0.5); for (let k = 0; k < 6; k++) l.disco(1570 + k * 50, 580, 22, '#15803d', 0.7); l.linea([[1540, 600], [1540, 860]]); l.linea([[1850, 600], [1850, 860]]);
    l.linea([[0, 860], [W, 860]], { ancho: 5 }); l.marca([[0, 860], [W, 860], [W, 1080], [0, 1080]], '#9ca3af', 0.3);
    for (let x = 60; x < W; x += 240) l.linea([[x, 980], [x + 120, 980]], { ancho: 6, color: '#ca8a04' });
  },
  bus(ctx, W, H, l) {
    hoja(ctx, W, H);
    for (let k = 0; k < 4; k++) ventana(l, 160 + k * 430, 170, 360, 260, '#a5f3fc');
    l.linea([[100, 120], [W - 100, 120]], { ancho: 7 }); for (let k = 0; k < 7; k++) { const x = 250 + k * 240; l.linea([[x, 120], [x, 200]]); l.circulo(x, 220, 20); }
    for (let k = 0; k < 3; k++) { const x = 140 + k * 600; l.rect(x, 600, 420, 120, '#fca5a5', 0.5); l.rect(x + 20, 470, 60, 140, '#fca5a5', 0.5); }
    piso(l, W, '#94a3b8');
  },
  aula(ctx, W, H, l) {
    hoja(ctx, W, H);
    l.rect(560, 140, 800, 380, '#065f46', 0.55); l.linea([[620, 230], [760, 230]], { color: '#f8fafc', ancho: 5 }); l.linea([[620, 300], [920, 300]], { color: '#f8fafc', ancho: 5 }); l.linea([[620, 370], [840, 370]], { color: '#f8fafc', ancho: 5 });
    l.linea([[1000, 260], [1090, 260], [1090, 320]], { color: '#fde047', ancho: 5 });
    l.disco(1600, 230, 70, '#ffffff', 0.4); l.linea([[1600, 230], [1600, 185]]); l.linea([[1600, 230], [1635, 245]]);
    for (const x of [150, 1450]) { l.rect(x, 700, 320, 40, '#d97706', 0.5); l.linea([[x + 30, 740], [x + 30, 880]]); l.linea([[x + 290, 740], [x + 290, 880]]); }
    piso(l, W);
  },
  patio(ctx, W, H, l) {
    hoja(ctx, W, H); l.disco(260, 150, 60, '#fde047', 0.6);
    for (const x of [200, 1650]) { l.rect(x - 25, 500, 50, 380, '#a16207', 0.5); l.disco(x, 430, 150, '#4ade80', 0.45); }
    for (let x = 0; x < W; x += 90) l.linea([[x, 700], [x, 880]]); l.linea([[0, 720], [W, 720]]); l.linea([[0, 800], [W, 800]]);
    l.rect(700, 300, 520, 200, '#fecaca', 0.4); for (let k = 0; k < 4; k++) l.caja(730 + k * 125, 340, 90, 110);
    l.marca([[0, 880], [W, 880], [W, 1080], [0, 1080]], '#86efac', 0.35); l.linea([[0, 905], [W, 905]], { ancho: 5 });
  },
  sala(ctx, W, H, l) {
    hoja(ctx, W, H, true);
    l.rect(160, 600, 560, 240, '#7c3aed', 0.5); l.rect(160, 520, 560, 100, '#7c3aed', 0.35); l.rect(130, 560, 60, 280, '#7c3aed', 0.5); l.rect(690, 560, 60, 280, '#7c3aed', 0.5);
    l.rect(1050, 740, 660, 140, '#92400e', 0.5); l.disco(1600, 160, 50, '#fef9c3', 0.4);
    // Brillo de la tele (la tele la dibuja el personaje con «tele»)
    ctx.save(); const g = ctx.createRadialGradient(1270, 520, 50, 1270, 520, 520); g.addColorStop(0, 'rgba(125,211,252,0.25)'); g.addColorStop(1, 'rgba(125,211,252,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    l.linea([[0, SUELO - 20], [W, SUELO - 24]], { ancho: 5, color: '#93c5fd' });
  },
  noche(ctx, W, H, l) {
    hoja(ctx, W, H, true); l.disco(1650, 160, 70, '#fef9c3', 0.6);
    const r = azar(5); for (let k = 0; k < 40; k++) l.linea([[r() * W, r() * 400], [r() * W + 6, r() * 400 + 6]], { color: '#fde68a', ancho: 4 });
    for (const [x, w, h] of [[100, 300, 520], [450, 260, 640], [760, 340, 460], [1150, 280, 600], [1480, 330, 500]]) { l.rect(x, 860 - h, w, h, '#1e3a8a', 0.5); for (let k = 0; k < 6; k++) l.rect(x + 30 + (k % 2) * (w / 2), 900 - h + Math.floor(k / 2) * 120, 60, 70, '#fde047', 0.5); }
    for (const x of [380, 1100]) { l.linea([[x, 900], [x, 560]], { ancho: 6, color: '#93c5fd' }); l.disco(x + 30, 560, 28, '#fde047', 0.6); }
    l.linea([[0, 900], [W, 900]], { ancho: 5, color: '#93c5fd' });
  },
  taller(ctx, W, H, l) {
    hoja(ctx, W, H);
    l.rect(140, 180, 700, 120, '#fca5a5', 0.4); ctx.save(); ctx.font = '700 70px "Comic Sans MS", sans-serif'; ctx.fillStyle = TINTA; ctx.fillText('TALLER', 330, 265); ctx.restore();
    for (let k = 0; k < 4; k++) l.disco(1500 + (k % 2) * 130, 820 - Math.floor(k / 2) * 130, 60, '#374151', 0.6);
    // Moto
    l.circulo(980, 820, 80); l.circulo(1320, 820, 80); l.linea([[980, 820], [1080, 700], [1250, 700], [1320, 820]], { ancho: 6 }); l.linea([[1080, 700], [1050, 620], [1000, 610]], { ancho: 6 }); l.rect(1100, 650, 140, 50, '#ef4444', 0.6);
    for (let k = 0; k < 5; k++) l.linea([[200 + k * 110, 420], [200 + k * 110, 520]], { ancho: 6 }); l.linea([[170, 420], [700, 420]]);
    piso(l, W, '#78716c');
  },
  bano(ctx, W, H, l) {
    hoja(ctx, W, H);
    for (let y = 120; y < 900; y += 110) l.linea([[0, y], [W, y]], { ancho: 2, color: 'rgba(29,78,216,0.35)' });
    l.rect(720, 140, 480, 460, '#e0f2fe', 0.55); l.linea([[780, 200], [880, 300]], { color: '#ffffff', ancho: 8 }); l.linea([[820, 200], [920, 300]], { color: '#ffffff', ancho: 5 });
    l.rect(700, 680, 520, 60, '#f1f5f9', 0.6); l.rect(860, 740, 200, 160, '#f1f5f9', 0.5); l.linea([[960, 640], [960, 680]], { ancho: 6 });
    piso(l, W, '#bae6fd');
  }
};
export const FONDOS_DIBUJO = Object.keys(ESCENAS);

// Dibuja el fondo «lugar» al tiempo t (la línea tiembla cada 0,3 s)
export function dibujarFondo(ctx, lugar, W, H, t = 0, semilla = 3) {
  const f = ESCENAS[lugar] || ESCENAS.cuarto, rnd = azar(semilla + Math.floor(t / 0.3) * 11);
  f(ctx, W, H, lapiz(ctx, rnd, 3));
}
