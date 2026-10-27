/* CirculArte · nombres con otras formas de dibujar, siempre con círculos:
   hilos   — un solo hilo va de clavo en clavo alrededor de un círculo (string art) hasta que aparece el nombre.
   anillos — el nombre partido en anillos que giran como un candado; al alinearse todos, se lee.
   costura — una aguja borda el nombre puntada por puntada sobre tela, en un bastidor redondo.
   Mismo contrato que src/fisica.js: buildArte() da una corrida { total, events, … } (events suenan con synthAudio)
   y drawArte() dibuja cualquier instante. La web, scripts/arte.mjs y la publicación automática usan esto. */
import { textCanvas, cropAlpha, newCanvas, makeRng, marching, smoothLoop, orient, TAU, clamp, smooth } from './engine.js';
import { applyMelody, MELODIA_IDS } from './melodias.js';

export const ARTE_MODES = ['hilos', 'anillos', 'costura'];
// Todos los estilos de nombre: los dos primeros siguen siendo epiciclos (src/engine.js, NAME_VARIANTS)
export const NAME_STYLES = ['clasico', 'espejo', 'mandala', 'hilos', 'anillos', 'costura'];
export const NAME_STYLE_NAMES = {
  clasico: ['Clásico', 'Classic'], espejo: ['Espejo', 'Mirror'], mandala: ['Mandala', 'Mandala'],
  hilos: ['Hilos', 'Threads'], anillos: ['Anillos', 'Rings'], costura: ['Costura', 'Stitching']
};

// Texto de arriba (gancho) y de abajo (invitación) de cada estilo; sin decir el nombre
export const STYLE_HOOKS = {
  espejo: {
    es: ['¿Qué nombre se esconde en este espejo? 👀', 'Tu nombre en espejo forma una criatura… ¿de quién es? 🤔', 'Escribí un nombre y lo reflejé. ¿Adivinas cuál? 👇', 'Mira hasta el final: abajo aparece el nombre 😳'],
    en: ['Which name is hiding in this mirror? 👀', 'A name in a mirror makes a creature… whose is it? 🤔', 'I wrote a name and mirrored it. Can you guess it? 👇', 'Watch to the end: the name shows up below 😳']
  },
  mandala: {
    es: ['Un nombre, varias veces, solo con círculos ✨', '¿Qué nombre forma este mandala? 👀', 'Solo círculos girando… espera el mandala completo 🌀', 'Etiqueta a alguien con este nombre 👇'],
    en: ['One name, many times, only with circles ✨', 'Which name makes this mandala? 👀', 'Just circles spinning… wait for the full mandala 🌀', 'Tag someone with this name 👇']
  },
  hilos: {
    es: ['Un hilo, cientos de clavos… ¿qué nombre sale? 🧵', '¿Cuántos hilos hacen falta para escribir un nombre? 👀', 'Mira cómo aparece el nombre entre los hilos 😳', 'Solo hilo y clavos, de clavo en clavo 🧵'],
    en: ['One thread, hundreds of pins… which name appears? 🧵', 'How many threads does it take to write a name? 👀', 'Watch the name appear between the threads 😳', 'Just thread and pins, from pin to pin 🧵']
  },
  anillos: {
    es: ['Cuando los anillos se alineen, aparece un nombre 🔒', '¿Adivinas el nombre antes del último anillo? 👀', 'Gira, gira… ¡clic! ¿Qué nombre es? 🔐', 'Comenta el nombre antes de que se abra 👇'],
    en: ['When the rings line up, a name appears 🔒', 'Can you guess the name before the last ring? 👀', 'Spin, spin… click! Which name is it? 🔐', 'Comment the name before it opens 👇']
  },
  costura: {
    es: ['Bordando un nombre a mano, puntada por puntada 🪡', '¿Adivinas el nombre antes de la última puntada? 👀', 'Una aguja, un hilo y mucha paciencia 🧵', 'Mira cómo aparece el nombre en la tela 😳'],
    en: ['Stitching a name by hand, one stitch at a time 🪡', 'Can you guess the name before the last stitch? 👀', 'One needle, one thread and lots of patience 🧵', 'Watch the name appear on the fabric 😳']
  }
};
// Parejas («Ana & Luis»): anillos o costura fuera del estilo clásico
const PAIR_HOOKS = {
  anillos: {
    es: ['Cuando los anillos se alineen, aparece una pareja 🔒💞', '¿Adivinas la pareja antes del último anillo? 👀', 'Gira, gira… ¡clic! ¿Qué pareja es? 💘', 'Comenta la pareja antes de que se abra 👇'],
    en: ['When the rings line up, a couple appears 🔒💞', 'Can you guess the couple before the last ring? 👀', 'Spin, spin… click! Which couple is it? 💘', 'Comment the couple before it opens 👇']
  },
  costura: {
    es: ['Bordando una pareja a mano, puntada por puntada 🪡💞', '¿Adivinas la pareja antes de la última puntada? 👀', 'Un regalo bordado a mano para una pareja 💘', 'Mira qué pareja aparece en la tela 😳'],
    en: ['Stitching a couple by hand, one stitch at a time 🪡💞', 'Can you guess the couple before the last stitch? 👀', 'A hand-stitched gift for a couple 💘', 'Watch which couple appears on the fabric 😳']
  }
};
const PAIR_PROMPTS = { es: ['Etiqueta a tu pareja 👇', 'Si son ustedes, comenta 💞', '¿Los adivinaste antes del final? 👀'], en: ['Tag your partner 👇', 'If it is you two, comment 💞', 'Did you guess them before the end? 👀'] };
const STYLE_PROMPTS = {
  es: ['Comenta si es tu nombre 👇', 'Etiqueta a alguien que se llame así 👇', '¿Lo adivinaste antes del final? 👀'],
  en: ['Comment if it is your name 👇', 'Tag someone with this name 👇', 'Did you guess it before the end? 👀']
};
export const styleHook = (style, lang, seed, pair = false) => { const l = ((pair && PAIR_HOOKS[style]) || STYLE_HOOKS[style])?.[lang === 'en' ? 'en' : 'es']; return l ? l[(seed >>> 0) % l.length] : ''; };
const stylePrompt = (lang, seed, pair) => { const l = (pair ? PAIR_PROMPTS : STYLE_PROMPTS)[lang === 'en' ? 'en' : 'es']; return l[Math.floor((seed >>> 0) / 5) % l.length]; };

const BG = '#141112', FG = '#f3eeea';
const fitText = (ctx, text, x, y, size, maxW, family, fallback = '') => {
  ctx.font = `600 ${size}px ${family}${fallback}`; const w = ctx.measureText(text).width;
  if (w > maxW) ctx.font = `600 ${size * maxW / w}px ${family}${fallback}`;
  ctx.fillText(text, x, y);
};

/* ---------------- Hilos ---------------- */
// String art de letras: clavos sobre el borde de cada letra y un hilo que cruza la letra por dentro, de clavo en
// clavo, pasando primero por donde todavía falta hilo. Alrededor, un aro de clavos.
const G = 400; // resolución del cálculo del hilo
function letterPins(mask, rng) {
  const edge = [];
  for (let y = 1; y < G - 1; y++) for (let x = 1; x < G - 1; x++) {
    const i = y * G + x; if (mask[i] && (!mask[i - 1] || !mask[i + 1] || !mask[i - G] || !mask[i + G])) edge.push(i);
  }
  for (let i = edge.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [edge[i], edge[j]] = [edge[j], edge[i]]; }
  // Separados al menos «cell» píxeles (grilla para no comparar con todos)
  const cell = 7, grid = new Map(), pins = [];
  for (const i of edge) {
    const x = i % G, y = (i / G) | 0, gx = Math.floor(x / cell), gy = Math.floor(y / cell); let ok = true;
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1 && ok; dx++) {
      for (const p of grid.get(`${gx + dx},${gy + dy}`) || []) if ((p[0] - x) ** 2 + (p[1] - y) ** 2 < cell * cell) { ok = false; break; }
    }
    if (ok) { const p = [x, y], k = `${gx},${gy}`; pins.push(p); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); }
  }
  return pins;
}
function threadSegs(mask, pins, rng, maxSegs) {
  const res = new Float32Array(G * G); for (let i = 0; i < res.length; i++) res[i] = mask[i] ? 1 : 0;
  const P = pins.length, near = pins.map(([x, y]) => {
    const out = []; for (let j = 0; j < P; j++) { const d = Math.hypot(pins[j][0] - x, pins[j][1] - y); if (d > 12 && d < 150) out.push(j); } return out;
  });
  const line = (a, b) => {
    const [x0, y0] = pins[a], [x1, y1] = pins[b], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)), out = new Int32Array(n + 1);
    for (let i = 0; i <= n; i++) out[i] = Math.round(y0 + (y1 - y0) * i / n) * G + Math.round(x0 + (x1 - x0) * i / n);
    return out;
  };
  const around = (a) => { const [x, y] = pins[a]; let s = 0, c = 0; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const i = (y + dy) * G + x + dx; if (mask[i]) { s += res[i]; c++; } } return c ? s / c : 0; };
  const segs = []; let cur = -1, restarts = 0;
  while (segs.length < maxSegs && restarts < 400) {
    if (cur < 0) {
      // Empezar donde más falta hilo (el mejor de 60 clavos al azar)
      let bs = 0; for (let k = 0; k < 60; k++) { const a = Math.floor(rng() * P), s = around(a); if (s > bs) { bs = s; cur = a; } }
      restarts++; if (bs < 0.35) break;
    }
    let best = -1, bs = 0, bIdx = null;
    for (const b of near[cur]) {
      const idx = line(cur, b); let inside = 0, s = 0;
      for (let i = 0; i < idx.length; i++) { if (mask[idx[i]]) { inside++; s += res[idx[i]]; } }
      if (inside < idx.length * 0.93) continue;
      s = s / idx.length * (0.55 + 0.45 * Math.min(1, idx.length / 70));
      if (s > bs) { bs = s; best = b; bIdx = idx; }
    }
    if (best < 0 || bs < 0.22) { cur = -1; continue; }
    for (let i = 0; i < bIdx.length; i++) res[bIdx[i]] -= 0.45;
    segs.push([cur, best]); cur = best;
  }
  return segs;
}
async function buildHilos(run, text, font, rng) {
  const c = cropAlpha(await textCanvas(text, font, '#ffffff'));
  // El nombre dentro del aro: ancho hasta el 82 % del diámetro, alto hasta el 50 %
  const k = Math.min(G * 0.82 / c.width, G * 0.5 / c.height), w = c.width * k, h = c.height * k;
  const g = newCanvas(G, G), gx = g.getContext('2d'); gx.drawImage(c, (G - w) / 2, (G - h) / 2, w, h);
  const { data } = gx.getImageData(0, 0, G, G), mask = new Uint8Array(G * G);
  for (let i = 0; i < G * G; i++) mask[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  const pins = letterPins(mask, rng), segs = threadSegs(mask, pins, rng, 2600);
  // Al principio el hilo va despacio (se ve cómo pasa de clavo en clavo) y después acelera
  const Td = 22, n = segs.length;
  run.pins = pins; run.segs = segs; run.drawT = Td; run.total = Td + 4.5;
  run.lineAt = (t) => n * Math.pow(clamp(t / Td), 2.2);
  for (let i = 1; i <= n; i++) run.events.push({ t: Td * Math.pow(i / n, 1 / 2.2), f: 440, v: 0.55 });
  run.text = text;
}
function drawHilos(ctx, run, t, view, o) {
  const { W, H, U } = view, cx = W / 2, cy = H * 0.45, R = Math.min(W * 0.44, H * 0.27), s = 2 * R / G;
  const X = (i) => cx + (run.pins[i][0] - G / 2) * s, Y = (i) => cy + (run.pins[i][1] - G / 2) * s;
  const nl = run.lineAt(t), full = Math.floor(nl);
  // Capa con los hilos ya puestos: se agrega solo lo nuevo (si el tiempo va hacia atrás, se rehace)
  let cache = run._cache;
  if (!cache || cache.W !== W || cache.n > full) { const cv = newCanvas(W, H); cache = run._cache = { cv, g: cv.getContext('2d'), n: 0, W }; }
  const g = cache.g; g.strokeStyle = 'rgba(243, 238, 234, 0.42)'; g.lineWidth = Math.max(0.8, 1.2 * U);
  if (full > cache.n) { g.beginPath(); for (let i = cache.n; i < full; i++) { const [a, b] = run.segs[i]; g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); } g.stroke(); cache.n = full; }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  // Aro de clavos
  ctx.strokeStyle = 'rgba(243, 238, 234, 0.3)'; ctx.lineWidth = 1.5 * U; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.fillStyle = FG; ctx.beginPath();
  for (let i = 0; i < 96; i++) { const a = TAU * i / 96, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; ctx.moveTo(x + 2.2 * U, y); ctx.arc(x, y, 2.2 * U, 0, TAU); }
  ctx.fill();
  ctx.drawImage(cache.cv, 0, 0);
  // Clavos de las letras y el tramo que se está poniendo, en el color del trazo
  ctx.fillStyle = 'rgba(243, 238, 234, 0.75)'; ctx.beginPath();
  for (let i = 0; i < run.pins.length; i++) { ctx.moveTo(X(i) + 1.3 * U, Y(i)); ctx.arc(X(i), Y(i), 1.3 * U, 0, TAU); }
  ctx.fill();
  if (full < run.segs.length) {
    const [a, b] = run.segs[full], u = nl - full, hx = X(a) + (X(b) - X(a)) * u, hy = Y(a) + (Y(b) - Y(a)) * u;
    ctx.strokeStyle = o.accent; ctx.lineWidth = 2.4 * U; ctx.beginPath(); ctx.moveTo(X(a), Y(a)); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = o.accent; ctx.beginPath(); ctx.arc(hx, hy, 5 * U, 0, TAU); ctx.fill();
  }
  // Al terminar, el nombre aparece abajo
  const e = smooth(run.drawT + 0.4, run.drawT + 1.6, t);
  if (e > 0) { ctx.globalAlpha = e; ctx.fillStyle = o.accent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; fitText(ctx, run.text.replace(/\n/g, ' '), W / 2, cy + R + 90 * U, 84 * U, W * 0.86, o.nameFamily); ctx.globalAlpha = 1; }
  return cy + R + 205 * U;
}

/* ---------------- Anillos ---------------- */
async function buildAnillos(run, text, font, rng) {
  run.img = cropAlpha(await textCanvas(text, font, run.accent));
  const n = 6, spin = 3.5, gap = 1.9, D = 1.3;
  // Se traban de afuera hacia adentro; el disco del centro (donde está casi todo el nombre) es el último
  run.rings = Array.from({ length: n }, (_, i) => {
    const lockAt = spin + (n - 1 - i) * gap, w = (i % 2 ? -1 : 1) * (1.6 + rng() * 1.6);
    // Con la fase elegida así, al terminar de frenar el ángulo es justo una vuelta entera (el nombre derecho)
    return { r0: i / n, r1: (i + 1) / n, w, lockAt, D, phi: -w * (lockAt + D / 2) };
  });
  run.total = spin + (n - 1) * gap + D + 3.5;
  run.angle = (q, t) => t < q.lockAt ? q.phi + q.w * t : t < q.lockAt + D ? q.phi + q.w * t - q.w * (t - q.lockAt) ** 2 / (2 * D) : q.phi + q.w * (q.lockAt + D / 2);
  for (const q of run.rings) {
    for (let s = 0.25; s < q.lockAt; s += 0.42) run.events.push({ t: s + (q.r0 * 0.21), f: 440, v: 0.35 });
    run.events.push({ t: q.lockAt + D, f: 440, v: 1, chord: true });
  }
  run.events.sort((a, b) => a.t - b.t);
  run.text = text;
}
function drawAnillos(ctx, run, t, view, o) {
  const { W, H, U } = view, cx = W / 2, cy = H * 0.45, R = Math.min(W * 0.44, H * 0.27), img = run.img;
  const k = Math.min(1.7 * R / img.width, 0.9 * R / img.height), w = img.width * k, h = img.height * k;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  for (const q of run.rings) {
    const a = run.angle(q, t), locked = t >= q.lockAt + q.D, flash = locked ? 1 - smooth(q.lockAt + q.D, q.lockAt + q.D + 0.5, t) : 0;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, q.r1 * R, 0, TAU); if (q.r0 > 0) ctx.arc(cx, cy, q.r0 * R, 0, TAU, true); ctx.clip('evenodd');
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${0.12 * flash})`; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R); }
    ctx.translate(cx, cy); ctx.rotate(a); ctx.globalAlpha = locked ? 1 : 0.6; ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    // Borde de cada anillo con una muesca, como un candado de combinación
    ctx.strokeStyle = locked ? o.accent : 'rgba(243, 238, 234, 0.45)'; ctx.lineWidth = (locked ? 2.6 : 1.6) * U;
    ctx.beginPath(); ctx.arc(cx, cy, q.r1 * R, 0, TAU); ctx.stroke();
    const mx = cx + Math.cos(a - Math.PI / 2) * q.r1 * R, my = cy + Math.sin(a - Math.PI / 2) * q.r1 * R;
    ctx.fillStyle = locked ? o.accent : FG; ctx.beginPath(); ctx.arc(mx, my, 4.5 * U, 0, TAU); ctx.fill();
  }
  // Marca fija arriba: ahí tienen que llegar las muescas
  ctx.fillStyle = o.accent; ctx.beginPath(); ctx.moveTo(cx, cy - R - 10 * U); ctx.lineTo(cx - 12 * U, cy - R - 30 * U); ctx.lineTo(cx + 12 * U, cy - R - 30 * U); ctx.closePath(); ctx.fill();
  return cy + R + 80 * U;
}

/* ---------------- Costura ---------------- */
// El nombre bordado a mano sobre tela, en un bastidor redondo: una aguja recorre el borde de cada letra
// puntada por puntada (pespunte), con el hilo saliendo del ojo de la aguja.
async function buildCostura(run, text, font) {
  const c = cropAlpha(await textCanvas(text, font, '#ffffff'));
  const k = Math.min(G * 0.78 / c.width, G * 0.5 / c.height), w = c.width * k, h = c.height * k;
  const g = newCanvas(G, G), gx = g.getContext('2d'); gx.drawImage(c, (G - w) / 2, (G - h) / 2, w, h);
  const { data } = gx.getImageData(0, 0, G, G), mask = new Uint8Array(G * G);
  for (let i = 0; i < G * G; i++) mask[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  // Contornos renglón por renglón y de izquierda a derecha (así se borda letra por letra), en puntadas de ~7 px
  const lines = text.split('\n').length, top = (G - h) / 2, row = (p) => { let y = 0; for (let i = 1; i < p.length; i += 2) y += p[i]; return Math.min(lines - 1, Math.max(0, Math.floor((y / (p.length / 2) - top) / (h / lines)))); };
  const loops = marching(mask, G, G).map((p) => orient(smoothLoop(p, 4))).filter((p) => p.length >= 40)
    .map((p) => {
      // Cada contorno empieza en su punto más a la izquierda
      let x = Infinity, k = 0; for (let i = 0; i < p.length; i += 2) if (p[i] < x) { x = p[i]; k = i; }
      return { p: Float64Array.from([...p.slice(k), ...p.slice(0, k)]), x, r: row(p) };
    })
    .sort((a, b) => a.r - b.r || a.x - b.x);
  const stitches = [], step = 7;
  for (const { p } of loops) {
    const n = p.length / 2; let acc = 0, sx = p[0], sy = p[1], first = true;
    for (let i = 1; i <= n; i++) {
      const j = (i % n) * 2, q = (i - 1) * 2, d = Math.hypot(p[j] - p[q], p[j + 1] - p[q + 1]);
      acc += d;
      if (acc >= step || i === n) { stitches.push([sx, sy, p[j], p[j + 1], first ? 1 : 0]); sx = p[j]; sy = p[j + 1]; acc = 0; first = false; }
    }
  }
  const Td = 24, n = stitches.length;
  run.stitches = stitches; run.drawT = Td; run.total = Td + 4;
  run.lineAt = (t) => n * Math.pow(clamp(t / Td), 1.8);
  for (let i = 1; i <= n; i++) run.events.push({ t: Td * Math.pow(i / n, 1 / 1.8), f: 440, v: 0.5 });
  run.text = text;
}
const WOOD = '#c8955a', WOOD_DARK = '#8a5f33', LINEN = '#efe6d6';
function drawCostura(ctx, run, t, view, o) {
  const { W, H, U } = view, cx = W / 2, cy = H * 0.45, R = Math.min(W * 0.44, H * 0.27), s = 2 * R * 0.94 / G, ox = cx - G * s / 2, oy = cy - G * s / 2;
  const X = (x) => ox + x * s, Y = (y) => oy + y * s, nl = run.lineAt(t), full = Math.min(run.stitches.length, Math.floor(nl));
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  // Tela con su trama, dentro del bastidor
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  ctx.fillStyle = LINEN; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.strokeStyle = 'rgba(120, 95, 60, 0.07)'; ctx.lineWidth = 1 * U; ctx.beginPath();
  for (let v = -R; v <= R; v += 5 * U) { ctx.moveTo(cx + v, cy - R); ctx.lineTo(cx + v, cy + R); ctx.moveTo(cx - R, cy + v); ctx.lineTo(cx + R, cy + v); }
  ctx.stroke();
  // Puntadas: sombra, hilo y un brillo; cada una un poco más corta que el tramo, como un pespunte de verdad
  const draw = (a, b, color, lw, dx = 0, dy = 0) => {
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = a; i < b; i++) { const [x0, y0, x1, y1] = run.stitches[i], mx = (x1 - x0) * 0.08, my = (y1 - y0) * 0.08; ctx.moveTo(X(x0 + mx) + dx, Y(y0 + my) + dy); ctx.lineTo(X(x1 - mx) + dx, Y(y1 - my) + dy); }
    ctx.stroke();
  };
  draw(0, full, 'rgba(60, 30, 20, 0.35)', 5 * U, 1.2 * U, 1.8 * U);
  draw(0, full, o.accent, 4.4 * U);
  draw(0, full, 'rgba(255, 255, 255, 0.28)', 1.3 * U, -0.7 * U, -0.7 * U);
  ctx.restore();
  // Bastidor de madera (dos aros y el tornillo arriba)
  ctx.lineWidth = 14 * U; ctx.strokeStyle = WOOD; ctx.beginPath(); ctx.arc(cx, cy, R + 7 * U, 0, TAU); ctx.stroke();
  ctx.lineWidth = 2 * U; ctx.strokeStyle = WOOD_DARK; ctx.beginPath(); ctx.arc(cx, cy, R + 14 * U, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.fillStyle = WOOD; ctx.fillRect(cx - 16 * U, cy - R - 44 * U, 32 * U, 30 * U); ctx.strokeRect(cx - 16 * U, cy - R - 44 * U, 32 * U, 30 * U);
  ctx.fillStyle = '#d9d9d9'; ctx.beginPath(); ctx.arc(cx, cy - R - 29 * U, 7 * U, 0, TAU); ctx.fill();
  // Aguja: sigue la puntada que se está haciendo; entra y sale de la tela (sube y baja un poco)
  if (full < run.stitches.length && t < run.drawT) {
    const [x0, y0, x1, y1] = run.stitches[full], u = nl - full, px = X(x0 + (x1 - x0) * u), py = Y(y0 + (y1 - y0) * u);
    const ang = Math.atan2(y1 - y0, x1 - x0) - 0.9, lift = Math.sin(u * Math.PI), len = 170 * U;
    const tipX = px, tipY = py - lift * 10 * U, eyeX = tipX - Math.cos(ang) * len, eyeY = tipY - Math.sin(ang) * len;
    // Hilo desde la última puntada hasta el ojo de la aguja
    const [lx, ly] = full > 0 ? [X(run.stitches[full - 1][2]), Y(run.stitches[full - 1][3])] : [px, py];
    ctx.strokeStyle = o.accent; ctx.lineWidth = 3.2 * U; ctx.beginPath(); ctx.moveTo(lx, ly);
    ctx.quadraticCurveTo((lx + eyeX) / 2 - 30 * U, (ly + eyeY) / 2 + 40 * U, eyeX, eyeY); ctx.stroke();
    const grad = ctx.createLinearGradient(eyeX, eyeY, tipX, tipY); grad.addColorStop(0, '#9aa0a6'); grad.addColorStop(0.5, '#f4f6f8'); grad.addColorStop(1, '#b7bcc2');
    ctx.strokeStyle = grad; ctx.lineWidth = 6 * U; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(eyeX, eyeY); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.strokeStyle = '#6b7075'; ctx.lineWidth = 1.2 * U; ctx.beginPath();
    ctx.ellipse(eyeX + Math.cos(ang) * 9 * U, eyeY + Math.sin(ang) * 9 * U, 5 * U, 1.6 * U, ang, 0, TAU); ctx.stroke();
  }
  return cy + R + 90 * U;
}

/* ---------------- Entrada común ---------------- */
// melody: id de MELODIAS o sin dar (la semilla elige una; estos videos siempre llevan melodía)
export async function buildArte({ mode, text, font = 'cursiva', seed = 1, accent = '#ff7a52', melody, pair = false }) {
  if (!ARTE_MODES.includes(mode)) throw new Error(`Estilo desconocido «${mode}». Usa ${ARTE_MODES.join(', ')}`);
  const rng = makeRng(seed), run = { mode, seed: seed >>> 0, accent, events: [], total: 0, pair };
  if (mode === 'hilos') await buildHilos(run, text, font, rng); else if (mode === 'costura') await buildCostura(run, text, font); else await buildAnillos(run, text, font, rng);
  return applyMelody(run, melody || MELODIA_IDS[(seed >>> 0) % MELODIA_IDS.length], mode === 'hilos' ? 0.16 : 0.12);
}
// opts: { caption, prompt, lang, accent, fallback, nameFamily }
export function drawArte(ctx, run, t, view, opts = {}) {
  const lang = opts.lang === 'en' ? 'en' : 'es', o = { accent: opts.accent || run.accent, nameFamily: opts.nameFamily || '"Pacifico", "Segoe Script", cursive' };
  const bottom = run.mode === 'hilos' ? drawHilos(ctx, run, t, view, o) : run.mode === 'costura' ? drawCostura(ctx, run, t, view, o) : drawAnillos(ctx, run, t, view, o);
  const { W, H, U } = view, fam = '"IBM Plex Sans", system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.globalAlpha = 1;
  const low = (opts.prompt ?? stylePrompt(lang, run.seed, run.pair)).trim();
  if (low) { ctx.fillStyle = FG; ctx.globalAlpha = 0.85; ctx.textBaseline = 'alphabetic'; fitText(ctx, low, W / 2, Math.min(bottom, H * 0.82), 28 * U, W * 0.9, fam, opts.fallback); ctx.globalAlpha = 1; }
  const cap = (opts.caption ?? styleHook(run.mode, lang, run.seed, run.pair)).trim();
  if (cap) { ctx.fillStyle = FG; ctx.textBaseline = 'middle'; fitText(ctx, cap, W / 2, H * 0.15, 34 * U, W * 0.9, fam, opts.fallback); }
}
