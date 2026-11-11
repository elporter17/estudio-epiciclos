// POST /api/telegram: webhook del bot de Telegram (@potteplay_avisos_bot). Todo se puede hacer con BOTONES (el plan
// del día con un botón por publicación → quitar / mover / cambiar; agregar, pausar, deshacer, publicar ya; noticias →
// quitar / fijar) y también escribiendo normal (scripts/lib/bot.mjs). La programación está en Supabase (tabla
// «programacion», scripts/lib/programacion.mjs: «🗓️ Programación» la muestra y la edita) y los cambios de un día en
// «cambios» (scripts/lib/control.mjs); el relojero los aplica en su siguiente vuelta (≤ 10 min).
// Solo hace caso a TU chat (TELEGRAM_CHAT_ID) y solo acepta llamadas de Telegram (cabecera secreta que se registra con
// npm run telegram:webhook). Variables de Vercel: TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID.
import { json, diaConEstado, lanzar, ACTIVO } from './_panel.js';
import { interpretar, AYUDA, mensajePlan, mensajeNoticias, diaBonito, alcanceDe } from '../scripts/lib/bot.mjs';
import { cambiosExactos, estadoExacto, registrar, noticiasDe, noticiasGuardadas, guardarNoticias, noticiasConCambios, telegram, editarMensaje, tgApi, esc, secretoWebhook, ultimoError, FIJO, nuevoId, encolarComentario, leerControl, guardarIdea, leerIdea, tgDocumento, tgLeerArchivo, migrarProgramacion } from '../scripts/lib/control.mjs';
import { cargarProgramacion, cambiarFila, editableFila, redesDeFila } from '../scripts/lib/programacion.mjs';
import { delDia, ahoraHN, armarSlot, redesDePieza, nombreSlot, editable, NOMBRE_PIEZA, redesDe, redesPosibles } from '../scripts/lib/horario.mjs';
import { noticiaDeEnlace, juntarNoticias, N_REEL } from '../scripts/lib/noticias.mjs';
import { construir, escenaDe, NOMBRE_ESCENA } from '../scripts/lib/constructor.mjs';
import { textoFormato, validar, ESPEC } from '../scripts/lib/guion-formato.mjs';
import { yaSalieronDb, guardarCandidatas, descartarNoticia, recientesDb, db } from '../scripts/lib/db.mjs';

const dd = (n) => String(n).padStart(2, '0');
const masDias = (fecha, n) => new Date(Date.parse(`${fecha}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const aMin = (h) => +h.slice(0, 2) * 60 + +h.slice(-2);
const deMin = (m) => `${dd(Math.floor(m / 60))}:${dd(m % 60)}`;
const corta = (h) => h.replace(':', ''), larga = (h) => `${h.slice(0, 2)}:${h.slice(2)}`;
const ahoraHHMM = () => deMin(ahoraHN().min);
// Lo que se puede poner en un hueco (los 3D y el video largo se preparan de madrugada)
const PONIBLES = ['debate', 'debateimg', 'banderas', 'geo', 'gtaquiz', 'retos', 'datos', 'emojis', 'quiz', 'prefieres', 'comosehace', 'imagen', 'noticias', 'noticiasimg', 'gta', 'nombres', 'famosos'];
const RED = { fb: 'FB', ig: 'IG', tt: 'TT', yt: 'YT' };

// Teclado fijo de abajo: lo que más se usa, sin escribir
// Videos desde una idea (💡 Idea, guiones de otra IA): APAGADO el 2026-11-09 porque daba errores; las ideas nuevas se
// piden en Claude Code. El código queda; para volver a activarlo: IDEAS = true y el botón vuelve al menú
const IDEAS = false;
export const MENU = { keyboard: [[{ text: '📅 Plan de hoy' }, { text: '📅 Plan de mañana' }], [{ text: '📰 Noticias' }, { text: '🚀 Publicar ya' }], [...(IDEAS ? [{ text: '💡 Idea' }] : []), { text: '🎬 Videos' }], [{ text: '❓ Ayuda' }]], resize_keyboard: true, is_persistent: true };
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
    return conConfirmacion(await vistaPlan(fecha), `${txt} ${alcance === 's' ? `Cada ${ds.map((d) => DIAS[d]).join(', ')}` : 'Todos los días'} (🔁, queda en «🗓️ Programación»).`);
  }
  await registrar(fecha, op);
  return conConfirmacion(await vistaPlan(fecha), `${txt} Solo el ${cortoDia(fecha)}.`);
}
// Qué videos vienen: los 3D (listos para hoy y los siguientes de la cola) y el próximo video largo de YouTube. Lo deja
// cada corrida de GitHub (scripts/lib/proximos.mjs)
async function vistaVideos() {
  const p = await leerControl('proximos'), hoy = ahoraHN().fecha;
  const volver = { inline_keyboard: [fila(boton('📼 Generados', 'vl|t'), boton('📉 Pocas vistas', 'vl|b')), fila(boton('📅 Plan de hoy', `p|${hoy}`))] };
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
    ...p.video3d.siguientes.map((g, i) => `${i + 1}. ${esc(g.titulo)}${g.fuentes === 0 ? ' ⚠️ sin fuentes' : ''}`),
    ...(p.video3d.especiales.length ? ['', '<b>Especiales con fecha</b>', ...p.video3d.especiales.map((g) => `⭐ ${esc(g.titulo)} · ${corto(g.fecha)}, 18:30`)] : []),
    '',
    `📺 <b>Video largo de YouTube</b>${p.largo.fecha ? ` · ${corto(p.largo.fecha)}, 14:07` : ''}`,
    `Cómo se hacen: ${esc(p.largo.productos.join(', '))}`,
    '',
    `<i>Actualizado a las ${new Date(p.at).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Tegucigalpa' })}</i>`
  ].join('\n');
  return { texto, teclado: { inline_keyboard: [fila(boton('📚 Fuentes de los publicados', 'vf')), ...volver.inline_keyboard] } };
}
// ---------- videos generados (tabla «videos» de Supabase) y reenvíos ----------
// Se pueden reenviar mientras exista el artefacto de su corrida (30 días). «Pocas vistas»: con 2 días o más y en el
// 30 % de abajo de los últimos 14 días (las vistas las pone vistas.yml cada noche)
const reenviable = (v) => v.run_id && v.archivo && Date.now() - Date.parse(v.creado) < 29 * 864e5;
const vistasTxt = (v) => v.vistas_al ? `${v.vistas_total} 👁️ (${Object.entries(v.vistas || {}).map(([r, n]) => `${RED[r]} ${n}`).join(' · ') || '—'})` : 'sin vistas todavía';
async function vistaGenerados(modo = 't', aviso = '') {
  const todos = ((await db('videos-lista', { dias: 14, limite: 200 }).catch(() => null)) || []).filter(reenviable);
  let lista = todos.slice(0, 12), titulo = '📼 <b>Videos generados</b> (últimos)';
  if (modo === 'b') {
    const maduros = todos.filter((v) => v.vistas_al && Date.now() - Date.parse(v.creado) >= 2 * 864e5).sort((a, b) => a.vistas_total - b.vistas_total);
    lista = maduros.slice(0, Math.max(3, Math.ceil(maduros.length * 0.3))).slice(0, 12);
    titulo = '📉 <b>Videos con pocas vistas</b> (2 días o más, los de abajo de las últimas 2 semanas)';
  }
  const dia = (v) => cortoDia(new Date(Date.parse(v.creado) - 6 * 3600e3).toISOString().slice(0, 10));
  const texto = `${aviso ? `${aviso}\n\n` : ''}${titulo}\n\n${lista.length ? lista.map((v, i) => `<b>${i + 1}.</b> ${esc((v.titulo || 'sin título').slice(0, 70))}\n    ${dia(v)} · ${esc(v.formato || '')} · ${vistasTxt(v)}`).join('\n') : (modo === 'b' ? 'Todavía no hay videos con vistas medidas (se miden cada noche).' : 'Todavía no hay videos guardados: se guardan al publicarse.')}\n\nToca uno para reenviarlo.`;
  return { texto, teclado: { inline_keyboard: [...enFilas(lista.map((v, i) => boton(`${i + 1}. ${(v.titulo || '').slice(0, 24)}`, `vr|${v.id}`)), 2), fila(boton(modo === 'b' ? '📼 Todos' : '📉 Pocas vistas', `vl|${modo === 'b' ? 't' : 'b'}`), boton('🎬 Videos', 'vp'))] } };
}
// Un video: sus vistas y a qué redes reenviarlo (vs|id|redes cambia la selección, vy|id|redes lo manda)
async function vistaReenvio(id, sel) {
  const v = await db('video-de', { id }).catch(() => null);
  if (!v || !reenviable(v)) return vistaGenerados('t', '⚠️ Ese video ya no se puede reenviar (su archivo se guarda 30 días).');
  const rs = sel || ['fb', 'ig'];
  const t = ORDEN.map((r) => boton(`${rs.includes(r) ? '✅' : '▫️'} ${RED_LARGO[r]}`, `vs|${v.id}|${codR(rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r])}`));
  return {
    texto: `🔁 <b>${esc(v.titulo || 'Video')}</b>\n${esc(v.formato || '')} · del ${esc(String(v.creado).slice(0, 10))} · ${vistasTxt(v)}\n\n¿A qué redes lo reenvío? Sale en unos minutos (TikTok llega como borrador). Va una copia con otros metadatos, no el mismo archivo.`,
    teclado: { inline_keyboard: [...enFilas(t, 2), fila(rs.length ? boton('🔁 Reenviar ahora', `vy|${v.id}|${codR(rs)}`) : null, boton('⬅️ Volver', 'vl|t'))] }
  };
}
async function reenviar(id, rs) {
  const v = await db('video-de', { id }).catch(() => null);
  if (!v || !reenviable(v)) return vistaGenerados('t', '⚠️ Ese video ya no se puede reenviar.');
  const hoy = ahoraHN().fecha, hora = ahoraHHMM(), inputs = { video: String(v.id), run: String(v.run_id), archivo: v.archivo };
  const slot = { ...armarSlot('reenvio', hora, rs) }; slot.inputs = { ...slot.inputs, ...inputs };
  // Una sola corrida en espera en GitHub: si ya hay una, queda en el plan y la lanza el relojero
  const { corridas } = await diaConEstado(new Date());
  const enCola = corridas.some((x) => ACTIVO.includes(x.estado) && x.estado !== 'in_progress');
  if (!enCola) await lanzar(slot.workflow, slot.inputs);
  await registrar(hoy, { t: 'agregar', hora, pieza: 'reenvio', redes: rs, inputs, ya: true });
  return conConfirmacion(await vistaGenerados('t'), `${enCola ? 'Puse en cola' : 'Lancé'} el reenvío de «${v.titulo || 'el video'}» a ${nombresRedes(rs)}. ${enCola ? 'Sale cuando termine la corrida que está esperando.' : 'Sale en unos 5 a 10 minutos; te aviso aquí.'}`, '🔁');
}
// Las fuentes de los últimos 3D publicados (para contestar si alguien pregunta de dónde sale un dato)
async function vistaFuentes() {
  const p = await leerControl('proximos'), hoy = ahoraHN().fecha, lista = p?.video3d?.publicados || [];
  const bloque = (g) => `🎬 <b>${esc(g.titulo)}</b> · ${esc(g.fecha)}\n${g.fuentes.length ? g.fuentes.map((x) => `• ${esc(x.dato)}: ${esc(x.fuente)}${x.url ? ` · <a href="${esc(x.url)}">ver</a>` : ''}`).join('\n') : '⚠️ Sin fuentes cargadas: pídeme que las busque.'}${g.nota ? `\n📝 ${esc(g.nota)}` : ''}`;
  return { texto: `📚 <b>Fuentes de los últimos videos 3D</b>\n\n${lista.length ? lista.map(bloque).join('\n\n') : 'Todavía no hay publicados con fuentes (se actualiza con cada video).'}`, teclado: { inline_keyboard: [fila(boton('🎬 Videos', 'vp'), boton('📅 Plan de hoy', `p|${hoy}`))] } };
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
// La programación de Supabase: un renglón por envío con sus redes. Si todavía no se migró, la lista de fijos de antes
const SUPABASE_TABLA = 'https://supabase.com/dashboard/project/tglibbjsuskxahajtmrs/editor';
const redesFila = (f) => f.pieza === 'metas' ? ['fb'] : posibles(f.pieza);
const lineaFila = (f) => `${f.activo ? '' : '⏸️ '}${f.hora} ${(NOMBRE_PIEZA[f.pieza] || f.pieza).slice(0, 16)} · ${redesDeFila(f).map((r) => RED[r]).join(' ') || 'sin redes'}${f.dias?.length ? ` (${f.dias.map((d) => DIAS[d].slice(0, 3)).join(',')})` : ''}${f.fecha ? ` (solo ${f.fecha.slice(5)})` : ''}`;
async function vistaProgramacion(aviso = '') {
  const { filas, fuente } = await cargarProgramacion({ fresco: true });
  if (fuente !== 'supabase') return vistaFijos(aviso);
  const hoy = ahoraHN().fecha, lista = filas.filter((f) => editableFila(f) && (!f.fecha || f.fecha >= hoy) && (!f.hasta || f.hasta >= hoy) && (f.activo || f.nota === 'bot' || f.cambiada > new Date(Date.now() - 14 * 864e5).toISOString()));
  return {
    texto: `${aviso ? `${aviso}\n\n` : ''}🗓️ <b>Programación</b> (Supabase, la fuente de la verdad)\n<pre>${esc(lista.map(lineaFila).join('\n'))}</pre>\nToca uno para cambiar sus redes o pausarlo. Para la hora: «mueve el debate de las 14:30 a las 15:00 todos los días». También se edita en <a href="${SUPABASE_TABLA}">Supabase</a> → programacion. ⏸️ = pausado.`,
    teclado: { inline_keyboard: [...enFilas(lista.map((f) => boton(`${f.activo ? '' : '⏸️ '}${f.hora} ${NOMBRE_PIEZA[f.pieza] || f.pieza}`, `pg|${f.id}`)), 3), fila(boton('📅 Plan de hoy', `p|${hoy}`))] }
  };
}
async function vistaFila(id, aviso = '') {
  const { filas } = await cargarProgramacion({ fresco: true }), f = filas.find((x) => String(x.id) === String(id));
  if (!f) return vistaProgramacion('⚠️ Ya no encuentro ese renglón.');
  const rs = redesFila(f);
  return {
    texto: `${aviso ? `${aviso}\n\n` : ''}🗓️ <b>${esc(NOMBRE_PIEZA[f.pieza] || f.pieza)}</b> a las ${f.hora}${f.dias?.length ? ` · cada ${f.dias.map((d) => DIAS[d]).join(', ')}` : ' · todos los días'}${f.fecha ? ` · solo el ${f.fecha}` : ''}${f.hasta ? ` · hasta el ${f.hasta}` : ''}\n${f.activo ? '▶️ Activo' : '⏸️ Pausado'} · redes: ${esc(nombresRedes(redesDeFila(f))) || 'ninguna'}\n\nToca una red para ponerla (✅) o quitarla (▫️). Es para siempre; lo de un solo día se cambia en el plan del día.`,
    teclado: { inline_keyboard: [...enFilas(rs.map((r) => boton(`${f[r] ? '✅' : '▫️'} ${RED_LARGO[r]}`, `pt|${f.id}|${r}`)), 2), fila(boton(f.activo ? '⏸️ Pausar' : '▶️ Activar', `pa|${f.id}`), boton('⬅️ Programación', 'fj'))] }
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
    fila(opsDia.length ? boton('↩️ Deshacer', `u|${fecha}`) : null, boton('🗓️ Programación', 'fj'), boton('🎬 Videos', 'vp')),
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
  teclado.push(fila(boton('🔄 Actualizar noticias', 'nr'), boton('🗂️ Ya salieron', 'ny')));
  teclado.push(fila(ops.some((o) => o.t.startsWith('noticia')) ? boton('↩️ Deshacer', `u|${hoy}|n`) : null, boton('📅 Plan de hoy', `p|${hoy}`)));
  const cuando = at ? `\n🕒 Juntadas a las ${new Date(at).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Tegucigalpa' })}` : '';
  return { texto: `${aviso ? `${aviso}\n\n` : ''}${mensajeNoticias(lista, { horaReel })}${cuando}\n\n👇 ❌ quita una noticia del Reel; 📌 mete una de las de reserva; 🔄 trae las más recientes. Para agregar una tuya, pega el enlace.`, teclado: { inline_keyboard: teclado } };
}
// Lo que ya salió (y lo que quitaste) según la base de noticias, de lo más nuevo a lo más viejo
async function vistaYaSalieron() {
  const r = (await recientesDb(7)).slice(0, 20), hoy = ahoraHN().fecha;
  const FORMATO = { reel: '🎬 Reel', imagen: '🖼️ Imagen', carrusel: '🗂️ Carrusel' };
  const cuando = (x) => new Date(x.publicada_el || x.creada).toLocaleString('es-HN', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Tegucigalpa' });
  const lineas = r.map((x) => x.estado === 'descartada' ? `🚫 <s>${esc(x.titulo.slice(0, 90))}</s> (la quitaste)` : `✅ <b>${esc(x.titulo.slice(0, 90))}</b>\n${cuando(x)} · ${FORMATO[x.formato] || x.formato || ''} · ${(x.redes || []).map((y) => RED[y] || y).join(' ')} · ${esc(x.medio || '')}`);
  return {
    texto: `🗂️ <b>Noticias que ya salieron</b> (últimos 7 días)\nNo vuelven a salir, ni la misma historia contada por otro medio.\n\n${lineas.length ? lineas.join('\n\n') : 'Todavía no hay nada guardado: se llena con el próximo Reel o imagen de noticias.'}`,
    teclado: { inline_keyboard: [fila(boton('📰 Noticias de hoy', 'n'), boton('📅 Plan de hoy', `p|${hoy}`))] }
  };
}
// Junta las noticias ahora mismo (RSS, unos segundos) y las deja como las del día
async function actualizarNoticias() {
  // Sin lo publicado o descartado en la base (Supabase)
  const enDb = await yaSalieronDb(10), hoy = ahoraHN().fecha, items = await juntarNoticias({ yaSalieron: enDb.titulos, vistos: enDb.links });
  await guardarCandidatas(items);
  if (items.length < 3) throw new Error('los medios no devolvieron noticias nuevas; prueba en unos minutos');
  await guardarNoticias(hoy, items);
  return { at: Date.now(), items };
}
// Las de hoy, actualizadas si tienen más de «minutos»
async function noticiasFrescas(minutos = 60) {
  const g = await noticiasGuardadas(ahoraHN().fecha);
  return g.items.length >= 3 && Date.now() - g.at < minutos * 60e3 ? null : actualizarNoticias().catch(() => null);
}

// ---------- ideas (formato «Idea»): de una idea a un video, sin IA (scripts/lib/constructor.mjs) ----------
const PIDE_IDEA = '💡 ¿De qué quieres el video?';
const CICLO = ['foco', 'gente', 'globo', 'linea', 'torre', 'lluvia', 'pila'];
// Cambiar la escena de un dato: se arma de nuevo con lo que esa escena necesita
function conEscena(o, tipo) {
  const base = escenaDe(o.texto), anio = +(o.texto.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/)?.[1] || 2000), objeto = o.objeto || base.objeto || 'libro';
  const extra = { foco: { objeto, cantidad: 1 }, gente: { cantidad: 24 }, globo: { modo: 'luces' }, linea: { hitos: base.hitos || [{ anio, texto: o.texto.split(' ').slice(0, 4).join(' ') }] }, torre: { objeto, referencia: 'everest' }, lluvia: { objeto, cantidad: 120 }, pila: { objeto, cantidad: 150 } }[tipo] || {};
  return { texto: o.texto, orden: o.orden, puntaje: o.puntaje, usar: o.usar, tipo, ...extra, ...(o.contador && ['globo', 'lluvia', 'foco', 'pila'].includes(tipo) ? { contador: o.contador } : {}) };
}
async function crearIdea(texto, articulo) {
  const b = await construir(articulo || texto), id = Date.now().toString(36).slice(-6);
  await guardarIdea(id, { idea: texto, tema: b.tema, url: b.url, opciones: b.opciones, otros: b.otros, estado: 'borrador' });
  return vistaIdea(await leerIdea(id) || { ...b, id, idea: texto, estado: 'borrador' });
}
function vistaIdea(b) {
  const lista = b.opciones.slice(0, 10), usados = lista.filter((o) => o.usar).length;
  const plantilla = /dalton|color|vision|ojo|vista|ceguera/.test(`${b.idea} ${b.tema}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) ? '\n🎨 Este tema suma solas la escena «Así lo ve» (daltonismo) y la prueba de puntos.' : '';
  const texto = `💡 <b>${esc(b.tema)}</b> · <a href="${esc(b.url)}">Wikipedia</a>\nDe tu idea «${esc(b.idea)}». Van ${usados} datos (entre 3 y 6 queda bien; el video dura ~1 min).${plantilla}\n\n${lista.map((o, i) => `${o.usar ? '✅' : '▫️'} <b>${i + 1}.</b> [${NOMBRE_ESCENA[o.tipo] || o.tipo}] ${esc(o.texto)}`).join('\n\n')}\n\n👇 ✅/▫️ pone o quita un dato · 🔄 cambia su escena.`;
  const teclado = [...lista.map((o, i) => fila(boton(`${o.usar ? '✅' : '▫️'} ${i + 1}`, `it|${b.id}|${i}`), boton(`🔄 ${i + 1}: ${NOMBRE_ESCENA[o.tipo] || o.tipo}`, `ie|${b.id}|${i}`))),
    fila(boton('▶️ Generar video', `ig|${b.id}`)), fila(b.otros?.length ? boton(`🔎 Otro artículo: ${b.otros[0]}`.slice(0, 60), `io|${b.id}`) : null, boton('🗑️ Descartar', `ix|${b.id}`))];
  return { texto, teclado: { inline_keyboard: teclado } };
}
// Un guion que mandaste (hecho con otra IA): lo que trae y sus avisos
function vistaGuion(b, avisos = []) {
  const g = b.guion;
  const texto = `📜 <b>${esc(g.titulo)}</b> · ${g.escenas.length} escenas · ${g.fuentes?.length || 0} fuentes\n\n${g.escenas.map((e, i) => `<b>${i + 1}.</b> [${esc(e.tipo)}] ${esc((e.texto || '').slice(0, 140))}`).join('\n')}${avisos.length ? `\n\n⚠️ Revisa:\n${avisos.map((x) => `• ${esc(x)}`).join('\n')}` : ''}\n\n¿Lo genero?`;
  return { texto, teclado: { inline_keyboard: [fila(boton('▶️ Generar video', `ig|${b.id}`), boton('🗑️ Descartar', `ix|${b.id}`))] } };
}
// Recibe un guion (texto o archivo): lo revisa y, si está bien, lo deja como borrador
async function recibirGuion(contenido) {
  const r = validar(contenido);
  if (!r.ok) return { texto: `⚠️ El guion tiene problemas:\n${r.errores.map((x) => `• ${esc(x)}`).join('\n')}${r.avisos.length ? `\n\nAdemás:\n${r.avisos.map((x) => `• ${esc(x)}`).join('\n')}` : ''}\n\nCorrígelo (o pídele a la IA que lo corrija) y mándalo otra vez.`, teclado: MENU };
  const id = Date.now().toString(36).slice(-6), b = await guardarIdea(id, { idea: r.guion.titulo, tema: r.guion.titulo, url: r.guion.fuentes.find((x) => x.url)?.url || '', guion: r.guion, estado: 'borrador', manual: true });
  return vistaGuion(b, r.avisos);
}
async function alIdea(c, a) {
  const b = await leerIdea(a[0]);
  if (!b) return { texto: '⚠️ Ya no encuentro esa idea: manda otra con «💡 Idea».', teclado: MENU };
  if (c === 'iv') return b.manual ? vistaGuion(b) : vistaIdea(b);
  if (c === 'it') { b.opciones[+a[1]].usar = !b.opciones[+a[1]].usar; await guardarIdea(b.id, b); return vistaIdea(b); }
  if (c === 'ie') { const o = b.opciones[+a[1]], sig = CICLO[(CICLO.indexOf(o.tipo) + 1) % CICLO.length]; b.opciones[+a[1]] = conEscena(o, sig); await guardarIdea(b.id, b); return vistaIdea(b); }
  if (c === 'io') { const [otro, ...resto] = b.otros || []; if (!otro) return vistaIdea(b); const v = await crearIdea(b.idea, otro); return v; }
  if (c === 'ix') { await guardarIdea(b.id, { ...b, estado: 'descartado' }); return { texto: `🗑️ Descarté la idea «${esc(b.idea)}».`, teclado: MENU, confirmacion: '🗑️ Idea descartada.' }; }
  if (c === 'ig') {
    const n = b.manual ? b.guion.escenas.length : b.opciones.filter((o) => o.usar).length;
    if (!b.manual && n < 2) return { ...vistaIdea(b), confirmacion: '⚠️ Elige al menos 2 datos antes de generar el video.' };
    await guardarIdea(b.id, { ...b, estado: 'generando' });
    await lanzar('ideas.yml', { modo: 'render', id: b.id });
    return { texto: `🎬 Generando «${esc(b.tema)}» con ${n} ${b.manual ? 'escenas' : 'datos'}. Va en su propia cola (no frena las publicaciones) y tarda unos 40-55 min: te mando el video por aquí para que lo apruebes.`, teclado: MENU, confirmacion: '🎬 Video en camino.' };
  }
  // Publicar: elegir redes y confirmar (ip → ipr|id|redes → ipx|id|redes)
  if (c === 'ip' || c === 'ipr') {
    if (!b.video) return { texto: '⚠️ Ese video todavía no está listo.', teclado: MENU };
    const sel = c === 'ipr' ? decR(a[1]) : ['fb', 'ig', 'tt', 'yt'];
    return { texto: `✅ ¿Dónde publico «${esc(b.guion?.titulo || b.tema)}»?\nOjo: en Facebook solo rinden los primeros ~6 Reels del día.`, teclado: { inline_keyboard: tecladoRedes('debate', sel, `ipr|${b.id}`, `ipx|${b.id}`, '🚀 Publicar', `iv|${b.id}`) } };
  }
  if (c === 'ipx') {
    const rs = decR(a[1]); if (!rs.length) return alIdea('ip', [b.id]);
    const { corridas } = await diaConEstado(new Date());
    if (corridas.some((x) => ACTIVO.includes(x.estado) && x.estado !== 'in_progress')) return { texto: '⏳ Hay otra corrida esperando en GitHub; prueba de nuevo en unos minutos (si lanzo otra, la cancelaría).', teclado: { inline_keyboard: [fila(boton('🔁 Intentar de nuevo', `ipx|${b.id}|${codR(rs)}`))] } };
    await lanzar('ideas.yml', { modo: 'publicar', id: b.id, redes: rs.join(',') });
    return { texto: `🚀 Publicando «${esc(b.guion?.titulo || b.tema)}» en ${esc(nombresRedes(rs))}. Te aviso cuando quede (con sus fuentes).`, teclado: MENU, confirmacion: '🚀 Publicando.' };
  }
  return vistaIdea(b);
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
      return conConfirmacion(await vistaPlan(fecha), `${NOMBRE_PIEZA[pieza]} a las ${larga(hhmm)}${donde} queda en la programación: ${alcance === 's' ? `cada ${DIAS[diaSemana(fecha)]}` : 'todos los días'} (🔁). Se cambia en «🗓️ Programación».`);
    }
    case 'fj': return vistaProgramacion();
    case 'pg': return vistaFila(a[0]);
    // pt|id|red: pone o quita esa red del renglón · pa|id: pausa o activa el renglón
    case 'pt': case 'pa': {
      const { filas } = await cargarProgramacion({ fresco: true }), x = filas.find((y) => String(y.id) === a[0]);
      if (!x) return vistaProgramacion('⚠️ Ya no encuentro ese renglón.');
      const cambios = c === 'pa' ? { activo: !x.activo } : { [a[1]]: !x[a[1]] };
      await cambiarFila(x.id, cambios);
      return vistaFila(x.id, c === 'pa' ? (x.activo ? '⏸️ Pausado: deja de salir desde hoy.' : '▶️ Activo otra vez.') : `✅ ${RED_LARGO[a[1]]}: ${x[a[1]] ? 'ya no va' : 'ahora sí va'}.`);
    }
    // Migrar la programación a Supabase (una sola vez): mg = ver qué se haría · mg2 = hacerlo
    case 'mg': {
      const r = await migrarProgramacion({ probar: true });
      if (r.ya) return vistaProgramacion(`La programación ya está en Supabase (${r.filas} renglones).`);
      return { texto: `🗄️ <b>Pasar la programación a Supabase</b>\n• ${r.filas} renglones (${r.slots} activos), con ${r.fijos} cambio(s) fijo(s) ya aplicados${r.sinAplicar.length ? ` · ${r.sinAplicar.length} que no se pueden pasar (${esc(r.sinAplicar.map((o) => o.t).join(', '))})` : ''}\n• Cambios de días que vienen: ${r.dias.length ? esc(r.dias.map(([k, n]) => `${k} (${n})`).join(', ')) : 'ninguno'}\n\nDesde ahí, Supabase manda: el relojero y este bot leen la tabla.`, teclado: { inline_keyboard: [fila(boton('✅ Pasar ahora', 'mg2'), boton('No', `p|${ahoraHN().fecha}`))] } };
    }
    case 'mg2': { const r = await migrarProgramacion(); return vistaProgramacion(r.ya ? 'Ya estaba en Supabase.' : `✅ Listo: ${r.filas} renglones en Supabase.`); }
    case 'vp': return vistaVideos();
    case 'vf': return vistaFuentes();
    case 'vl': return vistaGenerados(a[0]);
    case 'vr': return vistaReenvio(a[0]);
    case 'vs': return vistaReenvio(a[0], decR(a[1]));
    case 'vy': { const rs = decR(a[1]); return rs.length ? reenviar(a[0], rs) : vistaReenvio(a[0], []); }
    case 'i0': if (!IDEAS) return { texto: 'Los videos desde una idea están apagados por ahora: pídeselos a Claude.', teclado: MENU };
      return { texto: `${PIDE_IDEA}\nEscribe el tema (por ejemplo: daltonismo, agujeros negros, el café, las abejas) y armo el guion con datos de Wikipedia.\n\n¿Prefieres escribirlo con otra IA (ChatGPT…)? Escribe «formato»: te mando lo que necesita saber, y luego me pegas o mandas el guion que te dé.`, teclado: { force_reply: true, input_field_placeholder: 'Ej: daltonismo' } };
    case 'if': {
      if (!IDEAS) return { texto: 'Los videos desde una idea están apagados por ahora: pídeselos a Claude.', teclado: MENU };
      const ok = await tgDocumento('formato-guion-potterplay.txt', textoFormato(), { caption: `📋 <b>Formato para IA</b>\n1. Pásale este archivo (o su texto) a ChatGPT u otra IA y escribe tu tema al final.\n2. Pégame aquí el JSON que te devuelva (o mándalo como archivo .json/.txt si es largo).\n3. Lo reviso y lo genero con las ${Object.keys(ESPEC).length} escenas del generador.` });
      return { texto: ok ? '📋 Te mandé el formato. Cuando tengas el guion, pégamelo aquí.' : '⚠️ No pude mandarte el archivo del formato.', teclado: MENU };
    }
    case 'iv': case 'it': case 'ie': case 'io': case 'ix': case 'ig': case 'ip': case 'ipr': case 'ipx': return alIdea(c, a);
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
    case 'ny': return vistaYaSalieron();
    case 'nr': { const g = await actualizarNoticias(); return conConfirmacion(await vistaNoticias('', g), `Actualicé las noticias: ${g.items.length} recientes (las ✅ van en el Reel).`, '🔄'); }
    case 'nx': case 'nf': {
      const hoy = ahoraHN().fecha, n = (await noticiasDe(hoy))[+a[0] - 1];
      if (!n) return vistaNoticias('⚠️ Esa noticia ya no está en la lista.');
      await registrar(hoy, { t: c === 'nx' ? 'noticia-fuera' : 'noticia-fija', link: n.link });
      if (c === 'nx') await descartarNoticia(n.link); // y no vuelve a salir otro día
      return conConfirmacion(await vistaNoticias(), `${c === 'nx' ? 'Quité' : 'Metí en el Reel'} la noticia ${a[0]}.`);
    }
    default: return vistaPlan(ahoraHN().fecha);
  }
}

// ---------- texto escrito ----------
const ATAJOS = { ...(IDEAS ? { 'formato': 'if', '/formato': 'if', 'formato para ia': 'if', '💡 idea': 'i0', 'idea': 'i0', '/idea': 'i0' } : {}), '📅 plan de hoy': 'p|hoy', '📅 plan de manana': 'p|manana', '📰 noticias': 'n', '🚀 publicar ya': 'l', '🎬 videos': 'vp', 'videos': 'vp', '/videos': 'vp', 'migrar programacion': 'mg', 'pocas vistas': 'vl|b', 'reenviar': 'vl|b', 'generados': 'vl|t', '/migrar': 'mg', 'programacion': 'fj', '/programacion': 'fj', '🗓️ programacion': 'fj', 'fuentes': 'vf', '/fuentes': 'vf' };
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
    // Un guion hecho con otra IA: JSON pegado (con "escenas") o un archivo .json/.txt
    const doc = !cb && m.document && /\.(json|txt)$/i.test(m.document.file_name || '') ? m.document : null;
    if (IDEAS && (doc || (!cb && m.text && /"escenas"\s*:/.test(m.text)))) {
      const contenido = doc ? await tgLeerArchivo(doc.file_id) : m.text;
      const v = await recibirGuion(contenido);
      enviado = await telegram(v.texto, { chat, teclado: v.teclado });
      return json({ ok: true, motivo: 'guion', enviado });
    }
    // Una idea nueva: «idea: daltonismo» o la respuesta a «💡 ¿De qué quieres el video?»
    const idea = IDEAS && !cb && m.text ? (m.text.match(/^\s*idea\s*:\s*(.+)$/is)?.[1] || ((m.reply_to_message?.text || '').startsWith(PIDE_IDEA) ? m.text : null)) : null;
    if (idea) {
      await telegram('🔎 Busco datos en Wikipedia y armo el guion…', { chat });
      const v = await crearIdea(idea.trim().slice(0, 80)).catch((e) => ({ texto: `⚠️ ${esc(e.message)}. Prueba con otras palabras.`, teclado: MENU }));
      enviado = await telegram(v.texto, { chat, teclado: v.teclado });
      return json({ ok: true, motivo: 'idea', enviado });
    }
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
      if (acc === 's') {
        const texto = (m.text || '').match(/Respuesta sugerida[^\n]*\n«([\s\S]+?)»/)?.[1];
        if (!texto) { enviado = await telegram('⚠️ No encontré la respuesta sugerida en el mensaje: respóndelo con tu texto.', { chat }); return json({ ok: true, motivo: 'sin-sugerencia', enviado }); }
        await encolarComentario({ accion: 'responder', red, id, texto });
        const ya = await lanzarComentarios();
        enviado = await editarMensaje(chat, m.message_id, `${esc(m.text || '')}\n\n<b>📝 Publico la sugerida${ya ? ' en unos minutos' : ' en la próxima vuelta'}.</b>`);
        return json({ ok: true, motivo: 'sugerida', enviado });
      }
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
