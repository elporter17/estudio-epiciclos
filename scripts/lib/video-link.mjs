// Enlace público al MP4 de cada corrida (Vercel Blob), para bajarlo desde el teléfono sin entrar a GitHub.
// Necesita el secreto BLOB_READ_WRITE_TOKEN (el mismo almacén que usa la web); sin él no hace nada.
// Borra los videos de más de 2 días para no llenar el almacén (1 GB gratis): Facebook, Instagram y TikTok los copian
// en minutos, así que solo hacen falta para bajarlos desde el teléfono el mismo día o el siguiente.
import fs from 'node:fs';
import path from 'node:path';
import { put, list, del } from '@vercel/blob';
import { anotarUrl } from './envios.mjs';
import { db } from './db.mjs';

// Respaldo: Supabase Storage (bucket público «videos»). La subida se firma en Vercel (/api/datos), que es donde están las claves.
const MARCA_SB = '/storage/v1/object/public/videos/';
async function publicarEnSupabase(file, { log }) {
  const nombre = `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 7)}-${path.basename(file)}`;
  const f = await db('almacen-firmar', { nombre });
  if (!f?.subir) throw new Error('El almacén de respaldo no está disponible');
  const form = new FormData();
  form.append('cacheControl', '3600');
  form.append('', new Blob([fs.readFileSync(file)], { type: 'video/mp4' }), path.basename(file));
  const r = await fetch(f.subir, { method: 'PUT', body: form, signal: AbortSignal.timeout(180000) });
  if (!r.ok) throw new Error(`No se pudo subir al almacén de respaldo (${r.status}): ${(await r.text()).slice(0, 160)}`);
  if (Math.random() < 0.2) await db('almacen-borrar', { dias: 3 }).catch(() => {});
  anotarUrl(f.publica, file);
  log(`Enlace directo al video (almacén de respaldo): ${f.publica}\n`);
  return { url: f.publica, downloadUrl: `${f.publica}?download=` };
}

const PREFIX = 'circularte-videos/';
export const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN
  || Object.entries(process.env).find(([k, v]) => k.endsWith('_READ_WRITE_TOKEN') && String(v).startsWith('vercel_blob_rw_'))?.[1];

let blobCaido = false;
export async function publicarEnlace(file, { days = 2, log = (m) => process.stderr.write(m) } = {}) {
  const token = blobToken();
  if (!token || blobCaido) {
    if (!token) log('Sin BLOB_READ_WRITE_TOKEN: uso el almacén de respaldo\n');
    return publicarEnSupabase(file, { log });
  }
  // downloadUrl (?download=1) hace que el teléfono lo descargue en vez de solo reproducirlo
  let url, downloadUrl;
  try { ({ url, downloadUrl } = await put(PREFIX + path.basename(file), fs.readFileSync(file), { access: 'public', token, addRandomSuffix: true, contentType: 'video/mp4' })); }
  catch (e) { blobCaido = true; log(`Vercel Blob no respondió (${e.message}): uso el almacén de respaldo\n`); return publicarEnSupabase(file, { log }); }
  // Borrar los viejos pide la lista del almacén (operación avanzada del plan gratis de Vercel): 1 de cada 5 subidas
  if (Math.random() < 0.2) try {
    const viejos = [], limite = Date.now() - days * 864e5;
    let cursor;
    do {
      const r = await list({ prefix: PREFIX, token, cursor });
      for (const b of r.blobs) if (Date.parse(b.uploadedAt) < limite) viejos.push(b.url);
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    if (viejos.length) { await del(viejos, { token }); log(`Borrados ${viejos.length} video(s) de más de ${days} días del almacén\n`); }
  } catch (e) { log(`No se pudieron borrar videos viejos: ${e.message}\n`); }
  anotarUrl(url, file); // Instagram publica por esta URL: así sabe qué archivo es (scripts/lib/envios.mjs)
  log(`Enlace directo al video: ${url}\n`);
  return { url, downloadUrl: downloadUrl || `${url}?download=1` };
}

// Borra un video del almacén apenas deja de hacer falta (la copia de Instagram, cuando Instagram ya lo publicó)
export async function borrarEnlace(url) {
  if (String(url || '').includes(MARCA_SB)) { await db('almacen-borrar', { nombre: decodeURIComponent(url.split(MARCA_SB)[1].split('?')[0]) }).catch(() => {}); return; }
  const token = blobToken(); if (!token || !url) return;
  await del(url, { token }).catch(() => {});
}
