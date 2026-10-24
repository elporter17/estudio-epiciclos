#!/usr/bin/env node
// Descripción + hashtags para TikTok, hechos aquí mismo con plantillas (sin IA ni APIs de pago).
// La elección es estable: la misma figura y semilla dan el mismo texto.
//
//   npm run caption -- --meta out/circularte-violin-en.json
//   npm run caption -- --preset Corazón --lang es
//   npm run caption -- --random spiro --seed 42 --json --no-spoiler
import fs from 'node:fs';
import { parseCli } from './lib/cli.mjs';
import { pathToFileURL } from 'node:url';
import { resolveSource, hashSeed } from './lib/catalog.mjs';

const SITE = 'circularte.edav-tech.com';

// Sin spoiler: no dicen qué figura es, para que se vea hasta el final
const MYSTERY = {
  es: [
    '¿Adivinas qué va a dibujar antes del final? 👀',
    'Solo círculos girando. Di en los comentarios qué crees que es 🤔',
    'Casi nadie adivina esta figura antes del final 🌀',
    'Cada círculo suma un detalle. ¿Qué sale al final? ✨',
    'Empieza como un garabato… espera a que se complete 😳',
    'Matemáticas puras: cientos de círculos y una sola figura. ¿Cuál? 🌀',
    'Si adivinas antes del final, eres un genio 🧠',
    'Una serie de Fourier dibujando algo. Tu apuesta en los comentarios 👇'
  ],
  en: [
    'Can you guess what it draws before the end? 👀',
    'Just spinning circles. Tell me in the comments what you think it is 🤔',
    'Almost nobody guesses this shape before the end 🌀',
    'Every circle adds a detail. What comes out at the end? ✨',
    'It starts like a scribble… wait until it is complete 😳',
    'Pure math: hundreds of circles and a single shape. Which one? 🌀',
    'If you guess before the end, you are a genius 🧠',
    'A Fourier series drawing something. Your guess in the comments 👇'
  ]
};
// Con spoiler: nombran la figura
const NAMED = {
  es: ['¿Pueden unos círculos girando dibujar esto? {x}, mira cómo baja el error 👀', '{x}, dibujado solo con círculos que giran. Espera el final ✨', 'Una serie de Fourier dibujando: {x} 🌀'],
  en: ['Can spinning circles draw this? {x}, watch the error drop 👀', '{x}, drawn only with spinning circles. Wait for the end ✨', 'A Fourier series drawing: {x} 🌀']
};
const TAGS = {
  es: { base: ['matematicas', 'fourier', 'epiciclos'], extra: ['arte', 'parati', 'satisfactorio', 'mathart', 'ciencia', 'adivina', 'fyp', 'dibujo'] },
  en: { base: ['math', 'fourier', 'epicycles'], extra: ['mathart', 'fyp', 'satisfying', 'science', 'guess', 'art', 'drawing', 'foryou'] }
};

export function makeCaption(info, { lang = info.lang || 'es', cta = true, spoiler = true } = {}) {
  const name = lang === 'en' ? info.nameEn : info.name;
  const h = hashSeed(`${info.id || name}|${info.seed ?? ''}|${info.createdAt ?? ''}`);
  const list = spoiler ? NAMED[lang] : MYSTERY[lang];
  let description = list[h % list.length].replace('{x}', name);
  if (cta) description += lang === 'en' ? ` Make yours at ${SITE}` : ` Haz el tuyo en ${SITE}`;
  const { base, extra } = TAGS[lang];
  const hashtags = [...base, ...[0, 1, 2].map((i) => extra[(h >>> (i * 5)) % extra.length])].filter((t, i, a) => a.indexOf(t) === i);
  return { description, hashtags, source: 'template' };
}

// Texto final del post: descripción + hashtags (TikTok admite hasta 2200 caracteres)
export const postText = (c) => `${c.description}\n\n${c.hashtags.map((h) => '#' + h).join(' ')}`.slice(0, 2200);

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
