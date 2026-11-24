#!/usr/bin/env node
// Montaje de series en formato Veo: une los clips de cada parte (out/<serie>/epNN/clips/cNN.mp4, con su propio
// audio y diálogo) en 1080×1920 a 30 fps y les pone encima lo mismo que assemble: subtítulos de 2 a 4 palabras
// con la palabra activa en amarillo, «PARTE N», el gancho los primeros 3 s y la tarjeta final.
// Los tiempos de cada palabra salen de Whisper sobre cada clip (se guardan en cNN.words.json).
//
//   node scripts/veo-assemble.mjs --ep 1
//   node scripts/veo-assemble.mjs --ep all
//   node scripts/veo-assemble.mjs --ep 1 --still 2.5 --safe-overlay
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import OpenAI, { toFile } from 'openai';
import { createCanvas } from '@napi-rs/canvas';
import { parseCli, parseEpisodes, run } from './lib/cli.mjs';
import { MODELS, log, openaiKey } from './lib/env.mjs';
import { OUT_DIR, epDir, readJson, writeJson } from './lib/series.mjs';
import { W, H, FPS, SAFE, CX, LOOK, setupFonts, layoutWords, boxOf, drawRows, ease, buildCaptions, hashtagLine } from './assemble.mjs';
import { loadVeo } from './veo-prompts.mjs';

const END_CARD = 2.5; // segundos de tarjeta final sobre el último cuadro congelado
const HASHTAGS = ['minidrama', 'frutas', 'telenovela', 'drama', 'comedia', 'novela'];

const clipFile = (slug, n, id) => path.join(epDir(slug, n), 'clips', `${id}.mp4`);
const outFile = (slug, n) => path.join(OUT_DIR, slug, `${slug}-parte-${n}.mp4`);

function durationOf(file) {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr);
  if (!m) throw new Error(`No pude leer la duración de ${file}`);
  return +m[1] * 3600 + +m[2] * 60 + +m[3];
}

const tokens = (text) => text.trim().split(/\s+/).filter(Boolean);
const bareWord = (w) => w.toLocaleLowerCase('es').normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '');

const close = (a, b) => {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0; while (i < a.length && a[i] === b[i]) i++;
  return a.slice(i + (a.length >= b.length ? 1 : 0)) === b.slice(i + (b.length >= a.length ? 1 : 0)); // una letra de diferencia
};

// Veo a veces mete palabras de relleno entre las líneas del guion. Se busca cada palabra del guion, en orden,
// entre las que oyó Whisper; las que no aparecen toman un tiempo interpolado entre sus vecinas.
function alignScript(script, heard) {
  const out = []; let p = 0, matched = 0;
  for (const tok of script) {
    const b = bareWord(tok); let hit = -1;
    for (let j = p; j < Math.min(heard.length, p + 16); j++) if (close(b, bareWord(heard[j].word))) { hit = j; break; }
    if (hit >= 0) { out.push({ w: tok, start: heard[hit].start, end: heard[hit].end }); p = hit + 1; matched++; }
    else out.push({ w: tok, start: null, end: null });
  }
  if (matched < 0.6 * script.length) return null;
  for (let i = 0; i < out.length; i++) {
    if (out[i].start != null) continue;
    let k = i; while (k < out.length && out[k].start == null) k++;
    const from = i > 0 ? out[i - 1].end : (out[k]?.start ?? 0) - 0.3 * (k - i), to = k < out.length ? out[k].start : from + 0.3 * (k - i);
    const step = (to - from) / (k - i);
    for (let m = i; m < k; m++) { out[m].start = from + step * (m - i); out[m].end = from + step * (m - i + 1); }
  }
  return { words: out, matched };
}

// Palabras que de verdad se oyen en el clip. Si coinciden en número con el guion, se usa el texto del guion
// (con su puntuación y tildes) y los tiempos de Whisper; si no, el texto de Whisper.
async function wordsOf(openai, series, n, clip) {
  const file = clipFile(series.slug, n, clip.id), cache = file.replace(/\.mp4$/, '.words.json');
  let tr = readJson(cache);
  if (!tr) {
    if (!openai) throw new Error('Falta la clave de OpenAI (OPEN_AI en .env) para sacar los tiempos de los subtítulos.');
    tr = await openai.audio.transcriptions.create({
      file: await toFile(fs.readFileSync(file), path.basename(file)), model: MODELS.transcribe, language: series.lang,
      prompt: clip.dialogue.map((d) => d.line).join(' '), response_format: 'verbose_json', timestamp_granularities: ['word', 'segment']
    });
    tr = { text: tr.text, words: tr.words || [], segments: (tr.segments || []).map((s) => ({ start: s.start, end: s.end, text: s.text, no_speech_prob: s.no_speech_prob })) };
    writeJson(cache, tr);
  }
  // no_speech_prob no sirve aquí: con la música de fondo marca como «sin voz» diálogos reales
  const heard = tr.words;
  const script = clip.dialogue.flatMap((d) => tokens(d.line));
  const lineOf = clip.dialogue.flatMap((d, li) => tokens(d.line).map(() => li)); // a qué línea del diálogo va cada palabra
  if (heard.length === script.length) return { words: heard.map((w, i) => ({ w: script[i], li: lineOf[i], start: w.start, end: w.end })), source: 'guion' };
  const aligned = alignScript(script, heard);
  if (aligned) return { words: aligned.words.map((w, i) => ({ ...w, li: lineOf[i] })), source: `guion alineado (${aligned.matched}/${script.length} palabras oídas, ${heard.length - aligned.matched} de relleno fuera)` };
  // Puntuación tomada de los segmentos de Whisper cuando el número de palabras cuadra
  const out = [];
  for (const s of tr.segments) {
    const ws = heard.filter((w) => w.start >= s.start - 0.05 && w.start < s.end);
    const tk = tokens(s.text);
    ws.forEach((w, i) => out.push({ w: tk.length === ws.length ? tk[i] : w.word, start: w.start, end: w.end }));
  }
  const seen = new Set(out.map((w) => w.start));
  for (const w of heard) if (!seen.has(w.start)) out.push({ w: w.word, start: w.start, end: w.end });
  out.sort((a, b) => a.start - b.start);
  const same = out.filter((w, i) => bareWord(w.w) === bareWord(script[i] || '')).length;
  return { words: out, source: `whisper (${out.length} palabras, guion ${script.length}, ${same} iguales)` };
}

async function prepareVeo(series, n, { partial = false } = {}) {
  setupFonts();
  const full = series.episodes.find((e) => e.number === n);
  if (!full) throw new Error(`La serie no tiene la parte ${n}.`);
  const missing = full.clips.filter((c) => !fs.existsSync(clipFile(series.slug, n, c.id))).map((c) => c.id);
  if (missing.length && !partial) throw new Error(`Faltan clips de la parte ${n}: ${missing.join(', ')} (usa --partial para un borrador sin ellos)`);
  if (missing.length) log(`  borrador sin ${missing.join(', ')}\n`);
  const ep = { ...full, clips: full.clips.filter((c) => !missing.includes(c.id)) };
  const openai = openaiKey() ? new OpenAI({ apiKey: openaiKey() }) : null;

  // Línea de tiempo: un renglón por línea de diálogo (así un subtítulo nunca mezcla a dos personajes),
  // con los tiempos ya desplazados al inicio de su clip
  let at = 0; const clips = [], lines = [];
  for (const c of ep.clips) {
    const file = clipFile(series.slug, n, c.id), dur = durationOf(file);
    const { words, source } = await wordsOf(openai, series, n, c);
    log(`  ${c.id} ${dur.toFixed(2)} s · ${words.length} palabras (${source})\n`);
    const groups = new Map();
    for (const w of words) {
      const k = w.li ?? 0;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push({ w: w.w, start: at + w.start, end: at + Math.min(w.end, dur) });
    }
    for (const ws of groups.values()) lines.push({ beat: c.id, start: ws[0].start, end: ws[ws.length - 1].end, words: ws });
    clips.push({ id: c.id, file, start: at, dur });
    at += dur;
  }
  const duration = at + END_CARD;
  const captions = buildCaptions({ lines });

  const cv = createCanvas(W, H), ctx = cv.getContext('2d');
  const violations = [];
  const check = (what, b) => {
    const bad = [];
    if (b.x0 < SAFE.x0) bad.push('izq'); if (b.x1 > SAFE.x1) bad.push('der');
    if (b.y0 < SAFE.y0) bad.push('arriba'); if (b.y1 > SAFE.y1) bad.push('abajo');
    if (bad.length) violations.push(`${what}: ${bad.join(', ')}`);
  };
  const f = (weight, size) => `${weight} ${size}px Montserrat`;

  const P = LOOK.part;
  ctx.font = f(800, P.size);
  const partText = `PARTE ${n}`, pw = ctx.measureText(partText).width + P.padX * 2, ph = P.size + P.padY * 2;
  const part = { x0: CX - pw / 2, y0: P.top, w: pw, h: ph };
  check('Parte N', { x0: part.x0, x1: part.x0 + pw, y0: part.y0, y1: part.y0 + ph });

  const Hk = LOOK.hook;
  const hookL = layoutWords(ctx, tokens(ep.hook).map((w) => ({ text: w.toLocaleUpperCase('es') })), { size: Hk.size, min: Hk.min, stroke: Hk.stroke, maxLines: Hk.maxLines, lineGap: 1.1 });
  const hookY = part.y0 + ph + Hk.gapTop + hookL.asc + Hk.stroke / 2;
  check('Gancho', boxOf(hookL, hookY, Hk.stroke));

  const E = LOOK.end, last = n === series.episodes.length;
  const endBig = layoutWords(ctx, [{ text: last ? 'FIN' : `PARTE ${n + 1}` }], { size: E.big, min: 90, stroke: E.stroke, maxLines: 1 });
  const endSmall = layoutWords(ctx, (last ? 'SÍGUEME PARA MÁS' : 'EN MI PERFIL').split(' ').map((t) => ({ text: t })), { size: E.small, min: 48, stroke: E.stroke - 4, maxLines: 1 });
  const endY = E.y, endY2 = E.y + endBig.desc + 30 + endSmall.asc;
  check('Cierre', boxOf(endBig, endY, E.stroke)); check('Cierre', boxOf(endSmall, endY2, E.stroke - 4));

  const S = LOOK.sub;
  for (const c of captions) {
    c.L = layoutWords(ctx, c.words, { size: S.size, min: S.min, stroke: S.stroke, lineGap: S.lineGap });
    c.baseY = S.y - ((c.L.rows.length - 1) * c.L.lineH) / 2 + (c.L.asc - c.L.desc) / 2;
    check(`Subtítulo «${c.words.map((w) => w.text).join(' ')}»`, boxOf(c.L, c.baseY, S.stroke));
  }

  // Capa transparente que va encima del video
  function render(t, { safeOverlay = false } = {}) {
    ctx.clearRect(0, 0, W, H);
    const endOn = t >= at - 0.15;
    if (endOn) {
      const k = ease((t - at + 0.15) / 0.35);
      ctx.fillStyle = `rgba(0,0,0,${0.45 * k})`; ctx.fillRect(0, 0, W, H);
      drawRows(ctx, endBig, endY, { stroke: E.stroke, color: E.color, scale: 0.8 + 0.2 * k, alpha: k });
      drawRows(ctx, endSmall, endY2, { stroke: E.stroke - 4, color: '#FFFFFF', scale: 0.8 + 0.2 * k, alpha: k });
    }
    ctx.fillStyle = P.bg;
    ctx.beginPath(); ctx.roundRect(part.x0, part.y0, part.w, part.h, part.h / 2); ctx.fill();
    ctx.font = f(800, P.size); ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(partText, CX, part.y0 + part.h / 2 + 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (t < Hk.until + Hk.fade) {
      const a = t < Hk.until ? 1 : 1 - (t - Hk.until) / Hk.fade;
      drawRows(ctx, hookL, hookY, { stroke: Hk.stroke, color: '#FFFFFF', alpha: a, scale: 0.94 + 0.06 * ease(t / 0.18) });
    }
    if (!endOn) {
      const c = captions.find((x) => t >= x.start && t < x.end);
      if (c) {
        let active = -1; c.words.forEach((w, i) => { if (t >= w.start - 0.02) active = i; });
        drawRows(ctx, c.L, c.baseY, { stroke: S.stroke, color: S.color, active, activeColor: S.active, scale: 0.9 + 0.1 * ease((t - c.start) / 0.1) });
      }
    }
    if (safeOverlay) {
      ctx.save(); ctx.strokeStyle = '#00E5FF'; ctx.lineWidth = 4; ctx.setLineDash([18, 12]);
      ctx.strokeRect(SAFE.x0, SAFE.y0, SAFE.x1 - SAFE.x0, SAFE.y1 - SAFE.y0); ctx.restore();
    }
    return cv;
  }
  return { ep, clips, captions, duration, violations, render };
}

export async function assembleVeo(series, n, { crf = '19', still, safeOverlay = false, allowUnsafe = false, partial = false } = {}) {
  const R = await prepareVeo(series, n, { partial });
  if (R.violations.length) {
    const msg = `Texto fuera de la zona segura en la parte ${n}:\n  ${R.violations.join('\n  ')}`;
    if (!allowUnsafe) throw new Error(msg);
    log(`AVISO: ${msg}\n`);
  }
  const out = outFile(series.slug, n);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (still != null) {
    const png = out.replace(/\.mp4$/, `-${still}s.png`);
    const clip = R.clips.findLast((c) => c.start <= +still) || R.clips[0];
    const bg = png.replace(/\.png$/, '-bg.png');
    spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(Math.min(+still - clip.start, clip.dur - 0.05)), '-i', clip.file, '-frames:v', '1', '-vf', `scale=${W}:${H}`, bg]);
    const ov = png.replace(/\.png$/, '-ov.png');
    fs.writeFileSync(ov, R.render(+still, { safeOverlay }).toBuffer('image/png'));
    spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', bg, '-i', ov, '-filter_complex', 'overlay', png]);
    fs.rmSync(bg); fs.rmSync(ov);
    log(`PNG: ${png}\n`);
    return { png };
  }

  const frames = Math.ceil(R.duration * FPS), k = R.clips.length;
  log(`Parte ${n}: ${R.duration.toFixed(1)} s · ${k} clips · ${R.captions.length} subtítulos\n`);
  const norm = 'loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000';
  const filter =
    R.clips.map((_, i) => `[${i}:v]scale=${W}:${H}:flags=lanczos,fps=${FPS},setsar=1,format=yuv420p[v${i}];[${i}:a]aresample=48000,aformat=channel_layouts=stereo[a${i}]`).join(';') + ';' +
    R.clips.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${k}:v=1:a=1[cv][ca];` +
    `[cv]tpad=stop_mode=clone:stop_duration=${END_CARD}[pv];[pv][${k}:v]overlay=format=auto,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v];` +
    `[ca]apad=pad_dur=${END_CARD},afade=t=out:st=${(R.duration - 1.2).toFixed(2)}:d=1.2,${norm}[a]`;
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    ...R.clips.flatMap((c) => ['-i', c.file]),
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'pipe:0',
    '-filter_complex', filter, '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-profile:v', 'high', '-level:v', '4.2',
    '-g', String(FPS * 2), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-t', R.duration.toFixed(3), '-movflags', '+faststart', out
  ];
  const ff = spawn(ffmpegPath, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let errText = '';
  ff.stderr.on('data', (d) => { errText += d; });
  const done = new Promise((res, rej) => {
    ff.on('error', rej);
    ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg terminó con código ${code}: ${errText.trim().slice(-800)}`))));
  });
  ff.stdin.on('error', () => { /* el error real llega por 'close' */ });
  const t0 = Date.now(); let lastPct = -1;
  for (let i = 0; i < frames; i++) {
    const cv = R.render(i / FPS);
    if (!ff.stdin.write(Buffer.from(cv.data()))) await new Promise((r) => ff.stdin.once('drain', r));
    const pct = Math.floor((100 * (i + 1)) / frames);
    if (pct !== lastPct && pct % 5 === 0) { lastPct = pct; log(`\r  ${pct}% · cuadro ${i + 1}/${frames}`); }
  }
  ff.stdin.end();
  await done;
  log(`\n  listo en ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);

  // Datos para publish (descripción con hashtags y aviso de ficción hecha con IA)
  const ep = R.ep;
  const description = `${series.title} 🍓🍌 Parte ${n}: «${ep.title}»${n === 1 ? `\n${series.logline}` : ''}`;
  const text = `${description}\nFicción · hecho con IA\n\n${hashtagLine(HASHTAGS)}`.slice(0, 2200);
  const sidecar = out.replace(/\.mp4$/, '.json');
  const prev = readJson(sidecar, {});
  writeJson(sidecar, {
    file: path.basename(out), series: series.slug, seriesTitle: series.title, episode: n, title: ep.title, lang: series.lang, format: 'veo',
    duration: R.duration, fps: FPS, width: W, height: H, clips: R.clips.map((c) => ({ id: c.id, start: c.start, dur: c.dur })), ai_generated: true,
    hook_text: ep.hook, safe_zone: SAFE, violations: R.violations,
    post: { text, description, hashtags: HASHTAGS, source: 'Veo (Gemini) + ChatGPT Images' },
    ...(prev.tiktok ? { tiktok: prev.tiktok } : {}),
    createdAt: new Date().toISOString()
  });
  log(`MP4: ${out}\nDatos: ${sidecar}\n`);
  return { out, sidecar };
}

async function main() {
  const o = parseCli({
    series: { type: 'string', default: 'la-boda-del-platano' }, ep: { type: 'string' }, crf: { type: 'string', default: '19' },
    still: { type: 'string' }, 'safe-overlay': { type: 'boolean', default: false }, 'allow-unsafe': { type: 'boolean', default: false },
    partial: { type: 'boolean', default: false }
  });
  const series = loadVeo(o.series);
  for (const n of parseEpisodes(o.ep, series.episodes.length)) {
    await assembleVeo(series, n, { crf: o.crf, still: o.still, safeOverlay: o['safe-overlay'], allowUnsafe: o['allow-unsafe'], partial: o.partial });
  }
}

run(import.meta.url, main);
