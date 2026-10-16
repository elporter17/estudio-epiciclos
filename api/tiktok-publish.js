// POST: publica en TikTok un video ya subido a Blob (PULL_FROM_URL desde el dominio verificado).
// Revalida en el servidor lo que eligió el usuario contra creator_info antes de llamar a TikTok.
import { list, del } from '@vercel/blob';
import { route, json, session, tiktok, config, seal, sameOrigin, MEDIA_PREFIX, HttpError } from './_tiktok.js';

export default { fetch: route(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Usa POST.' }, 405);
  sameOrigin(request);
  const b = await request.json().catch(() => ({}));
  const { session: s, cookie } = await session(request);

  // El video tiene que estar en nuestro almacén, dentro de media/
  let blob;
  try { blob = new URL(b.blobUrl); } catch { throw new HttpError(400, 'Falta el video.'); }
  const pathname = decodeURIComponent(blob.pathname.slice(1));
  if (!/\.public\.blob\.vercel-storage\.com$/.test(blob.hostname) || !pathname.startsWith(MEDIA_PREFIX)) throw new HttpError(400, 'Video no válido.');

  const info = await tiktok('/v2/post/publish/creator_info/query/', undefined, s);
  const options = info.privacy_level_options || [];
  if (!options.includes(b.privacy_level)) throw new HttpError(400, 'Elige quién puede ver el video.');
  const branded = !!b.brand_content_toggle, own = !!b.brand_organic_toggle;
  if (b.disclose && !branded && !own) throw new HttpError(400, 'Indica si el contenido promociona tu marca, a un tercero o ambos.');
  if (branded && b.privacy_level === 'SELF_ONLY') throw new HttpError(400, 'El contenido de marca no puede ser privado.');
  if (info.max_video_post_duration_sec && b.duration && b.duration > info.max_video_post_duration_sec) {
    throw new HttpError(400, `Tu cuenta permite videos de hasta ${info.max_video_post_duration_sec} s.`);
  }

  const d = await tiktok('/v2/post/publish/video/init/', {
    post_info: {
      title: String(b.title || '').slice(0, 2200), privacy_level: b.privacy_level,
      // Una interacción solo queda activa si el usuario la marcó y su cuenta la permite
      disable_comment: info.comment_disabled || !b.allow_comment,
      disable_duet: info.duet_disabled || !b.allow_duet,
      disable_stitch: info.stitch_disabled || !b.allow_stitch,
      brand_content_toggle: branded, brand_organic_toggle: own
    },
    source_info: { source: 'PULL_FROM_URL', video_url: config().mediaBase + pathname.slice(MEDIA_PREFIX.length) }
  }, s);

  // Limpieza: videos de más de un día que quedaron en el almacén (por ejemplo, si alguien cerró la página)
  cleanupOld().catch((e) => console.error('limpieza de media', e));

  // El ticket permite consultar el estado y borrar este video después sin confiar en lo que mande el navegador
  const ticket = seal({ publish_id: d.publish_id, blobUrl: blob.href, open_id: s.open_id, t: Date.now() });
  return json({ ticket }, 200, cookie ? { 'set-cookie': cookie } : {});
}) };

async function cleanupOld() {
  const { blobs } = await list({ prefix: MEDIA_PREFIX, limit: 100 });
  const old = blobs.filter((x) => Date.parse(x.uploadedAt) < Date.now() - 24 * 3600e3).map((x) => x.url);
  if (old.length) await del(old);
}
