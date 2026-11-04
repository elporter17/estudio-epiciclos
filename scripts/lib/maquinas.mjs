// Máquinas en 2D animadas para «Cómo se hace» (sin IA), con estilo de ilustración: metal con degradados y brillos,
// luces que brillan, sombras suaves, cinta transportadora con volumen y efectos (vapor, chispas, líquidos, llamas).
// Los objetos (lo que entra y lo que sale) son los emojis 3D de Fluent (objetos3d.mjs).
//   fondoFabrica(ctx, vista, cam, t, acento)   la nave de la fábrica con profundidad (se mueve más lento que las máquinas)
//   dibujarMaquina(ctx, tipo, caja, t, paso, emoji, acento, { continuo })
// Tipos: cosecha cinta lavado horno tostar prensa corte mezcla molde enfria empaque molino fundir secado fermenta
//        extruir inspeccion camion
import { createCanvas } from '@napi-rs/canvas';
import { objeto3d } from './objetos3d.mjs';

const TINTA = '#1e2429';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => 1 - (1 - clamp(x)) ** 3;
// Ruido determinista (las partículas no tiemblan entre cuadros)
const rnd = (k) => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mezclar = (a, b, k) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`; };
const claro = (c, k = 0.3) => mezclar(c, '#ffffff', k), oscuro = (c, k = 0.3) => mezclar(c, '#000000', k);

// ---------- piezas de dibujo ----------
function forma(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
// Cuerpo pintado o de metal: degradado de arriba (claro) a abajo (oscuro), borde, brillo arriba y sombra abajo
function cuerpo(ctx, x, y, w, h, r, color, { borde = true } = {}) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, claro(color, 0.32)); g.addColorStop(0.45, color); g.addColorStop(1, oscuro(color, 0.28));
  forma(ctx, x, y, w, h, r); ctx.fillStyle = g; ctx.fill();
  ctx.save(); forma(ctx, x, y, w, h, r); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x, y, w, Math.min(10, h * 0.12));
  const s = ctx.createLinearGradient(x, 0, x + w, 0); s.addColorStop(0, 'rgba(255,255,255,0.10)'); s.addColorStop(0.5, 'rgba(255,255,255,0)'); s.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = s; ctx.fillRect(x, y, w, h); ctx.restore();
  if (borde) { forma(ctx, x, y, w, h, r); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke(); }
}
const metal = (ctx, x, y, w, h, r = 10) => cuerpo(ctx, x, y, w, h, r, '#a9b6c2');
function remaches(ctx, x, y, w, h, m = 14) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (const [px, py] of [[x + m, y + m], [x + w - m, y + m], [x + m, y + h - m], [x + w - m, y + h - m]]) { ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(px - 1.5, py - 1.5, 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.35)'; }
}
// Franjas de seguridad amarillas y negras
function franjas(ctx, x, y, w, h) {
  ctx.save(); forma(ctx, x, y, w, h, 4); ctx.clip(); ctx.fillStyle = '#f2c230'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#222'; for (let k = -h; k < w; k += 28) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + 14, y + h); ctx.lineTo(x + k + 14 + h, y); ctx.lineTo(x + k + h, y); ctx.fill(); }
  ctx.restore(); forma(ctx, x, y, w, h, 4); ctx.strokeStyle = TINTA; ctx.lineWidth = 3; ctx.stroke();
}
// Luz que brilla (piloto, foco)
function luz(ctx, x, y, r, color, intensidad = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4); g.addColorStop(0, color.replace('rgb', 'rgba').replace(')', `,${0.55 * intensidad})`)); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
}
const rgb = (c) => `rgb(${hex(c).join(',')})`;
// Manómetro con aguja
function manometro(ctx, x, y, r, v) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#f7f4ec'; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke();
  ctx.strokeStyle = '#d7263d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r * 0.78, Math.PI * 0.15, Math.PI * 0.4); ctx.stroke();
  ctx.strokeStyle = '#888'; ctx.lineWidth = 2; for (let k = 0; k <= 8; k++) { const a = Math.PI * 0.75 + (k / 8) * Math.PI * 1.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62); ctx.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); ctx.stroke(); }
  const a = Math.PI * 0.75 + clamp(v) * Math.PI * 1.5; ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = TINTA; ctx.fill();
}
export function engranaje(ctx, x, y, r, dientes, ang, color = '#b8c3cc') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.beginPath();
  for (let i = 0; i < dientes * 2; i++) {
    const a0 = (i / (dientes * 2)) * Math.PI * 2, a1 = ((i + 1) / (dientes * 2)) * Math.PI * 2, rr = i % 2 ? r : r * 1.16;
    ctx.lineTo(rr * Math.cos(a0 + 0.04), rr * Math.sin(a0 + 0.04)); ctx.lineTo(rr * Math.cos(a1 - 0.04), rr * Math.sin(a1 - 0.04));
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.2); g.addColorStop(0, claro(color, 0.4)); g.addColorStop(1, oscuro(color, 0.3));
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fillStyle = '#39424a'; ctx.fill(); ctx.restore();
}
// Vapor o humo: nubes difusas que suben y se agrandan
function vapor(ctx, x, y, t, { n = 6, alto = 220, ancho = 40, color = '255,255,255', alfa = 0.55, vel = 0.5 } = {}) {
  for (let k = 0; k < n; k++) {
    const f = (t * vel + k / n) % 1, a = alfa * (1 - f) * Math.min(1, f * 5), px = x + Math.sin(f * 5 + k) * ancho * f, py = y - f * alto, r = 24 + f * 60;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
}
// Sombra suave (elipse con degradado radial)
function sombraSuave(ctx, x, y, rx, ry, a = 0.3) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
// Chispas (se suman a la luz)
function chispas(ctx, x, y, t, { n = 18, dir = -Math.PI / 2, abre = 1.2, largo = 220, color = '255,190,60' } = {}) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let k = 0; k < n; k++) {
    const f = (t * 1.8 + rnd(k)) % 1, a = dir + (rnd(k + 9) - 0.5) * abre, d = f * largo * (0.6 + rnd(k + 3) * 0.6);
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + f * f * 140;
    ctx.strokeStyle = `rgba(${color},${1 - f})`; ctx.lineWidth = 5 * (1 - f) + 1.5;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(a) * 18, py - Math.sin(a) * 18 - f * 8); ctx.stroke();
  }
  ctx.restore();
}
// Llamas en capas (rojo, naranja, amarillo) que bailan
function llamas(ctx, x, y, w, t, { alto = 90 } = {}) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [c, k] of [['rgba(255,70,20,0.85)', 1], ['rgba(255,150,30,0.85)', 0.75], ['rgba(255,230,120,0.9)', 0.45]]) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y);
    const n = Math.max(4, Math.round(w / 40));
    for (let i = 0; i <= n; i++) { const px = x + (i / n) * w, h = alto * k * (0.6 + 0.4 * Math.abs(Math.sin(t * 9 + i * 1.7))) * (0.7 + rnd(i) * 0.5); ctx.quadraticCurveTo(px - w / n / 2, y - h * 0.4, px, y - h); ctx.quadraticCurveTo(px + w / n / 4, y - h * 0.3, px + w / n / 2, y); }
    ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// Líquido con superficie que ondea y un brillo
function liquido(ctx, x, y, w, h, color, t) {
  ctx.save(); ctx.beginPath(); ctx.moveTo(x, y + h);
  for (let k = 0; k <= 24; k++) ctx.lineTo(x + (k / 24) * w, y + Math.sin(t * 4 + k * 0.7) * 5);
  ctx.lineTo(x + w, y + h); ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, claro(color, 0.2)); g.addColorStop(1, oscuro(color, 0.25));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 4; ctx.beginPath();
  for (let k = 2; k <= 10; k++) ctx.lineTo(x + (k / 24) * w, y + 8 + Math.sin(t * 4 + k * 0.7) * 5);
  ctx.stroke(); ctx.restore();
}
// Objeto 3D (o emoji) apoyado en «base», con su sombra de contacto
function objeto(ctx, emoji, g, x, base, size, { sombra = true, giro = 0, escala = 1 } = {}) {
  if (!g) return;
  if (sombra) sombraSuave(ctx, x, base, size * 0.46 * escala, size * 0.12, 0.38);
  const img = objeto3d(g), s = size * escala;
  ctx.save(); ctx.translate(x, base - s / 2); if (giro) ctx.rotate(giro);
  if (img) ctx.drawImage(img, -s / 2, -s / 2, s, s); else emoji(ctx, g, 0, 0, s * 0.9);
  ctx.restore();
}

// ---------- la nave (fondo con profundidad) ----------
const tiras = new Map();
function tiraLejana(h) {
  if (tiras.has(h)) return tiras.get(h);
  const cv = createCanvas(2600, h), c = cv.getContext('2d');
  c.filter = 'blur(5px)'; c.globalAlpha = 0.55;
  for (let k = 0; k < 10; k++) {
    const x = k * 260, alto = 160 + rnd(k) * 140, y = h * 0.8 - alto;
    c.fillStyle = '#3b4650'; c.fillRect(x, y, 150 + rnd(k + 2) * 60, alto);
    c.fillStyle = '#2f3942'; c.fillRect(x + 40, y - 120, 22, 120);
    engranaje(c, x + 110, y + 50, 34, 9, k, '#56636e');
    c.fillStyle = rnd(k + 5) > 0.5 ? '#5adc78' : '#ffbe3c'; c.beginPath(); c.arc(x + 30, y + 30, 6, 0, Math.PI * 2); c.fill();
  }
  tiras.set(h, cv); return cv;
}
// cam: desplazamiento de la cámara; el fondo se mueve más lento (paralaje)
export function fondoFabrica(ctx, v, cam, t, acento = '#e7b93a') {
  ctx.save(); forma(ctx, v.x, v.y, v.w, v.h, 40); ctx.clip();
  const g = ctx.createLinearGradient(0, v.y, 0, v.y + v.h); g.addColorStop(0, '#3a4652'); g.addColorStop(0.55, '#55636f'); g.addColorStop(1, '#6b7782');
  ctx.fillStyle = g; ctx.fillRect(v.x, v.y, v.w, v.h);
  const lejos = cam * 0.35;
  // Ventanales con luz de afuera
  for (let k = Math.floor(lejos / 300) - 1; k < Math.floor(lejos / 300) + 5; k++) {
    const x = v.x + k * 300 - lejos + 40, y = v.y + 40;
    const vg = ctx.createLinearGradient(0, y, 0, y + 200); vg.addColorStop(0, '#cfe6f5'); vg.addColorStop(1, '#8fb3cc');
    ctx.fillStyle = vg; ctx.fillRect(x, y, 200, 200);
    ctx.strokeStyle = '#2a333b'; ctx.lineWidth = 8; ctx.strokeRect(x, y, 200, 200); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 100, y); ctx.lineTo(x + 100, y + 200); ctx.moveTo(x, y + 100); ctx.lineTo(x + 200, y + 100); ctx.stroke();
    // Rayo de luz
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const rg = ctx.createLinearGradient(x, y + 200, x + 260, y + 560); rg.addColorStop(0, 'rgba(255,240,200,0.20)'); rg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x, y + 200); ctx.lineTo(x + 200, y + 200); ctx.lineTo(x + 420, y + 600); ctx.lineTo(x + 180, y + 600); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // Máquinas lejanas, desenfocadas (una tira de 2600 px que se repite)
  const medio = cam * 0.6, tira = tiraLejana(v.h);
  for (let x = v.x - (medio % tira.width) - tira.width; x < v.x + v.w; x += tira.width) ctx.drawImage(tira, x, v.y);
  // Tubos del techo y lámparas colgantes
  ctx.fillStyle = '#2b343c'; ctx.fillRect(v.x, v.y + 14, v.w, 18);
  for (let k = Math.floor(medio / 330) - 1; k < Math.floor(medio / 330) + 5; k++) {
    const x = v.x + k * 330 - medio + 120;
    ctx.strokeStyle = '#1d2328'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, v.y + 32); ctx.lineTo(x, v.y + 90); ctx.stroke();
    ctx.fillStyle = '#3c4852'; ctx.beginPath(); ctx.moveTo(x - 34, v.y + 118); ctx.lineTo(x - 14, v.y + 90); ctx.lineTo(x + 14, v.y + 90); ctx.lineTo(x + 34, v.y + 118); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createRadialGradient(x, v.y + 120, 4, x, v.y + 120, 160); lg.addColorStop(0, 'rgba(255,230,170,0.55)'); lg.addColorStop(1, 'rgba(255,230,170,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, v.y + 120, 160, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  // Piso de concreto pulido, con reflejo y la línea de seguridad
  const py = v.y + v.h * 0.8, pg = ctx.createLinearGradient(0, py, 0, v.y + v.h); pg.addColorStop(0, '#8d949a'); pg.addColorStop(1, '#5b6268');
  ctx.fillStyle = pg; ctx.fillRect(v.x, py, v.w, v.h - (py - v.y));
  ctx.fillStyle = acento; ctx.fillRect(v.x, py + 6, v.w, 8);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
  for (let k = Math.floor(cam / 120) - 1; k < Math.floor(cam / 120) + 10; k++) { const x = v.x + k * 120 - cam; ctx.beginPath(); ctx.moveTo(x, py + 14); ctx.lineTo(x - 60, v.y + v.h); ctx.stroke(); }
  ctx.restore();
  return py;
}

// ---------- cinta transportadora con volumen ----------
// Devuelve la altura donde se apoyan los objetos
function cinta(ctx, x0, x1, py, t, { vel = 120, mundo = 0 } = {}) {
  const top = py - 112, cara = 30;
  // Patas
  for (let x = x0 + 60; x < x1; x += 260) { cuerpo(ctx, x - 10, top + cara + 26, 20, py - (top + cara + 26) + 4, 4, '#6c7884'); }
  // Superficie (goma) con listones que avanzan
  const g = ctx.createLinearGradient(0, top - 26, 0, top); g.addColorStop(0, '#454c53'); g.addColorStop(1, '#2c3238');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 + 16, top - 26); ctx.lineTo(x1 - 16, top - 26); ctx.lineTo(x1, top); ctx.lineTo(x0, top); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 3;
  for (let x = x0 - 40 - ((t * vel + mundo) % 44); x < x1 + 40; x += 44) { ctx.beginPath(); ctx.moveTo(x + 16, top - 26); ctx.lineTo(x, top); ctx.stroke(); }
  ctx.restore();
  // Cara de adelante (metal) con rodillos que giran
  cuerpo(ctx, x0, top, x1 - x0, cara, 8, '#8a98a6');
  for (let x = x0 + 30; x < x1 - 10; x += 64) {
    ctx.save(); ctx.translate(x, top + cara / 2); ctx.rotate(t * vel / 12);
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fillStyle = '#3a434b'; ctx.fill(); ctx.strokeStyle = '#c5ced6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.restore();
  }
  // Sombra en el piso
  const sg = ctx.createLinearGradient(0, py - 14, 0, py + 16); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.5, 'rgba(0,0,0,0.25)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(x0, py - 14, x1 - x0, 30);
  return top - 12;
}
// Objetos sobre la cinta: antes de «corte» son la entrada y después la salida; «ocultar» deja libre la zona de la máquina
function enCinta(ctx, s, base, { vel = 120, corte, ocultar = 0, tam = 120, paso = 240 } = {}) {
  const cx = corte ?? s.x + s.w / 2;
  for (let x = s.x - paso + ((s.t * vel + s.mundo) % paso); x < s.x + s.w + paso; x += paso) {
    if (ocultar && Math.abs(x - cx) < ocultar) continue;
    objeto(ctx, s.emoji, x < cx ? s.p.entrada : s.p.salida, x, base, tam);
  }
}

// ---------- las máquinas ----------
const MAQ = {
  // Arco de control con láser que barre y un contador
  cinta(ctx, s) {
    const base = cinta(ctx, s.x, s.x + s.w, s.py, s.t, { mundo: s.mundo }), cx = s.x + s.w / 2;
    enCinta(ctx, s, base);
    cuerpo(ctx, cx - 190, base - 330, 46, 330 + 40, 10, '#566573'); cuerpo(ctx, cx + 144, base - 330, 46, 330 + 40, 10, '#566573');
    cuerpo(ctx, cx - 210, base - 380, 420, 70, 16, s.color || '#2f6fb5'); remaches(ctx, cx - 210, base - 380, 420, 70);
    const lx = cx + Math.sin(s.t * 2.2) * 150;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lg = ctx.createLinearGradient(0, base - 310, 0, base); lg.addColorStop(0, 'rgba(255,60,60,0.75)'); lg.addColorStop(1, 'rgba(255,60,60,0.05)');
    ctx.fillStyle = lg; ctx.fillRect(lx - 3, base - 310, 6, 310); ctx.restore();
    cuerpo(ctx, cx - 70, base - 368, 140, 46, 8, '#14181c');
    ctx.font = '700 30px "IBM Plex Mono", monospace'; ctx.fillStyle = '#5dff8a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(1000 + Math.floor(s.t * 3)).padStart(5, '0'), cx, base - 344);
    luz(ctx, cx - 170, base - 345, 9, Math.sin(s.t * 6) > 0 ? 'rgb(90,230,120)' : 'rgb(40,90,50)');
  },
  // Cámara de control con monitor y marca de aprobado
  inspeccion(ctx, s) {
    const base = cinta(ctx, s.x, s.x + s.w, s.py, s.t, { mundo: s.mundo }), cx = s.x + s.w / 2;
    enCinta(ctx, s, base);
    cuerpo(ctx, cx - 18, base - 470, 36, 170, 8, '#6c7884');
    cuerpo(ctx, cx - 90, base - 330, 180, 100, 20, '#2f3b48'); remaches(ctx, cx - 90, base - 330, 180, 100);
    ctx.beginPath(); ctx.arc(cx, base - 232, 34, 0, Math.PI * 2); ctx.fillStyle = '#0d1114'; ctx.fill(); ctx.strokeStyle = '#9aa7b3'; ctx.lineWidth = 6; ctx.stroke();
    luz(ctx, cx, base - 232, 12, 'rgb(80,170,255)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const cg = ctx.createLinearGradient(0, base - 230, 0, base); cg.addColorStop(0, 'rgba(110,190,255,0.40)'); cg.addColorStop(1, 'rgba(110,190,255,0.06)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(cx - 20, base - 230); ctx.lineTo(cx + 20, base - 230); ctx.lineTo(cx + 120, base); ctx.lineTo(cx - 120, base); ctx.closePath(); ctx.fill(); ctx.restore();
    // Monitor con el objeto ampliado
    const mx = s.x + s.w - 300, my = s.y + 70;
    cuerpo(ctx, mx, my, 240, 180, 16, '#2a3036'); ctx.fillStyle = '#0f2a1d'; forma(ctx, mx + 14, my + 14, 212, 132, 8); ctx.fill();
    objeto(ctx, s.emoji, s.p.salida, mx + 100, my + 130, 110, { sombra: false });
    if ((s.t % 1.6) > 0.5) { ctx.fillStyle = '#3ddc84'; ctx.font = '700 34px "Archivo Black", Impact, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('OK', mx + 214, my + 48); }
    for (let k = 0; k < 3; k++) luz(ctx, mx + 30 + k * 30, my + 162, 6, ['rgb(90,230,120)', 'rgb(255,190,60)', 'rgb(255,80,80)'][k], k === 0 ? 1 : 0.3);
  },
  // Túnel de lavado: vidrio, rociadores, gotas y espuma
  lavado(ctx, s) {
    const base = cinta(ctx, s.x, s.x + s.w, s.py, s.t, { mundo: s.mundo }), cx = s.x + s.w / 2;
    enCinta(ctx, s, base);
    cuerpo(ctx, cx - 280, base - 380, 560, 60, 18, s.color || '#3fa0c8'); remaches(ctx, cx - 280, base - 380, 560, 60);
    for (let i = 0; i < 6; i++) {
      const nx = cx - 225 + i * 90; cuerpo(ctx, nx - 14, base - 322, 28, 34, 6, '#b0bcc6');
      for (let k = 0; k < 9; k++) { const f = (s.t * 2 + k / 9 + i * 0.17) % 1, dx = (rnd(i * 13 + k) - 0.5) * 70 * f, dy = base - 286 + f * 270;
        ctx.fillStyle = `rgba(120,200,255,${0.85 - f * 0.4})`; ctx.beginPath(); ctx.ellipse(nx + dx, dy, 5, 11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(nx + dx - 2, dy - 4, 2, 0, Math.PI * 2); ctx.fill(); }
    }
    // Vidrio del túnel
    ctx.fillStyle = 'rgba(180,225,255,0.18)'; forma(ctx, cx - 270, base - 320, 540, 320, 10); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx - 230, base - 300); ctx.lineTo(cx - 170, base - 40); ctx.stroke();
    for (let k = 0; k < 14; k++) { const f = (s.t * 0.6 + k / 14) % 1, x = cx - 250 + rnd(k) * 500, y = base - 10 - f * 120, r = 8 + rnd(k + 4) * 14;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.stroke(); }
  },
  // Horno túnel: ventana encendida, calor que ondea, chimenea con humo y termómetro
  horno(ctx, s) {
    const base = cinta(ctx, s.x, s.x + s.w, s.py, s.t, { mundo: s.mundo }), cx = s.x + s.w / 2;
    enCinta(ctx, s, base, { ocultar: 230 });
    cuerpo(ctx, cx + 120, base - 520, 60, 160, 8, '#6d4c41'); vapor(ctx, cx + 150, base - 520, s.t, { color: '120,120,120', alfa: 0.45 });
    cuerpo(ctx, cx - 250, base - 380, 500, 400, 26, s.color || '#c8553d'); remaches(ctx, cx - 250, base - 380, 500, 400, 18);
    franjas(ctx, cx - 250, base - 30, 500, 24);
    const br = 0.8 + 0.2 * Math.sin(s.t * 9);
    const fg = ctx.createRadialGradient(cx, base - 190, 10, cx, base - 190, 230); fg.addColorStop(0, `rgba(255,240,150,${br})`); fg.addColorStop(0.6, 'rgba(255,140,40,0.95)'); fg.addColorStop(1, 'rgba(180,50,10,1)');
    forma(ctx, cx - 190, base - 320, 380, 230, 22); ctx.fillStyle = fg; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 6; ctx.stroke();
    ctx.save(); forma(ctx, cx - 190, base - 320, 380, 230, 22); ctx.clip();
    for (let k = 0; k < 3; k++) objeto(ctx, s.emoji, s.p.entrada, cx - 120 + k * 120 + ((s.t * 40) % 120), base - 110, 100, { sombra: false });
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,200,80,0.25)'; ctx.fillRect(cx - 190, base - 320, 380, 230); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx - 160, base - 300); ctx.lineTo(cx - 110, base - 110); ctx.stroke();
    for (let i = 0; i < 4; i++) { ctx.strokeStyle = 'rgba(255,170,80,0.45)'; ctx.lineWidth = 6; ctx.beginPath(); for (let k = 0; k <= 22; k++) { const yy = base - 400 - k * 8, xx = cx - 150 + i * 100 + Math.sin(k * 0.6 + s.t * 7 + i) * 10; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    manometro(ctx, cx + 200, base - 330, 34, 0.7 + 0.05 * Math.sin(s.t * 3));
    luz(ctx, cx - 210, base - 345, 10, 'rgb(255,90,60)', 0.6 + 0.4 * Math.abs(Math.sin(s.t * 4)));
  },
  // Tambor tostador que gira sobre quemadores
  tostar(ctx, s) {
    const cx = s.x + s.w / 2, cy = s.py - 300;
    cuerpo(ctx, cx - 250, s.py - 120, 40, 120, 6, '#4a525a'); cuerpo(ctx, cx + 210, s.py - 120, 40, 120, 6, '#4a525a');
    cuerpo(ctx, cx - 230, s.py - 140, 460, 40, 10, '#39424a'); llamas(ctx, cx - 210, s.py - 140, 420, s.t, { alto: 80 });
    // Tambor
    ctx.save(); forma(ctx, cx - 260, cy - 140, 520, 280, 140); ctx.clip();
    cuerpo(ctx, cx - 260, cy - 140, 520, 280, 140, '#7d8a96', { borde: false });
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 8; for (let k = 0; k < 9; k++) { const x = cx - 300 + ((k * 80 + s.t * 120) % 640); ctx.beginPath(); ctx.moveTo(x, cy - 150); ctx.lineTo(x - 40, cy + 150); ctx.stroke(); }
    ctx.restore(); forma(ctx, cx - 260, cy - 140, 520, 280, 140); ctx.strokeStyle = TINTA; ctx.lineWidth = 5; ctx.stroke();
    // Ventana con lo que da vueltas adentro
    ctx.beginPath(); ctx.arc(cx, cy, 105, 0, Math.PI * 2); ctx.fillStyle = '#2b1d14'; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI * 2); ctx.clip();
    for (let k = 0; k < 8; k++) { const a = s.t * 2.4 + k * 0.8, r = 30 + (k % 3) * 22; objeto(ctx, s.emoji, k % 2 ? s.p.entrada : s.p.salida, cx + Math.cos(a) * r, cy + Math.sin(a) * r + 35, 70, { sombra: false, giro: a }); }
    ctx.restore(); ctx.beginPath(); ctx.arc(cx, cy, 105, 0, Math.PI * 2); ctx.strokeStyle = '#c9d3dc'; ctx.lineWidth = 12; ctx.stroke(); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, 82, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    engranaje(ctx, cx + 262, cy, 44, 10, s.t * 2.4);
    vapor(ctx, cx - 120, cy - 150, s.t, { alfa: 0.5 });
    // Bandeja de salida
    cuerpo(ctx, s.x + s.w - 170, s.py - 70, 150, 50, 10, '#b0bcc6');
    for (let k = 0; k < 3; k++) objeto(ctx, s.emoji, s.p.salida, s.x + s.w - 140 + k * 45, s.py - 66, 70);
  },
  // Prensa hidráulica: cabezal que baja, destello del golpe, polvo y manómetro
  prensa(ctx, s) {
    const base = cinta(ctx, s.x, s.x + s.w, s.py, s.t, { mundo: s.mundo, vel: 0 }), cx = s.x + s.w / 2;
    const ciclo = (s.t * 0.55) % 1, baja = ciclo < 0.35 ? ease(ciclo / 0.35) : ciclo < 0.5 ? 1 : 1 - ease((ciclo - 0.5) / 0.3);
    objeto(ctx, s.emoji, s.p.entrada, s.x + 130, base, 110); objeto(ctx, s.emoji, s.p.salida, s.x + s.w - 130, base, 110);
    // Marco
    cuerpo(ctx, cx - 230, s.y + 40, 60, base - s.y + 10, 10, s.color || '#e0a526'); cuerpo(ctx, cx + 170, s.y + 40, 60, base - s.y + 10, 10, s.color || '#e0a526');
    cuerpo(ctx, cx - 250, s.y + 20, 500, 90, 18, s.color || '#e0a526'); remaches(ctx, cx - 250, s.y + 20, 500, 90); franjas(ctx, cx - 230, s.y + 92, 460, 18);
    // Pistón cromado
    const yc = s.y + 110 + baja * (base - 210 - (s.y + 110));
    const pg = ctx.createLinearGradient(cx - 34, 0, cx + 34, 0); pg.addColorStop(0, '#7d8a96'); pg.addColorStop(0.35, '#f4f7fa'); pg.addColorStop(1, '#5d6973');
    ctx.fillStyle = pg; ctx.fillRect(cx - 34, s.y + 110, 68, yc - (s.y + 110)); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.strokeRect(cx - 34, s.y + 110, 68, yc - (s.y + 110));
    cuerpo(ctx, cx - 160, yc, 320, 80, 12, '#5d6973');
    // Pieza en el yunque, aplastada en el golpe
    cuerpo(ctx, cx - 170, base - 10, 340, 30, 6, '#39424a');
    const ap = baja > 0.92 ? 1 : 0;
    ctx.save(); ctx.translate(cx, base - 10); ctx.scale(1 + ap * 0.25, 1 - ap * 0.3); objeto(ctx, s.emoji, ap ? s.p.salida : s.p.entrada, 0, 0, 120); ctx.restore();
    if (ciclo > 0.33 && ciclo < 0.5) {
      const f = (ciclo - 0.33) / 0.17;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,240,180,${1 - f})`; ctx.lineWidth = 10 * (1 - f) + 2; ctx.beginPath(); ctx.ellipse(cx, base - 30, 120 + f * 160, 30 + f * 40, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      vapor(ctx, cx, base - 20, f * 2, { color: '200,190,170', alfa: 0.5, alto: 60, ancho: 160 });
    }
    manometro(ctx, cx + 300, s.y + 160, 40, 0.15 + baja * 0.75);
  },
  // Sierra circular cromada con chispas
  corte(ctx, s) {
    const base = cinta(ctx, s.x, s.x + s.w, s.py, s.t, { mundo: s.mundo, vel: 110 }), cx = s.x + s.w / 2;
    enCinta(ctx, s, base, { vel: 110 });
    cuerpo(ctx, cx - 30, s.y + 30, 60, base - 330 - s.y, 8, '#6c7884');
    ctx.save(); ctx.translate(cx, base - 160); ctx.rotate(s.t * 16);
    ctx.beginPath(); for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2, r = i % 2 ? 128 : 150; ctx.lineTo(r * Math.cos(a), r * Math.sin(a)); } ctx.closePath();
    const sg = ctx.createRadialGradient(-40, -40, 10, 0, 0, 160); sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.5, '#c7d0d8'); sg.addColorStop(1, '#7d8a96');
    ctx.fillStyle = sg; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.arc(0, 0, 90, 0, 0.5); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fillStyle = '#39424a'; ctx.fill(); ctx.restore();
    // Guarda
    ctx.save(); ctx.beginPath(); ctx.arc(cx, base - 160, 172, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(cx, base - 160); ctx.closePath();
    const gg = ctx.createLinearGradient(0, base - 340, 0, base - 160); gg.addColorStop(0, claro(s.color || '#3d7cc8', 0.3)); gg.addColorStop(1, s.color || '#3d7cc8'); ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
    chispas(ctx, cx + 70, base - 30, s.t, { dir: -0.4, abre: 1.0, largo: 260 });
    luz(ctx, cx - 120, base - 300, 9, 'rgb(255,80,80)', 0.5 + 0.5 * Math.abs(Math.sin(s.t * 5)));
  },
  // Tanque mezclador de acero con tolvas, aspas y remolino
  mezcla(ctx, s) {
    const cx = s.x + s.w / 2, top = s.py - 470;
    const ing = s.p.extra || [s.p.entrada];
    ing.slice(0, 3).forEach((g, i) => {
      const hx = cx - 230 + i * 230; cuerpo(ctx, hx - 55, s.y + 30, 110, 70, 10, '#b0bcc6');
      ctx.fillStyle = '#8a98a6'; ctx.beginPath(); ctx.moveTo(hx - 55, s.y + 100); ctx.lineTo(hx + 55, s.y + 100); ctx.lineTo(hx + 16, s.y + 140); ctx.lineTo(hx - 16, s.y + 140); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke();
      objeto(ctx, s.emoji, g, hx, s.y + 98, 64, { sombra: false });
      const f = (s.t * 0.9 + i / 3) % 1; objeto(ctx, s.emoji, g, hx + (cx - hx) * f * 0.8, s.y + 170 + f * 120, 54 * (1 - f * 0.5), { sombra: false, giro: f * 3 });
    });
    // Tanque
    cuerpo(ctx, cx - 260, top + 60, 520, s.py - top - 60, 40, '#c3ccd4'); remaches(ctx, cx - 260, top + 60, 520, s.py - top - 60, 20);
    ctx.save(); forma(ctx, cx - 230, top + 110, 460, 260, 26); ctx.clip();
    ctx.fillStyle = '#2a3036'; ctx.fillRect(cx - 230, top + 110, 460, 260);
    liquido(ctx, cx - 230, top + 170, 460, 200, s.p.color || '#8a5a3b', s.t);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 6; ctx.beginPath(); for (let a = 0; a < 16; a += 0.15) { const r = a * 9, x = cx + Math.cos(a + s.t * 5) * r, y = top + 260 + Math.sin(a + s.t * 5) * r * 0.3; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    // Aspa
    ctx.save(); ctx.translate(cx, top + 270); ctx.scale(Math.cos(s.t * 6), 1); cuerpo(ctx, -110, -14, 220, 28, 10, '#dfe6ec'); ctx.restore();
    ctx.fillStyle = '#b0bcc6'; ctx.fillRect(cx - 8, top + 110, 16, 160);
    ctx.restore(); forma(ctx, cx - 230, top + 110, 460, 260, 26); ctx.strokeStyle = TINTA; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx - 200, top + 140); ctx.lineTo(cx - 160, top + 340); ctx.stroke();
    cuerpo(ctx, cx - 70, top, 140, 80, 14, s.color || '#4f6d8a'); engranaje(ctx, cx, top + 40, 26, 8, s.t * 6);
    manometro(ctx, cx + 190, top + 420, 30, 0.5 + 0.1 * Math.sin(s.t * 2));
    objeto(ctx, s.emoji, s.p.salida, s.x + s.w - 90, s.py - 4, 110);
  },
  // Dosificador que vierte en moldes que avanzan y se llenan
  molde(ctx, s) {
    const base = cinta(ctx, s.x, s.x + s.w, s.py, s.t, { mundo: s.mundo, vel: 90 }), cx = s.x + s.w / 2, col = s.p.color || '#7a4a2a';
    cuerpo(ctx, cx - 120, s.y + 30, 240, 170, 26, '#c3ccd4'); remaches(ctx, cx - 120, s.y + 30, 240, 170);
    ctx.save(); forma(ctx, cx - 90, s.y + 60, 180, 100, 14); ctx.clip(); ctx.fillStyle = '#2a3036'; ctx.fillRect(cx - 90, s.y + 60, 180, 100); liquido(ctx, cx - 90, s.y + 95, 180, 70, col, s.t); ctx.restore();
    cuerpo(ctx, cx - 22, s.y + 198, 44, 60, 8, '#8a98a6');
    const sg = ctx.createLinearGradient(cx - 12, 0, cx + 12, 0); sg.addColorStop(0, oscuro(col, 0.2)); sg.addColorStop(0.5, claro(col, 0.3)); sg.addColorStop(1, oscuro(col, 0.2));
    ctx.fillStyle = sg; ctx.fillRect(cx - 12, s.y + 258, 24, base - 120 - (s.y + 258));
    const mov = (s.t * 90 + s.mundo) % 260;
    for (let i = -2; i < 5; i++) {
      const mx = s.x + i * 260 + mov - 130, nivel = clamp((mx - (cx - 110)) / 140);
      cuerpo(ctx, mx - 100, base - 130, 200, 130, 14, '#dfe6ec');
      ctx.save(); forma(ctx, mx - 88, base - 118, 176, 106, 10); ctx.clip(); ctx.fillStyle = '#9aa7b3'; ctx.fillRect(mx - 88, base - 118, 176, 106);
      if (nivel > 0) liquido(ctx, mx - 88, base - 12 - 100 * nivel, 176, 120, col, s.t + i);
      ctx.restore();
      if (nivel >= 1) objeto(ctx, s.emoji, s.p.salida, mx, base - 40, 100, { sombra: false, escala: 0.8 + 0.2 * ease((mx - cx - 30) / 80) });
    }
  },
  // Túnel de frío: azul, vidrio escarchado, neblina que sale y termómetro
  enfria(ctx, s) {
    const base = cinta(ctx, s.x, s.x + s.w, s.py, s.t, { mundo: s.mundo }), cx = s.x + s.w / 2;
    enCinta(ctx, s, base, { ocultar: 230 });
    cuerpo(ctx, cx - 250, base - 400, 500, 420, 30, s.color || '#5aa9e6'); remaches(ctx, cx - 250, base - 400, 500, 420, 18);
    const vg = ctx.createLinearGradient(0, base - 330, 0, base - 100); vg.addColorStop(0, 'rgba(235,248,255,0.95)'); vg.addColorStop(1, 'rgba(190,225,250,0.95)');
    forma(ctx, cx - 190, base - 330, 380, 230, 20); ctx.fillStyle = vg; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 5; ctx.stroke();
    ctx.save(); forma(ctx, cx - 190, base - 330, 380, 230, 20); ctx.clip();
    objeto(ctx, s.emoji, s.p.entrada, cx, base - 120, 130, { sombra: false });
    for (let k = 0; k < 10; k++) { const a = rnd(k) * 6.28; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 190 + rnd(k + 1) * 380, base - 330 + rnd(k + 2) * 230); ctx.lineTo(cx - 190 + rnd(k + 1) * 380 + Math.cos(a) * 30, base - 330 + rnd(k + 2) * 230 + Math.sin(a) * 30); ctx.stroke(); }
    ctx.restore();
    vapor(ctx, cx - 250, base - 40, s.t, { color: '230,245,255', alfa: 0.6, alto: -10, ancho: -120, vel: 0.4 });
    vapor(ctx, cx + 250, base - 40, s.t + 0.5, { color: '230,245,255', alfa: 0.6, alto: -10, ancho: 120, vel: 0.4 });
    for (let k = 0; k < 10; k++) { const f = (s.t * 0.4 + k / 10) % 1; objeto(ctx, s.emoji, '❄️', cx - 300 + rnd(k) * 600, s.y + 60 + f * 300, 34, { sombra: false, giro: s.t + k }); }
    cuerpo(ctx, cx - 80, base - 460, 160, 56, 12, '#14181c'); ctx.font = '700 34px "IBM Plex Mono", monospace'; ctx.fillStyle = '#7fd8ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('-18 °C', cx, base - 432);
  },
  // Brazo robótico que mete el producto en la caja; tapas que cierran y sello
  empaque(ctx, s) {
    const base = cinta(ctx, s.x, s.x + s.w, s.py, s.t, { mundo: s.mundo, vel: 0 }), cx = s.x + s.w / 2, f = (s.t * 0.42) % 1;
    // Caja
    cuerpo(ctx, cx + 20, base - 170, 250, 170, 8, '#c99a5b');
    const cierra = clamp((f - 0.55) / 0.2);
    ctx.save(); ctx.translate(cx + 20, base - 170); ctx.rotate(-Math.PI * 0.8 * (1 - cierra)); cuerpo(ctx, 0, -12, 125, 22, 4, '#b5854a'); ctx.restore();
    ctx.save(); ctx.translate(cx + 270, base - 170); ctx.rotate(Math.PI * 0.8 * (1 - cierra)); cuerpo(ctx, -125, -12, 125, 22, 4, '#b5854a'); ctx.restore();
    if (f > 0.78) { ctx.fillStyle = 'rgba(215,190,120,0.9)'; ctx.fillRect(cx + 125, base - 182, 40, 110 * clamp((f - 0.78) / 0.1)); }
    if (f > 0.88) { ctx.save(); ctx.translate(cx + 145, base - 85); ctx.rotate(-0.15); ctx.strokeStyle = '#d7263d'; ctx.lineWidth = 7; forma(ctx, -90, -32, 180, 64, 10); ctx.stroke(); ctx.font = '400 38px "Archivo Black", Impact, sans-serif'; ctx.fillStyle = '#d7263d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('LISTO', 0, 2); ctx.restore(); }
    // Brazo: base, hombro, codo y pinza; lleva el producto de la izquierda a la caja
    const bx = cx - 260, by = base - 20; cuerpo(ctx, bx - 60, by - 40, 120, 60, 14, s.color || '#e0a526');
    const k = f < 0.15 ? 0 : f < 0.45 ? ease((f - 0.15) / 0.3) : 1, sube = Math.sin(clamp((f - 0.15) / 0.3) * Math.PI) * 120;
    const tx = bx + 40 + k * (cx + 145 - bx - 40), ty = base - 130 - sube + (f > 0.45 ? 20 : 0);
    const sx = bx, sy = by - 60, l1 = 210, l2 = 210, d = Math.min(l1 + l2 - 1, Math.hypot(tx - sx, ty - sy));
    const a = Math.atan2(ty - sy, tx - sx) - Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)), ex = sx + Math.cos(a) * l1, ey = sy + Math.sin(a) * l1;
    for (const [x0, y0, x1, y1] of [[sx, sy, ex, ey], [ex, ey, tx, ty]]) { ctx.lineCap = 'round'; ctx.strokeStyle = TINTA; ctx.lineWidth = 40; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.strokeStyle = s.color || '#e0a526'; ctx.lineWidth = 32; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 8; ctx.stroke(); }
    for (const [x, y] of [[sx, sy], [ex, ey]]) { ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fillStyle = '#39424a'; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke(); }
    if (f < 0.55) objeto(ctx, s.emoji, s.p.entrada, tx, ty + 95, 100, { sombra: f < 0.16 });
    else if (f < 0.6) objeto(ctx, s.emoji, s.p.entrada, cx + 145, base - 80, 100, { sombra: false });
    cuerpo(ctx, tx - 30, ty - 6, 60, 26, 6, '#5d6973');
    objeto(ctx, s.emoji, s.p.salida || '📦', s.x + s.w - 90, s.py - 4, 120);
  },
  // Molino: tolva, rodillos que muelen (corte de la máquina) y el polvo que cae
  molino(ctx, s) {
    const cx = s.x + s.w / 2, cy = s.y + 300, col = s.p.color || '#8a5a3b';
    ctx.fillStyle = '#9aa7b3'; ctx.beginPath(); ctx.moveTo(cx - 180, s.y + 40); ctx.lineTo(cx + 180, s.y + 40); ctx.lineTo(cx + 60, s.y + 170); ctx.lineTo(cx - 60, s.y + 170); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke();
    for (let k = 0; k < 5; k++) { const f = (s.t * 0.9 + k / 5) % 1; objeto(ctx, s.emoji, s.p.entrada, cx - 80 + (k % 3) * 80 - (k % 3 - 1) * 60 * f, s.y + 60 + f * 120, 70 * (1 - f * 0.4), { sombra: false, giro: f * 4 }); }
    cuerpo(ctx, cx - 230, s.y + 170, 460, 260, 26, s.color || '#9a7b4f'); remaches(ctx, cx - 230, s.y + 170, 460, 260, 18);
    ctx.save(); forma(ctx, cx - 190, s.y + 200, 380, 200, 18); ctx.clip(); ctx.fillStyle = '#1f252a'; ctx.fillRect(cx - 190, s.y + 200, 380, 200);
    engranaje(ctx, cx - 82, cy, 78, 14, s.t * 3.2); engranaje(ctx, cx + 82, cy, 78, 14, -s.t * 3.2 + 0.22);
    ctx.restore(); forma(ctx, cx - 190, s.y + 200, 380, 200, 18); ctx.strokeStyle = TINTA; ctx.lineWidth = 5; ctx.stroke();
    for (let k = 0; k < 60; k++) { const f = (s.t * 1.3 + rnd(k)) % 1; ctx.fillStyle = k % 3 ? col : claro(col, 0.3); ctx.beginPath(); ctx.arc(cx + (rnd(k + 7) - 0.5) * 70 * (0.3 + f), s.y + 430 + f * (s.py - 60 - s.y - 430), 4 + rnd(k) * 3, 0, Math.PI * 2); ctx.fill(); }
    vapor(ctx, cx, s.py - 50, s.t, { color: hex(col).join(','), alfa: 0.35, alto: 80, ancho: 120, vel: 0.8 });
    const pg = ctx.createLinearGradient(0, s.py - 110, 0, s.py); pg.addColorStop(0, claro(col, 0.25)); pg.addColorStop(1, oscuro(col, 0.25));
    ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(cx, s.py - 10, 210, 70, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke();
    objeto(ctx, s.emoji, s.p.salida, s.x + s.w - 100, s.py - 4, 120);
  },
  // Horno de fundición: boca encendida, crisol que se inclina y vierte metal líquido con brillo y chispas
  fundir(ctx, s) {
    const cx = s.x + s.w / 2 - 90, cy = s.py - 300;
    cuerpo(ctx, cx - 230, s.py - 200, 460, 200, 20, '#6d4c41');
    ctx.save(); forma(ctx, cx - 230, s.py - 200, 460, 200, 20); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) ctx.strokeRect(cx - 230 + c * 50 - (r % 2) * 25, s.py - 200 + r * 34, 50, 34); ctx.restore();
    llamas(ctx, cx - 150, s.py - 200, 300, s.t, { alto: 120 });
    const inc = clamp(Math.sin(s.t * 0.9) * 1.2 + 0.1) * 0.55;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(inc);
    ctx.beginPath(); ctx.moveTo(-170, -120); ctx.lineTo(170, -120); ctx.lineTo(130, 110); ctx.lineTo(-130, 110); ctx.closePath();
    const cg = ctx.createLinearGradient(-170, 0, 170, 0); cg.addColorStop(0, '#4a525a'); cg.addColorStop(0.4, '#8a98a6'); cg.addColorStop(1, '#3a434b'); ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 6; ctx.stroke();
    const mg = ctx.createLinearGradient(0, -110, 0, -50); mg.addColorStop(0, '#fff7c0'); mg.addColorStop(1, '#ff7a1a');
    ctx.save(); ctx.shadowColor = 'rgba(255,150,40,0.9)'; ctx.shadowBlur = 40; ctx.fillStyle = mg; ctx.fillRect(-155, -112, 310, 60); ctx.restore();
    ctx.restore();
    if (inc > 0.3) {
      ctx.save(); ctx.shadowColor = 'rgba(255,160,40,1)'; ctx.shadowBlur = 30; const sg = ctx.createLinearGradient(0, cy - 100, 0, s.py - 120); sg.addColorStop(0, '#fff7c0'); sg.addColorStop(1, '#ff8a1a');
      ctx.strokeStyle = sg; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + 175, cy - 90); ctx.quadraticCurveTo(cx + 250, cy - 60, cx + 275, s.py - 130); ctx.stroke(); ctx.restore();
      chispas(ctx, cx + 275, s.py - 120, s.t, { dir: -Math.PI / 2, abre: 2.2, largo: 160, n: 14 });
    }
    cuerpo(ctx, cx + 200, s.py - 120, 160, 120, 10, '#5d6973');
    ctx.save(); forma(ctx, cx + 214, s.py - 104, 132, 50, 6); ctx.clip(); liquido(ctx, cx + 214, s.py - 104 + 50 * (1 - inc), 132, 60, '#ff9a2e', s.t); ctx.restore();
    objeto(ctx, s.emoji, s.p.salida, s.x + s.w - 80, s.py - 4, 110);
  },
  // Secadero: ventanal con sol, ventiladores que giran, bandejas y aire que corre
  secado(ctx, s) {
    const cx = s.x + s.w / 2;
    for (const [fx, fy] of [[s.x + 120, s.y + 140], [s.x + s.w - 120, s.y + 140]]) {
      cuerpo(ctx, fx - 80, fy - 80, 160, 160, 30, '#b0bcc6');
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(s.t * 9); for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.fillStyle = 'rgba(60,70,80,0.85)'; ctx.beginPath(); ctx.ellipse(32, 0, 34, 14, 0.3, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
      ctx.beginPath(); ctx.arc(fx, fy, 64, 0, Math.PI * 2); ctx.strokeStyle = TINTA; ctx.lineWidth = 5; ctx.stroke(); for (let r = 20; r < 64; r += 14) { ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.stroke(); }
    }
    for (let r = 0; r < 3; r++) {
      const yy = s.py - 60 - r * 150; cuerpo(ctx, cx - 300, yy, 600, 24, 8, '#a77b4f');
      for (let k = 0; k < 6; k++) { const seco = ((s.t * 0.5 + k * 0.3 + r * 0.7) % 3) > 1.4; objeto(ctx, s.emoji, seco ? s.p.salida : s.p.entrada, cx - 250 + k * 100, yy, 76, { sombra: false }); }
    }
    for (let k = 0; k < 2; k++) cuerpo(ctx, cx - 320 + k * 620, s.py - 400, 20, 400, 6, '#6c7884');
    ctx.save(); ctx.strokeStyle = 'rgba(200,230,255,0.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let k = 0; k < 7; k++) { const f = (s.t * 0.8 + k / 7) % 1, y = s.y + 220 + k * 40; ctx.globalAlpha = Math.sin(f * Math.PI); ctx.beginPath(); for (let i = 0; i < 24; i++) { const x = s.x + 120 + f * (s.w - 240) + i * 9, yy = y + Math.sin(i * 0.5 + s.t * 5) * 8; i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); }
    ctx.restore();
  },
  // Tanques de fermentación con visor de burbujas, manómetros y reloj que corre rápido
  fermenta(ctx, s) {
    const cx = s.x + s.w / 2;
    for (const dx of [-200, 200]) {
      const x = cx + dx, top = s.py - 480;
      cuerpo(ctx, x - 140, top + 50, 280, 430, 60, s.color || '#c3ccd4'); remaches(ctx, x - 140, top + 50, 280, 430, 24);
      ctx.fillStyle = '#9aa7b3'; ctx.beginPath(); ctx.ellipse(x, top + 60, 140, 40, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke();
      ctx.save(); forma(ctx, x - 26, top + 140, 52, 240, 26); ctx.clip(); ctx.fillStyle = '#2a3036'; ctx.fillRect(x - 26, top + 140, 52, 240);
      liquido(ctx, x - 26, top + 200, 52, 200, s.p.color || '#c8a060', s.t + dx);
      for (let k = 0; k < 8; k++) { const f = (s.t * 0.7 + k / 8 + dx) % 1; ctx.beginPath(); ctx.arc(x - 12 + rnd(k + dx) * 24, top + 380 - f * 180, 4 + rnd(k) * 4, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore(); forma(ctx, x - 26, top + 140, 52, 240, 26); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke();
      manometro(ctx, x + 80, top + 150, 30, 0.45 + 0.08 * Math.sin(s.t * 2 + dx));
      objeto(ctx, s.emoji, s.p.entrada, x - 80, top + 260, 70, { sombra: false });
      for (const lx of [x - 100, x + 100]) cuerpo(ctx, lx - 10, s.py - 40, 20, 40, 4, '#6c7884');
    }
    // Reloj: las horas pasan rápido
    const rx = cx, ry = s.y + 110; ctx.beginPath(); ctx.arc(rx, ry, 70, 0, Math.PI * 2); ctx.fillStyle = '#fbf8f1'; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 6; ctx.stroke();
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(rx + Math.cos(a) * 54, ry + Math.sin(a) * 54); ctx.lineTo(rx + Math.cos(a) * 62, ry + Math.sin(a) * 62); ctx.lineWidth = 3; ctx.stroke(); }
    ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(s.t * 5 - 1.57) * 50, ry + Math.sin(s.t * 5 - 1.57) * 50); ctx.stroke();
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(s.t * 0.42 - 1.57) * 32, ry + Math.sin(s.t * 0.42 - 1.57) * 32); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.font = '400 30px "Archivo Black", Impact, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(`+${Math.floor(s.t * 3) % 72} H`, rx, ry + 110);
  },
  // Extrusora: tolva, cilindro con bandas calientes, tornillo que gira y la tira continua cortada por una cuchilla
  extruir(ctx, s) {
    const base = cinta(ctx, s.x, s.x + s.w, s.py, s.t, { mundo: s.mundo, vel: 90 }), col = s.p.color || '#d7263d', x0 = s.x + 40;
    ctx.fillStyle = '#9aa7b3'; ctx.beginPath(); ctx.moveTo(x0 + 70, s.y + 40); ctx.lineTo(x0 + 250, s.y + 40); ctx.lineTo(x0 + 190, s.y + 160); ctx.lineTo(x0 + 130, s.y + 160); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke();
    for (let k = 0; k < 3; k++) { const f = (s.t * 0.8 + k / 3) % 1; objeto(ctx, s.emoji, s.p.entrada, x0 + 120 + k * 40, s.y + 60 + f * 90, 56, { sombra: false }); }
    cuerpo(ctx, x0, s.y + 160, 420, 150, 30, s.color || '#3f8f5f'); remaches(ctx, x0, s.y + 160, 420, 150);
    ctx.save(); forma(ctx, x0 + 40, s.y + 200, 340, 70, 30); ctx.clip(); ctx.fillStyle = '#2a3036'; ctx.fillRect(x0 + 40, s.y + 200, 340, 70);
    ctx.strokeStyle = '#c7d0d8'; ctx.lineWidth = 10; for (let x = x0 + 20 - ((s.t * 120) % 40); x < x0 + 400; x += 40) { ctx.beginPath(); ctx.moveTo(x, s.y + 200); ctx.lineTo(x + 26, s.y + 270); ctx.stroke(); }
    ctx.restore();
    for (let k = 0; k < 4; k++) { const hx = x0 + 70 + k * 80; ctx.save(); ctx.shadowColor = 'rgba(255,90,40,0.9)'; ctx.shadowBlur = 20 + 10 * Math.sin(s.t * 4 + k); cuerpo(ctx, hx, s.y + 186, 24, 98, 6, '#d9541e'); ctx.restore(); }
    for (let k = 0; k < 2; k++) cuerpo(ctx, x0 + 60 + k * 280, s.y + 310, 30, base - (s.y + 310), 6, '#6c7884');
    // Boquilla y tira continua
    cuerpo(ctx, x0 + 410, base - 110, 70, 90, 10, '#8a98a6');
    const tg = ctx.createLinearGradient(0, base - 70, 0, base); tg.addColorStop(0, claro(col, 0.3)); tg.addColorStop(1, oscuro(col, 0.2));
    ctx.fillStyle = tg; forma(ctx, x0 + 480, base - 64, s.x + s.w - x0 - 480, 60, 12); ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = TINTA; ctx.lineWidth = 4; for (let x = x0 + 600 + ((s.t * 90 + s.mundo) % 130); x < s.x + s.w; x += 130) { ctx.beginPath(); ctx.moveTo(x, base - 64); ctx.lineTo(x, base - 4); ctx.stroke(); }
    const kx = x0 + 640, kb = Math.max(0, Math.sin(s.t * 4.8)) ** 4; cuerpo(ctx, kx - 14, base - 220 + kb * 140, 28, 90, 4, '#dfe6ec'); cuerpo(ctx, kx - 40, base - 260, 80, 50, 10, '#5d6973');
    objeto(ctx, s.emoji, s.p.salida, s.x + s.w - 100, base - 70, 100, { sombra: false });
  },
  // Exterior: cielo, sol, cerros, la planta o árbol con frutos y la caja que se llena
  cosecha(ctx, s) {
    ctx.save(); forma(ctx, s.x - 1, s.y, s.w + 2, s.h, 0); ctx.clip();
    const cg = ctx.createLinearGradient(0, s.y, 0, s.py); cg.addColorStop(0, '#7ec8f2'); cg.addColorStop(1, '#d9f0fb'); ctx.fillStyle = cg; ctx.fillRect(s.x - 1, s.y, s.w + 2, s.py - s.y);
    luz(ctx, s.x + s.w - 140, s.y + 110, 46, 'rgb(255,214,90)', 1);
    for (let k = 0; k < 3; k++) { const x = s.x + ((k * 360 + s.t * 18) % (s.w + 300)) - 150, y = s.y + 70 + k * 46; ctx.fillStyle = 'rgba(255,255,255,0.9)'; for (const [dx, r] of [[0, 34], [36, 44], [78, 30]]) { ctx.beginPath(); ctx.arc(x + dx, y, r, 0, Math.PI * 2); ctx.fill(); } }
    ctx.fillStyle = '#7fbf6a'; ctx.beginPath(); ctx.moveTo(s.x - 1, s.py - 120); ctx.quadraticCurveTo(s.x + s.w * 0.3, s.py - 260, s.x + s.w * 0.6, s.py - 150); ctx.quadraticCurveTo(s.x + s.w * 0.85, s.py - 80, s.x + s.w + 1, s.py - 170); ctx.lineTo(s.x + s.w + 1, s.py); ctx.lineTo(s.x - 1, s.py); ctx.fill();
    const tg = ctx.createLinearGradient(0, s.py, 0, s.y + s.h); tg.addColorStop(0, '#6aa84f'); tg.addColorStop(1, '#4b7f37'); ctx.fillStyle = tg; ctx.fillRect(s.x - 1, s.py, s.w + 2, s.y + s.h - s.py);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 6; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(s.x + k * 140, s.py + 4); ctx.lineTo(s.x + k * 140 - 120, s.y + s.h); ctx.stroke(); }
    ctx.restore();
    // Árbol
    const tx = s.x + 300, ty = s.py;
    const tr = ctx.createLinearGradient(tx - 30, 0, tx + 30, 0); tr.addColorStop(0, '#6d4425'); tr.addColorStop(0.5, '#9a6638'); tr.addColorStop(1, '#5a3820');
    ctx.fillStyle = tr; ctx.beginPath(); ctx.moveTo(tx - 36, ty); ctx.lineTo(tx - 20, ty - 330); ctx.lineTo(tx + 20, ty - 330); ctx.lineTo(tx + 36, ty); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 4; ctx.stroke();
    for (const [dx, dy, r, c] of [[-150, -380, 140, '#3f8f4a'], [150, -390, 140, '#3f8f4a'], [0, -480, 170, '#4ca659'], [-70, -400, 120, '#5bb868'], [80, -420, 110, '#5bb868']]) {
      const g = ctx.createRadialGradient(tx + dx - r * 0.3, ty + dy - r * 0.3, r * 0.2, tx + dx, ty + dy, r); g.addColorStop(0, claro(c, 0.25)); g.addColorStop(1, oscuro(c, 0.2));
      ctx.beginPath(); ctx.arc(tx + dx, ty + dy + Math.sin(s.t * 1.5 + dx) * 3, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3; ctx.stroke();
    }
    for (let k = 0; k < 7; k++) objeto(ctx, s.emoji, s.p.entrada, tx - 170 + (k % 4) * 115, ty - 470 + Math.floor(k / 4) * 130 + Math.sin(s.t * 2 + k) * 4, 70, { sombra: false });
    for (let k = 0; k < 3; k++) { const f = (s.t * 0.6 + k / 3) % 1; objeto(ctx, s.emoji, s.p.entrada, tx + 140 + f * 280, ty - 330 + f * f * 270, 66, { sombra: false, giro: f * 5 }); }
    // Caja de madera que se llena
    const bx = s.x + s.w - 260, by = s.py - 10;
    cuerpo(ctx, bx - 140, by - 170, 280, 170, 8, '#b5854a'); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(bx - 140, by - 170 + k * 42); ctx.lineTo(bx + 140, by - 170 + k * 42); ctx.stroke(); }
    for (let k = 0; k < 4; k++) objeto(ctx, s.emoji, s.p.salida || s.p.entrada, bx - 90 + k * 60, by - 160, 74, { sombra: false });
  },
  // Exterior: carretera, ciudad que pasa y el camión rumbo a la tienda
  camion(ctx, s) {
    ctx.save(); forma(ctx, s.x - 1, s.y, s.w + 2, s.h, 0); ctx.clip();
    const cg = ctx.createLinearGradient(0, s.y, 0, s.py); cg.addColorStop(0, '#ffb26b'); cg.addColorStop(1, '#ffe4b8'); ctx.fillStyle = cg; ctx.fillRect(s.x - 1, s.y, s.w + 2, s.py);
    luz(ctx, s.x + 200, s.y + 160, 50, 'rgb(255,220,120)', 1);
    for (let k = 0; k < 12; k++) { const w = 80 + rnd(k) * 60, h = 160 + rnd(k + 3) * 220, x = s.x + ((k * 110 - s.t * 60) % (s.w + 200) + s.w + 200) % (s.w + 200) - 100;
      ctx.fillStyle = k % 2 ? '#8a7fa8' : '#a497c0'; ctx.fillRect(x, s.py - 120 - h, w, h); ctx.fillStyle = 'rgba(255,240,180,0.7)'; for (let r = 0; r < h / 40 - 1; r++) for (let c = 0; c < 2; c++) if (rnd(k * 31 + r * 3 + c) > 0.4) ctx.fillRect(x + 14 + c * (w / 2 - 6), s.py - 100 - h + r * 40, 18, 22); }
    ctx.fillStyle = '#4b5158'; ctx.fillRect(s.x - 1, s.py - 130, s.w + 2, s.y + s.h - s.py + 130);
    ctx.fillStyle = '#f2c230'; for (let x = s.x - ((s.t * 420) % 180); x < s.x + s.w; x += 180) ctx.fillRect(x, s.py - 52, 90, 12);
    ctx.restore();
    const tienda = s.x + s.w + 260 - ((s.t * 70) % (s.w + 520));
    objeto(ctx, s.emoji, '🏪', tienda, s.py - 120, 230, { sombra: false });
    const tx = s.x + s.w * 0.42, bote = Math.abs(Math.sin(s.t * 10)) * 5;
    vapor(ctx, tx - 160, s.py - 60, s.t, { color: '120,120,120', alfa: 0.35, alto: 80, ancho: -60, vel: 1.2 });
    objeto(ctx, s.emoji, '🚚', tx, s.py - 30 - bote, 280, { giro: 0 });
    objeto(ctx, s.emoji, s.p.salida || '📦', tx + 20, s.py - 250 - bote, 80, { sombra: false });
  }
};

export const TIPOS_MAQUINA = Object.keys(MAQ);
// La estación de una máquina. continuo: va pegada a las demás y el fondo (fondoFabrica) ya está dibujado
export function dibujarMaquina(ctx, tipo, b, t, paso, emoji, acento = '#e7b93a', { continuo = false, mundo = 0 } = {}) {
  const py = b.y + b.h * 0.8;
  if (!continuo) fondoFabrica(ctx, b, mundo, t, acento);
  ctx.save(); forma(ctx, b.x, b.y, b.w, b.h, continuo ? 0 : 40); ctx.clip();
  (MAQ[tipo] || MAQ.cinta)(ctx, { x: b.x, y: b.y, w: b.w, h: b.h, py, t, p: paso, emoji, color: null, mundo, acento });
  ctx.restore();
}
