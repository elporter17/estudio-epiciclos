// POST /api/telegram: webhook del bot de Telegram (@potteplay_avisos_bot). Todo se puede hacer con BOTONES (el plan
// del día con un botón por publicación → quitar / mover / cambiar; agregar, pausar, deshacer, publicar ya; noticias →
// quitar / fijar) y también escribiendo normal (scripts/lib/bot.mjs). Los cambios se guardan en el almacén Blob
// (scripts/lib/control.mjs) y el relojero los aplica en su siguiente vuelta (≤ 10 min).
// Solo hace caso a TU chat (TELEGRAM_CHAT_ID) y solo acepta llamadas de Telegram (cabecera secreta que se registra con
// npm run telegram:webhook). Variables de Vercel: TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID.
import { json, diaConEstado, lanzar, ACTIVO } from './_panel.js';
import { interpretar, AYUDA, mensajePlan, mensajeNoticias, diaBonito, alcanceDe } from '../scripts/lib/bot.mjs';
import { cambiosExactos, estadoExacto, registrar, noticiasDe, noticiasGuardadas, guardarNoticias, noticiasConCambios, telegram, editarMensaje, tgApi, esc, secretoWebhook, ultimoError, FIJO, nuevoId, encolarComentario, leerControl } from '../scripts/lib/control.mjs';
import { delDia, ahoraHN, armarSlot, redesDePieza, nombreSlot, editable, NOMBRE_PIEZA, redesDe, redesPosibles } from '../scripts/lib/horario.mjs';
import { noticiaDeEnlace, juntarNoticias, N_REEL } from '../scripts/lib/noticias.mjs';

const dd = (n) => String(n).padStart(2, '0');
const masDias = (fecha, n) => new Date(Date.parse(`${fecha}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const aMin = (h) => +h.slice(0, 2) * 60 + +h.slice(-2);
const deMin = (m) => `${dd(Math.floor(m / 60))}:${dd(m % 60)}`;
const corta = (h) => h.replace(':', ''), larga = (h) => `${h.slice(0, 2)}:${h.slice(2)}`;
const ahoraHHMM = () => deMin(ahoraHN().min);
// Lo que se puede poner en un hueco (los 3D y el video largo se preparan de madrugada)
const PONIBLES = ['debate', 'debateimg', 'banderas', 'retos', 'emojis', 'quiz', 'prefieres', 'comosehace', 'imagen', 'noticias', 'noticiasimg', 'gta', 'nombres', 'famosos'];
const RED = { fb: 'FB', ig: 'IG', tt: 'TT', yt: 'YT' };

// Teclado fijo de abajo: lo que más se usa, sin escribir
export const MENU = { keyboard: [[{ text: '📅 Plan de hoy' }, { text: '📅 Plan de mañana' }], [{ text: '📰 Noticias' }, { text: '🚀 Publicar ya' }], [{ text: '🎬 Videos' }, { text: '❓ Ayuda' }]], resize_keyboard: true, is_persistent: true };
const fila = (...b) => b.filter(Boolean);
const boton = (text, data) => ({ text, callback_data: data.slice(0, 64) });
const enFilas = (botones, n) => botones.reduce((acc, b, i) => (i % n ? acc[acc.length - 1].push(b) : acc.push([b]), acc), []);

// ---------- redes de cada publicación ----------
// Dónde puede salir cada pieza (lo que su workflow sabe publicar); lo demás de los Reels sale en las 4

const ORDEN = ['fb', 'ig', 'tt', 'yt'], RED_LARGO = { fb: 'Facebook', ig: 'Instagram', tt: 'TikTok', yt: 'YouTube' };
const posibles = redesPosibles;
const codR = (rs) => ORDEN.filter((r) => rs.includes(r)).join('.') || '-';
const decR = (s) => (s || '').split('.').filter((r) => ORDEN.includes(r));
const nombresRedes = (rs) => rs.map((r) => RED_LARGO[r]).join(', ');
// Interruptores ✅/▫️ por red: al tocar uno se vuelve a dibujar con esa red cambiada (`${base}|redes`); «listo» lleva
// las elegidas (`${listo}|redes`)
function tecladoRedes(pieza, sel, base, listo, textoListo, volver) {
  const t = posibles(pieza).map((r) => boton(`${sel.includes(r) ? '✅' : '▫️'} ${RED_LARGO[r]}`, `${base}|${codR(sel.includes(r) ? sel.filter((x) => x !== r) : [...sel, r])}`));
  return [...enFilas(t, 2), fila(sel.length ? boton(textoListo, `${listo}|${codR(sel)}`) : null, boton('⬅️ Volver', volver))];
}

// ---------- vistas: { texto, teclado } ----------
async function datosDia(fecha) {
  const hoy = ahoraHN().fecha, e = await estadoExacto(), opsDia = e.dias[fecha] || [], ops = [...e.fijos, ...opsDia];
  const slots = fecha === hoy ? (await diaConEstado(new Date(), ops)).lista : delDia(fecha, ops);
  return { hoy, ops, opsDia, fijos: e.fijos, slots, esHoy: fecha === hoy };
}
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const diaSemana = (fecha) => new Date(`${fecha}T12:00:00Z`).getUTCDay();
const cortoDia = (fecha) => `${DIAS[diaSemana(fecha)].slice(0, 3)} ${+fecha.slice(8)}`;
// Para un agregado: ¿solo ese día, todos los días o cada semana ese día?
function vistaAlcance(fecha, pieza, hhmm, rs) {
  const k = `a4|${fecha}|${pieza}|${hhmm}|${codR(rs)}`;
  return {
    texto: `➕ <b>${esc(NOMBRE_PIEZA[pieza])}</b> a las ${larga(hhmm)} en ${esc(nombresRedes(rs))}.\n¿Solo ese día o se queda en la programación?`,
    teclado: { inline_keyboard: [fila(boton(`📅 Solo el ${cortoDia(fecha)}`, `${k}|d`)), fila(boton('🔁 Todos los días', `${k}|t`), boton(`🗓️ Cada ${DIAS[diaSemana(fecha)]}`, `${k}|s`)), fila(boton('⬅️ Volver', `a2|${fecha}|${pieza}|${codR(rs)}`))] }
  };
}
// Para cualquier cambio (quitar, mover, cambiar, redes): ¿solo ese día o siempre? «data» es el botón sin el alcance
function vistaAlcanceOp(fecha, data, que) {
  return {
    texto: `${que}\n\n¿Solo ese día o para siempre?`,
    teclado: { inline_keyboard: [fila(boton(`📅 Solo el ${cortoDia(fecha)}`, `${data}|d`)), fila(boton('🔁 Todos los días', `${data}|t`), boton(`🗓️ Cada ${DIAS[diaSemana(fecha)]}`, `${data}|s`)), fila(boton('⬅️ Volver', `p|${fecha}`))] }
  };
}
// Guarda un cambio con su alcance (d = ese día; t = todos los días; s = cada semana ese día) y arma la confirmación
async function conAlcance(fecha, op, alcance, txt, dias) {
  if (alcance === 't' || alcance === 's') {
    const ds = dias || [diaSemana(fecha)];
    await registrar(FIJO, { ...op, id: nuevoId(), ...(alcance === 's' ? { dias: ds } : {}) });
    return conConfirmacion(await vistaPlan(fecha), `${txt} ${alcance === 's' ? `Cada ${ds.map((d) => DIAS[d]).join(', ')}` : 'Todos los días'} (🔁, se borra en «🔁 Fijos»).`);
  }
  await registrar(fecha, op);
  return conConfirmacion(await vistaPlan(fecha), `${txt} Solo el ${cortoDia(fecha)}.`);
}
// Qué videos vienen: los 3D (listos para hoy y los siguientes de la cola) y el próximo video largo de YouTube. Lo deja
// cada corrida de GitHub (scripts/lib/proximos.mjs)
async function vistaVideos() {
  const p = await leerControl('proximos'), hoy = ahoraHN().fecha;
  const volver = { inline_keyboard: [fila(boton('📅 Plan de hoy', `p|${hoy}`))] };
  if (!p) return { texto: '🎬 Todavía no tengo la lista de videos: se arma con el próximo render o publicación 3D (o con las noticias de las 6:23).', teclado: volver };
  const corto = (f) => `${DIAS[diaSemana(f)].slice(0, 3)} ${+f.slice(8)}`;
  const l = p.video3d.listos, turno = (t, h) => l[t] ? `${h} «${esc(l[t].titulo)}»${l[t].fecha !== hoy ? ` (del ${corto(l[t].fecha)})` : ''} ✅ listo` : `${h} — ya salió o se renderiza de madrugada`;
  const texto = [
    '🎬 <b>Videos que vienen</b>',
    '',
    '<b>3D de hoy</b>',
    turno('mediodia', '12:17'), turno('tarde', '18:30'),
    '',
    `<b>Siguientes en la cola</b> (quedan ${p.video3d.quedan}; salen 2 al día)`,
    ...p.video3d.siguientes.map((g, i) => `${i + 1}. ${esc(g.titulo)}`),
    ...(p.video3d.especiales.length ? ['', '<b>Especiales con fecha</b>', ...p.video3d.especiales.map((g) => `⭐ ${esc(g.titulo)} · ${corto(g.fecha)}, 18:30`)] : []),
    '',
    `📺 <b>Video largo de YouTube</b>${p.largo.fecha ? ` · ${corto(p.largo.fecha)}, 14:07` : ''}`,
    `Cómo se hacen: ${esc(p.largo.productos.join(', '))}`,
    '',
    `<i>Actualizado a las ${new Date(p.at).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Tegucigalpa' })}</i>`
  ].join('\n');
  return { texto, teclado: volver };
}
// La programación fija: lo que agregaste o cambiaste «para siempre», con su botón para borrarlo
async function vistaFijos(aviso = '') {
  const { fijos } = await estadoExacto(), lista = fijos.filter((o) => o.id);
  const accion = (o) => ({ agregar: '➕', quitar: '❌ sin', mover: '🕒', cambiar: o.redes && !o.cambio ? '📱' : '🔄' })[o.t] || '·';
  const detalle = (o) => o.t === 'mover' ? `${NOMBRE_PIEZA[o.pieza] || o.pieza} de las ${o.hora} a las ${o.a}` : o.t === 'quitar' ? `${NOMBRE_PIEZA[o.pieza] || o.pieza} de las ${o.hora}` : `${o.hora} · ${NOMBRE_PIEZA[o.pieza] || o.pieza}${o.redes ? ` (${o.redes.map((r) => RED[r]).join(' ')})` : ''}`;
  const linea = (o) => `${o.dias ? `🗓️ Cada ${o.dias.map((d) => DIAS[d]).join(', ')}` : '🔁 Todos los días'} · ${accion(o)} ${detalle(o)}`;
  return {
    texto: `${aviso ? `${aviso}\n\n` : ''}🔁 <b>Programación fija</b> (lo que agregaste o cambiaste para siempre)\n\n${lista.length ? lista.map((o) => esc(linea(o))).join('\n') : 'Todavía no hay nada: al agregar o cambiar algo, elige «Todos los días» o «Cada …».'}${lista.length ? '\n\n👇 Toca 🗑️ para borrar uno (deja de aplicarse desde hoy).' : ''}`,
    teclado: { inline_keyboard: [...lista.map((o) => fila(boton(`🗑️ ${accion(o)} ${o.hora} ${NOMBRE_PIEZA[o.pieza] || o.pieza}${o.dias ? ` (${o.dias.map((d) => DIAS[d].slice(0, 3)).join(',')})` : ''}`.slice(0, 60), `fx|${o.id}`))), fila(boton('📅 Plan de hoy', `p|${ahoraHN().fecha}`))] }
  };
}
async function vistaPlan(fecha, aviso = '') {
  const { ops, opsDia, slots, esHoy } = await datosDia(fecha);
  const pausa = ops.some((o) => o.t === 'pausa');
  // Un botón por publicación que todavía no sale
  const futuras = slots.filter((s) => editable(s) && s.workflow !== 'metas.yml' && (!esHoy || !s.estado || s.estado === 'proximo' || s.estado === 'pendiente'));
  const teclado = [
    ...enFilas(futuras.map((s) => boton(`${s.hora} ${nombreSlot(s)}`, `s|${fecha}|${corta(s.hora)}|${s.pieza || ''}`)), 2),
    fila(boton('➕ Agregar', `a|${fecha}`), boton(pausa ? '▶️ Reanudar día' : '⏸️ Pausar día', `pz|${fecha}`)),
    fila(opsDia.length ? boton('↩️ Deshacer', `u|${fecha}`) : null, boton('🔁 Fijos', 'fj'), boton('🎬 Videos', 'vp')),
    fila(esHoy ? boton('📰 Noticias', 'n') : null, boton(esHoy ? '📅 Mañana' : '📅 Hoy', `p|${esHoy ? masDias(fecha, 1) : ahoraHN().fecha}`))
  ].filter((f) => f.length);
  const texto = `${aviso ? `${aviso}\n\n` : ''}${mensajePlan(fecha, slots, { estado: esHoy, ops })}\n\n👇 Toca una publicación para quitarla, moverla o cambiarla.`;
  return { texto, teclado: { inline_keyboard: teclado } };
}
async function vistaSlot(fecha, hhmm, pieza) {
  const { slots } = await datosDia(fecha), hora = larga(hhmm);
  const s = slots.find((x) => x.hora === hora && editable(x) && (!pieza || x.pieza === pieza)) || slots.find((x) => x.hora === hora && editable(x));
  if (!s) return vistaPlan(fecha, '⚠️ Esa publicación ya no está en el plan.');
  if (s.estado === 'hecho' || s.estado === 'en-curso') return vistaPlan(fecha, `⚠️ ${nombreSlot(s)} de las ${hora} ya ${s.estado === 'hecho' ? 'salió' : 'se está haciendo'}.`);
  const k = `${fecha}|${hhmm}|${s.pieza || ''}`, rs = redesDe(s.workflow, s.inputs);
  return {
    texto: `🎯 <b>${esc(nombreSlot(s))}</b> · ${hora}\n📱 ${esc(nombresRedes(rs))}\n${esc(diaBonito(fecha))}\n\n¿Qué hago con esta publicación?`,
    teclado: { inline_keyboard: [fila(boton('❌ Quitar', `q|${k}`), boton('🕒 Mover', `mv|${k}`)), fila(boton('🔄 Cambiar por otra', `cb|${k}`), posibles(s.pieza).length > 1 ? boton('📱 Redes', `rd|${k}|${codR(rs)}`) : null), fila(boton('⬅️ Volver', `p|${fecha}`))] }
  };
}
// Quitar o poner redes a una publicación del plan
function vistaRedesSlot(fecha, hhmm, pieza, sel) {
  const k = `${fecha}|${hhmm}|${pieza}`;
  return {
    texto: `📱 <b>${esc(NOMBRE_PIEZA[pieza] || pieza)}</b> de las ${larga(hhmm)}: ¿en qué redes sale?\nToca para quitar (▫️) o poner (✅) cada una y luego «Guardar».`,
    teclado: { inline_keyboard: tecladoRedes(pieza, sel, `rd|${k}`, `rg|${k}`, '💾 Guardar', `s|${k}`) }
  };
}
// Agregar: primero las redes (empieza con las de siempre de esa pieza), luego la hora
function vistaRedesAgregar(fecha, pieza, sel) {
  return {
    texto: `➕ <b>${esc(NOMBRE_PIEZA[pieza])}</b>: ¿en qué redes?\nToca para quitar (▫️) o poner (✅) cada una.`,
    teclado: { inline_keyboard: tecladoRedes(pieza, sel, `ar|${fecha}|${pieza}`, `a2|${fecha}|${pieza}`, 'Elegir hora ➡️', `a|${fecha}`) }
  };
}
// Horas para mover o agregar: alrededor de la hora (mover) o huecos libres del día (agregar); nunca en el pasado
function horasPosibles(fecha, slots, { desde, esHoy }) {
  const min = esHoy ? ahoraHN().min + 5 : 0, ocupadas = slots.filter(editable).map((s) => aMin(s.hora));
  const cand = desde ? [-120, -60, -30, -15, 15, 30, 60, 90, 120, 180].map((d) => aMin(desde) + d) : Array.from({ length: 17 }, (_, i) => (7 + i) * 60);
  return cand.filter((m) => m >= Math.max(min, 6 * 60) && m <= 23 * 60 + 30 && (desde || !ocupadas.some((o) => Math.abs(o - m) < 30))).map(deMin);
}
async function vistaMover(fecha, hhmm, pieza) {
  const { slots, esHoy } = await datosDia(fecha), hs = horasPosibles(fecha, slots, { desde: larga(hhmm), esHoy });
  return {
    texto: `🕒 ¿A qué hora muevo <b>${esc(NOMBRE_PIEZA[pieza] || pieza)}</b> de las ${larga(hhmm)}?\n(Otra hora: escribe «mueve el de las ${larga(hhmm)} a las 17:10».)`,
    teclado: { inline_keyboard: [...enFilas(hs.map((h) => boton(h, `m|${fecha}|${hhmm}|${pieza}|${corta(h)}`)), 4), fila(boton('⬅️ Volver', `s|${fecha}|${hhmm}|${pieza}`))] }
  };
}
const vistaPiezas = (titulo, prefijo, volver, excluir) => ({
  texto: titulo,
  teclado: { inline_keyboard: [...enFilas(PONIBLES.filter((p) => p !== excluir).map((p) => boton(NOMBRE_PIEZA[p], `${prefijo}|${p}`)), 2), fila(boton('⬅️ Volver', volver))] }
});
async function vistaAgregarHora(fecha, pieza, rs) {
  const { slots, esHoy } = await datosDia(fecha), hs = horasPosibles(fecha, slots, { esHoy }), r = codR(rs);
  return {
    texto: `➕ <b>${esc(NOMBRE_PIEZA[pieza])}</b> en ${esc(nombresRedes(rs))}. ¿A qué hora?\n${hs.length ? 'Muestro las horas libres (a 30 min o más de otra publicación).' : 'Ya no quedan horas libres hoy.'}${esHoy ? ' «🚀 Ahora» lo publica en unos minutos.' : ''}\n(Otra hora: escribe «agrega ${esc(NOMBRE_PIEZA[pieza].toLowerCase())} a las 22:50».)`,
    teclado: { inline_keyboard: [...(esHoy ? [fila(boton('🚀 Ahora', `l3|${pieza}|${r}`))] : []), ...enFilas(hs.map((h) => boton(h, `a3|${fecha}|${pieza}|${corta(h)}|${r}`)), 4), fila(boton('⬅️ Volver', `ar|${fecha}|${pieza}|${r}`))] }
  };
}
async function vistaNoticias(aviso = '', guardadas) {
  const hoy = ahoraHN().fecha, ops = await cambiosExactos(hoy), { at, items } = guardadas || await noticiasGuardadas(hoy), lista = noticiasConCambios(items, ops);
  const slots = delDia(hoy, ops), horaReel = slots.find((s) => s.pieza === 'noticias')?.hora;
  const teclado = lista.slice(0, 8).filter((n) => n.num).map((n, i) => fila(boton(`${i < N_REEL ? '✅' : '▫️'} ${n.num} ❌ Quitar`, `nx|${n.num}`), i < N_REEL ? null : boton(`📌 Usar la ${n.num}`, `nf|${n.num}`)));
  teclado.push(fila(boton('🔄 Actualizar noticias', 'nr')));
  teclado.push(fila(ops.some((o) => o.t.startsWith('noticia')) ? boton('↩️ Deshacer', `u|${hoy}|n`) : null, boton('📅 Plan de hoy', `p|${hoy}`)));
  const cuando = at ? `\n🕒 Juntadas a las ${new Date(at).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Tegucigalpa' })}` : '';
  return { texto: `${aviso ? `${aviso}\n\n` : ''}${mensajeNoticias(lista, { horaReel })}${cuando}\n\n👇 ❌ quita una noticia del Reel; 📌 mete una de las de reserva; 🔄 trae las más recientes. Para agregar una tuya, pega el enlace.`, teclado: { inline_keyboard: teclado } };
}
// Junta las noticias ahora mismo (RSS, unos segundos) y las deja como las del día
async function actualizarNoticias() {
  const hoy = ahoraHN().fecha, items = await juntarNoticias();
  if (items.length < 3) throw new Error('los medios no devolvieron noticias nuevas; prueba en unos minutos');
  await guardarNoticias(hoy, items);
  return { at: Date.now(), items };
}
// Las de hoy, actualizadas si tienen más de «minutos»
async function noticiasFrescas(minutos = 60) {
  const g = await noticiasGuardadas(ahoraHN().fecha);
  return g.items.length >= 3 && Date.now() - g.at < minutos * 60e3 ? null : actualizarNoticias().catch(() => null);
}

// Lanza «Respuestas a comentarios» ya, salvo que haya otra corrida esperando en GitHub (lanzar otra la cancelaría): en
// ese caso sale en su vuelta de cada hora. Devuelve si se lanzó
async function lanzarComentarios() {
  const { corridas } = await diaConEstado(new Date());
  if (corridas.some((x) => ACTIVO.includes(x.estado) && x.estado !== 'in_progress')) return false;
  await lanzar('comentarios.yml', {}); return true;
}

// Un cambio hecho: la confirmación va en su propio mensaje y debajo, en uno nuevo, el plan (o las noticias) al día
const conConfirmacion = (vista, txt, icono = '✅') => ({ ...vista, confirmacion: `${icono} ${txt}` });

// ---------- botones ----------
export async function alTocar(data) {
  const [c, ...a] = data.split('|');
  const hecho = async (fecha, op, txt) => { await registrar(fecha, op); return conConfirmacion(await vistaPlan(fecha), txt); };
  switch (c) {
    case 'p': return vistaPlan(a[0]);
    case 's': return vistaSlot(a[0], a[1], a[2]);
    case 'q': return a[3] ? conAlcance(a[0], { t: 'quitar', hora: larga(a[1]), ...(a[2] ? { pieza: a[2] } : {}) }, a[3], `Quité ${NOMBRE_PIEZA[a[2]] || 'la publicación'} de las ${larga(a[1])}.`)
      : vistaAlcanceOp(a[0], data, `❌ Quitar <b>${esc(NOMBRE_PIEZA[a[2]] || 'la publicación')}</b> de las ${larga(a[1])}.`);
    case 'mv': return vistaMover(a[0], a[1], a[2]);
    case 'm': {
      if (!a[4]) return vistaAlcanceOp(a[0], data, `🕒 Mover <b>${esc(NOMBRE_PIEZA[a[2]] || 'la publicación')}</b> de las ${larga(a[1])} a las ${larga(a[3])}.`);
      return conAlcance(a[0], { t: 'mover', hora: larga(a[1]), ...(a[2] ? { pieza: a[2] } : {}), a: larga(a[3]) }, a[4], `Moví ${NOMBRE_PIEZA[a[2]] || 'la publicación'} de las ${larga(a[1])} a las ${larga(a[3])}.`);
    }
    case 'cb': return vistaPiezas(`🔄 ¿Qué pongo a las ${larga(a[1])} en vez de ${esc(NOMBRE_PIEZA[a[2]] || 'eso')}?`, `c|${a[0]}|${a[1]}`, `s|${a[0]}|${a[1]}|${a[2]}`, a[2]);
    case 'c': return a[3] ? conAlcance(a[0], { t: 'cambiar', hora: larga(a[1]), pieza: a[2] }, a[3], `A las ${larga(a[1])} va ${NOMBRE_PIEZA[a[2]]}.`)
      : vistaAlcanceOp(a[0], data, `🔄 A las ${larga(a[1])} poner <b>${esc(NOMBRE_PIEZA[a[2]])}</b>.`);
    case 'a': return vistaPiezas('➕ ¿Qué agrego?', `ar|${a[0]}`, `p|${a[0]}`);
    // ar|fecha|pieza[|redes]: elegir redes (sin redes: las de siempre); con una sola red posible, directo a la hora
    case 'ar': {
      const sel = a[2] ? decR(a[2]) : redesDePieza(a[1]).filter((r) => posibles(a[1]).includes(r));
      return posibles(a[1]).length === 1 ? vistaAgregarHora(a[0], a[1], posibles(a[1])) : vistaRedesAgregar(a[0], a[1], sel);
    }
    case 'a2': return vistaAgregarHora(a[0], a[1], decR(a[2]));
    case 'a3': return vistaAlcance(a[0], a[1], a[2], decR(a[3]).length ? decR(a[3]) : redesDePieza(a[1]));
    // a4|fecha|pieza|hhmm|redes|alcance (d = solo ese día, t = todos los días, s = cada semana ese día)
    case 'a4': {
      const [fecha, pieza, hhmm, r, alcance] = a, rs = decR(r), op = { t: 'agregar', hora: larga(hhmm), pieza, ...(rs.length ? { redes: rs } : {}) };
      const donde = rs.length ? ` en ${nombresRedes(rs)}` : '';
      if (alcance === 'd') return hecho(fecha, op, `Agregué ${NOMBRE_PIEZA[pieza]} a las ${larga(hhmm)}${donde}, solo el ${cortoDia(fecha)}.`);
      await registrar(FIJO, { ...op, id: nuevoId(), ...(alcance === 's' ? { dias: [diaSemana(fecha)] } : {}) });
      return conConfirmacion(await vistaPlan(fecha), `${NOMBRE_PIEZA[pieza]} a las ${larga(hhmm)}${donde} queda en la programación: ${alcance === 's' ? `cada ${DIAS[diaSemana(fecha)]}` : 'todos los días'} (🔁). Se borra en «🔁 Fijos».`);
    }
    case 'fj': return vistaFijos();
    case 'vp': return vistaVideos();
    case 'fx': { await registrar(FIJO, { t: 'borrar', id: a[0] }); return conConfirmacion(await vistaFijos(), 'Lo quité de la programación fija: deja de salir desde hoy.'); }
    case 'rd': return vistaRedesSlot(a[0], a[1], a[2], decR(a[3]));
    case 'rg': {
      const rs = decR(a[3]), txt = `${NOMBRE_PIEZA[a[2]] || 'La publicación'} de las ${larga(a[1])} sale en ${nombresRedes(rs)}.`;
      return a[4] ? conAlcance(a[0], { t: 'cambiar', hora: larga(a[1]), pieza: a[2], redes: rs }, a[4], txt) : vistaAlcanceOp(a[0], data, `📱 ${esc(txt)}`);
    }
    case 'pz': {
      const pausado = (await cambiosExactos(a[0])).some((o) => o.t === 'pausa');
      if (pausado) return hecho(a[0], { t: 'reanudar-pausa' }, 'Quité la pausa: todo vuelve a salir.');
      return { texto: `⏸️ ¿Pausar TODAS las publicaciones de ${esc(diaBonito(a[0]))}?\n(Los renders y las respuestas a comentarios siguen.)`, teclado: { inline_keyboard: [fila(boton('Sí, pausar', `pz2|${a[0]}`), boton('No', `p|${a[0]}`))] } };
    }
    case 'pz2': return hecho(a[0], { t: 'pausa' }, 'Día en pausa.');
    case 'u': { await registrar(a[0], { t: 'deshacer' }); return conConfirmacion(a[1] === 'n' ? await vistaNoticias() : await vistaPlan(a[0]), 'Deshice el último cambio.', '↩️'); }
    case 'l': return vistaPiezas('🚀 ¿Qué publico ahora mismo? (sale en unos minutos, además de lo del plan)', 'l2', `p|${ahoraHN().fecha}`);
    // l2|pieza[|redes]: elegir redes y confirmar
    case 'l2': {
      const sel = a[1] ? decR(a[1]) : redesDePieza(a[0]).filter((r) => posibles(a[0]).includes(r));
      const tec = tecladoRedes(a[0], sel, `l2|${a[0]}`, `l3|${a[0]}`, '🚀 Publicar ya', 'l');
      // «Ya y todos los días a esta hora»: lo publica ahora y lo deja en la programación fija
      if (sel.length) tec.splice(tec.length - 1, 0, fila(boton(`🚀 Ya y 🔁 todos los días a las ${ahoraHHMM()}`, `l3|${a[0]}|${codR(sel)}|t`)));
      return { texto: `🚀 <b>${esc(NOMBRE_PIEZA[a[0]])}</b> ahora mismo (además de lo del plan).\n¿En qué redes? Toca para quitar (▫️) o poner (✅).`, teclado: { inline_keyboard: tec } };
    }
    case 'l3': {
      const rs = a[1] ? decR(a[1]) : redesDePieza(a[0]);
      if (!rs.length) return alTocar(`l2|${a[0]}`);
      const hoy = ahoraHN().fecha, hora = ahoraHHMM(), s = armarSlot(a[0], hora, rs), donde = nombresRedes(redesDe(s.workflow, s.inputs));
      const frescas = a[0] === 'noticias' ? await noticiasFrescas(60) : null; // el Reel toma la lista del día: que sea de esta hora
      // GitHub guarda una sola corrida en espera: si ya hay una, lanzar otra la cancelaría. Entonces lo deja en el plan
      // y el relojero lo lanza en cuanto se libere (≤ 10 min)
      const { corridas } = await diaConEstado(new Date());
      const enCola = corridas.some((x) => ACTIVO.includes(x.estado) && x.estado !== 'in_progress');
      if (!enCola) await lanzar(s.workflow, s.inputs || {});
      await registrar(hoy, { t: 'agregar', hora, pieza: a[0], redes: rs, ya: true });
      // Para siempre a esta hora (desde mañana: hoy ya salió)
      if (a[2] === 't') await registrar(FIJO, { t: 'agregar', hora, pieza: a[0], redes: rs, id: nuevoId(), desde: masDias(hoy, 1) });
      return conConfirmacion(await vistaPlan(hoy), `${enCola ? 'Puse' : 'Lancé'} ${NOMBRE_PIEZA[a[0]]} en ${donde}. ${enCola ? 'Hay otra corrida esperando en GitHub: sale en cuanto termine (unos minutos más).' : 'Ya se está generando: sale en unos 5 a 10 minutos.'}${frescas ? ' Antes actualicé las noticias.' : ''}${a[2] === 't' ? ` Y desde mañana sale todos los días a las ${hora} (🔁).` : ''}`, '🚀');
    }
    case 'n': return vistaNoticias();
    case 'nr': { const g = await actualizarNoticias(); return conConfirmacion(await vistaNoticias('', g), `Actualicé las noticias: ${g.items.length} recientes (las ✅ van en el Reel).`, '🔄'); }
    case 'nx': case 'nf': {
      const hoy = ahoraHN().fecha, n = (await noticiasDe(hoy))[+a[0] - 1];
      if (!n) return vistaNoticias('⚠️ Esa noticia ya no está en la lista.');
      await registrar(hoy, { t: c === 'nx' ? 'noticia-fuera' : 'noticia-fija', link: n.link });
      return conConfirmacion(await vistaNoticias(), `${c === 'nx' ? 'Quité' : 'Metí en el Reel'} la noticia ${a[0]}.`);
    }
    default: return vistaPlan(ahoraHN().fecha);
  }
}

// ---------- texto escrito ----------
const ATAJOS = { '📅 plan de hoy': 'p|hoy', '📅 plan de manana': 'p|manana', '📰 noticias': 'n', '🚀 publicar ya': 'l', '🎬 videos': 'vp', 'videos': 'vp', '/videos': 'vp' };
export async function atender(texto) {
  const hoy = ahoraHN().fecha, manana = masDias(hoy, 1);
  const atajo = ATAJOS[texto.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')];
  if (atajo) return alTocar(atajo.replace('|hoy', `|${hoy}`).replace('|manana', `|${manana}`));
  const opsHoy = await cambiosExactos(hoy);
  const { lista: slotsHoy } = await diaConEstado(new Date(), opsHoy);
  let r = interpretar(texto, { slots: slotsHoy });
  if (r.dia === 'manana') r = interpretar(texto, { slots: delDia(manana, await cambiosExactos(manana)) });
  const fecha = r.dia === 'manana' ? manana : hoy;
  switch (r.tipo) {
    case 'ayuda': return { texto: AYUDA, teclado: MENU };
    case 'plan': return vistaPlan(fecha);
    case 'noticias': return vistaNoticias();
    case 'noticias-actualizar': return alTocar('nr');
    case 'noticias-op': {
      const items = await noticiasDe(hoy), malas = r.nums.filter((n) => !items[n - 1]);
      if (malas.length) return vistaNoticias(`⚠️ No tengo la noticia ${malas.join(', ')}.`);
      for (const n of r.nums) await registrar(hoy, { t: r.accion === 'fuera' ? 'noticia-fuera' : 'noticia-fija', link: items[n - 1].link });
      return conConfirmacion(await vistaNoticias(), `${r.accion === 'fuera' ? 'Quité' : 'Fijé arriba'} ${r.nums.length > 1 ? 'las noticias' : 'la noticia'} ${r.nums.join(', ')}.`);
    }
    case 'enlace': {
      const n = await noticiaDeEnlace(r.url);
      await registrar(hoy, { t: 'noticia-propia', noticia: n });
      return conConfirmacion(await vistaNoticias(), `Agregué «${n.titulo}» (${n.medio}). Va primero en el Reel.${n.resumen ? '' : '\nNo traía resumen: si quieres uno, mándala como «noticia: Título | resumen».'}`);
    }
    case 'op': {
      if (r.op.t === 'agregar' && !r.alcance) return vistaAlcance(fecha, r.op.pieza, corta(r.op.hora), r.op.redes || redesDePieza(r.op.pieza));
      // Quitar, mover o cambiar: con «siempre», «todos los días», «cada viernes»… se guarda así; si no lo dice, pregunta
      const alc = r.alcance || alcanceDe(texto).alcance;
      if (['quitar', 'mover', 'cambiar'].includes(r.op.t)) {
        const o = r.op, base = o.t === 'quitar' ? `q|${fecha}|${corta(o.hora)}|${o.pieza || ''}` : o.t === 'mover' ? `m|${fecha}|${corta(o.hora)}|${o.pieza || ''}|${corta(o.a)}` : o.redes ? `rg|${fecha}|${corta(o.hora)}|${o.pieza}|${codR(o.redes)}` : `c|${fecha}|${corta(o.hora)}|${o.pieza}`;
        if (!alc) return vistaAlcanceOp(fecha, base, esc(r.resumen));
        if (alc !== 'd') return conAlcance(fecha, o, alc, r.resumen, alcanceDe(texto).dias);
      }
      if (r.op.t === 'agregar' && r.alcance !== 'd') {
        await registrar(FIJO, { ...r.op, id: nuevoId(), ...(r.alcance === 's' ? { dias: r.dias } : {}) });
        return conConfirmacion(await vistaPlan(fecha), `${NOMBRE_PIEZA[r.op.pieza]} a las ${r.op.hora} queda en la programación: ${r.alcance === 's' ? `cada ${r.dias.map((d) => DIAS[d]).join(', ')}` : 'todos los días'} (🔁).`);
      }
      await registrar(fecha, r.op);
      if (r.op.t.startsWith('noticia')) return conConfirmacion(await vistaNoticias(), r.resumen);
      const pasado = r.op.t === 'mover' && fecha === hoy && r.op.a <= ahoraHHMM();
      return conConfirmacion(await vistaPlan(fecha), `${r.resumen}${pasado ? '\nEsa hora ya pasó: sale en los próximos 10 minutos.' : ''}`);
    }
    case 'lanzar': return alTocar(`l2|${r.pieza}${r.redes ? `|${codR(r.redes)}` : ''}`);
    default: return { texto: `${esc(r.msg)}\n\nUsa los botones de abajo 👇 o escribe «ayuda».`, teclado: MENU };
  }
}

export default { async fetch(request) {
  if (request.method !== 'POST') return json({ ok: true });
  if (!process.env.TELEGRAM_BOT_TOKEN || request.headers.get('x-telegram-bot-api-secret-token') !== secretoWebhook()) return json({ error: 'No autorizado' }, 401);
  const u = await request.json().catch(() => ({}));
  const cb = u.callback_query, m = u.message || u.edited_message || cb?.message;
  const chat = String(m?.chat?.id || ''), mio = chat && chat === String(process.env.TELEGRAM_CHAT_ID || '').trim();
  // Solo tu chat; lo demás se ignora en silencio (Telegram reintenta si no recibe 200). La respuesta (que Telegram no
  // lee) dice qué pasó, para revisar el bot con una llamada firmada.
  if (!mio) return json({ ok: true, motivo: chat ? 'otro-chat' : 'sin-mensaje', chatIdConfigurado: !!process.env.TELEGRAM_CHAT_ID });
  let enviado = false;
  try {
    // ---------- comentarios que contestas tú (los manda scripts/comentarios.mjs) ----------
    const ref = (m.reply_to_message?.text || '').match(/🆔 (fb|ig) (\S+)(?: (@\S+))?/);
    if (!cb && m.text && ref) {
      const [, r, id, usuario] = ref, red = r === 'fb' ? 'facebook' : 'instagram';
      // En Instagram la respuesta va al comentario principal: se menciona a quien escribió para que le llegue
      const texto = usuario && !m.text.includes(usuario) ? `${usuario} ${m.text}` : m.text;
      await encolarComentario({ accion: 'responder', red, id, texto, usuario: usuario || null });
      const ya = await lanzarComentarios();
      enviado = await telegram(`📝 Listo, publico tu respuesta en ${red === 'facebook' ? 'Facebook' : 'Instagram'}${ya ? ' en unos minutos' : ' en la próxima vuelta (máx. 1 hora)'}:\n«${esc(texto)}»\nTe aviso cuando quede.`, { chat });
      return json({ ok: true, motivo: 'respuesta-encolada', enviado });
    }
    if (cb?.data?.startsWith('cm|')) {
      const [, acc, r, id] = cb.data.split('|'), red = r === 'fb' ? 'facebook' : 'instagram';
      await tgApi('answerCallbackQuery', { callback_query_id: cb.id, text: acc === 'i' ? 'Ignorado' : 'Listo' });
      if (acc !== 'i') { await encolarComentario({ accion: acc === 'l' ? 'like' : 'ocultar', red, id }); await lanzarComentarios(); }
      const estado = acc === 'i' ? '✅ Ignorado: no se contesta.' : acc === 'l' ? '👍 Le doy «me gusta» en unos minutos.' : '🙈 Lo oculto en unos minutos.';
      enviado = await editarMensaje(chat, m.message_id, `${esc(m.text || '')}\n\n<b>${estado}</b>`);
      return json({ ok: true, motivo: 'comentario', enviado });
    }
    const v = cb ? (await tgApi('answerCallbackQuery', { callback_query_id: cb.id, text: 'Listo' }), await alTocar(cb.data || '')) : m.text ? await atender(m.text) : null;
    if (v?.confirmacion) {
      // El menú donde tocaste queda como la confirmación (sin botones) y el plan al día llega abajo, en un mensaje nuevo
      if (cb) await editarMensaje(chat, m.message_id, esc(v.confirmacion)) || await telegram(esc(v.confirmacion), { chat });
      else await telegram(esc(v.confirmacion), { chat });
      enviado = await telegram(v.texto, { chat, teclado: v.teclado });
    } else if (v) {
      // Solo navegar (abrir una publicación, elegir redes u hora): se cambia el mismo mensaje
      enviado = cb ? await editarMensaje(chat, m.message_id, v.texto, v.teclado) : false;
      if (!enviado) enviado = await telegram(v.texto, { chat, teclado: v.teclado });
    }
  } catch (e) { enviado = await telegram(`⚠️ No pude hacerlo: ${esc(e.message)}`, { chat, teclado: MENU }); return json({ ok: true, motivo: 'error', error: e.message, enviado }); }
  return json({ ok: true, motivo: 'atendido', enviado, error: enviado ? undefined : ultimoError });
} };
