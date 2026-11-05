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
const MINIMO = { vaso: 4, botellas: 3.5, pila: 4.5, torre: 6, piscina: 5, cierre: 4 };

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
const mus = new Float32Array(Math.ceil((t + 0.5) * SR));
pistaMusical(mus, t, { estilo: g.musica || 'lofi', semilla: 7, SR });
fs.writeFileSync(path.join(PUB, 'musica.wav'), wavBuffer(mus.map((x) => Math.tanh(x * 0.9) * 0.9), SR));
fs.writeFileSync(path.join(PUB, 'render.json'), JSON.stringify({ id: g.id, titulo: g.titulo, duracion: t, escenas }, null, 2));
console.log(`${g.titulo}: ${escenas.length} escenas · ${t.toFixed(1)} s`);
for (const e of escenas) console.log(`  ${e.inicio.toFixed(1).padStart(5)} s · ${e.tipo.padEnd(8)} ${e.dur.toFixed(1)} s · voz ${e.voz.toFixed(1)} s`);
