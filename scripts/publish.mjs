#!/usr/bin/env node
// Sube un video a TikTok con la Content Posting API oficial (FILE_UPLOAD).
//   draft  → llega a la bandeja de TikTok como borrador para terminarlo en la app (permiso video.upload)
//   direct → se publica directo; mientras la app no esté auditada, solo como privado SELF_ONLY (video.publish)
//
//   npm run publish -- --video out/circularte-violin-en.mp4 --mode draft
//   npm run publish -- --video out/circularte-violin-en.mp4 --mode direct
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCli } from './lib/cli.mjs';
import { accessToken, api, chunkPlan, uploadFile, waitForStatus } from './lib/tiktok.mjs';

const MIME = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm' };

// Texto del post: el que dejó caption/daily en el .json, o el texto gancho y el nombre como respaldo
function postTitle(meta) {
  if (meta?.post?.text) return meta.post.text;
  if (meta) return [meta.caption, meta.title].filter(Boolean).join(' · ');
  return '';
}

export async function publishVideo({ video, mode = 'draft', privacy = 'SELF_ONLY', title, log = (m) => process.stderr.write(m) }) {
  if (!['draft', 'direct'].includes(mode)) throw new Error('--mode debe ser draft o direct');
  const file = path.resolve(video);
  if (!fs.existsSync(file)) throw new Error(`No existe el video ${file}`);
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error('TikTok acepta MP4, MOV o WebM.');
  const sidecar = file.replace(/\.[^.]+$/, '') + '.json';
  const meta = fs.existsSync(sidecar) ? JSON.parse(fs.readFileSync(sidecar, 'utf8')) : null;
  const size = fs.statSync(file).size, plan = chunkPlan(size);
  const token = await accessToken();

  let init, text = '';
  if (mode === 'draft') {
    // Bandeja: máximo 5 borradores pendientes cada 24 h; la descripción se escribe en la app
    init = await api('/v2/post/publish/inbox/video/init/', { source_info: { source: 'FILE_UPLOAD', ...plan } }, token);
  } else {
    const info = await api('/v2/post/publish/creator_info/query/', undefined, token);
    if (!info.privacy_level_options?.includes(privacy)) throw new Error(`La cuenta no permite privacidad ${privacy} (opciones: ${info.privacy_level_options?.join(', ')})`);
    if (meta?.duration && info.max_video_post_duration_sec && meta.duration > info.max_video_post_duration_sec) {
      throw new Error(`El video dura ${Math.round(meta.duration)} s y la cuenta permite hasta ${info.max_video_post_duration_sec} s.`);
    }
    text = (title ?? postTitle(meta)).slice(0, 2200);
    log(`Publicando como @${info.creator_username} con privacidad ${privacy}\n`);
    init = await api('/v2/post/publish/video/init/', {
      post_info: {
        title: text, privacy_level: privacy,
        disable_comment: !!info.comment_disabled, disable_duet: !!info.duet_disabled, disable_stitch: !!info.stitch_disabled,
        video_cover_timestamp_ms: meta?.duration ? Math.max(0, Math.round(meta.duration * 1000) - 1500) : undefined,
        brand_content_toggle: false, brand_organic_toggle: false
      },
      source_info: { source: 'FILE_UPLOAD', ...plan }
    }, token);
  }
  log(`Subiendo ${path.basename(file)} (${(size / 1e6).toFixed(1)} MB, ${plan.total_chunk_count} trozo/s)…\n`);
  await uploadFile(init.upload_url, file, plan, mime, log);
  const st = await waitForStatus(init.publish_id, token, { until: mode === 'draft' ? ['SEND_TO_USER_INBOX', 'PUBLISH_COMPLETE', 'FAILED'] : ['PUBLISH_COMPLETE', 'FAILED'], log });

  const result = { mode, publish_id: init.publish_id, status: st.status, fail_reason: st.fail_reason || null, privacy: mode === 'direct' ? privacy : null, at: new Date().toISOString() };
  if (meta) { meta.tiktok = [...(meta.tiktok || []), result]; fs.writeFileSync(sidecar, JSON.stringify(meta, null, 2) + '\n'); }
  if (st.status === 'FAILED') throw new Error(`TikTok rechazó el video: ${st.fail_reason || 'sin motivo'}`);
  if (st.timedOut) log('TikTok sigue procesando; revisa la app en unos minutos.\n');
  if (mode === 'draft') {
    log('Listo: abre TikTok, toca la notificación del borrador y termina la publicación.\n');
    const t = postTitle(meta); if (t) log(`Descripción sugerida para pegar en la app:\n\n${t}\n\n`);
  } else log('Listo: publicado como privado (solo tú lo ves) mientras la app no esté auditada.\n');
  return result;
}

async function main() {
  const o = parseCli({
    video: { type: 'string' }, mode: { type: 'string', default: 'draft' }, privacy: { type: 'string', default: 'SELF_ONLY' },
    title: { type: 'string' }, help: { type: 'boolean', short: 'h' }
  });
  if (o.help || !o.video) { console.log('Uso: npm run publish -- --video out/<video>.mp4 [--mode draft|direct] [--title "texto"] [--privacy SELF_ONLY]'); return; }
  const r = await publishVideo(o);
  console.log(JSON.stringify(r, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
}
