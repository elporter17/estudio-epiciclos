// Trae a su lugar lo que descargaste del navegador: toma el archivo más reciente de Descargas
// (video .mp4 o imagen .png/.jpg/.webp) y lo mueve a out/<serie>/epNN/clips/cNN.mp4 o epNN/frames/cNN.<ext>.
//   node scripts/veo-import.mjs --ep 2 --clip c01 --video
//   node scripts/veo-import.mjs --ep 3 --clip c04 --frame
//   node scripts/veo-import.mjs --ep 2 --clip c01 --video --file "C:\ruta\al\video.mp4"
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseCli, run } from './lib/cli.mjs';
import { epDir } from './lib/series.mjs';
import { loadVeo } from './veo-prompts.mjs';

const DOWNLOADS = path.join(os.homedir(), 'Downloads');
const RECENT_MIN = 30; // solo archivos de la última media hora, para no mover algo viejo por error

function newest(exts) {
  const since = Date.now() - RECENT_MIN * 60e3;
  const files = fs.readdirSync(DOWNLOADS)
    .filter((f) => exts.includes(path.extname(f).toLowerCase().slice(1)))
    .map((f) => ({ f: path.join(DOWNLOADS, f), t: fs.statSync(path.join(DOWNLOADS, f)).mtimeMs }))
    .filter((x) => x.t > since)
    .sort((a, b) => b.t - a.t);
  if (!files.length) throw new Error(`No hay ningún ${exts.join('/')} descargado en los últimos ${RECENT_MIN} min en ${DOWNLOADS}. Usa --file para indicar el archivo.`);
  return files[0].f;
}

async function main() {
  const o = parseCli({
    series: { type: 'string', default: 'la-boda-del-platano' }, ep: { type: 'string' }, clip: { type: 'string' },
    video: { type: 'boolean', default: false }, frame: { type: 'boolean', default: false }, file: { type: 'string' }
  });
  if (!o.ep || !o.clip || o.video === o.frame) throw new Error('Uso: node scripts/veo-import.mjs --ep 2 --clip c01 (--video | --frame) [--file <archivo>]');
  const s = loadVeo(o.series), n = parseInt(o.ep, 10);
  const ep = s.episodes.find((e) => e.number === n);
  if (!ep?.clips.some((c) => c.id === o.clip)) throw new Error(`La parte ${o.ep} no tiene el clip ${o.clip}.`);
  const src = path.resolve(o.file || newest(o.video ? ['mp4'] : ['png', 'jpg', 'jpeg', 'webp']));
  const ext = o.video ? 'mp4' : path.extname(src).toLowerCase().slice(1);
  const dir = path.join(epDir(s.slug, n), o.video ? 'clips' : 'frames');
  fs.mkdirSync(dir, { recursive: true });
  if (!o.video) for (const x of ['png', 'jpg', 'jpeg', 'webp']) fs.rmSync(path.join(dir, `${o.clip}.${x}`), { force: true });
  const dest = path.join(dir, `${o.clip}.${ext}`);
  if (o.video) fs.rmSync(dest.replace(/\.mp4$/, '.words.json'), { force: true }); // los tiempos eran del clip anterior
  fs.copyFileSync(src, dest);
  fs.rmSync(src);
  console.log(`${path.basename(src)} → ${path.relative(process.cwd(), dest)}`);
  const left = ep.clips.filter((c) => !fs.existsSync(path.join(epDir(s.slug, n), 'clips', `${c.id}.mp4`))).map((c) => c.id);
  console.log(left.length ? `Parte ${n}: faltan ${left.join(', ')}` : `Parte ${n} completa: node scripts/veo-assemble.mjs --ep ${n}`);
}

run(import.meta.url, main);
