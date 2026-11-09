// Estilo de cada video 3D (formato «Dato»), para que no se vean todos iguales: el color de la imagen (filtro), hacia
// dónde gira la cámara, la transición entre escenas, dónde va el título de la portada y la música. Se elige una
// combinación que no esté entre las de los últimos 5 videos (data/estilos-3d.json, en el estado cifrado) y cada
// escena recibe su ángulo; dos escenas del mismo tipo seguidas se ven desde lados distintos.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './node-env.mjs';

export const FILTROS = {
  normal: '',
  vivo: 'saturate(1.3) contrast(1.05)',
  calido: 'saturate(1.15) sepia(0.16) hue-rotate(-8deg)',
  frio: 'saturate(1.1) hue-rotate(14deg) brightness(1.03)',
  atardecer: 'sepia(0.2) saturate(1.45) hue-rotate(-10deg) brightness(1.02)',
  pastel: 'saturate(0.85) brightness(1.07) contrast(0.95)'
};
export const TRANSICIONES = ['barrido', 'giro', 'deslizar', 'fundido'];
const PORTADAS = ['arriba', 'abajo'];
const MUSICAS = ['lofi', 'pop', 'electro'];
// Escenas con carteles de texto: giran menos para que se lean
const CON_TEXTO = new Set(['comparacion', 'linea', 'cuadricula', 'piscinas', 'calendario']);
const ARCHIVO = path.join(ROOT, 'data', 'estilos-3d.json');

function rng(semilla) { let s = semilla % 2147483647 || 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const hash = (t) => [...String(t)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const clave = (e) => `${e.filtro}|${e.sentido}|${e.transicion}|${e.portada}`;

export function elegirEstilo(g, { guardar = true } = {}) {
  let hist = { ultimos: [] };
  try { hist = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); } catch {}
  const r = rng(hash(`${g.id}|${new Date().toISOString().slice(0, 10)}`)), elige = (xs) => xs[Math.floor(r() * xs.length)];
  const recientes = new Set((hist.ultimos || []).slice(-5).map((x) => x.clave));
  const usadosF = (hist.ultimos || []).slice(-2).map((x) => x.filtro), usadasT = (hist.ultimos || []).slice(-1).map((x) => x.transicion);
  let e;
  for (let i = 0; i < 40; i++) {
    e = { filtro: elige(Object.keys(FILTROS)), sentido: r() < 0.5 ? -1 : 1, transicion: elige(TRANSICIONES), portada: elige(PORTADAS) };
    if (!recientes.has(clave(e)) && !usadosF.includes(e.filtro) && !usadasT.includes(e.transicion)) break;
  }
  e.musica = g.musica || elige(MUSICAS.filter((m) => m !== hist.ultimos?.at(-1)?.musica));
  e.semillaMusica = hash(g.id) % 9973;
  // Ángulo de cada escena (radianes alrededor del objeto) y cuánto gira mientras dura
  let antes = null;
  e.angulos = g.escenas.map((x, i) => {
    const max = CON_TEXTO.has(x.tipo) ? 0.14 : 0.38;
    let a = (r() * 2 - 1) * max;
    if (antes && antes.tipo === x.tipo) a = -Math.sign(antes.a || 1) * max; // la misma escena otra vez: del otro lado
    antes = { tipo: x.tipo, a };
    return { a: +a.toFixed(3), giro: +((CON_TEXTO.has(x.tipo) ? 0.02 : 0.05) * e.sentido * (i % 2 ? -1 : 1)).toFixed(3) };
  });
  if (guardar) {
    try {
      fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
      fs.writeFileSync(ARCHIVO, JSON.stringify({ ultimos: [...(hist.ultimos || []), { id: g.id, clave: clave(e), filtro: e.filtro, transicion: e.transicion, musica: e.musica, at: new Date().toISOString() }].slice(-20) }, null, 2) + '\n');
    } catch {}
  }
  return { ...e, css: FILTROS[e.filtro] };
}
