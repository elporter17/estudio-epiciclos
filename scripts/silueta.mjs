#!/usr/bin/env node
// Agrega tus propias imágenes (logos de equipos, siluetas, caras) a los famosos, limpias para que los círculos
// las dibujen bien: detecta el fondo, ajusta el umbral, quita manchitas y recorta. Deja una vista previa.
//
// Opción fácil: pon las imágenes en la carpeta siluetas/<tipo>/ (cara, pose, gol o logo) con el nombre que debe
// salir al final del video, por ejemplo «siluetas/logo/Real Madrid.png», y corre:
//   npm run silueta
// Una sola imagen:
//   npm run silueta -- --file escudo.png --nombre "Real Madrid" --tipo logo
// Si sale al revés (el fondo dibujado en vez de la figura) agrega --invert; si pierde detalles, prueba --thr 100…200.
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';
import { slug } from './lib/catalog.mjs';
import { limpiarSilueta, FAMOSOS, guardarFamosos } from './lib/famosos.mjs';
import { renderVideo } from './render.mjs';

const TIPOS = ['cara', 'pose', 'gol', 'logo'], INBOX = path.join(ROOT, 'siluetas');

async function agregar({ file, nombre, tipo, id, invert, thr, preview = true }) {
  if (!TIPOS.includes(tipo)) throw new Error(`--tipo debe ser ${TIPOS.join(' | ')}`);
  const sid = id || slug(nombre), out = path.join(ROOT, 'assets', 'famosos', `${sid}.png`);
  const r = await limpiarSilueta(fs.readFileSync(file), { invert: invert ?? 'auto', thr: thr ?? 'auto' });
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, r.png);
  const f = FAMOSOS.figuras.find((x) => x.id === sid) || (FAMOSOS.figuras.push({ id: sid }), FAMOSOS.figuras.at(-1));
  Object.assign(f, { nombre, tipo, imagen: `assets/famosos/${sid}.png`, origen: 'subida' }); delete f.error;
  guardarFamosos();
  console.error(`✓ ${nombre} (${tipo}) → assets/famosos/${sid}.png · ${r.w}x${r.h} · umbral ${r.thr}${r.invert ? ' · invertida' : ''} · figura ${(r.area * 100).toFixed(0)} % de la imagen`);
  if (r.area > 0.6) console.error('  Ojo: la figura ocupa casi toda la imagen; quizá quedó al revés (prueba --invert)');
  if (!preview) return;
  // Vista previa: la imagen limpia y el dibujo de los círculos casi terminado, lado a lado
  const still = path.join(ROOT, 'out', 'siluetas', `${sid}-dibujo.png`);
  await renderVideo({ image: out, name: nombre, revealText: nombre, style: 'z', guide: 0, spoiler: false, nseq: '1, 3, 8, 20, 50, 120, 250, 500', quality: 720, still: 28.5, out: still, quiet: true });
  const a = await loadImage(r.png), b = await loadImage(still), cv = createCanvas(1080, 640), g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 720, 640); const k = Math.min(680 / a.width, 600 / a.height);
  g.drawImage(a, (720 - a.width * k) / 2, (640 - a.height * k) / 2, a.width * k, a.height * k); g.drawImage(b, 720, 0, 360, 640);
  const prev = path.join(ROOT, 'out', 'siluetas', `${sid}-vista.png`); fs.writeFileSync(prev, cv.toBuffer('image/png'));
  console.error(`  Vista previa: ${prev}`);
}

async function main() {
  const o = parseCli({
    file: { type: 'string' }, nombre: { type: 'string' }, tipo: { type: 'string', default: 'logo' }, id: { type: 'string' },
    invert: { type: 'boolean' }, thr: { type: 'string' }, 'sin-vista': { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h', default: false }
  });
  if (o.help) { console.log('Uso: npm run silueta  (procesa siluetas/<tipo>/*.png)  o  npm run silueta -- --file imagen.png --nombre "Real Madrid" --tipo logo|cara|pose|gol [--invert] [--thr 0-255]'); return; }
  const common = { invert: o.invert, thr: o.thr != null ? +o.thr : undefined, preview: !o['sin-vista'] };
  if (o.file) {
    if (!o.nombre) throw new Error('Falta --nombre (lo que se escribe al final del video)');
    await agregar({ file: o.file, nombre: o.nombre, tipo: o.tipo, id: o.id, ...common });
    return;
  }
  // Carpeta siluetas/<tipo>/: el nombre del archivo es el nombre que sale en el video; las procesadas pasan a hechas/
  let n = 0;
  for (const tipo of TIPOS) {
    const dir = path.join(INBOX, tipo); if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => /\.(png|jpe?g|webp)$/i.test(x))) {
      const file = path.join(dir, f); await agregar({ file, nombre: f.replace(/\.[^.]+$/, '').trim(), tipo, ...common });
      const done = path.join(dir, 'hechas'); fs.mkdirSync(done, { recursive: true }); fs.renameSync(file, path.join(done, f)); n++;
    }
  }
  if (!n) {
    for (const t of TIPOS) fs.mkdirSync(path.join(INBOX, t), { recursive: true });
    console.error(`No hay imágenes nuevas. Pon PNG o JPG en ${path.relative(ROOT, INBOX)}${path.sep}<${TIPOS.join('|')}>${path.sep} con el nombre que debe salir (por ejemplo «Real Madrid.png») y vuelve a correr npm run silueta.`);
  } else console.error(`\n${n} imagen(es) agregadas a data/famosos.json. Revisa las vistas previas en out/siluetas/ y sube los cambios (git) para que el workflow las use.`);
}

main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
