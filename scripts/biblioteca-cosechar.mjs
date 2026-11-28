#!/usr/bin/env node
// Pasa a la biblioteca (video3d/biblioteca/*.svg) todos los dibujos que traen los guiones «explica» (cola, explica y
// archivo), sin repetir los que ya están (mismo SVG), y rehace el índice video3d/biblioteca/indice.json:
//   { nombre, descripcion, etiquetas, proporcion (alto/ancho), origen }
// Así un guion nuevo puede usar { "svg": "nombre" } sin volver a dibujar, y los agentes buscan antes de dibujar
// (scripts/biblioteca-buscar.mjs). Las descripciones escritas a mano en el índice se conservan.
//   node scripts/biblioteca-cosechar.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT } from './lib/node-env.mjs';

const BIB = path.join(ROOT, 'video3d', 'biblioteca'), IND = path.join(BIB, 'indice.json');
const CARPETAS = ['video3d/guiones/cola', 'video3d/guiones/explica', 'video3d/guiones/archivo'].map((c) => path.join(ROOT, c));
const hash = (s) => crypto.createHash('sha1').update(String(s).replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 12);
const prop = (s) => { const m = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/.exec(s || ''); return m ? +(+m[2] / +m[1]).toFixed(3) : null; };
const limpio = (n) => String(n).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const palabras = (s) => [...new Set(String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2))];

const indice = fs.existsSync(IND) ? JSON.parse(fs.readFileSync(IND, 'utf8')) : [];
const porNombre = new Map(indice.map((x) => [x.nombre, x]));
const porHash = new Map();
for (const f of fs.readdirSync(BIB).filter((x) => x.endsWith('.svg'))) porHash.set(hash(fs.readFileSync(path.join(BIB, f), 'utf8')), f.replace('.svg', ''));

let nuevos = 0;
for (const dir of CARPETAS) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    let g; try { g = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    if (g.motor !== 'explica' || !g.dibujos) continue;
    // En qué escenas aparece cada dibujo: su texto sirve de contexto para la descripción
    const contexto = {};
    for (const e of g.escenas || []) for (const c of e.capas || []) if (c.svg) (contexto[c.svg] ||= []).push(e.texto || '');
    for (const [n, svg] of Object.entries(g.dibujos)) {
      if (!prop(svg) || /<script|<image|href="http/i.test(svg)) continue;
      const h = hash(svg);
      if (porHash.has(h)) continue;
      let nombre = limpio(n); if (porNombre.has(nombre) || fs.existsSync(path.join(BIB, `${nombre}.svg`))) nombre = `${nombre}_${limpio(g.id.replace(/^explica-/, '')).slice(0, 24)}`;
      fs.writeFileSync(path.join(BIB, `${nombre}.svg`), svg.trim() + '\n');
      porHash.set(h, nombre);
      const frase = (contexto[n] || [])[0] || '';
      const entrada = { nombre, descripcion: `${n.replace(/_/g, ' ')} · del video «${g.titulo}»${frase ? ` (escena: «${frase.slice(0, 90)}»)` : ''}`, etiquetas: [...new Set([...palabras(n.replace(/_/g, ' ')), ...(g.etiquetas || []).map(limpio)])], proporcion: prop(svg), origen: path.relative(ROOT, path.join(dir, f)).replace(/\\/g, '/') };
      indice.push(entrada); porNombre.set(nombre, entrada); nuevos++;
    }
  }
}
// Los que están en la carpeta pero no en el índice (los de base o puestos a mano)
for (const f of fs.readdirSync(BIB).filter((x) => x.endsWith('.svg'))) {
  const n = f.replace('.svg', '');
  if (!porNombre.has(n)) { const svg = fs.readFileSync(path.join(BIB, f), 'utf8'); const e = { nombre: n, descripcion: n.replace(/_/g, ' '), etiquetas: palabras(n.replace(/_/g, ' ')), proporcion: prop(svg), origen: 'biblioteca' }; indice.push(e); porNombre.set(n, e); }
}
indice.sort((a, b) => a.nombre.localeCompare(b.nombre));
fs.writeFileSync(IND, JSON.stringify(indice, null, 1) + '\n');
console.log(`${nuevos} dibujos nuevos · ${indice.length} en la biblioteca · ${path.relative(ROOT, IND)}`);
