// Control por Telegram: los cambios que mandas al bot (api/telegram.js) para un día (quitar, mover o cambiar una
// publicación, agregar otra, pausar el día, quitar o fijar noticias…) se guardan en el almacén Blob de Vercel.
//   control/<id>/ops/<fecha>/<ms>.json   un archivo por cambio (no se sobrescribe nunca: siempre se lee el último)
//   control/<id>/dias/<fecha>.json      los cambios vigentes del día, ya resueltos (lo lee el relojero cada 10 min)
//   control/<id>/noticias/<fecha>.json  las noticias candidatas del día, numeradas (las deja scripts/noticias.mjs)
// <id> sale del token del bot (secreto): nadie que no lo tenga puede adivinar las rutas. Lo usan Vercel (relojero, panel
// y bot) y GitHub Actions (noticias y Reels), así que no usa el disco.
import crypto from 'node:crypto';
import { put, list, del } from '@vercel/blob';

export const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN
  || Object.entries(process.env).find(([k, v]) => k.endsWith('_READ_WRITE_TOKEN') && String(v).startsWith('vercel_blob_rw_'))?.[1];
export const controlListo = () => !!(blobToken() && process.env.TELEGRAM_BOT_TOKEN);
const carpeta = () => `control/${crypto.createHash('sha256').update(`potter-control:${process.env.TELEGRAM_BOT_TOKEN}`).digest('hex').slice(0, 24)}`;
// URL pública fija de una ruta (vercel_blob_rw_<almacén>_<secreto>)
const urlDe = (p) => `https://${blobToken().split('_')[3].toLowerCase()}.public.blob.vercel-storage.com/${p}`;

async function leerJson(p) {
  if (!controlListo()) return null;
  try { const r = await fetch(`${urlDe(p)}?v=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) }); return r.ok ? await r.json() : null; } catch { return null; }
}
async function guardarJson(p, data, { fijo = true } = {}) {
  return put(p, JSON.stringify(data), { access: 'public', token: blobToken(), addRandomSuffix: !fijo, allowOverwrite: fijo, cacheControlMaxAge: 60, contentType: 'application/json' });
}

// ---------- cambios de un día ----------
// Cada cambio: { t: 'quitar'|'mover'|'cambiar'|'agregar'|'pausa'|'reanudar'|'noticia-fuera'|'noticia-fija'|'noticia-propia'|'deshacer', … }
// «deshacer» anula el cambio anterior que siga vigente
export function resolver(ops) {
  const out = [];
  for (const op of ops) {
    if (op.t === 'deshacer') out.pop();
    else if (op.t === 'borrar') { const i = out.findIndex((x) => x.id === op.id); if (i >= 0) out.splice(i, 1); }
    else if (op.t === 'reanudar-pausa') { for (let i = out.length - 1; i >= 0; i--) if (out[i].t === 'pausa') out.splice(i, 1); }
    else out.push(op);
  }
  return out;
}
// La programación fija («todos los días» o «cada viernes») se guarda igual que un día más, con la clave FIJO; sus
// cambios llevan «id» (para borrarlos con { t: 'borrar', id }) y, si son semanales, «dias» (0 = domingo … 6 = sábado).
export const FIJO = 'fijo';
const hoyHN = () => new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
// Todo lo vigente, leyendo cada cambio (exacto; lo usa el bot antes de escribir): { fijos: [...], dias: { fecha: [...] } }
export async function estadoExacto() {
  if (!controlListo()) return { fijos: [], dias: {} };
  const blobs = []; let cursor;
  do { const r = await list({ prefix: `${carpeta()}/ops/`, token: blobToken(), cursor }); blobs.push(...r.blobs); cursor = r.hasMore ? r.cursor : undefined; } while (cursor);
  const porClave = {};
  const leidos = await Promise.all(blobs.sort((a, b) => a.pathname.localeCompare(b.pathname)).map(async (b) => [b.pathname.split('/ops/')[1].split('/')[0], await fetch(b.url, { cache: 'no-store' }).then((r) => r.json()).catch(() => null)]));
  for (const [clave, op] of leidos) if (op) (porClave[clave] ||= []).push(op);
  const dias = {};
  for (const [clave, ops] of Object.entries(porClave)) if (clave !== FIJO) dias[clave] = resolver(ops);
  return { fijos: resolver(porClave[FIJO] || []), dias };
}
const juntar = (e, fecha) => [...(e.fijos || []), ...(e.dias?.[fecha] || [])];
export async function cambiosExactos(fecha) { return juntar(await estadoExacto(), fecha); }
// Lo vigente de una fecha (rápido: un solo archivo para el relojero; un cambio recién hecho tarda hasta un minuto)
export async function cambiosDe(fecha) {
  const e = await leerJson(`${carpeta()}/estado.json`);
  if (e) return juntar(e, fecha);
  return (await leerJson(`${carpeta()}/dias/${fecha}.json`))?.ops || []; // formato de antes (hasta el primer cambio nuevo)
}
// Registra un cambio (de una fecha o de la programación fija) y deja el resumen al corriente; devuelve lo vigente
export async function registrar(clave, op) {
  await guardarJson(`${carpeta()}/ops/${clave}/${String(Date.now()).padStart(15, '0')}.json`, { ...op, at: new Date().toISOString() }, { fijo: false });
  const e = await estadoExacto(), ayer = new Date(Date.now() - 30 * 3600e3).toISOString().slice(0, 10);
  // En el resumen solo van la programación fija y los días de ayer en adelante
  await guardarJson(`${carpeta()}/estado.json`, { fijos: e.fijos, dias: Object.fromEntries(Object.entries(e.dias).filter(([f]) => f >= ayer)) });
  return clave === FIJO ? e.fijos : juntar(e, clave);
}
export const nuevoId = () => Date.now().toString(36).slice(-6);
export { hoyHN as hoyControl };
// Borra lo de hace más de 7 días (lo llama scripts/noticias.mjs una vez al día)
export async function limpiarViejos() {
  if (!controlListo()) return;
  const limite = new Date(Date.now() - 7 * 864e5 - 6 * 3600e3).toISOString().slice(0, 10), viejos = [];
  let cursor;
  do {
    const r = await list({ prefix: `${carpeta()}/`, token: blobToken(), cursor });
    for (const b of r.blobs) { const f = b.pathname.match(/\/(\d{4}-\d{2}-\d{2})(\/|\.json)/)?.[1]; if (f && f < limite) viejos.push(b.url); }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  if (viejos.length) await del(viejos, { token: blobToken() });
}

// ---------- noticias del día ----------
// Cada vez que se juntan (6:23, el botón «Actualizar» del bot o el Reel si la lista es vieja) queda un archivo nuevo;
// se lee siempre el último (archivos que no se sobrescriben: nunca llega una copia vieja de la caché)
export async function guardarNoticias(fecha, items) {
  if (!controlListo()) return;
  const r = await guardarJson(`${carpeta()}/noticias/${fecha}/${String(Date.now()).padStart(15, '0')}.json`, { fecha, at: Date.now(), items }, { fijo: false });
  // Las versiones anteriores del mismo día sobran
  const { blobs } = await list({ prefix: `${carpeta()}/noticias/${fecha}`, token: blobToken() });
  const viejos = blobs.filter((b) => b.url !== r.url).map((b) => b.url);
  if (viejos.length) await del(viejos, { token: blobToken() }).catch(() => {});
}
// { at, items } de la última vez que se juntaron ese día (at = 0 si es del formato de antes)
export async function noticiasGuardadas(fecha) {
  if (!controlListo()) return { at: 0, items: [] };
  const { blobs } = await list({ prefix: `${carpeta()}/noticias/${fecha}`, token: blobToken() });
  const b = blobs.sort((x, y) => Date.parse(y.uploadedAt) - Date.parse(x.uploadedAt))[0];
  if (!b) return { at: 0, items: [] };
  const d = await fetch(b.url, { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
  return { at: d?.at || Date.parse(b.uploadedAt) || 0, items: d?.items || [] };
}
export async function noticiasDe(fecha) { return (await noticiasGuardadas(fecha)).items; }
// Las candidatas con tus cambios: primero las que agregaste, luego las fijadas y después el resto en su orden, sin las
// que quitaste. «num» es el número con que salen en Telegram (el de la lista de la mañana)
export function noticiasConCambios(items, ops = []) {
  const fuera = new Set(ops.filter((o) => o.t === 'noticia-fuera').map((o) => o.link));
  const fijas = ops.filter((o) => o.t === 'noticia-fija').map((o) => o.link);
  const propias = ops.filter((o) => o.t === 'noticia-propia').map((o) => o.noticia).filter((n) => !fuera.has(n.link));
  const base = items.map((n, i) => ({ ...n, num: i + 1 })).filter((n) => !fuera.has(n.link));
  const arriba = fijas.map((l) => base.find((n) => n.link === l)).filter(Boolean);
  return [...propias, ...arriba, ...base.filter((n) => !arriba.includes(n))];
}

// ---------- ideas (formato «Idea»): el borrador que armas en el bot y su video ----------
// Cada cambio es un archivo nuevo (control/<id>/ideas/<idea>/<ms>.json) y se lee el último: tocar varios botones seguidos
// no pisa nada (los archivos fijos tardan hasta un minuto en verse por la caché)
export async function guardarIdea(id, data) {
  if (!controlListo()) throw new Error('Falta el almacén o el token del bot');
  const r = await guardarJson(`${carpeta()}/ideas/${id}/${String(Date.now()).padStart(15, '0')}.json`, { ...data, id, at: Date.now() }, { fijo: false });
  const { blobs } = await list({ prefix: `${carpeta()}/ideas/${id}/`, token: blobToken() });
  const viejos = blobs.filter((b) => b.url !== r.url).map((b) => b.url);
  if (viejos.length) await del(viejos, { token: blobToken() }).catch(() => {});
  return { ...data, id };
}
export async function leerIdea(id) {
  if (!controlListo()) return null;
  const { blobs } = await list({ prefix: `${carpeta()}/ideas/${id}/`, token: blobToken() });
  const b = blobs.sort((x, y) => y.pathname.localeCompare(x.pathname))[0];
  return b ? fetch(b.url, { cache: 'no-store' }).then((r) => r.json()).catch(() => null) : null;
}

// ---------- otros datos para el bot (qué videos vienen…) ----------
export async function guardarControl(nombre, data) { if (controlListo()) await guardarJson(`${carpeta()}/${nombre}.json`, data); }
export async function leerControl(nombre) { return leerJson(`${carpeta()}/${nombre}.json`); }

// ---------- comentarios que contestas tú ----------
// Lo que decides en Telegram sobre un comentario delicado (responder con tu texto, «me gusta», ocultar) queda en
// control/<id>/comentarios/<ms>.json hasta que scripts/comentarios.mjs lo publica y lo borra.
//   { accion: 'responder' | 'like' | 'ocultar', red: 'facebook' | 'instagram', id, texto?, usuario? }
export async function encolarComentario(a) {
  if (!controlListo()) throw new Error('Falta el almacén o el token del bot');
  await guardarJson(`${carpeta()}/comentarios/${String(Date.now()).padStart(15, '0')}.json`, { ...a, at: new Date().toISOString() }, { fijo: false });
}
export async function comentariosEnCola() {
  if (!controlListo()) return [];
  const { blobs } = await list({ prefix: `${carpeta()}/comentarios/`, token: blobToken() });
  const out = await Promise.all(blobs.sort((a, b) => a.pathname.localeCompare(b.pathname)).map(async (b) => ({ ...(await fetch(b.url, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({}))), url: b.url })));
  return out.filter((x) => x.accion && x.id);
}
export async function quitarDeCola(url) { if (controlListo()) await del(url, { token: blobToken() }).catch(() => {}); }

// ---------- Telegram ----------
// Clave que Telegram manda en cada llamada al webhook (sale del token del bot, así no hay otra variable que guardar)
export const secretoWebhook = () => crypto.createHash('sha256').update(`potter-webhook:${process.env.TELEGRAM_BOT_TOKEN}`).digest('hex').slice(0, 48);
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export async function telegram(texto, { chat = process.env.TELEGRAM_CHAT_ID, html = true, teclado } = {}) {
  const tg = process.env.TELEGRAM_BOT_TOKEN; if (!tg || !chat) return false;
  let ok = true;
  // Telegram acepta hasta 4096 caracteres: se corta en saltos de línea, fuera de los bloques <pre>
  const partes = []; let actual = '';
  for (const bloque of texto.split(/\n\n/)) { if ((actual + '\n\n' + bloque).length > 3900 && actual) { partes.push(actual); actual = bloque; } else actual = actual ? `${actual}\n\n${bloque}` : bloque; }
  if (actual) partes.push(actual);
  for (const [i, p] of partes.entries()) {
    // Los botones van en el último trozo
    const r = await tgApi('sendMessage', { chat_id: chat, text: p, parse_mode: html ? 'HTML' : undefined, disable_web_page_preview: true, ...(teclado && i === partes.length - 1 ? { reply_markup: teclado } : {}) });
    if (!r.ok) { ultimoError = r.description || 'sin respuesta'; ok = false; }
  }
  return ok;
}
export let ultimoError = '';
export async function tgApi(metodo, body) {
  const tg = process.env.TELEGRAM_BOT_TOKEN; if (!tg) return { ok: false, description: 'falta TELEGRAM_BOT_TOKEN' };
  return fetch(`https://api.telegram.org/bot${tg}/${metodo}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()).catch((e) => ({ ok: false, description: e.message }));
}
// Manda un archivo de texto (para lo que no cabe en un mensaje, como el formato para IA)
export async function tgDocumento(nombre, contenido, { chat = process.env.TELEGRAM_CHAT_ID, caption = '' } = {}) {
  const tg = process.env.TELEGRAM_BOT_TOKEN; if (!tg || !chat) return false;
  const f = new FormData(); f.set('chat_id', chat); if (caption) { f.set('caption', caption.slice(0, 1000)); f.set('parse_mode', 'HTML'); }
  f.set('document', new Blob([contenido], { type: 'text/plain; charset=utf-8' }), nombre);
  const r = await fetch(`https://api.telegram.org/bot${tg}/sendDocument`, { method: 'POST', body: f }).then((x) => x.json()).catch((e) => ({ ok: false, description: e.message }));
  if (!r.ok) ultimoError = r.description || '';
  return r.ok;
}
// Lo que dice un archivo que te mandaron al bot (un guion .json o .txt)
export async function tgLeerArchivo(fileId) {
  const tg = process.env.TELEGRAM_BOT_TOKEN, r = await tgApi('getFile', { file_id: fileId });
  if (!r.ok) throw new Error(r.description || 'No pude abrir el archivo');
  return (await fetch(`https://api.telegram.org/file/bot${tg}/${r.result.file_path}`)).text();
}
// Cambia un mensaje que ya mandó el bot (al tocar un botón); si es igual al anterior Telegram lo rechaza, y da igual
export async function editarMensaje(chat, id, texto, teclado) {
  const r = await tgApi('editMessageText', { chat_id: chat, message_id: id, text: texto.slice(0, 4090), parse_mode: 'HTML', disable_web_page_preview: true, ...(teclado ? { reply_markup: teclado } : {}) });
  if (!r.ok && !/not modified/.test(r.description || '')) ultimoError = r.description || '';
  return r.ok || /not modified/.test(r.description || '');
}
