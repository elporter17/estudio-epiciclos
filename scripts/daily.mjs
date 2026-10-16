#!/usr/bin/env node
// Un video listo para publicar: elige figura (pick) → renderiza (render) → escribe la descripción (caption)
// → anota el historial. Deja en out/ el .mp4 y un .json con todo, incluido el texto del post.
//
//   npm run daily -- --lang es
//   npm run daily -- --publish draft   (o direct: privado SELF_ONLY mientras la app no esté auditada)
import { parseCli } from './lib/cli.mjs';
import { pickNext, readHistory, recordPick } from './pick.mjs';
import { renderVideo } from './render.mjs';
import { makeCaption, postText } from './caption.mjs';
import { publishVideo } from './publish.mjs';
import { accessToken } from './lib/tiktok.mjs';
import { setupNode } from './lib/node-env.mjs';
import fs from 'node:fs';

try {
  const o = parseCli({
    lang: { type: 'string', default: 'es' }, fps: { type: 'string', default: '30' }, labels: { type: 'string', default: 'full' },
    seed: { type: 'string' }, 'dry-run': { type: 'boolean', default: false }, publish: { type: 'string' }
  });
  if (o.publish && !['draft', 'direct'].includes(o.publish)) throw new Error('--publish debe ser draft o direct');
  if (o.publish) await accessToken(); // falla antes de renderizar si la cuenta no está conectada
  const { emoji } = setupNode();
  const item = pickNext({ history: readHistory(), emoji: !!emoji, seed: o.seed != null ? Number(o.seed) >>> 0 : undefined });
  console.error(`Elegido: ${item.name || item.type} (${item.group})`);
  const r = await renderVideo({
    preset: item.kind === 'preset' ? item.name : undefined, random: item.kind === 'random' ? item.type : undefined,
    seed: item.seed, lang: o.lang, fps: o.fps, labels: o.labels
  });
  const cap = await makeCaption(r.info, { lang: o.lang });
  const meta = { ...r.info, post: { ...cap, text: postText(cap), lang: o.lang } };
  fs.writeFileSync(r.sidecar, JSON.stringify(meta, null, 2) + '\n');
  if (!o['dry-run']) recordPick(item, { lang: o.lang, file: meta.file });
  let tiktok = null;
  if (o.publish) tiktok = await publishVideo({ video: r.out, mode: o.publish });
  console.log(JSON.stringify({ video: r.out, meta: r.sidecar, post: meta.post.text, tiktok }, null, 2));
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
