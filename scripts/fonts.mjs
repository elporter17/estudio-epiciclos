#!/usr/bin/env node
// Descarga Noto Color Emoji (OFL) a assets/fonts/ para que los presets de emoji salgan iguales en
// cualquier máquina, incluido un runner de Linux sin fuentes de emoji. Unos 25 MB; no se sube al repo.
import fs from 'node:fs';
import path from 'node:path';
import { EMOJI_FONT } from './lib/node-env.mjs';

const URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notocoloremoji/NotoColorEmoji-Regular.ttf';

if (fs.existsSync(EMOJI_FONT) && !process.argv.includes('--force')) {
  console.log(`Ya existe ${path.relative(process.cwd(), EMOJI_FONT)} (usa --force para bajarla de nuevo)`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(EMOJI_FONT), { recursive: true });
console.log(`Descargando Noto Color Emoji desde google/fonts…`);
const res = await fetch(URL);
if (!res.ok) { console.error(`No se pudo descargar (${res.status} ${res.statusText})`); process.exit(1); }
const buf = Buffer.from(await res.arrayBuffer());
// Un TTF/OTF válido empieza con 0x00010000 u «OTTO»
if (buf.length < 1e6 || !(buf.readUInt32BE(0) === 0x00010000 || buf.toString('ascii', 0, 4) === 'OTTO')) {
  console.error('El archivo descargado no parece una fuente TrueType.'); process.exit(1);
}
fs.writeFileSync(EMOJI_FONT, buf);
console.log(`Listo: ${path.relative(process.cwd(), EMOJI_FONT)} (${(buf.length / 1e6).toFixed(1)} MB)`);
