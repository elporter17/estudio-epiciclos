#!/usr/bin/env node
// Descarga a assets/fonts/ las fuentes completas que el render no puede tomar de @fontsource:
// - Noto Color Emoji (OFL, ~25 MB) para que los presets de emoji salgan iguales en cualquier máquina.
// - STIX Two Text normal e itálica (OFL), la de las fórmulas. @fontsource la parte en subconjuntos (latín, griego…)
//   con el mismo nombre interno, y en Linux Skia tomaba el griego: las letras salían en cuadros.
// No se suben al repo.
import fs from 'node:fs';
import path from 'node:path';
import { EMOJI_FONT, STIX_FONTS } from './lib/node-env.mjs';

const BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl';
const FILES = [
  [EMOJI_FONT, `${BASE}/notocoloremoji/NotoColorEmoji-Regular.ttf`, 1e6],
  [STIX_FONTS.normal, `${BASE}/stixtwotext/STIXTwoText%5Bwght%5D.ttf`, 1e5],
  [STIX_FONTS.italic, `${BASE}/stixtwotext/STIXTwoText-Italic%5Bwght%5D.ttf`, 1e5]
];
const force = process.argv.includes('--force');

for (const [file, url, minSize] of FILES) {
  const rel = path.relative(process.cwd(), file);
  if (fs.existsSync(file) && !force) { console.log(`Ya existe ${rel} (usa --force para bajarla de nuevo)`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  console.log(`Descargando ${path.basename(file)} desde google/fonts…`);
  const res = await fetch(url);
  if (!res.ok) { console.error(`No se pudo descargar ${rel} (${res.status} ${res.statusText})`); process.exit(1); }
  const buf = Buffer.from(await res.arrayBuffer());
  // Un TTF/OTF válido empieza con 0x00010000 u «OTTO»
  if (buf.length < minSize || !(buf.readUInt32BE(0) === 0x00010000 || buf.toString('ascii', 0, 4) === 'OTTO')) {
    console.error(`${rel}: el archivo descargado no parece una fuente TrueType.`); process.exit(1);
  }
  fs.writeFileSync(file, buf);
  console.log(`Listo: ${rel} (${(buf.length / 1e6).toFixed(1)} MB)`);
}
