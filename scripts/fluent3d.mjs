#!/usr/bin/env node
// Descarga los objetos en 3D de Fluent Emoji (Microsoft, licencia MIT: github.com/microsoft/fluentui-emoji) que usan
// las animaciones de «Cómo se hace», a 256 px, en assets/fluent3d/<código>.png (van en el repo: así las corridas no
// dependen de la red). Se vuelve a correr cuando data/como-se-hace.json usa emojis nuevos.
//   node scripts/fluent3d.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ROOT } from './lib/node-env.mjs';
import { EXTRA_MAQUINAS, codigo } from './lib/objetos3d.mjs';

const DIR = path.join(ROOT, 'assets', 'fluent3d'), CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/';
const datos = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'como-se-hace.json'), 'utf8'));
const usados = new Set(EXTRA_MAQUINAS);
for (const p of datos) { usados.add(p.icono); for (const x of p.pasos) for (const g of [x.entrada, x.salida, ...(x.extra || [])]) if (g) usados.add(g); }
const faltan = [...usados].filter((g) => !fs.existsSync(path.join(DIR, `${codigo(g)}.png`)));
if (!faltan.length) { console.log(`Ya están los ${usados.size} objetos`); process.exit(0); }

// Árbol del repo (con gh, ya autenticado) y el metadata.json de cada carpeta para saber qué emoji es
const arbol = JSON.parse(execFileSync('gh', ['api', 'repos/microsoft/fluentui-emoji/git/trees/main?recursive=1'], { encoding: 'utf8', maxBuffer: 64 << 20 })).tree.map((x) => x.path);
const carpetas = arbol.filter((p) => /^assets\/[^/]+\/metadata\.json$/.test(p)).map((p) => p.split('/')[1]);
const porGlifo = new Map(), sinVS = (g) => g.replace(/️/g, '');
// jsDelivr a veces responde con error si se le pide mucho a la vez: se reintenta
async function bajar(url, intentos = 4) {
  for (let k = 0; k < intentos; k++) { const r = await fetch(url).catch(() => null); if (r?.ok) return r; await new Promise((ok) => setTimeout(ok, 800 * (k + 1))); }
  throw new Error(`no se pudo bajar ${url}`);
}
let i = 0;
async function trabajador() {
  while (i < carpetas.length) {
    const c = carpetas[i++];
    try { const m = await (await bajar(CDN + `assets/${encodeURIComponent(c)}/metadata.json`)).json(); porGlifo.set(sinVS(m.glyph), c); } catch { /* se ignora */ }
  }
}
await Promise.all(Array.from({ length: 12 }, trabajador));
fs.mkdirSync(DIR, { recursive: true });
let ok = 0;
for (const g of faltan) {
  const c = porGlifo.get(sinVS(g)); if (!c) { console.log(`Sin versión 3D: ${g}`); continue; }
  const png = arbol.find((p) => p.startsWith(`assets/${c}/Default/3D/`) && p.endsWith('.png')) || arbol.find((p) => p.startsWith(`assets/${c}/3D/`) && p.endsWith('.png'));
  if (!png) { console.log(`Sin PNG 3D: ${g}`); continue; }
  const img = await bajar(CDN + png.split('/').map(encodeURIComponent).join('/')).then(async (r) => loadImage(Buffer.from(await r.arrayBuffer()))).catch((e) => { console.log(`No se pudo: ${g} (${e.message})`); return null; });
  if (!img) continue;
  const cv = createCanvas(256, 256); cv.getContext('2d').drawImage(img, 0, 0, 256, 256);
  fs.writeFileSync(path.join(DIR, `${codigo(g)}.png`), cv.toBuffer('image/png')); ok++;
}
console.log(`Objetos 3D nuevos: ${ok} de ${faltan.length} (total usados: ${usados.size})`);
