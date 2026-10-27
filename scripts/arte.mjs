#!/usr/bin/env node
// Render de los nombres con hilos o anillos (src/nombres-arte.js), con una melodía de dominio público.
// Mismo formato que bounce.mjs: MP4 H.264 1080×1920 con audio AAC, más un .json con los datos.
//
//   node scripts/arte.mjs --mode hilos --text Andrea --seed 3
//   node scripts/arte.mjs --mode anillos --text "Ana\n&\nLuis" --still 12
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { createCanvas } from '@napi-rs/canvas';
import { parseCli } from './lib/cli.mjs';
import { setupNode, ROOT } from './lib/node-env.mjs';
import { slug } from './lib/catalog.mjs';
import { wavBuffer } from './bounce.mjs';
import { canvasSize } from '../src/engine.js';
import { synthAudio } from '../src/bounce.js';
import { buildArte, drawArte, styleHook, ARTE_MODES, NAME_STYLE_NAMES } from '../src/nombres-arte.js';
import { MELODIAS } from '../src/melodias.js';

const SR = 44100;

export async function renderArte(o) {
  const fx = setupNode();
  const mode = o.mode || 'hilos';
  if (!ARTE_MODES.includes(mode)) throw new Error(`--mode debe ser ${ARTE_MODES.join(' | ')}`);
  if (!o.text) throw new Error('Falta --text');
  const text = String(o.text).replace(/\\n/g, '\n'), font = o.font || 'cursiva';
  const lang = o.lang === 'en' ? 'en' : 'es', seed = o.seed != null && o.seed !== '' ? Number(o.seed) >>> 0 : (Date.now() >>> 0);
  const fps = +(o.fps || 30), log = o.quiet ? () => {} : (m) => process.stderr.write(m);
  const view = canvasSize('9:16', +(o.quality || 1080));
  const pair = o.pair === true || /\n&\n/.test(text);
  const run = await buildArte({ mode, text, font, seed, melody: o.melody, pair });
  const caption = o.caption === 'none' ? '' : o.caption && o.caption !== 'auto' ? o.caption : styleHook(mode, lang, seed, pair);
  const name = o.name || text.replace(/\n/g, ' ');
  const cv = createCanvas(view.W, view.H), ctx = cv.getContext('2d');
  const draw = (t) => drawArte(ctx, run, t, view, { caption, lang, fallback: fx.emoji ? `, "${fx.emoji}"` : '' });
  const base = `circularte-${slug(name)}-${mode}-${lang}`;

  if (o.still != null) {
    const out = path.resolve(o.out || path.join(ROOT, 'out', `${base}-${o.still}s.png`));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    draw(Math.min(+o.still, run.total)); fs.writeFileSync(out, cv.toBuffer('image/png'));
    log(`PNG: ${out}\n`);
    return { out, run };
  }

  const out = path.resolve(o.out || path.join(ROOT, 'out', `${base}.mp4`));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const frames = Math.ceil(run.total * fps), dur = frames / fps;
  const wav = path.join(os.tmpdir(), `circularte-${process.pid}-${Date.now()}.wav`);
  fs.writeFileSync(wav, wavBuffer(synthAudio(run, SR)));
  log(`${name} · ${NAME_STYLE_NAMES[mode][0]} · semilla ${seed} · ${run.events.length} notas (${MELODIAS[run.melody].es}) · ${dur.toFixed(1)} s\nTexto gancho: ${caption || '(ninguno)'}\n`);

  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${view.W}x${view.H}`, '-r', String(fps), '-i', 'pipe:0',
    '-i', wav, '-map', '0:v', '-map', '1:a',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(o.crf || 18), '-profile:v', 'high', '-level:v', '4.2',
    '-g', String(fps * 2), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '160k', '-t', dur.toFixed(3), '-movflags', '+faststart', out
  ];
  const ff = spawn(ffmpegPath, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let errText = '';
  ff.stderr.on('data', (d) => { errText += d; });
  const done = new Promise((res, rej) => {
    ff.on('error', rej);
    ff.on('close', (code) => code === 0 ? res() : rej(new Error(`ffmpeg terminó con código ${code}: ${errText.trim().slice(-800)}`)));
  });
  ff.stdin.on('error', () => { /* el error real llega por 'close' */ });
  const t0 = Date.now(); let lastPct = -1;
  try {
    for (let i = 0; i < frames; i++) {
      draw(i / fps);
      if (!ff.stdin.write(Buffer.from(cv.data()))) await new Promise((r) => ff.stdin.once('drain', r));
      const pct = Math.floor(100 * (i + 1) / frames);
      if (pct !== lastPct && pct % 10 === 0) { lastPct = pct; log(`  ${pct}% · cuadro ${i + 1}/${frames}\n`); }
    }
    ff.stdin.end();
    await done;
  } finally { fs.rmSync(wav, { force: true }); }
  log(`  listo en ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);

  const sidecar = out.replace(/\.mp4$/i, '') + '.json';
  const info = {
    file: path.basename(out), kind: 'text', style: mode, id: o.id || `text:${text}`, seed, lang, title: name, name, nameEn: o.nameEn || name,
    text, font, caption, duration: +dur.toFixed(3), fps, width: view.W, height: view.H, notes: run.events.length, melody: run.melody,
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(sidecar, JSON.stringify(info, null, 2) + '\n');
  log(`MP4: ${out}\nDatos: ${sidecar}\n`);
  return { out, sidecar, info };
}

async function main() {
  const o = parseCli({
    mode: { type: 'string', default: 'hilos' }, text: { type: 'string' }, font: { type: 'string', default: 'cursiva' }, name: { type: 'string' },
    seed: { type: 'string' }, lang: { type: 'string', default: 'es' }, caption: { type: 'string', default: 'auto' }, melody: { type: 'string' },
    fps: { type: 'string', default: '30' }, quality: { type: 'string', default: '1080' }, still: { type: 'string' }, out: { type: 'string' },
    crf: { type: 'string', default: '18' }, quiet: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h', default: false }
  });
  if (o.help) { console.log(`Uso: node scripts/arte.mjs --mode ${ARTE_MODES.join('|')} --text "Andrea" [--font cursiva|bloque|elegante] [--seed n] [--lang es|en] [--melody id] [--still s] [--out archivo.mp4]`); return; }
  await renderArte(o);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`\nError: ${e.message}`); process.exit(1); });
}
