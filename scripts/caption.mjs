#!/usr/bin/env node
// Descripción + hashtags para TikTok con la API de OpenAI (clave en OPEN_AI u OPENAI_API_KEY, del entorno o de .env).
// Sin clave, o si la API falla, usa una plantilla local para que el flujo no se detenga.
//
//   npm run caption -- --meta out/circularte-violin-en.json
//   npm run caption -- --preset Corazón --lang es
//   npm run caption -- --random spiro --seed 42 --json
import fs from 'node:fs';
import { parseCli } from './lib/cli.mjs';
import { pathToFileURL } from 'node:url';
import './lib/env-file.mjs';
import OpenAI from 'openai';
import { resolveSource, hashSeed } from './lib/catalog.mjs';

// gpt-6-luna: según la guía de modelos de OpenAI, el indicado para tareas acotadas y de alto volumen
export const MODEL = process.env.CIRCULARTE_CAPTION_MODEL || 'gpt-6-luna';
const apiKey = () => process.env.OPENAI_API_KEY || process.env.OPEN_AI;
const SITE = 'circularte.edav-tech.com';

const SCHEMA = {
  type: 'object',
  properties: {
    description: { type: 'string', description: 'Texto del post, sin hashtags' },
    hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags sin el símbolo #' }
  },
  required: ['description', 'hashtags'],
  additionalProperties: false
};

const SYSTEM = `Escribes la descripción de videos cortos de TikTok para CirculArte (${SITE}), una web de Erick Alvarado donde cualquier figura, texto o función se dibuja sola con círculos que giran: una serie de Fourier con epiciclos. En cada video, cadenas de círculos trazan la figura mientras el número de términos N sube (1, 3, 6 … 200) y el error baja; al final se revela la figura completa con las fórmulas.

Reglas:
- Escribe en el idioma pedido, natural y cercano, como un creador de contenido de matemáticas, no como un anuncio.
- La descripción: 1 o 2 frases, máximo 150 caracteres. Un gancho que despierte curiosidad sobre la figura concreta, sin spoilers exagerados ni promesas falsas.
- Si se pide, termina la descripción con una invitación corta a crear el suyo en ${SITE}.
- Como mucho un emoji.
- Entre 4 y 6 hashtags, sin «#», sin espacios: mezcla de amplios (matemáticas, fyp en el idioma) y específicos (fourier, epiciclos, la figura).
- No inventes datos que no estén en la información del video.`;

// Plantilla local: misma forma que la respuesta del modelo
export function templateCaption(info, lang, cta = true) {
  const name = lang === 'en' ? info.nameEn : info.name;
  const es = [`¿Pueden unos círculos girando dibujar esto? ${name}, mira cómo baja el error 👀`, `${name}, dibujado solo con círculos que giran. Espera el final ✨`, `Una serie de Fourier dibujando: ${name} 🌀`];
  const en = [`Can spinning circles draw this? ${name}, watch the error drop 👀`, `${name}, drawn only with spinning circles. Wait for the end ✨`, `A Fourier series drawing: ${name} 🌀`];
  const list = lang === 'en' ? en : es;
  let description = list[hashSeed(name) % list.length];
  if (cta) description += lang === 'en' ? ` Make yours at ${SITE}` : ` Haz el tuyo en ${SITE}`;
  const hashtags = lang === 'en' ? ['math', 'fourier', 'epicycles', 'mathart', 'fyp'] : ['matematicas', 'fourier', 'epiciclos', 'arte', 'parati'];
  return { description, hashtags, source: 'template' };
}

function videoFacts(info, lang) {
  const lines = [`Idioma del post: ${lang === 'en' ? 'inglés' : 'español'}`, `Figura: ${lang === 'en' ? info.nameEn : info.name}`];
  if (info.group) lines.push(`Categoría: ${info.group}`);
  if (info.kind === 'random' || info.def) {
    const d = info.def; if (d) lines.push(d.mode === 'polar' ? `Función polar: r(t) = ${d.r}` : `Función: x(t) = ${d.x}; y(t) = ${d.y}`);
    if (info.kind === 'random') lines.push('Es una función inventada al azar por la app.');
  }
  if (info.caption) lines.push(`Texto que aparece arriba en el video: «${info.caption}»`);
  if (info.terms) lines.push(`Términos N por etapa: ${info.terms.join(', ')}`);
  if (info.duration) lines.push(`Duración: ${Math.round(info.duration)} s`);
  return lines.join('\n');
}

export async function makeCaption(info, { lang = info.lang || 'es', cta = true, fallback = true } = {}) {
  if (!apiKey()) {
    if (!fallback) throw new Error('Falta la clave de OpenAI (OPEN_AI u OPENAI_API_KEY).');
    process.stderr.write('Aviso: sin clave de OpenAI, uso la plantilla local.\n');
    return templateCaption(info, lang, cta);
  }
  const client = new OpenAI({ apiKey: apiKey() });
  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: SYSTEM,
      input: `${videoFacts(info, lang)}\n\nInvitación a ${SITE} al final: ${cta ? 'sí' : 'no'}.`,
      text: { format: { type: 'json_schema', name: 'tiktok_post', schema: SCHEMA, strict: true } }
    });
    const message = response.output.find((item) => item.type === 'message');
    const refusal = message?.content.find((c) => c.type === 'refusal');
    if (refusal) throw new Error(`el modelo declinó: ${refusal.refusal}`);
    const out = JSON.parse(response.output_text);
    const hashtags = out.hashtags.map((h) => String(h).replace(/^#/, '').replace(/\s+/g, '')).filter(Boolean).slice(0, 6);
    return { description: out.description.trim(), hashtags, source: response.model };
  } catch (e) {
    if (!fallback) throw e;
    const why = e instanceof OpenAI.APIError ? `API ${e.status}: ${e.message}` : e.message;
    process.stderr.write(`Aviso: no pude generar con OpenAI (${why}); uso la plantilla local.\n`);
    return templateCaption(info, lang, cta);
  }
}

// Texto final del post: descripción + hashtags (TikTok admite hasta 2200 caracteres)
export const postText = (c) => `${c.description}\n\n${c.hashtags.map((h) => '#' + h).join(' ')}`.slice(0, 2200);

async function main() {
  const o = parseCli({
    meta: { type: 'string' }, preset: { type: 'string' }, random: { type: 'string' }, text: { type: 'string' }, seed: { type: 'string' },
    lang: { type: 'string' }, cta: { type: 'boolean', default: true }, json: { type: 'boolean', default: false },
    fallback: { type: 'boolean', default: true }, save: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' }
  });
  if (o.help) {
    console.log(`Uso: npm run caption -- (--meta out/<video>.json | --preset <nombre> | --random <tipo> --seed <n> | --text <texto>)
  --lang es|en   --no-cta (sin invitación a la web)   --json   --save (guarda "post" dentro del .json de --meta)
  --no-fallback  (falla en vez de usar la plantilla si no hay clave o la API falla)
Modelo: ${MODEL} (cámbialo con CIRCULARTE_CAPTION_MODEL). Clave: OPEN_AI u OPENAI_API_KEY (entorno o .env).`);
    return;
  }
  let info;
  if (o.meta) info = JSON.parse(fs.readFileSync(o.meta, 'utf8'));
  else info = resolveSource({ preset: o.preset, random: o.random, text: o.text, seed: o.seed != null ? Number(o.seed) >>> 0 : undefined }).info;
  const lang = o.lang || info.lang || 'es';
  if (!['es', 'en'].includes(lang)) throw new Error('--lang debe ser es o en');
  const cap = await makeCaption(info, { lang, cta: o.cta, fallback: o.fallback });
  if (o.save && o.meta) { info.post = { ...cap, text: postText(cap), lang }; fs.writeFileSync(o.meta, JSON.stringify(info, null, 2) + '\n'); }
  console.log(o.json ? JSON.stringify({ ...cap, text: postText(cap), lang }, null, 2) : postText(cap));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
}
