#!/usr/bin/env node
// Render determinista de CirculArte: dibuja cuadro por cuadro con el mismo motor que la web
// (src/engine.js) y lo codifica con ffmpeg a MP4 H.264 listo para TikTok.
//
//   npm run render -- --preset Violín --lang en
//   npm run render -- --random spiro --seed 42 --labels top
//   npm run render -- --text "te amo" --font cursiva --caption "Espera el final 😳"
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parseCli } from './lib/cli.mjs';
import { pathToFileURL } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { createCanvas } from '@napi-rs/canvas';
import * as E from '../src/engine.js';
import { setupNode, ROOT } from './lib/node-env.mjs';
import { resolveSource, slug, hashSeed } from './lib/catalog.mjs';

const HELP = `Uso: npm run render -- (--preset <nombre> | --random <tipo> | --text <texto>) [opciones]

Figura
  --preset <nombre>     Un preset de la web (Corazón, Violín, Elefante, Espirógrafo…; también en inglés)
  --random <tipo>       Función inventada: any, ${E.INVENT_TYPES.join(', ')}
  --seed <n>            Semilla para --random y para elegir el texto gancho (mismo seed = mismo video)
  --text <texto>        Texto, símbolo o emoji
  --font <letra>        cursiva | elegante | bloque | clasica | emoji (con --text; por defecto cursiva)

Video
  --lang es|en          Idioma del texto gancho y del nombre del archivo (por defecto es)
  --caption <texto>     Texto superior del video; "auto" (por defecto) elige un gancho, "none" lo quita
  --labels full|n|top   Rótulos mientras dibuja: N y error | solo N | fórmulas arriba (por defecto full)
  --style xy|z          Dos cadenas x,y o una cadena compleja (por defecto xy)
  --fps 30|60           Cuadros por segundo (por defecto 30)
  --format 9:16|1:1|16:9  (por defecto 9:16)    --quality 1080|720 (por defecto 1080)
  --rev <s>             Segundos por vuelta (por defecto 3)
  --nseq "1, 3, 6…"     Términos N por etapa
  --accent <#hex>       Color del trazo (por defecto #ff7a52)
  --guide <0-60>        Opacidad (%) de la imagen guía mientras dibuja (por defecto 18; 0 la oculta)
  --no-safe-zone        Sin zona segura de TikTok (en 9:16 viene activada: nada importante bajo los controles de la app)
  --caption-wrap        Si el texto gancho no cabe, lo parte en dos líneas en vez de achicarlo
  --post "texto"         Descripción del post (se guarda en el .json; si no, la escribe caption/daily)
  --no-reveal --no-formulas --no-signature
  --out <archivo.mp4>   Por defecto out/circularte-<figura>-<lang>.mp4 (más un .json con los datos)
  --still <segundos>    En vez de video, guarda un PNG de ese instante (para revisar el encuadre)`;

const OPTIONS = {
  preset: { type: 'string' }, random: { type: 'string' }, text: { type: 'string' }, font: { type: 'string', default: 'cursiva' },
  seed: { type: 'string' }, lang: { type: 'string', default: 'es' }, caption: { type: 'string', default: 'auto' },
  labels: { type: 'string', default: 'full' }, style: { type: 'string', default: 'xy' },
  fps: { type: 'string', default: '30' }, format: { type: 'string', default: '9:16' }, quality: { type: 'string', default: '1080' },
  rev: { type: 'string' }, nseq: { type: 'string' }, accent: { type: 'string' }, guide: { type: 'string' }, post: { type: 'string' }, 'caption-wrap': { type: 'boolean', default: false }, 'safe-zone': { type: 'boolean', default: true },
  reveal: { type: 'boolean', default: true }, formulas: { type: 'boolean', default: true }, signature: { type: 'boolean', default: true },
  out: { type: 'string' }, still: { type: 'string' }, crf: { type: 'string', default: '18' }, quiet: { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false }
};

const oneOf = (v, opts, name) => { if (!opts.includes(v)) throw new Error(`--${name} debe ser ${opts.join(' | ')} (recibí «${v}»)`); return v; };

// Elige el texto gancho de forma estable según la figura y la semilla
export function autoCaption(name, lang, seed = 0) {
  const list = lang === 'en' ? E.CAPTIONS_EN : E.CAPTIONS;
  return list[hashSeed(`${name}|${seed}`) % list.length].replace('{x}', name);
}

export async function renderVideo(o) {
  const fx = setupNode();
  const lang = oneOf(o.lang || 'es', ['es', 'en'], 'lang');
  const seed = o.seed != null && o.seed !== '' ? Number(o.seed) >>> 0 : undefined;
  const { src, info } = resolveSource({ preset: o.preset, random: o.random, text: o.text, font: o.font, seed });
  if (info.emoji && !fx.emoji) throw new Error('Esta figura usa un emoji y no hay fuente de emoji. Ejecuta «npm run fonts» (descarga Noto Color Emoji) o elige otra figura.');
  const title = lang === 'en' ? info.nameEn : info.name;

  const settings = {
    ...E.DEFAULT_SETTINGS,
    style: oneOf(o.style || 'xy', ['xy', 'z'], 'style'), labels: oneOf(o.labels || 'full', ['full', 'n', 'top'], 'labels'),
    format: oneOf(o.format || '9:16', ['9:16', '1:1', '16:9'], 'format'), quality: +oneOf(String(o.quality || 1080), ['1080', '720'], 'quality'),
    reveal: o.reveal !== false, formulas: o.formulas !== false, signature: o.signature !== false
  };
  if (o.rev) settings.rev = Math.min(8, Math.max(1, +o.rev));
  if (o.nseq) settings.nseq = o.nseq;
  if (o.accent) settings.accent = o.accent;
  if (o['caption-wrap'] || o.captionWrap) settings.captionWrap = true;
  settings.safeZone = o['safe-zone'] !== false && o.safeZone !== false;
  if (o.guide != null && o.guide !== '') settings.guide = Math.min(60, Math.max(0, +o.guide));
  const cap = o.caption ?? 'auto';
  settings.caption = cap === 'none' ? '' : cap === 'auto' ? autoCaption(title, lang, seed ?? 0) : cap;

  const view = E.canvasSize(settings.format, settings.quality);
  const { shape, meta } = await E.shapeFor(src, settings.accent);
  const S = E.buildScene(shape, meta);
  E.refreshStages(S, settings); E.relayout(S, settings, view);
  const cv = createCanvas(view.W, view.H), ctx = cv.getContext('2d');
  const R = { ctx, S, settings, view };
  const T = E.timeline(S, settings);
  const fps = +oneOf(String(o.fps || 30), ['24', '25', '30', '50', '60'], 'fps');
  const log = o.quiet ? () => {} : (m) => process.stderr.write(m);

  const base = `circularte-${slug(title)}-${lang}`;
  if (o.still != null) {
    const out = path.resolve(o.out || path.join(ROOT, 'out', `${base}-${o.still}s.png`));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    E.render(R, E.stateAt(T, Math.min(+o.still, T.total)));
    fs.writeFileSync(out, cv.toBuffer('image/png'));
    log(`PNG: ${out}\n`);
    return { out, info, settings };
  }

  const out = path.resolve(o.out || path.join(ROOT, 'out', `${base}.mp4`));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const frames = Math.ceil(T.total * fps), dur = frames / fps;
  log(`${info.name} · ${S.parts} curva(s) · N hasta ${S.stages[S.stages.length - 1]} · ${dur.toFixed(1)} s · ${view.W}x${view.H} @ ${fps} fps\n`);
  log(`Texto gancho: ${settings.caption || '(ninguno)'} · emoji: ${fx.emoji || 'no disponible'}\n`);

  // H.264 High 4.2 + yuv420p bt709 + audio AAC silencioso: lo que TikTok, Reels y Shorts aceptan sin recodificar raro
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${view.W}x${view.H}`, '-r', String(fps), '-i', 'pipe:0',
    '-f', 'lavfi', '-t', dur.toFixed(3), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-map', '0:v', '-map', '1:a',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(o.crf || 18), '-profile:v', 'high', '-level:v', '4.2',
    '-g', String(fps * 2), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out
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
  for (let i = 0; i < frames; i++) {
    E.render(R, E.stateAt(T, Math.min(i / fps, T.total)));
    if (!ff.stdin.write(Buffer.from(cv.data()))) await new Promise((r) => ff.stdin.once('drain', r));
    const pct = Math.floor(100 * (i + 1) / frames);
    if (pct !== lastPct && pct % 5 === 0) { lastPct = pct; log(`\r  ${pct}% · cuadro ${i + 1}/${frames}`); }
  }
  ff.stdin.end();
  await done;
  log(`\n  listo en ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);

  const sidecar = out.replace(/\.mp4$/i, '') + '.json';
  const data = {
    file: path.basename(out), lang, title, caption: settings.caption, duration: +dur.toFixed(3), fps, width: view.W, height: view.H,
    style: settings.style, labels: settings.labels, accent: settings.accent, rev: settings.rev, guide: settings.guide, terms: S.stages, ...info, createdAt: new Date().toISOString()
  };
  // Descripción escrita a mano: publish la usa tal cual (y caption/daily no la necesitan)
  if (o.post) data.post = { text: String(o.post).slice(0, 2200), source: 'manual', lang };
  fs.writeFileSync(sidecar, JSON.stringify(data, null, 2) + '\n');
  log(`MP4: ${out}\nDatos: ${sidecar}\n`);
  return { out, sidecar, info: data, settings };
}

async function main() {
  const values = parseCli(OPTIONS);
  if (values.help) { console.log(HELP); return; }
  await renderVideo(values);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`\nError: ${e.message}`); process.exit(1); });
}
