#!/usr/bin/env node
// Revisión del MP4 terminado (no del render en memoria):
//   · hojas de contacto con cuadros extraídos del video: los primeros 3,5 s (gancho), el centro de cada
//     subtítulo con el texto esperado debajo, cada fundido y el cierre; la zona segura va marcada en cian
//   · sincronía: vuelve a transcribir el audio del MP4 con tiempos por palabra y lo compara con los
//     tiempos de los subtítulos (con --no-sync se salta; cuesta ≈ $0.006 por minuto)
//   · duración 60–120 s, primera palabra antes de 0,5 s y nada fuera de la zona segura
//
//   npm run review -- --ep 1
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import OpenAI, { toFile } from 'openai';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { parseCli, parseEpisodes, run } from './lib/cli.mjs';
import { MODELS, openaiKey, log } from './lib/env.mjs';
import { loadSeries, timelineFile, videoFile, readJson, writeJson, OUT_DIR } from './lib/series.mjs';
import { W, H, SAFE, buildCaptions } from './assemble.mjs';

const ff = (args) => new Promise((res, rej) => {
  const p = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  const out = []; let err = '';
  p.stdout.on('data', (d) => out.push(d)); p.stderr.on('data', (d) => { err += d; });
  p.on('error', rej); p.on('close', (c) => (c === 0 ? res(Buffer.concat(out)) : rej(new Error(`ffmpeg ${c}: ${err.slice(-400)}`))));
});
const frameAt = (video, t) => ff(['-ss', t.toFixed(3), '-i', video, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-']);

async function contactSheets(video, shots, prefix) {
  const cols = 5, rows = 4, tw = 216, th = 384, lab = 74, per = cols * rows, files = [];
  for (let p = 0; p * per < shots.length; p++) {
    const page = shots.slice(p * per, (p + 1) * per);
    const cv = createCanvas(cols * tw, Math.ceil(page.length / cols) * (th + lab)), ctx = cv.getContext('2d');
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < page.length; i++) {
      const s = page[i], x = (i % cols) * tw, y = Math.floor(i / cols) * (th + lab);
      ctx.drawImage(await loadImage(await frameAt(video, s.t)), x, y, tw, th);
      ctx.strokeStyle = '#00E5FF'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      ctx.strokeRect(x + SAFE.x0 * tw / W, y + SAFE.y0 * th / H, (SAFE.x1 - SAFE.x0) * tw / W, (SAFE.y1 - SAFE.y0) * th / H);
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.fillText(`${s.t.toFixed(2)} s · ${s.kind}`, x + 6, y + th + 20);
      ctx.fillStyle = '#FFE14D'; ctx.font = '14px sans-serif';
      const words = (s.expect || '').split(' '); let line = '', ly = y + th + 40;
      for (const w of words) { if (ctx.measureText(line + w).width > tw - 12) { ctx.fillText(line, x + 6, ly); ly += 17; line = ''; } line += w + ' '; }
      if (line.trim()) ctx.fillText(line, x + 6, ly);
    }
    const f = `${prefix}-${p + 1}.png`; fs.writeFileSync(f, cv.toBuffer('image/png')); files.push(f);
  }
  return files;
}

const norm = (w) => w.toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');

// Empareja las palabras oídas con las del guion en orden (con una ventana de búsqueda) y mide el desfase
function syncReport(expected, heard) {
  const deltas = []; let j = 0;
  for (const e of expected) {
    const k = norm(e.w); if (!k) continue;
    for (let look = j; look < Math.min(heard.length, j + 6); look++) {
      if (norm(heard[look].word) === k) { deltas.push({ w: e.w, d: heard[look].start - e.start }); j = look + 1; break; }
    }
  }
  const abs = deltas.map((x) => Math.abs(x.d)).sort((a, b) => a - b);
  const q = (p) => abs[Math.min(abs.length - 1, Math.floor(p * abs.length))] ?? null;
  return { matched: deltas.length, of: expected.length, median: q(0.5), p90: q(0.9), max: abs[abs.length - 1] ?? null, within150ms: abs.length ? abs.filter((a) => a <= 0.15).length / abs.length : 0, worst: deltas.sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 5) };
}

// Inicio real del sonido de cada línea (energía en episode.wav) contra el inicio de su primer subtítulo.
// Whisper suele equivocarse justo después de las pausas; esta medida no depende de él.
function onsetReport(wavFile, tl) {
  const pcm = fs.readFileSync(wavFile).subarray(44), R = 24000, n = pcm.length / 2;
  const loud = (i) => { let m = 0; for (let k = i; k < Math.min(n, i + 240); k++) m = Math.max(m, Math.abs(pcm.readInt16LE(k * 2))); return m > 650; };
  const d = tl.lines.map((l) => { let i = Math.max(0, Math.round((l.start - 0.15) * R)); while (i < n && !loud(i)) i += 120; return l.words[0].start - i / R; });
  const abs = d.map(Math.abs);
  return { lines: d.length, maxAbs: +Math.max(...abs).toFixed(3), mean: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(3) };
}

export async function reviewEpisode(series, n, { sync = true } = {}) {
  const video = videoFile(series.slug, n), tl = readJson(timelineFile(series.slug, n)), meta = readJson(video.replace(/\.mp4$/, '.json'));
  if (!fs.existsSync(video) || !tl) throw new Error(`Falta el video de la parte ${n}: ejecuta «npm run assemble -- --ep ${n}».`);
  const dir = path.join(OUT_DIR, series.slug, 'review'); fs.mkdirSync(dir, { recursive: true });
  const caps = buildCaptions(tl);
  const shots = [];
  for (const t of [0.05, 0.5, 1.0, 1.5, 2.0, 2.5, 2.95, 3.4]) shots.push({ t, kind: 'gancho', expect: caps.find((c) => t >= c.start && t < c.end)?.words.map((w) => w.text).join(' ') });
  for (const c of caps) { const t = (c.start + c.end) / 2; if (t > 3.4) shots.push({ t, kind: 'subtítulo', expect: c.words.map((w) => w.text).join(' ') }); }
  for (let i = 1; i < tl.scenes.length; i++) shots.push({ t: tl.scenes[i].start - 0.2, kind: `fundido ${tl.scenes[i].id}` });
  const close = tl.lines.find((l) => l.beat === 'cierre');
  if (close) shots.push({ t: close.start + 0.6, kind: 'cierre' }, { t: tl.duration - 0.1, kind: 'último cuadro' });
  shots.sort((a, b) => a.t - b.t);
  const sheets = await contactSheets(video, shots, path.join(dir, `parte-${n}-hoja`));

  const report = {
    episode: n, video: path.basename(video), duration: tl.duration, durationOk: tl.duration >= 60 && tl.duration <= 120,
    firstWordAt: tl.lines[0].words[0].start, hook: meta?.hook_text, safeZoneViolations: meta?.violations ?? null, captions: caps.length,
    captionWords: { min: Math.min(...caps.map((c) => c.words.length)), max: Math.max(...caps.map((c) => c.words.length)), singles: caps.filter((c) => c.words.length === 1).map((c) => c.words[0].text) },
    sheets: sheets.map((f) => path.relative(OUT_DIR, f))
  };
  report.onset = onsetReport(path.join(path.dirname(timelineFile(series.slug, n)), tl.audio), tl);
  if (sync) {
    if (!openaiKey()) throw new Error('Para la sincronía falta la clave de OpenAI (o usa --no-sync).');
    const wav = await ff(['-i', video, '-vn', '-ac', '1', '-ar', '16000', '-f', 'wav', '-']);
    const openai = new OpenAI({ apiKey: openaiKey() });
    const tr = await openai.audio.transcriptions.create({ file: await toFile(wav, 'episode.wav'), model: MODELS.transcribe, language: series.language === 'en' ? 'en' : 'es', response_format: 'verbose_json', timestamp_granularities: ['word'] });
    const expected = caps.flatMap((c) => c.words);
    report.sync = syncReport(expected, tr.words || []);
  }
  writeJson(path.join(dir, `parte-${n}-revision.json`), report);
  log(`Parte ${n}: ${tl.duration.toFixed(1)} s${report.durationOk ? '' : ' (FUERA de 60–120 s)'} · primera palabra a ${report.firstWordAt.toFixed(2)} s · ${caps.length} subtítulos de ${report.captionWords.min}–${report.captionWords.max} palabras · zona segura: ${report.safeZoneViolations?.length ? report.safeZoneViolations.length + ' problema/s' : 'OK'}\n`);
  log(`  inicio de cada línea vs. sonido real: desfase máx. ${(report.onset.maxAbs * 1000).toFixed(0)} ms (medio ${(report.onset.mean * 1000).toFixed(0)} ms)
`);
  if (report.sync) log(`  sincronía: ${report.sync.matched}/${report.sync.of} palabras emparejadas · mediana ${(report.sync.median * 1000).toFixed(0)} ms · p90 ${(report.sync.p90 * 1000).toFixed(0)} ms · ${(report.sync.within150ms * 100).toFixed(0)} % a ≤150 ms\n`);
  log(`  hojas: ${sheets.join(', ')}\n`);
  return report;
}

async function main() {
  const o = parseCli({ series: { type: 'string' }, ep: { type: 'string' }, sync: { type: 'boolean', default: true }, help: { type: 'boolean', short: 'h' } });
  if (o.help) { console.log('Uso: npm run review -- [--series <slug>] [--ep 1|all] [--no-sync]'); return; }
  const series = loadSeries(o.series);
  for (const n of parseEpisodes(o.ep, series.episodes.length)) await reviewEpisode(series, n, o);
}

run(import.meta.url, main);
