#!/usr/bin/env node
// Catálogo de la biblioteca de dibujos (video3d/biblioteca/*.svg): un PNG con todos y su nombre, para elegir piezas
// al escribir un guion «explica» sin tener que dibujar.
//   node scripts/biblioteca-catalogo.mjs   →  out/biblioteca.png
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ROOT } from './lib/node-env.mjs';

const DIR = path.join(ROOT, 'video3d', 'biblioteca'), salida = path.join(ROOT, 'out', 'biblioteca.png');
const nombres = fs.readdirSync(DIR).filter((f) => f.endsWith('.svg')).sort();
const T = 220, COL = 8, filas = Math.ceil(nombres.length / COL);
const cv = createCanvas(COL * (T + 10) + 10, filas * (T + 36) + 10), ctx = cv.getContext('2d');
ctx.fillStyle = '#1a1a22'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.font = 'bold 15px sans-serif';
const prop = (s) => { const m = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/.exec(s); return m ? +m[2] / +m[1] : 1; };
for (const [i, f] of nombres.entries()) {
  const x = 10 + (i % COL) * (T + 10), y = 10 + Math.floor(i / COL) * (T + 36), svg = fs.readFileSync(path.join(DIR, f), 'utf8');
  ctx.fillStyle = '#2b2b36'; ctx.fillRect(x, y, T, T);
  try { const p = prop(svg), w = p > 1 ? T / p : T, h = w * p; ctx.drawImage(await loadImage(Buffer.from(svg.replace('<svg ', `<svg width="${Math.round(w * 2)}" height="${Math.round(h * 2)}" `))), x + (T - w) / 2, y + (T - h) / 2, w, h); }
  catch (e) { ctx.fillStyle = '#f55'; ctx.fillText('ERROR', x + 8, y + 24); }
  ctx.fillStyle = '#ddd'; ctx.fillText(f.replace('.svg', ''), x + 4, y + T + 22);
}
fs.mkdirSync(path.dirname(salida), { recursive: true }); fs.writeFileSync(salida, cv.toBuffer('image/png'));
console.log(`${salida} · ${nombres.length} dibujos`);
