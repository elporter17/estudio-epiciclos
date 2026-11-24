#!/usr/bin/env node
// Paso 2 · voz. Narra cada línea con el TTS de OpenAI (PCM 24 kHz), recorta silencios, saca los tiempos de
// cada palabra con la transcripción de OpenAI y arma la pista del episodio con su línea de tiempo.
//
//   npm run voice -- --ep 1          (por defecto todos; las líneas ya hechas no se vuelven a pedir)
//   npm run voice -- --ep 1 --force  (regenera todas)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import OpenAI, { toFile } from 'openai';
import { parseCli, parseEpisodes, pool, run } from './lib/cli.mjs';
import { MODELS, openaiKey, log } from './lib/env.mjs';
import { loadSeries, episode, speakerOf, audioDir, timelineFile, writeJson, readJson, wordsOf } from './lib/series.mjs';

export const RATE = 24000; // PCM s16le mono que entrega el TTS
const GAP = { line: 0.22, scene: 0.42, beforeClose: 0.7, lead: 0.08, tail: 1.6 };

const wavHeader = (bytes) => {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + bytes, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(bytes, 40);
  return h;
};
export const writeWav = (file, pcm) => fs.writeFileSync(file, Buffer.concat([wavHeader(pcm.length), pcm]));
const readPcm = (file) => fs.readFileSync(file).subarray(44);

// Quita el silencio de los extremos (umbral −40 dBFS) y deja 40 ms de margen
function trimSilence(pcm) {
  const n = pcm.length / 2, thr = 328, win = Math.round(RATE * 0.01), margin = Math.round(RATE * 0.04);
  const loud = (i) => { let m = 0; for (let k = i; k < Math.min(n, i + win); k++) m = Math.max(m, Math.abs(pcm.readInt16LE(k * 2))); return m > thr; };
  let a = 0; while (a < n && !loud(a)) a += win;
  let b = n - win; while (b > a && !loud(b)) b -= win;
  a = Math.max(0, a - margin); b = Math.min(n, b + win + margin);
  return pcm.subarray(a * 2, b * 2);
}

// Tiempos de la transcripción → palabras del guion. Si coinciden en número se usan tal cual;
// si no, se reparten por longitud dentro del tramo hablado.
export function alignWords(text, heard, dur) {
  const words = wordsOf(text);
  if (heard?.length === words.length) return words.map((w, i) => ({ w, start: heard[i].start, end: heard[i].end }));
  const t0 = heard?.length ? heard[0].start : 0, t1 = heard?.length ? heard[heard.length - 1].end : dur;
  const weights = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1), total = weights.reduce((a, b) => a + b, 0);
  let t = t0;
  return words.map((w, i) => { const d = (t1 - t0) * weights[i] / total; const r = { w, start: t, end: t + d }; t += d; return r; });
}

const lineKey = (sp, text) => crypto.createHash('sha1').update([MODELS.tts, sp.voice, sp.instructions, text].join('|')).digest('hex').slice(0, 12);

async function voiceLine(openai, series, line, file) {
  const sp = speakerOf(series, line.speaker);
  const lang = series.language === 'en' ? 'English' : 'español latinoamericano neutro';
  const res = await openai.audio.speech.create({
    model: MODELS.tts, voice: sp.voice, input: line.text, response_format: 'pcm',
    instructions: `Idioma: ${lang}. ${sp.instructions} ${line.delivery || ''} Es una miniserie dramática para redes: ritmo ágil, sin pausas largas.`.trim()
  });
  const pcm = trimSilence(Buffer.from(await res.arrayBuffer()));
  writeWav(file, pcm);
  const tr = await openai.audio.transcriptions.create({
    file: await toFile(fs.readFileSync(file), path.basename(file)), model: MODELS.transcribe,
    language: series.language === 'en' ? 'en' : 'es', response_format: 'verbose_json', timestamp_granularities: ['word']
  });
  return { dur: pcm.length / 2 / RATE, heard: (tr.words || []).map((w) => ({ w: w.word, start: w.start, end: w.end })) };
}

export async function voiceEpisode(series, n, { force = false, concurrency = 4 } = {}) {
  if (!openaiKey()) throw new Error('Falta la clave de OpenAI (OPEN_AI u OPENAI_API_KEY en .env).');
  const openai = new OpenAI({ apiKey: openaiKey() });
  const ep = episode(series, n), dir = audioDir(series.slug, n);
  fs.mkdirSync(dir, { recursive: true });
  const cacheFile = path.join(dir, 'lines.json'), cache = force ? {} : readJson(cacheFile, {});
  const items = ep.scenes.flatMap((s) => s.lines.map((l, i) => ({ scene: s.id, i, line: l, key: lineKey(speakerOf(series, l.speaker), l.text), name: `${s.id}-${i + 1}.wav`, file: path.join(dir, `${s.id}-${i + 1}.wav`) })));
  let made = 0;
  await pool(items, concurrency, async (it) => {
    if (cache[it.name]?.key === it.key && fs.existsSync(it.file)) return;
    const r = await voiceLine(openai, series, it.line, it.file);
    cache[it.name] = { key: it.key, ...r }; made++;
    log(`  ${it.scene}-${it.i + 1} ${r.dur.toFixed(2)} s · ${it.line.text.slice(0, 50)}\n`);
  });
  // Pistas de líneas que ya no existen en el guion (p. ej. tras --tighten)
  const keep = new Set(items.map((it) => it.name));
  for (const f of fs.readdirSync(dir)) if (/^s\d+-\d+\.wav$/.test(f) && !keep.has(f)) { fs.rmSync(path.join(dir, f)); delete cache[f]; }
  writeJson(cacheFile, cache);

  // Línea de tiempo: pausas cortas entre líneas, algo más entre escenas y antes del cierre
  const silence = (s) => Buffer.alloc(Math.round(s * RATE) * 2);
  const chunks = [silence(GAP.lead)]; let t = GAP.lead;
  const lines = [], scenes = [];
  ep.scenes.forEach((s, si) => {
    if (si > 0) { const g = s.beat === 'cierre' ? GAP.beforeClose : GAP.scene; chunks.push(silence(g)); t += g; }
    const sceneStart = t;
    s.lines.forEach((l, i) => {
      if (i > 0) { chunks.push(silence(GAP.line)); t += GAP.line; }
      const it = items.find((x) => x.scene === s.id && x.i === i), c = cache[it.name];
      const pcm = readPcm(it.file); chunks.push(pcm);
      const dur = pcm.length / 2 / RATE;
      lines.push({ scene: s.id, beat: s.beat, speaker: l.speaker, text: l.text, start: +t.toFixed(3), end: +(t + dur).toFixed(3), words: alignWords(l.text, c.heard, dur).map((w) => ({ w: w.w, start: +(t + w.start).toFixed(3), end: +(t + w.end).toFixed(3) })) });
      t += dur;
    });
    scenes.push({ id: s.id, beat: s.beat, start: +sceneStart.toFixed(3), end: +t.toFixed(3) });
  });
  chunks.push(silence(GAP.tail)); t += GAP.tail;
  const wav = path.join(dir, 'episode.wav');
  writeWav(wav, Buffer.concat(chunks));
  const timeline = { series: series.slug, episode: n, duration: +t.toFixed(3), audio: path.basename(wav), voiceModel: MODELS.tts, scenes, lines };
  writeJson(timelineFile(series.slug, n), timeline);
  log(`Parte ${n}: ${t.toFixed(1)} s de audio (${made} línea/s nuevas)${t < 60 || t > 120 ? ` · OJO: fuera de 60–120 s${t > 120 ? ` (acórtalo con «npm run script -- --ep ${n} --tighten» y repite la voz)` : ''}` : ''}\n`);
  return timeline;
}

async function main() {
  const o = parseCli({ series: { type: 'string' }, ep: { type: 'string' }, force: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' } });
  if (o.help) { console.log('Uso: npm run voice -- [--series <slug>] [--ep 1|1,3|all] [--force]'); return; }
  const series = loadSeries(o.series);
  for (const n of parseEpisodes(o.ep, series.episodes.length)) await voiceEpisode(series, n, o);
}

run(import.meta.url, main);
