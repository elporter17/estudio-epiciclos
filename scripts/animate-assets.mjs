#!/usr/bin/env node
// Recursos para animar una serie «recortada» (scripts/animate.mjs): personajes en varias poses con fondo transparente,
// objetos sueltos y fondos sin gente. El estilo sale de series.visual_style; los personajes usan su retrato como referencia.
//   node --env-file=.env scripts/animate-assets.mjs --series papi-a-la-orden [--only papi_run,bg_playa] [--force]
import fs from 'node:fs';
import path from 'node:path';
import OpenAI, { toFile } from 'openai';
import { parseCli, pool } from './lib/cli.mjs';
import { MODELS, openaiKey, log } from './lib/env.mjs';
import { loadSeries, charDir, OUT_DIR } from './lib/series.mjs';
import { imageCost } from './lib/pricing.mjs';

const SPRITE = 'ONE single full-body figure, centered, the entire body visible from head to feet, no background, no ground shadow, no text. Keep the face, hair, clothes and shoes exactly as in the reference.';
// id → [personaje, pose]
const SPRITES = {
  papi_fist: ['papi', 'Standing, one fist raised, proud closed-mouth smile.'],
  papi_run: ['papi', 'Running mid-stride leaning forward, one arm pumping a fist in the air, the other hand holding a smartphone, mouth closed, happy eyes.'],
  papi_flag: ['papi', 'Standing heroically with a large Honduran flag (blue-white-blue stripes with five small blue stars) held high in one hand and the other fist raised, proud closed-mouth smile.'],
  papi_shrug: ['papi', 'Shrugging with both palms turned up, eyebrows raised, small proud closed-mouth smile.'],
  chepe_shock: ['chepe', 'Hands on both cheeks, eyes huge and eyebrows raised in amazement, mouth closed.'],
  chepe_cheer: ['chepe', 'Both arms raised high cheering happily, big closed-mouth smile.'],
  chepe_proud: ['chepe', 'Hands on hips, chin up, proud closed-mouth smile.'],
  chepe_bed: ['chepe', 'Sitting up, a dark blanket covering his legs, messy hair, tired grumpy face, mouth closed; only the upper body and the blanket visible.'],
  amigo_arms: ['amigo', 'Standing with arms crossed, nose in the air, smug closed-mouth smile.']
};
const PROP = 'Single object or group, centered, entire subject visible, no background, no ground shadow, no text.';
const PROPS = {
  nave: 'A small sleek futuristic flying car with a glowing blue underside, side view. ',
  rapidito: 'A cheerful white minibus with a blue stripe and a smiling driver, side view, polite and clean. ',
  abuelita: 'A smiling grandmother in a purple blouse and long blue skirt carrying a brown bag, walking, side view, full body. ',
  pollo: 'A cartoon fried-chicken mascot with big friendly eyes and a red apron, standing, mouth closed, full body. ',
  graduados: 'A group of five cartoon kids in navy graduation gowns and caps holding small diplomas, smiling, full body. '
};
const BG = 'No people, no text, no letters. Vertical 9:16, the lower third calm and simple (subtitles go there).';
const BGS = {
  bg_balcon: 'View from a small apartment balcony at sunrise over a perfectly smooth, spotless, empty boulevard lined with palm trees; the metal balcony railing is in the lower foreground.',
  bg_playa: 'A tropical beach with turquoise sea, coconut palms and a wide empty stretch of sand in the foreground, bright blue sky.',
  bg_ciudad: 'Futuristic Tegucigalpa skyline at golden hour: gleaming glass skyscrapers rising from green hills, one super-tall tower with a Honduran flag on top, no vehicles in the sky.',
  bg_sps: 'A clean San Pedro Sula street with a modern elevated train track above, a wide white crosswalk and tidy sidewalks, palm trees and mountains behind, no people and no vehicles.',
  bg_sala: 'A cozy living room with a lit table lamp, a sofa and a TV showing a football match, warm evening light, no people.',
  bg_hospital: 'Split scene: on the left a bright modern hospital pharmacy with shelves completely full of medicine boxes; on the right a school building with a solid red roof and a green yard. No people.',
  bg_colina: 'A rocky hilltop at sunset with a huge orange and purple sky and a green valley far below, no fireworks, no people.',
  bg_noche: 'A dark bedroom at night: a bed with messy sheets, a nightstand with a glowing phone alarm, and a window showing a big pothole in the street under a dim streetlight. No people.',
  bg_hoyo: 'A dusty colorful Honduran street with low pastel houses, power lines and one large pothole filled with muddy water in the foreground, bright afternoon sun, no people.'
};

async function main() {
  const o = parseCli({ series: { type: 'string' }, only: { type: 'string' }, force: { type: 'boolean', default: false } });
  const series = loadSeries(o.series), dir = path.join(OUT_DIR, series.slug, 'anim');
  const openai = new OpenAI({ apiKey: openaiKey() });
  const only = o.only ? new Set(o.only.split(',')) : null;
  const style = `Visual style: ${series.visual_style}`;
  const jobs = [];
  const add = (id, sub, fn) => { const file = path.join(dir, sub, `${id}.png`); if ((!only || only.has(id)) && (o.force || !fs.existsSync(file))) jobs.push({ id, file, fn }); };
  for (const [id, [cid, pose]] of Object.entries(SPRITES)) add(id, 'sprites', async () => {
    const ref = await toFile(fs.readFileSync(path.join(charDir(series.slug), `${cid}.jpg`)), `${cid}.jpg`, { type: 'image/jpeg' });
    return openai.images.edit({ model: MODELS.image, image: [ref], prompt: `${style}\n${SPRITE}\nPose: ${pose}`, size: '1024x1536', quality: 'medium', background: 'transparent', output_format: 'png' });
  });
  for (const [id, text] of Object.entries(PROPS)) add(id, 'props', () => openai.images.generate({ model: MODELS.image, prompt: `${style}\n${text}${PROP}`, size: '1024x1024', quality: 'medium', background: 'transparent', output_format: 'png' }));
  for (const [id, text] of Object.entries(BGS)) add(id, 'bg', () => openai.images.generate({ model: MODELS.image, prompt: `${style}\n${text} ${BG}`, size: '1088x1920', quality: 'medium', output_format: 'png' }));
  let total = 0;
  await pool(jobs, 4, async (j) => {
    for (let k = 0; k < 2; k++) {
      try {
        const r = await j.fn();
        fs.mkdirSync(path.dirname(j.file), { recursive: true });
        fs.writeFileSync(j.file, Buffer.from(r.data[0].b64_json, 'base64'));
        const c = imageCost(r.usage); total += c; log(`  ${j.id} · $${c.toFixed(3)}\n`); return;
      } catch (e) { log(`  ${j.id}: ${e.message.slice(0, 140)}${k ? '' : ' (reintento)'}\n`); }
    }
  });
  log(`Listo: ${jobs.length} recursos, ≈ $${total.toFixed(2)}\n`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
