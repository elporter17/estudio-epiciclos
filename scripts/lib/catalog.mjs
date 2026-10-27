// Qué se puede dibujar: presets de la web, funciones inventadas, texto libre y la biblioteca de la publicación automática.
import fs from 'node:fs';
import path from 'node:path';
import { PRESETS, INVENT_TYPES, COMPLEX_TYPES, presetSrc, inventFn, funName, makeRng } from '../../src/engine.js';
import { FISICA_MODES, FISICA_NAMES, fisicaGroup } from '../../src/fisica.js';

// data/biblioteca.json: 500 nombres, 100 parejas y 100 figuras de emoji para la publicación automática
export const BIBLIOTECA = JSON.parse(fs.readFileSync(new URL('../../data/biblioteca.json', import.meta.url), 'utf8'));
// data/famosos.json: futbolistas (caras, poses y goles) con su silueta en assets/famosos/; las que no tienen imagen no entran
const FAMOSOS_DATA = JSON.parse(fs.readFileSync(new URL('../../data/famosos.json', import.meta.url), 'utf8'));
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');

export const norm = (s) => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
export const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'figura';
export const isEmoji = (p) => p.font === 'emoji';

// Semilla estable a partir de un texto (para que el mismo pedido dé el mismo video)
export { hashSeed } from '../../src/captions.js';

export function findPreset(name) {
  const n = norm(name);
  return PRESETS.find((p) => norm(p.name) === n || (p.en && norm(p.en) === n)) || null;
}

// Todo lo que pick.mjs puede elegir. id estable para el historial.
// complex (la publicación automática): las figuras de la biblioteca en vez de los presets de emoji, los presets sin
// emoji que no están marcados simple, nombres y parejas, y solo las funciones con más detalle. Cada elemento lleva
// su categoría (cat) para repartir las elecciones entre figuras, nombres, parejas e inventadas.
export function catalog({ emoji = true, complex = false } = {}) {
  if (!complex) {
    const items = PRESETS.filter((p) => emoji || !isEmoji(p)).map((p) => ({ id: `preset:${p.name}`, kind: 'preset', name: p.name, group: p.group }));
    for (const t of INVENT_TYPES) items.push({ id: `random:${t}`, kind: 'random', type: t, group: 'Inventadas' });
    return items;
  }
  const items = PRESETS.filter((p) => !p.simple && !isEmoji(p)).map((p) => ({ id: `preset:${p.name}`, kind: 'preset', name: p.name, group: p.group, cat: 'figuras' }));
  if (emoji) for (const f of BIBLIOTECA.figuras) items.push({ id: `figura:${f.emoji}`, kind: 'text', text: f.emoji, font: 'emoji', name: f.name, nameEn: f.en, group: 'Figuras', cat: 'figuras' });
  for (const n of BIBLIOTECA.nombres) items.push({ id: `nombre:${n}`, kind: 'text', text: n, font: 'cursiva', name: n, group: 'Nombres', cat: 'nombres' });
  // Las parejas se escriben apiladas («Ana», «&», «Luis») para que llenen el video vertical
  for (const c of BIBLIOTECA.combinaciones) items.push({ id: `pareja:${c}`, kind: 'text', text: c.replace(' & ', '\n&\n'), font: 'cursiva', name: c, group: 'Parejas', cat: 'combinaciones' });
  for (const t of COMPLEX_TYPES) items.push({ id: `random:${t}`, kind: 'random', type: t, group: 'Inventadas', cat: 'inventadas' });
  // Videos de física (scripts/bounce.mjs): pelotas en el círculo y juegos; cada semilla da una corrida distinta
  for (const m of FISICA_MODES) { const g = fisicaGroup(m); items.push({ id: `${g}:${m}`, kind: 'bounce', mode: m, name: FISICA_NAMES[m][0], nameEn: FISICA_NAMES[m][1], group: g === 'juegos' ? 'Juegos' : 'Pelotas', cat: g }); }
  // Famosos (workflow aparte): silueta limpia y el nombre del jugador al final
  for (const f of FAMOSOS_DATA.figuras) {
    if (!f.imagen || !fs.existsSync(path.join(REPO, f.imagen))) continue;
    items.push({ id: `famoso:${f.id}`, kind: 'image', image: path.join(REPO, f.imagen), name: f.nombre, nameEn: f.nombre, tipo: f.tipo, group: 'Famosos', cat: 'famosos' });
  }
  return items;
}

// Devuelve { src, info } listo para shapeFor(); info describe la figura para el pie del video y el historial
// name/nameEn: nombre para mostrar de un texto (por ejemplo «Dragón» para 🐉)
export function resolveSource({ preset, random, text, font = 'cursiva', seed, name, nameEn, variant, image, revealText, detail }) {
  // Imagen (silueta limpia, como las de assets/famosos/): renderVideo la carga antes de calcular la figura
  if (image) {
    const nm = name || path.basename(image).replace(/\.[^.]+$/, '');
    return { src: { kind: 'image', file: image, name: nm, revealText, opts: { mode: 'silueta', thr: 50, detail: detail ?? 85, invert: false, cutout: false, maxDim: 800, tint: true } },
      info: { kind: 'image', id: `image:${path.basename(image)}`, name: nm, nameEn: nameEn || nm, group: 'Imagen', emoji: false, def: null, text: null, image } };
  }
  if (preset) {
    const p = findPreset(preset);
    if (!p) throw new Error(`No existe el preset «${preset}». Opciones: ${PRESETS.map((q) => q.name).join(', ')}`);
    return { src: presetSrc(p), info: { kind: 'preset', id: `preset:${p.name}`, name: p.name, nameEn: p.en || p.name, group: p.group, emoji: isEmoji(p), def: p.expr || null, text: p.text || null } };
  }
  if (random) {
    const type = random === true ? 'any' : random;
    if (type !== 'any' && !INVENT_TYPES.includes(type)) throw new Error(`Tipo desconocido «${type}». Usa any, ${INVENT_TYPES.join(', ')}`);
    const s = seed ?? (Date.now() >>> 0), rng = makeRng(s);
    const def = inventFn(type, rng), name = funName(rng);
    return { src: { kind: 'expr', name, def, fill: def.fill }, info: { kind: 'random', id: `random:${type}`, type, seed: s, name, nameEn: name, group: 'Inventadas', emoji: false, def, text: null } };
  }
  if (text) {
    const nm = name || text;
    return { src: { kind: 'text', name: nm, text, font, variant }, info: { kind: 'text', id: `text:${text}`, name: nm, nameEn: nameEn || nm, group: 'Texto', emoji: /\p{Extended_Pictographic}/u.test(text), def: null, text, font, ...(variant ? { variant } : {}) } };
  }
  throw new Error('Indica qué dibujar: --preset <nombre>, --random <tipo> o --text <texto>.');
}
