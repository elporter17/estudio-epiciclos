// Arte oficial de GTA VI (assets/gta6, publicado por Rockstar Games en rockstargames.com/VI; ver imagenes.json): fondos
// para la cuenta atrás, el quiz y el video largo, siempre con el crédito «Imagen: Rockstar Games». Sin tráilers: los
// detecta Content ID y la política de Rockstar no cubre videos monetizados.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './node-env.mjs';

const DIR = path.join(ROOT, 'assets', 'gta6');
const info = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIR, 'imagenes.json'), 'utf8')); } catch { return { imagenes: [] }; } })();
export const CREDITO_GTA = info.credito || 'Imagen: Rockstar Games';
const ruta = (a) => path.join(DIR, a);
const de = (forma) => info.imagenes.filter((x) => x.forma === forma && x.archivo !== 'poster.jpg').map((x) => ruta(x.archivo));
export const POSTER = ruta('poster.jpg');
// Cierre: Vice City de noche (el póster tiene el logo en medio y choca con el texto)
export const CIERRE_GTA = ruta('vice-city-noche.jpg');
export const VERTICALES = de('vertical');
export const HORIZONTALES = [...de('horizontal'), ...de('cuadrada')];
export const RECORTES = de('recorte');
export const hayArte = () => fs.existsSync(POSTER);
const mezclar = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
// n fondos para Reels verticales: primero los verticales (se ven completos), después los horizontales, sin repetir seguidos
export function fondosVerticales(n) {
  // La portada siempre con Jason y Lucia (se reconoce al instante)
  const portada = mezclar(VERTICALES.filter((x) => /jason-lucia/.test(x)))[0];
  const base = [portada, ...mezclar(VERTICALES.filter((x) => x !== portada)), ...mezclar(HORIZONTALES)].filter(Boolean);
  return Array.from({ length: n }, (_, i) => base[i % base.length]);
}
export const recortesAlAzar = (n = 4) => mezclar(RECORTES).slice(0, n);
