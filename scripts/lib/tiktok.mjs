// Cliente mínimo de la API oficial de TikTok (Login Kit + Content Posting API).
// Los tokens viven en data/tiktok-token.json (en .gitignore). Nunca se imprimen.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import './env-file.mjs';
import { ROOT } from './node-env.mjs';

export const API = 'https://open.tiktokapis.com';
export const AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
export const SCOPES = ['user.info.basic', 'video.upload', 'video.publish'];
export const TOKEN_FILE = path.join(ROOT, 'data', 'tiktok-token.json');
export const PENDING_FILE = path.join(ROOT, 'data', 'tiktok-pending.json');

export function appConfig() {
  const key = process.env.TIKTOK_CLIENT_KEY, secret = process.env.TIKTOK_CLIENT_SECRET, redirect = process.env.TIKTOK_REDIRECT_URI;
  const missing = [['TIKTOK_CLIENT_KEY', key], ['TIKTOK_CLIENT_SECRET', secret], ['TIKTOK_REDIRECT_URI', redirect]].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`Faltan variables en .env: ${missing.join(', ')} (mira .env.example)`);
  return { key, secret, redirect };
}

const writeJson = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 }); };
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };

/* ---------------- OAuth ---------------- */
// Login Kit para web: client_key, scope, response_type=code, redirect_uri y state (PKCE solo se pide en móvil/escritorio)
export function startAuthorization() {
  const { key, redirect } = appConfig();
  const state = crypto.randomBytes(16).toString('hex');
  writeJson(PENDING_FILE, { state, createdAt: new Date().toISOString() });
  const q = new URLSearchParams({ client_key: key, scope: SCOPES.join(','), response_type: 'code', redirect_uri: redirect, state, disable_auto_auth: '1' });
  return { url: `${AUTHORIZE_URL}?${q}`, state };
}

function saveToken(t) {
  const now = Date.now();
  const token = {
    open_id: t.open_id, scope: t.scope, token_type: t.token_type,
    access_token: t.access_token, expires_at: new Date(now + t.expires_in * 1000).toISOString(),
    refresh_token: t.refresh_token, refresh_expires_at: new Date(now + t.refresh_expires_in * 1000).toISOString()
  };
  writeJson(TOKEN_FILE, token);
  return token;
}

async function tokenRequest(fields) {
  const { key, secret } = appConfig();
  const res = await fetch(`${API}/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({ client_key: key, client_secret: secret, ...fields })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(`TikTok no entregó el token (${res.status} ${data.error || ''}: ${data.error_description || 'sin detalle'}${data.log_id ? `, log_id ${data.log_id}` : ''})`);
  }
  return saveToken(data);
}

// `code` tal como lo muestra tiktok-callback.html (ya decodificado); `state` se compara con el guardado
export async function exchangeCode(code, state) {
  const pending = readJson(PENDING_FILE);
  if (!pending) throw new Error('No hay una conexión pendiente. Ejecuta primero «npm run tiktok:connect».');
  if (!state || state.trim() !== pending.state) throw new Error('El state no coincide con el de esta conexión. Empieza de nuevo con «npm run tiktok:connect».');
  const { redirect } = appConfig();
  const token = await tokenRequest({ code: code.trim(), grant_type: 'authorization_code', redirect_uri: redirect });
  fs.rmSync(PENDING_FILE, { force: true });
  return token;
}

// Token de acceso vigente; lo renueva con el refresh token solo si venció (o vence en menos de 5 minutos)
export async function accessToken() {
  const t = readJson(TOKEN_FILE);
  if (!t) throw new Error('La cuenta de TikTok no está conectada. Ejecuta «npm run tiktok:connect».');
  if (Date.parse(t.expires_at) - Date.now() > 5 * 60e3) return t;
  if (Date.parse(t.refresh_expires_at) <= Date.now()) throw new Error('La autorización de TikTok venció. Vuelve a ejecutar «npm run tiktok:connect».');
  process.stderr.write('Renovando el token de TikTok…\n');
  return tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token });
}

/* ---------------- Content Posting API ---------------- */
export async function api(pathname, body, token) {
  const res = await fetch(`${API}${pathname}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  const err = data.error || {};
  if (!res.ok || (err.code && err.code !== 'ok')) {
    const e = new Error(`TikTok ${pathname} → ${res.status} ${err.code || ''}: ${err.message || 'sin detalle'}${err.log_id || err.logid ? ` (log_id ${err.log_id || err.logid})` : ''}`);
    e.status = res.status; e.code = err.code; throw e;
  }
  return data.data || {};
}

// Reglas de FILE_UPLOAD: trozos de 5 a 64 MB (el último absorbe el resto, hasta 128 MB), máximo 1000;
// menos de 5 MB va entero; hasta 64 MB cabe en un solo trozo. Se usan MB decimales para quedar del lado seguro.
export const MB = 1e6;
export function chunkPlan(size) {
  if (size > 4e9) throw new Error('TikTok acepta videos de hasta 4 GB.');
  if (size <= 64 * MB) return { video_size: size, chunk_size: size, total_chunk_count: 1 };
  const chunk = 10 * MB, count = Math.floor(size / chunk); // el último trozo queda entre 10 y 20 MB
  return { video_size: size, chunk_size: chunk, total_chunk_count: count };
}

export async function uploadFile(uploadUrl, file, plan, mime, log = () => {}) {
  const fd = fs.openSync(file, 'r');
  try {
    for (let i = 0; i < plan.total_chunk_count; i++) {
      const start = i * plan.chunk_size;
      const end = i === plan.total_chunk_count - 1 ? plan.video_size - 1 : start + plan.chunk_size - 1;
      const buf = Buffer.alloc(end - start + 1);
      fs.readSync(fd, buf, 0, buf.length, start);
      for (let attempt = 1; ; attempt++) {
        const res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': mime, 'Content-Length': String(buf.length), 'Content-Range': `bytes ${start}-${end}/${plan.video_size}` },
          body: buf
        });
        if (res.status === 201 || res.status === 206) break;
        if (res.status >= 500 && attempt < 3) { await new Promise((r) => setTimeout(r, 2000 * attempt)); continue; }
        const why = res.status === 403 ? 'el enlace de subida venció (dura una hora)' : res.status === 416 ? 'el rango no coincide con lo ya subido' : await res.text().catch(() => '');
        throw new Error(`Falló la subida del trozo ${i + 1}/${plan.total_chunk_count}: HTTP ${res.status} ${why}`);
      }
      log(`  trozo ${i + 1}/${plan.total_chunk_count} subido (${((end + 1) / MB).toFixed(1)} de ${(plan.video_size / MB).toFixed(1)} MB)\n`);
    }
  } finally { fs.closeSync(fd); }
}

// Consulta el estado cada 5 s (límite: 30 consultas por minuto) hasta un estado final
export async function waitForStatus(publishId, token, { until = ['SEND_TO_USER_INBOX', 'PUBLISH_COMPLETE', 'FAILED'], timeoutMs = 10 * 60e3, log = () => {} } = {}) {
  const t0 = Date.now(); let last = '';
  for (;;) {
    const d = await api('/v2/post/publish/status/fetch/', { publish_id: publishId }, token);
    if (d.status !== last) { last = d.status; log(`  estado: ${d.status}${d.fail_reason ? ` (${d.fail_reason})` : ''}\n`); }
    if (until.includes(d.status)) return d;
    if (Date.now() - t0 > timeoutMs) return { ...d, timedOut: true };
    await new Promise((r) => setTimeout(r, 5000));
  }
}
