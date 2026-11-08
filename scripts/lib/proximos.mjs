// Qué videos vienen (para el bot de Telegram): los 3D listos y los que siguen en la cola, y el próximo video largo de
// YouTube con sus productos. Lo calculan las corridas de GitHub (que tienen el estado en data/) y lo dejan en el
// almacén (scripts/lib/control.mjs); el bot lo lee. Se actualiza en cada render o publicación 3D, en cada video largo
// y con las noticias de la mañana.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './node-env.mjs';
import { leerEstado, guiones, hoyHN } from './video3d-cola.mjs';
import { guardarControl } from './control.mjs';

const leer = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
export const HIST_LARGO = path.join(ROOT, 'data', 'youtube-largo.json');
const BASE_LARGO = () => leer(path.join(ROOT, 'data', 'como-se-hace.json'), []);
const mezclar = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// Los productos del próximo video largo: si ya están elegidos (y ninguno salió hace poco) se respetan; si no, se eligen
// ahora y se guardan, así el bot puede decir cuáles vienen y el video usa exactamente esos
export function planearLargo(n = 6, { nuevo = false } = {}) {
  const hist = { usados: [], total: 0, ...leer(HIST_LARGO, {}) }, base = BASE_LARGO();
  const recientes = new Set(hist.usados.slice(-Math.max(0, base.length - n)));
  const valido = (ids) => Array.isArray(ids) && ids.length >= 3 && ids.every((id) => base.some((p) => p.id === id) && !recientes.has(id));
  if (nuevo || !valido(hist.siguiente)) {
    hist.siguiente = mezclar(base.filter((p) => !recientes.has(p.id))).slice(0, n).map((p) => p.id);
    fs.mkdirSync(path.dirname(HIST_LARGO), { recursive: true }); fs.writeFileSync(HIST_LARGO, JSON.stringify(hist, null, 2) + '\n');
  }
  return hist.siguiente.map((id) => base.find((p) => p.id === id)).filter(Boolean);
}

// El próximo día de video largo (martes, jueves y sábado a las 14:07, hora de Honduras)
function proximoDiaLargo() {
  const ahora = new Date(Date.now() - 6 * 3600e3);
  for (let k = 0; k < 8; k++) {
    const d = new Date(ahora.getTime() + k * 864e5), dia = d.getUTCDay();
    if ([2, 4, 6].includes(dia) && (k > 0 || ahora.getUTCHours() * 60 + ahora.getUTCMinutes() < 14 * 60 + 7)) return d.toISOString().slice(0, 10);
  }
  return null;
}

// El resumen para el bot: 3D (listos para hoy y los siguientes de la cola) y el próximo largo
export function resumenProximos() {
  const estado = leerEstado(), todos = guiones(), hechos = new Set(estado.publicados.map((p) => p.id));
  const listos = Object.fromEntries(Object.entries(estado.listos).map(([t, l]) => [t, l ? { titulo: l.titulo, fecha: l.fecha } : null]));
  const ocupados = new Set(Object.values(estado.listos).filter(Boolean).map((l) => l.id));
  const siguientes = todos.filter((g) => !g.fecha && !hechos.has(g.id) && !ocupados.has(g.id)).slice(0, 8).map((g) => ({ titulo: g.titulo, categoria: g.categoria, fuentes: g.fuentes?.length || 0 }));
  // Los últimos publicados con sus fuentes (para el botón 📚 Fuentes del bot)
  const publicados = estado.publicados.slice(-10).reverse().map((p) => { const g = todos.find((x) => x.id === p.id); return g ? { titulo: g.titulo, fecha: p.fecha, turno: p.turno, fuentes: g.fuentes || [], nota: g.nota || null } : null; }).filter(Boolean);
  const especiales = todos.filter((g) => g.fecha && g.fecha >= hoyHN() && !hechos.has(g.id)).map((g) => ({ titulo: g.titulo, fecha: g.fecha }));
  const largo = planearLargo();
  return {
    at: Date.now(),
    video3d: { listos, siguientes, especiales, publicados, quedan: todos.filter((g) => !g.fecha && !hechos.has(g.id)).length },
    largo: { fecha: proximoDiaLargo(), productos: largo.map((p) => p.titulo) }
  };
}
export async function publicarProximos() {
  try { const r = resumenProximos(); await guardarControl('proximos', r); return r; }
  catch (e) { console.error(`No se pudo publicar qué videos vienen: ${e.message}`); return null; }
}
