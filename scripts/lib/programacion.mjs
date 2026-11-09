// La programación en Supabase (tabla «programacion», supabase/programacion.sql): un renglón por envío con su hora, su
// pieza y las redes a las que va (fb, ig, tt, yt = true/false). Es la fuente de la verdad: el relojero, el panel y el
// bot la leen con cargarProgramacion(); si Supabase no responde (o la tabla está vacía), sigue HORARIO de horario.mjs.
// Lo que cambias «para siempre» en el bot cambia estos renglones (aplicarFijo); lo de un solo día va a «cambios».
import { db } from './db.mjs';
import { HORARIO, PIEZAS, EXTRAS, HASTA, armarSlot, redesDe, redesPosibles, claveDe, usarBase } from './horario.mjs';

export const REDES = ['fb', 'ig', 'tt', 'yt'];
const TODOS = [0, 1, 2, 3, 4, 5, 6];
export const redesDeFila = (f) => REDES.filter((r) => f[r]);
export const conRedes = (rs) => Object.fromEntries(REDES.map((r) => [r, rs.includes(r)]));
// Lo que se puede cambiar desde el bot: las piezas del plan, las metas y el video largo (no renders ni comentarios)
export const editableFila = (f) => !!PIEZAS[f.pieza] || !!EXTRAS[f.pieza]?.conPieza;

// Un renglón → el slot que entiende el resto del código (horario.mjs)
export function slotDeFila(f) {
  let s;
  if (PIEZAS[f.pieza]) s = armarSlot(f.pieza, f.hora, redesDeFila(f));
  else if (EXTRAS[f.pieza]) { const x = EXTRAS[f.pieza]; s = { hora: f.hora, ...(x.conPieza ? { pieza: f.pieza } : {}), workflow: x.workflow, que: x.que, ...(x.inputs ? { inputs: { ...x.inputs } } : {}) }; }
  else return null;
  if (f.inputs && Object.keys(f.inputs).length) s.inputs = { ...(s.inputs || {}), ...f.inputs };
  return { ...s, id: f.id, ...(f.fecha ? { fecha: f.fecha } : {}), ...(f.dias?.length ? { dias: f.dias } : {}), ...(f.desde ? { desde: f.desde } : {}), ...(f.hasta ? { hasta: f.hasta } : {}) };
}

// Carga la tabla (30 s de caché por proceso). fuente: 'supabase' o 'respaldo' (HORARIO)
let cache = null, cacheAt = 0;
export async function cargarProgramacion({ fresco = false } = {}) {
  if (!fresco && cache && Date.now() - cacheAt < 30e3) return cache;
  try {
    const filas = await db('prog-lista');
    if (Array.isArray(filas) && filas.length) {
      const slots = filas.filter((f) => f.activo).map(slotDeFila).filter(Boolean).sort((a, b) => a.hora.localeCompare(b.hora));
      cache = { filas, slots, fuente: 'supabase' }; cacheAt = Date.now();
      usarBase(slots);
      return cache;
    }
    // Tabla vacía (todavía sin migrar): lo de siempre
    cache = { filas: [], slots: HORARIO, fuente: 'respaldo' }; cacheAt = Date.now(); usarBase(null);
    return cache;
  } catch (e) {
    console.error(`Aviso: programación de Supabase: ${e.message}`);
    if (cache) return cache; // la última que se leyó bien
    usarBase(null);
    return { filas: [], slots: HORARIO, fuente: 'respaldo', error: e.message };
  }
}
export const enBase = async () => (await cargarProgramacion()).fuente === 'supabase';

// Los renglones de la primera vez: HORARIO tal cual (con las redes de cada slot y lo que GTA tiene hasta el 19)
export function filasDeHorario() {
  return HORARIO.map((s) => {
    const pieza = claveDe(s), rs = redesDe(s.workflow, s.inputs);
    const propios = PIEZAS[pieza] ? armarSlot(pieza, s.hora, rs).inputs || {} : EXTRAS[pieza]?.inputs || {};
    const extra = Object.fromEntries(Object.entries(s.inputs || {}).filter(([k, v]) => k !== 'redes' && propios[k] !== v));
    return {
      hora: s.hora, pieza, ...conRedes(rs), dias: s.dias || null, fecha: s.fecha || null, hasta: HASTA[s.workflow] || null,
      inputs: Object.keys(extra).length ? extra : null, activo: true, nota: 'migrado de horario.mjs'
    };
  });
}

// Un cambio «para siempre» del bot (los mismos { t, hora, pieza, a, redes, dias, desde } de siempre) → cambios en los
// renglones: { nuevas: [...], cambios: [{ id, cambios }] }. Con «dias» (cada viernes…) el renglón se parte en dos.
export function planFijo(op, filas) {
  const nuevas = [], cambios = [];
  const coincide = (f) => f.activo && f.hora === op.hora && editableFila(f) && (!op.pieza || f.pieza === op.pieza);
  const partir = (f) => {
    const actuales = f.dias?.length ? f.dias : TODOS;
    return { comunes: op.dias ? actuales.filter((d) => op.dias.includes(d)) : actuales, resto: op.dias ? actuales.filter((d) => !op.dias.includes(d)) : [] };
  };
  const copia = (f, extra) => ({ hora: f.hora, pieza: f.pieza, ...conRedes(redesDeFila(f)), dias: f.dias, fecha: f.fecha, desde: f.desde, hasta: f.hasta, inputs: f.inputs, activo: true, nota: 'bot', ...extra });
  // Aplica «nuevo» (campos) a los días comunes de f: todo el renglón o un renglón aparte para esos días
  const aplicar = (f, nuevo) => {
    const { comunes, resto } = partir(f);
    if (!comunes.length) return;
    if (!resto.length) cambios.push({ id: f.id, cambios: nuevo });
    else { cambios.push({ id: f.id, cambios: { dias: resto } }); nuevas.push(copia(f, { ...nuevo, dias: comunes })); }
  };
  if (op.t === 'agregar' && PIEZAS[op.pieza]) {
    const rs = (op.redes || redesDe(PIEZAS[op.pieza].workflow, {})).filter((r) => redesPosibles(op.pieza).includes(r));
    nuevas.push({ hora: op.hora, pieza: op.pieza, ...conRedes(rs), dias: op.dias || null, desde: op.desde || null, activo: true, nota: 'bot' });
  } else for (const f of filas.filter(coincide)) {
    if (op.t === 'quitar') aplicar(f, { activo: false });
    else if (op.t === 'mover' && op.a) aplicar(f, { hora: op.a });
    else if (op.t === 'cambiar' && PIEZAS[op.pieza]) {
      const rs = (op.redes || redesDeFila(f)).filter((r) => redesPosibles(op.pieza).includes(r));
      aplicar(f, { pieza: op.pieza, ...conRedes(rs) });
    }
  }
  return { nuevas, cambios };
}
// Lo escribe en Supabase y recarga
export async function aplicarFijo(op) {
  const { filas } = await cargarProgramacion({ fresco: true });
  const { nuevas, cambios } = planFijo(op, filas);
  for (const c of cambios) await db('prog-cambiar', c);
  if (nuevas.length) await db('prog-insertar', { filas: nuevas });
  await cargarProgramacion({ fresco: true });
  return { nuevas: nuevas.length, cambios: cambios.length };
}
// Cambiar un renglón (desde el bot: redes, activo, hora)
export async function cambiarFila(id, cambios) {
  await db('prog-cambiar', { id, cambios });
  return cargarProgramacion({ fresco: true });
}
