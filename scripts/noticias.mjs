#!/usr/bin/env node
// Junta las noticias recientes (videojuegos, fútbol, ciencia) de los RSS de scripts/lib/noticias.mjs y las guarda en
// data/noticias-hoy.json (estado cifrado de Actions, no va a git). El Reel «Noticias de hoy» las toma de ahí.
// Solo titulares, medio, fecha y enlace: la imagen y el video se arman con texto propio y citan la fuente.
//   node scripts/noticias.mjs [--horas 36]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';
import { FUENTES, leerFuente } from './lib/noticias.mjs';

export const ARCHIVO = path.join(ROOT, 'data', 'noticias-hoy.json');

// Las más recientes de las últimas «horas», sin repetir enlace, con titulares que se leen en unos segundos
export async function juntarNoticias({ horas = 36, max = 24 } = {}) {
  const todas = (await Promise.all(FUENTES.map((f) => leerFuente(f).catch(() => [])))).flat();
  const limite = Date.now() - horas * 3600e3, vistas = new Set();
  // Fuera las ofertas y publicidad que algunos medios mezclan en su RSS
  const anuncio = /precio|oferta|descuento|rebaja|chollo|cup[oó]n|black friday|cyber monday|amazon|mediamarkt|aliexpress|c[oó]digo promocional|compra|barat/i;
  return todas.filter((n) => n.fecha >= limite && n.titulo.length >= 25 && n.titulo.length <= 150 && !anuncio.test(n.titulo) && !vistas.has(n.link) && vistas.add(n.link))
    .sort((a, b) => b.fecha - a.fecha).slice(0, max);
}

async function main() {
  const o = parseCli({ horas: { type: 'string', default: '36' } });
  const items = await juntarNoticias({ horas: +o.horas });
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, JSON.stringify({ fecha: new Date().toISOString(), items }, null, 2) + '\n');
  const porCat = items.reduce((a, n) => ({ ...a, [n.cat]: (a[n.cat] || 0) + 1 }), {});
  console.log(`Noticias guardadas: ${items.length} ${JSON.stringify(porCat)}`);
  for (const n of items.slice(0, 8)) console.log(`· [${n.cat}] ${n.titulo} (${n.medio})`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
}
