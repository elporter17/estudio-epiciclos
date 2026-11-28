import fs from 'node:fs';
import path from 'node:path';
// Biblioteca de dibujos (video3d/biblioteca/*.svg): un guion puede usar { svg: "nombre" } sin traer el dibujo; se toma de
// la biblioteca. Los dibujos que trae el guion mandan sobre los de la biblioteca (para variantes de un solo video).
export function conBiblioteca(dibujos, escenas, raiz) {
  const dir = path.join(raiz, 'video3d', 'biblioteca'), out = { ...(dibujos || {}) };
  for (const e of escenas) for (const c of e.capas || []) if (c.svg && !out[c.svg]) {
    const f = path.join(dir, `${c.svg}.svg`);
    if (fs.existsSync(f)) out[c.svg] = fs.readFileSync(f, 'utf8'); else console.error(`Aviso: no existe el dibujo «${c.svg}» (ni en el guion ni en video3d/biblioteca)`);
  }
  return out;
}
