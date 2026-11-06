// Cola de videos 3D: los guiones viven en video3d/guiones/cola/NNN-id.json (en orden) y el estado en
// data/video3d-cola.json (se conserva cifrado entre corridas de GitHub, como el resto de data/):
//   { publicados: [{ id, fecha }], listos: { mediodia: {…} | null, tarde: {…} | null } }
// Dos videos al día: «mediodia» (12:17) y «tarde» (18:30, el de más vistas). Un guion con «fecha» (AAAA-MM-DD) sale ese
// día exacto en el turno de la tarde (por ejemplo, el especial de GTA VI); los demás, en orden.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './node-env.mjs';

export const DIR_COLA = path.join(ROOT, 'video3d', 'guiones', 'cola');
export const ESTADO = path.join(ROOT, 'data', 'video3d-cola.json');
export const AVISO_COLA = 5; // con tantos guiones pendientes o menos, aviso por Telegram para escribir más
export const hoyHN = (d = new Date()) => new Date(d.getTime() - 6 * 3600e3).toISOString().slice(0, 10);

export const TURNOS = ['mediodia', 'tarde'];
export function leerEstado() {
  let e; try { e = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch { e = {}; }
  const listos = { mediodia: null, tarde: null, ...(e.listos || {}) };
  if (e.listo && !listos.mediodia) listos.mediodia = e.listo; // estado de antes de los dos turnos
  return { publicados: e.publicados || [], listos };
}
export function guardarEstado(e) { fs.mkdirSync(path.dirname(ESTADO), { recursive: true }); fs.writeFileSync(ESTADO, JSON.stringify(e, null, 2) + '\n'); }
export function guiones() {
  return fs.readdirSync(DIR_COLA).filter((f) => f.endsWith('.json')).sort().map((f) => ({ archivo: path.join(DIR_COLA, f), ...JSON.parse(fs.readFileSync(path.join(DIR_COLA, f), 'utf8')) }));
}
// El guion de «fecha» y «turno»: en la tarde, primero el que tenga esa fecha; si no, el siguiente sin fecha que no salió
// (y que no esté ya listo para el otro turno)
export function elegir(fecha, estado = leerEstado(), turno = 'mediodia') {
  const hechos = new Set([...estado.publicados.map((p) => p.id), ...Object.entries(estado.listos).filter(([k, v]) => k !== turno && v).map(([, v]) => v.id)]), todos = guiones();
  return (turno === 'tarde' && todos.find((g) => g.fecha === fecha && !hechos.has(g.id))) || todos.find((g) => !g.fecha && !hechos.has(g.id)) || null;
}
export const pendientes = (estado = leerEstado()) => { const hechos = new Set(estado.publicados.map((p) => p.id)); return guiones().filter((g) => !g.fecha && !hechos.has(g.id)).length; };
// Avisos extra para Telegram (los lee scripts/aviso.mjs al final de la corrida)
export function avisoExtra(texto) { fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true }); fs.appendFileSync(path.join(ROOT, 'out', 'aviso-extra.txt'), texto.trim() + '\n'); }

// Texto para las redes: el título, los datos del video en viñetas, una pregunta y hashtags según la categoría
const ETIQUETAS = { ciencia: ['ciencia', 'datoscientificos'], historia: ['historia', 'sabiasque'], datos: ['datos', 'datoscuriosos'], curiosidad: ['curiosidades', 'sabiasque'], noticia: ['explicado', 'actualidad'], especial: ['gta6', 'videojuegos'] };
export function textoPost(g) {
  const datos = g.escenas.filter((e) => e.tipo !== 'portada' && e.tipo !== 'cierre').slice(0, 5).map((e) => `• ${e.texto}`);
  const tags = [...(ETIQUETAS[g.categoria] || ['datoscuriosos']), 'aprende', 'potterplay', 'reels'].map((t) => `#${t}`).join(' ');
  return `${g.titulo} 🤯\n\n${datos.join('\n')}\n\n¿Lo sabías? Cuéntanos en los comentarios 👇\n\n${tags}`;
}
