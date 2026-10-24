#!/usr/bin/env node
// Elige la próxima figura para publicar, evitando las recientes. Guarda un historial pequeño en JSON.
//
//   npm run pick                       → imprime la elección y la anota en data/history.json
//   npm run pick -- --dry-run --json   → solo muestra qué tocaría, con los argumentos para render
import fs from 'node:fs';
import path from 'node:path';
import { parseCli } from './lib/cli.mjs';
import { pathToFileURL } from 'node:url';
import { makeRng } from '../src/engine.js';
import { catalog } from './lib/catalog.mjs';
import { setupNode, ROOT } from './lib/node-env.mjs';

export const HISTORY = path.join(ROOT, 'data', 'history.json');
const KEEP = 200; // entradas que se guardan

export function readHistory(file = HISTORY) {
  try { const h = JSON.parse(fs.readFileSync(file, 'utf8')); return Array.isArray(h) ? h : []; } catch { return []; }
}

// Reparto de la publicación automática (complex) entre las categorías de la biblioteca
export const SHARES = { figuras: 0.4, nombres: 0.25, combinaciones: 0.15, inventadas: 0.2 };

// avoid = cuántas publicaciones recientes no se pueden repetir; cada función inventada es distinta gracias a la semilla.
export function pickNext({ history = readHistory(), avoid, seed = Date.now() >>> 0, emoji = true, complex = false, randomWeight = 0.5 } = {}) {
  const items = catalog({ emoji, complex });
  // Con la biblioteca (~700 elementos) se evita lo de las últimas 60 corridas: unos 10 días a 6 por día
  avoid ??= complex ? 60 : 12;
  const recent = new Set(history.slice(-Math.min(avoid, items.length - 1)).map((h) => h.id));
  // Las funciones inventadas no se bloquean: cada semilla da una curva distinta
  const pool = items.filter((it) => it.kind === 'random' || !recent.has(it.id));
  // Tampoco repetir el mismo grupo dos veces seguidas si hay alternativa
  const lastGroup = history.length ? history[history.length - 1].group : null;
  const varied = pool.filter((it) => it.group !== lastGroup);
  const choices = varied.length ? varied : pool.length ? pool : items;
  // Con categorías, cada una se lleva su parte (SHARES) repartida entre sus elementos disponibles;
  // sin ellas, las funciones inventadas pesan menos para que dominen los presets reconocibles
  const perCat = {}; for (const it of choices) if (it.cat) perCat[it.cat] = (perCat[it.cat] || 0) + 1;
  const rng = makeRng(seed), weights = choices.map((it) => it.cat ? (SHARES[it.cat] ?? 0.1) / perCat[it.cat] : it.kind === 'random' ? randomWeight : 1);
  let r = rng() * weights.reduce((a, b) => a + b, 0), i = 0;
  while (i < choices.length - 1 && (r -= weights[i]) > 0) i++;
  const it = choices[i];
  const renderSeed = Math.floor(rng() * 2 ** 31);
  const args = it.kind === 'preset' ? ['--preset', it.name] : it.kind === 'text' ? ['--text', it.text, '--font', it.font] : ['--random', it.type];
  args.push('--seed', String(renderSeed));
  return { ...it, seed: renderSeed, args };
}

export function recordPick(item, extra = {}, file = HISTORY) {
  const h = readHistory(file);
  h.push({ id: item.id, group: item.group, name: item.name || item.type, seed: item.seed, at: new Date().toISOString(), ...extra });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(h.slice(-KEEP), null, 2) + '\n');
}

async function main() {
  const o = parseCli({
    'dry-run': { type: 'boolean', default: false }, json: { type: 'boolean', default: false }, avoid: { type: 'string', default: '12' },
    seed: { type: 'string' }, lang: { type: 'string', default: 'es' }, history: { type: 'string' }, help: { type: 'boolean', short: 'h' }
  });
  if (o.help) { console.log('Uso: npm run pick -- [--dry-run] [--json] [--avoid 12] [--seed n] [--lang es|en] [--history data/history.json]'); return; }
  const { emoji } = setupNode();
  const file = o.history ? path.resolve(o.history) : HISTORY;
  const item = pickNext({ history: readHistory(file), avoid: +o.avoid, seed: o.seed != null ? Number(o.seed) >>> 0 : undefined, emoji: !!emoji });
  item.args.push('--lang', o.lang);
  if (!o['dry-run']) recordPick(item, { lang: o.lang }, file);
  console.log(o.json ? JSON.stringify(item, null, 2) : `${item.name || item.type} (${item.group}) → npm run render -- ${item.args.map((a) => /\s/.test(a) ? `"${a}"` : a).join(' ')}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
}
