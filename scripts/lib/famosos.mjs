// Figuras de famosos (data/famosos.json) y limpieza de imágenes para que los círculos las dibujen bien:
// fondo detectado solo (claro u oscuro), umbral automático (Otsu), sin manchitas sueltas, recortada y en negro sobre
// transparente. La usan famosos-imagenes.mjs (imágenes generadas) y silueta.mjs (las que sube el usuario).
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ROOT } from './node-env.mjs';

export const FAMOSOS_FILE = path.join(ROOT, 'data', 'famosos.json');
export const FAMOSOS = JSON.parse(fs.readFileSync(FAMOSOS_FILE, 'utf8'));
export const guardarFamosos = () => fs.writeFileSync(FAMOSOS_FILE, JSON.stringify(FAMOSOS, null, 2) + '\n');
export const imagenFamoso = (f) => f.imagen && path.join(ROOT, f.imagen);

function otsu(lum) {
  const hist = new Float64Array(256); for (const v of lum) hist[v]++;
  const n = lum.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sb = 0, wb = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) {
    wb += hist[t]; if (!wb) continue; const wf = n - wb; if (!wf) break;
    sb += t * hist[t]; const mb = sb / wb, mf = (sum - sb) / wf, v = wb * wf * (mb - mf) ** 2;
    if (v > best) { best = v; thr = t; }
  }
  return thr;
}

// src: ruta o Buffer de una imagen. opts: { invert: 'auto'|true|false, thr: 'auto'|0-255, max: lado mayor }
export async function limpiarSilueta(src, opts = {}) {
  const img = await loadImage(src), max = opts.max || 900;
  const k = Math.min(1, max / Math.max(img.width, img.height)), W = Math.round(img.width * k), H = Math.round(img.height * k);
  const c = createCanvas(W, H), g = c.getContext('2d'); g.drawImage(img, 0, 0, W, H);
  const { data } = g.getImageData(0, 0, W, H), lum = new Uint8Array(W * H);
  // Lo transparente cuenta como fondo blanco
  for (let i = 0; i < W * H; i++) { const a = data[i * 4 + 3] / 255; lum[i] = Math.round(255 * (1 - a) + a * (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2])); }
  const thr = opts.thr == null || opts.thr === 'auto' ? otsu(lum) : +opts.thr;
  // Fondo: el tono que domina en el borde de la imagen
  let edge = 0, ne = 0; for (let x = 0; x < W; x++) { edge += lum[x] + lum[(H - 1) * W + x]; ne += 2; } for (let y = 0; y < H; y++) { edge += lum[y * W] + lum[y * W + W - 1]; ne += 2; }
  const invert = opts.invert == null || opts.invert === 'auto' ? edge / ne < thr : !!opts.invert;
  const mask = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) mask[i] = (lum[i] < thr) !== invert ? 1 : 0;
  // Quitar manchitas: regiones de figura de menos del 0,15 % del área
  const seen = new Uint8Array(W * H), minArea = W * H * 0.0015, stack = [];
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || seen[s]) continue;
    const comp = []; stack.push(s); seen[s] = 1;
    while (stack.length) { const i = stack.pop(); comp.push(i); const x = i % W, y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && mask[j] && !seen[j]) { seen[j] = 1; stack.push(j); } }
    if (comp.length < minArea) for (const i of comp) mask[i] = 0;
  }
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) throw new Error('La imagen quedó vacía: prueba con --invert o con otro --thr');
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04), ow = x1 - x0 + 1 + 2 * pad, oh = y1 - y0 + 1 + 2 * pad;
  const o = createCanvas(ow, oh), og = o.getContext('2d'), id = og.createImageData(ow, oh);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (mask[y * W + x]) id.data[((y - y0 + pad) * ow + (x - x0 + pad)) * 4 + 3] = 255;
  og.putImageData(id, 0, 0);
  const area = mask.reduce((a, b) => a + b, 0) / (W * H);
  return { png: o.toBuffer('image/png'), w: ow, h: oh, thr, invert, area };
}
