#!/usr/bin/env node
// Vuelve a publicar un video ya generado (tabla «videos» de Supabase), por ejemplo uno que tuvo pocas vistas. Lo pide
// el bot («🎬 Videos» → 🔁 Reenviar) y lo lanza el relojero con republicar.yml: el trabajo «bajar» trae el MP4 del
// artefacto de su corrida original (30 días) a reenvio/video.mp4 y aquí se publica en las redes elegidas.
// Va con REENVIO=si: la guardia de duplicados lo deja pasar y el envío queda marcado como reenvío
// (scripts/lib/envios.mjs). Se publica una copia con otros metadatos (sin recodificar), no el archivo idéntico.
//   node scripts/republicar.mjs --video 12 [--dir reenvio] --facebook si --instagram si --youtube si --tiktok draft
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';
import { db } from './lib/db.mjs';
import { publishReel, facebookReady } from './facebook.mjs';
import { publishInstagramSeguro, instagramReady } from './instagram.mjs';
import { subirYouTube, youtubeReady } from './lib/youtube.mjs';
import { publishVideo } from './publish.mjs';
import { publicarEnlace, borrarEnlace } from './lib/video-link.mjs';
import { telegram, esc } from './lib/control.mjs';

const o = parseCli({ video: { type: 'string' }, dir: { type: 'string', default: 'reenvio' }, facebook: { type: 'string', default: 'no' }, instagram: { type: 'string', default: 'no' }, youtube: { type: 'string', default: 'no' }, tiktok: { type: 'string', default: 'no' } });
process.env.REENVIO = 'si';

async function main() {
  const v = await db('video-de', { id: o.video });
  if (!v) throw new Error(`No encuentro el video ${o.video} en Supabase`);
  const origen = path.join(ROOT, o.dir, 'video.mp4');
  if (!fs.existsSync(origen)) throw new Error(`No llegó el MP4 del video ${o.video} (${o.dir}/video.mp4)`);
  process.env.HUELLA_FORZADA = v.huella; // las vistas del reenvío se suman al mismo video
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  const video = path.join(ROOT, 'out', `reenvio-${v.id}.mp4`);
  const ff = spawnSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', origen, '-c', 'copy', '-map_metadata', '-1', '-metadata', `comment=potter-play reenvio ${Date.now()}`, '-movflags', '+faststart', video]);
  if (ff.status !== 0) { console.error(`Aviso: ffmpeg: ${String(ff.stderr).slice(0, 300)}; va el archivo tal cual`); fs.copyFileSync(origen, video); }
  const texto = v.descripcion || v.titulo || '';
  const meta = { title: v.titulo, reenvio: { video: v.id, de: v.creado }, post: { text: texto } };
  console.log(`Reenvío de «${v.titulo}» (video ${v.id}, ${v.formato || 'sin formato'}, del ${String(v.creado).slice(0, 10)})`);

  if (o.facebook === 'si' && facebookReady()) { try { meta.facebook = await publishReel({ video, description: texto }); } catch (e) { meta.facebook = { status: 'error', error: e.message }; } }
  if (o.instagram === 'si' && await instagramReady()) {
    const l = await publicarEnlace(video).catch(() => null);
    meta.instagram = l ? await publishInstagramSeguro({ tipo: 'reel', url: l.url, caption: texto }) : { status: 'error', error: 'sin enlace público (Blob)' };
    if (l) await borrarEnlace(l.url);
  }
  if (o.youtube === 'si' && youtubeReady()) {
    try { meta.youtube = await subirYouTube({ file: video, titulo: `${(v.titulo || 'Potter Play').replace(/#\S+/g, '').trim().slice(0, 88)} #Shorts`, descripcion: `${texto}\n\n🔔 Suscríbete a Potter Play.` }); }
    catch (e) { meta.youtube = { status: 'error', error: e.message }; }
  }
  if (o.tiktok === 'draft') { try { meta.tiktok = [await publishVideo({ video, mode: 'draft', coverMs: 0 })]; } catch (e) { meta.tiktok = [{ status: 'error', error: e.message }]; } }
  fs.writeFileSync(video.replace(/\.mp4$/, '.json'), JSON.stringify(meta, null, 2) + '\n');

  const estado = (r) => !r ? null : r.status === 'error' ? `❌ ${r.error}` : r.duplicado ? '⏭️ ya estaba' : '✅';
  const lineas = [['Facebook', meta.facebook], ['Instagram', meta.instagram], ['YouTube', meta.youtube && { ...meta.youtube, status: meta.youtube.status || 'ok' }], ['TikTok', meta.tiktok?.[0]]].filter(([, r]) => r).map(([n, r]) => `${n}: ${estado(r)}`);
  console.log(lineas.join('\n'));
  await telegram(`🔁 <b>Reenvío</b> de «${esc(v.titulo || '')}»\n${esc(lineas.join('\n') || 'No salió en ninguna red (¿redes vacías?)')}`).catch(() => {});
  if (lineas.length && lineas.every((l) => l.includes('❌'))) process.exit(1);
}

main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
