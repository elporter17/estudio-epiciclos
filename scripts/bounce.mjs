#!/usr/bin/env node
// Render de los videos de física (src/fisica.js: pelotas en el círculo y juegos), con una nota por rebote.
// Mismo formato que render.mjs: MP4 H.264 1080×1920 con audio AAC, más un .json con los datos.
//
//   node scripts/bounce.mjs --mode crece --seed 7
//   node scripts/bounce.mjs --mode escape --lang en --still 12
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { createCanvas } from '@napi-rs/canvas';
import { parseCli } from './lib/cli.mjs';
import { setupNode, ROOT } from './lib/node-env.mjs';
import { canvasSize } from '../src/engine.js';
import { simulateFisica, synthAudio, drawFisica, fisicaHook, fisicaGroup, FISICA_MODES, FISICA_NAMES, MELODIAS, MELODIA_IDS } from '../src/fisica.js';

const SR = 44100;

// PCM de 16 bits, mono
export function wavBuffer(samples, sr = SR) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return b;
}

export async function renderBounce(o) {
  const fx = setupNode();
  const mode = o.mode || 'crece';
  if (!FISICA_MODES.includes(mode)) throw new Error(`--mode debe ser ${FISICA_MODES.join(' | ')}`);
  const lang = o.lang === 'en' ? 'en' : 'es', seed = o.seed != null && o.seed !== '' ? Number(o.seed) >>> 0 : (Date.now() >>> 0);
  const fps = +(o.fps || 30), log = o.quiet ? () => {} : (m) => process.stderr.write(m);
  const view = canvasSize('9:16', +(o.quality || 1080));
  if (o.melody && o.melody !== 'none' && !MELODIAS[o.melody]) throw new Error(`--melody debe ser none | ${MELODIA_IDS.join(' | ')}`);
  const run = simulateFisica({ mode, seed, melody: o.melody || undefined });
  const caption = o.caption === 'none' ? '' : o.caption && o.caption !== 'auto' ? o.caption : fisicaHook(run, lang);
  const [nameEs, nameEn] = FISICA_NAMES[mode], title = lang === 'en' ? nameEn : nameEs;
  const cv = createCanvas(view.W, view.H), ctx = cv.getContext('2d');
  const draw = (t) => drawFisica(ctx, run, t, view, { caption, lang, fallback: fx.emoji ? `, "${fx.emoji}"` : '', emojiFont: fx.emoji ? `"${fx.emoji}"` : undefined });
  const base = `circularte-${fisicaGroup(mode)}-${mode}-${lang}`;

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
  // --mute: pista de audio en silencio (para ponerle en TikTok una canción del momento)
  const wav = o.mute ? null : path.join(os.tmpdir(), `circularte-${process.pid}-${Date.now()}.wav`);
  if (wav) fs.writeFileSync(wav, wavBuffer(synthAudio(run, SR)));
  log(`${title} · semilla ${seed} · ${run.events.length} notas${run.melody ? ` (${MELODIAS[run.melody].es})` : ''} · ${dur.toFixed(1)} s · ${view.W}x${view.H} @ ${fps} fps\nTexto gancho: ${caption || '(ninguno)'}\n`);

  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${view.W}x${view.H}`, '-r', String(fps), '-i', 'pipe:0',
    ...(wav ? ['-i', wav] : ['-f', 'lavfi', '-t', dur.toFixed(3), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100']), '-map', '0:v', '-map', '1:a',
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
  } finally { if (wav) fs.rmSync(wav, { force: true }); }
  log(`  listo en ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);

  const sidecar = out.replace(/\.mp4$/i, '') + '.json';
  const last = run.frames.at(-1);
  const info = {
    file: path.basename(out), kind: 'bounce', id: `${fisicaGroup(mode)}:${mode}`, mode, seed, lang, title, name: nameEs, nameEn,
    group: fisicaGroup(mode) === 'juegos' ? 'Juegos' : 'Pelotas', caption, duration: +dur.toFixed(3), fps, width: view.W, height: view.H,
    bounces: last.bounces, balls: last.alive, escaped: last.escaped, notes: run.events.length, melody: o.mute ? null : run.melody || null, sound: !o.mute, createdAt: new Date().toISOString()
  };
  fs.writeFileSync(sidecar, JSON.stringify(info, null, 2) + '\n');
  log(`MP4: ${out}\nDatos: ${sidecar}\n`);
  return { out, sidecar, info };
}

async function main() {
  const o = parseCli({
    mode: { type: 'string', default: 'crece' }, seed: { type: 'string' }, lang: { type: 'string', default: 'es' },
    caption: { type: 'string', default: 'auto' }, fps: { type: 'string', default: '30' }, quality: { type: 'string', default: '1080' },
    melody: { type: 'string' }, still: { type: 'string' }, out: { type: 'string' }, crf: { type: 'string', default: '18' }, mute: { type: 'boolean', default: false }, quiet: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false }
  });
  if (o.help) { console.log(`Uso: node scripts/bounce.mjs --mode ${FISICA_MODES.join('|')} [--seed n] [--lang es|en] [--caption auto|none|"texto"] [--melody none|${MELODIA_IDS.join('|')}] [--still s] [--out archivo.mp4]`); return; }
  await renderBounce(o);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`\nError: ${e.message}`); process.exit(1); });
}
