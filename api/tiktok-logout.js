// POST: desconecta la cuenta (revoca el token en TikTok y borra la cookie).
import { route, json, cookies, unseal, config, clearCookie, sameOrigin, API, SESSION_COOKIE } from './_tiktok.js';

export default { fetch: route(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Usa POST.' }, 405);
  sameOrigin(request);
  const s = unseal(cookies(request)[SESSION_COOKIE] || '');
  if (s) {
    const c = config();
    await fetch(`${API}/v2/oauth/revoke/`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_key: c.key, client_secret: c.secret, token: s.at })
    }).catch(() => {});
  }
  return json({ connected: false }, 200, { 'set-cookie': clearCookie(SESSION_COOKIE) });
}) };
