/* CirculArte · pelotas que rebotan dentro de un círculo (videos «satisfying»), con una nota en cada rebote.
   Compartido entre la web (pestaña Pelotas) y Node (scripts/bounce.mjs, la publicación automática).
   La simulación es determinista (misma semilla, mismo video) y se calcula entera antes de dibujar: una foto por
   cuadro a 60 fps y la lista de rebotes con su nota. El sonido se sintetiza aquí mismo, sin música con derechos.
   Coordenadas: el círculo tiene centro (0, 0) y radio 1; y crece hacia abajo, como en el lienzo. */
import { makeRng } from './engine.js';

const TAU = Math.PI * 2;
export const BOUNCE_FPS = 60;
export const BOUNCE_MODES = ['crece', 'multiplica', 'escape', 'lineas'];
export const BOUNCE_NAMES = {
  crece: ['Crece con cada rebote', 'Grows with every bounce'],
  multiplica: ['Se multiplica', 'Multiplies'],
  escape: ['Escapar por el hueco', 'Escape through the gap'],
  lineas: ['Líneas en cada rebote', 'Lines on every bounce']
};
// Texto de arriba del video: preguntas y ganchos (sin cifras, para que se vea hasta el final)
export const BOUNCE_HOOKS = {
  crece: {
    es: ['¿Llenará el círculo? 👀', '¿Cuántos rebotes crees que aguanta? 🤔', 'Espera el último rebote 😳', '¿Llega a llenarlo antes de 30 segundos?', 'Cada rebote la hace más grande… ¿hasta dónde?', 'No despegues los ojos del final 👀', '¿Apuestas a que lo llena? 🎯', 'Sube el volumen y mira hasta el final 🔊'],
    en: ['Will it fill the circle? 👀', 'How many bounces do you think it lasts? 🤔', 'Wait for the last bounce 😳', 'Will it fill it before 30 seconds?', 'Every bounce makes it bigger… how far?', 'Keep your eyes on the ending 👀', 'Bet it fills it? 🎯', 'Turn the sound up and watch to the end 🔊']
  },
  multiplica: {
    es: ['¿Cuántas pelotas caben en un círculo? 🤯', 'Cada rebote suelta otra… ¿hasta cuándo?', 'Esto se sale de control 😳', '¿En qué segundo ya no cabe ninguna más?', 'Elige un color y síguelo 👀', '¿Cuál es tu pelota favorita? 🎨', 'Sube el volumen: cada rebote es una nota 🔊', 'Mira cómo empieza… y cómo termina 🤯'],
    en: ['How many balls fit in a circle? 🤯', 'Every bounce drops another… until when?', 'This gets out of hand 😳', 'At what second does nothing else fit?', 'Pick a color and follow it 👀', 'Which ball is your favorite? 🎨', 'Turn the sound up: every bounce is a note 🔊', 'Watch how it starts… and how it ends 🤯']
  },
  escape: {
    es: ['¿Cuántas logran escapar? 🔴', 'Cada pelota que sale suelta dos más 🤯', '¿Encontrarán el hueco? 👀', 'Elige una pelota: ¿escapa o no?', '¿Cuántas escapan antes del final? 🤔', 'El hueco gira… ¿quién sale primero?', 'Esto se descontrola rapidísimo 😳', 'Sube el volumen y mira hasta el final 🔊'],
    en: ['How many escape? 🔴', 'Every ball that gets out releases two more 🤯', 'Will they find the gap? 👀', 'Pick a ball: does it escape or not?', 'How many escape before the end? 🤔', 'The gap spins… who gets out first?', 'This gets out of hand fast 😳', 'Turn the sound up and watch to the end 🔊']
  },
  lineas: {
    es: ['Cada rebote dibuja una línea… mira la figura final ✨', '¿Qué figura se forma al final? 👀', 'Arte con una sola pelota 🎨', 'Cada rebote va más rápido… ¿hasta dónde? 😳', 'Mira cómo una pelota dibuja esto 🤯', 'Sube el volumen: cada rebote es una nota 🔊'],
    en: ['Every bounce draws a line… watch the final shape ✨', 'What shape forms at the end? 👀', 'Art with a single ball 🎨', 'Every bounce gets faster… how far? 😳', 'Watch one ball draw this 🤯', 'Turn the sound up: every bounce is a note 🔊']
  }
};
// Frase de abajo (en lugar de un contador): pide comentar o predecir
export const BOUNCE_PROMPTS = {
  crece: { es: ['Comenta cuántos rebotes crees que da 👇', 'Escribe tu apuesta antes del final 👇', '¿Lo llena o no? Dímelo en los comentarios', 'Etiqueta a alguien que no aguante el suspenso'], en: ['Comment how many bounces you think it takes 👇', 'Write your bet before the end 👇', 'Does it fill it or not? Tell me in the comments', 'Tag someone who can\'t handle the suspense'] },
  multiplica: { es: ['Comenta en qué segundo se llena 👇', 'Escribe tu color favorito 👇', '¿Cuántas crees que caben? Comenta 👇', 'Etiqueta a alguien a quien le encante esto'], en: ['Comment at what second it fills up 👇', 'Write your favorite color 👇', 'How many do you think fit? Comment 👇', 'Tag someone who would love this'] },
  escape: { es: ['Comenta cuántas crees que escapan 👇', 'Escribe tu apuesta antes del final 👇', 'Elige un color y dime si escapó 👇', 'Etiqueta a alguien que necesite ver esto'], en: ['Comment how many you think escape 👇', 'Write your bet before the end 👇', 'Pick a color and tell me if it escaped 👇', 'Tag someone who needs to see this'] },
  lineas: { es: ['Comenta qué figura ves 👇', 'Escribe a qué se parece al final 👇', 'Etiqueta a alguien a quien le encante esto'], en: ['Comment what shape you see 👇', 'Write what it looks like at the end 👇', 'Tag someone who would love this'] }
};

const CFG = {
  crece: { g: 1.5, r0: 0.05, grow: 0.018, rMax: 0.965, hold: 2, gapNote: 0.045, maxT: 50 },
  multiplica: { g: 1.25, r: 0.034, cap: 150, spawnEvery: 0.16, hold: 4, gapNote: 0.07, maxT: 40 },
  escape: { g: 1.6, r: 0.04, gap: 0.95, spin: 1.15, speed: [1.2, 1.8], cap: 220, hold: 4, gapNote: 0.07, maxT: 35 },
  // Cada rebote sube la velocidad un poco (hasta vmax): las líneas se van cerrando en una figura
  lineas: { g: 0.7, r: 0.03, speed: [1.6, 2.1], speedUp: 1.035, vmax: 8, hold: 0, gapNote: 0.05, maxT: 32 }
};
// Pentatónica mayor en tres octavas desde Do4: suena bien en cualquier orden
const PENTA = [0, 2, 4, 7, 9];
export const noteFreq = (i) => 261.63 * 2 ** ((12 * (Math.floor(i / 5) % 3) + PENTA[((i % 5) + 5) % 5]) / 12);

// opts: { mode, seed, maxT }; devuelve { mode, seed, frames, events, total, fps }
export function simulate({ mode = 'crece', seed = 1, maxT } = {}) {
  if (!CFG[mode]) throw new Error(`Modo de pelotas desconocido «${mode}». Usa ${BOUNCE_MODES.join(', ')}`);
  const c = CFG[mode], rng = makeRng(seed), rnd = (a, b) => a + rng() * (b - a);
  maxT ??= c.maxT;
  const SUB = 8, dt = 1 / (BOUNCE_FPS * SUB), hue0 = Math.floor(rnd(0, 360));
  const balls = [], frames = [], events = [], points = [];
  let t = 0, ring = rnd(0, TAU), bounces = 0, escaped = 0, born = 0, endAt = null, lastNote = -1, lastSpawn = -1, melody = 0;
  const spawn = (r, x = rnd(-0.15, 0.15), y = rnd(-0.35, -0.1)) => {
    const a = rnd(0, TAU), s = rnd(...(c.speed || [0.7, 1.15]));
    balls.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r, h: (hue0 + born++ * 47) % 360, out: false });
  };
  const note = (kind) => {
    if (t - lastNote < c.gapNote) return;
    lastNote = t;
    const i = mode === 'crece' ? melody++ : Math.floor(rnd(0, 15));
    events.push({ t, f: noteFreq(i), v: kind === 'escape' ? 1 : 0.8, chord: kind === 'escape' });
  };
  spawn(mode === 'crece' ? c.r0 : c.r);

  for (let f = 0; f < maxT * BOUNCE_FPS; f++) {
    for (let s = 0; s < SUB; s++) {
      t += dt; if (mode === 'escape') ring = (ring + c.spin * dt) % TAU;
      for (let k = balls.length - 1; k >= 0; k--) {
        const b = balls[k];
        b.vy += c.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.out) { if (b.x * b.x + b.y * b.y > 16) balls.splice(k, 1); continue; }
        const d = Math.hypot(b.x, b.y);
        if (d + b.r <= 1) continue;
        const nx = b.x / d, ny = b.y / d;
        if (mode === 'escape') {
          const rel = ((Math.atan2(ny, nx) - ring) % TAU + TAU) % TAU;
          if (rel < c.gap) {
            b.out = true; escaped++; note('escape');
            const alive = balls.filter((q) => !q.out).length;
            for (let n = 0; n < 2 && alive + n < c.cap; n++) spawn(c.r);
            continue;
          }
        }
        const vn = b.vx * nx + b.vy * ny;
        b.x = nx * (1 - b.r); b.y = ny * (1 - b.r);
        // Solo es rebote si iba hacia la pared; si ya se aleja, basta con dejarla dentro
        if (vn <= 0) continue;
        b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny;
        // Un giro mínimo al azar evita que caiga en un rebote periódico
        const a = rnd(-0.04, 0.04), cs = Math.cos(a), sn = Math.sin(a), vx = b.vx;
        b.vx = vx * cs - b.vy * sn; b.vy = vx * sn + b.vy * cs;
        // Un roce (la pelota rodando pegada a la pared) no cuenta como rebote: ni suena ni la hace crecer
        if (vn < 0.15) continue;
        bounces++; note('bounce');
        if (mode === 'lineas') {
          points.push([t, nx, ny]);
          const sp = Math.hypot(b.vx, b.vy), k = Math.min(c.vmax, sp * c.speedUp) / sp; b.vx *= k; b.vy *= k;
        }
        if (mode === 'crece') b.r = Math.min(c.rMax, b.r + c.grow);
        if (mode === 'multiplica' && balls.length < c.cap && t - lastSpawn >= c.spawnEvery) { lastSpawn = t; spawn(c.r); }
      }
    }
    const snap = new Float32Array(balls.length * 5);
    balls.forEach((b, i) => { snap.set([b.x, b.y, b.r, b.h, b.out ? 1 : 0], i * 5); });
    frames.push({ b: snap, ring, bounces, alive: balls.filter((q) => !q.out).length, escaped });
    if (endAt === null) {
      if (mode === 'crece' && balls[0].r >= c.rMax) endAt = t + c.hold;
      if (mode === 'multiplica' && balls.length >= c.cap) endAt = t + c.hold;
    }
    if (endAt !== null && t >= endAt) break;
  }
  return { mode, seed, frames, events, points, total: frames.length / BOUNCE_FPS, fps: BOUNCE_FPS, gap: mode === 'escape' ? c.gap : 0 };
}

/* ---------------- Sonido ---------------- */
// Una cuerda pulsada corta por rebote (y una quinta encima cuando una pelota escapa), mezcladas y suavizadas
export function synthAudio(run, sr = 44100) {
  const n = Math.ceil((run.total + 0.8) * sr), out = new Float32Array(n), len = Math.floor(0.6 * sr);
  for (const e of run.events) {
    const i0 = Math.floor(e.t * sr), fs = e.chord ? [e.f, e.f * 1.5] : [e.f];
    for (const f of fs) {
      const w = TAU * f / sr, amp = 0.32 * e.v / fs.length;
      for (let j = 0; j < len && i0 + j < n; j++) {
        const tt = j / sr, env = Math.exp(-tt / 0.18) * (1 - Math.exp(-tt / 0.004));
        out[i0 + j] += amp * env * (Math.sin(w * j) + 0.35 * Math.exp(-tt / 0.08) * Math.sin(2 * w * j) + 0.15 * Math.exp(-tt / 0.05) * Math.sin(3 * w * j));
      }
    }
  }
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * 1.4) / 1.4;
  return out;
}

/* ---------------- Dibujo ---------------- */
const BG = '#141112', FG = '#f3eeea';
// view: { W, H, U }; opts: { caption, lang, fonts } (fonts: respaldo de familias, por ejemplo el emoji en Node)
export function drawBounce(ctx, run, t, view, opts = {}) {
  const { W, H, U } = view, lang = opts.lang === 'en' ? 'en' : 'es';
  const fi = Math.max(0, Math.min(run.frames.length - 1, Math.floor(t * run.fps))), fr = run.frames[fi];
  const cx = W / 2, cy = H * 0.47, R = Math.min(W * 0.42, H * 0.26);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);

  // Estela de la pelota que crece: sus contornos anteriores, cada vez más tenues
  if (run.mode === 'crece') {
    ctx.lineWidth = 1.6 * U;
    for (let k = Math.max(0, fi - 90); k < fi; k += 3) {
      const p = run.frames[k].b; ctx.globalAlpha = 0.08 + 0.5 * (k - fi + 90) / 90;
      ctx.strokeStyle = `hsl(${(p[3] + k * 1.2) % 360}, 90%, 60%)`;
      ctx.beginPath(); ctx.arc(cx + p[0] * R, cy + p[1] * R, p[2] * R, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Líneas: cada rebote une su punto de la pared con el anterior; la última sigue a la pelota
  if (run.mode === 'lineas') {
    const pts = run.points, n = pts.findIndex((p) => p[0] > t), upto = n < 0 ? pts.length : n, hue0 = (run.seed >>> 0) % 360;
    const P = (p) => [cx + p[1] * R, cy + p[2] * R];
    ctx.lineWidth = 1.8 * U; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
    for (let i = 1; i < upto; i++) {
      const [x0, y0] = P(pts[i - 1]), [x1, y1] = P(pts[i]);
      ctx.strokeStyle = `hsl(${(hue0 + i * 9) % 360}, 90%, 62%)`; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    if (upto > 0 && fr.b.length) {
      const [x0, y0] = P(pts[upto - 1]);
      ctx.strokeStyle = `hsl(${(hue0 + upto * 9) % 360}, 90%, 62%)`; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(cx + fr.b[0] * R, cy + fr.b[1] * R); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Anillo (con hueco en «escape»)
  ctx.strokeStyle = FG; ctx.lineWidth = 5 * U; ctx.lineCap = 'round'; ctx.beginPath();
  if (run.mode === 'escape') ctx.arc(cx, cy, R + 2.5 * U, fr.ring + run.gap, fr.ring + TAU); else ctx.arc(cx, cy, R + 2.5 * U, 0, TAU);
  ctx.stroke();

  const b = fr.b;
  for (let i = 0; i < b.length; i += 5) {
    const x = cx + b[i] * R, y = cy + b[i + 1] * R, r = b[i + 2] * R;
    if (x < -r || x > W + r || y < -r || y > H + r) continue;
    // En «crece» la pelota cambia de tono con cada rebote
    const hue = run.mode === 'crece' ? (b[i + 3] + fr.bounces * 9) % 360 : b[i + 3];
    ctx.fillStyle = `hsl(${hue}, 90%, 60%)`; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.5 * U; ctx.stroke();
  }

  // Frase de enganche debajo del círculo (sin contador: que el final se vea hasta el último segundo)
  const prompt = (opts.prompt ?? bouncePrompt(run.mode, lang, run.seed)).trim();
  ctx.fillStyle = FG; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  if (prompt) {
    let size = 28 * U; ctx.font = `600 ${size}px "IBM Plex Sans", system-ui, sans-serif${opts.fallback || ''}`;
    const w = ctx.measureText(prompt).width; if (w > W * 0.9) { size *= W * 0.9 / w; ctx.font = `600 ${size}px "IBM Plex Sans", system-ui, sans-serif${opts.fallback || ''}`; }
    ctx.globalAlpha = 0.85; ctx.fillText(prompt, cx, cy + R + 64 * U); ctx.globalAlpha = 1;
  }

  // Texto superior al 15 % (más arriba lo tapan los botones de TikTok)
  const cap = (opts.caption || '').trim();
  if (cap) {
    let size = 34 * U; ctx.font = `600 ${size}px "IBM Plex Sans", system-ui, sans-serif${opts.fallback || ''}`;
    const w = ctx.measureText(cap).width; if (w > W * 0.9) { size *= W * 0.9 / w; ctx.font = `600 ${size}px "IBM Plex Sans", system-ui, sans-serif${opts.fallback || ''}`; }
    ctx.textBaseline = 'middle'; ctx.fillText(cap, W / 2, H * 0.15);
  }
}

// Texto superior y frase de abajo estables para una corrida (la misma semilla da los mismos textos)
export function bounceHook(mode, lang, seed) {
  const list = BOUNCE_HOOKS[mode][lang === 'en' ? 'en' : 'es'];
  return list[(Number(seed) >>> 0) % list.length];
}
export function bouncePrompt(mode, lang, seed) {
  const list = BOUNCE_PROMPTS[mode][lang === 'en' ? 'en' : 'es'];
  return list[Math.floor((Number(seed) >>> 0) / 7) % list.length];
}
