#!/usr/bin/env node
// Paso 1 · guion. Escribe con OpenAI la «biblia» de la serie (premisa, personajes con descripción visual fija,
// estilo visual, voces) y luego cada episodio en JSON con escenas y líneas de narración.
//
//   npm run script                                   → serie nueva de amor y traición en español
//   npm run script -- --genre "venganza" --idea "una chef que…"
//   npm run script -- --series <slug> --ep 3         → reescribe solo el episodio 3 de una serie existente
import OpenAI from 'openai';
import { parseCli, parseEpisodes, run } from './lib/cli.mjs';
import { MODELS, openaiKey, log } from './lib/env.mjs';
import { loadSeries, saveSeries, seriesFile, episodeWords, closingLine, wordsOf } from './lib/series.mjs';

export const EPISODES = 5;
export const WORDS = { min: 170, max: 235 }; // medido: ~0.46 s por palabra con pausas → 80–110 s
const VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse', 'marin', 'cedar'];
const BEATS = ['gancho', 'desarrollo', 'giro', 'cliffhanger', 'cierre'];
const MOTIONS = ['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'pan_up', 'pan_down'];

const str = (description) => ({ type: 'string', description });
const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });

const BIBLE_SCHEMA = obj({
  title: str('Título corto y gancho de la serie'),
  slug: str('Identificador kebab-case ASCII del título, máx. 40 caracteres'),
  logline: str('Una frase que vende la serie'),
  premise: str('Premisa completa en 3 a 5 frases'),
  setting: str('Ciudad/época/ambiente ficticios o genéricos'),
  tone: str('Tono narrativo'),
  visual_style: str('Párrafo EN INGLÉS que se repite en cada prompt de imagen: medio (foto cinematográfica realista), iluminación, paleta, lente, grano, época. Sin nombres de artistas reales.'),
  narrator: obj({
    character_id: str('id del personaje protagonista que narra en primera persona'),
    voice: { type: 'string', enum: VOICES },
    voice_instructions: str('Cómo debe sonar la narradora/el narrador: acento, edad, tono (en español)')
  }),
  characters: {
    type: 'array', minItems: 3, maxItems: 5,
    items: obj({
      id: str('kebab-case ASCII, p. ej. "lucia"'),
      name: str('Nombre ficticio'),
      role: str('Papel en la historia'),
      age: { type: 'integer', description: 'Edad (todos adultos, 25 o más)' },
      visual: str('Descripción visual FIJA EN INGLÉS para el generador de imágenes: rostro, tono de piel, cabello (color, largo, peinado), complexión, ropa característica que siempre lleva, un rasgo distintivo. 35 a 60 palabras.'),
      personality: str('Rasgos y secreto del personaje'),
      voice: { type: 'string', enum: VOICES },
      voice_instructions: str('Cómo habla (en español)')
    })
  },
  outline: {
    type: 'array', minItems: EPISODES, maxItems: EPISODES,
    items: obj({ number: { type: 'integer' }, title: str('Título del episodio'), summary: str('Qué pasa'), twist: str('El giro'), cliffhanger: str('Con qué pregunta queda el espectador') })
  }
});

const EPISODE_SCHEMA = obj({
  number: { type: 'integer' },
  title: str('Título del episodio'),
  hook_text: str('Texto en pantalla durante los primeros 3 s: máx. 7 palabras, sin emojis, que genere una pregunta'),
  post_description: str('Descripción del post de TikTok, máx. 140 caracteres, sin hashtags, intrigante, sin spoilers del giro'),
  hashtags: { type: 'array', minItems: 4, maxItems: 6, items: str('sin #, sin espacios') },
  scenes: {
    type: 'array', minItems: 7, maxItems: 11,
    items: obj({
      id: str('s1, s2, …'),
      beat: { type: 'string', enum: BEATS },
      image_prompt: str('EN INGLÉS: qué se ve en el cuadro (lugar, acción, expresión, encuadre, luz). Nombra a los personajes por su nombre pero NO describas su aspecto (se añade solo). Sin texto legible: pantallas de celular vistas de lado o desenfocadas.'),
      characters: { type: 'array', items: str('ids de los personajes que aparecen en la imagen') },
      shot: { type: 'string', enum: ['close-up', 'medium', 'wide', 'insert'] },
      motion: { type: 'string', enum: MOTIONS },
      lines: {
        type: 'array', minItems: 1, maxItems: 4,
        items: obj({ speaker: str('"narrador" o el id del personaje que dice la línea en diálogo'), text: str('Texto hablado'), delivery: str('Indicación breve de actuación para la voz') })
      }
    })
  }
});

const RULES = `Reglas de contenido (obligatorias):
- Historias 100 % originales e inventadas. Nada de personas reales, famosos, marcas, empresas reales ni hechos noticiosos.
- Todos los personajes son adultos (25 años o más).
- Apto para TikTok: sin sexo explícito, sin violencia gráfica, sin autolesiones, sin odio. La traición se insinúa con miradas, mensajes, mentiras y descubrimientos.
- Ambientación latinoamericana genérica (ciudad sin nombre real o inventada).`;

function bibleSystem(lang) {
  return `Eres guionista de minidramas verticales para TikTok: series de ficción de 5 partes de 60 a 120 s, narradas por voz IA sobre imágenes fijas con movimiento lento y subtítulos.
La protagonista (o el protagonista) narra en primera persona, como quien cuenta su historia a la cámara; los demás personajes intervienen con frases cortas de diálogo.
Escribe todo el texto narrativo en ${lang === 'en' ? 'inglés' : 'español latinoamericano neutro'}; las descripciones visuales y el estilo visual van en inglés.
Cada parte debe terminar en cliffhanger y la serie avanza con giros crecientes; la parte 5 cierra el arco principal pero deja una última sorpresa.
Las descripciones visuales deben ser muy concretas y distintas entre personajes para que el generador de imágenes los mantenga reconocibles.
Usa voces distintas para cada personaje; la voz de la narradora es la del personaje que narra.
${RULES}`;
}

function episodeSystem(lang, n) {
  return `Eres guionista de minidramas verticales para TikTok. Escribe la PARTE ${n} de ${EPISODES} de la serie descrita en la biblia.
Estructura obligatoria:
1. GANCHO (escena s1, beat "gancho"): la primera línea, máx. 12 palabras, se dice en los primeros 3 s y tiene que funcionar sin contexto: una frase que obligue a quedarse («El día de mi boda encontré…»). ${n > 1 ? 'Puede retomar el cliffhanger anterior en una frase.' : ''}
2. DESARROLLO (beat "desarrollo"): 3 a 5 escenas que avanzan rápido, frases cortas, detalles concretos.
3. GIRO (beat "giro"): una revelación que cambia lo que creíamos.
4. CLIFFHANGER (beat "cliffhanger"): termina en suspenso, en la frase más fuerte, sin resolverla.
5. CIERRE (última escena, beat "cierre"): exactamente una línea del narrador: «${closingLine(n, lang)}». Su imagen es un plano que mantiene la tensión.
Extensión: entre ${WORDS.min} y ${WORDS.max} palabras habladas en total (contando todas las líneas). 7 a 11 escenas; 1 a 4 líneas por escena; cada línea de máx. 25 palabras.
La mayoría de las líneas son del "narrador" (primera persona, pasado o presente narrativo). Diálogos breves de otros personajes con su id como speaker.
Idioma de las líneas, hook_text, título y descripción: ${lang === 'en' ? 'inglés' : 'español latinoamericano neutro'}. image_prompt siempre en inglés.
Composición de las imágenes: vertical 9:16, rostros en la mitad superior, nada importante en el tercio inferior (ahí van los subtítulos).
En "characters" de cada escena pon solo a quienes se ven en la imagen. Varía el "motion" entre escenas.
${RULES}`;
}

function client() {
  if (!openaiKey()) throw new Error('Falta la clave de OpenAI (OPEN_AI u OPENAI_API_KEY en .env).');
  return new OpenAI({ apiKey: openaiKey() });
}

async function ask(openai, { instructions, input, name, schema }) {
  const r = await openai.responses.create({ model: MODELS.script, instructions, input, text: { format: { type: 'json_schema', name, schema, strict: true } } });
  const msg = r.output.find((i) => i.type === 'message');
  const refusal = msg?.content.find((c) => c.type === 'refusal');
  if (refusal) throw new Error(`el modelo declinó: ${refusal.refusal}`);
  return { data: JSON.parse(r.output_text), usage: r.usage };
}

// Revisa la forma del episodio; devuelve la lista de problemas (vacía si está bien)
export function checkEpisode(series, ep, n) {
  const problems = [];
  const ids = new Set(series.characters.map((c) => c.id));
  const words = episodeWords(ep);
  if (words < WORDS.min - 15 || words > WORDS.max + 20) problems.push(`tiene ${words} palabras habladas y deben ser entre ${WORDS.min} y ${WORDS.max}`);
  if (ep.scenes[0]?.beat !== 'gancho') problems.push('la primera escena debe tener beat "gancho"');
  const first = ep.scenes[0]?.lines[0]?.text || '';
  if (wordsOf(first).length > 14) problems.push(`la primera línea (gancho) tiene ${wordsOf(first).length} palabras; máx. 12`);
  if (wordsOf(ep.hook_text).length > 8) problems.push('hook_text tiene más de 7 palabras');
  for (const b of ['giro', 'cliffhanger']) if (!ep.scenes.some((s) => s.beat === b)) problems.push(`falta una escena con beat "${b}"`);
  for (const s of ep.scenes) {
    for (const c of s.characters) if (!ids.has(c)) problems.push(`la escena ${s.id} usa un personaje desconocido «${c}»`);
    for (const l of s.lines) {
      if (l.speaker !== 'narrador' && !ids.has(l.speaker)) problems.push(`la escena ${s.id} tiene un hablante desconocido «${l.speaker}»`);
      if (wordsOf(l.text).length > 28) problems.push(`una línea de ${s.id} es demasiado larga`);
    }
  }
  return problems;
}

// El cierre se normaliza siempre: última escena «cierre» con la línea exacta del narrador
function normalizeEpisode(series, ep, n) {
  ep.number = n;
  ep.scenes.forEach((s, i) => { s.id = `s${i + 1}`; });
  const last = ep.scenes[ep.scenes.length - 1];
  const close = { speaker: 'narrador', text: closingLine(n, series.language), delivery: 'Pausa breve antes; tono de promesa, más bajo, con intriga.' };
  if (last.beat === 'cierre') last.lines = [close];
  else ep.scenes.push({ id: `s${ep.scenes.length + 1}`, beat: 'cierre', image_prompt: last.image_prompt, characters: last.characters, shot: last.shot, motion: 'zoom_in', lines: [close] });
  ep.hashtags = ep.hashtags.map((h) => String(h).replace(/^#/, '').replace(/\s+/g, '')).filter(Boolean);
  return ep;
}

const bibleText = (s) => JSON.stringify({ title: s.title, logline: s.logline, premise: s.premise, setting: s.setting, tone: s.tone, narrator: s.narrator, characters: s.characters.map(({ id, name, role, age, personality }) => ({ id, name, role, age, personality })), outline: s.outline }, null, 2);
const episodeText = (ep) => `PARTE ${ep.number} · ${ep.title}\n` + ep.scenes.map((s) => s.lines.map((l) => `${l.speaker}: ${l.text}`).join('\n')).join('\n');

async function writeEpisode(openai, series, n) {
  const prev = series.episodes.filter((e) => e.number < n).map(episodeText).join('\n\n');
  let input = `BIBLIA DE LA SERIE:\n${bibleText(series)}\n\n${prev ? `PARTES ANTERIORES (texto hablado):\n${prev}\n\n` : ''}Escribe ahora la parte ${n}.`;
  for (let attempt = 1; ; attempt++) {
    const { data, usage } = await ask(openai, { instructions: episodeSystem(series.language, n), input, name: 'episodio', schema: EPISODE_SCHEMA });
    const ep = normalizeEpisode(series, data, n);
    const problems = checkEpisode(series, ep, n);
    log(`  parte ${n}: ${ep.scenes.length} escenas · ${episodeWords(ep)} palabras · ${usage?.output_tokens ?? '?'} tokens de salida${problems.length ? ` · revisar: ${problems.join('; ')}` : ''}\n`);
    if (!problems.length || attempt >= 3) return { ep, usage };
    input += `\n\nTu versión anterior tenía estos problemas; corrígelos y vuelve a escribir la parte ${n} completa:\n- ${problems.join('\n- ')}`;
  }
}

const LINES_SCHEMA = obj({
  scenes: {
    type: 'array',
    items: obj({ id: str('El mismo id de escena'), lines: { type: 'array', minItems: 1, maxItems: 4, items: obj({ speaker: str('Mismo hablante'), text: str('Texto hablado más corto'), delivery: str('Indicación de actuación') }) } })
  }
});

// Acorta el texto hablado de un episodio sin tocar sus escenas (las imágenes ya hechas siguen sirviendo)
export async function tightenEpisode(openai, series, n, target = WORDS.max - 15) {
  const ep = series.episodes.find((e) => e.number === n);
  const before = episodeWords(ep);
  const input = `Episodio actual (JSON):\n${JSON.stringify(ep.scenes.map((s) => ({ id: s.id, beat: s.beat, lines: s.lines })), null, 2)}\n\nTiene ${before} palabras habladas; déjalo en ${target - 15} a ${target} palabras.`;
  const { data } = await ask(openai, {
    instructions: `Eres editor de guiones de minidramas para TikTok. Acorta las líneas habladas de este episodio quitando relleno y repeticiones, sin perder ningún hecho de la trama, el gancho de la primera línea, el giro ni el cliffhanger. Conserva exactamente las mismas escenas (mismos id, mismo orden) y los mismos hablantes; puedes unir o quitar líneas dentro de una escena. La última escena (cierre) queda igual. Idioma: el mismo del texto.`,
    input, name: 'lineas', schema: LINES_SCHEMA
  });
  const byId = Object.fromEntries(data.scenes.map((s) => [s.id, s.lines]));
  if (ep.scenes.some((s) => !byId[s.id]?.length)) throw new Error('El modelo cambió las escenas; no apliqué el recorte.');
  const draft = { ...ep, scenes: ep.scenes.map((s) => ({ ...s, lines: byId[s.id] })) };
  normalizeEpisode(series, draft, n);
  log(`  parte ${n}: ${before} → ${episodeWords(draft)} palabras\n`);
  return draft;
}

export async function writeScript({ genre = 'amor y traición', idea = '', lang = 'es', series: slug, ep: epSpec, tighten = false } = {}) {
  const openai = client();
  let series;
  if (slug || epSpec) {
    series = loadSeries(slug);
  } else {
    log(`Escribiendo la biblia de una serie de ${genre} (${MODELS.script})…\n`);
    const { data } = await ask(openai, {
      instructions: bibleSystem(lang),
      input: `Género: ${genre}.${idea ? `\nIdea del autor: ${idea}` : ''}\nCrea la biblia de una serie nueva de ${EPISODES} partes.`,
      name: 'biblia', schema: BIBLE_SCHEMA
    });
    series = { ...data, slug: data.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'serie', genre, language: lang, model: MODELS.script, createdAt: new Date().toISOString(), episodes: [] };
    if (!series.characters.some((c) => c.id === series.narrator.character_id)) series.narrator.character_id = series.characters[0].id;
    log(`  «${series.title}» · ${series.characters.map((c) => c.name).join(', ')}\n`);
    saveSeries(series);
  }
  const todo = parseEpisodes(epSpec, EPISODES);
  for (const n of todo) {
    const ep = tighten ? await tightenEpisode(openai, series, n) : (await writeEpisode(openai, series, n)).ep;
    series.episodes = [...series.episodes.filter((e) => e.number !== n), ep].sort((a, b) => a.number - b.number);
    saveSeries(series);
  }
  log(`Guion: ${seriesFile(series.slug)}\n`);
  return series;
}

async function main() {
  const o = parseCli({
    genre: { type: 'string', default: 'amor y traición' }, idea: { type: 'string', default: '' }, lang: { type: 'string', default: 'es' },
    series: { type: 'string' }, ep: { type: 'string' }, tighten: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' }
  });
  if (o.help) { console.log('Uso: npm run script -- [--genre "amor y traición"] [--idea "…"] [--lang es|en] | [--series <slug>] [--ep 1|1,3|all] [--tighten (acorta el texto y conserva las escenas)]'); return; }
  if (o.tighten && !o.ep) throw new Error('--tighten necesita --ep (p. ej. --ep 5).');
  if (!['es', 'en'].includes(o.lang)) throw new Error('--lang debe ser es o en');
  await writeScript(o);
}

run(import.meta.url, main);
