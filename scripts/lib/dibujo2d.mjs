// Piezas de dibujo del motor 2D (SIN IA): todo sale de código y de emojis (Noto Color Emoji, gratis). El motor 2D toma el mismo
// guion que el 3D (video3d/guiones/…) y la misma preparación (voz local, tiempos, música y efectos: video3d-preparar.mjs);
// aquí solo está cómo se dibuja cada cosa. Los colores del cielo y del suelo salen del ambiente del video (video3d/src/ambientes.js).
import { createCanvas } from '@napi-rs/canvas';

export const W = 1080, H = 1920, FPS = 30;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = (x) => 1 - (1 - clamp(x)) ** 3;
export const easeInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export const lerp = (a, b, t) => a + (b - a) * t;
export const rebote = (x) => { x = clamp(x); const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
export const salida = (x) => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; }; // pasa de largo y vuelve (pop)
export function azar(semilla) { let s = semilla % 2147483647 || 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const BLACK = '"Archivo Black", Impact, sans-serif', SANS = '"IBM Plex Sans", system-ui, sans-serif';
export const AMARILLO = '#ffd23c';

// ---------- nombre de modelo 3D → emoji ----------
const REGLAS = [
  [/apple/, '🍎'], [/tomato/, '🍅'], [/strawberry/, '🍓'], [/orange/, '🍊'], [/banana/, '🍌'], [/lemon/, '🍋'], [/broccoli/, '🥦'], [/grapes/, '🍇'],
  [/watermelon/, '🍉'], [/cherries/, '🍒'], [/carrot/, '🥕'], [/eggplant/, '🍆'], [/egg-cooked/, '🍳'], [/egg/, '🥚'], [/pizza/, '🍕'], [/honey/, '🍯'],
  [/croissant/, '🥐'], [/bread|loaf/, '🍞'], [/chocolate/, '🍫'], [/ice-cream|popsicle|sundae/, '🍦'], [/cup-coffee|mug|cup/, '☕'], [/fish/, '🐟'],
  [/cookie/, '🍪'], [/onion/, '🧅'], [/knife/, '🔪'], [/lollypop/, '🍭'], [/shaker-salt/, '🧂'], [/mussel/, '🦪'], [/taco/, '🌮'], [/burger/, '🍔'],
  [/donut/, '🍩'], [/cake|cupcake/, '🍰'], [/pineapple/, '🍍'], [/coconut/, '🥥'], [/corn/, '🌽'], [/pear/, '🍐'], [/mushroom/, '🍄'], [/peanut/, '🥜'],
  [/palm/, '🌴'], [/pine|cone/, '🌲'], [/tree|plant_bush|bush/, '🌳'], [/flower_red/, '🌹'], [/flower_purple/, '🪻'], [/flower/, '🌼'], [/cactus/, '🌵'],
  [/rock|stone|cliff/, '🪨'], [/log|stump/, '🪵'], [/bed/, '🛏️'], [/canoe/, '🛶'], [/statue|obelisk/, '🗿'], [/campfire/, '🔥'], [/tent/, '⛺'],
  [/police/, '🚓'], [/taxi/, '🚕'], [/ambulance/, '🚑'], [/firetruck/, '🚒'], [/tractor/, '🚜'], [/truck|delivery|van/, '🚚'], [/suv/, '🚙'], [/race/, '🏎️'], [/sedan|autos/, '🚗'],
  [/building/, '🏢'], [/aid-glasses/, '👓'], [/aid-cane/, '🦯'], [/wheelchair/, '♿'],
  [/^moneda$/, '🪙'], [/^balon$/, '⚽'], [/^celular$/, '📱'], [/^libro$/, '📖'], [/^corazon$/, '🫀'], [/^ladrillo$/, '🧱'], [/^botella$/, '💧'], [/^piscina$/, '🏊'], [/^banera$/, '🛁']
];
export const emojiDe = (nombre) => { const n = String(nombre || 'moneda'); if (/\p{Extended_Pictographic}|[\u1680-\u16FF\u{1F1E6}-\u{1F1FF}]/u.test(n)) return n; // un emoji (o runa) escrito en el guion va tal cual
 for (const [re, e] of REGLAS) if (re.test(n)) return e; return '⭐'; };

// ---------- emoji como imagen (se dibuja una vez y se reutiliza: miles de copias por cuadro salen baratas) ----------
const cache = new Map();
export function spriteEmoji(emoji, px = 192) {
  const k = `${emoji}|${px}`; if (cache.has(k)) return cache.get(k);
  const c = createCanvas(px * 1.3, px * 1.3), g = c.getContext('2d');
  g.font = `${px}px "Noto Color Emoji"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, px * 0.65, px * 0.7);
  cache.set(k, c); return c;
}
// Dibuja un objeto (por su nombre 3D) centrado en (x, y) con ese tamaño en px
export function objeto2d(ctx, nombre, x, y, size, { rot = 0, alpha = 1, flip = false, sombra = true } = {}) {
  const s = spriteEmoji(emojiDe(nombre), size > 260 ? 384 : size > 110 ? 192 : 96);
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
  if (sombra) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, size * 0.52, size * 0.34, size * 0.07, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.drawImage(s, -size * 0.65, -size * 0.7, size * 1.3, size * 1.3); ctx.restore();
}

// ---------- texto ----------
export function txt(ctx, s, x, y, size, { color = '#fff', trazo = 'rgba(10,20,40,0.85)', grosor = 0.08, align = 'center', fuente = BLACK, base = 'middle' } = {}) {
  ctx.font = `${size}px ${fuente}`; ctx.textAlign = align; ctx.textBaseline = base; ctx.lineJoin = 'round';
  if (trazo) { ctx.strokeStyle = trazo; ctx.lineWidth = size * grosor * 2; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
export const formato = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export function pastilla(ctx, x, y, w, h, fondo, borde) {
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h * 0.4); ctx.fillStyle = fondo; ctx.fill(); if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = 5; ctx.stroke(); }
}

// ---------- paisaje: cielo, nubes, colinas, suelo y árboles según el ambiente ----------
export function paisaje(ctx, A, t, { horizonte = 0.5, arboles = 9, semilla = 7, oscuro = 0 } = {}) {
  const hy = H * horizonte, g = ctx.createLinearGradient(0, 0, 0, hy);
  g.addColorStop(0, A.cielo[0]); g.addColorStop(0.5, A.cielo[1]); g.addColorStop(1, A.cielo[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy + 2);
  const r = azar(semilla);
  if (/noche/.test(A.nombre || '')) for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * Math.abs(Math.sin(t * 1.5 + i))})`; ctx.fillRect(r() * W, r() * hy * 0.9, 4, 4); }
  else { ctx.fillStyle = 'rgba(255,248,210,0.9)'; ctx.beginPath(); ctx.arc(W * 0.8, hy * 0.28, 90, 0, 7); ctx.fill(); }
  for (let i = 0; i < 5; i++) { // nubes que pasan despacio
    const cx = ((r() * W * 1.6 + t * (8 + i * 4)) % (W * 1.6)) - W * 0.3, cy = hy * (0.15 + r() * 0.5), s = 60 + r() * 60;
    ctx.fillStyle = 'rgba(255,255,255,0.78)'; for (const [dx, dy, k] of [[0, 0, 1], [0.9, 0.2, 0.8], [-0.9, 0.25, 0.75], [0.4, -0.4, 0.7]]) { ctx.beginPath(); ctx.arc(cx + dx * s, cy + dy * s, s * k, 0, 7); ctx.fill(); }
  }
  const suelo = A.suelo;
  ctx.fillStyle = sombrear(suelo, -0.12); ctx.beginPath(); ctx.moveTo(0, hy); for (let x = 0; x <= W; x += 60) ctx.lineTo(x, hy - 50 - 40 * Math.sin(x * 0.006 + semilla)); ctx.lineTo(W, hy + 30); ctx.lineTo(0, hy + 30); ctx.fill();
  const gs = ctx.createLinearGradient(0, hy, 0, H); gs.addColorStop(0, sombrear(suelo, 0.08)); gs.addColorStop(1, sombrear(suelo, -0.15));
  ctx.fillStyle = gs; ctx.fillRect(0, hy, W, H - hy);
  for (let i = 0; i < arboles; i++) arbol(ctx, A, (i + 0.5) / arboles * W + (r() - 0.5) * 80, hy + 6 + r() * 30, 0.7 + r() * 0.7, t, i);
  if (oscuro) { ctx.fillStyle = `rgba(0,0,30,${oscuro})`; ctx.fillRect(0, 0, W, H); }
}
export function sombrear(hex, k) { // k > 0 aclara, k < 0 oscurece
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(clamp(k > 0 ? v + (255 - v) * k : v * (1 + k), 0, 255)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function arbol(ctx, A, x, y, s, t, i) {
  const sway = Math.sin(t * 1.3 + i) * 3 * s, pino = (A.arboles || []).join(' ').includes('pine') && i % 2;
  ctx.fillStyle = '#7a4e2d'; ctx.fillRect(x - 9 * s, y - 70 * s, 18 * s, 70 * s);
  const verde = ['#3e9b4a', '#4aae52', '#2f8a43'][i % 3];
  if (pino) { ctx.fillStyle = verde; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + sway * k * 0.3, y - (150 - k * 28) * s); ctx.lineTo(x - (60 - k * 8) * s, y - (50 + k * 26) * s); ctx.lineTo(x + (60 - k * 8) * s, y - (50 + k * 26) * s); ctx.fill(); } }
  else { ctx.fillStyle = verde; ctx.beginPath(); ctx.arc(x + sway, y - 100 * s, 55 * s, 0, 7); ctx.arc(x - 38 * s + sway, y - 80 * s, 38 * s, 0, 7); ctx.arc(x + 38 * s + sway, y - 80 * s, 38 * s, 0, 7); ctx.fill(); }
}

// ---------- personitas (para «gente» y los cierres) ----------
const PIELES = ['#f1c27d', '#e0a370', '#c68642', '#8d5524', '#ffdbac', '#a8693a'], ROPAS = ['#ef476f', '#118ab2', '#06d6a0', '#ffd166', '#8338ec', '#fb8500', '#3a86ff', '#ff006e'], PELOS = ['#2b1b10', '#5a3a1a', '#111', '#9a5b2b', '#d4a24c'];
export function persona(ctx, x, y, h, i, t, { salta = 0, saluda = false } = {}) {
  const piel = PIELES[i % PIELES.length], ropa = ROPAS[(i * 3 + 1) % ROPAS.length], pelo = PELOS[(i * 7) % PELOS.length], bob = Math.sin(t * 4 + i) * h * 0.02 - salta * h;
  ctx.save(); ctx.translate(x, y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, bob * -1 + 2, h * 0.28, h * 0.05, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#334155'; ctx.fillRect(-h * 0.13, -h * 0.28, h * 0.1, h * 0.28); ctx.fillRect(h * 0.03, -h * 0.28, h * 0.1, h * 0.28); // piernas
  ctx.fillStyle = ropa; ctx.beginPath(); ctx.roundRect(-h * 0.2, -h * 0.62, h * 0.4, h * 0.38, h * 0.1); ctx.fill(); // torso
  ctx.strokeStyle = piel; ctx.lineWidth = h * 0.07; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.55); ctx.lineTo(-h * 0.3, -h * (saluda ? 0.82 + 0.05 * Math.sin(t * 9 + i) : 0.36)); ctx.moveTo(h * 0.2, -h * 0.55); ctx.lineTo(h * 0.3, -h * 0.36); ctx.stroke();
  ctx.fillStyle = piel; ctx.beginPath(); ctx.arc(0, -h * 0.78, h * 0.2, 0, 7); ctx.fill();
  ctx.fillStyle = pelo; ctx.beginPath(); ctx.arc(0, -h * 0.84, h * 0.2, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-h * 0.07, -h * 0.78, h * 0.022, 0, 7); ctx.arc(h * 0.07, -h * 0.78, h * 0.022, 0, 7); ctx.fill();
  ctx.strokeStyle = '#7a2d2d'; ctx.lineWidth = h * 0.012; ctx.beginPath(); ctx.arc(0, -h * 0.74, h * 0.06, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.restore();
}

// ---------- logo de la marca (círculo) ----------
export function logo(ctx, img, cx, cy, size) {
  if (!img) return;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, 7); ctx.clip();
  const w = size * 1.92, h = w * (img.height / img.width); ctx.drawImage(img, cx - size / 2 - size * 0.46, cy - size / 2 - size * 0.31, w, h); ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, 7); ctx.strokeStyle = '#fff'; ctx.lineWidth = size * 0.07; ctx.stroke();
}
