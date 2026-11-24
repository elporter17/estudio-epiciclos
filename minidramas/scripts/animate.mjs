#!/usr/bin/env node
// Montaje ANIMADO (personajes recortados, no fotos fijas): lo que hace falta de cada escena sale de out/<slug>/anim/
// (scripts/animate-assets.mjs): fondos sin gente, personajes con fondo transparente y objetos. Todo se mueve: cámara con
// cortes y empujones, personajes que entran con rebote, respiran y mueven la boca con la voz, objetos que cruzan,
// confeti, fuegos artificiales, sellos y texto que «pega» un golpe. Los subtítulos, el gancho y la zona segura son los de
// assemble.mjs. Hoy solo existe el guion de «papi-a-la-orden» (ESCENAS más abajo).
//   node --env-file=.env scripts/animate.mjs --series papi-a-la-orden --ep 1 [--still 20.5] [--crf 20]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { parseCli } from './lib/cli.mjs';
import { log } from './lib/env.mjs';
import { loadSeries, episode, timelineFile, imageDir, readJson, OUT_DIR } from './lib/series.mjs';
import { W, H, FPS, SAFE, LOOK, CX, setupFonts, layoutWords, boxOf, drawRows, ease, buildCaptions } from './assemble.mjs';
import { aplicarPOV } from './lib/pov.mjs';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const outBack = (k) => { k = clamp(k); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const outBounce = (k) => { k = clamp(k); const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375; return n * (k -= 2.625 / d) * k + 0.984375; };
const azar = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const PI2 = Math.PI * 2;

/* ---------- efectos ---------- */
function rayos(ctx, cx, cy, t, a, b, n = 22) {
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * PI2 + t * 0.35, a1 = a0 + PI2 / n * 0.5;
    ctx.fillStyle = k % 2 ? a : b; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * 3000, cy + Math.sin(a0) * 3000); ctx.lineTo(cx + Math.cos(a1) * 3000, cy + Math.sin(a1) * 3000); ctx.closePath(); ctx.fill();
  }
}
function estrella(ctx, x, y, r, rot, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.28 : r, a = (i / 8) * PI2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function chispas(ctx, ts, { seed = 5, n = 14, color = '#FFE14D', y0 = 0.1, y1 = 0.6, vida = 1.2 } = {}) {
  const r = azar(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = (y0 + r() * (y1 - y0)) * H, t0 = r() * vida * 3, k = ((ts - t0) % (vida * 2.2)) / vida;
    if (ts < t0 || k < 0 || k > 1) continue;
    ctx.globalAlpha = Math.sin(k * Math.PI); estrella(ctx, x, y, 18 + r() * 30, k * 2 + i, color); ctx.globalAlpha = 1;
  }
}
const COLORES = ['#FFE14D', '#FF4D6D', '#4DD2FF', '#7CFF6B', '#FFFFFF', '#FF9F1C'];
function confeti(ctx, ts, n = 90, seed = 9) {
  const r = azar(seed);
  for (let i = 0; i < n; i++) {
    const x0 = r() * W, v = 260 + r() * 360, ph = r() * H, rot = r() * 6, c = COLORES[i % COLORES.length], w = 14 + r() * 14;
    const y = (ts * v + ph) % (H + 80) - 40, x = x0 + Math.sin(ts * 3 + i) * 40;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot + ts * (2 + (i % 5))); ctx.fillStyle = c; ctx.fillRect(-w / 2, -w / 4, w, w / 2); ctx.restore();
  }
}
function fuego(ctx, age, cx, cy, color, seed = 1, n = 28) {
  if (age < 0 || age > 1.6) return;
  const r = azar(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * PI2, v = 260 + r() * 420, x = cx + Math.cos(a) * v * age, y = cy + Math.sin(a) * v * age + 380 * age * age;
    ctx.globalAlpha = clamp(1 - age / 1.6); ctx.fillStyle = i % 3 ? color : '#FFFFFF'; ctx.beginPath(); ctx.arc(x, y, 9 * (1 - age / 2.2), 0, PI2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function velocidad(ctx, ts, color = 'rgba(255,255,255,0.55)') {
  const r = azar(77);
  ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const y = r() * H * 0.85 + 60, len = 160 + r() * 260, v = 2200 + r() * 1500, x = W - ((ts * v + r() * 2000) % (W + len * 2)) + len;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
  }
}
// Texto grande que «pega un golpe» al aparecer
function texto(ctx, s, x, y, ts, t0, { size = 110, color = '#FFE14D', rot = -4, dur = 99, fondo = null } = {}) {
  const age = ts - t0; if (age < 0 || age > dur) return;
  const k = outBack(age / 0.28), out = dur < 90 ? clamp((dur - age) / 0.2) : 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180); ctx.scale(Math.max(0.01, k), Math.max(0.01, k)); ctx.globalAlpha = out;
  ctx.font = `900 ${size}px Montserrat`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (fondo) { const w = ctx.measureText(s).width + size * 0.8; ctx.fillStyle = fondo; ctx.beginPath(); ctx.roundRect(-w / 2, -size * 0.75, w, size * 1.5, size * 0.3); ctx.fill(); }
  ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.2; ctx.strokeStyle = '#111'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16; ctx.strokeText(s, 0, 0);
  ctx.shadowColor = 'transparent'; ctx.fillStyle = color; ctx.fillText(s, 0, 0); ctx.restore();
}
// Sello cuadrado con borde (como un sello de goma)
function sello(ctx, s, x, y, ts, t0, color = '#22C55E', size = 84, rot = -6) {
  const age = ts - t0; if (age < 0) return;
  const k = outBack(age / 0.25);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180); ctx.scale(Math.max(0.01, k), Math.max(0.01, k));
  ctx.font = `900 ${size}px Montserrat`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(s).width + size * 0.9, h = size * 1.55;
  ctx.fillStyle = 'rgba(255,255,255,0.93)'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 22); ctx.fill();
  ctx.lineWidth = 10; ctx.strokeStyle = color; ctx.stroke(); ctx.fillStyle = color; ctx.fillText(s, 0, 4); ctx.restore();
}

/* ---------- carga de recursos ---------- */
async function cargar(dir) {
  const A = {};
  for (const sub of ['sprites', 'props', 'bg']) {
    const d = path.join(dir, sub);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.png'))) A[f.replace(/\.png$/, '')] = await loadImage(fs.readFileSync(path.join(d, f)));
  }
  return A;
}

// Dónde está la boca de cada personaje (fracción del ancho y del alto de su imagen)
const BOCA = {
  papi_fist: [0.51, 0.228], papi_run: [0.5, 0.272], papi_flag: [0.47, 0.357], papi_shrug: [0.52, 0.226],
  chepe_shock: [0.46, 0.349], chepe_cheer: [0.51, 0.297], chepe_proud: [0.485, 0.292], chepe_bed: [0.487, 0.405], amigo_arms: [0.49, 0.268],
  banquero_llaves: [0.51, 0.295], conductor_feliz: [0.48, 0.215], cajera_vuelto: [0.48, 0.265], guardia_cruzado: [0.5, 0.28],
  chepe_presenta: [0.5, 0.375], curul_nervioso: [0.5, 0.25], curul_encoge: [0.5, 0.25],
  presidente_mazo: [0.48, 0.228], presidente_senala: [0.455, 0.25], presidente_celebra: [0.5, 0.228]
};

/* ---------- el guion animado ---------- */
// Cada escena: cam = [[segundo, zoom, fx, fy], …] (cortes rápidos; fx, fy = punto de la pantalla que queda al centro)
// y mundo(c) que dibuja con c.ctx / c.ts (segundos desde el inicio de la escena) / c.A (recursos) / c.voz(hablante).
const PIE = 0.93, ALTO = 1150;
function sprite(c, id, o) {
  const { ctx, ts, A } = c, img = A[id], age = ts - (o.t0 || 0);
  if (!img || age < 0) return;
  const k = clamp(age / 0.4), enter = o.enter || 'pop';
  let s = 1, dx = 0, dy = 0;
  if (enter === 'pop') s = Math.max(0.02, outBack(k));
  else if (enter === 'left') dx = -(1 - ease(k)) * W * 0.95;
  else if (enter === 'right') dx = (1 - ease(k)) * W * 0.95;
  else if (enter === 'rise') dy = (1 - ease(k)) * (o.h || ALTO) * 0.8;
  else if (enter === 'drop') dy = -(1 - outBounce(k)) * H * 0.7;
  const v = o.hablante ? c.voz(o.hablante) : 0, h = o.h || ALTO, w = (img.width / img.height) * h;
  const bob = Math.sin(age * (o.bobV || 5.2)) * (o.bob ?? 9) + (o.salto ? -Math.abs(Math.sin(age * o.salto)) * 70 : 0);
  const sy = 1 + 0.03 * v + 0.012 * Math.sin(age * 5.1), sx = 1 - 0.02 * v + 0.01 * Math.sin(age * 5.1 + 1);
  const x = (typeof o.x === 'function' ? o.x(age) : o.x) * W + dx, foot = (o.foot ?? PIE) * H + dy + bob;
  ctx.save(); ctx.translate(x, foot); ctx.rotate(((o.tilt || 0) + (o.sway ? Math.sin(age * 3.3) * o.sway : 0) + Math.sin(age * 2.7) * 0.9) * Math.PI / 180);
  ctx.scale((o.flip ? -1 : 1) * s * sx * (o.escala || 1), s * sy * (o.escala || 1));
  ctx.drawImage(img, -w / 2, -h, w, h);
  const bc = BOCA[id];
  if (bc && v > 0.07) {
    const mx = -w / 2 + bc[0] * w, my = -h + bc[1] * h, rw = h * 0.02 * (0.75 + 0.5 * v), rh = h * (0.004 + 0.016 * v);
    ctx.fillStyle = '#3a0c0c'; ctx.beginPath(); ctx.ellipse(mx, my, rw, rh, 0, 0, PI2); ctx.fill();
    ctx.fillStyle = '#e8665f'; ctx.beginPath(); ctx.ellipse(mx, my + rh * 0.45, rw * 0.62, rh * 0.5, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = Math.max(2, h * 0.003); ctx.beginPath(); ctx.ellipse(mx, my, rw, rh, 0, 0, PI2); ctx.stroke();
  }
  ctx.restore();
}
function fondo(c, id, { deriva = 0.05, dir = 1, base = 1.12, dx = 0 } = {}) {
  const img = c.A[id]; if (!img) return;
  const k = Math.max(W / img.width, H / img.height) * (base + deriva * Math.min(c.dur, c.ts) / 10), w = img.width * k, h = img.height * k;
  c.ctx.drawImage(img, (W - w) / 2 + Math.sin(c.ts * 0.5) * 10 * dir + dx, (H - h) / 2, w, h);
}
function objeto(c, id, x, y, h, { rot = 0, flip = false, alpha = 1 } = {}) {
  const img = c.A[id]; if (!img) return;
  const w = (img.width / img.height) * h; c.ctx.save(); c.ctx.globalAlpha = alpha; c.ctx.translate(x, y); c.ctx.rotate(rot * Math.PI / 180); c.ctx.scale(flip ? -1 : 1, 1); c.ctx.drawImage(img, -w / 2, -h / 2, w, h); c.ctx.restore();
}
const ESCENAS_PAPI = {
  s1: {
    cam: [[0, 2.3, 0.5, 0.5], [1.6, 1.0, 0.5, 0.5], [3.3, 2.0, 0.5, 0.42], [4.6, 1.15, 0.5, 0.52]],
    mundo(c) { c.ctx.fillStyle = '#F5B800'; c.ctx.fillRect(0, 0, W, H); rayos(c.ctx, W / 2, H * 0.42, c.ts, '#FFD23F', '#F5A300'); sprite(c, 'papi_fist', { x: 0.5, foot: 0.97, h: 1500, enter: 'pop', bob: 6 }); chispas(c.ctx, c.ts, { seed: 3, n: 12 }); }
  },
  s2: {
    cam: [[0, 1.0, 0.5, 0.5], [2.3, 1.5, 0.3, 0.55], [4.4, 1.7, 0.8, 0.3], [6.4, 1.0, 0.5, 0.5]],
    mundo(c) { fondo(c, 'bg_balcon'); sprite(c, 'chepe_shock', { x: 0.3, foot: 0.97, h: 1250, enter: 'rise', t0: 0.15 }); },
    hud(c) { sello(c.ctx, '0 BACHES', W * 0.66, H * 0.36, c.ts, 4.9, '#22C55E', 92); chispas(c.ctx, c.ts - 4.9, { seed: 8, n: 8, y0: 0.2, y1: 0.45 }); }
  },
  s3: {
    cam: [[0, 1.0, 0.5, 0.5], [5.6, 1.7, 0.5, 0.52], [6.0, 1.15, 0.5, 0.52]],
    mundo(c) {
      const corre = c.ts < 5.9; fondo(c, 'bg_playa', { dx: corre ? -c.ts * 40 : 0, base: 1.25 });
      sprite(c, 'papi_run', { x: corre ? (a) => 0.38 + 0.1 * Math.sin(a * 1.4) : 0.5, foot: 0.93, h: corre ? 1150 : 1250, enter: 'left', t0: 0.1, salto: corre ? 9 : 0, tilt: corre ? 6 : 0, hablante: 'papi', bob: corre ? 2 : 10 });
      if (corre) velocidad(c.ctx, c.ts);
    },
    hud(c) { texto(c.ctx, 'LA RACHAAA', W / 2, H * 0.2, c.ts, 6.0, { size: 112, rot: -5 }); texto(c.ctx, 'ESTÁ ACTIVAAA', W / 2, H * 0.275, c.ts, 6.4, { size: 112, rot: 3, color: '#FF4D6D' }); if (c.ts > 6) chispas(c.ctx, c.ts, { seed: 2, n: 16, y0: 0.15, y1: 0.55 }); },
    sacudida(ts) { return ts > 6 && ts < 8.4 ? 14 : 0; }
  },
  s4: {
    cam: [[0, 1.0, 0.5, 0.78], [3.0, 1.25, 0.5, 0.45], [6.0, 1.7, 0.5, 0.22], [9.4, 1.2, 0.5, 0.4]],
    mundo(c) {
      fondo(c, 'bg_ciudad', { deriva: 0.1 });
      [[0.22, 0.42, 230, 1], [0.55, 0.32, 190, 1.4], [0.15, 0.55, 150, 0.8], [0.7, 0.2, 170, 1.8]].forEach(([y0, ph, h, v], i) => { const x = ((c.ts * 150 * v + ph * 1500 + i * 400) % (W + 700)) - 350; objeto(c, 'nave', i % 2 ? W - x : x, y0 * H + Math.sin(c.ts * 2 + i) * 14, h, { flip: !!(i % 2) }); });
    },
    hud(c) { sello(c.ctx, 'TORRE CATRACHA', W / 2, H * 0.3, c.ts, 6.6, '#2563EB', 78, 4); chispas(c.ctx, c.ts, { seed: 6, n: 8, y0: 0.1, y1: 0.4 }); }
  },
  s5: {
    cam: [[0, 1.0, 0.5, 0.5], [2.6, 1.5, 0.7, 0.62], [6.0, 1.0, 0.5, 0.5], [8.0, 1.9, 0.22, 0.62], [11.2, 1.3, 0.3, 0.6]],
    mundo(c) {
      fondo(c, 'bg_sps'); const t = c.ts;
      objeto(c, 'rapidito', lerp(W * 1.3, W * 0.72, ease(t / 1.1)), H * 0.67 + Math.sin(t * 14) * (t < 1.1 ? 4 : 0), 520, { flip: true });
      sprite(c, 'abuelita', { x: (a) => 0.18 + clamp((a - 1.4) / 4) * 0.5, foot: 0.8, h: 520, t0: 1.0, enter: 'pop', bobV: 9, bob: 7, flip: false });
      sprite(c, 'chepe_proud', { x: 0.42, foot: 0.97, h: 1000, t0: 0.4, enter: 'drop', hablante: 'narrador' });
      sprite(c, 'pollo', { x: 0.14, foot: 0.82, h: t > 7.5 ? 760 : 560, t0: 6.6, enter: 'pop', salto: 7, bob: 4, tilt: t > 8 ? Math.sin(t * 6) * 6 : 0 });
    },
    hud(c) { sello(c.ctx, '0 CHOQUES', W * 0.5, H * 0.25, c.ts, 3.3, '#22C55E', 78); if (c.ts > 9) texto(c.ctx, '¿DÓNDE ESTOOOY?', W * 0.55, H * 0.3, c.ts, 9.0, { size: 92, rot: -3, color: '#FFFFFF' }); }
  },
  s6: {
    cam: [[0, 1.0, 0.5, 0.5], [2.4, 1.35, 0.62, 0.45], [4.8, 1.0, 0.4, 0.6]],
    mundo(c) { fondo(c, 'ceiba', { deriva: 0.12, base: 1.15 }); confeti(c.ctx, c.ts, 80, 4); },
    hud(c) { sello(c.ctx, 'CARNAVAL TODO EL AÑO', W / 2, H * 0.3, c.ts, 3.4, '#E11D48', 66, -4); }
  },
  s7: {
    cam: [[0, 1.0, 0.5, 0.5], [2.8, 1.2, 0.5, 0.56], [5.4, 1.0, 0.5, 0.5]],
    mundo(c) {
      fondo(c, 'bg_sala'); sprite(c, 'chepe_cheer', { x: 0.62, foot: 0.97, h: 1150, enter: 'pop', salto: c.ts > 5 ? 8 : 0, hablante: 'narrador' });
      // El recibo de la luz: una hoja con «L. 1.00»
      const a = c.ts - 0.8; if (a > 0) { const k = outBack(a / 0.4); c.ctx.save(); c.ctx.translate(W * 0.3, H * 0.5); c.ctx.rotate(-0.1 + Math.sin(c.ts * 3) * 0.03); c.ctx.scale(k, k); c.ctx.fillStyle = '#fff'; c.ctx.fillRect(-170, -220, 340, 440); c.ctx.strokeStyle = '#1f2937'; c.ctx.lineWidth = 7; c.ctx.strokeRect(-170, -220, 340, 440); c.ctx.fillStyle = '#1f2937'; for (let i = 0; i < 6; i++) c.ctx.fillRect(-130, -180 + i * 26, 260 - (i % 3) * 50, 10); c.ctx.font = '900 96px Montserrat'; c.ctx.textAlign = 'center'; c.ctx.fillStyle = '#16A34A'; c.ctx.fillText('L. 1.00', 0, 120); c.ctx.restore(); }
    },
    hud(c) { if (c.ts > 5.2) { confeti(c.ctx, c.ts - 5.2, 60, 12); texto(c.ctx, '¡GOOOL!', W / 2, H * 0.3, c.ts, 5.4, { size: 190, rot: -4, color: '#7CFF6B' }); } }
  },
  s8: {
    cam: [[0, 1.0, 0.35, 0.55], [3.0, 1.25, 0.65, 0.58], [6.0, 1.05, 0.5, 0.5]],
    mundo(c) {
      fondo(c, 'bg_hospital'); sprite(c, 'chepe_proud', { x: 0.28, foot: 0.97, h: 1050, enter: 'left', hablante: 'narrador' });
      sprite(c, 'graduados', { x: 0.74, foot: 0.9, h: 700, t0: 3.4, enter: 'drop', salto: 6, bob: 4 });
    },
    hud(c) { sello(c.ctx, 'MEDICINAS ✔'.replace(' ✔', ''), W * 0.3, H * 0.27, c.ts, 1.2, '#22C55E', 70); sello(c.ctx, 'TECHOS', W * 0.7, H * 0.27, c.ts, 3.2, '#22C55E', 70, 5); sello(c.ctx, '3 IDIOMAS', W / 2, H * 0.36, c.ts, 5.6, '#2563EB', 70, -3); }
  },
  s9: {
    cam: [[0, 1.0, 0.5, 0.55], [5.9, 1.9, 0.5, 0.45], [6.3, 1.2, 0.5, 0.5]],
    mundo(c) {
      fondo(c, 'bg_colina'); const t = c.ts;
      sprite(c, 'papi_flag', { x: 0.5, foot: 1.0, h: 1500, enter: 'rise', sway: 2.2, hablante: 'papi', escala: t > 6 ? 1.0 : 1 });
      [[1.2, 0.2, 0.3, '#FF4D6D'], [2.6, 0.78, 0.25, '#4DD2FF'], [3.8, 0.5, 0.2, '#FFE14D'], [5.0, 0.85, 0.33, '#7CFF6B'], [6.6, 0.3, 0.28, '#FF9F1C'], [7.3, 0.7, 0.22, '#FF4D6D']].forEach(([t0, x, y, col], i) => fuego(c.ctx, t - t0, x * W, y * H, col, i + 1));
    },
    hud(c) { texto(c.ctx, 'LA RACHAAA', W / 2, H * 0.2, c.ts, 6.1, { size: 112, rot: -5 }); texto(c.ctx, 'ESTÁ ACTIVAAA', W / 2, H * 0.275, c.ts, 6.5, { size: 112, rot: 3, color: '#FF4D6D' }); },
    sacudida(ts) { return ts > 6 && ts < 8.4 ? 14 : 0; }
  },
  s10: {
    cam: [[0, 1.5, 0.5, 0.45], [2.0, 1.0, 0.5, 0.5], [4.2, 1.35, 0.5, 0.42]],
    mundo(c) { c.ctx.fillStyle = '#F5B800'; c.ctx.fillRect(0, 0, W, H); rayos(c.ctx, W / 2, H * 0.45, c.ts * 1.4, '#FFD23F', '#F59E0B'); sprite(c, 'papi_shrug', { x: 0.5, foot: 0.97, h: 1450, enter: 'pop', bob: 6 }); },
    hud(c) { texto(c.ctx, 'LO MÍNIMO', W / 2, H * 0.3, c.ts, 3.6, { size: 150, rot: -3, color: '#FFFFFF' }); }
  },
  s11: {
    cam: [[0, 1.0, 0.5, 0.55], [3.2, 1.7, 0.74, 0.28], [6.4, 1.0, 0.5, 0.55], [8.0, 1.5, 0.5, 0.62]],
    mundo(c) {
      fondo(c, 'bg_noche'); const t = c.ts;
      sprite(c, 'chepe_bed', { x: 0.5, foot: 1.03, h: 1000, enter: 'rise', t0: 0.5, hablante: 'narrador', bob: 5 });
      // Alarma: ondas rojas y la pantalla del teléfono late
      if (t < 4) for (let i = 0; i < 3; i++) { const k = ((t * 1.6 + i / 3) % 1); c.ctx.strokeStyle = `rgba(255,70,70,${1 - k})`; c.ctx.lineWidth = 8; c.ctx.beginPath(); c.ctx.arc(W * 0.3, H * 0.6, 40 + k * 190, 0, PI2); c.ctx.stroke(); }
      // Apagón: la luz de la calle parpadea y se oscurece todo
      if (t > 5.2) { const f = t < 6.2 ? (Math.floor(t * 12) % 2 ? 0.15 : 0.45) : 0.4; c.ctx.fillStyle = `rgba(0,0,10,${f})`; c.ctx.fillRect(0, 0, W, H); }
    },
    hud(c) { if (c.ts > 5.4) texto(c.ctx, '¡APAGÓN!', W / 2, H * 0.3, c.ts, 5.4, { size: 150, rot: -4, color: '#FFFFFF' }); },
    sacudida(ts) { return ts < 3.6 ? 5 : 0; }
  },
  s12: {
    cam: [[0, 1.0, 0.5, 0.5], [3.0, 1.35, 0.5, 0.55], [5.4, 1.1, 0.5, 0.5]],
    mundo(c) { fondo(c, 'bg_hoyo'); sprite(c, 'amigo_arms', { x: 0.5, foot: 0.96, h: 1250, enter: 'pop', bob: 5, tilt: -1.2 }); },
    hud(c) { texto(c.ctx, 'COMPÁRTELO', W / 2, H * 0.22, c.ts, 3.4, { size: 140, rot: -3, color: '#FFE14D' }); }
  }
};

/* ---------- guion animado de «congreso-al-servicio» ---------- */
function reloj(ctx, x, y, r, ts, t0) {
  const a = ts - t0; if (a < 0) return; const k = outBack(a / 0.4);
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(Math.sin(ts * 14) * 0.03 * (a < 1.5 ? 1 : 0));
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(0, 0, r, 0, PI2); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 12; i++) { const an = (i / 12) * PI2; ctx.lineWidth = i % 3 ? 5 : 9; ctx.beginPath(); ctx.moveTo(Math.sin(an) * r * 0.82, -Math.cos(an) * r * 0.82); ctx.lineTo(Math.sin(an) * r * 0.93, -Math.cos(an) * r * 0.93); ctx.stroke(); }
  const man = (ang, len, w) => { ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ang) * r * len, -Math.cos(ang) * r * len); ctx.stroke(); };
  man((8 / 12) * PI2, 0.5, 13); man(0, 0.75, 9);
  ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, PI2); ctx.fill(); ctx.restore();
}
function pantalla(c, x, y, w, h, t0) {
  const { ctx, ts } = c, a = ts - t0; if (a < 0) return; const k = outBack(a / 0.45);
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = '#0B1F4D'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 12; ctx.strokeRect(-w / 2, -h / 2, w, h);
  for (let i = 0; i < 5; i++) {
    const ry = -h / 2 + 50 + i * (h - 80) / 5; ctx.fillStyle = '#93C5FD'; ctx.fillRect(-w / 2 + 28, ry, w * 0.5 - (i % 3) * 30, 18); ctx.fillStyle = '#FDE68A'; ctx.fillRect(w * 0.1, ry, w * 0.28, 18);
    const ap = ts - t0 - 1.2 - i * 1.1; if (ap > 0) { const kk = outBack(ap / 0.25); ctx.save(); ctx.translate(w * 0.36, ry + 8); ctx.rotate(-0.15); ctx.scale(kk, kk); ctx.strokeStyle = '#22C55E'; ctx.lineWidth = 7; ctx.strokeRect(-70, -22, 140, 44); ctx.fillStyle = '#22C55E'; ctx.font = '900 30px Montserrat'; ctx.textAlign = 'center'; ctx.fillText('APROBADO', 0, 11); ctx.restore(); }
  }
  ctx.restore();
}
const ESCENAS_CONGRESO = {
  s1: {
    cam: [[0, 1.0, 0.5, 0.5], [2.4, 1.4, 0.5, 0.38], [4.8, 1.15, 0.5, 0.5]],
    mundo(c) {
      const { ctx, ts } = c; fondo(c, 'bg_congreso_noche', { deriva: 0.08 });
      const d = 0.6 * (1 - clamp((ts - 2.0) / 2.2)); ctx.fillStyle = `rgba(0,0,25,${d})`; ctx.fillRect(0, 0, W, H);
      const g = clamp((ts - 2.0) / 2.2); if (g > 0) { const gr = ctx.createRadialGradient(W / 2, H * 0.42, 20, W / 2, H * 0.42, 150 + 800 * g); gr.addColorStop(0, `rgba(255,225,120,${0.55 * g})`); gr.addColorStop(1, 'rgba(255,225,120,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
      sprite(c, 'chepe_shock', { x: 0.22, foot: 0.99, h: 800, enter: 'rise', t0: 0.3 });
    },
    hud(c) { sello(c.ctx, '¡SE PRENDIÓ LA LUZ!', W / 2, H * 0.3, c.ts, 4.0, '#F59E0B', 70, -4); chispas(c.ctx, c.ts - 4.0, { seed: 4, n: 10, y0: 0.2, y1: 0.45 }); }
  },
  s2: {
    cam: [[0, 1.0, 0.5, 0.5], [2.3, 1.5, 0.3, 0.55], [4.4, 1.5, 0.75, 0.35], [7.0, 1.0, 0.5, 0.5]],
    mundo(c) {
      const t = c.ts; fondo(c, 'bg_balcon'); sprite(c, 'chepe_shock', { x: 0.3, foot: 0.97, h: 1250, enter: 'rise', t0: 0.15 });
      for (let i = 0; i < 2; i++) { const a = (t - 1.2 - i * 2.4) / 3.4; if (a > 0 && a < 1) objeto(c, 'diputados', lerp(-300, W + 300, a), H * 0.64 + Math.sin(t * 14) * 8, 430, {}); }
      reloj(c.ctx, W * 0.74, H * 0.3, 150, t, 0.5);
    },
    hud(c) { sello(c.ctx, '¡A LAS 8!', W * 0.5, H * 0.43, c.ts, 5.6, '#22C55E', 100); chispas(c.ctx, c.ts - 5.6, { seed: 8, n: 8, y0: 0.25, y1: 0.5 }); }
  },
  s3: {
    cam: [[0, 1.0, 0.5, 0.5], [4.5, 1.7, 0.5, 0.52], [4.9, 1.15, 0.5, 0.52]],
    mundo(c) { const { ctx } = c; ctx.fillStyle = '#F5B800'; ctx.fillRect(0, 0, W, H); rayos(ctx, W / 2, H * 0.42, c.ts, '#FFD23F', '#F5A300'); sprite(c, 'presidente_mazo', { x: 0.5, foot: 0.99, h: 1280, enter: 'pop', t0: 0.2, bob: 6, hablante: 'presidente' }); chispas(ctx, c.ts, { seed: 3, n: 12 }); },
    hud(c) { texto(c.ctx, '¡SESIÓN ABIERTA', W / 2, H * 0.075, c.ts, 4.7, { size: 96, rot: -4 }); texto(c.ctx, 'Y A LA HORAAA,', W / 2, H * 0.145, c.ts, 5.2, { size: 92, rot: 3, color: '#FF4D6D' }); texto(c.ctx, 'MAJE!', W / 2, H * 0.225, c.ts, 5.7, { size: 120, rot: -3 }); if (c.ts > 4.7) chispas(c.ctx, c.ts, { seed: 2, n: 16, y0: 0.15, y1: 0.55 }); },
    sacudida(ts) { return ts > 4.7 && ts < 7.6 ? 14 : 0; }
  },
  s4: {
    cam: [[0, 1.0, 0.5, 0.5], [3.0, 1.35, 0.5, 0.4], [6.5, 1.0, 0.5, 0.5], [8.6, 1.5, 0.5, 0.4]],
    mundo(c) { fondo(c, 'bg_clinica', { deriva: 0.1 }); sprite(c, 'diputada_bata', { x: 0.5, foot: 0.99, h: 1350, enter: 'pop', t0: 0.3, bob: 5 }); },
    hud(c) { sello(c.ctx, 'DICE: 2 PLAZAS', W / 2, H * 0.24, c.ts, 4.2, '#EA580C', 70, -3); sello(c.ctx, '1 SOLA CHAMBA', W / 2, H * 0.34, c.ts, 8.8, '#22C55E', 84, 3); chispas(c.ctx, c.ts - 8.8, { seed: 5, n: 10, y0: 0.25, y1: 0.45 }); }
  },
  s5: {
    cam: [[0, 1.0, 0.5, 0.5], [2.6, 1.5, 0.7, 0.62], [6.0, 1.0, 0.5, 0.5], [8.0, 1.4, 0.3, 0.55]],
    mundo(c) {
      const t = c.ts; fondo(c, 'bg_hospital', { deriva: 0.08 });
      sprite(c, 'abuelita', { x: (a) => 0.15 + clamp((a - 1.0) / 6) * 0.45, foot: 0.82, h: 560, t0: 0.8, enter: 'pop', bobV: 9, bob: 7 });
      sprite(c, 'chepe_cheer', { x: 0.74, foot: 0.99, h: 1100, enter: 'pop', t0: 0.3, salto: t > 5 ? 8 : 0, hablante: 'narrador' });
    },
    hud(c) { sello(c.ctx, 'MEDICINAS', W * 0.35, H * 0.26, c.ts, 1.6, '#22C55E', 80); sello(c.ctx, 'SIN FALTANTES', W * 0.6, H * 0.35, c.ts, 4.4, '#2563EB', 70, 4); if (c.ts > 7.2) confeti(c.ctx, c.ts - 7.2, 50, 5); }
  },
  s6: {
    cam: [[0, 1.0, 0.35, 0.55], [3.0, 1.3, 0.65, 0.58], [5.5, 1.05, 0.5, 0.5]],
    mundo(c) { fondo(c, 'bg_hospital', { dx: -260, base: 1.3 }); sprite(c, 'chepe_proud', { x: 0.28, foot: 0.99, h: 1050, enter: 'left', hablante: 'narrador' }); sprite(c, 'graduados', { x: 0.76, foot: 0.9, h: 700, t0: 2.2, enter: 'drop', salto: 6, bob: 4 }); },
    hud(c) { sello(c.ctx, 'MAESTROS PAGADOS', W * 0.5, H * 0.24, c.ts, 0.9, '#22C55E', 62); sello(c.ctx, 'TECHOS', W * 0.72, H * 0.31, c.ts, 3.0, '#22C55E', 70, 5); sello(c.ctx, 'INGLÉS', W * 0.5, H * 0.38, c.ts, 5.2, '#2563EB', 70, -3); }
  },
  s7: {
    cam: [[0, 1.0, 0.4, 0.5], [3.0, 1.3, 0.7, 0.5], [6.0, 1.5, 0.72, 0.5], [8.2, 1.0, 0.5, 0.5]],
    mundo(c) {
      const { ts } = c; fondo(c, 'bg_pleno', { deriva: 0.08 }); sprite(c, 'presidente_senala', { x: 0.28, foot: 0.99, h: 1200, enter: 'pop', t0: 0.3, bob: 5 });
      const a = ts - 2.0; if (a > 0) { const k = outBack(a / 0.4); objeto(c, 'sobre', W * 0.74, H * 0.5, 520 * k, { rot: -4 }); }
      const b = clamp((ts - 4.6) / 1.2); if (ts > 4.6) objeto(c, 'tijeras', lerp(W * 1.0, W * 0.74, ease(b)), lerp(H * 0.3, H * 0.47, ease(b)), 380, { rot: ts > 5.8 ? Math.sin(ts * 22) * 14 : -20 });
    },
    hud(c) { sello(c.ctx, 'FALTAS = SIN PAGO', W / 2, H * 0.27, c.ts, 6.0, '#DC2626', 66, -3); texto(c.ctx, '¡NI UN LEMPIRA!', W / 2, H * 0.34, c.ts, 8.2, { size: 100, rot: 3, color: '#FFFFFF' }); },
    sacudida(ts) { return ts > 6.0 && ts < 6.5 ? 10 : 0; }
  },
  s8: {
    cam: [[0, 1.0, 0.35, 0.55], [3.5, 1.3, 0.62, 0.4], [7.0, 1.1, 0.5, 0.5], [9.0, 1.5, 0.7, 0.28]],
    mundo(c) { fondo(c, 'bg_pleno', { dx: 120, deriva: 0.06 }); sprite(c, 'chepe_proud', { x: 0.22, foot: 0.99, h: 1000, enter: 'left', hablante: 'narrador' }); pantalla(c, W * 0.64, H * 0.36, 560, 400, 0.6);
      const a = c.ts - 8.2; if (a > 0) { const k = outBack(a / 0.5); c.ctx.save(); c.ctx.translate(W * 0.84, H * 0.15); c.ctx.scale(k, k); c.ctx.fillStyle = '#FDE047'; c.ctx.beginPath(); c.ctx.arc(0, 0, 70, 0, PI2); c.ctx.fill(); c.ctx.strokeStyle = '#F59E0B'; c.ctx.lineWidth = 10; for (let i = 0; i < 12; i++) { const an = (i / 12) * PI2 + c.ts; c.ctx.beginPath(); c.ctx.moveTo(Math.cos(an) * 90, Math.sin(an) * 90); c.ctx.lineTo(Math.cos(an) * 125, Math.sin(an) * 125); c.ctx.stroke(); } c.ctx.restore(); } },
    hud(c) { sello(c.ctx, 'TODO A LA VISTA', W / 2, H * 0.27, c.ts, 5.8, '#2563EB', 66, -3); sello(c.ctx, 'VOTAN DE DÍA', W / 2, H * 0.36, c.ts, 8.6, '#F59E0B', 70, 3); }
  },
  s9: {
    cam: [[0, 1.0, 0.5, 0.55], [3.0, 1.4, 0.4, 0.5], [6.0, 1.0, 0.5, 0.5]],
    mundo(c) { fondo(c, 'bg_barrio', { deriva: 0.1 }); sprite(c, 'diputada_nota', { x: 0.4, foot: 0.99, h: 1300, enter: 'left', t0: 0.2, tilt: 1.2, bob: 7 }); if (c.ts > 6.3) confeti(c.ctx, c.ts - 6.3, 50, 7); },
    hud(c) { sello(c.ctx, 'ESCUCHAN AL BARRIO', W / 2, H * 0.24, c.ts, 1.2, '#2563EB', 62, -3); sello(c.ctx, '+ UNA BALEADA', W / 2, H * 0.33, c.ts, 4.4, '#F59E0B', 76, 4); }
  },
  s10: {
    cam: [[0, 1.5, 0.5, 0.45], [2.0, 1.0, 0.5, 0.5], [8.5, 1.7, 0.5, 0.52], [8.9, 1.15, 0.5, 0.52]],
    mundo(c) { const { ctx, ts } = c; ctx.fillStyle = '#F5B800'; ctx.fillRect(0, 0, W, H); rayos(ctx, W / 2, H * 0.45, ts * 1.2, '#FFD23F', '#F59E0B'); sprite(c, 'presidente_celebra', { x: 0.5, foot: 0.99, h: 1280, enter: 'pop', t0: 0.2, bob: 6, hablante: 'presidente' }); if (ts > 1) confeti(ctx, ts - 1, 80, 3); },
    hud(c) { if (c.ts < 8.5) sello(c.ctx, 'EL PISTO LLEGA COMPLETO', W / 2, H * 0.3, c.ts, 2.6, '#22C55E', 64, -3); texto(c.ctx, '¡SESIÓN ABIERTA', W / 2, H * 0.075, c.ts, 8.7, { size: 96, rot: -4 }); texto(c.ctx, 'Y A LA HORAAA,', W / 2, H * 0.145, c.ts, 9.2, { size: 92, rot: 3, color: '#FF4D6D' }); texto(c.ctx, 'MAJE!', W / 2, H * 0.225, c.ts, 9.7, { size: 120, rot: -3 }); },
    sacudida(ts) { return ts > 8.7 && ts < 11.5 ? 12 : 0; }
  },
  s11: {
    cam: [[0, 1.0, 0.5, 0.55], [3.2, 1.7, 0.74, 0.28], [5.8, 1.0, 0.5, 0.55], [7.4, 1.5, 0.5, 0.62]],
    mundo(c) {
      const t = c.ts; fondo(c, 'bg_noche'); sprite(c, 'chepe_bed', { x: 0.5, foot: 1.03, h: 1000, enter: 'rise', t0: 0.5, hablante: 'narrador', bob: 5 });
      if (t < 4) for (let i = 0; i < 3; i++) { const k = ((t * 1.6 + i / 3) % 1); c.ctx.strokeStyle = `rgba(255,70,70,${1 - k})`; c.ctx.lineWidth = 8; c.ctx.beginPath(); c.ctx.arc(W * 0.3, H * 0.6, 40 + k * 190, 0, PI2); c.ctx.stroke(); }
      if (t > 6.2) { const f = t < 7.0 ? (Math.floor(t * 12) % 2 ? 0.15 : 0.45) : 0.4; c.ctx.fillStyle = `rgba(0,0,10,${f})`; c.ctx.fillRect(0, 0, W, H); }
    },
    hud(c) { if (c.ts > 6.3) texto(c.ctx, '¡APAGÓN!', W / 2, H * 0.3, c.ts, 6.3, { size: 150, rot: -4, color: '#FFFFFF' }); },
    sacudida(ts) { return ts < 3.6 ? 5 : 0; }
  },
  s12: {
    cam: [[0, 1.0, 0.5, 0.5], [3.0, 1.35, 0.5, 0.55], [5.4, 1.1, 0.5, 0.5]],
    mundo(c) { fondo(c, 'bg_hoyo'); sprite(c, 'amigo_arms', { x: 0.5, foot: 0.96, h: 1250, enter: 'pop', bob: 5, tilt: -1.2 }); },
    hud(c) { texto(c.ctx, 'COMPÁRTELO', W / 2, H * 0.22, c.ts, 3.4, { size: 140, rot: -3, color: '#FFE14D' }); }
  }
};
let ESCENAS = ESCENAS_PAPI;

/* ---------- guion animado de «tal-cual-pasa» (noticiero parodia) ---------- */
function logoTCP(ctx, x, y, s, ts, t0 = 0) {
  const a = ts - t0; if (a < 0) return; const k = outBack(a / 0.4);
  ctx.save(); ctx.translate(x, y); ctx.scale(k * s, k * s);
  ['T', 'C', 'P'].forEach((l, i) => {
    const bx = (i - 1) * 150 - 65, g = ctx.createLinearGradient(0, -65, 0, 65); g.addColorStop(0, '#5B3FD6'); g.addColorStop(1, '#2B1A8C');
    ctx.fillStyle = g; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(bx, -65, 130, 130, 24); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFE14D'; ctx.font = '900 104px Montserrat'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l, bx + 65, 6);
  });
  ctx.restore();
}
function barra(ctx, s, ts, t0 = 0.4) {
  const a = ts - t0; if (a < 0) return; const k = clamp(a / 0.4);
  ctx.save(); ctx.translate(-(1 - ease(k)) * W, 0); ctx.fillStyle = '#C81E3C'; ctx.fillRect(0, H * 0.115, W * 0.62, 70);
  ctx.fillStyle = '#FFFFFF'; ctx.font = '900 40px Montserrat'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s, 34, H * 0.115 + 36); ctx.restore();
}
const ESCENAS_TCP = {
  s1: {
    cam: [[0, 1.0, 0.5, 0.5], [3.0, 1.3, 0.5, 0.45], [6.0, 1.0, 0.5, 0.5]],
    mundo(c) { fondo(c, 'bg_estudio', { deriva: 0.06 }); sprite(c, 'chepe_presenta', { x: 0.5, foot: 1.0, h: 1250, enter: 'rise', t0: 0.2, hablante: 'narrador', bob: 4 }); },
    hud(c) { logoTCP(c.ctx, W / 2, H * 0.22, c.ts < 5.5 ? 1.4 : 0.8, c.ts, 3.2); barra(c.ctx, 'EN VIVO · LA NUEVA LEY PENAL', c.ts, 3.4); chispas(c.ctx, c.ts - 0.4, { seed: 11, n: 10, y0: 0.1, y1: 0.35 }); }
  },
  s2: {
    cam: [[0, 1.0, 0.5, 0.5], [3.2, 1.3, 0.3, 0.55], [5.4, 1.6, 0.74, 0.5], [8.2, 1.2, 0.5, 0.5]],
    mundo(c) { fondo(c, 'bg_estudio'); sprite(c, 'chepe_presenta', { x: 0.26, foot: 1.0, h: 1000, hablante: 'narrador', bob: 4 }); sprite(c, 'curul_nervioso', { x: 0.76, foot: 0.97, h: 1150, enter: 'right', t0: 0.3, hablante: 'don_curul', bob: 4 }); },
    hud(c) { logoTCP(c.ctx, W * 0.82, H * 0.07, 0.5, c.ts); sello(c.ctx, '118 VOTOS', W * 0.5, H * 0.2, c.ts, 2.0, '#2563EB', 70, -3); sello(c.ctx, '2 DEBATES SALTADOS', W * 0.5, H * 0.29, c.ts, 3.6, '#EA580C', 62, 3); sello(c.ctx, 'NI ELLOS SE LA CREEN', W * 0.5, H * 0.38, c.ts, 8.6, '#DC2626', 66, -4); }
  },
  s3: {
    cam: [[0, 1.0, 0.5, 0.5], [2.6, 1.35, 0.5, 0.65], [5.0, 1.5, 0.74, 0.5], [8.0, 1.1, 0.5, 0.5]],
    mundo(c) {
      const { ts } = c; fondo(c, 'bg_estudio'); sprite(c, 'chepe_presenta', { x: 0.26, foot: 1.0, h: 1000, hablante: 'narrador', bob: 4 });
      sprite(c, ts < 5.0 ? 'curul_nervioso' : 'curul_encoge', { x: 0.76, foot: 0.97, h: 1150, hablante: 'don_curul', bob: 4 });
      const a = ts - 0.9; if (a > 0) { const k = outBack(a / 0.45); objeto(c, 'billetes', W * 0.5, H * 0.66, 560 * k, {}); }
    },
    hud(c) { logoTCP(c.ctx, W * 0.82, H * 0.07, 0.5, c.ts); sello(c.ctx, 'L140 MIL AL MES', W * 0.5, H * 0.24, c.ts, 2.2, '#16A34A', 74, -3); sello(c.ctx, 'SEGÚN EL HERALDO', W * 0.5, H * 0.32, c.ts, 3.6, '#2563EB', 54, 3); sello(c.ctx, '¿POR SENTARSE?', W * 0.5, H * 0.4, c.ts, 7.6, '#EA580C', 70, -3); }
  },
  s4: {
    cam: [[0, 1.0, 0.5, 0.55], [3.0, 1.4, 0.5, 0.6], [6.0, 1.1, 0.5, 0.55]],
    mundo(c) { const { ts } = c; fondo(c, 'bg_estudio'); sprite(c, 'chepe_presenta', { x: 0.2, foot: 1.0, h: 800, hablante: 'narrador', bob: 4 }); const a = ts - 0.6; if (a > 0) { const k = outBack(a / 0.5); objeto(c, 'escoltas', W * 0.62, H * 0.66, 1000 * k, {}); } },
    hud(c) { logoTCP(c.ctx, W * 0.82, H * 0.07, 0.5, c.ts); sello(c.ctx, 'AUSTERIDAD', W * 0.5, H * 0.22, c.ts, 1.0, '#16A34A', 76, -3); sello(c.ctx, '¿MÁS GUARDIAS QUE BEZOS?', W * 0.5, H * 0.31, c.ts, 6.0, '#DC2626', 54, 3); },
    sacudida(ts) { return ts > 6.0 && ts < 6.5 ? 8 : 0; }
  },
  s5: {
    cam: [[0, 1.0, 0.5, 0.5], [3.0, 1.4, 0.55, 0.55], [5.4, 1.05, 0.5, 0.5]],
    mundo(c) { const { ts } = c; fondo(c, 'bg_estudio'); sprite(c, 'chepe_presenta', { x: 0.2, foot: 1.0, h: 800, hablante: 'narrador', bob: 4 });
      const a = ts - 0.8; if (a > 0) { const k = outBack(a / 0.45); objeto(c, 'arbol', W * 0.45, H * 0.62, 640 * k, {}); }
      const b = ts - 3.0; if (b > 0) { const k = outBack(b / 0.4); objeto(c, 'esposas', W * 0.75, H * 0.62 + Math.sin(ts * 5) * 10, 420 * k, { rot: Math.sin(ts * 4) * 8 }); } },
    hud(c) { logoTCP(c.ctx, W * 0.82, H * 0.07, 0.5, c.ts); sello(c.ctx, '2 AÑOS 3 MESES', W * 0.5, H * 0.24, c.ts, 3.6, '#DC2626', 76, -3); sello(c.ctx, 'POR SERRUCHAR UN ÁRBOL', W * 0.5, H * 0.33, c.ts, 5.0, '#EA580C', 56, 3); }
  },
  s6: {
    cam: [[0, 1.0, 0.5, 0.5], [3.4, 1.3, 0.5, 0.5], [8.0, 1.2, 0.5, 0.45], [10.6, 1.4, 0.5, 0.5], [12.8, 1.2, 0.5, 0.55], [15.0, 1.5, 0.5, 0.5], [16.6, 1.0, 0.5, 0.5]],
    mundo(c) { const { ts } = c; fondo(c, 'bg_estudio'); sprite(c, 'chepe_presenta', { x: 0.5, foot: 1.0, h: 1100, hablante: 'narrador', bob: 4 });
      if (ts > 12.8) { const k = outBack((ts - 12.8) / 0.4); objeto(c, 'arbol', W * 0.2, H * 0.6, 420 * k, {}); objeto(c, 'esposas', W * 0.8, H * 0.6, 300 * k, { rot: Math.sin(ts * 4) * 6 }); } },
    hud(c) { logoTCP(c.ctx, W * 0.82, H * 0.07, 0.5, c.ts); sello(c.ctx, '45 AÑOS EN EE. UU.', W * 0.5, H * 0.2, c.ts, 3.6, '#DC2626', 66, -3); sello(c.ctx, 'INDULTADO', W * 0.5, H * 0.28, c.ts, 8.3, '#16A34A', 80, 3); sello(c.ctx, 'CASO CERRADO', W * 0.5, H * 0.36, c.ts, 10.8, '#2563EB', 76, -3); sello(c.ctx, 'LEÑADOR = CÁRCEL', W * 0.5, H * 0.44, c.ts > 12.5 ? c.ts : 0, 13.0, '#DC2626', 66, 3); if (c.ts > 15) sello(c.ctx, 'EXPRESIDENTE = SOBRESEIMIENTO', W * 0.5, H * 0.52, c.ts, 15.0, '#16A34A', 50, -3); },
    sacudida(ts) { return ts > 16.6 ? 10 : 0; }
  },
  s7: {
    cam: [[0, 1.0, 0.5, 0.5], [2.6, 1.3, 0.3, 0.55]],
    mundo(c) { const { ts } = c; fondo(c, 'bg_estudio'); sprite(c, 'chepe_presenta', { x: 0.26, foot: 1.0, h: 1000, hablante: 'narrador', bob: 4 }); sprite(c, 'curul_corre', { x: (a) => 0.76 + clamp(a / 3) * 0.55, foot: 0.97, h: 1050, hablante: 'don_curul', salto: 9, tilt: 5, bob: 2 }); },
    hud(c) { logoTCP(c.ctx, W * 0.82, H * 0.07, 0.5, c.ts); sello(c.ctx, 'CORTE A COMERCIALES', W * 0.5, H * 0.26, c.ts, 3.0, '#DC2626', 62, -3); }
  },
  s8: {
    cam: [[0, 1.0, 0.5, 0.5], [4.7, 1.7, 0.5, 0.52], [5.1, 1.15, 0.5, 0.52]],
    mundo(c) { const { ctx } = c; ctx.fillStyle = '#F5B800'; ctx.fillRect(0, 0, W, H); rayos(ctx, W / 2, H * 0.42, c.ts, '#FFD23F', '#F5A300'); sprite(c, 'presidente_mazo', { x: 0.5, foot: 0.99, h: 1280, enter: 'pop', t0: 0.2, bob: 6, hablante: 'presidente' }); chispas(ctx, c.ts, { seed: 3, n: 12 }); },
    hud(c) { texto(c.ctx, '¡SESIÓN ABIERTA', W / 2, H * 0.075, c.ts, 4.9, { size: 96, rot: -4 }); texto(c.ctx, 'Y A LA HORAAA,', W / 2, H * 0.145, c.ts, 5.4, { size: 92, rot: 3, color: '#FF4D6D' }); texto(c.ctx, 'MAJE!', W / 2, H * 0.225, c.ts, 5.9, { size: 120, rot: -3 }); },
    sacudida(ts) { return ts > 4.9 && ts < 8.0 ? 14 : 0; }
  },
  s9: {
    cam: [[0, 1.0, 0.5, 0.5], [3.4, 1.3, 0.5, 0.45], [5.8, 1.1, 0.5, 0.5]],
    mundo(c) { fondo(c, 'bg_estudio'); sprite(c, 'chepe_presenta', { x: 0.5, foot: 1.0, h: 1250, hablante: 'narrador', bob: 4 }); },
    hud(c) { logoTCP(c.ctx, W / 2, H * 0.2, 1.3, c.ts, 0.2); texto(c.ctx, 'COMPÁRTELO', W / 2, H * 0.32, c.ts, 4.2, { size: 140, rot: -3, color: '#FFE14D' }); chispas(c.ctx, c.ts - 0.4, { seed: 5, n: 12, y0: 0.1, y1: 0.4 }); }
  }
};

/* ---------- guion animado de «papi-parte-2» ---------- */
function comentario(ctx, texto, ts, t0, t1) {
  if (ts < t0 || ts > t1 + 0.4) return;
  const k = ts < t1 ? outBack((ts - t0) / 0.4) : 1 - ease((ts - t1) / 0.4);
  ctx.save(); ctx.translate(W / 2, H * 0.2); ctx.scale(Math.max(0.01, k), Math.max(0.01, k));
  ctx.font = '700 46px Montserrat'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const palabras = texto.split(' '), lineas = []; let cur = '';
  for (const p of palabras) { const t = cur ? `${cur} ${p}` : p; if (ctx.measureText(t).width > 780 && cur) { lineas.push(cur); cur = p; } else cur = t; }
  lineas.push(cur);
  const h = 130 + lineas.length * 56, w = 940;
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#111827'; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 36); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9CA3AF'; ctx.beginPath(); ctx.arc(-w / 2 + 70, -h / 2 + 64, 36, 0, PI2); ctx.fill();
  ctx.fillStyle = '#6B7280'; ctx.font = '700 34px Montserrat'; ctx.fillText('Comentario de un seguidor', -w / 2 + 130, -h / 2 + 64);
  ctx.fillStyle = '#111827'; ctx.font = '700 46px Montserrat'; lineas.forEach((l, i) => ctx.fillText(l, -w / 2 + 40, -h / 2 + 130 + i * 56));
  ctx.restore();
}
const ESCENAS_P2 = {
  s1: {
    cam: [[0, 2.0, 0.5, 0.45], [1.6, 1.0, 0.5, 0.5], [3.4, 1.7, 0.5, 0.42], [5.2, 1.15, 0.5, 0.5]],
    mundo(c) { const { ctx } = c; ctx.fillStyle = '#F5B800'; ctx.fillRect(0, 0, W, H); rayos(ctx, W / 2, H * 0.42, c.ts, '#FFD23F', '#F5A300'); sprite(c, 'papi_fist', { x: 0.5, foot: 0.97, h: 1500, enter: 'pop', bob: 6 }); chispas(ctx, c.ts, { seed: 3, n: 12 }); },
    hud(c) { texto(c.ctx, 'PARTE 2', W / 2, H * 0.34, c.ts, 0.5, { size: 150, rot: -4, color: '#FFFFFF' }); }
  },
  s2: {
    cam: [[0, 1.0, 0.5, 0.5], [2.6, 1.3, 0.3, 0.6], [4.4, 1.4, 0.78, 0.55], [6.0, 1.0, 0.5, 0.5]],
    mundo(c) { const { ts } = c; fondo(c, 'bg_barrio', { deriva: 0.1 }); objeto(c, 'maquina', lerp(-300, W + 300, clamp((ts - 0.4) / 5)), H * 0.7 + Math.sin(ts * 12) * 4, 620, {}); sprite(c, 'albanil_grita', { x: 0.78, foot: 0.97, h: 900, enter: 'pop', t0: 3.2, bob: 6 }); },
    hud(c) { sello(c.ctx, 'ASFALTO HASTA EN LOS TECHOS', W / 2, H * 0.3, c.ts, 3.4, '#16A34A', 54, -3); }
  },
  s3: {
    cam: [[0, 1.0, 0.5, 0.5], [2.4, 1.3, 0.4, 0.6], [4.4, 1.15, 0.5, 0.6]],
    mundo(c) { const { ts } = c; fondo(c, 'bg_gasolinera', { deriva: 0.08 }); sprite(c, 'conductor_feliz', { x: 0.72, foot: 0.97, h: 950, enter: 'pop', t0: 1.8, bob: 5 }); },
    hud(c) { sello(c.ctx, 'GASOLINA GRATIS', W / 2, H * 0.22, c.ts, 0.8, '#16A34A', 76, -3); sello(c.ctx, '+ 500 PESOS', W / 2, H * 0.3, c.ts, 3.2, '#2563EB', 76, 3); }
  },
  s4: {
    cam: [[0, 1.0, 0.5, 0.5], [2.6, 1.3, 0.4, 0.62], [5.0, 1.4, 0.72, 0.55], [6.8, 1.0, 0.5, 0.5]],
    mundo(c) { const { ts } = c; fondo(c, 'bg_super', { deriva: 0.08 }); objeto(c, 'carretas', lerp(-500, W * 0.32, ease((ts - 0.4) / 1.2)), H * 0.62, 700, {}); sprite(c, 'cajera_vuelto', { x: 0.74, foot: 0.98, h: 1250, enter: 'pop', t0: 3.0, bob: 5 }); if (ts > 5.0) sprite(c, 'pollo', { x: 0.3, foot: 0.9, h: 600, t0: 5.0, enter: 'pop', salto: 7, bob: 3 }); },
    hud(c) { sello(c.ctx, 'COMIDA BARATA', W / 2, H * 0.22, c.ts, 1.0, '#16A34A', 78, -3); sello(c.ctx, 'VUELTO + POLLO', W / 2, H * 0.31, c.ts, 5.2, '#2563EB', 72, 3); }
  },
  s5: {
    cam: [[0, 1.0, 0.5, 0.5], [3.0, 1.35, 0.7, 0.55], [6.0, 1.0, 0.5, 0.5]],
    mundo(c) { const { ts } = c; fondo(c, 'bg_banco'); const a = ts - 0.8; if (a > 0) objeto(c, 'mansion', W * 0.28, H * 0.52, 620 * outBack(a / 0.45), {}); sprite(c, 'banquero_llaves', { x: 0.72, foot: 0.98, h: 1300, enter: 'pop', t0: 2.4, bob: 5 }); },
    hud(c) { sello(c.ctx, '2 CASAS GRATIS', W / 2, H * 0.4, c.ts, 4.8, '#16A34A', 78, 3); chispas(c.ctx, c.ts - 4.8, { seed: 4, n: 10, y0: 0.2, y1: 0.5 }); }
  },
  s6: {
    cam: [[0, 1.0, 0.5, 0.55], [2.4, 1.3, 0.5, 0.65], [4.2, 1.1, 0.5, 0.6]],
    mundo(c) { const { ts } = c; fondo(c, 'bg_ciudad', { deriva: 0.1 }); for (let i = 0; i < 3; i++) { const x = ((ts * 300 + i * 520) % (W + 900)) - 450; objeto(c, 'prado', x, H * (0.74 + 0.04 * i), 640 + 60 * i, {}); } },
    hud(c) { sello(c.ctx, '¡TODOS EN PRADO!', W / 2, H * 0.24, c.ts, 0.8, '#EA580C', 74, -3); }
  },
  s7: {
    cam: [[0, 1.0, 0.5, 0.5], [3.4, 1.25, 0.5, 0.6], [7.0, 1.4, 0.5, 0.5], [9.4, 1.1, 0.5, 0.5]],
    mundo(c) { fondo(c, 'bg_tribunal', { deriva: 0.08 }); sprite(c, 'guardia_cruzado', { x: 0.5, foot: 0.99, h: 1350, enter: 'pop', t0: 6.2, bob: 5 }); },
    hud(c) { sello(c.ctx, 'LEY QUE NI ELLOS SE CREEN', W / 2, H * 0.2, c.ts, 2.0, '#EA580C', 50, -3); sello(c.ctx, 'DELINCUENTE = PRESO', W / 2, H * 0.28, c.ts, 5.4, '#16A34A', 62, 3); sello(c.ctx, 'LEÑA = LIBRE', W / 2, H * 0.36, c.ts, 8.0, '#2563EB', 72, -3); }
  },
  s8: {
    cam: [[0, 1.0, 0.5, 0.55], [2.4, 1.35, 0.5, 0.6]],
    mundo(c) { const { ts, ctx } = c; fondo(c, 'bg_estadio', { deriva: 0.08 }); const a = ts - 1.0; if (a > 0) objeto(c, 'trofeo', W * 0.68, H * 0.58 + Math.sin(ts * 3) * 12, 640 * outBack(a / 0.45), {}); sprite(c, 'papi_fist', { x: 0.28, foot: 0.99, h: 1200, enter: 'pop', t0: 2.2, salto: 6, bob: 4 }); if (ts > 1.6) confeti(ctx, ts - 1.6, 80, 8); },
    hud(c) { sello(c.ctx, 'HONDURAS CAMPEÓN', W / 2, H * 0.26, c.ts, 1.8, '#2563EB', 78, -3); sello(c.ctx, 'DEL MUNDO', W / 2, H * 0.34, c.ts, 3.4, '#F59E0B', 84, 3); }
  },
  s9: {
    cam: [[0, 1.0, 0.5, 0.5], [3.0, 1.3, 0.5, 0.3], [7.8, 1.1, 0.5, 0.5], [8.4, 1.15, 0.5, 0.55]],
    mundo(c) { const { ctx, ts } = c; fondo(c, 'bg_espacio', { deriva: 0.1 }); const a = ts - 0.5; if (a > 0) { ctx.save(); ctx.translate(W / 2, H * 0.155); ctx.rotate(-0.04); ctx.scale(outBack(a / 0.5), outBack(a / 0.5)); ctx.fillStyle = '#7C2D12'; ctx.font = '900 56px Montserrat'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('POTENCIA MUNDIAL', 0, 0); ctx.restore(); }
      sprite(c, 'papi_flag', { x: 0.5, foot: 1.0, h: 1300, enter: 'rise', t0: 7.9, sway: 2.2, hablante: 'papi' }); },
    hud(c) { sello(c.ctx, 'GRINGOS TRABAJANDO AQUÍ', W / 2, H * 0.45, c.ts, 4.2, '#16A34A', 54, -3); texto(c.ctx, 'LA RACHAAA', W / 2, H * 0.33, c.ts, 8.2, { size: 112, rot: -5 }); texto(c.ctx, 'ESTÁ ACTIVAAA', W / 2, H * 0.4, c.ts, 8.6, { size: 112, rot: 3, color: '#FF4D6D' }); if (c.ts > 8.2) chispas(c.ctx, c.ts, { seed: 2, n: 16, y0: 0.15, y1: 0.55 }); },
    sacudida(ts) { return ts > 8.2 && ts < 10.4 ? 12 : 0; }
  },
  s10: {
    cam: [[0, 1.0, 0.5, 0.55], [2.0, 1.6, 0.5, 0.6], [5.2, 1.1, 0.5, 0.55]],
    mundo(c) { const { ctx, ts } = c; fondo(c, 'bg_hamaca'); sprite(c, 'chepe_hamaca', { x: 0.5, foot: 0.98, h: 1150, enter: 'rise', t0: 0.1, bob: 3, tilt: ts > 1.0 && ts < 4 ? Math.sin(ts * 18) * 3 : 0 });
      if (ts < 3.6) for (let i = 0; i < 3; i++) { const k = ((ts * 1.6 + i / 3) % 1); ctx.strokeStyle = `rgba(255,70,70,${1 - k})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(W * 0.25, H * 0.35, 40 + k * 190, 0, PI2); ctx.stroke(); }
      if (ts > 5.8) { const f = ts < 6.6 ? (Math.floor(ts * 12) % 2 ? 0.15 : 0.45) : 0.45; ctx.fillStyle = `rgba(0,0,10,${f})`; ctx.fillRect(0, 0, W, H); } },
    hud(c) { texto(c.ctx, '¡SOLO UN SUEÑO!', W / 2, H * 0.24, c.ts, 2.4, { size: 100, rot: -3, color: '#FFFFFF' }); if (c.ts > 6.0) texto(c.ctx, '¡APAGÓN!', W / 2, H * 0.34, c.ts, 6.0, { size: 140, rot: -4, color: '#FFFFFF' }); },
    sacudida(ts) { return ts < 1.2 ? 14 : 0; }
  },
  s11: {
    cam: [[0, 1.0, 0.5, 0.5], [3.0, 1.2, 0.5, 0.5], [5.8, 1.0, 0.5, 0.5]],
    mundo(c) { fondo(c, 'bg_ciudad', { deriva: 0.1 }); sprite(c, 'chepe_proud', { x: 0.5, foot: 0.99, h: 1100, enter: 'pop', t0: 0.2, hablante: 'narrador', bob: 5 }); },
    hud(c) { texto(c.ctx, 'COMPÁRTELO', W / 2, H * 0.2, c.ts, 3.2, { size: 118, rot: -3, color: '#FFE14D' }); texto(c.ctx, '¿QUÉ OTRA COSA PASARÍA?', W / 2, H * 0.29, c.ts, 4.8, { size: 66, rot: 2, color: '#FFFFFF' }); }
  }
};


/* ---------- escenas declarativas: series.anim.escenas (sin código por serie) ----------
 * Cada escena es un objeto JSON con el id de la escena del guion como llave:
 *   fondo: 'bg_x' (o color: '#hex'), deriva, dx  ·  cam: 'cortes' | 'acerca' | 'quieta' | [[seg, zoom, fx, fy], …], foco (0-1)
 *   personajes: [{ id, x, foot, h, enter: pop|left|right|rise|drop, t0, hablante, flip, bob, salto, tilt, sway }]
 *   objetos: [{ id, x, y, h, t0, pop, flota, rot, flip, de: [x, y], a: [x, y], dur }]   (x, y en fracciones de la pantalla)
 *   hud: [{ tipo: 'sello'|'texto'|'comentario'|'etiqueta', texto, x, y, t0, t1, color, size, rot }]
 *   pov: [{ tipo: 'deutan'|'protan'|'tritan'|'verde-azul'|'grises'|'miopia'|'tunel', t0, t1, etiqueta }]   (cómo lo ve…)
 *   efectos: [{ tipo: 'confeti'|'chispas'|'rayos', t0 }]  ·  sacudida: [t0, t1, fuerza]
 * Detalle y ejemplos en historias/README.md. */
function etiqueta(ctx, texto, ts, t0, t1, color = '#111827', fondoC = '#FFFFFF') {
  if (ts < t0 || (t1 != null && ts > t1 + 0.3)) return;
  const k = t1 != null && ts > t1 ? 1 - ease((ts - t1) / 0.3) : outBack((ts - t0) / 0.35);
  ctx.save(); ctx.translate(W / 2, SAFE.y0 + 150); ctx.scale(Math.max(0.01, k), Math.max(0.01, k));
  ctx.font = '900 54px Montserrat'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(texto).width + 90;
  ctx.fillStyle = fondoC; ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(-w / 2, -48, w, 96, 48); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.fillText(texto, 0, 3); ctx.restore();
}
const CAMS = {
  quieta: () => [[0, 1.0, 0.5, 0.5]],
  acerca: () => [[0, 1.0, 0.5, 0.5]],
  cortes: (dur, fx = 0.5) => { const kf = [[0, 1.0, 0.5, 0.5]]; for (let t = 2.2, i = 0; t < dur - 1.2; t += 2.4, i++) kf.push([t, i % 2 ? 1.0 : 1.32, i % 2 ? 0.5 : fx, 0.5]); return kf; }
};
function desdeSpec(sp) {
  const nombreCam = typeof sp.cam === 'string' || !sp.cam ? (sp.cam || 'cortes') : null;
  const cam = nombreCam ? (dur) => (CAMS[nombreCam] || CAMS.cortes)(dur, sp.foco ?? 0.5) : sp.cam;
  return {
    cam, lento: sp.lento ?? (nombreCam === 'acerca' ? 1.25 : 0), pov: sp.pov,
    sacudida: sp.sacudida ? (ts) => (ts >= sp.sacudida[0] && ts <= sp.sacudida[1] ? sp.sacudida[2] ?? 12 : 0) : undefined,
    mundo(c) {
      const { ctx, ts } = c;
      if (sp.fondo) fondo(c, sp.fondo, { deriva: sp.deriva ?? 0.08, base: sp.base ?? 1.12, dx: (sp.dx || 0) * ts });
      else { ctx.fillStyle = sp.color || '#1f2937'; ctx.fillRect(0, 0, W, H); if (sp.rayos) rayos(ctx, W / 2, H * 0.42, ts, sp.rayos[0], sp.rayos[1]); }
      for (const o of sp.objetos || []) {
        const a = ts - (o.t0 || 0); if (a < 0) continue;
        let x = o.x ?? 0.5, y = o.y ?? 0.5;
        if (o.de && o.a) { const k = ease(clamp(a / (o.dur || 1.2))); x = lerp(o.de[0], o.a[0], k); y = lerp(o.de[1], o.a[1], k); }
        const e = o.pop ? Math.max(0.02, outBack(a / 0.45)) : 1;
        objeto(c, o.id, x * W, y * H + (o.flota ? Math.sin(ts * 3) * 12 : 0), (o.h || 600) * e, { rot: o.rot || 0, flip: o.flip, alpha: o.alpha ?? 1 });
      }
      for (const p of sp.personajes || []) sprite(c, p.id, { x: p.x ?? 0.5, foot: p.foot ?? 0.97, h: p.h ?? 1100, enter: p.enter ?? 'pop', t0: p.t0 ?? 0.2, hablante: p.hablante, flip: p.flip, bob: p.bob, salto: p.salto, tilt: p.tilt, sway: p.sway, escala: p.escala });
      for (const e of sp.efectos || []) {
        const a = ts - (e.t0 || 0); if (a < 0) continue;
        if (e.tipo === 'confeti') confeti(ctx, a, e.n || 80, e.seed || 8);
        else if (e.tipo === 'chispas') chispas(ctx, a, { seed: e.seed || 3, n: e.n || 12, y0: e.y0 ?? 0.1, y1: e.y1 ?? 0.5 });
        else if (e.tipo === 'rayos') rayos(ctx, W / 2, H * 0.42, a, e.a || '#FFD23F', e.b || '#F5A300');
      }
    },
    hud(c) {
      const { ctx, ts } = c;
      for (const h of sp.hud || []) {
        const x = (h.x ?? 0.5) * W, y = (h.y ?? 0.3) * H, t0 = h.t0 ?? 0.5;
        if (h.tipo === 'sello') sello(ctx, h.texto, x, y, ts, t0, h.color || '#22C55E', h.size || 78, h.rot ?? -4);
        else if (h.tipo === 'texto') texto(ctx, h.texto, x, y, ts, t0, { size: h.size || 110, color: h.color || '#FFE14D', rot: h.rot ?? -4, dur: h.dur ?? 99 });
        else if (h.tipo === 'comentario') comentario(ctx, h.texto, ts, t0, h.t1 ?? t0 + 3);
        else if (h.tipo === 'etiqueta') etiqueta(ctx, h.texto, ts, t0, h.t1, h.color, h.fondo);
      }
    }
  };
}

/* ---------- audio: volumen de la voz por cuadro (mueve la boca) ---------- */
function envolvente(wav) {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], { maxBuffer: 256 * 1024 * 1024 });
  const f = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.byteLength / 4)), n = Math.floor(f.length / (8000 / FPS)), env = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; const a = Math.floor(i * 8000 / FPS), b = Math.floor((i + 1) * 8000 / FPS); for (let j = a; j < b; j++) s += f[j] * f[j]; env[i] = Math.sqrt(s / Math.max(1, b - a)); }
  const orden = [...env].sort((x, y) => x - y), tope = orden[Math.floor(orden.length * 0.92)] || 1;
  return env.map((v, i) => clamp(((v + (env[i - 1] || 0)) / 2) / tope));
}

async function preparar(series, n) {
  setupFonts();
  const ep = episode(series, n), timeline = readJson(timelineFile(series.slug, n));
  if (!timeline) throw new Error('Falta la voz: ejecuta «npm run voice -- --ep 1».');
  const A = await cargar(path.join(OUT_DIR, series.slug, 'anim'));
  const ceiba = path.join(imageDir(series.slug, n), 's6.jpg'); if (series.slug === 'papi-a-la-orden' && fs.existsSync(ceiba)) A.ceiba = await loadImage(fs.readFileSync(ceiba));
  const env = envolvente(path.join(path.dirname(timelineFile(series.slug, n)), timeline.audio));
  const lineas = timeline.lines, voz = (t, spk) => (lineas.some((l) => l.speaker === spk && t >= l.start - 0.03 && t <= l.end + 0.08) ? env[Math.min(env.length - 1, Math.floor(t * FPS))] || 0 : 0);
  const sc = timeline.scenes.map((s, i, a) => ({ ...s, ini: i === 0 ? 0 : s.start, fin: a[i + 1] ? a[i + 1].start : timeline.duration }));

  const cv = createCanvas(W, H), ctx = cv.getContext('2d'); ctx.imageSmoothingQuality = 'high';
  const captions = buildCaptions(timeline, { standalone: true });
  const Hk = LOOK.hook, hookL = layoutWords(ctx, ep.hook_text.trim().split(/\s+/).map((w) => ({ text: w.toLocaleUpperCase('es') })), { size: Hk.size, min: Hk.min, stroke: Hk.stroke, maxLines: Hk.maxLines, lineGap: 1.1 });
  const hookY = SAFE.y0 + 12 + 30 + Hk.gapTop + hookL.asc + Hk.stroke / 2;
  const S = { ...LOOK.sub, ...(series.anim?.subs || {}) }; const violations = [];
  Object.assign(BOCA, series.anim?.boca || {});
  for (const c of captions) {
    c.L = layoutWords(ctx, c.words, { size: S.size, min: S.min, stroke: S.stroke, lineGap: S.lineGap });
    c.baseY = S.y - ((c.L.rows.length - 1) * c.L.lineH) / 2 + (c.L.asc - c.L.desc) / 2;
    const b = boxOf(c.L, c.baseY, S.stroke); if (b.x0 < SAFE.x0 || b.x1 > SAFE.x1 || b.y0 < SAFE.y0 || b.y1 > SAFE.y1) violations.push(c.words.map((w) => w.text).join(' '));
  }

  function render(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const i = Math.max(0, sc.findLastIndex((s) => t >= s.ini)), s = sc[i], E = ESCENAS[s.id], ts = t - s.ini;
    if (E) {
      const durE = s.fin - s.ini, kf = typeof E.cam === 'function' ? E.cam(durE) : E.cam; let a = kf[0], prev = kf[0];
      for (const k of kf) if (ts >= k[0]) { prev = a; a = k; }
      const kk = a === prev ? 1 : ease((ts - a[0]) / 0.24);
      let z = lerp(prev[1], a[1], kk), fx = lerp(prev[2], a[2], kk), fy = lerp(prev[3], a[3], kk);
      z *= 1 + 0.1 * (1 - ease(ts / 0.3)); // cada corte «cae» un poco encima
      if (E.lento) z *= lerp(1, E.lento, clamp(ts / Math.max(1, durE)));
      fx = clamp(fx, 0.5 / z, 1 - 0.5 / z); fy = clamp(fy, 0.5 / z, 1 - 0.5 / z);
      const sh = E.sacudida ? E.sacudida(ts) : 0, ox = sh ? Math.sin(ts * 60) * sh : 0, oy = sh ? Math.cos(ts * 53) * sh : 0;
      const c = { ctx, ts, dur: s.fin - s.ini, A, voz: (spk) => voz(t, spk) };
      ctx.save(); ctx.translate(W / 2 + ox, H / 2 + oy); ctx.scale(z, z); ctx.translate(-fx * W, -fy * H); E.mundo(c); ctx.restore();
      if (E.hud) { ctx.save(); ctx.translate(ox * 0.6, oy * 0.6); E.hud(c); ctx.restore(); }
      // «Cómo lo ve…»: filtro de visión con fundido de 0,35 s (y una etiqueta mientras dura), después del dibujo y antes de los subtítulos
      for (const p of E.pov || []) {
        const t0 = p.t0 ?? 0, t1 = p.t1, k = ease(clamp((ts - t0) / 0.35)) * (t1 != null ? 1 - ease(clamp((ts - t1) / 0.35)) : 1);
        if (k > 0.004) aplicarPOV(ctx, W, H, p.tipo, k);
        if (p.etiqueta) etiqueta(ctx, p.etiqueta, ts, t0, t1, '#FFFFFF', '#BE185D');
      }
      if (ts < 0.14) { ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - ts / 0.14)})`; ctx.fillRect(0, 0, W, H); }
    }
    if (t < Hk.until + Hk.fade) { const al = t < Hk.until ? 1 : 1 - (t - Hk.until) / Hk.fade; drawRows(ctx, hookL, hookY, { stroke: Hk.stroke, color: '#FFFFFF', alpha: al, scale: 0.94 + 0.06 * ease(t / 0.18) }); }
    const cap = captions.find((x) => t >= x.start && t < x.end);
    if (cap) { let act = -1; cap.words.forEach((w, k) => { if (t >= w.start - 0.02) act = k; }); drawRows(ctx, cap.L, cap.baseY, { stroke: S.stroke, color: S.color, active: act, activeColor: S.active, scale: 0.9 + 0.1 * ease((t - cap.start) / 0.1) }); }
    return cv;
  }
  return { ep, timeline, render, violations };
}

async function main() {
  const o = parseCli({ series: { type: 'string' }, ep: { type: 'string', default: '1' }, still: { type: 'string' }, crf: { type: 'string', default: '20' } });
  const series = loadSeries(o.series), n = +o.ep;
  if (series.slug === 'congreso-al-servicio') ESCENAS = ESCENAS_CONGRESO;
  if (series.slug === 'tal-cual-pasa') ESCENAS = ESCENAS_TCP;
  if (series.slug === 'papi-parte-2') ESCENAS = ESCENAS_P2;
  if (series.anim?.escenas) ESCENAS = Object.fromEntries(Object.entries(series.anim.escenas).map(([id, sp]) => [id, desdeSpec(sp)]));
  const R = await preparar(series, n);
  if (R.violations.length) log(`AVISO: subtítulos fuera de la zona segura: ${R.violations.join(' | ')}\n`);
  const out = path.join(OUT_DIR, series.slug, `${series.slug}-animado.mp4`);
  if (o.still != null) { for (const s of o.still.split(',')) { const png = out.replace(/\.mp4$/, `-${s}s.png`); fs.writeFileSync(png, R.render(+s).toBuffer('image/png')); log(`PNG: ${png}\n`); } return; }
  const dur = R.timeline.duration, frames = Math.ceil(dur * FPS), wav = path.join(path.dirname(timelineFile(series.slug, n)), R.timeline.audio);
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'pipe:0', '-i', wav,
    '-filter_complex', '[1:a]aresample=48000,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]', '-map', '0:v', '-map', '[a]', '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', o.crf, '-profile:v', 'high', '-g', String(FPS * 2), '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-t', dur.toFixed(3), '-movflags', '+faststart', out];
  const ff = spawn(ffmpegPath, args, { stdio: ['pipe', 'ignore', 'pipe'] }); let err = '';
  ff.stderr.on('data', (d) => { err += d; }); ff.stdin.on('error', () => {});
  const done = new Promise((res, rej) => { ff.on('error', rej); ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}: ${err.slice(-600)}`)))); });
  const t0 = Date.now(); let last = -1;
  for (let i = 0; i < frames; i++) {
    const cv = R.render(i / FPS);
    if (!ff.stdin.write(Buffer.from(cv.data()))) await new Promise((r) => ff.stdin.once('drain', r));
    const p = Math.floor((100 * (i + 1)) / frames); if (p !== last && p % 10 === 0) { last = p; log(`  ${p}% (${i + 1}/${frames})\n`); }
  }
  ff.stdin.end(); await done; log(`Listo en ${((Date.now() - t0) / 1000).toFixed(0)} s: ${out}\n`);
}
main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
