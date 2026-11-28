#!/usr/bin/env node
// Revisa TODOS los guiones antes de que lleguen al render: que cada escena sea de un tipo que su motor sabe dibujar,
// que los objetos 3D existan (modelos GLB o figuras hechas con código), que el 2D use emojis, que las barras y líneas
// de tiempo traigan sus datos, y en el formato «explica» que cada dibujo exista (en el guion o en la biblioteca), que cada
// «en» aparezca en el texto de su escena y que nada tape la franja de subtítulos.
//   node scripts/validar-guiones.mjs                (cola + explica)
//   node scripts/validar-guiones.mjs --carpeta video3d/guiones/explica
// Sale con código 1 si hay errores (los avisos no frenan).
import fs from 'node:fs';
import path from 'node:path';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';

const o = parseCli({ carpeta: { type: 'string' }, todo: { type: 'boolean', default: false } });
const carpetas = o.carpeta ? [o.carpeta] : ['video3d/guiones/cola', 'video3d/guiones/explica'];
const MOD = path.join(ROOT, 'video3d', 'public', 'modelos'), BIB = path.join(ROOT, 'video3d', 'biblioteca');
const PROC = ['botella', 'moneda', 'celular', 'balon', 'libro', 'corazon', 'ladrillo', 'banera', 'piscina'];
const T3D = ['vaso', 'botellas', 'piscina', 'calendario', 'camion', 'portada', 'cierre', 'pila', 'lluvia', 'torre', 'foco', 'globo', 'cuadricula', 'piscinas', 'comparacion', 'linea', 'calle', 'gente', 'historia', 'vision', 'ishihara'];
const T2D = ['portada', 'foco', 'pila', 'lluvia', 'cuadricula', 'gente', 'globo', 'linea', 'comparacion', 'calendario', 'torre', 'calle', 'cierre', 'vaso', 'botellas', 'camion', 'piscina', 'piscinas'];
const FONDOS = ['cocina', 'plano', 'fabrica', 'cielo', 'mar', 'oscuro', 'liso', undefined];
const ANIMS = ['pop', 'fade', 'slideIn', 'crecer', 'caer', 'ninguna', undefined], IDLES = ['flotar', 'balanceo', 'latido', 'sacudir', undefined];
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ%]+/g, '');
const prop = (s) => { const m = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/.exec(s || ''); return m ? +m[2] / +m[1] : null; };
const existeModelo = (o) => fs.existsSync(path.join(MOD, `${o}.glb`));

const ids = new Map(); let nErr = 0, nAv = 0, nArch = 0;
const informe = [];
for (const carpeta of carpetas) {
  const dir = path.resolve(ROOT, carpeta);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    nArch++;
    const err = [], av = [], E = (m) => err.push(m), A = (m) => av.push(m);
    let g; try { g = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { informe.push([f, [`JSON inválido: ${e.message}`], []]); nErr++; continue; }
    const motor = g.motor === '2d' ? '2d' : g.motor === 'explica' ? 'explica' : '3d';
    if (!g.id) E('sin id'); else if (ids.has(g.id)) E(`id repetido con ${ids.get(g.id)}`); else ids.set(g.id, f);
    if (!g.titulo) E('sin título'); else if (g.titulo.length > 34) A(`título largo (${g.titulo.length} letras)`);
    if (!Array.isArray(g.escenas) || !g.escenas.length) { E('sin escenas'); informe.push([f, err, av]); nErr += err.length; continue; }
    if (!g.fuentes?.length) A('sin fuentes');
    for (const [i, e] of g.escenas.entries()) {
      const n = `escena ${i + 1}`;
      if (motor !== 'explica' && e.tipo !== 'cierre' && !e.texto) E(`${n}: sin texto`);
      if (motor === 'explica' && !e.texto) E(`${n}: sin texto`);
      if (motor === '3d') {
        if (!T3D.includes(e.tipo)) E(`${n}: tipo «${e.tipo}» no existe en el motor 3D`);
        for (const ob of [e.objeto, ...(e.barras || []).map((b) => b.objeto), ...(e.hitos || []).map((h) => h.objeto)].filter(Boolean)) {
          if (String(ob).includes('/')) { if (!existeModelo(ob)) E(`${n}: el modelo «${ob}» no existe`); }
          else if (!PROC.includes(ob)) E(`${n}: objeto «${ob}» no existe en 3D (¿emoji en un guion 3D?)`);
        }
      } else if (motor === '2d') {
        if (!T2D.includes(e.tipo)) E(`${n}: tipo «${e.tipo}» no existe en el motor 2D`);
        for (const ob of [e.objeto, ...(e.barras || []).map((b) => b.objeto), ...(e.hitos || []).map((h) => h.objeto)].filter(Boolean)) if (/^[\w/.-]+$/.test(ob)) E(`${n}: el 2D dibuja emojis y aquí hay «${ob}»`);
      }
      if (motor !== 'explica') {
        if (e.tipo === 'comparacion' && (!e.barras?.length || e.barras.some((b) => typeof b.valor !== 'number'))) E(`${n}: comparación sin barras o con valores que no son números`);
        if (e.tipo === 'linea' && (!e.hitos?.length || e.hitos.some((h) => typeof h.anio !== 'number'))) E(`${n}: línea de tiempo sin hitos o sin año numérico`);
        if (e.contador && (typeof e.contador.hasta !== 'number' || typeof (e.contador.desde ?? 0) !== 'number')) E(`${n}: contador sin números`);
        continue;
      }
      // ---- formato explica ----
      if (!FONDOS.includes(e.fondo)) E(`${n}: fondo «${e.fondo}» no existe`);
      if (e.camara) for (const k of ['de', 'a']) if (e.camara[k] && (e.camara[k].length !== 3 || e.camara[k][2] < 1)) E(`${n}: cámara.${k} debe ser [x, y, zoom≥1]`);
      const palabras = String(e.texto || '').split(/\s+/).map(norm);
      const clave = String(e.clave || '').split(/\s+/).map(norm).filter(Boolean);
      if (e.clave && !clave.every((c) => palabras.includes(c))) A(`${n}: la clave «${e.clave}» no está tal cual en el texto`);
      for (const [j, c] of (e.capas || []).entries()) {
        const m = `${n}, capa ${j + 1}`;
        if (typeof c.en === 'string') { const obj = c.en.split(/\s+/).map(norm).filter(Boolean); if (!palabras.some((_, k) => obj.every((x, q) => palabras[k + q]?.startsWith(x)))) E(`${m}: «${c.en}» no aparece en el texto`); }
        for (const k of ['x', 'y']) if (c[k] != null && (c[k] < 0 || c[k] > 1)) A(`${m}: ${k}=${c[k]} fuera del lienzo`);
        if (c.svg) {
          const svg = g.dibujos?.[c.svg] ?? (fs.existsSync(path.join(BIB, `${c.svg}.svg`)) ? fs.readFileSync(path.join(BIB, `${c.svg}.svg`), 'utf8') : null);
          if (!svg) { E(`${m}: el dibujo «${c.svg}» no existe (ni en el guion ni en la biblioteca)`); continue; }
          if (!prop(svg)) E(`${m}: el dibujo «${c.svg}» no tiene viewBox`);
          if (/<script|<image|href="http/i.test(svg)) E(`${m}: el dibujo «${c.svg}» trae scripts, imágenes o enlaces externos`);
          if (!ANIMS.includes(c.anim)) E(`${m}: animación «${c.anim}» no existe`);
          if (!IDLES.includes(c.idle)) E(`${m}: movimiento «${c.idle}» no existe`);
          const alto = (c.alto || (c.ancho || 500) * (prop(svg) || 1)) / 1920, arriba = (c.y ?? 0.5) - alto / 2;
          if (arriba < 0.23 && arriba + alto > 0.10 && e.tipo !== 'cierre') A(`${m}: «${c.svg}» toca la franja de subtítulos`);
        } else if (c.etiqueta || c.numero) {
          if ((c.y ?? 0.5) > 0.09 && (c.y ?? 0.5) < 0.245) A(`${m}: etiqueta en la franja de subtítulos`);
        } else if (!c.presion && !c.burbujas && !c.marca) E(`${m}: capa sin tipo (svg, etiqueta, numero, presion, burbujas o marca)`);
      }
    }
    if (motor === 'explica' && g.escenas.at(-1).tipo !== 'cierre') A('la última escena no es el cierre');
    nErr += err.length; nAv += av.length;
    if (err.length || av.length || o.todo) informe.push([f, err, av]);
  }
}
for (const [f, err, av] of informe) {
  console.log(`\n${err.length ? '❌' : '⚠️'} ${f}`);
  for (const m of err) console.log(`   error: ${m}`);
  for (const m of av) console.log(`   aviso: ${m}`);
}
console.log(`\n${nArch} guiones revisados · ${nErr} errores · ${nAv} avisos`);
process.exit(nErr ? 1 : 0);
