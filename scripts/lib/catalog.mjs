// Qué se puede dibujar: presets de la web, funciones inventadas y texto libre.
import { PRESETS, INVENT_TYPES, COMPLEX_TYPES, presetSrc, inventFn, funName, makeRng } from '../../src/engine.js';

export const norm = (s) => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
export const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'figura';
export const isEmoji = (p) => p.font === 'emoji';

// Semilla estable a partir de un texto (para que el mismo pedido dé el mismo video)
export function hashSeed(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

export function findPreset(name) {
  const n = norm(name);
  return PRESETS.find((p) => norm(p.name) === n || (p.en && norm(p.en) === n)) || null;
}

// Todo lo que pick.mjs puede elegir. id estable para el historial.
// complex: sin los presets marcados simple (corazón, π, infinito…) y solo las funciones con más detalle.
export function catalog({ emoji = true, complex = false } = {}) {
  const items = PRESETS.filter((p) => (emoji || !isEmoji(p)) && !(complex && p.simple)).map((p) => ({ id: `preset:${p.name}`, kind: 'preset', name: p.name, group: p.group }));
  for (const t of complex ? COMPLEX_TYPES : INVENT_TYPES) items.push({ id: `random:${t}`, kind: 'random', type: t, group: 'Inventadas' });
  return items;
}

// Devuelve { src, info } listo para shapeFor(); info describe la figura para el pie del video y el historial
export function resolveSource({ preset, random, text, font = 'cursiva', seed }) {
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
    return { src: { kind: 'text', name: text, text, font }, info: { kind: 'text', id: `text:${text}`, name: text, nameEn: text, group: 'Texto', emoji: /\p{Extended_Pictographic}/u.test(text), def: null, text, font } };
  }
  throw new Error('Indica qué dibujar: --preset <nombre>, --random <tipo> o --text <texto>.');
}
