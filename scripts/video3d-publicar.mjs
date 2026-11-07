#!/usr/bin/env node
// Publica el video 3D que dejó listo el render nocturno (scripts/video3d-render.mjs): Reel en Facebook e Instagram,
// borrador en TikTok y Short privado en YouTube. Deja out/video3d-<id>.json para el aviso de Telegram (TikTok y YouTube
// necesitan tu intervención) y marca el guion como publicado.
//   node --env-file=.env scripts/video3d-publicar.mjs [--tiktok no] [--youtube no]
import fs from 'node:fs';
import path from 'node:path';
import './lib/env-file.mjs';
import { parseCli } from './lib/cli.mjs';
import { publicarProximos } from './lib/proximos.mjs';
import { ROOT } from './lib/node-env.mjs';
import { borrarEnlace } from './lib/video-link.mjs';
import { publishReel, facebookReady } from './facebook.mjs';
import { publishInstagramSeguro, instagramReady } from './instagram.mjs';
import { publishVideo } from './publish.mjs';
import { logUpload } from './tiktok-status.mjs';
import { subirYouTube, youtubeReady } from './lib/youtube.mjs';
import { registrarRespuesta } from './lib/respuestas.mjs';
import { leerEstado, guardarEstado, avisoExtra, textoPost, hoyHN, DIR_COLA } from './lib/video3d-cola.mjs';

const o = parseCli({ turno: { type: 'string', default: 'mediodia' }, tiktok: { type: 'string', default: 'si' }, youtube: { type: 'string', default: 'si' } });
const estado = leerEstado(), turno = o.turno === 'tarde' ? 'tarde' : 'mediodia', l = estado.listos[turno];
if (!l) { avisoExtra(`⚠️ Videos 3D: no hay video listo para el turno de ${turno === 'tarde' ? 'la tarde' : 'mediodía'} (${hoyHN()}). Revisa el render de la madrugada.`); console.log('Nada listo'); process.exit(0); }
const g = JSON.parse(fs.readFileSync(path.join(DIR_COLA, l.archivo), 'utf8')), texto = textoPost(g);
console.error(`Publicando: ${l.titulo}${l.fecha !== hoyHN() ? ` (renderizado para ${l.fecha})` : ''}`);

// El video desde el almacén (Facebook y TikTok lo suben desde un archivo; Instagram lo toma de la URL)
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
const video = path.join(ROOT, 'out', `video3d-${l.id}.mp4`);
if (!fs.existsSync(video)) { const r = await fetch(l.download || l.url); if (!r.ok) throw new Error(`No se pudo bajar el video (${r.status})`); fs.writeFileSync(video, Buffer.from(await r.arrayBuffer())); }
const meta = { kind: 'video3d', title: l.titulo, file: path.basename(video), duration: l.duracion, videoUrl: l.url, videoDownload: l.download, post: { text: texto }, createdAt: new Date().toISOString() };

if (facebookReady()) { try { meta.facebook = await publishReel({ video, description: texto }); } catch (e) { meta.facebook = { status: 'error', error: e.message }; console.error(`Aviso: Facebook: ${e.message}`); } }
registrarRespuesta({ red: 'facebook', id: meta.facebook?.video_id, clave: { modo: 'charla' }, titulo: l.titulo });
if (await instagramReady()) { meta.instagram = await publishInstagramSeguro({ tipo: 'reel', url: l.url, caption: texto }); registrarRespuesta({ red: 'instagram', id: meta.instagram.media_id, clave: { modo: 'charla' }, titulo: l.titulo }); }
if (o.tiktok !== 'no') {
  try { meta.tiktok = [await publishVideo({ video, mode: 'draft', coverMs: 0 })]; }
  catch (e) { meta.tiktok = [{ mode: 'draft', status: /spam_risk|pending/i.test(e.message) ? 'LIMIT' : 'error', fail_reason: e.message }]; console.error(`Aviso: TikTok: ${e.message}`); }
  logUpload({ at: new Date().toISOString(), title: l.titulo, publish_id: meta.tiktok[0]?.publish_id || null, status: meta.tiktok[0]?.status, run: process.env.GITHUB_RUN_ID || null });
}
if (o.youtube !== 'no' && youtubeReady()) {
  try { meta.youtube = await subirYouTube({ file: video, titulo: `${l.titulo} #Shorts`, descripcion: `${texto}\n\n🔔 Suscríbete a Potter Play: un dato nuevo cada día.`, etiquetas: [...(texto.match(/#[\p{L}\d_]+/gu) || []).map((x) => x.slice(1)), 'datos curiosos', 'shorts', 'potter play'] }); }
  catch (e) { meta.youtube = { status: 'error', error: e.message }; console.error(`Aviso: YouTube: ${e.message}`); }
}
fs.writeFileSync(path.join(ROOT, 'out', `video3d-${l.id}.json`), JSON.stringify(meta, null, 2) + '\n');
// Publicado: fuera de la cola y fuera del almacén (Instagram ya lo copió)
if (meta.facebook?.status !== 'error' || meta.instagram?.status === 'published') {
  estado.publicados.push({ id: l.id, fecha: hoyHN(), turno }); estado.listos[turno] = null; guardarEstado(estado); await publicarProximos();
  await borrarEnlace(l.url).catch(() => {});
}
console.log(JSON.stringify({ titulo: l.titulo, facebook: meta.facebook?.status, instagram: meta.instagram?.status, tiktok: meta.tiktok?.[0]?.status, youtube: meta.youtube?.estado || meta.youtube?.error }, null, 2));
