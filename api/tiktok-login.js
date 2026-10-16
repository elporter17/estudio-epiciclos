// POST: empieza la conexión con TikTok (Login Kit web). Guarda el state en una cookie y devuelve la URL.
import crypto from 'node:crypto';
import { route, json, config, setCookie, sameOrigin, SCOPES, STATE_COOKIE } from './_tiktok.js';

export default route(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Usa POST.' }, 405);
  sameOrigin(request);
  const c = config(), state = crypto.randomBytes(16).toString('hex');
  const q = new URLSearchParams({ client_key: c.key, scope: SCOPES.join(','), response_type: 'code', redirect_uri: c.redirect, state });
  return json({ url: `https://www.tiktok.com/v2/auth/authorize/?${q}`, state }, 200, { 'set-cookie': setCookie(STATE_COOKIE, state, 600) });
});
