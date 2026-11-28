// Cola de videos 3D: los guiones viven en video3d/guiones/cola/NNN-id.json (en orden) y el estado en
// data/video3d-cola.json (se conserva cifrado entre corridas de GitHub, como el resto de data/):
//   { publicados: [{ id, fecha }], listos: { mediodia: {…} | null, tarde: {…} | null } }
// Dos videos al día: «mediodia» (12:17) y «tarde» (18:30, el de más vistas). Un guion con «fecha» (AAAA-MM-DD) sale ese
// día exacto en el turno de la tarde (por ejemplo, el especial de GTA VI); los demás, en orden.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './node-env.mjs';
import { textoConTono } from './tono.mjs';

export const DIR_COLA = path.join(ROOT, 'video3d', 'guiones', 'cola');
export const ESTADO = path.join(ROOT, 'data', 'video3d-cola.json');
export const AVISO_COLA = 6; // con tantos guiones pendientes o menos, aviso por Telegram para escribir más
export const hoyHN = (d = new Date()) => new Date(d.getTime() - 6 * 3600e3).toISOString().slice(0, 10);

// 6 videos al día desde 2026-11-21: tres 3D (mediodía 12:17, noche 15:30 y tarde 18:30) y tres 2D sin IA (dos1 10:20, dos3 18:00 y dos2 21:10)
export const TURNOS = ['mediodia', 'tarde', 'noche', 'dos1', 'dos2', 'dos3'];
export function leerEstado() {
  let e; try { e = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch { e = {}; }
  const listos = { mediodia: null, tarde: null, noche: null, dos1: null, dos2: null, dos3: null, ...(e.listos || {}) };
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
  const libres = todos.filter((g) => !g.fecha && !hechos.has(g.id)), l2d = libres.filter((g) => g.motor === '2d'), l3d = libres.filter((g) => g.motor !== '2d');
  // Prueba de Honduras (2026-11-21): la tarde (Facebook y TikTok) toma primero los de categoría «honduras»; el mediodía (IG y YouTube) los salta
  // mientras haya otros, así se comparan sin mezclarlos
  // Los turnos «dos…» son del motor 2D (sin IA); mediodía, noche y tarde, del 3D (la tarde, con los de Honduras primero). Si de un tipo
  // ya no quedan, sale del otro para que ninguna red se quede sin video
  const pref = turno.startsWith('dos') ? l2d[0] : turno === 'tarde' ? l3d.find((g) => g.categoria === 'honduras') : l3d.find((g) => g.categoria !== 'honduras');
  // Un guion con «fecha» sale ese día exacto en su «turno» (por defecto la tarde); los demás, en orden
  return todos.find((g) => g.fecha === fecha && !g.manual && (g.turno || 'tarde') === turno && !hechos.has(g.id)) || pref || (turno.startsWith('dos') ? (l3d.find((g) => g.categoria !== 'honduras') || l3d[0]) : l3d[0] || l2d[0]) || l2d[0] || null;
}
export const pendientes = (estado = leerEstado(), motor) => { const hechos = new Set(estado.publicados.map((p) => p.id)); return guiones().filter((g) => motor === undefined || (g.motor === '2d') === (motor === '2d')).filter((g) => !g.fecha && !hechos.has(g.id)).length; };
// Avisos extra para Telegram (los lee scripts/aviso.mjs al final de la corrida)
export function avisoExtra(texto) { fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true }); fs.appendFileSync(path.join(ROOT, 'out', 'aviso-extra.txt'), texto.trim() + '\n'); }

// Texto para las redes: el título, los datos del video en viñetas, una pregunta y hashtags según la categoría
const ETIQUETAS = { ciencia: ['ciencia', 'datoscientificos'], historia: ['historia', 'sabiasque'], datos: ['datos', 'datoscuriosos'], curiosidad: ['curiosidades', 'sabiasque'], noticia: ['explicado', 'actualidad'], especial: ['gta6', 'videojuegos'], mito: ['mito', 'verdadomito', 'sabiasque'], honduras: ['honduras', 'orgullohondureno', 'catracho'], minihistoria: ['historia', 'minihistoria', 'sabiasque'] };
// La primera línea lleva el tono del video (scripts/lib/tono.mjs: coloquial o picante; los «explicados», solo coloquial)
export function textoPost(g) {
  if (g.formato === 'corto') return textoPostBase(g); // los cortos traen su propia descripción, sin muletilla de tono
  return textoConTono(textoPostBase(g), g.id, { suave: g.categoria === 'noticia' || g.categoria === 'minihistoria' });
}
function textoPostBase(g) {
  if (g.descripcion) return `${g.titulo} ${g.emoji || '🤯'}

${g.descripcion}

${[...(g.etiquetas || ETIQUETAS[g.categoria] || ['datoscuriosos']), 'potterplay', 'shorts'].map((t) => `#${t}`).join(' ')}`;
  const datos = g.escenas.filter((e) => e.tipo !== 'portada' && e.tipo !== 'cierre').slice(0, 5).map((e) => `• ${e.texto}`);
  const tags = [...(g.etiquetas || ETIQUETAS[g.categoria] || ['datoscuriosos']), 'aprende', 'potterplay', 'reels'].map((t) => `#${t}`).join(' ');
  return `${g.titulo} 🤯\n\n${datos.join('\n')}\n\n¿Lo sabías? Cuéntanos en los comentarios 👇\n\n${tags}`;
}

// Las fuentes de un guion («fuentes»: [{ dato, fuente, url? }], y «nota» si algo del video se puede malentender), para
// el aviso de Telegram al publicar y para el bot (📚 Fuentes en 🎬 Videos)
export function textoFuentes(g) {
  if (!g.fuentes?.length) return `⚠️ «${g.titulo}» no tiene fuentes cargadas en su guion (video3d/guiones/cola). Si alguien pregunta de dónde salen los datos, pídeme que las busque.`;
  return `📚 Fuentes de «${g.titulo}»:\n${g.fuentes.map((f) => `• ${f.dato}: ${f.fuente}${f.url ? `\n  ${f.url}` : ''}`).join('\n')}${g.nota ? `\n📝 ${g.nota}` : ''}`;
}

// Una respuesta sugerida para un comentario de un video 3D, con sus fuentes: la fuente cuyo dato (o la nota) más se
// parece a lo que preguntan; si nada coincide, de dónde salen los datos en general. null si el guion no tiene fuentes
const raices = (t) => new Set(String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter((w) => w.length > 3).map((w) => w.slice(0, 5)));
export function sugerirRespuesta(g, comentario, usuario = '') {
  if (!g?.fuentes?.length) return null;
  const c = raices(comentario), puntos = (x) => { let n = 0; for (const w of raices(x)) if (c.has(w)) n++; return n; };
  const mejor = g.fuentes.map((f) => [puntos(`${f.dato} ${f.fuente}`), f]).sort((a, b) => b[0] - a[0])[0];
  const corto = (f) => f.fuente.split(/[,(;]/)[0].trim();
  const cuerpo = mejor && mejor[0] > 0
    // Si la fuente trae «respuesta» (escrita a mano en el guion), va esa; si no, se arma con el dato y la fuente
    ? (mejor[1].respuesta || `${mejor[1].dato.replace(/\.$/, '')}. Fuente: ${corto(mejor[1])}.`)
    : `Los datos del video salen de ${[...new Set(g.fuentes.map(corto))].slice(0, 2).join(' y ')}.`;
  return `${usuario ? `${usuario} ` : ''}¡Buena pregunta! ${cuerpo} 🙌`;
}
// El guion de un video publicado, por su id o por su título
export const guionDe = ({ id, titulo } = {}) => guiones().find((g) => (id && g.id === id) || (titulo && g.titulo === titulo)) || null;
