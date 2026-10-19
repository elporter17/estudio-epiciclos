#!/usr/bin/env node
// Paso 5 · publicar. Sube los episodios a TikTok con la Content Posting API oficial (FILE_UPLOAD), con la
// misma lógica que el publicador de CirculArte:
//   draft  → llega a la bandeja de TikTok como borrador (video.upload). Máximo 5 borradores pendientes cada 24 h.
//            La API de bandeja no admite título ni etiqueta de IA: actívala tú en la app al publicar.
//   direct → se publica directo (video.publish) con is_aigc = true (etiqueta «generado con IA»); mientras la app
//            no esté auditada, solo como privado SELF_ONLY.
//
//   npm run publish -- --ep 1                 (borrador)
//   npm run publish -- --ep 1-5 --mode draft
//   npm run publish -- --ep 1 --mode direct
import fs from 'node:fs';
import path from 'node:path';
import { parseCli, parseEpisodes, run } from './lib/cli.mjs';
import { ROOT, log } from './lib/env.mjs';
import { loadSeries, videoFile, readJson, writeJson } from './lib/series.mjs';
import { accessToken, api, chunkPlan, uploadFile, waitForStatus } from './lib/tiktok.mjs';

const LOG_FILE = path.join(ROOT, 'data', 'tiktok-log.json'); // historial de subidas de este repo (sin secretos)
const DRAFT_LIMIT = 5, DAY = 24 * 3600e3;

const AI_REMINDER = 'Antes de publicar en la app: Más opciones → activa «Contenido generado por IA» (etiqueta de IA).';

export function draftsLast24h() {
  const since = Date.now() - DAY;
  return readJson(LOG_FILE, []).filter((r) => r.mode === 'draft' && r.status !== 'FAILED' && Date.parse(r.at) > since).length;
}

export async function publishVideo({ video, mode = 'draft', privacy = 'SELF_ONLY', title }) {
  if (!['draft', 'direct'].includes(mode)) throw new Error('--mode debe ser draft o direct');
  const file = path.resolve(video);
  if (!fs.existsSync(file)) throw new Error(`No existe el video ${file}. Ejecuta antes «npm run assemble».`);
  const sidecar = file.replace(/\.mp4$/i, '.json');
  const meta = readJson(sidecar);
  const size = fs.statSync(file).size, plan = chunkPlan(size);
  const token = await accessToken();
  const text = (title ?? meta?.post?.text ?? '').slice(0, 2200);

  let init;
  if (mode === 'draft') {
    init = await api('/v2/post/publish/inbox/video/init/', { source_info: { source: 'FILE_UPLOAD', ...plan } }, token);
  } else {
    const info = await api('/v2/post/publish/creator_info/query/', undefined, token);
    if (!info.privacy_level_options?.includes(privacy)) throw new Error(`La cuenta no permite privacidad ${privacy} (opciones: ${info.privacy_level_options?.join(', ')})`);
    if (meta?.duration && info.max_video_post_duration_sec && meta.duration > info.max_video_post_duration_sec) {
      throw new Error(`El video dura ${Math.round(meta.duration)} s y la cuenta permite hasta ${info.max_video_post_duration_sec} s.`);
    }
    log(`Publicando como @${info.creator_username} con privacidad ${privacy}\n`);
    init = await api('/v2/post/publish/video/init/', {
      post_info: {
        title: text, privacy_level: privacy,
        disable_comment: !!info.comment_disabled, disable_duet: !!info.duet_disabled, disable_stitch: !!info.stitch_disabled,
        video_cover_timestamp_ms: 1500, // el gancho, no la tarjeta final
        brand_content_toggle: false, brand_organic_toggle: false,
        is_aigc: true
      },
      source_info: { source: 'FILE_UPLOAD', ...plan }
    }, token);
  }
  log(`Subiendo ${path.basename(file)} (${(size / 1e6).toFixed(1)} MB, ${plan.total_chunk_count} trozo/s)…\n`);
  await uploadFile(init.upload_url, file, plan, 'video/mp4', log);
  const st = await waitForStatus(init.publish_id, token, { until: mode === 'draft' ? ['SEND_TO_USER_INBOX', 'PUBLISH_COMPLETE', 'FAILED'] : ['PUBLISH_COMPLETE', 'FAILED'], log });

  const result = { file: path.basename(file), mode, publish_id: init.publish_id, status: st.status, fail_reason: st.fail_reason || null, privacy: mode === 'direct' ? privacy : null, is_aigc: mode === 'direct', at: new Date().toISOString() };
  if (meta) { meta.tiktok = [...(meta.tiktok || []), result]; writeJson(sidecar, meta); }
  writeJson(LOG_FILE, [...readJson(LOG_FILE, []), result]);
  if (st.status === 'FAILED') throw new Error(`TikTok rechazó el video: ${st.fail_reason || 'sin motivo'}`);
  if (st.timedOut) log('TikTok sigue procesando; revisa la app en unos minutos.\n');
  if (mode === 'draft') {
    log('Listo: abre TikTok, toca la notificación del borrador y termina la publicación.\n');
    log(`${AI_REMINDER}\n`);
    if (text) log(`Descripción para pegar en la app:\n\n${text}\n\n`);
  } else log('Listo: publicado como privado (solo tú lo ves) con la etiqueta de contenido generado por IA.\n');
  return result;
}

async function main() {
  const o = parseCli({
    series: { type: 'string' }, ep: { type: 'string' }, video: { type: 'string' }, mode: { type: 'string', default: 'draft' },
    privacy: { type: 'string', default: 'SELF_ONLY' }, title: { type: 'string' }, force: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' }
  });
  if (o.help || (!o.ep && !o.video)) { console.log('Uso: npm run publish -- --ep 1|1-5|all [--series <slug>] [--mode draft|direct] [--privacy SELF_ONLY] | --video <archivo.mp4>'); return; }
  const videos = o.video ? [o.video] : (() => { const s = loadSeries(o.series); return parseEpisodes(o.ep, s.episodes.length).map((n) => videoFile(s.slug, n)); })();
  if (o.mode === 'draft') {
    // TikTok permite 5 borradores pendientes cada 24 h por cuenta (los de CirculArte también cuentan)
    const used = draftsLast24h();
    if (used + videos.length > DRAFT_LIMIT && !o.force) throw new Error(`Ya subiste ${used} borrador/es en 24 h desde aquí y TikTok permite ${DRAFT_LIMIT} pendientes. Publica o descarta los de la bandeja y usa --force, o espera.`);
    if (videos.length > 1) log(`Aviso: ${videos.length} borradores; si CirculArte también subió hoy, TikTok puede rechazar los últimos (límite ${DRAFT_LIMIT} pendientes en 24 h).\n`);
  }
  const results = [];
  for (const v of videos) results.push(await publishVideo({ ...o, video: v }));
  console.log(JSON.stringify(results, null, 2));
}

run(import.meta.url, main);
