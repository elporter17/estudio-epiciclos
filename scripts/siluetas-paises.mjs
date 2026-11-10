#!/usr/bin/env node
// Genera assets/geo/siluetas.json: la silueta de cada país (su mapa sin nombre ni bandera) para los retos de
// geografía (scripts/lib/geo-retos.mjs). Datos de Natural Earth (dominio público) vía world-atlas (countries-50m) y
// los códigos ISO de i18n-iso-countries. Se corre una sola vez (el resultado va en git):
//   curl -o countries-50m.json https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json
//   curl -o codes.json https://cdn.jsdelivr.net/npm/i18n-iso-countries@7.11.0/codes.json
//   node scripts/siluetas-paises.mjs --topo countries-50m.json --codigos codes.json
// Cada país: anillos [[x, y], …] en una caja de 1000 × 1000 (proporción real, centrado); solo la parte principal y
// las islas cercanas (sin Alaska ni Hawái en EE. UU., por ejemplo), simplificado para que pese poco.
import fs from 'node:fs';
import path from 'node:path';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';

const o = parseCli({ topo: { type: 'string' }, codigos: { type: 'string' } });
const topo = JSON.parse(fs.readFileSync(o.topo, 'utf8')), codigos = JSON.parse(fs.readFileSync(o.codigos, 'utf8'));
const alfa2 = Object.fromEntries(codigos.map(([a2, , num]) => [String(+num), a2]));
const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;

// TopoJSON: los arcos vienen en deltas cuantizados
const arcos = topo.arcs.map((a) => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
const arco = (i) => (i >= 0 ? arcos[i] : [...arcos[~i]].reverse());
const anillo = (ids) => ids.flatMap((i, k) => (k ? arco(i).slice(1) : arco(i)));
const area = (r) => Math.abs(r.reduce((s, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + x * y2 - x2 * y; }, 0) / 2);
const centro = (r) => [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];

// Douglas-Peucker
function simplificar(pts, tol) {
  if (pts.length < 4) return pts;
  const d2 = ([x, y], [x1, y1], [x2, y2]) => { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; const t = l ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l)) : 0; return (x - x1 - t * dx) ** 2 + (y - y1 - t * dy) ** 2; };
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const pila = [[0, pts.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop(); let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) { const d = d2(pts[i], pts[a], pts[b]); if (d > max) { max = d; idx = i; } }
    if (max > tol * tol) { keep[idx] = 1; pila.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const out = {};
for (const g of topo.objects.countries.geometries) {
  const a2 = alfa2[String(+g.id)];
  if (!a2 || !g.arcs) continue;
  const polis = g.type === 'Polygon' ? [g.arcs] : g.arcs;
  // Solo el anillo exterior de cada polígono (los huecos casi no se ven en una silueta)
  let anillos = polis.map((p) => anillo(p[0]));
  // Cruza la línea de cambio de fecha (Rusia, Fiyi, Kiribati…): las longitudes negativas pasan al otro lado
  const lons = anillos.flat().map((p) => p[0]);
  if (Math.max(...lons) - Math.min(...lons) > 300) anillos = anillos.map((r) => r.map(([x, y]) => [x < 0 ? x + 360 : x, y]));
  // La parte principal y lo que está cerca (los territorios lejanos quedan fuera)
  const mayor = anillos.reduce((m, r) => (area(r) > area(m) ? r : m), anillos[0]), cm = centro(mayor);
  const radio = Math.max(...mayor.map(([x, y]) => Math.hypot(x - cm[0], y - cm[1])));
  anillos = anillos.filter((r) => r === mayor || (Math.hypot(centro(r)[0] - cm[0], centro(r)[1] - cm[1]) < radio * 2.2 && area(r) > area(mayor) * 0.0005) || (radio < 1.5 && Math.hypot(centro(r)[0] - cm[0], centro(r)[1] - cm[1]) < 6));
  // Proyección local (equirectangular con la latitud del país) a una caja de 1000 × 1000
  const lat = cm[1] * Math.PI / 180, k = Math.cos(lat);
  const p = anillos.map((r) => r.map(([x, y]) => [x * k, -y]));
  const xs = p.flat().map((q) => q[0]), ys = p.flat().map((q) => q[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], s = 1000 / Math.max(x1 - x0, y1 - y0);
  const ox = (1000 - (x1 - x0) * s) / 2, oy = (1000 - (y1 - y0) * s) / 2;
  const final = p.map((r) => simplificar(r.map(([x, y]) => [Math.round((x - x0) * s + ox), Math.round((y - y0) * s + oy)]), 1.6)).filter((r) => r.length >= 3);
  out[a2] = { n: g.properties.name, r: final };
}
const destino = path.join(ROOT, 'assets', 'geo', 'siluetas.json');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, JSON.stringify(out));
console.log(`${Object.keys(out).length} países · ${(fs.statSync(destino).size / 1024).toFixed(0)} KB → ${path.relative(ROOT, destino)}`);
