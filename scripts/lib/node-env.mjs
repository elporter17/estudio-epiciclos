// Prepara src/engine.js para correr en Node: lienzos de @napi-rs/canvas y las mismas fuentes que la web.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts, Path2D, DOMMatrix } from '@napi-rs/canvas';
import { setEnv } from '../../src/engine.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const EMOJI_FONT = path.join(ROOT, 'assets', 'fonts', 'NotoColorEmoji-Regular.ttf');

// Las familias de Google Fonts que carga index.html, desde los paquetes @fontsource (woff2)
const FONTSOURCE = [
  ['stix-two-text', /-(latin|latin-ext|greek)-400-(normal|italic)\.woff2$/],
  ['ibm-plex-sans', /-(latin|latin-ext)-(400|500|600)-normal\.woff2$/],
  ['ibm-plex-mono', /-(latin|latin-ext)-400-normal\.woff2$/],
  ['pacifico', /-(latin|latin-ext)-400-normal\.woff2$/],
  ['playfair-display', /-(latin|latin-ext)-700-normal\.woff2$/],
  ['archivo-black', /-(latin|latin-ext)-400-normal\.woff2$/]
];
const SYSTEM_EMOJI = ['Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji'];

let ready = null;
export function setupNode() {
  if (ready) return ready;
  for (const [pkg, re] of FONTSOURCE) {
    const dir = path.join(ROOT, 'node_modules', '@fontsource', pkg, 'files');
    for (const f of fs.readdirSync(dir).filter((f) => re.test(f))) GlobalFonts.registerFromPath(path.join(dir, f));
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
    fonts: emoji ? { emoji: `"${emoji}"` } : {},
    fallback: emoji ? `, "${emoji}"` : ''
  });
  ready = { emoji, emojiSource };
  return ready;
}
