// POST /api/telegram: webhook del bot de Telegram (@potteplay_avisos_bot). Lee lo que le escribes y cambia el plan del
// día o las noticias (scripts/lib/bot.mjs entiende el texto; scripts/lib/control.mjs guarda los cambios, que el relojero
// aplica en su siguiente vuelta). Solo hace caso a TU chat (TELEGRAM_CHAT_ID) y solo acepta llamadas de Telegram (la
// cabecera secreta que se registra con: node --env-file=.env scripts/telegram-webhook.mjs).
// Variables de Vercel: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (más el token del almacén Blob y GITHUB_PANEL_TOKEN, que ya están).
import { json, diaConEstado, lanzar } from './_panel.js';
import { interpretar, AYUDA, mensajePlan, mensajeNoticias } from '../scripts/lib/bot.mjs';
import { cambiosExactos, registrar, noticiasDe, noticiasConCambios, telegram, esc, secretoWebhook } from '../scripts/lib/control.mjs';
import { delDia, ahoraHN, armarSlot, redesDePieza, nombreSlot } from '../scripts/lib/horario.mjs';
import { noticiaDeEnlace } from '../scripts/lib/noticias.mjs';

const masDias = (fecha, n) => new Date(Date.parse(`${fecha}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const horaReel = (slots) => slots.find((s) => s.pieza === 'noticias')?.hora;

export async function atender(texto) {
  const hoy = ahoraHN().fecha, manana = masDias(hoy, 1);
  const opsHoy = await cambiosExactos(hoy);
  const { lista: slotsHoy } = await diaConEstado(new Date(), opsHoy);
  let r = interpretar(texto, { slots: slotsHoy }), opsM;
  if (r.dia === 'manana') { opsM = await cambiosExactos(manana); r = interpretar(texto, { slots: delDia(manana, opsM) }); }
  const fecha = r.dia === 'manana' ? manana : hoy;
  const planDe = async (f, ops) => f === hoy ? mensajePlan(f, (await diaConEstado(new Date(), ops)).lista, { estado: true, ops }) : mensajePlan(f, delDia(f, ops), { ops });
  const listaNoticias = async (ops) => mensajeNoticias(noticiasConCambios(await noticiasDe(hoy), ops), { horaReel: horaReel(slotsHoy) });

  switch (r.tipo) {
    case 'ayuda': return AYUDA;
    case 'plan': return planDe(fecha, fecha === hoy ? opsHoy : opsM);
    case 'noticias': return listaNoticias(opsHoy);
    case 'noticias-op': {
      const items = await noticiasDe(hoy), malas = r.nums.filter((n) => !items[n - 1]);
      if (malas.length) return `No tengo la noticia ${malas.join(', ')}. Escribe «noticias» para ver los números.`;
      let ops = opsHoy;
      for (const n of r.nums) ops = await registrar(hoy, { t: r.accion === 'fuera' ? 'noticia-fuera' : 'noticia-fija', link: items[n - 1].link });
      return `✅ ${r.accion === 'fuera' ? 'Quité' : 'Fijé arriba'} la${r.nums.length > 1 ? 's' : ''} noticia${r.nums.length > 1 ? 's' : ''} ${r.nums.join(', ')}.\n\n${await listaNoticias(ops)}`;
    }
    case 'enlace': {
      const n = await noticiaDeEnlace(r.url);
      const ops = await registrar(hoy, { t: 'noticia-propia', noticia: n });
      return `✅ Agregué «${esc(n.titulo)}» (${esc(n.medio)}). Va primero en el Reel.${n.resumen ? '' : '\nNo traía resumen: si quieres uno, mándala como «noticia: Título | resumen».'}\n\n${await listaNoticias(ops)}`;
    }
    case 'op': {
      const ops = await registrar(fecha, r.op);
      if (r.op.t.startsWith('noticia')) return `✅ ${esc(r.resumen)}\n\n${await listaNoticias(ops)}`;
      const pasado = r.op.t === 'mover' && fecha === hoy && r.op.a <= `${String(Math.floor(ahoraHN().min / 60)).padStart(2, '0')}:${String(ahoraHN().min % 60).padStart(2, '0')}`;
      return `✅ ${esc(r.resumen)}${pasado ? '\nEsa hora ya pasó: sale en los próximos 10 minutos.' : ''}${r.op.t === 'deshacer' && fecha === hoy && !ops.length ? '\nYa no queda ningún cambio para hoy.' : ''}\n\n${await planDe(fecha, ops)}`;
    }
    case 'lanzar': {
      const { min } = ahoraHN(), hora = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
      const s = armarSlot(r.pieza, hora, r.redes || redesDePieza(r.pieza));
      await lanzar(s.workflow, s.inputs || {});
      return `🚀 Lancé ${esc(nombreSlot(s))} ahora (${esc(s.que.split('→')[1]?.trim() || '')}). Tarda unos minutos en salir.`;
    }
    default: return `${esc(r.msg)}${r.ayuda ? `\n\n${AYUDA}` : ''}`;
  }
}

export default { async fetch(request) {
  if (request.method !== 'POST') return json({ ok: true });
  if (!process.env.TELEGRAM_BOT_TOKEN || request.headers.get('x-telegram-bot-api-secret-token') !== secretoWebhook()) return json({ error: 'No autorizado' }, 401);
  const u = await request.json().catch(() => ({}));
  const m = u.message || u.edited_message;
  // Solo tu chat; lo demás se ignora en silencio (Telegram reintenta si no recibe 200)
  if (!m?.text || String(m.chat?.id) !== String(process.env.TELEGRAM_CHAT_ID)) return json({ ok: true });
  try { await telegram(await atender(m.text)); }
  catch (e) { await telegram(`⚠️ No pude hacerlo: ${esc(e.message)}`); }
  return json({ ok: true });
} };
