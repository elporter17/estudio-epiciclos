/* CirculArte · juegos de física «adictivos»: embudos, anillos que giran, plinko y carrera de colores.
   Compartido entre la web y Node, como src/bounce.js (y con sus mismas notas y síntesis de sonido).
   Cada simulación es determinista (semilla) y se calcula entera antes de dibujar: una foto por cuadro a 60 fps
   y la lista de notas. Coordenadas: x de -0,5 a 0,5 (ancho 1) e y hacia abajo; los anillos usan radio 1. */
import { makeRng } from './engine.js';
import { noteFreq } from './bounce.js';

const TAU = Math.PI * 2, FPS = 60, SUB = 8;
export const ARCADE_MODES = ['embudos', 'anillos', 'plinko', 'carrera'];
export const ARCADE_NAMES = {
  embudos: ['Embudos', 'Funnels'],
  anillos: ['Anillos que giran', 'Spinning rings'],
  plinko: ['Plinko', 'Plinko'],
  carrera: ['Carrera de colores', 'Color race']
};
const RACERS = [['Rojo', 'Red', 0], ['Azul', 'Blue', 215], ['Verde', 'Green', 130], ['Amarillo', 'Yellow', 50], ['Morado', 'Purple', 280], ['Naranja', 'Orange', 25]];

// Texto de arriba: preguntas y ganchos ({k}: pelotas que suelta cada escape en «embudos»)
export const ARCADE_HOOKS = {
  embudos: {
    es: ['+{k} pelotas cada vez que una escapa 🤯', '¿Cuántas logran bajar hasta la salida? 👀', 'Cada una que sale suelta {k} más… ¿hasta dónde?', '¿Encontrarán todos los huecos? 🤔', 'Esto se llena más rápido de lo que crees 😳', 'Sube el volumen y mira hasta el final 🔊'],
    en: ['+{k} balls every time one escapes 🤯', 'How many make it to the exit? 👀', 'Every ball that gets out drops {k} more… how far?', 'Will they find every gap? 🤔', 'This fills up faster than you think 😳', 'Turn the sound up and watch to the end 🔊']
  },
  anillos: {
    es: ['¿Logrará escapar de los {n} anillos? 👀', 'Cada anillo gira con un hueco… ¿lo logra?', '¿Cuántos anillos rompe antes del final? 🤔', 'No despegues los ojos del último anillo 😳', 'Apuesta: ¿sale o se queda atrapada? 🎯', 'Sube el volumen: cada rebote es una nota 🔊'],
    en: ['Will it escape all {n} rings? 👀', 'Every ring spins with a gap… can it make it?', 'How many rings does it break before the end? 🤔', 'Keep your eyes on the last ring 😳', 'Bet: does it escape or stay trapped? 🎯', 'Turn the sound up: every bounce is a note 🔊']
  },
  plinko: {
    es: ['¿En qué casilla caerán más? 👀', 'Elige una casilla antes de que empiece 🎯', '{n} pelotas, una sola forma… ¿cuál? 🤔', 'Mira la forma que aparece al final 😳', '¿Izquierda, centro o derecha? Elige ya 👇', 'Sube el volumen: cada choque es una nota 🔊'],
    en: ['Which slot gets the most balls? 👀', 'Pick a slot before it starts 🎯', '{n} balls, one single shape… which one? 🤔', 'Watch the shape that appears at the end 😳', 'Left, center or right? Pick now 👇', 'Turn the sound up: every hit is a note 🔊']
  },
  carrera: {
    es: ['¿Qué color gana? Elige uno antes de que empiece 👀', 'Carrera de {n} colores: ¿quién llega primero? 🏁', 'Elige tu color y no lo pierdas de vista 🎯', '¿Tu color gana o pierde? 🤔', 'La de último lugar te va a sorprender 😳', 'Sube el volumen y elige un color 🔊'],
    en: ['Which color wins? Pick one before it starts 👀', 'A {n}-color race: who gets there first? 🏁', 'Pick your color and keep your eyes on it 🎯', 'Does your color win or lose? 🤔', 'Last place is going to surprise you 😳', 'Turn the sound up and pick a color 🔊']
  }
};
// Frase de abajo: pide comentar o predecir
export const ARCADE_PROMPTS = {
  embudos: { es: ['Comenta cuántas crees que salen 👇', 'Escribe tu apuesta antes del final 👇', 'Etiqueta a alguien que necesite ver esto'], en: ['Comment how many you think get out 👇', 'Write your bet before the end 👇', 'Tag someone who needs to see this'] },
  anillos: { es: ['Comenta en qué anillo crees que se queda 👇', 'Escribe «sí» o «no» antes del final 👇', 'Etiqueta a alguien que no aguante el suspenso'], en: ['Comment which ring you think it gets stuck in 👇', 'Write «yes» or «no» before the end 👇', 'Tag someone who can\'t handle the suspense'] },
  plinko: { es: ['Comenta tu casilla 👇', 'Escribe tu número de casilla antes del final 👇', 'Etiqueta a alguien a quien le encante esto'], en: ['Comment your slot 👇', 'Write your slot number before the end 👇', 'Tag someone who would love this'] },
  carrera: { es: ['Comenta tu color antes del final 👇', '¿Qué color elegiste? Comenta 👇', 'Etiqueta a alguien y que elija un color'], en: ['Comment your color before the end 👇', 'Which color did you pick? Comment 👇', 'Tag someone and make them pick a color'] }
};

/* ---------------- Física ---------------- */
// Choque de una pelota con un segmento (con restitución e); devuelve la velocidad normal del golpe o 0
function hitSeg(b, s, e) {
  const dx = s[2] - s[0], dy = s[3] - s[1], L2 = dx * dx + dy * dy;
  const u = Math.max(0, Math.min(1, ((b.x - s[0]) * dx + (b.y - s[1]) * dy) / L2));
  const ex = b.x - (s[0] + u * dx), ey = b.y - (s[1] + u * dy), d2 = ex * ex + ey * ey;
  if (d2 >= b.r * b.r || d2 === 0) return 0;
  const d = Math.sqrt(d2), nx = ex / d, ny = ey / d;
  b.x += nx * (b.r - d); b.y += ny * (b.r - d);
  const vn = b.vx * nx + b.vy * ny; if (vn >= 0) return 0;
  b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
  return -vn;
}
// Choque con un clavo (círculo fijo de radio pr)
function hitPeg(b, px, py, pr, e) {
  const ex = b.x - px, ey = b.y - py, d2 = ex * ex + ey * ey, rr = b.r + pr;
  if (d2 >= rr * rr || d2 === 0) return 0;
  const d = Math.sqrt(d2), nx = ex / d, ny = ey / d;
  b.x = px + nx * rr; b.y = py + ny * rr;
  const vn = b.vx * nx + b.vy * ny; if (vn >= 0) return 0;
  b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
  return -vn;
}

function setup(mode, seed) {
  const rng = makeRng(seed), rnd = (a, b) => a + rng() * (b - a), rint = (a, b) => Math.floor(rnd(a, b + 1));
  const run = { mode, seed, fps: FPS, frames: [], events: [], segs: [], pegs: [], meta: {} };
  let lastNote = -1;
  const note = (t, i, chord = false, gap = 0.06) => {
    if (!chord && t - lastNote < gap) return;
    lastNote = t; run.events.push({ t, f: noteFreq(i), v: chord ? 1 : 0.8, chord });
  };
  return { run, rng, rnd, rint, note };
}

// Embudos: caja con niveles en V con hueco; cada pelota que sale por abajo suelta k más arriba
function simEmbudos(seed) {
  const { run, rnd, rint, note } = setup('embudos', seed);
  const Hh = 1.55, ex = 0.075, k = [2, 3, 5, 10][rint(0, 3)], cap = 260, r = 0.022, e = 0.55, g = 2.8;
  const segs = [[-0.5, 0, -0.5, Hh], [0.5, 0, 0.5, Hh], [-0.5, 0, 0.5, 0], [-0.5, Hh - 0.12, -ex, Hh], [0.5, Hh - 0.12, ex, Hh]];
  const levels = rint(3, 4);
  for (let l = 0; l < levels; l++) {
    const y = 0.2 + l * (Hh - 0.55) / levels, gx = rnd(-0.25, 0.25), gw = rnd(0.075, 0.1), drop = rnd(0.2, 0.28);
    segs.push([-0.5, y, gx - gw / 2, y + drop], [0.5, y, gx + gw / 2, y + drop]);
  }
  run.segs = segs; run.meta = { Hh, exit: [-ex, ex], k };
  const balls = []; let born = 0, escaped = 0, endAt = null;
  const hue0 = rint(0, 359);
  const spawn = () => balls.push({ x: rnd(-0.38, 0.38), y: rnd(0.04, 0.09), vx: rnd(-0.6, 0.6), vy: rnd(0, 0.4), r, h: (hue0 + born++ * 47) % 360, a: 0 });
  spawn();
  let t = 0;
  for (let f = 0; f < 36 * FPS; f++) {
    for (let s = 0; s < SUB; s++) {
      t += 1 / (FPS * SUB);
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i], dt = 1 / (FPS * SUB);
        b.vy += g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.vx * dt * 40;
        if (b.y > Hh + 0.05) {
          balls.splice(i, 1); escaped++; note(t, 10 + (escaped % 5), true);
          for (let n = 0; n < k && balls.length < cap; n++) spawn();
          continue;
        }
        for (const sg of segs) { const v = hitSeg(b, sg, e); if (v > 0.25) note(t, Math.floor((b.y / Hh) * 10)); }
      }
    }
    run.frames.push({ b: Float32Array.from(balls.flatMap((q) => [q.x, q.y, q.r, q.h, q.a])), escaped });
    if (endAt === null && balls.length >= cap) endAt = t + 4;
    if (endAt !== null && t >= endAt) break;
  }
  run.total = run.frames.length / FPS; run.hookVars = { k, n: escaped };
  return run;
}

// Anillos: varios círculos que giran, cada uno con un hueco; la pelota tiene que escapar de todos
function simAnillos(seed) {
  const { run, rnd, rint, note } = setup('anillos', seed);
  const n = rint(5, 9), rings = [];
  for (let i = 0; i < n; i++) {
    const R = 0.24 + 0.76 * i / (n - 1);
    rings.push({ R, gap: 0.95 - 0.35 * i / (n - 1), w: (i % 2 ? -1 : 1) * rnd(0.6, 1.3), a: rnd(0, TAU), h: (200 + i * 360 / n) % 360, broke: -1 });
  }
  run.meta = { rings: rings.map((q) => ({ R: q.R, gap: q.gap, h: q.h })) };
  const b = { x: 0, y: 0, vx: rnd(-1, 1), vy: rnd(-1.2, -0.6), r: 0.035, h: 50 };
  let cur = 0, t = 0, endAt = null; const g = 1.3;
  for (let f = 0; f < 45 * FPS; f++) {
    for (let s = 0; s < SUB; s++) {
      const dt = 1 / (FPS * SUB); t += dt;
      for (const q of rings) q.a = (q.a + q.w * dt) % TAU;
      b.vy += g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (cur >= n) continue;
      const q = rings[cur], d = Math.hypot(b.x, b.y);
      if (d + b.r <= q.R) continue;
      const nx = b.x / d, ny = b.y / d, rel = ((Math.atan2(ny, nx) - q.a) % TAU + TAU) % TAU;
      if (rel < q.gap && d - b.r < q.R) { if (d > q.R) { q.broke = t; cur++; note(t, cur * 2, true); } continue; }
      b.x = nx * (q.R - b.r); b.y = ny * (q.R - b.r);
      const vn = b.vx * nx + b.vy * ny;
      if (vn > 0) {
        b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny;
        // Un empujón mínimo mantiene la energía y evita rebotes periódicos
        const sp = Math.hypot(b.vx, b.vy), want = Math.max(sp, 1.3) / sp, a = rnd(-0.06, 0.06), c = Math.cos(a), sn = Math.sin(a);
        const vx = b.vx * want, vy = b.vy * want; b.vx = vx * c - vy * sn; b.vy = vx * sn + vy * c;
        if (vn > 0.2) note(t, cur * 2 + rint(0, 2));
      }
    }
    run.frames.push({ b: Float32Array.of(b.x, b.y, b.r, b.h, 0), rings: Float32Array.from(rings.flatMap((q) => [q.a, q.broke < 0 ? -1 : t - q.broke])), cur });
    if (endAt === null && cur >= n) endAt = t + 2.5;
    if (endAt !== null && t >= endAt) break;
  }
  run.total = run.frames.length / FPS; run.hookVars = { n, k: cur };
  return run;
}

// Plinko: pelotas que caen entre clavos y se apilan en casillas
function simPlinko(seed) {
  const { run, rnd, rint, note } = setup('plinko', seed);
  const rows = 12, sp = 0.078, top = 0.16, pr = 0.009, r = 0.0125, bins = 11, binTop = top + rows * sp * 0.9 + 0.06, Hh = binTop + 0.62, N = rint(170, 210);
  const pegs = [];
  for (let j = 0; j < rows; j++) for (let x = -0.5 + (j % 2 ? sp : sp / 2); x < 0.5 - sp * 0.3; x += sp) pegs.push([x, top + j * sp * 0.9, j]);
  const segs = [[-0.5, 0, -0.5, Hh], [0.5, 0, 0.5, Hh], [-0.5, Hh, 0.5, Hh]];
  for (let i = 1; i < bins; i++) segs.push([-0.5 + i / bins, binTop, -0.5 + i / bins, Hh]);
  run.segs = segs; run.pegs = pegs; run.meta = { Hh, bins, binTop, pr };
  const byRow = Array.from({ length: rows }, (_, j) => pegs.filter((p) => p[2] === j));
  const falling = [], settled = [], count = new Array(bins).fill(0); let dropped = 0, t = 0, endAt = null; const hue0 = rint(0, 359);
  for (let f = 0; f < 45 * FPS; f++) {
    if (dropped < N && f % 7 === 0) { falling.push({ x: rnd(-0.03, 0.03), y: 0.04, vx: rnd(-0.05, 0.05), vy: 0, r, h: (hue0 + dropped * 13) % 360, a: 0 }); dropped++; }
    for (let s = 0; s < SUB; s++) {
      const dt = 1 / (FPS * SUB); t += dt;
      for (let i = falling.length - 1; i >= 0; i--) {
        const b = falling[i];
        b.vy += 1.6 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        const j = Math.round((b.y - top) / (sp * 0.9));
        for (const jj of [j - 1, j, j + 1]) if (jj >= 0 && jj < rows) for (const p of byRow[jj]) { const v = hitPeg(b, p[0], p[1], pr, 0.45); if (v > 0.15) note(t, Math.floor((p[0] + 0.5) * 14.99), false, 0.05); }
        for (let k = 0; k < 2; k++) hitSeg(b, segs[k], 0.5);
        if (b.y > binTop) {
          // Al entrar a la casilla se apila: tres por fila, de abajo hacia arriba
          const bi = Math.max(0, Math.min(bins - 1, Math.floor((b.x + 0.5) * bins))), c = count[bi]++;
          const w = 1 / bins, col = c % 3, row = Math.floor(c / 3);
          settled.push({ x: -0.5 + (bi + 0.5) * w + (col - 1) * 2.05 * r, y: Hh - r - row * 2 * r * 0.95, r, h: b.h, a: 0 });
          falling.splice(i, 1);
        }
      }
    }
    run.frames.push({ b: Float32Array.from([...settled, ...falling].flatMap((q) => [q.x, q.y, q.r, q.h, q.a])) });
    if (endAt === null && dropped >= N && !falling.length) endAt = t + 3;
    if (endAt !== null && t >= endAt) break;
  }
  run.total = run.frames.length / FPS; run.hookVars = { n: N, k: count.indexOf(Math.max(...count)) + 1 };
  return run;
}

// Carrera: pelotas de colores bajan por plataformas en zigzag y clavos; gana la primera en llegar abajo
function simCarrera(seed) {
  const { run, rng, rnd, rint, note } = setup('carrera', seed);
  const Hh = 1.75, n = rint(4, 6), r = 0.03, e = 0.7, g = 1.4;
  const segs = [[-0.5, 0, -0.5, Hh], [0.5, 0, 0.5, Hh], [-0.5, 0, 0.5, 0]], pegs = [];
  const levels = 5;
  for (let l = 0; l < levels; l++) {
    const y = 0.2 + l * (Hh - 0.4) / levels, left = l % 2 === 0, len = rnd(0.68, 0.78), drop = rnd(0.06, 0.11);
    segs.push(left ? [-0.5, y, -0.5 + len, y + drop] : [0.5, y, 0.5 - len, y + drop]);
    // Clavos a media altura entre plataformas, para que ninguna pelota quede encajada entre clavo y rampa
    const px = rnd(-0.38, 0.05), py = y + drop + rnd(0.04, 0.06);
    pegs.push([px, py, 0], [px + rnd(0.18, 0.33), y + drop + rnd(0.04, 0.06), 0]);
  }
  run.segs = segs; run.pegs = pegs; run.meta = { Hh, pr: 0.014 };
  const order = RACERS.slice().sort(() => rng() - 0.5).slice(0, n);
  const balls = order.map(([es, en, h], i) => ({ x: -0.35 + i * 0.7 / Math.max(1, n - 1), y: 0.06, vx: rnd(-0.2, 0.2), vy: 0, r, h, a: 0, es, en, done: -1 }));
  const places = []; let t = 0, endAt = null;
  for (let f = 0; f < 45 * FPS; f++) {
    for (let s = 0; s < SUB; s++) {
      const dt = 1 / (FPS * SUB); t += dt;
      for (const b of balls) {
        b.vy += g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.vx * dt * 30;
        // Si queda casi quieta medio segundo (encajada en algún rincón), un empujón la saca
        b.still = Math.hypot(b.vx, b.vy) < 0.08 ? (b.still || 0) + dt : 0;
        if (b.still > 0.5 && b.done < 0) { b.vy = -0.9; b.vx = rnd(-0.7, 0.7); b.still = 0; }
        if (b.done < 0 && b.y > Hh - 0.02) { b.done = t; places.push(balls.indexOf(b)); note(t, 10 + places.length, true); }
        if (b.y > Hh + 0.2) { b.vx = 0; b.vy = 0; continue; }
        for (const sg of segs.slice(0, 3)) hitSeg(b, sg, e);
        for (const sg of segs.slice(3)) { const v = hitSeg(b, sg, e); if (v > 0.25) note(t, rint(0, 9)); }
        for (const p of pegs) { const v = hitPeg(b, p[0], p[1], 0.014, e); if (v > 0.25) note(t, rint(5, 14)); }
      }
      // Choques entre las pelotas (pocas: se resuelven todas contra todas)
      for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d === 0 || d >= a.r + b.r) continue;
        const nx = dx / d, ny = dy / d, o = (a.r + b.r - d) / 2;
        a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (vn < 0) { a.vx += vn * nx; a.vy += vn * ny; b.vx -= vn * nx; b.vy -= vn * ny; }
      }
    }
    run.frames.push({ b: Float32Array.from(balls.flatMap((q) => [q.x, q.y, q.r, q.h, q.a])), places: places.slice() });
    if (endAt === null && places.length === balls.length) endAt = t + 3;
    if (endAt !== null && t >= endAt) break;
  }
  run.racers = balls.map((q) => [q.es, q.en, q.h]);
  run.total = run.frames.length / FPS; run.hookVars = { n, k: places.length };
  return run;
}

export function simulateArcade({ mode, seed = 1 }) {
  const fn = { embudos: simEmbudos, anillos: simAnillos, plinko: simPlinko, carrera: simCarrera }[mode];
  if (!fn) throw new Error(`Juego desconocido «${mode}». Usa ${ARCADE_MODES.join(', ')}`);
  return fn(seed >>> 0);
}

/* ---------------- Dibujo ---------------- */
const BG = '#0d0b0c', FG = '#f3eeea';
const font = (w, size, opts) => `${w} ${size}px "IBM Plex Sans", system-ui, sans-serif${opts.fallback || ''}`;
function fitText(ctx, text, x, y, size, maxW, opts, weight = 600) {
  ctx.font = font(weight, size, opts); const w = ctx.measureText(text).width;
  if (w > maxW) ctx.font = font(weight, size * maxW / w, opts);
  ctx.fillText(text, x, y);
}
// Línea de neón: un trazo ancho y tenue debajo de uno fino y brillante
function neon(ctx, draw, color, U, width = 3) {
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  ctx.globalAlpha = 0.18; ctx.lineWidth = width * 3.2 * U; draw(); ctx.stroke();
  ctx.globalAlpha = 1; ctx.lineWidth = width * U; draw(); ctx.stroke();
}

export function drawArcade(ctx, run, t, view, opts = {}) {
  const { W, H, U } = view, lang = opts.lang === 'en' ? 'en' : 'es', L = lang === 'en' ? 1 : 0;
  const fi = Math.max(0, Math.min(run.frames.length - 1, Math.floor(t * run.fps))), fr = run.frames[fi];
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  let bottom;

  if (run.mode === 'anillos') {
    const cx = W / 2, cy = H * 0.47, R = Math.min(W * 0.42, H * 0.26);
    run.meta.rings.forEach((q, i) => {
      const a = fr.rings[i * 2], since = fr.rings[i * 2 + 1];
      if (since >= 0) {
        // Anillo roto: se agranda y se desvanece
        if (since > 0.7) return;
        ctx.globalAlpha = 1 - since / 0.7; ctx.strokeStyle = `hsl(${q.h}, 90%, 65%)`; ctx.lineWidth = 3 * U;
        ctx.beginPath(); ctx.arc(cx, cy, (q.R + since * 0.25) * R, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; return;
      }
      neon(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy, q.R * R, a + q.gap, a + TAU); }, `hsl(${q.h}, 90%, 65%)`, U, 3);
    });
    const b = fr.b; ctx.fillStyle = `hsl(${b[3]}, 95%, 62%)`; ctx.beginPath(); ctx.arc(cx + b[0] * R, cy + b[1] * R, b[2] * R, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * U; ctx.stroke();
    bottom = cy + R + 64 * U;
  } else {
    const Hh = run.meta.Hh, s = Math.min(W * 0.84, H * 0.52 / Hh), ox = W / 2, oy = H * 0.2;
    const X = (x) => ox + x * s, Y = (y) => oy + y * s;
    if (run.mode === 'embudos') { const [a, b] = run.meta.exit; ctx.fillStyle = 'rgba(46, 204, 113, .85)'; ctx.fillRect(X(a), Y(Hh) - 2 * U, X(b) - X(a), 40 * U); }
    if (run.mode === 'carrera') { ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 12; i++) if (i % 2 === 0) ctx.fillRect(X(-0.5 + i / 12), Y(Hh) - 4 * U, s / 12, 8 * U); }
    neon(ctx, () => { ctx.beginPath(); for (const g of run.segs) { ctx.moveTo(X(g[0]), Y(g[1])); ctx.lineTo(X(g[2]), Y(g[3])); } }, FG, U, run.mode === 'plinko' ? 2 : 3);
    if (run.pegs.length) { ctx.fillStyle = FG; const pr = (run.meta.pr || 0.012) * s; ctx.beginPath(); for (const p of run.pegs) { ctx.moveTo(X(p[0]) + pr, Y(p[1])); ctx.arc(X(p[0]), Y(p[1]), pr, 0, TAU); } ctx.fill(); }
    const b = fr.b;
    for (let i = 0; i < b.length; i += 5) {
      const x = X(b[i]), y = Y(b[i + 1]), r = b[i + 2] * s;
      // Las que ya salieron por abajo (o cruzaron la meta) no se dibujan
      if (b[i + 1] > Hh + 0.06) continue;
      ctx.fillStyle = `hsl(${b[i + 3]}, 90%, 60%)`;
      if (run.mode === 'embudos' && opts.squares !== false && run.seed % 2) {
        // La mitad de las corridas usa cuadros que giran, como los videos virales
        ctx.save(); ctx.translate(x, y); ctx.rotate(b[i + 4]); ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.restore();
      } else { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    }
    bottom = Y(Hh) + 64 * U;
  }

  ctx.fillStyle = FG; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  // Carrera: al llegar la primera se anuncia la ganadora (el resto del video sigue)
  let low = (opts.prompt ?? arcadePrompt(run.mode, lang, run.seed)).trim();
  if (run.mode === 'carrera' && fr.places.length) { const w = run.racers[fr.places[0]]; low = lang === 'en' ? `🏆 ${w[1]} wins!` : `🏆 ¡Ganó el ${w[0]}!`; ctx.fillStyle = `hsl(${w[2]}, 90%, 65%)`; }
  if (low) { ctx.globalAlpha = 0.9; fitText(ctx, low, W / 2, Math.min(bottom, H * 0.8), 28 * U, W * 0.9, opts); ctx.globalAlpha = 1; }
  const cap = (opts.caption ?? arcadeHook(run, lang)).trim();
  if (cap) { ctx.fillStyle = FG; ctx.textBaseline = 'middle'; fitText(ctx, cap, W / 2, H * 0.15, 34 * U, W * 0.9, opts); }
}

// Texto superior y frase de abajo estables para una corrida
export function arcadeHook(run, lang) {
  const list = ARCADE_HOOKS[run.mode][lang === 'en' ? 'en' : 'es'];
  const v = run.hookVars || {};
  return list[(run.seed >>> 0) % list.length].replace('{k}', v.k ?? '').replace('{n}', v.n ?? '');
}
export function arcadePrompt(mode, lang, seed) {
  const list = ARCADE_PROMPTS[mode][lang === 'en' ? 'en' : 'es'];
  return list[Math.floor((seed >>> 0) / 7) % list.length];
}
