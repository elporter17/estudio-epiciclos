#!/usr/bin/env node
// Prepara un guion de video 3D (video3d/guiones/*.json) para Remotion: narra cada escena con la voz local (voz.mjs),
// mide cuánto dura y escribe video3d/public/render.json (escenas con su inicio, duración y audio) y la música propia.
//   node scripts/video3d-preparar.mjs --guion video3d/guiones/agua.json
//   cd video3d && npx remotion render src/index.jsx Dato out/agua.mp4
import fs from 'node:fs';
import path from 'node:path';
import './lib/env-file.mjs';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';
import { narrar } from './lib/voz.mjs';
import { pistaMusical } from './lib/musica.mjs';
import { wavBuffer } from './bounce.mjs';

const o = parseCli({ guion: { type: 'string', default: 'video3d/guiones/agua.json' } });
const SR = 44100, PUB = path.join(ROOT, 'video3d', 'public');
const g = JSON.parse(fs.readFileSync(path.resolve(ROOT, o.guion), 'utf8'));
// Lo mínimo que dura cada tipo de escena (para que la animación alcance a verse)
const MINIMO = { portada: 3, vaso: 4, botellas: 3.5, calendario: 4.5, pila: 4.5, lluvia: 4.5, foco: 4.5, torre: 6, camion: 5, calle: 4.5, piscina: 4.5, globo: 5, piscinas: 5.5, cuadricula: 5, comparacion: 5, linea: 6.5, gente: 4.5, cierre: 4 };
// La portada dice el gancho (o el título si no tiene texto)
for (const e of g.escenas) if (e.tipo === 'portada' && !e.texto) e.texto = g.titulo;

const audios = narrar(g.escenas.map((e) => e.voz || e.texto), { SR });
if (!audios) throw new Error('No hay voz instalada (ver scripts/lib/voz.mjs)');
fs.rmSync(path.join(PUB, 'voz'), { recursive: true, force: true }); fs.mkdirSync(path.join(PUB, 'voz'), { recursive: true });
let t = 0;
const escenas = g.escenas.map((e, i) => {
  const voz = audios[i].length / SR, archivo = `voz/${String(i).padStart(2, '0')}.wav`;
  fs.writeFileSync(path.join(PUB, archivo), wavBuffer(audios[i], SR));
  const r = { ...e, audio: archivo, voz, inicio: t, dur: Math.max(MINIMO[e.tipo] || 3.5, 0.25 + voz + 0.55) };
  t += r.dur; return r;
});
// Ningún video baja de 56 s (regla del canal: 55 como mínimo): lo que falte se reparte entre las escenas de contenido
const MIN_TOTAL = 56, contenido = escenas.filter((e) => e.tipo !== 'portada' && e.tipo !== 'cierre');
if (t < MIN_TOTAL && contenido.length) { const extra = (MIN_TOTAL - t) / contenido.length; for (const e of contenido) e.dur += extra; t = 0; for (const e of escenas) { e.inicio = t; t += e.dur; } }
// ---------- efectos de sonido (sintetizados aquí: sin archivos de terceros) ----------
const ruido = (n, semilla = 1) => { let x = semilla; return Float32Array.from({ length: n }, () => ((x = (x * 16807) % 2147483647) / 2147483647) * 2 - 1); };
function sintetizar(dur, fn) { const n = Math.floor(dur * SR), b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = fn(i / SR, i); return b; }
const SFX = {
  pop: sintetizar(0.14, (t) => Math.sin(2 * Math.PI * (700 * t - 1500 * t * t)) * Math.exp(-t * 28) * 0.8),
  golpe: (() => { const r = ruido(SR); return sintetizar(0.25, (t, i) => (Math.sin(2 * Math.PI * (110 - 120 * t) * t) * 0.9 + r[i] * 0.25 * Math.exp(-t * 60)) * Math.exp(-t * 16)); })(),
  whoosh: (() => { const r = ruido(SR, 7); let y = 0; return sintetizar(0.55, (t, i) => { y += (r[i] - y) * (0.05 + 0.25 * Math.sin(Math.PI * t / 0.55)); return y * Math.sin(Math.PI * t / 0.55) ** 2 * 1.6; }); })(),
  tic: sintetizar(0.04, (t) => Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 120) * 0.6),
  gota: sintetizar(0.12, (t) => Math.sin(2 * Math.PI * (500 + 2600 * t) * t) * Math.exp(-t * 35) * 0.6),
  llenado: (() => { const r = ruido(SR * 3, 3); let y = 0; return sintetizar(2.4, (t, i) => { y += (r[i] - y) * 0.08; const burbujas = Math.sin(2 * Math.PI * (300 + 200 * Math.sin(t * 23)) * t) * (Math.sin(t * 37) > 0.7 ? 0.25 : 0); return (y * 0.8 + burbujas) * Math.min(1, t * 3) * Math.min(1, (2.4 - t) * 2) * 0.7; }); })(),
  foco: (() => { const r = ruido(SR, 11); return sintetizar(0.35, (t, i) => (r[i] * Math.exp(-t * 50) * 0.6 + Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 12) * 0.8)); })(),
  motor: sintetizar(2.6, (t) => (Math.sin(2 * Math.PI * 52 * t) + 0.5 * Math.sin(2 * Math.PI * 104 * t + Math.sin(t * 30))) * 0.35 * Math.min(1, t * 2) * Math.min(1, (2.6 - t) * 1.5)),
  brillo: sintetizar(1.4, (t) => [1318, 1760, 2093, 2637].reduce((a, f, k) => a + Math.sin(2 * Math.PI * f * t) * Math.exp(-Math.max(0, t - k * 0.12) * 4) * (t > k * 0.12 ? 1 : 0), 0) * 0.18),
  ding: sintetizar(1.2, (t) => (Math.sin(2 * Math.PI * 1320 * t) + 0.6 * Math.sin(2 * Math.PI * 1980 * t)) * Math.exp(-t * 4) * 0.35)
};
fs.rmSync(path.join(PUB, 'sfx'), { recursive: true, force: true }); fs.mkdirSync(path.join(PUB, 'sfx'), { recursive: true });
for (const [n, b] of Object.entries(SFX)) fs.writeFileSync(path.join(PUB, 'sfx', `${n}.wav`), wavBuffer(b, SR));
// Cuándo suena cada efecto en cada tipo de escena (segundos desde que empieza; d = duración de la escena)
const CUANDO = {
  vaso: (d) => [[0.2, 'llenado', 0.5], ...[0.3, 0.7, 1.1, 1.5, 1.9].map((t) => [t, 'gota', 0.4])],
  botellas: () => [[0.5, 'golpe', 0.8], [0.85, 'golpe', 0.8]],
  calendario: (d) => Array.from({ length: 14 }, (_, i) => [d * 0.85 * Math.sqrt(i / 14), 'tic', 0.5]),
  pila: (d) => Array.from({ length: 12 }, (_, i) => [0.3 + i * d * 0.06, 'golpe', 0.45]),
  foco: (d) => [0, 1, 2, 3].map((i) => d * 0.7 * (1 - Math.cbrt(1 - (i + 0.5) / 4))).flatMap((t) => [[t, 'foco', 0.7], [t + 0.35, 'golpe', 0.5]]),
  torre: (d) => [[0.1, 'whoosh', 0.6], [d * 0.7, 'whoosh', 0.8], [d * 0.85, 'brillo', 0.5]],
  camion: () => [[0.1, 'motor', 0.6], [0.8, 'motor', 0.4]],
  piscina: () => [[0.2, 'llenado', 0.6]],
  globo: () => [[0.3, 'brillo', 0.6], [2.2, 'brillo', 0.4]],
  piscinas: (d) => Array.from({ length: 10 }, (_, i) => [0.3 + i * d * 0.07, 'pop', 0.45]),
  cierre: () => [[0.3, 'ding', 0.6]],
  portada: () => [[0.05, 'brillo', 0.6]],
  lluvia: (d) => Array.from({ length: 14 }, (_, i) => [0.5 + i * d * 0.055, 'golpe', 0.35]),
  cuadricula: (d) => Array.from({ length: 10 }, (_, i) => [0.3 + i * d * 0.07, 'pop', 0.45]),
  comparacion: () => [0.2, 0.6, 1.0, 1.4].map((t) => [t, 'pop', 0.5]),
  linea: (d) => [[0.1, 'whoosh', 0.5], [d * 0.7, 'whoosh', 0.7]],
  calle: () => [[0.1, 'motor', 0.5], [1.4, 'motor', 0.4]],
  gente: (d) => Array.from({ length: 8 }, (_, i) => [0.2 + i * d * 0.07, 'pop', 0.35])
};
const sfx = [];
for (const e of escenas) { if (e.inicio > 0) sfx.push({ t: e.inicio - 0.2, s: 'whoosh', v: 0.35 }); for (const [t, s2, v] of (CUANDO[e.tipo] || (() => []))(e.dur)) sfx.push({ t: e.inicio + t, s: s2, v }); }

const mus = new Float32Array(Math.ceil((t + 0.5) * SR));
pistaMusical(mus, t, { estilo: g.musica || 'lofi', semilla: 7, SR });
fs.writeFileSync(path.join(PUB, 'musica.wav'), wavBuffer(mus.map((x) => Math.tanh(x * 0.9) * 0.9), SR));
fs.writeFileSync(path.join(PUB, 'render.json'), JSON.stringify({ id: g.id, titulo: g.titulo, categoria: g.categoria, destacar: g.destacar, duracion: t, escenas, sfx }, null, 2));
console.log(`${g.titulo}: ${escenas.length} escenas · ${t.toFixed(1)} s`);
for (const e of escenas) console.log(`  ${e.inicio.toFixed(1).padStart(5)} s · ${e.tipo.padEnd(8)} ${e.dur.toFixed(1)} s · voz ${e.voz.toFixed(1)} s`);
