#!/usr/bin/env node
// Publica un video como Reel en una página de Facebook (Graph API, video_reels): start → subir los bytes → finish.
// Necesita FB_PAGE_ID y FB_PAGE_TOKEN (token de página de larga duración con pages_manage_posts,
// pages_read_engagement, pages_show_list y publish_video). Nunca imprime el token.
//
//   node scripts/facebook.mjs --video out/<video>.mp4 [--description "texto"] [--draft]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCli } from './lib/cli.mjs';

const V = process.env.FB_GRAPH_VERSION || 'v26.0';
const GRAPH = `https://graph.facebook.com/${V}`;
export const facebookReady = () => !!(process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN);

// FB_PAGE_TOKEN puede ser el token de la página o el de un usuario del sistema del portafolio con acceso a la página
// (no vence): en ese caso se pide el de la página una vez por corrida
let pageToken = null;
async function tokenDePagina() {
  if (pageToken) return pageToken;
  const u = new URL(`${GRAPH}/${process.env.FB_PAGE_ID}`);
  u.searchParams.set('fields', 'access_token'); u.searchParams.set('access_token', process.env.FB_PAGE_TOKEN);
  const d = await fetch(u).then((r) => r.json()).catch(() => ({}));
  pageToken = d.access_token || process.env.FB_PAGE_TOKEN;
  return pageToken;
}

// usuario: con el token del usuario del sistema tal cual (lo pide la Audio API de Instagram), no el de la página
export async function graph(method, pathname, params = {}, { usuario = false } = {}) {
  const u = new URL(GRAPH + pathname);
  for (const [k, v] of Object.entries({ ...params, access_token: usuario ? process.env.FB_PAGE_TOKEN : await tokenDePagina() })) if (v != null) u.searchParams.set(k, v);
  const res = await fetch(u, { method });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.error) {
    const e = new Error(`Facebook ${pathname} → ${res.status} ${d.error?.code ?? ''}: ${d.error?.message || 'sin detalle'}`);
    e.code = d.error?.code; throw e;
  }
  return d;
}

// Sube los bytes de un video a una sesión de video_reels o video_stories (start → rupload); devuelve su video_id
async function subirVideo(edge, file, como, log) {
  const page = process.env.FB_PAGE_ID, bytes = fs.readFileSync(file);
  const { video_id, upload_url } = await graph('POST', `/${page}/${edge}`, { upload_phase: 'start' });
  log(`Facebook: subiendo ${path.basename(file)} (${(bytes.length / 1e6).toFixed(1)} MB) como ${como}…\n`);
  const up = await fetch(upload_url || `https://rupload.facebook.com/video-upload/${V}/${video_id}`, {
    method: 'POST', body: bytes,
    headers: { Authorization: `OAuth ${await tokenDePagina()}`, offset: '0', file_size: String(bytes.length) }
  });
  const upd = await up.json().catch(() => ({}));
  if (!up.ok || !upd.success) throw new Error(`Facebook no recibió el video: ${up.status} ${upd.debug_info?.message || JSON.stringify(upd).slice(0, 200)}`);
  return video_id;
}

// draft: queda como borrador en Meta Business Suite en vez de publicarse
export async function publishReel({ video, description = '', draft = false, log = (m) => process.stderr.write(m) }) {
  if (!facebookReady()) throw new Error('Faltan FB_PAGE_ID o FB_PAGE_TOKEN');
  const page = process.env.FB_PAGE_ID, video_id = await subirVideo('video_reels', path.resolve(video), 'Reel', log);
  await graph('POST', `/${page}/video_reels`, { upload_phase: 'finish', video_id, video_state: draft ? 'DRAFT' : 'PUBLISHED', description: description.slice(0, 2200) });
  // Facebook procesa el video unos segundos o minutos; se espera un poco para reportar el estado
  let status = 'processing', permalink = null;
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await graph('GET', `/${video_id}`, { fields: 'status,permalink_url' }).catch(() => null);
    const st = s?.status || {};
    permalink = s?.permalink_url ? `https://www.facebook.com${s.permalink_url}` : permalink;
    if (st.video_status === 'error' || st.processing_phase?.status === 'error') { status = 'error'; break; }
    if (st.publishing_phase?.status === 'complete' || (draft && st.processing_phase?.status === 'complete')) { status = draft ? 'draft' : 'published'; break; }
  }
  log(`Facebook: ${status}${permalink ? ` · ${permalink}` : ''}\n`);
  return { video_id, status, permalink, draft, at: new Date().toISOString() };
}

// Historia de la página con el mismo video (hasta 60 s). Facebook no deja reusar el medio de otra publicación, así
// que se sube otra vez; las historias no llevan texto.
export async function publishStory({ video, log = (m) => process.stderr.write(m) }) {
  if (!facebookReady()) throw new Error('Faltan FB_PAGE_ID o FB_PAGE_TOKEN');
  const video_id = await subirVideo('video_stories', path.resolve(video), 'historia', log);
  const d = await graph('POST', `/${process.env.FB_PAGE_ID}/video_stories`, { upload_phase: 'finish', video_id });
  log(`Facebook: historia ${d.success ? 'publicada' : 'enviada'}\n`);
  return { video_id, post_id: d.post_id || null, status: d.success ? 'published' : 'sent', at: new Date().toISOString() };
}

// Historia de la página con una imagen vertical: la foto se sube sin publicar y se convierte en historia
export async function publishPhotoStory({ url, log = (m) => process.stderr.write(m) }) {
  if (!facebookReady()) throw new Error('Faltan FB_PAGE_ID o FB_PAGE_TOKEN');
  const foto = await graph('POST', `/${process.env.FB_PAGE_ID}/photos`, { url, published: 'false' });
  const d = await graph('POST', `/${process.env.FB_PAGE_ID}/photo_stories`, { photo_id: foto.id });
  log(`Facebook: historia con imagen ${d.success ? 'publicada' : 'enviada'}\n`);
  return { photo_id: foto.id, post_id: d.post_id || null, status: d.success ? 'published' : 'sent', at: new Date().toISOString() };
}

// Carrusel (publicación con varias fotos): cada foto se sube sin publicar y después va todo junto en una publicación
export async function publishCarrusel({ urls, caption = '', log = (m) => process.stderr.write(m) }) {
  if (!facebookReady()) throw new Error('Faltan FB_PAGE_ID o FB_PAGE_TOKEN');
  const ids = [];
  for (const url of urls) ids.push((await graph('POST', `/${process.env.FB_PAGE_ID}/photos`, { url, published: 'false' })).id);
  const d = await graph('POST', `/${process.env.FB_PAGE_ID}/feed`, { message: caption.slice(0, 63000), attached_media: JSON.stringify(ids.map((media_fbid) => ({ media_fbid }))) });
  const permalink = ids[0] ? `https://www.facebook.com/photo/?fbid=${ids[0]}` : null;
  log(`Facebook: carrusel de ${ids.length} fotos publicado${permalink ? ` · ${permalink}` : ''}\n`);
  return { post_id: d.id, photo_ids: ids, status: 'published', permalink, at: new Date().toISOString() };
}

// Foto publicada en la página (curiosidades y noticias): url pública de la imagen y el texto del post
export async function publishPhoto({ url, caption = '', log = (m) => process.stderr.write(m) }) {
  if (!facebookReady()) throw new Error('Faltan FB_PAGE_ID o FB_PAGE_TOKEN');
  const d = await graph('POST', `/${process.env.FB_PAGE_ID}/photos`, { url, caption: caption.slice(0, 63000), published: 'true' });
  // Enlace por el id de la foto: el de la publicación lleva el id de la página, que GitHub oculta por ser secreto
  const permalink = d.id ? `https://www.facebook.com/photo/?fbid=${d.id}` : null;
  log(`Facebook: foto publicada${permalink ? ` · ${permalink}` : ''}\n`);
  return { photo_id: d.id, post_id: d.post_id, status: 'published', permalink, at: new Date().toISOString() };
}

async function main() {
  const o = parseCli({ video: { type: 'string' }, description: { type: 'string' }, draft: { type: 'boolean', default: false } });
  if (!o.video) { console.log('Uso: node scripts/facebook.mjs --video out/<video>.mp4 [--description "texto"] [--draft]'); return; }
  const meta = (() => { try { return JSON.parse(fs.readFileSync(o.video.replace(/\.mp4$/i, '.json'), 'utf8')); } catch { return null; } })();
  console.log(JSON.stringify(await publishReel({ video: o.video, description: o.description ?? meta?.post?.text ?? '', draft: o.draft }), null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
}
