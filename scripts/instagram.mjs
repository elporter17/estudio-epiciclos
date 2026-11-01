#!/usr/bin/env node
// Publica en la cuenta de Instagram profesional vinculada a la página de Facebook (Graph API, Content Publishing):
// contenedor (Reel, historia o imagen) a partir de una URL pública → esperar a que Instagram lo procese → media_publish.
// Usa el mismo token que Facebook (FB_PAGE_TOKEN), que necesita instagram_basic e instagram_content_publish. Si la
// página no tiene Instagram vinculado o al token le faltan esos permisos, instagramReady() da null y no se publica.
// Las imágenes deben ser JPEG; los videos, MP4 H.264 con AAC (los de este proyecto ya lo son). Hasta 100 por día.
//
//   node scripts/instagram.mjs --tipo reel --url https://…/video.mp4 --caption "texto"
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './lib/node-env.mjs';
import { parseCli } from './lib/cli.mjs';
import { graph, facebookReady } from './facebook.mjs';

let igUser;
// Id de la cuenta de Instagram vinculada a la página (una consulta por corrida)
export async function instagramReady() {
  if (igUser !== undefined) return igUser;
  if (!facebookReady()) return (igUser = null);
  const d = await graph('GET', `/${process.env.FB_PAGE_ID}`, { fields: 'instagram_business_account' }).catch(() => null);
  return (igUser = d?.instagram_business_account?.id || null);
}

// Instagram descarga y procesa el archivo: se espera a FINISHED (los videos tardan de 20 s a unos minutos)
async function esperar(id, log) {
  for (let i = 0; i < 60; i++) {
    const s = await graph('GET', `/${id}`, { fields: 'status_code,status' }).catch(() => ({}));
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram no procesó el archivo: ${s.status || s.status_code}`);
    if (i && i % 6 === 0) log(`Instagram: procesando (${s.status_code || '…'})\n`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Instagram tardó más de 5 minutos en procesar el archivo');
}

// tipo: reel | historia | imagen | historia-imagen. url: pública (el almacén Blob sirve)
// Canción en tendencia del catálogo de Meta autorizado para terceros (GET /ig_audio sin búsqueda = tendencias).
// Evita repetir las últimas 30 (data/ig-musica.json, estado de Actions). null si no hay o falla.
const USADAS = path.join(ROOT, 'data', 'ig-musica.json');
export async function musicaTendencia({ log = (m) => process.stderr.write(m) } = {}) {
  const ig = await instagramReady(); if (!ig) return null;
  for (const usuario of [true, false]) {
    try {
      const d = await graph('GET', '/ig_audio', { audio_type: 'music', user_id: ig }, { usuario });
      // La respuesta viene en «audio» y cada canción trae «audio_id»
      const lista = (d.audio || d.data || []).map((x) => ({ ...x, id: x.audio_id || x.id })).filter((x) => x.id);
      if (!lista.length) { if (!usuario) log('Instagram: el catálogo de música no devolvió canciones\n'); continue; }
      const usadas = (() => { try { return JSON.parse(fs.readFileSync(USADAS, 'utf8')); } catch { return []; } })();
      const a = lista.find((x) => !usadas.includes(x.id)) || lista[Math.floor(Math.random() * lista.length)];
      fs.mkdirSync(path.dirname(USADAS), { recursive: true }); fs.writeFileSync(USADAS, JSON.stringify([...usadas.filter((x) => x !== a.id), a.id].slice(-30)) + '\n');
      const nombre = [a.title, a.display_artist].filter(Boolean).join(' · ') || a.id;
      log(`Instagram: música en tendencia «${nombre}»\n`);
      return { id: a.id, nombre };
    } catch (e) { if (!usuario) log(`Instagram: no se pudo buscar música (${e.message})\n`); }
  }
  return null;
}

// audio: id de una canción de musicaTendencia (solo Reels); si Instagram la rechaza, se publica sin ella
export async function publishInstagram({ tipo = 'reel', url, caption = '', audio, log = (m) => process.stderr.write(m) }) {
  const ig = await instagramReady();
  if (!ig) throw new Error('La página no tiene una cuenta de Instagram profesional vinculada o el token no tiene instagram_basic');
  const texto = caption.slice(0, 2200);
  const p = tipo === 'imagen' ? { image_url: url, caption: texto }
    : tipo === 'historia' ? { media_type: 'STORIES', video_url: url }
    : tipo === 'historia-imagen' ? { media_type: 'STORIES', image_url: url }
    : { media_type: 'REELS', video_url: url, caption: texto, share_to_feed: 'true' };
  let id;
  if (audio && tipo === 'reel') {
    // La canción va encima; el audio propio del video (los efectos) queda más bajo
    const conAudio = { ...p, audio_configuration: JSON.stringify({ audio_id: audio, audio_volume: 100, video_volume: 45 }) };
    for (const usuario of [false, true]) {
      if (id) break;
      try { ({ id } = await graph('POST', `/${ig}/media`, conAudio, { usuario })); }
      catch (e) { if (usuario) log(`Instagram: no aceptó la canción (${e.message}); va sin ella\n`); }
    }
  }
  if (!id) ({ id } = await graph('POST', `/${ig}/media`, p));
  log(`Instagram: ${tipo} en proceso…\n`);
  await esperar(id, log);
  const r = await graph('POST', `/${ig}/media_publish`, { creation_id: id });
  const info = await graph('GET', `/${r.id}`, { fields: 'permalink' }).catch(() => ({}));
  log(`Instagram: ${tipo} publicad${tipo === 'reel' ? 'o' : 'a'}${info.permalink ? ` · ${info.permalink}` : ''}\n`);
  return { media_id: r.id, tipo, status: 'published', permalink: info.permalink || null, at: new Date().toISOString() };
}

// Publica sin que un error tumbe la corrida: devuelve el resultado o { status: 'error' | 'omitido', … }
export async function publishInstagramSeguro(o) {
  if (!(await instagramReady())) return { tipo: o.tipo, status: 'omitido', error: 'sin cuenta de Instagram vinculada o sin permiso en el token' };
  try { return await publishInstagram(o); }
  catch (e) { (o.log || ((m) => process.stderr.write(m)))(`Aviso: Instagram (${o.tipo}): ${e.message}\n`); return { tipo: o.tipo, status: 'error', error: e.message, at: new Date().toISOString() }; }
}

async function main() {
  const o = parseCli({ tipo: { type: 'string', default: 'reel' }, url: { type: 'string' }, caption: { type: 'string', default: '' } });
  if (!o.url) {
    const ig = await instagramReady();
    console.log(ig ? `Instagram listo: cuenta ${ig}` : 'Instagram no disponible: vincula la cuenta a la página y da instagram_basic e instagram_content_publish al token.');
    return;
  }
  console.log(JSON.stringify(await publishInstagram(o), null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
}
