#!/usr/bin/env node
// Contesta los comentarios de los retos y quiz de los últimos 3 días en Facebook e Instagram: «¡Correcto! ✅» a quien
// acierta (y en Facebook le da «me gusta»), un ánimo a quien falla y el puntaje a quien lo comparte en los quiz.
// Las respuestas se arman con partes al azar (lib/respuestas.mjs): ninguna se repite en un mismo video y las últimas
// 400 de todos los videos tampoco (data/respuestas-usadas.json, en el estado cifrado).
// Cada comentario se mira una sola vez (data/comentarios-respondidos.json) y no se contesta lo que no es una respuesta.
// Los delicados (dudas, correcciones, temas sensibles…: delicado() en lib/respuestas.mjs) y lo que alguien sigue
// escribiendo debajo de una respuesta de la cuenta NO se contestan solos: llegan por Telegram y los contestas tú
// (respondes al mensaje del bot; api/telegram.js lo deja en la cola y esta corrida lo publica).
// Permisos del token: pages_read_user_content y pages_manage_engagement (Facebook), instagram_manage_comments.
//   node --env-file=.env scripts/comentarios.mjs [--max 25] [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';
import { graph, facebookReady } from './facebook.mjs';
import { instagramReady } from './instagram.mjs';
import { publicacionesRecientes, evaluar, mensaje, firma, inferirClave, comentarioNormal, delicado } from './lib/respuestas.mjs';
import { telegram, esc, comentariosEnCola, quitarDeCola } from './lib/control.mjs';

const o = parseCli({ max: { type: 'string', default: '25' }, 'dry-run': { type: 'boolean', default: false }, diagnostico: { type: 'boolean', default: false } });
const VISTOS = path.join(ROOT, 'data', 'comentarios-respondidos.json');
const vistos = new Set((() => { try { return JSON.parse(fs.readFileSync(VISTOS, 'utf8')); } catch { return []; } })());
const USADAS = path.join(ROOT, 'data', 'respuestas-usadas.json');
const recientes = (() => { try { return JSON.parse(fs.readFileSync(USADAS, 'utf8')); } catch { return []; } })();
// Comentarios que ya te mandé por Telegram (para no repetir el aviso)
const AVISADOS = path.join(ROOT, 'data', 'comentarios-avisados.json');
const avisados = new Set((() => { try { return JSON.parse(fs.readFileSync(AVISADOS, 'utf8')); } catch { return []; } })());
const pausa = () => new Promise((r) => setTimeout(r, 3000 + Math.random() * 3000)); // sin ráfagas: parece menos automático

if (!facebookReady()) { console.log('Faltan FB_PAGE_ID o FB_PAGE_TOKEN'); process.exit(0); }
const page = process.env.FB_PAGE_ID, ig = await instagramReady();
const igUser = ig ? (await graph('GET', `/${ig}`, { fields: 'username' }).catch(() => ({}))).username : null;

// Cada comentario de otra persona, con «respondido» si la cuenta ya le contestó (así nunca se contesta dos veces),
// «usuario» (@usuario en Instagram, nombre de pila en Facebook si la API lo da) y «propias»: lo que la cuenta ya contestó
// en ese hilo, para no repetir frases dentro del mismo video
const pila = (n) => (n || '').trim().split(/\s+/)[0] || null;
async function comentarios(p) {
  if (p.red === 'facebook') {
    const d = await graph('GET', `/${p.id}/comments`, { filter: 'toplevel', limit: 100, fields: 'id,message,permalink_url,from{id,name},created_time,comments.limit(25){id,from{id,name},message,created_time}' });
    return (d.data || []).filter((c) => c.from?.id !== page).map((c) => {
      const hilo = c.comments?.data || [], propias = hilo.filter((r) => r.from?.id === page), ultima = hilo.map((r) => r.from?.id === page).lastIndexOf(true);
      return { id: c.id, texto: c.message || '', usuario: pila(c.from?.name), enlace: c.permalink_url, respondido: propias.length > 0, propias: propias.map((r) => r.message || ''),
        siguen: ultima < 0 ? [] : hilo.slice(ultima + 1).filter((r) => r.from?.id !== page).map((r) => ({ id: r.id, texto: r.message || '', usuario: pila(r.from?.name) })) };
    });
  }
  const d = await graph('GET', `/${p.id}/comments`, { limit: 100, fields: 'id,text,username,timestamp,replies{id,username,text,timestamp}' });
  return (d.data || []).filter((c) => c.username !== igUser).map((c) => {
    const hilo = c.replies?.data || [], propias = hilo.filter((r) => r.username === igUser), ultima = hilo.map((r) => r.username === igUser).lastIndexOf(true);
    return { id: c.id, texto: c.text || '', usuario: c.username ? `@${c.username}` : null, respondido: propias.length > 0, propias: propias.map((r) => r.text || ''),
      siguen: ultima < 0 ? [] : hilo.slice(ultima + 1).filter((r) => r.username !== igUser).map((r) => ({ id: r.id, texto: r.text || '', usuario: r.username ? `@${r.username}` : null })) };
  });
}
async function contestar(p, c, msg, bien) {
  if (p.red === 'facebook') {
    await graph('POST', `/${c.id}/comments`, { message: msg });
    if (bien) await graph('POST', `/${c.id}/likes`).catch(() => {});
  } else await graph('POST', `/${c.id}/replies`, { message: msg });
}

// ---------- lo que decidiste en Telegram (responder, me gusta, ocultar) ----------
const NOMBRE_RED = { facebook: 'Facebook', instagram: 'Instagram' };
if (!o.diagnostico && !o['dry-run']) {
  for (const a of await comentariosEnCola().catch(() => [])) {
    if (a.red === 'instagram' && !ig) continue;
    try {
      if (a.accion === 'responder') await graph('POST', a.red === 'facebook' ? `/${a.id}/comments` : `/${a.id}/replies`, { message: a.texto });
      else if (a.accion === 'like' && a.red === 'facebook') await graph('POST', `/${a.id}/likes`);
      else if (a.accion === 'ocultar') await graph('POST', `/${a.id}`, a.red === 'facebook' ? { is_hidden: 'true' } : { hide: 'true' });
      vistos.add(a.id); avisados.add(a.id);
      await telegram(`✅ ${a.accion === 'responder' ? `Publiqué tu respuesta en ${NOMBRE_RED[a.red]}${a.usuario ? ` a ${esc(a.usuario)}` : ''}:\n«${esc(a.texto)}»` : a.accion === 'like' ? 'Le di «me gusta» al comentario.' : `Oculté el comentario en ${NOMBRE_RED[a.red]}.`}`);
      console.log(`Cola de Telegram: ${a.accion} en ${a.red}`);
    } catch (e) { await telegram(`⚠️ No pude ${a.accion === 'responder' ? 'publicar tu respuesta' : a.accion === 'like' ? 'dar «me gusta»' : 'ocultar el comentario'} en ${NOMBRE_RED[a.red]}: ${esc(e.message.slice(0, 200))}`); }
    await quitarDeCola(a.url);
  }
}
// Te manda un comentario delicado (o la continuación de un hilo) para que lo contestes tú
const enlaces = new Map();
async function enlaceDe(p, c) {
  if (c.enlace) return c.enlace;
  if (p.red === 'instagram') { if (!enlaces.has(p.id)) enlaces.set(p.id, (await graph('GET', `/${p.id}`, { fields: 'permalink' }).catch(() => ({}))).permalink || null); return enlaces.get(p.id); }
  return null;
}
let avisosHoy = 0; // como mucho 6 avisos por corrida (los demás, en la siguiente)
async function avisarDelicado(p, c, { motivo, raiz, sigue }) {
  if (avisosHoy >= 6) return false;
  const enlace = await enlaceDe(p, raiz || c), red = p.red === 'facebook' ? 'fb' : 'ig';
  const texto = `💬 <b>Comentario para que contestes tú</b> (${esc(motivo)})\n📍 ${NOMBRE_RED[p.red]} · ${enlace ? `<a href="${esc(enlace)}">${esc(p.titulo || 'la publicación')}</a>` : esc(p.titulo || 'una publicación')}\n${sigue ? `🧵 Sigue la conversación con ${esc(c.usuario || 'alguien')}. Antes la cuenta le dijo: «${esc((raiz.propias.at(-1) || '').slice(0, 160))}»\n` : ''}👤 ${esc(c.usuario || 'Alguien')}\n«${esc(c.texto.slice(0, 600))}»\n\n↩️ <b>Responde a este mensaje</b> con tu texto y lo publico (en unos minutos).\n🆔 ${red} ${(raiz || c).id}${red === 'ig' && c.usuario ? ` ${c.usuario}` : ''}`;
  const teclado = { inline_keyboard: [[...(p.red === 'facebook' ? [{ text: '👍 Me gusta', callback_data: `cm|l|${red}|${c.id}` }] : []), { text: '🙈 Ocultar', callback_data: `cm|o|${red}|${c.id}` }, { text: '✅ Ignorar', callback_data: 'cm|i' }]] };
  if (await telegram(texto, { teclado })) { avisados.add(c.id); avisosHoy++; return true; }
  return false;
}

// Diagnóstico: cruza las publicaciones recientes de Instagram con las registradas y cuenta qué pasaría con cada
// comentario. Solo números: los registros de Actions son públicos, así que nunca se imprime quién comentó ni qué dijo.
if (o.diagnostico) {
  const reg = publicacionesRecientes(7);
  console.log(`Registradas (7 días): ${reg.length} · Facebook ${reg.filter((x) => x.red === 'facebook').length} · Instagram ${reg.filter((x) => x.red === 'instagram').length}`);
  if (!ig) { console.log('Instagram no disponible'); process.exit(0); }
  const media = await graph('GET', `/${ig}/media`, { limit: 30, fields: 'id,timestamp,comments_count,media_product_type,caption' });
  for (const m of media.data || []) {
    // Lo no registrado se reconoce por su descripción, igual que en la corrida normal
    const r = reg.find((x) => x.red === 'instagram' && x.id === m.id) || { clave: inferirClave(m.caption), inferida: true }, cuenta = {};
    if (m.comments_count) {
      try {
        for (const c of await comentarios({ red: 'instagram', id: m.id })) {
          const v = r ? evaluar(r.clave, c.texto) || (comentarioNormal(c.texto) ? { charla: true } : null) : null;
          const k = !r ? 'sin-registrar' : c.respondido ? 'ya-respondido' : !v ? 'ignorado' : v.charla ? 'charla' : v.puntaje != null ? 'puntaje' : v.bien ? 'bien' : v;
          cuenta[k] = (cuenta[k] || 0) + 1;
        }
      } catch (e) { cuenta.error = e.message.slice(0, 120); }
    }
    console.log(`${m.timestamp.slice(0, 16)} ${m.media_product_type.padEnd(5)} comentarios=${m.comments_count} clave=${r.clave.modo}${r.inferida ? ' (por descripción)' : ''} ${JSON.stringify(cuenta)} «${(m.caption || '').slice(0, 28).replace(/\n/g, ' ')}»`);
  }
  process.exit(0);
}

let hechas = 0, revisados = 0;
const errores = new Map();
// Lo registrado al publicar, más lo de Instagram de los últimos 3 días que no está registrado (publicado antes de que
// existiera el registro): su clave se deduce de la descripción
const publicaciones = publicacionesRecientes(3);
if (ig) {
  const media = await graph('GET', `/${ig}/media`, { limit: 40, fields: 'id,timestamp,comments_count,caption' }).catch(() => ({ data: [] }));
  for (const m of media.data || []) {
    if (!m.comments_count || Date.now() - Date.parse(m.timestamp) > 3 * 864e5 || publicaciones.some((x) => x.id === m.id)) continue;
    publicaciones.push({ red: 'instagram', id: m.id, clave: inferirClave(m.caption), titulo: (m.caption || '').split('\n')[0].slice(0, 40) });
  }
}
for (const p of publicaciones) {
  if (hechas >= +o.max) break;
  if (p.red === 'instagram' && !ig) continue;
  let lista;
  try { lista = await comentarios(p); } catch (e) { errores.set(`${p.red}: leer`, e.message); continue; }
  // Lo ya dicho en este video y lo reciente de todos: la respuesta nueva no puede ser ninguna de esas
  const usadas = new Set([...recientes, ...lista.flatMap((c) => c.propias.map(firma))]);
  for (const c of lista) {
    if (hechas >= +o.max) break;
    // Alguien sigue escribiendo debajo de una respuesta de la cuenta: eso lo contestas tú
    if (!o['dry-run']) for (const r of c.siguen || []) if (!avisados.has(r.id) && comentarioNormal(r.texto)) await avisarDelicado(p, r, { motivo: delicado(r.texto) || 'sigue la conversación', raiz: c, sigue: true });
    // Ya contestado, o ignorado antes y sigue sin ser algo que se conteste (spam, vacío)
    if (c.respondido) continue;
    revisados++;
    // Si no es una respuesta al reto pero es un comentario normal, se agradece igual (más conversación)
    const v = evaluar(p.clave, c.texto) || (comentarioNormal(c.texto) ? { charla: true } : null);
    // Dudas, correcciones, temas delicados…: no se contestan solos, te llegan por Telegram (una vez)
    const motivo = v?.charla ? delicado(c.texto) : null;
    if (motivo) { if (!avisados.has(c.id) && !o['dry-run']) await avisarDelicado(p, c, { motivo }); console.log(`${p.red} · ${p.titulo} → para ti (${motivo})`); continue; }
    const msg = v && mensaje(v, p.clave, { usadas, usuario: c.usuario, contexto: p.titulo });
    if (!msg) { if (!vistos.has(c.id)) vistos.add(c.id); continue; }
    // Sin el texto ni el nombre de quien comentó: los registros son públicos
    console.log(`${p.red} · ${p.titulo} → ${c.usuario ? msg.replace(c.usuario, '[nombre]') : msg}`);
    if (!o['dry-run']) {
      try { await contestar(p, c, msg, v === 'bien' || !!v.bien); hechas++; await pausa(); }
      catch (e) { errores.set(`${p.red}: contestar`, e.message); continue; } // sin permiso: se reintenta en la próxima corrida
    }
    vistos.add(c.id);
    recientes.push(firma(msg));
  }
}
if (!o['dry-run']) {
  fs.writeFileSync(VISTOS, JSON.stringify([...vistos].slice(-5000)) + '\n');
  fs.writeFileSync(USADAS, JSON.stringify(recientes.slice(-400)) + '\n');
  fs.writeFileSync(AVISADOS, JSON.stringify([...avisados].slice(-3000)) + '\n');
}
console.log(`Comentarios nuevos revisados: ${revisados} · respuestas: ${hechas}`);
for (const [k, e] of errores) console.log(`Aviso (${k}): ${e}`);
