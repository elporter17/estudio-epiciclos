#!/usr/bin/env node
// Paso 3 · imágenes. Una imagen vertical por escena con la API de imágenes de OpenAI.
// Para que los personajes se parezcan entre escenas: cada prompt repite el estilo visual y la descripción fija
// de cada personaje en cuadro y, con --refs (por defecto), además se pasa su retrato de referencia
// (out/<slug>/characters/<id>.jpg, generado una vez por serie) a la edición de imágenes.
//
//   npm run images -- --ep 1               (lo ya generado no se repite)
//   npm run images -- --ep 1 --scene s3 --force
//   npm run images -- --no-refs            (solo texto, sin retratos de referencia)
import fs from 'node:fs';
import path from 'node:path';
import OpenAI, { toFile } from 'openai';
import { parseCli, parseEpisodes, pool, run } from './lib/cli.mjs';
import { MODELS, IMAGE_SIZE, IMAGE_QUALITY, openaiKey, log } from './lib/env.mjs';
import { loadSeries, episode, charDir, imageDir, readJson, writeJson } from './lib/series.mjs';
import { imageCost } from './lib/pricing.mjs';

const NO_TEXT = 'No text, no letters, no captions, no subtitles, no logos, no watermarks; any phone or computer screen is seen at an angle or blurred.';
const FRAMING = 'Vertical 9:16 cinematic still from a live-action drama series. Faces and key action in the upper two thirds; the lower third is calm background (subtitles go there).';

export const characterBlock = (series, ids) => series.characters.filter((c) => ids.includes(c.id))
  .map((c) => `${c.name} (${c.age} years old): ${c.visual}`).join('\n');

export function scenePrompt(series, scene, { refs = [] } = {}) {
  const who = characterBlock(series, scene.characters);
  const refNote = refs.length ? `Reference images: ${refs.map((r, i) => `image ${i + 1} is ${r.name}`).join('; ')}. Keep each person's face, hair, skin tone, build and outfit exactly as in their reference; ignore the reference background and pose.\n` : '';
  return `${FRAMING}\nVisual style: ${series.visual_style}\n${refNote}${who ? `Characters in frame (keep their appearance exactly):\n${who}\n` : 'No people in frame unless described.\n'}Shot: ${scene.shot}.\nScene: ${scene.image_prompt}\n${NO_TEXT}`;
}

const portraitPrompt = (series, c) => `Character reference portrait for a live-action drama series. Waist-up, facing the camera, neutral expression, plain mid-gray studio background, soft even light, sharp focus on the face.\nVisual style: ${series.visual_style}\n${c.name} (${c.age} years old): ${c.visual}\n${NO_TEXT}`;

// Guarda la imagen y su costo real según el uso de tokens que devuelve la API
async function saveImage(res, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(res.data[0].b64_json, 'base64'));
  return { usage: res.usage || null, cost: imageCost(res.usage) };
}

const common = () => ({ model: MODELS.image, size: IMAGE_SIZE, quality: IMAGE_QUALITY, output_format: 'jpeg', output_compression: 92 });

async function generate(openai, prompt, file, refs = []) {
  if (!refs.length) return saveImage(await openai.images.generate({ ...common(), prompt }), file);
  const image = await Promise.all(refs.map(async (r) => toFile(fs.readFileSync(r.file), path.basename(r.file), { type: 'image/jpeg' })));
  return saveImage(await openai.images.edit({ ...common(), image, prompt }), file);
}

const isSafetyBlock = (e) => e?.status === 400 && /safety|moderation|policy|rejected/i.test(e.message);

// Reescribe el momento sin contacto físico ni violencia: la tensión queda en distancia, miradas y luz
async function softenScene(openai, text) {
  const r = await openai.responses.create({
    model: MODELS.rewrite,
    instructions: 'Rewrite this image prompt for a family-friendly drama still. Remove any physical contact (hugs, kisses, touching, embraces), intimacy, nudity, bedrooms or violence; keep the same place, characters, mood and story meaning, implied through distance, posture, glances, props and light. Return only the rewritten prompt in English, max 80 words.',
    input: text
  });
  return r.output_text.trim();
}

// Si el filtro rechaza la escena: 1) se pide una versión sobria; 2) se reescribe el momento con un modelo de texto
async function generateScene(openai, series, scene, file, refs) {
  const tries = [
    async () => scenePrompt(series, scene, { refs }),
    async () => `${scenePrompt(series, scene, { refs })}\nKeep it tasteful and non-violent: imply the tension through expressions, light and composition.`,
    async () => scenePrompt(series, { ...scene, image_prompt: await softenScene(openai, scene.image_prompt) }, { refs })
  ];
  for (let i = 0; ; i++) {
    const prompt = await tries[i]();
    try { return { ...(await generate(openai, prompt, file, refs)), prompt, attempt: i + 1 }; }
    catch (e) {
      if (!isSafetyBlock(e) || i === tries.length - 1) throw e;
      log(`  aviso: ${path.basename(file)} rechazada por el filtro (intento ${i + 1}), reintento ${i === 0 ? 'sobrio' : 'con el momento reescrito'}\n`);
    }
  }
}

export async function portraits(series, { force = false } = {}) {
  const openai = new OpenAI({ apiKey: openaiKey() });
  const dir = charDir(series.slug), metaFile = path.join(dir, 'characters.json'), meta = readJson(metaFile, {});
  await pool(series.characters, 3, async (c) => {
    const file = path.join(dir, `${c.id}.jpg`);
    if (!force && fs.existsSync(file)) return;
    const r = await generate(openai, portraitPrompt(series, c), file, []);
    meta[c.id] = { file: path.basename(file), ...r, at: new Date().toISOString() };
    log(`  retrato ${c.name} · $${r.cost.toFixed(3)}\n`);
  });
  writeJson(metaFile, meta);
  return series.characters.map((c) => ({ id: c.id, name: c.name, file: path.join(dir, `${c.id}.jpg`) }));
}

export async function imagesEpisode(series, n, { force = false, refs = true, scene: only, concurrency = 3 } = {}) {
  if (!openaiKey()) throw new Error('Falta la clave de OpenAI (OPEN_AI u OPENAI_API_KEY en .env).');
  const openai = new OpenAI({ apiKey: openaiKey() });
  const ep = episode(series, n), dir = imageDir(series.slug, n);
  const metaFile = path.join(dir, 'images.json'), meta = readJson(metaFile, {});
  const people = refs ? await portraits(series) : [];
  const scenes = ep.scenes.filter((s) => !only || s.id === only);
  let spent = 0; const failed = [];
  await pool(scenes, concurrency, async (s) => {
    const file = path.join(dir, `${s.id}.jpg`);
    if (!force && fs.existsSync(file)) return;
    const sceneRefs = people.filter((p) => s.characters.includes(p.id));
    let r;
    try { r = await generateScene(openai, series, s, file, sceneRefs); }
    catch (e) { failed.push(`${s.id}: ${e.message.split('.')[0]}`); log(`  ERROR ${s.id}: ${e.message}\n`); return; }
    meta[s.id] = { file: path.basename(file), refs: sceneRefs.map((p) => p.id), model: MODELS.image, size: IMAGE_SIZE, quality: IMAGE_QUALITY, ...r, at: new Date().toISOString() };
    spent += r.cost;
    log(`  ${s.id} (${s.beat}) ${sceneRefs.length ? `con ${sceneRefs.map((p) => p.name).join(', ')}` : 'sin personajes'} · $${r.cost.toFixed(3)}\n`);
    writeJson(metaFile, meta);
  });
  writeJson(metaFile, meta);
  log(`Parte ${n}: ${scenes.length - failed.length}/${scenes.length} imagen/es listas · gastado ahora ≈ $${spent.toFixed(2)}\n`);
  if (failed.length) throw new Error(`No se pudieron generar: ${failed.join('; ')}. Edita su image_prompt en series.json y vuelve a ejecutar.`);
}

async function main() {
  const o = parseCli({
    series: { type: 'string' }, ep: { type: 'string' }, scene: { type: 'string' }, force: { type: 'boolean', default: false },
    refs: { type: 'boolean', default: true }, portraits: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' }
  });
  if (o.help) { console.log('Uso: npm run images -- [--series <slug>] [--ep 1|all] [--scene s3] [--force] [--no-refs] [--portraits (solo retratos)]'); return; }
  const series = loadSeries(o.series);
  if (o.portraits) { await portraits(series, { force: o.force }); return; }
  for (const n of parseEpisodes(o.ep, series.episodes.length)) await imagesEpisode(series, n, o);
}

run(import.meta.url, main);
