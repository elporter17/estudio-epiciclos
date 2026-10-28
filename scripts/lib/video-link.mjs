// Enlace público al MP4 de cada corrida (Vercel Blob), para bajarlo desde el teléfono sin entrar a GitHub.
// Necesita el secreto BLOB_READ_WRITE_TOKEN (el mismo almacén que usa la web); sin él no hace nada.
// Borra los videos de más de 7 días para no llenar el almacén.
import fs from 'node:fs';
import path from 'node:path';
import { put, list, del } from '@vercel/blob';

const PREFIX = 'circularte-videos/';
export const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN
  || Object.entries(process.env).find(([k, v]) => k.endsWith('_READ_WRITE_TOKEN') && String(v).startsWith('vercel_blob_rw_'))?.[1];

export async function publicarEnlace(file, { days = 7, log = (m) => process.stderr.write(m) } = {}) {
  const token = blobToken();
  if (!token) { log('Sin BLOB_READ_WRITE_TOKEN: no hay enlace directo al video\n'); return null; }
  // downloadUrl (?download=1) hace que el teléfono lo descargue en vez de solo reproducirlo
  const { url, downloadUrl } = await put(PREFIX + path.basename(file), fs.readFileSync(file), { access: 'public', token, addRandomSuffix: true, contentType: 'video/mp4' });
  try {
    const viejos = [], limite = Date.now() - days * 864e5;
    let cursor;
    do {
      const r = await list({ prefix: PREFIX, token, cursor });
      for (const b of r.blobs) if (Date.parse(b.uploadedAt) < limite) viejos.push(b.url);
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    if (viejos.length) { await del(viejos, { token }); log(`Borrados ${viejos.length} video(s) de más de ${days} días del almacén\n`); }
  } catch (e) { log(`No se pudieron borrar videos viejos: ${e.message}\n`); }
  log(`Enlace directo al video: ${url}\n`);
  return { url, downloadUrl: downloadUrl || `${url}?download=1` };
}
