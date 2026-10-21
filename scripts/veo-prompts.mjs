// Prompts para series en formato Veo (clips de video con diálogo, hechos a mano en ChatGPT + Gemini):
//   «sheet»: hoja de personajes de referencia
//   «frame»: primer cuadro de cada clip (imagen, con la hoja como referencia)
//   «video»: animación de ese cuadro con diálogo y sonido
//   node scripts/veo-prompts.mjs --series la-boda-del-platano --ep 1 [--clip c02] [--kind frame|video|sheet]
import path from 'node:path';
import { parseCli, parseEpisodes, run } from './lib/cli.mjs';
import { SERIES_DIR, readJson } from './lib/series.mjs';

export const veoFile = (slug) => path.join(SERIES_DIR, slug, 'veo.json');

export function loadVeo(slug) {
  const s = readJson(veoFile(slug));
  if (!s) throw new Error(`No encuentro ${veoFile(slug)}`);
  return s;
}

const castOf = (s, ids) => ids.map((id) => {
  const c = s.characters.find((x) => x.id === id);
  if (!c) throw new Error(`Personaje desconocido «${id}»`);
  return c;
});

export function sheetPrompt(s) {
  return [
    `Character reference sheet for an animated series. ${s.style}`,
    'Plain light background, all characters standing side by side in a row, full body, front view, same scale, each one clearly separated, small name label under each one.',
    ...s.characters.map((c) => c.visual),
  ].join('\n');
}

export function framePrompt(s, clip) {
  return [
    `Using the character reference sheet exactly (same faces, colors, outfits and proportions), create the FIRST FRAME of a scene. ${s.style}`,
    `Setting: ${s.settings[clip.setting]}`,
    `Characters in shot: ${castOf(s, clip.cast).map((c) => c.visual).join(' ')}`,
    `Moment: ${clip.action.split('. ')[0]}.`,
    'Vertical 9:16 composition with the faces in the upper-middle of the frame. No text, no subtitles.',
  ].join('\n');
}

export function videoPrompt(s, clip) {
  const voices = castOf(s, [...new Set(clip.dialogue.map((d) => d.who))]).map((c) => `${c.name.toUpperCase()} voice: ${c.voice}.`);
  return [
    `Animate this image. Keep the characters exactly as they look in the image. ${s.style}`,
    `Action: ${clip.action}`,
    ...clip.dialogue.map((d) => `${castOf(s, [d.who])[0].name.toUpperCase()} says in Latin American Spanish: "${d.line}"`),
    ...voices,
    `Camera: ${clip.camera}`,
    `Sound: ${clip.sound}`,
  ].join('\n');
}

async function main() {
  const o = parseCli({ series: { type: 'string', default: 'la-boda-del-platano' }, ep: { type: 'string' }, clip: { type: 'string' }, kind: { type: 'string' } });
  const s = loadVeo(o.series);
  if (o.kind === 'sheet') { console.log(sheetPrompt(s)); return; }
  for (const n of parseEpisodes(o.ep, s.episodes.length)) {
    const ep = s.episodes.find((e) => e.number === n);
    for (const clip of ep.clips.filter((c) => !o.clip || c.id === o.clip)) {
      for (const kind of o.kind ? [o.kind] : ['frame', 'video']) {
        console.log(`\n===== Parte ${n} · ${clip.id} · ${kind} =====`);
        console.log(kind === 'frame' ? framePrompt(s, clip) : videoPrompt(s, clip));
      }
    }
  }
}

run(import.meta.url, main);
