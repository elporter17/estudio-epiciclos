// Fotos y videos reales de Pixabay (Pixabay Content License: uso comercial permitido, sin atribución obligatoria;
// igual se acredita a Pixabay en la descripción, como pide su API). Necesita PIXABAY_API_KEY; sin ella todo devuelve
// null y los Reels usan el fondo de color. Pixabay pide guardar las búsquedas 24 h y descargar los archivos (no enlazarlos):
// las búsquedas y los clips ya usados quedan en data/stock.json (estado de Actions); los archivos, en una caché temporal.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './node-env.mjs';

const API = 'https://pixabay.com/api', CACHE = path.join(os.tmpdir(), 'stock-cache');
const ESTADO = path.join(ROOT, 'data', 'stock.json');
const estado = (() => { try { return { busquedas: {}, videos: [], fotos: [], ...JSON.parse(fs.readFileSync(ESTADO, 'utf8')) }; } catch { return { busquedas: {}, videos: [], fotos: [] }; } })();
export const stockListo = () => !!process.env.PIXABAY_API_KEY;
export const autores = new Set();

// Búsqueda con caché de 24 h (lo pide Pixabay); solo se guardan los campos que se usan
async function buscar(tipo, q) {
  const k = `${tipo}:${q}`, c = estado.busquedas[k];
  if (c && Date.now() - c.t < 24 * 3600e3) return c.hits;
  const u = new URL(tipo === 'video' ? `${API}/videos/` : `${API}/`);
  u.search = new URLSearchParams({ key: process.env.PIXABAY_API_KEY, q: q.slice(0, 100), safesearch: 'true', per_page: '20', ...(tipo === 'video' ? { video_type: 'film' } : { image_type: 'photo' }) });
  const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Pixabay ${r.status}`);
  const hits = ((await r.json()).hits || []).map((h) => tipo === 'video'
    ? { id: h.id, user: h.user, dur: h.duration, v: ['medium', 'large', 'small'].map((n) => h.videos?.[n]).filter((x) => x?.url).map(({ url, width, height }) => ({ url, width, height })) }
    : { id: h.id, user: h.user, url: h.largeImageURL, width: h.imageWidth, height: h.imageHeight });
  estado.busquedas[k] = { t: Date.now(), hits };
  return hits;
}
async function bajar(url, archivo) {
  if (fs.existsSync(archivo) && fs.statSync(archivo).size > 0) return archivo;
  fs.mkdirSync(CACHE, { recursive: true });
  const r = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error(`descarga ${r.status}`);
  fs.writeFileSync(archivo, Buffer.from(await r.arrayBuffer()));
  return archivo;
}
// El primero que no se usó hace poco (si todos se usaron, uno al azar de los primeros)
const elegir = (lista, vistos) => lista.find((x) => !vistos.includes(x.id)) || lista[Math.floor(Math.random() * Math.min(5, lista.length))];

// Clip de al menos «minDur» s; prefiere los verticales (los horizontales se recortan al centro para 9:16)
export async function videoStock(consulta, { minDur = 5 } = {}) {
  if (!stockListo() || !consulta) return null;
  try {
    const hits = (await buscar('video', consulta)).filter((h) => h.dur >= minDur && h.v.length);
    const ordenados = [...hits.filter((h) => h.v[0].height > h.v[0].width), ...hits.filter((h) => h.v[0].height <= h.v[0].width)];
    const h = elegir(ordenados, estado.videos); if (!h) return null;
    // La calidad más liviana que todavía tenga 1080 de alto (o la mayor que haya)
    const f = [...h.v].sort((a, b) => a.height - b.height).find((x) => Math.min(x.width, x.height) >= 1080 || x.height >= 1080) || h.v[0];
    estado.videos = [...estado.videos.filter((x) => x !== h.id), h.id].slice(-600); autores.add(h.user);
    return { archivo: await bajar(f.url, path.join(CACHE, `v${h.id}-${f.height}.mp4`)), id: h.id, autor: h.user };
  } catch (e) { console.error(`Pixabay («${consulta}»): ${e.message}`); return null; }
}

export async function fotoStock(consulta) {
  if (!stockListo() || !consulta) return null;
  try {
    const h = elegir(await buscar('foto', consulta), estado.fotos); if (!h) return null;
    estado.fotos = [...estado.fotos.filter((x) => x !== h.id), h.id].slice(-600); autores.add(h.user);
    return { archivo: await bajar(h.url, path.join(CACHE, `f${h.id}.jpg`)), id: h.id, autor: h.user };
  } catch (e) { console.error(`Pixabay («${consulta}»): ${e.message}`); return null; }
}

// Pone el video de fondo a cada escena con «consulta» (e.fondo) y las fotos de «¿Qué prefieres?» (e.fotoA / e.fotoB).
// Una misma consulta en varias escenas reutiliza el mismo clip.
export async function ponerFondos(escenas) {
  if (!stockListo()) return 0;
  const memo = new Map(); let n = 0;
  for (const e of escenas) {
    if (e.consulta) {
      if (!memo.has(e.consulta)) memo.set(e.consulta, await videoStock(e.consulta, { minDur: Math.min(8, Math.ceil(e.dur)) }));
      const v = memo.get(e.consulta); if (v) { e.fondo = v.archivo; n++; }
    }
    for (const k of ['A', 'B']) if (e[`consulta${k}`]) { const f = await fotoStock(e[`consulta${k}`]); if (f) { e[`foto${k}`] = f.archivo; n++; } }
  }
  return n;
}
export function guardarStock() {
  for (const [k, c] of Object.entries(estado.busquedas)) if (Date.now() - c.t > 24 * 3600e3) delete estado.busquedas[k];
  fs.mkdirSync(path.dirname(ESTADO), { recursive: true }); fs.writeFileSync(ESTADO, JSON.stringify(estado) + '\n');
}
export const creditoStock = () => autores.size ? `\n\n🎥 Videos e imágenes: Pixabay (${[...autores].filter(Boolean).slice(0, 6).join(', ')})` : '';
