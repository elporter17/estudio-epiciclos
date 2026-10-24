#!/usr/bin/env node
// Descripción + hashtags para TikTok con las plantillas de src/captions.js (sin IA ni APIs de pago).
// La elección es estable: la misma figura y semilla dan el mismo texto.
//
//   npm run caption -- --meta out/circularte-violin-en.json
//   npm run caption -- --preset Corazón --lang es
//   npm run caption -- --random spiro --seed 42 --json --no-spoiler
import fs from 'node:fs';
import { parseCli } from './lib/cli.mjs';
import { pathToFileURL } from 'node:url';
import { resolveSource } from './lib/catalog.mjs';
import { makeCaption, postText } from '../src/captions.js';

// Las plantillas viven en src/captions.js, compartidas con la web
export { makeCaption, postText };

async function main() {
  const o = parseCli({
    meta: { type: 'string' }, preset: { type: 'string' }, random: { type: 'string' }, text: { type: 'string' }, seed: { type: 'string' },
    lang: { type: 'string' }, cta: { type: 'boolean', default: true }, spoiler: { type: 'boolean', default: true },
    json: { type: 'boolean', default: false }, save: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' }
  });
  if (o.help) {
    console.log(`Uso: npm run caption -- (--meta out/<video>.json | --preset <nombre> | --random <tipo> --seed <n> | --text <texto>)
  --lang es|en   --no-cta (sin invitación a la web)   --no-spoiler (no dice qué figura es)   --json
  --save (guarda "post" dentro del .json de --meta)`);
    return;
  }
  let info;
  if (o.meta) info = JSON.parse(fs.readFileSync(o.meta, 'utf8'));
  else info = resolveSource({ preset: o.preset, random: o.random, text: o.text, seed: o.seed != null ? Number(o.seed) >>> 0 : undefined }).info;
  const lang = o.lang || info.lang || 'es';
  if (!['es', 'en'].includes(lang)) throw new Error('--lang debe ser es o en');
  const cap = makeCaption(info, { lang, cta: o.cta, spoiler: o.spoiler });
  if (o.save && o.meta) { info.post = { ...cap, text: postText(cap), lang }; fs.writeFileSync(o.meta, JSON.stringify(info, null, 2) + '\n'); }
  console.log(o.json ? JSON.stringify({ ...cap, text: postText(cap), lang }, null, 2) : postText(cap));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
}
