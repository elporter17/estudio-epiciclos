// Prepara src/engine.js para correr en Node: lienzos de @napi-rs/canvas y las mismas fuentes que la web.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts, Path2D, DOMMatrix } from '@napi-rs/canvas';
import { setEnv } from '../../src/engine.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FONT_DIR = path.join(ROOT, 'assets', 'fonts');
export const EMOJI_FONT = path.join(FONT_DIR, 'NotoColorEmoji-Regular.ttf');
// STIX Two Text completa (npm run fonts): latín y griego en un solo archivo por estilo
export const STIX_FONTS = { normal: path.join(FONT_DIR, 'STIXTwoText.ttf'), italic: path.join(FONT_DIR, 'STIXTwoText-Italic.ttf') };

// Las demás familias de Google Fonts que carga index.html, desde @fontsource, solo el subconjunto «latin»
// (trae tildes y ñ). Cada subconjunto es un archivo con el mismo nombre interno de familia y Skia no los
// combina: con varios registrados toma uno al azar, y en Linux salían letras en cuadros.
const FONTSOURCE = [
  ['ibm-plex-sans', /-latin-(400|500|600)-normal\.woff2$/],
  ['ibm-plex-mono', /-latin-400-normal\.woff2$/],
  ['pacifico', /-latin-400-normal\.woff2$/],
  ['playfair-display', /-latin-700-normal\.woff2$/],
  ['archivo-black', /-latin-400-normal\.woff2$/]
];
const SYSTEM_EMOJI = ['Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji'];

// Una fuente a la que le falta una letra la dibuja como cuadro, igual que cualquier carácter inexistente:
// si «a» (o «Σ» en STIX) se dibuja idéntica a U+E000 (uso privado, ninguna fuente lo trae), la familia falla.
function checkFonts() {
  const cv = createCanvas(64, 64), ctx = cv.getContext('2d'), bad = [];
  const draw = (font, ch) => { ctx.clearRect(0, 0, 64, 64); ctx.font = font; ctx.fillStyle = '#000'; ctx.fillText(ch, 8, 48); return Buffer.from(cv.data()); };
  const fams = [['400', 'normal', 'STIX Two Text', 'aΣ'], ['400', 'italic', 'STIX Two Text', 'a'], ['600', 'normal', 'IBM Plex Sans', 'aá'],
    ['400', 'normal', 'IBM Plex Mono', 'a'], ['400', 'normal', 'Pacifico', 'aá'], ['700', 'normal', 'Playfair Display', 'a'], ['400', 'normal', 'Archivo Black', 'a']];
  for (const [w, st, fam, chars] of fams) {
    const font = `${st} ${w} 40px "${fam}"`, tofu = draw(font, '');
    for (const ch of chars) if (draw(font, ch).equals(tofu)) bad.push(`${fam} ${st} «${ch}»`);
  }
  if (bad.length) throw new Error(`Fuentes que no dibujan texto (saldrían cuadros): ${bad.join(', ')}. Ejecuta «npm run fonts».`);
}

let ready = null;
export function setupNode() {
  if (ready) return ready;
  for (const [pkg, re] of FONTSOURCE) {
    const dir = path.join(ROOT, 'node_modules', '@fontsource', pkg, 'files');
    for (const f of fs.readdirSync(dir).filter((f) => re.test(f))) GlobalFonts.registerFromPath(path.join(dir, f));
  }
  for (const f of Object.values(STIX_FONTS)) {
    if (!fs.existsSync(f)) throw new Error(`Falta ${path.relative(ROOT, f)}. Ejecuta «npm run fonts» (descarga STIX Two Text).`);
    GlobalFonts.registerFromPath(f, 'STIX Two Text');
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
  checkFonts();
  setEnv({
    createCanvas: (w, h) => createCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))),
    Path2D, DOMMatrix,
    loadFont: async () => {},
    fonts: emoji ? { emoji: `"${emoji}"` } : {},
    fallback: emoji ? `, "${emoji}"` : '',
    // STIX Two Text no trae «∼» (U+223C)
    sim: '~'
  });
  ready = { emoji, emojiSource };
  return ready;
}
