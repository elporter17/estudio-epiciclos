// Código compartido por las funciones /api/tiktok-*.js (Vercel ignora los archivos de api/ que empiezan con «_»).
// La sesión de TikTok de cada visitante vive en una cookie cifrada (AES-256-GCM con SESSION_SECRET):
// sin base de datos, y el client_secret y los tokens nunca llegan al navegador en claro.
import crypto from 'node:crypto';

export const API = 'https://open.tiktokapis.com';
export const SCOPES = ['user.info.basic', 'video.upload', 'video.publish'];
export const MEDIA_PREFIX = 'media/'; // carpeta dentro de Vercel Blob; se sirve como https://<sitio>/media/…
const SESSION = 'ca_tt', STATE = 'ca_tt_state';

export function config() {
  const c = {
    key: process.env.TIKTOK_CLIENT_KEY, secret: process.env.TIKTOK_CLIENT_SECRET, redirect: process.env.TIKTOK_REDIRECT_URI,
    sessionSecret: process.env.SESSION_SECRET, blob: blobToken(),
    // Base pública desde la que TikTok descarga el video (dominio verificado en el portal de TikTok)
    mediaBase: process.env.PUBLIC_MEDIA_BASE || 'https://circularte.edav-tech.com/media/'
  };
  c.enabled = !!(c.key && c.secret && c.redirect && c.sessionSecret && c.blob);
  return c;
}

// Token del almacén Blob público. Vercel lo nombra BLOB_READ_WRITE_TOKEN o, si el almacén se conectó con otro
// prefijo, <PREFIJO>_READ_WRITE_TOKEN. Se pasa siempre explícito para no usar por error otro almacén del proyecto.
export function blobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const found = Object.entries(process.env).find(([k, v]) => k.endsWith('_READ_WRITE_TOKEN') && String(v).startsWith('vercel_blob_rw_'));
  return found ? found[1] : undefined;
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

export class HttpError extends Error { constructor(status, message, code) { super(message); this.status = status; this.code = code; } }

// Envuelve un handler: errores conocidos → JSON con su estado; el resto → 500 sin filtrar detalles internos
export const route = (fn) => async (request) => {
  try {
    if (!config().enabled) throw new HttpError(503, 'La publicación en TikTok no está configurada en este sitio.', 'not_configured');
    return await fn(request);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, code: e.code || null }, e.status);
    console.error(e);
    return json({ error: 'Error inesperado del servidor.' }, 500);
  }
};

/* ---------------- Cookies cifradas ---------------- */
const keyOf = () => crypto.createHash('sha256').update(config().sessionSecret).digest();
export function seal(obj) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', keyOf(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), data]).toString('base64url');
}
export function unseal(s) {
  try {
    const b = Buffer.from(s, 'base64url'), d = crypto.createDecipheriv('aes-256-gcm', keyOf(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
  } catch { return null; }
}
export function cookies(request) {
  const out = {};
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
const secure = () => (process.env.VERCEL ? '; Secure' : '');
export const setCookie = (name, value, maxAge) => `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure()}`;
export const clearCookie = (name) => `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure()}`;
export const STATE_COOKIE = STATE, SESSION_COOKIE = SESSION;

// Solo peticiones del mismo sitio para las acciones que cambian algo (defensa extra contra CSRF)
export function sameOrigin(request) {
  const origin = request.headers.get('origin'); if (!origin) return;
  if (new URL(origin).host !== new URL(request.url).host) throw new HttpError(403, 'Origen no permitido.');
}

/* ---------------- OAuth ---------------- */
export async function tokenRequest(fields) {
  const c = config();
  const res = await fetch(`${API}/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({ client_key: c.key, client_secret: c.secret, ...fields })
  });
  const t = await res.json().catch(() => ({}));
  if (!res.ok || t.error || !t.access_token) throw new HttpError(401, `TikTok no autorizó la conexión (${t.error_description || t.error || res.status}).`, 'oauth_failed');
  const now = Date.now();
  return { open_id: t.open_id, scope: t.scope, at: t.access_token, rt: t.refresh_token, exp: now + t.expires_in * 1000, rexp: now + t.refresh_expires_in * 1000 };
}

// Lee la sesión, renueva el token si venció y devuelve { session, setCookie? }
export async function session(request) {
  const raw = cookies(request)[SESSION];
  const s = raw && unseal(raw);
  if (!s) throw new HttpError(401, 'Conecta tu cuenta de TikTok.', 'not_connected');
  if (s.exp - Date.now() > 60e3) return { session: s };
  if (s.rexp <= Date.now()) throw new HttpError(401, 'Tu conexión con TikTok venció. Conéctala de nuevo.', 'not_connected');
  const fresh = await tokenRequest({ grant_type: 'refresh_token', refresh_token: s.rt });
  return { session: fresh, cookie: sessionCookie(fresh) };
}
export const sessionCookie = (s) => setCookie(SESSION, seal(s), Math.max(60, Math.floor((s.rexp - Date.now()) / 1000)));

/* ---------------- Content Posting API ---------------- */
export async function tiktok(pathname, body, s) {
  const res = await fetch(`${API}${pathname}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${s.at}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  const err = data.error || {};
  if (!res.ok || (err.code && err.code !== 'ok')) {
    throw new HttpError(res.status >= 400 && res.status < 600 ? res.status : 502, MESSAGES[err.code] || `TikTok respondió ${err.code || res.status}: ${err.message || 'sin detalle'}`, err.code);
  }
  return data.data || {};
}

// Mensajes claros para los errores que un usuario puede ver
const MESSAGES = {
  access_token_invalid: 'Tu conexión con TikTok ya no es válida. Conéctala de nuevo.',
  scope_not_authorized: 'Falta autorizar la publicación de videos. Conecta tu cuenta de nuevo y acepta todos los permisos.',
  rate_limit_exceeded: 'TikTok recibió demasiadas solicitudes. Espera un minuto e intenta de nuevo.',
  spam_risk_too_many_posts: 'Llegaste al límite diario de publicaciones de TikTok. Intenta mañana.',
  spam_risk_user_banned_from_posting: 'TikTok no permite que esta cuenta publique ahora.',
  reached_active_user_cap: 'CirculArte alcanzó su cupo diario de publicaciones en TikTok. Intenta mañana.',
  unaudited_client_can_only_post_to_private_accounts: 'Mientras CirculArte está en revisión de TikTok, solo puede publicar en cuentas privadas.',
  privacy_level_option_mismatch: 'La privacidad elegida no está disponible para tu cuenta.',
  url_ownership_unverified: 'TikTok no reconoce el dominio desde el que se sirve el video.'
};
