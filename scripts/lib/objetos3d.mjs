// Objetos en 3D (Fluent Emoji de Microsoft, MIT) para las animaciones de «Cómo se hace»: cada emoji del guion se dibuja
// con su versión 3D de assets/fluent3d/ (scripts/fluent3d.mjs las descarga); si no hay, con la fuente de emojis.
import fs from 'node:fs';
import path from 'node:path';
import { loadImage } from '@napi-rs/canvas';
import { ROOT } from './node-env.mjs';

// Los que dibujan las máquinas por su cuenta (además de los del guion)
export const EXTRA_MAQUINAS = ['❄️', '✅', '🚚', '🏪', '📦', '🔥', '💧', '💨', '✨', '🫧', '⚙️', '🌡️', '⏱️'];
export const codigo = (g) => [...g.replace(/️/g, '')].map((c) => c.codePointAt(0).toString(16)).join('-');
const DIR = path.join(ROOT, 'assets', 'fluent3d'), cache = new Map();

export async function cargarObjetos(glifos) {
  for (const g of glifos) {
    if (!g || cache.has(g)) continue;
    const f = path.join(DIR, `${codigo(g)}.png`);
    cache.set(g, fs.existsSync(f) ? await loadImage(fs.readFileSync(f)).catch(() => null) : null);
  }
}
export const objeto3d = (g) => cache.get(g) || null;
