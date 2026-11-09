// YouTube Data API v3 (proyecto de Google Cloud «potter-play-youtube», cliente de escritorio «Subidas Potter Play»).
// Credenciales: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET y YOUTUBE_REFRESH_TOKEN (sale de «npm run youtube:connect»),
// en .env y en los secretos de GitHub. Los videos se suben PRIVADOS (como borrador): se publican a mano desde Studio.
// Mientras Google no audite el proyecto, YouTube deja privado todo lo que se sube por API.
// Cuota: 10.000 unidades al día; cada subida cuesta 1.600 (≈ 6 al día), un comentario 50.
import fs from 'node:fs';
import { conGuardia } from './envios.mjs';

export const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.force-ssl'];
const API = 'https://www.googleapis.com/youtube/v3';

export const youtubeReady = () => !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_REFRESH_TOKEN);

export async function tokenDesdeCodigo(code, redirect_uri) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, redirect_uri, grant_type: 'authorization_code', client_id: process.env.YOUTUBE_CLIENT_ID, client_secret: process.env.YOUTUBE_CLIENT_SECRET })
  });
  const j = await r.json(); if (!r.ok) throw new Error(`Google: ${j.error_description || j.error || r.status}`);
  return j;
}

let cache = null;
export async function accessToken() {
  if (cache && cache.vence > Date.now() + 60e3) return cache.token;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: process.env.YOUTUBE_REFRESH_TOKEN, client_id: process.env.YOUTUBE_CLIENT_ID, client_secret: process.env.YOUTUBE_CLIENT_SECRET })
  });
  const j = await r.json(); if (!r.ok) throw new Error(`Google no renovó el token: ${j.error_description || j.error || r.status}`);
  cache = { token: j.access_token, vence: Date.now() + j.expires_in * 1000 };
  return cache.token;
}

export async function api(ruta, { method = 'GET', query = {}, body } = {}) {
  const t = await accessToken(), url = `${API}${ruta}?${new URLSearchParams(query)}`;
  const r = await fetch(url, { method, headers: { authorization: `Bearer ${t}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`YouTube ${ruta}: ${j.error?.message || r.status}`);
  return j;
}

export const miCanal = () => api('/channels', { query: { part: 'snippet,statistics', mine: 'true' } }).then((j) => j.items?.[0] || null);

// Miniatura propia (JPG o PNG de hasta 2 MB; el canal debe estar verificado con teléfono). 50 unidades de cuota
export async function ponerMiniatura(videoId, file) {
  const t = await accessToken();
  const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`, {
    method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': file.endsWith('.png') ? 'image/png' : 'image/jpeg' }, body: fs.readFileSync(file)
  });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error?.message || `HTTP ${r.status}`);
  return j;
}

// Título: máximo 100 caracteres; descripción: 5.000; etiquetas: 500 en total. Shorts: vertical y de hasta 3 min
// (YouTube lo detecta solo; #Shorts en el título ayuda). categoryId 27 = Educación, 24 = Entretenimiento.
// Pasa por conGuardia (scripts/lib/envios.mjs): el mismo archivo no se sube dos veces a YouTube
export const subirYouTube = (o) => conGuardia({ red: 'yt', tipo: 'short', file: o.file, texto: `${o.titulo}\n${o.descripcion || ''}` }, () => subirYouTubeSin(o), (r) => ({ post_id: r.id, url: r.url }));
async function subirYouTubeSin({ file, titulo, descripcion = '', etiquetas = [], privacidad = 'private', categoria = '27', publicarEn }) {
  const t = await accessToken(), size = fs.statSync(file).size;
  const tags = []; let n = 0; for (const e of etiquetas) { const x = String(e).replace(/[<>#]/g, '').trim(); if (x && n + x.length + 1 <= 480) { tags.push(x); n += x.length + 1; } }
  const meta = {
    snippet: { title: titulo.slice(0, 100), description: descripcion.slice(0, 4900), tags, categoryId: categoria, defaultLanguage: 'es', defaultAudioLanguage: 'es' },
    status: { privacyStatus: publicarEn ? 'private' : privacidad, ...(publicarEn ? { publishAt: publicarEn } : {}), embeddable: true }
  };
  // Subida reanudable: primero los metadatos (devuelve la URL de subida) y después el archivo entero
  const ini = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-length': String(size), 'x-upload-content-type': 'video/mp4' }, body: JSON.stringify(meta)
  });
  if (!ini.ok) { const j = await ini.json().catch(() => ({})); throw new Error(`YouTube no aceptó la subida: ${j.error?.message || ini.status}`); }
  const destino = ini.headers.get('location');
  for (let intento = 1; ; intento++) {
    const r = await fetch(destino, { method: 'PUT', headers: { authorization: `Bearer ${t}`, 'content-type': 'video/mp4', 'content-length': String(size) }, body: fs.readFileSync(file) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return { id: j.id, url: `https://youtu.be/${j.id}`, studio: `https://studio.youtube.com/video/${j.id}/edit`, estado: j.status?.privacyStatus, subida: j.status?.uploadStatus };
    if (intento >= 3 || r.status < 500) throw new Error(`YouTube falló al subir: ${j.error?.message || r.status}`);
    await new Promise((ok) => setTimeout(ok, 3000 * intento));
  }
}
