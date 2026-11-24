#!/usr/bin/env node
// Todo seguido: guion → estimación (pide confirmación) → voz → imágenes → montaje → revisión → (opcional) publicar.
//
//   npm run all                                        → serie nueva de amor y traición, 5 partes, sin publicar
//   npm run all -- --series <slug> --ep 1              → retoma una serie existente (no reescribe el guion)
//   npm run all -- --genre "venganza" --yes --publish draft
import readline from 'node:readline/promises';
import { parseCli, parseEpisodes, run } from './lib/cli.mjs';
import { log } from './lib/env.mjs';
import { loadSeries, videoFile } from './lib/series.mjs';
import { writeScript } from './script.mjs';
import { estimate, printEstimate } from './estimate.mjs';
import { voiceEpisode } from './voice.mjs';
import { imagesEpisode } from './images.mjs';
import { assembleEpisode } from './assemble.mjs';
import { reviewEpisode } from './review.mjs';
import { publishVideo } from './publish.mjs';

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question(question)).trim().toLowerCase();
  rl.close();
  return ['s', 'si', 'sí', 'y', 'yes'].includes(a);
}

async function main() {
  const o = parseCli({
    series: { type: 'string' }, ep: { type: 'string' }, genre: { type: 'string', default: 'amor y traición' }, idea: { type: 'string', default: '' },
    lang: { type: 'string', default: 'es' }, refs: { type: 'boolean', default: true }, music: { type: 'string', default: 'auto' },
    review: { type: 'boolean', default: true }, publish: { type: 'string' }, yes: { type: 'boolean', short: 'y', default: false }, help: { type: 'boolean', short: 'h' }
  });
  if (o.help) { console.log('Uso: npm run all -- [--series <slug>] [--ep 1|all] [--genre "…"] [--idea "…"] [--lang es|en] [--no-refs] [--music auto|none|<archivo>] [--no-review] [--publish draft|direct] [--yes]'); return; }

  const series = o.series ? loadSeries(o.series) : await writeScript({ genre: o.genre, idea: o.idea, lang: o.lang });
  const eps = parseEpisodes(o.ep, series.episodes.length);
  const est = estimate(series, eps, { refs: o.refs });
  printEstimate(series, est);
  if (!o.yes && !(await confirm(`¿Genero voz e imágenes de ${eps.length} parte/s por ≈ $${est.total.toFixed(2)}? (s/n) `))) { log('Cancelado; el guion queda guardado.\n'); return; }

  for (const n of eps) {
    log(`\n=== Parte ${n} ===\n`);
    await voiceEpisode(series, n);
    await imagesEpisode(series, n, { refs: o.refs });
    await assembleEpisode(series, n, { music: o.music });
    if (o.review) await reviewEpisode(series, n, { sync: true });
  }
  if (o.publish) {
    if (!o.yes && !(await confirm(`¿Subo ${eps.length} video/s a TikTok en modo ${o.publish}? (s/n) `))) return;
    for (const n of eps) await publishVideo({ video: videoFile(series.slug, n), mode: o.publish });
  }
}

run(import.meta.url, main);
