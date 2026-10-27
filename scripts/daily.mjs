#!/usr/bin/env node
// Un video listo para publicar: elige figura (pick) → renderiza (render) → escribe la descripción (caption)
// → anota el historial. Deja en out/ el .mp4 y un .json con todo, incluido el texto del post.
// Todo sale del proyecto (matemática, fuentes y plantillas): no usa IA ni APIs de pago.
//
// Por defecto, en modo suspenso: solo figuras complejas, sin imagen de guía mientras dibuja y sin
// decir qué figura es (ni en el video ni en la descripción). --spoiler vuelve al modo anterior.
//
//   npm run daily -- --lang es
//   npm run daily -- --publish direct                       (público, con descripción)
//   npm run daily -- --publish direct --privacy SELF_ONLY   (solo tú lo ves)
//   npm run daily -- --publish draft                        (a la bandeja; la descripción se pega a mano)
import { parseCli } from './lib/cli.mjs';
import { pickNext, readHistory, recordPick } from './pick.mjs';
import { renderVideo } from './render.mjs';
import { renderBounce } from './bounce.mjs';
import { renderArte } from './arte.mjs';
import { ARTE_MODES, styleHook } from '../src/nombres-arte.js';
import { famosoHook, coverText } from '../src/captions.js';
// Los videos de TikTok empiezan con forma (N = 8) en vez de casi vacíos (N = 1): mejor vista previa y mejores primeros segundos
const NSEQ_TIKTOK = '8, 20, 50, 120, 250, 500';
import { makeCaption, postText } from './caption.mjs';
import { publishVideo } from './publish.mjs';
import { accessToken } from './lib/tiktok.mjs';
import { setupNode } from './lib/node-env.mjs';
import { NSEQ_DETAIL } from '../src/engine.js';
import { fisicaCat } from '../src/fisica.js';
import fs from 'node:fs';

try {
  const o = parseCli({
    lang: { type: 'string', default: 'es' }, fps: { type: 'string', default: '30' }, labels: { type: 'string', default: 'full' },
    seed: { type: 'string' }, 'dry-run': { type: 'boolean', default: false }, publish: { type: 'string' },
    privacy: { type: 'string', default: 'PUBLIC_TO_EVERYONE' }, spoiler: { type: 'boolean', default: false }, nseq: { type: 'string' },
    // Categorías a elegir, separadas por comas (por ejemplo «pelotas,juegos»); sin esto, todas
    cats: { type: 'string' },
    // Estilos de nombre permitidos, separados por comas; «nuevos» = espejo, mandala, hilos, anillos y costura
    estilos: { type: 'string' },
    // Sin sonido: pelotas, juegos, hilos, anillos y costura salen con audio en silencio (los epiciclos ya lo son)
    mute: { type: 'boolean', default: false }
  });
  const cats = o.cats ? o.cats.split(',').map((c) => c.trim()).filter(Boolean) : undefined;
  if (o.publish && !['draft', 'direct'].includes(o.publish)) throw new Error('--publish debe ser draft o direct');
  if (o.publish) await accessToken(); // falla antes de renderizar si la cuenta no está conectada
  const suspense = !o.spoiler;
  const { emoji } = setupNode();
  const estilos = o.estilos === 'nuevos' ? ['espejo', 'mandala', 'hilos', 'anillos', 'costura'] : o.estilos ? o.estilos.split(',').map((s) => s.trim()) : undefined;
  const item = pickNext({ history: readHistory(), emoji: !!emoji, complex: suspense, cats, styles: estilos, seed: o.seed != null ? Number(o.seed) >>> 0 : undefined });
  const style = item.style && item.style !== 'clasico' ? item.style : null;
  // Portada en el primer cuadro (nombres, parejas y famosos): el dibujo avanzado con una pregunta grande
  const cover = ['nombres', 'combinaciones', 'famosos'].includes(item.cat) ? coverText(item.cat, item.tipo, o.lang) : undefined;
  console.error(`Elegido: ${item.name || item.type} (${item.group}${style ? `, estilo ${style}` : ''})`);
  // Física (pelotas y juegos) y nombres con hilos o anillos: su propio render, con sonido; lo demás, el dibujo con
  // epiciclos (espejo y mandala también, con una sola cadena de círculos para que la figura salga grande)
  const r = item.kind === 'bounce'
    ? await renderBounce({ mode: item.mode, seed: item.seed, lang: o.lang, fps: o.fps, mute: o.mute })
    : ARTE_MODES.includes(style)
    ? await renderArte({ mode: style, text: item.text, font: item.font, name: item.name, nameEn: item.nameEn, id: item.id, seed: item.seed, lang: o.lang, fps: o.fps, mute: o.mute, cover, pair: item.cat === 'combinaciones' })
    : await renderVideo({
      preset: item.kind === 'preset' ? item.name : undefined, random: item.kind === 'random' ? item.type : undefined,
      ...(item.kind === 'text' ? { text: item.text, font: item.font, name: item.name, nameEn: item.nameEn } : {}),
      ...(style ? { variant: style, style: 'z', caption: styleHook(style, o.lang, item.seed, item.cat === 'combinaciones') } : {}),
      // Famosos: la silueta con una sola cadena de círculos y el nombre del jugador al final
      ...(item.kind === 'image' ? { image: item.image, name: item.name, nameEn: item.nameEn, revealText: item.name, style: 'z', caption: famosoHook(item.tipo, o.lang, item.seed) } : {}),
      seed: item.seed, lang: o.lang, fps: o.fps, labels: o.labels,
      ...(suspense ? { guide: 0, spoiler: false, nseq: o.nseq || (cover ? NSEQ_TIKTOK : NSEQ_DETAIL) } : o.nseq ? { nseq: o.nseq } : {}),
      cover
    });
  // La categoría (nombres, parejas, pelotas, juegos…) elige ganchos propios para la descripción
  const cat = item.kind === 'bounce' ? fisicaCat(item.mode) : item.kind === 'image' ? `${item.cat}-${item.tipo}` : style ? `${item.cat}-${style}` : item.cat;
  const cap = makeCaption({ ...r.info, cat }, { lang: o.lang, spoiler: !suspense });
  const meta = { ...r.info, cat: item.cat, post: { ...cap, text: postText(cap), lang: o.lang } };
  fs.writeFileSync(r.sidecar, JSON.stringify(meta, null, 2) + '\n');
  if (!o['dry-run']) recordPick(item, { lang: o.lang, file: meta.file, ...(item.style ? { style: item.style } : {}) });
  let tiktok = null;
  // En suspenso la portada es un cuadro a mitad del dibujo, no la figura terminada
  if (o.publish) {
    try { tiktok = await publishVideo({ video: r.out, mode: o.publish, privacy: o.privacy, coverMs: r.info.cover ? 0 : suspense ? r.info.duration * 450 : undefined }); }
    catch (e) {
      // Límite de borradores pendientes (5 cada 24 h por cuenta): el video queda como artefacto y la corrida no falla
      if (!/spam_risk|pending/i.test(`${e.code || ''} ${e.message}`)) throw e;
      tiktok = { mode: o.publish, status: 'LIMIT', fail_reason: e.message, at: new Date().toISOString() };
      meta.tiktok = [...(meta.tiktok || []), tiktok]; fs.writeFileSync(r.sidecar, JSON.stringify(meta, null, 2) + '\n');
      console.error(`Aviso: TikTok no aceptó más borradores por ahora (${e.message}). El video queda como artefacto de la corrida.`);
    }
  }
  console.log(JSON.stringify({ video: r.out, meta: r.sidecar, post: meta.post.text, tiktok }, null, 2));
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
