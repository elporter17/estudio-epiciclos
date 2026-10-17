// POST {ticket}: estado de la publicación. Cuando TikTok ya tiene el video (o falló), borra la copia de Blob.
import { del } from '@vercel/blob';
import { route, json, session, tiktok, unseal, blobToken, HttpError } from './_tiktok.js';

const DONE = ['PUBLISH_COMPLETE', 'SEND_TO_USER_INBOX', 'FAILED'];

export default { fetch: route(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Usa POST.' }, 405);
  const { ticket } = await request.json().catch(() => ({}));
  const t = ticket && unseal(ticket);
  if (!t) throw new HttpError(400, ['Publicación desconocida.', 'Unknown post.']);
  const { session: s, cookie } = await session(request);
  if (s.open_id !== t.open_id) throw new HttpError(403, ['Esta publicación es de otra cuenta.', 'This post belongs to another account.']);
  const d = await tiktok('/v2/post/publish/status/fetch/', { publish_id: t.publish_id }, s);
  const done = DONE.includes(d.status);
  if (done) await del(t.blobUrl, { token: blobToken() }).catch(() => {});
  return json({ status: d.status, fail_reason: d.fail_reason || null, done }, 200, cookie ? { 'set-cookie': cookie } : {});
}) };
