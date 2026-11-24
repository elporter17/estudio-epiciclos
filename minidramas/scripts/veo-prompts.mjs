// Prompts para series en formato Veo (clips de video con diálogo, hechos a mano en ChatGPT + Gemini):
//   «sheet»: hoja de personajes de referencia
//   «frame»: primer cuadro de cada clip (imagen, en la conversación de ChatGPT que ya tiene la hoja)
//   «video»: animación de ese cuadro con diálogo y sonido (Gemini → Crear vídeo, o Flow con Veo 3.1 Quality)
//   node scripts/veo-prompts.mjs --series la-boda-del-platano --ep 1 [--clip c02] [--kind frame|video|sheet]
//   node scripts/veo-prompts.mjs --ep 2-5 --md series/la-boda-del-platano/GUIA.md   (guía paso a paso)
import fs from 'node:fs';
import path from 'node:path';
import { parseCli, parseEpisodes, run } from './lib/cli.mjs';
import { ROOT } from './lib/env.mjs';
import { SERIES_DIR, epDir, readJson } from './lib/series.mjs';

export const veoFile = (slug) => path.join(SERIES_DIR, slug, 'veo.json');
const CLIP_SECONDS = 8; // Flow da 8 s y Gemini unos 10 s: el diálogo se reparte en 8 para que quepa en los dos

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
const nameOf = (s, id) => castOf(s, [id])[0].name.toUpperCase();

export function sheetPrompt(s) {
  return [
    `Character reference sheet for an animated series. ${s.style}`,
    'Plain light background, all characters standing side by side in a row, full body, front view, same scale, each one clearly separated, small name label under each one.',
    ...s.characters.map((c) => c.visual),
  ].join('\n');
}

// Va en la conversación de ChatGPT que ya tiene la hoja de personajes
export function framePrompt(s, n, clip) {
  return [
    `Frame ${n}-${clip.id.slice(1)}: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.`,
    `Setting: ${s.settings[clip.setting]}`,
    `Characters in shot: ${castOf(s, clip.cast).map((c) => c.visual).join(' ')}`,
    `Moment: ${clip.action.split('. ')[0].replace(/\.$/, '')}.`,
    'Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.',
  ].join('\n');
}

// Reparte las líneas en los 8 s según cuántas palabras tiene cada una
function timeline(lines) {
  const words = lines.map((d) => d.line.trim().split(/\s+/).length), total = words.reduce((a, b) => a + b, 0);
  let t = 0;
  return lines.map((d, i) => {
    const end = i === lines.length - 1 ? CLIP_SECONDS : Math.max(t + 2, Math.round(t + (CLIP_SECONDS * words[i]) / total));
    const span = `${t}-${end} s`; t = end;
    return { ...d, span };
  });
}

// Lo que mejor funcionó con Veo: repetir que todos son frutas, describir de nuevo a cada personaje
// y repartir el diálogo por segundos
export function videoPrompt(s, clip) {
  const cast = castOf(s, clip.cast);
  const speakers = castOf(s, [...new Set(clip.dialogue.map((d) => d.who))]);
  return [
    'Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.',
    'IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.',
    `Characters: ${cast.map((c) => c.visual).join(' ')}`,
    `Setting: ${s.settings[clip.setting]}`,
    `Action: ${clip.action}`,
    `Timeline: ${timeline(clip.dialogue).map((d) => `${d.span}: ${nameOf(s, d.who)} says in Latin American Spanish with clear lip-sync: "${d.line}"`).join(' ')}`,
    'Every line must be spoken completely, word for word, and nothing else is said.',
    `Voices: ${speakers.map((c) => `${c.name} ${c.voice}`).join('; ')}.`,
    `Camera: ${clip.camera}`,
    `Sound: ${clip.sound} No subtitles, no on-screen text.`,
  ].join('\n');
}

function guide(s, eps) {
  const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
  const out = [
    `# ${s.title}: guía para generar los clips a mano`,
    '',
    `Se genera con \`node scripts/veo-prompts.mjs --ep ${eps.join(',')} --md …\`. Si cambias \`veo.json\`, vuelve a generarla.`,
    '',
    '## Pasos por clip',
    '1. **Cuadro** (si no está hecho): en la conversación de ChatGPT que ya tiene la hoja de personajes, pega el prompt «Cuadro». Descarga la imagen y ejecuta el comando `--frame` que va debajo (toma la imagen más reciente de Descargas y la guarda en su lugar).',
    '2. **Video**: en Gemini, Herramientas → Crear vídeo → Vertical (9:16). Adjunta el cuadro del clip y pega el prompt «Video». Si Gemini ya no te deja, usa Flow con **Veo 3.1 Quality** (pídelo en el mensaje).',
    '3. Revisa el video: que todos sean frutas, que se digan las líneas completas y que los personajes se parezcan al cuadro. Si algo falla, genéralo de nuevo.',
    '4. Descárgalo y ejecuta el comando `--video` que va debajo.',
    `5. Con los 6 clips de una parte: \`node scripts/veo-assemble.mjs --ep N\` y revisa \`out/${s.slug}/${s.slug}-parte-N.mp4\`.`,
    '6. Para subirla como borrador: `node scripts/publish.mjs --video out/' + s.slug + '/' + s.slug + '-parte-N.mp4 --mode draft`.',
    '',
  ];
  for (const n of eps) {
    const ep = s.episodes.find((e) => e.number === n);
    out.push(`## Parte ${n}: «${ep.title}»`, '');
    for (const clip of ep.clips) {
      const dir = epDir(s.slug, n);
      const frame = ['png', 'jpg', 'jpeg', 'webp'].map((x) => path.join(dir, 'frames', `${clip.id}.${x}`)).find((f) => fs.existsSync(f));
      const video = path.join(dir, 'clips', `${clip.id}.mp4`);
      out.push(`### ${n}-${clip.id.slice(1)} · ${clip.dialogue.map((d) => `${castOf(s, [d.who])[0].name}: «${d.line}»`).join(' / ')}`, '');
      if (fs.existsSync(video)) { out.push(`Listo: \`${rel(video)}\``, ''); continue; }
      if (frame) out.push(`**Cuadro:** ya está en \`${rel(frame)}\``, '');
      else out.push('**Cuadro** (ChatGPT):', '', '```text', framePrompt(s, n, clip), '```', '', '```bash', `node scripts/veo-import.mjs --ep ${n} --clip ${clip.id} --frame`, '```', '');
      out.push('**Video** (Gemini o Flow):', '', '```text', videoPrompt(s, clip), '```', '', '```bash', `node scripts/veo-import.mjs --ep ${n} --clip ${clip.id} --video`, '```', '');
    }
  }
  return out.join('\n');
}

async function main() {
  const o = parseCli({
    series: { type: 'string', default: 'la-boda-del-platano' }, ep: { type: 'string' }, clip: { type: 'string' },
    kind: { type: 'string' }, md: { type: 'string' }
  });
  const s = loadVeo(o.series);
  if (o.kind === 'sheet') { console.log(sheetPrompt(s)); return; }
  const eps = parseEpisodes(o.ep, s.episodes.length);
  if (o.md) { fs.writeFileSync(path.resolve(o.md), guide(s, eps)); console.log(`Guía: ${o.md}`); return; }
  for (const n of eps) {
    const ep = s.episodes.find((e) => e.number === n);
    for (const clip of ep.clips.filter((c) => !o.clip || c.id === o.clip)) {
      for (const kind of o.kind ? [o.kind] : ['frame', 'video']) {
        console.log(`\n===== Parte ${n} · ${clip.id} · ${kind} =====`);
        console.log(kind === 'frame' ? framePrompt(s, n, clip) : videoPrompt(s, clip));
      }
    }
  }
}

run(import.meta.url, main);
