// POST /api/telegram: webhook del bot de Telegram (@potteplay_avisos_bot). Todo se puede hacer con BOTONES (el plan
// del día con un botón por publicación → quitar / mover / cambiar; agregar, pausar, deshacer, publicar ya; noticias →
// quitar / fijar) y también escribiendo normal (scripts/lib/bot.mjs). Los cambios se guardan en el almacén Blob
// (scripts/lib/control.mjs) y el relojero los aplica en su siguiente vuelta (≤ 10 min).
// Solo hace caso a TU chat (TELEGRAM_CHAT_ID) y solo acepta llamadas de Telegram (cabecera secreta que se registra con
// npm run telegram:webhook). Variables de Vercel: TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID.
import { json, diaConEstado, lanzar } from './_panel.js';
import { interpretar, AYUDA, mensajePlan, mensajeNoticias, diaBonito } from '../scripts/lib/bot.mjs';
import { cambiosExactos, registrar, noticiasDe, noticiasConCambios, telegram, editarMensaje, tgApi, esc, secretoWebhook, ultimoError } from '../scripts/lib/control.mjs';
import { delDia, ahoraHN, armarSlot, redesDePieza, nombreSlot, editable, NOMBRE_PIEZA, redesDe } from '../scripts/lib/horario.mjs';
import { noticiaDeEnlace, N_REEL } from '../scripts/lib/noticias.mjs';

const dd = (n) => String(n).padStart(2, '0');
const masDias = (fecha, n) => new Date(Date.parse(`${fecha}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const aMin = (h) => +h.slice(0, 2) * 60 + +h.slice(-2);
const deMin = (m) => `${dd(Math.floor(m / 60))}:${dd(m % 60)}`;
const corta = (h) => h.replace(':', ''), larga = (h) => `${h.slice(0, 2)}:${h.slice(2)}`;
const ahoraHHMM = () => deMin(ahoraHN().min);
// Lo que se puede poner en un hueco (los 3D y el video largo se preparan de madrugada)
const PONIBLES = ['banderas', 'retos', 'emojis', 'quiz', 'prefieres', 'comosehace', 'imagen', 'noticias', 'gta', 'nombres', 'famosos'];
const RED = { fb: 'FB', ig: 'IG', tt: 'TT', yt: 'YT' };

// Teclado fijo de abajo: lo que más se usa, sin escribir
export const MENU = { keyboard: [[{ text: '📅 Plan de hoy' }, { text: '📅 Plan de mañana' }], [{ text: '📰 Noticias' }, { text: '🚀 Publicar ya' }], [{ text: '❓ Ayuda' }]], resize_keyboard: true, is_persistent: true };
const fila = (...b) => b.filter(Boolean);
const boton = (text, data) => ({ text, callback_data: data.slice(0, 64) });
const enFilas = (botones, n) => botones.reduce((acc, b, i) => (i % n ? acc[acc.length - 1].push(b) : acc.push([b]), acc), []);

// ---------- vistas: { texto, teclado } ----------
async function datosDia(fecha) {
  const hoy = ahoraHN().fecha, ops = await cambiosExactos(fecha);
  const slots = fecha === hoy ? (await diaConEstado(new Date(), ops)).lista : delDia(fecha, ops);
  return { hoy, ops, slots, esHoy: fecha === hoy };
}
async function vistaPlan(fecha, aviso = '') {
  const { ops, slots, esHoy } = await datosDia(fecha);
  const pausa = ops.some((o) => o.t === 'pausa');
  // Un botón por publicación que todavía no sale
  const futuras = slots.filter((s) => editable(s) && s.workflow !== 'metas.yml' && (!esHoy || !s.estado || s.estado === 'proximo' || s.estado === 'pendiente'));
  const teclado = [
    ...enFilas(futuras.map((s) => boton(`${s.hora} ${nombreSlot(s)}`, `s|${fecha}|${corta(s.hora)}|${s.pieza || ''}`)), 2),
    fila(boton('➕ Agregar', `a|${fecha}`), boton(pausa ? '▶️ Reanudar día' : '⏸️ Pausar día', `pz|${fecha}`)),
    fila(ops.length ? boton('↩️ Deshacer', `u|${fecha}`) : null, esHoy ? boton('📰 Noticias', 'n') : null, boton(esHoy ? '📅 Mañana' : '📅 Hoy', `p|${esHoy ? masDias(fecha, 1) : ahoraHN().fecha}`))
  ].filter((f) => f.length);
  const texto = `${aviso ? `${aviso}\n\n` : ''}${mensajePlan(fecha, slots, { estado: esHoy, ops })}\n\n👇 Toca una publicación para quitarla, moverla o cambiarla.`;
  return { texto, teclado: { inline_keyboard: teclado } };
}
async function vistaSlot(fecha, hhmm, pieza) {
  const { slots } = await datosDia(fecha), hora = larga(hhmm);
  const s = slots.find((x) => x.hora === hora && editable(x) && (!pieza || x.pieza === pieza)) || slots.find((x) => x.hora === hora && editable(x));
  if (!s) return vistaPlan(fecha, '⚠️ Esa publicación ya no está en el plan.');
  if (s.estado === 'hecho' || s.estado === 'en-curso') return vistaPlan(fecha, `⚠️ ${nombreSlot(s)} de las ${hora} ya ${s.estado === 'hecho' ? 'salió' : 'se está haciendo'}.`);
  const k = `${fecha}|${hhmm}|${s.pieza || ''}`;
  return {
    texto: `🎯 <b>${esc(nombreSlot(s))}</b> · ${hora} · ${redesDe(s.workflow, s.inputs).map((r) => RED[r]).join(' ')}\n${esc(diaBonito(fecha))}\n\n¿Qué hago con esta publicación?`,
    teclado: { inline_keyboard: [fila(boton('❌ Quitar', `q|${k}`), boton('🕒 Mover', `mv|${k}`)), fila(boton('🔄 Cambiar por otra', `cb|${k}`)), fila(boton('⬅️ Volver', `p|${fecha}`))] }
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
async function vistaAgregarHora(fecha, pieza) {
  const { slots, esHoy } = await datosDia(fecha), hs = horasPosibles(fecha, slots, { esHoy });
  if (!hs.length) return vistaPlan(fecha, '⚠️ Ya no quedan huecos libres hoy. Escribe la hora: «agrega quiz a las 22:50».');
  return {
    texto: `➕ <b>${esc(NOMBRE_PIEZA[pieza])}</b> en ${redesDePieza(pieza).map((r) => RED[r]).join(' ')}. ¿A qué hora?\nSolo muestro horas libres (a 30 min o más de otra publicación).`,
    teclado: { inline_keyboard: [...enFilas(hs.map((h) => boton(h, `a3|${fecha}|${pieza}|${corta(h)}`)), 4), fila(boton('⬅️ Volver', `a|${fecha}`))] }
  };
}
async function vistaNoticias(aviso = '') {
  const hoy = ahoraHN().fecha, ops = await cambiosExactos(hoy), items = await noticiasDe(hoy), lista = noticiasConCambios(items, ops);
  const slots = delDia(hoy, ops), horaReel = slots.find((s) => s.pieza === 'noticias')?.hora;
  const teclado = lista.slice(0, 8).filter((n) => n.num).map((n, i) => fila(boton(`${i < N_REEL ? '✅' : '▫️'} ${n.num} ❌ Quitar`, `nx|${n.num}`), i < N_REEL ? null : boton(`📌 Usar la ${n.num}`, `nf|${n.num}`)));
  teclado.push(fila(ops.some((o) => o.t.startsWith('noticia')) ? boton('↩️ Deshacer', `u|${hoy}|n`) : null, boton('📅 Plan de hoy', `p|${hoy}`)));
  return { texto: `${aviso ? `${aviso}\n\n` : ''}${mensajeNoticias(lista, { horaReel })}\n\n👇 ❌ quita una noticia del Reel; 📌 mete una de las de reserva. Para agregar una tuya, pega el enlace.`, teclado: { inline_keyboard: teclado } };
}

// ---------- botones ----------
export async function alTocar(data) {
  const [c, ...a] = data.split('|');
  const hecho = async (fecha, op, txt) => { await registrar(fecha, op); return vistaPlan(fecha, `✅ ${txt}`); };
  switch (c) {
    case 'p': return vistaPlan(a[0]);
    case 's': return vistaSlot(a[0], a[1], a[2]);
    case 'q': return hecho(a[0], { t: 'quitar', hora: larga(a[1]), ...(a[2] ? { pieza: a[2] } : {}) }, `Quité ${NOMBRE_PIEZA[a[2]] || 'la publicación'} de las ${larga(a[1])}.`);
    case 'mv': return vistaMover(a[0], a[1], a[2]);
    case 'm': {
      const r = await hecho(a[0], { t: 'mover', hora: larga(a[1]), ...(a[2] ? { pieza: a[2] } : {}), a: larga(a[3]) }, `Moví ${NOMBRE_PIEZA[a[2]] || 'la publicación'} de las ${larga(a[1])} a las ${larga(a[3])}.`);
      return r;
    }
    case 'cb': return vistaPiezas(`🔄 ¿Qué pongo a las ${larga(a[1])} en vez de ${esc(NOMBRE_PIEZA[a[2]] || 'eso')}?`, `c|${a[0]}|${a[1]}`, `s|${a[0]}|${a[1]}|${a[2]}`, a[2]);
    case 'c': return hecho(a[0], { t: 'cambiar', hora: larga(a[1]), pieza: a[2] }, `A las ${larga(a[1])} va ${NOMBRE_PIEZA[a[2]]}.`);
    case 'a': return vistaPiezas('➕ ¿Qué agrego?', `a2|${a[0]}`, `p|${a[0]}`);
    case 'a2': return vistaAgregarHora(a[0], a[1]);
    case 'a3': return hecho(a[0], { t: 'agregar', hora: larga(a[2]), pieza: a[1] }, `Agregué ${NOMBRE_PIEZA[a[1]]} a las ${larga(a[2])}.`);
    case 'pz': {
      const pausado = (await cambiosExactos(a[0])).some((o) => o.t === 'pausa');
      if (pausado) return hecho(a[0], { t: 'reanudar-pausa' }, 'Quité la pausa: todo vuelve a salir.');
      return { texto: `⏸️ ¿Pausar TODAS las publicaciones de ${esc(diaBonito(a[0]))}?\n(Los renders y las respuestas a comentarios siguen.)`, teclado: { inline_keyboard: [fila(boton('Sí, pausar', `pz2|${a[0]}`), boton('No', `p|${a[0]}`))] } };
    }
    case 'pz2': return hecho(a[0], { t: 'pausa' }, 'Día en pausa.');
    case 'u': { await registrar(a[0], { t: 'deshacer' }); return a[1] === 'n' ? vistaNoticias('↩️ Deshice el último cambio.') : vistaPlan(a[0], '↩️ Deshice el último cambio.'); }
    case 'l': return vistaPiezas('🚀 ¿Qué publico ahora mismo? (sale en unos minutos, además de lo del plan)', 'l2', `p|${ahoraHN().fecha}`);
    case 'l2': {
      const s = armarSlot(a[0], ahoraHHMM());
      return { texto: `🚀 ¿Publico <b>${esc(NOMBRE_PIEZA[a[0]])}</b> ya en ${redesDe(s.workflow, s.inputs).map((r) => RED[r]).join(' ')}?`, teclado: { inline_keyboard: [fila(boton('Sí, publicar', `l3|${a[0]}`), boton('No', 'l'))] } };
    }
    case 'l3': {
      const s = armarSlot(a[0], ahoraHHMM()); await lanzar(s.workflow, s.inputs || {});
      return vistaPlan(ahoraHN().fecha, `🚀 Lancé ${NOMBRE_PIEZA[a[0]]}. Tarda unos minutos en salir.`);
    }
    case 'n': return vistaNoticias();
    case 'nx': case 'nf': {
      const hoy = ahoraHN().fecha, n = (await noticiasDe(hoy))[+a[0] - 1];
      if (!n) return vistaNoticias('⚠️ Esa noticia ya no está en la lista.');
      await registrar(hoy, { t: c === 'nx' ? 'noticia-fuera' : 'noticia-fija', link: n.link });
      return vistaNoticias(`✅ ${c === 'nx' ? 'Quité' : 'Metí en el Reel'} la noticia ${a[0]}.`);
    }
    default: return vistaPlan(ahoraHN().fecha);
  }
}

// ---------- texto escrito ----------
const ATAJOS = { '📅 plan de hoy': 'p|hoy', '📅 plan de manana': 'p|manana', '📰 noticias': 'n', '🚀 publicar ya': 'l' };
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
    case 'noticias-op': {
      const items = await noticiasDe(hoy), malas = r.nums.filter((n) => !items[n - 1]);
      if (malas.length) return vistaNoticias(`⚠️ No tengo la noticia ${malas.join(', ')}.`);
      for (const n of r.nums) await registrar(hoy, { t: r.accion === 'fuera' ? 'noticia-fuera' : 'noticia-fija', link: items[n - 1].link });
      return vistaNoticias(`✅ ${r.accion === 'fuera' ? 'Quité' : 'Fijé arriba'} ${r.nums.length > 1 ? 'las noticias' : 'la noticia'} ${r.nums.join(', ')}.`);
    }
    case 'enlace': {
      const n = await noticiaDeEnlace(r.url);
      await registrar(hoy, { t: 'noticia-propia', noticia: n });
      return vistaNoticias(`✅ Agregué «${esc(n.titulo)}» (${esc(n.medio)}). Va primero en el Reel.${n.resumen ? '' : '\nNo traía resumen: si quieres uno, mándala como «noticia: Título | resumen».'}`);
    }
    case 'op': {
      await registrar(fecha, r.op);
      if (r.op.t.startsWith('noticia')) return vistaNoticias(`✅ ${esc(r.resumen)}`);
      const pasado = r.op.t === 'mover' && fecha === hoy && r.op.a <= ahoraHHMM();
      return vistaPlan(fecha, `✅ ${esc(r.resumen)}${pasado ? '\nEsa hora ya pasó: sale en los próximos 10 minutos.' : ''}`);
    }
    case 'lanzar': return alTocar(`l2|${r.pieza}`);
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
    if (cb) {
      await tgApi('answerCallbackQuery', { callback_query_id: cb.id });
      const v = await alTocar(cb.data || '');
      enviado = await editarMensaje(chat, m.message_id, v.texto, v.teclado);
      if (!enviado) enviado = await telegram(v.texto, { chat, teclado: v.teclado });
    } else if (m.text) {
      const v = await atender(m.text);
      enviado = await telegram(v.texto, { chat, teclado: v.teclado });
    }
  } catch (e) { enviado = await telegram(`⚠️ No pude hacerlo: ${esc(e.message)}`, { chat, teclado: MENU }); return json({ ok: true, motivo: 'error', error: e.message, enviado }); }
  return json({ ok: true, motivo: 'atendido', enviado, error: enviado ? undefined : ultimoError });
} };
