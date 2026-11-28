#!/usr/bin/env node
// Prepara un guion del formato «explica» (motor: "explica"; explicador animado 2D vectorial, al estilo de los videos de
// «cómo funciona / por qué es así»): narra cada escena con la voz local, reparte el tiempo de cada palabra, resuelve en qué
// momento entra cada capa («en»: una palabra de la narración o segundos) y escribe video3d/public/render.json, que dibuja
// la composición «Explica» de Remotion (video3d/src/Explica.jsx).
//   node scripts/explica-preparar.mjs --guion video3d/guiones/explica/botella.json
//   cd video3d && npx remotion render src/index.jsx Explica out/botella.mp4
// Esquema del guion: ver video3d/src/Explica.jsx (cabecera) y docs/motor-explica.md
import fs from 'node:fs';
import path from 'node:path';
import './lib/env-file.mjs';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';
import { narrar } from './lib/voz.mjs';
import { pistaMusical } from './lib/musica.mjs';
import { wavBuffer } from './bounce.mjs';
import { conBiblioteca } from './lib/biblioteca.mjs';

const o = parseCli({ guion: { type: 'string' } });
if (!o.guion) throw new Error('Falta --guion');
const SR = 44100, PUB = path.join(ROOT, 'video3d', 'public');
const g = JSON.parse(fs.readFileSync(path.resolve(ROOT, o.guion), 'utf8'));
const INICIO_VOZ = 0.2, COLA = 0.35;

// Normaliza para comparar palabras (sin acentos, signos ni mayúsculas)
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ%]+/g, '');

// Tiempo de cada palabra dentro de la voz de una escena: proporcional a sus letras, con un poco más tras comas y puntos
function tiempos(texto, dur) {
  const ws = texto.split(/\s+/).filter(Boolean);
  const peso = ws.map((w) => Math.max(2, norm(w).length) + (/[,;:]$/.test(w) ? 3 : /[.?!…]$/.test(w) ? 5 : 0));
  const total = peso.reduce((a, b) => a + b, 0) || 1;
  let t = 0;
  return ws.map((w, i) => { const d = (peso[i] / total) * dur, r = { w, t0: +t.toFixed(3), t1: +(t + d).toFixed(3) }; t += d; return r; });
}
// «en»: número (segundos desde el inicio de la escena) o una palabra/frase de la narración (la primera vez que aparece)
function cuando(en, palabras) {
  if (typeof en === 'number') return en;
  if (!en) return 0.15;
  const objetivo = String(en).split(/\s+/).map(norm).filter(Boolean);
  for (let i = 0; i < palabras.length; i++) if (objetivo.every((x, k) => palabras[i + k] && norm(palabras[i + k].w).startsWith(x))) return Math.max(0, palabras[i].t0 + INICIO_VOZ - 0.08);
  console.error(`Aviso: «${en}» no aparece en la narración; entra al inicio de la escena`);
  return 0.15;
}

const audios = narrar(g.escenas.map((e) => e.voz || e.texto), { SR });
if (!audios) throw new Error('No hay voz instalada (ver scripts/lib/voz.mjs)');
fs.rmSync(path.join(PUB, 'voz'), { recursive: true, force: true }); fs.mkdirSync(path.join(PUB, 'voz'), { recursive: true });
let t = 0;
const escenas = g.escenas.map((e, i) => {
  const voz = audios[i].length / SR, archivo = `voz/${String(i).padStart(2, '0')}.wav`;
  fs.writeFileSync(path.join(PUB, archivo), wavBuffer(audios[i], SR));
  // Las palabras se reparten sobre el texto en pantalla (lo que se lee), con la duración real de la voz
  const palabras = tiempos(e.texto, voz);
  const dur = Math.max(e.minimo || 2.2, INICIO_VOZ + voz + COLA);
  const capas = (e.capas || []).map((c) => ({ ...c, t: cuando(c.en, palabras) }));
  const r = { ...e, capas, audio: archivo, voz, palabras, inicio: t, dur };
  t += dur; return r;
});

// ---------- efectos de sonido sintetizados (sin archivos de terceros) ----------
const ruido = (n, s = 7) => { let x = s; return Float32Array.from({ length: n }, () => ((x = (x * 16807) % 2147483647) / 2147483647) * 2 - 1); };
const sint = (dur, fn) => { const n = Math.floor(dur * SR), b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = fn(i / SR, i); return b; };
const rw = ruido(Math.floor(0.45 * SR));
const SFX = {
  pop: sint(0.12, (x) => Math.sin(2 * Math.PI * (620 * x - 1400 * x * x)) * Math.exp(-x * 30) * 0.7),
  whoosh: sint(0.45, (x, i) => rw[i] * Math.sin(Math.PI * x / 0.45) ** 2 * 0.22),
  ding: sint(0.6, (x) => (Math.sin(2 * Math.PI * 1320 * x) * 0.5 + Math.sin(2 * Math.PI * 1980 * x) * 0.25) * Math.exp(-x * 7) * 0.5),
  tic: sint(0.05, (x) => Math.sin(2 * Math.PI * 1800 * x) * Math.exp(-x * 90) * 0.5)
};
fs.rmSync(path.join(PUB, 'sfx'), { recursive: true, force: true }); fs.mkdirSync(path.join(PUB, 'sfx'), { recursive: true });
for (const [n, b] of Object.entries(SFX)) fs.writeFileSync(path.join(PUB, 'sfx', `${n}.wav`), wavBuffer(b, SR));
const sfx = [];
for (const e of escenas) {
  if (e.inicio > 0) sfx.push({ t: Math.max(0, e.inicio - 0.15), s: 'whoosh', v: 0.5 });
  for (const c of e.capas) {
    const s = c.etiqueta ? 'tic' : c.anim === 'pop' || c.anim === 'crecer' ? 'pop' : c.anim === 'slideIn' ? 'whoosh' : null;
    if (s) sfx.push({ t: e.inicio + c.t, s, v: s === 'whoosh' ? 0.3 : 0.45 });
  }
  if (e.tipo === 'cierre') sfx.push({ t: e.inicio + 0.3, s: 'ding', v: 0.5 });
}

// Música propia, suave, debajo de la voz
const mus = new Float32Array(Math.ceil((t + 0.5) * SR));
pistaMusical(mus, t, { estilo: g.musica || 'lofi', semilla: [...g.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7), SR });
fs.writeFileSync(path.join(PUB, 'musica.wav'), wavBuffer(mus.map((x) => Math.tanh(x * 0.9) * 0.9), SR));

fs.writeFileSync(path.join(PUB, 'render.json'), JSON.stringify({ motor: 'explica', id: g.id, titulo: g.titulo, duracion: t, paleta: g.paleta || {}, dibujos: conBiblioteca(g.dibujos, g.escenas, ROOT), escenas, sfx, marca: g.marca || '@potterplay' }, null, 2));
console.log(`${g.titulo}: ${escenas.length} escenas · ${t.toFixed(1)} s`);
for (const e of escenas) console.log(`  ${e.inicio.toFixed(1).padStart(5)} s · ${(e.fondo || e.tipo || 'escena').padEnd(8)} ${e.dur.toFixed(1)} s · ${e.capas.length} capas`);
