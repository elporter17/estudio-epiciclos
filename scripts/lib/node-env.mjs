// Prepara src/engine.js para correr en Node: lienzos de @napi-rs/canvas y las mismas fuentes que la web.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts, Path2D, DOMMatrix } from '@napi-rs/canvas';
import { setEnv } from '../../src/engine.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const EMOJI_FONT = path.join(ROOT, 'assets', 'fonts', 'NotoColorEmoji-Regular.ttf');

// Las familias de Google Fonts que carga index.html, desde los paquetes @fontsource (woff2).
// Cada subconjunto es un archivo aparte con el mismo nombre de familia, y Skia no los combina: con
// varios registrados se queda con uno al azar (en Linux salía el griego y el latín quedaba en cuadros).
// Por eso solo «latin» lleva el nombre real; los demás van como «<familia> <subconjunto>» y se piden
// como respaldo (env.stix, fonts.clasica).
const FONTSOURCE = [
  ['stix-two-text', 'STIX Two Text', /-(latin|latin-ext|greek)-400-(normal|italic)\.woff2$/],
  ['ibm-plex-sans', 'IBM Plex Sans', /-(latin|latin-ext)-(400|500|600)-normal\.woff2$/],
  ['ibm-plex-mono', 'IBM Plex Mono', /-(latin|latin-ext)-400-normal\.woff2$/],
  ['pacifico', 'Pacifico', /-(latin|latin-ext)-400-normal\.woff2$/],
  ['playfair-display', 'Playfair Display', /-(latin|latin-ext)-700-normal\.woff2$/],
  ['archivo-black', 'Archivo Black', /-(latin|latin-ext)-400-normal\.woff2$/]
];
const STIX_EXTRA = ', "STIX Two Text greek", "STIX Two Text latin-ext"';
const SYSTEM_EMOJI = ['Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji'];

let ready = null;
export function setupNode() {
  if (ready) return ready;
  for (const [pkg, family, re] of FONTSOURCE) {
    const dir = path.join(ROOT, 'node_modules', '@fontsource', pkg, 'files');
    for (const f of fs.readdirSync(dir).filter((f) => re.test(f)).sort()) {
      const subset = f.match(re)[1];
      GlobalFonts.registerFromPath(path.join(dir, f), subset === 'latin' ? family : `${family} ${subset}`);
    }
  }
  // Emoji: Noto Color Emoji del repo (npm run fonts) para que el resultado sea igual en cualquier máquina;
  // si no está, la fuente de emoji del sistema (Segoe en Windows, Apple en macOS).
  const custom = process.env.CIRCULARTE_EMOJI_FONT || EMOJI_FONT;
  let emoji = null, emojiSource = null;
  if (fs.existsSync(custom)) { GlobalFonts.registerFromPath(custom, 'Noto Color Emoji'); emoji = 'Noto Color Emoji'; emojiSource = custom; }
  else {
    const have = new Set(GlobalFonts.families.map((f) => f.family));
    emoji = SYSTEM_EMOJI.find((f) => have.has(f)) || null; emojiSource = emoji && 'sistema';
  }
  setEnv({
    createCanvas: (w, h) => createCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))),
    Path2D, DOMMatrix,
    loadFont: async () => {},
    fonts: { clasica: `"STIX Two Text"${STIX_EXTRA}, "Times New Roman", serif`, ...(emoji ? { emoji: `"${emoji}"` } : {}) },
    fallback: emoji ? `, "${emoji}"` : '',
    stix: STIX_EXTRA, sim: '~'
  });
  ready = { emoji, emojiSource };
  return ready;
}
