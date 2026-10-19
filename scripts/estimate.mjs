#!/usr/bin/env node
// Estimación de costo antes de gastar: voz, transcripción e imágenes de los episodios pedidos.
// Con un guion ya escrito usa sus escenas y palabras reales; si ya hay imágenes hechas, usa su costo medio real.
//
//   npm run estimate                 (toda la serie más reciente)
//   npm run estimate -- --ep 1
import fs from 'node:fs';
import path from 'node:path';
import { parseCli, parseEpisodes, run } from './lib/cli.mjs';
import { MODELS, IMAGE_SIZE, IMAGE_QUALITY } from './lib/env.mjs';
import { PRICES } from './lib/pricing.mjs';
import { OUT_DIR, readJson, loadSeries, episode, episodeWords, charDir } from './lib/series.mjs';

const WORDS_PER_SEC = 2.3, PAUSES_PER_SCENE = 0.45; // ritmo medido de la voz (parte 1: 250 palabras → 116 s)
const DEFAULT_IMAGE = { plain: 0.012, refs: 0.03 }; // medido 2026-10-19: flare 1088x1920 medium sin referencias ≈ $0.011

// Costo medio real de lo ya generado (todas las series), separado por con/sin referencias
function measuredImageCost() {
  const plain = [], refs = [];
  if (!fs.existsSync(OUT_DIR)) return {};
  for (const s of fs.readdirSync(OUT_DIR)) {
    const sd = path.join(OUT_DIR, s); if (!fs.statSync(sd).isDirectory()) continue;
    for (const e of fs.readdirSync(sd).filter((d) => /^ep\d+$/.test(d))) {
      for (const m of Object.values(readJson(path.join(sd, e, 'images', 'images.json'), {}))) if (m.cost) (m.refs?.length ? refs : plain).push(m.cost);
    }
  }
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : undefined);
  return { plain: avg(plain), refs: avg(refs), n: plain.length + refs.length };
}

export function estimate(series, eps, { refs = true } = {}) {
  const m = measuredImageCost();
  const per = { plain: m.plain ?? DEFAULT_IMAGE.plain, refs: m.refs ?? DEFAULT_IMAGE.refs };
  const rows = eps.map((n) => {
    const ep = episode(series, n), words = episodeWords(ep);
    const seconds = words / WORDS_PER_SEC + ep.scenes.length * PAUSES_PER_SCENE + 1.7;
    const withPeople = refs ? ep.scenes.filter((s) => s.characters.length).length : 0;
    const images = withPeople * per.refs + (ep.scenes.length - withPeople) * per.plain;
    const minutes = seconds / 60;
    return { n, scenes: ep.scenes.length, words, seconds, voice: minutes * PRICES.ttsPerMinute, transcribe: minutes * PRICES.transcribePerMinute, images };
  });
  const missingPortraits = refs ? series.characters.filter((c) => !fs.existsSync(path.join(charDir(series.slug), `${c.id}.jpg`))).length : 0;
  const portraits = missingPortraits * per.plain;
  const total = rows.reduce((a, r) => a + r.voice + r.transcribe + r.images, 0) + portraits;
  return { rows, portraits, missingPortraits, total, per, measured: m.n || 0 };
}

export function printEstimate(series, e) {
  const $ = (x) => `$${x.toFixed(3)}`;
  console.log(`\nEstimación para «${series.title}» · imágenes ${MODELS.image} ${IMAGE_SIZE} ${IMAGE_QUALITY} · voz ${MODELS.tts}`);
  console.log('Parte  Escenas  Palabras  Duración  Voz      Tiempos  Imágenes');
  for (const r of e.rows) console.log(`${String(r.n).padEnd(7)}${String(r.scenes).padEnd(9)}${String(r.words).padEnd(10)}${(r.seconds.toFixed(0) + ' s').padEnd(10)}${$(r.voice).padEnd(9)}${$(r.transcribe).padEnd(9)}${$(r.images)}`);
  if (e.missingPortraits) console.log(`Retratos de referencia: ${e.missingPortraits} × ${$(e.per.plain)} = ${$(e.portraits)}`);
  console.log(`Costo por imagen: ${$(e.per.refs)} con referencias, ${$(e.per.plain)} sin${e.measured ? ` (promedio real de ${e.measured} imágenes)` : ' (supuesto)'}`);
  console.log(`TOTAL estimado: ≈ ${$(e.total)} USD (el guion ya está pagado; el montaje es local y gratis)\n`);
}

async function main() {
  const o = parseCli({ series: { type: 'string' }, ep: { type: 'string' }, refs: { type: 'boolean', default: true }, help: { type: 'boolean', short: 'h' } });
  if (o.help) { console.log('Uso: npm run estimate -- [--series <slug>] [--ep 1|all] [--no-refs]'); return; }
  const series = loadSeries(o.series);
  printEstimate(series, estimate(series, parseEpisodes(o.ep, series.episodes.length), o));
}

run(import.meta.url, main);
