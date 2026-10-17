// POST {code, state}: lo llama tiktok-callback.html al volver de TikTok. Valida el state y guarda la sesión cifrada.
import { route, json, cookies, sameOrigin, tokenRequest, sessionCookie, clearCookie, HttpError, STATE_COOKIE } from './_tiktok.js';

export default { fetch: route(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Usa POST.' }, 405);
  sameOrigin(request);
  const { code, state } = await request.json().catch(() => ({}));
  const expected = cookies(request)[STATE_COOKIE];
  if (!code || !state || !expected || state !== expected) throw new HttpError(400, ['La conexión no coincide o venció. Vuelve a intentarlo desde CirculArte.', 'The connection does not match or expired. Try again from CirculArte.'], 'bad_state');
  const s = await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: process.env.TIKTOK_REDIRECT_URI });
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  headers.append('set-cookie', sessionCookie(s));
  headers.append('set-cookie', clearCookie(STATE_COOKIE));
  return new Response(JSON.stringify({ connected: true, scope: s.scope }), { status: 200, headers });
}) };
