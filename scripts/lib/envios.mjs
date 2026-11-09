// Envíos y videos en Supabase (supabase/programacion.sql: tablas «envios» y «videos»).
// Cada publicación pasa por conGuardia(): calcula la «huella» (sha256 del archivo; de las imágenes, sus URLs), revisa
// que esa misma huella no haya salido ya en esa red en las últimas 72 h (si salió, NO la repite: así no hay
// duplicados aunque una corrida se lance dos veces) y, al publicar, la registra con su enlace. Un reenvío que pides tú
// (REENVIO=si, scripts/republicar.mjs) sí se publica y queda marcado como reenvío.
// Los videos quedan en «videos» con el artefacto de su corrida de GitHub (30 días) para volver a publicarlos.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from './db.mjs';
import { ROOT } from './node-env.mjs';

const NOMBRE = { fb: 'Facebook', ig: 'Instagram', tt: 'TikTok', yt: 'YouTube' };
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const porUrl = new Map(); // URL pública de un video (Blob) → huella del archivo, para Instagram (publica por URL)
let ultimaVideo = null;   // la última huella de video de esta corrida (Instagram con la URL de otra corrida)
const guardados = new Set();

export function huellaArchivo(file) {
  try { return sha(fs.readFileSync(file)); } catch { return null; }
}
// La URL pública que se hizo de un archivo (scripts/lib/video-link.mjs la avisa)
export function anotarUrl(url, file) {
  const h = huellaArchivo(file);
  if (url && h) porUrl.set(url, h);
  return h;
}
function huellaDe({ file, url, urls, tipo }) {
  if (process.env.HUELLA_FORZADA) return process.env.HUELLA_FORZADA; // reenvío: la del video original
  if (file) return huellaArchivo(file);
  if (url && porUrl.has(url)) return porUrl.get(url);
  if (tipo === 'reel' && ultimaVideo) return ultimaVideo;
  if (urls?.length) return sha(urls.join('|'));
  if (url) return sha(`url:${url}`);
  return null;
}
const primeraLinea = (t) => String(t || '').split('\n').map((x) => x.trim()).find(Boolean)?.slice(0, 160) || null;
const formato = () => { const c = process.env.CATS_INPUT || '', f = process.env.FIGURA_INPUT || ''; return c ? `${c}${f && !/[,|]/.test(f) && f.length < 30 ? `:${f}` : ''}` : process.env.GITHUB_WORKFLOW || null; };
const avisar = (e) => { console.error(`Aviso: envíos (Supabase): ${e.message}`); return null; };

// El video en la base (una vez por huella). Si el archivo no está en out/, se copia ahí para que quede en el
// artefacto de la corrida («Video del día» en daily.yml) y se pueda volver a publicar
async function guardarVideo(file, huella, texto) {
  if (!huella || guardados.has(huella) || !process.env.GITHUB_RUN_ID) return;
  guardados.add(huella);
  const out = path.join(ROOT, 'out');
  let rel = path.relative(out, path.resolve(file));
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    rel = `videos/${huella.slice(0, 12)}.mp4`;
    try { fs.mkdirSync(path.join(out, 'videos'), { recursive: true }); fs.copyFileSync(file, path.join(out, rel)); } catch (e) { avisar(e); rel = null; }
  }
  await db('video-guardar', { video: { huella, formato: formato(), titulo: primeraLinea(texto), descripcion: texto || null, run_id: process.env.GITHUB_RUN_ID, artefacto: `video-${process.env.GITHUB_RUN_ID}`, archivo: rel?.split(path.sep).join('/') || null } }).catch(avisar);
}

// info: { red: fb|ig|tt|yt, tipo, file?, url?, urls?, texto? } · publicar: () => promesa del resultado ·
// extraer(r) → { post_id, url } · log
export async function conGuardia(info, publicar, extraer = () => ({}), log = (m) => process.stderr.write(m)) {
  const huella = huellaDe(info), reenvio = process.env.REENVIO === 'si';
  if (info.file && /\.mp4$/i.test(info.file)) ultimaVideo = huella;
  if (huella && !reenvio) {
    const ya = await db('envio-buscar', { red: info.red, huella, horas: 72 }).catch(avisar);
    if (ya?.length) {
      log(`⚠️ ${NOMBRE[info.red]}: esta misma publicación ya salió (${ya[0].creado}${ya[0].url ? ` · ${ya[0].url}` : ''}); no la repito.\n`);
      return { status: 'omitido', duplicado: true, error: 'ya se había publicado (huella igual)', anterior: ya[0], at: new Date().toISOString() };
    }
  }
  const r = await publicar();
  try {
    if (r && !['error', 'omitido'].includes(r.status)) {
      const { post_id = null, url = null } = extraer(r) || {};
      await db('envio-agregar', { envio: { red: info.red, huella, tipo: info.tipo || null, titulo: primeraLinea(info.texto), post_id, url, workflow: process.env.GITHUB_WORKFLOW || null, run_id: process.env.GITHUB_RUN_ID || null, reenvio } }).catch(avisar);
      if (!reenvio && info.file && /\.mp4$/i.test(info.file)) await guardarVideo(info.file, huella, info.texto);
    }
  } catch (e) { avisar(e); }
  return r;
}
