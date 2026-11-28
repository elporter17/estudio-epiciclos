#!/usr/bin/env node
// Busca dibujos en la biblioteca por palabras (nombre, descripción y etiquetas del índice) antes de dibujar uno nuevo.
//   node scripts/biblioteca-buscar.mjs barco agua            → los 15 que mejor coinciden
//   node scripts/biblioteca-buscar.mjs barco --png           → además una imagen con ellos (out/busqueda.png)
//   node scripts/biblioteca-buscar.mjs --todo                → la lista completa, una línea por dibujo
// En un guion se usan por su nombre: { "svg": "<nombre>" }, y con «colores» se cambian sus colores sin redibujar:
//   { "svg": "persona", "colores": { "#f2a33a": "#3fa75a" } }
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ROOT } from './lib/node-env.mjs';

const BIB = path.join(ROOT, 'video3d', 'biblioteca'), indice = JSON.parse(fs.readFileSync(path.join(BIB, 'indice.json'), 'utf8'));
const args = process.argv.slice(2), png = args.includes('--png'), todo = args.includes('--todo');
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const q = args.filter((a) => !a.startsWith('--')).map(norm);
const linea = (x) => `${x.nombre.padEnd(34)} ${String(x.proporcion ?? '?').padEnd(6)} ${x.descripcion.slice(0, 120)}`;
if (todo) { for (const x of indice) console.log(linea(x)); console.log(`\n${indice.length} dibujos`); process.exit(0); }
if (!q.length) { console.log('Uso: node scripts/biblioteca-buscar.mjs palabra [palabra…] [--png] | --todo'); process.exit(0); }
const puntos = (x) => q.reduce((s, w) => s + (norm(x.nombre).includes(w) ? 3 : 0) + (x.etiquetas || []).some((t) => norm(t).startsWith(w)) * 2 + (norm(x.descripcion).includes(w) ? 1 : 0), 0);
const res = indice.map((x) => [puntos(x), x]).filter(([p]) => p > 0).sort((a, b) => b[0] - a[0]).slice(0, 15).map(([, x]) => x);
console.log('nombre                             alto/ancho descripción');
for (const x of res) console.log(linea(x));
if (!res.length) console.log('(nada: hay que dibujarlo)');
if (png && res.length) {
  const T = 200, cv = createCanvas(Math.min(res.length, 5) * (T + 10) + 10, Math.ceil(res.length / 5) * (T + 30) + 10), ctx = cv.getContext('2d');
  ctx.fillStyle = '#1a1a22'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.font = 'bold 13px sans-serif';
  for (const [i, x] of res.entries()) {
    const cx = 10 + (i % 5) * (T + 10), cy = 10 + Math.floor(i / 5) * (T + 30), svg = fs.readFileSync(path.join(BIB, `${x.nombre}.svg`), 'utf8'), p = x.proporcion || 1;
    const w = p > 1 ? T / p : T, h = w * p;
    ctx.fillStyle = '#2b2b36'; ctx.fillRect(cx, cy, T, T);
    try { ctx.drawImage(await loadImage(Buffer.from(svg.replace('<svg ', `<svg width="${Math.round(w * 2)}" height="${Math.round(h * 2)}" `))), cx + (T - w) / 2, cy + (T - h) / 2, w, h); } catch { }
    ctx.fillStyle = '#ddd'; ctx.fillText(x.nombre.slice(0, 28), cx + 2, cy + T + 18);
  }
  fs.writeFileSync(path.join(ROOT, 'out', 'busqueda.png'), cv.toBuffer('image/png'));
  console.log('\nImagen: out/busqueda.png');
}
