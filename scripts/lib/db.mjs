// Base de noticias (Supabase «potter-play», creada desde Vercel el 2026-11-07; tabla public.noticias):
//   candidata  la juntaron las noticias del día (6:23, el botón «Actualizar» del bot o el Reel)
//   publicada  salió en un Reel o en una imagen (con cuándo, en qué formato y en qué redes)
//   descartada la quitaste en el bot
// Lo que ya salió o descartaste no vuelve a salir (ni la misma historia con otro título: scripts/lib/noticias.mjs).
// En Vercel se habla directo con Supabase (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY las puso la integración); en GitHub
// Actions, por /api/datos con una clave que sale del token del bot (así las claves de la base no salen de Vercel).
import crypto from 'node:crypto';

const URL_SB = () => process.env.SUPABASE_URL, KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
export const directo = () => !!(URL_SB() && KEY());
export const claveDatos = () => crypto.createHash('sha256').update(`potter-datos:${process.env.TELEGRAM_BOT_TOKEN}`).digest('hex').slice(0, 48);
const API = () => process.env.DATOS_URL || 'https://circularte.edav-tech.com/api/datos';

async function rest(method, ruta, body, prefer) {
  const r = await fetch(`${URL_SB()}/rest/v1/${ruta}`, {
    method, signal: AbortSignal.timeout(15000),
    headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}`, 'content-type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${txt.slice(0, 200)}`);
  return txt ? JSON.parse(txt) : null;
}
const fila = (n, extra = {}) => ({
  link: n.link, titulo: String(n.titulo).slice(0, 300), resumen: n.resumen || null, medio: n.medio || null, cat: n.cat || null,
  puntaje: n.puntaje ?? null, fecha_noticia: n.fecha ? new Date(n.fecha).toISOString() : null, ...extra
});

// Las operaciones (en Vercel, directo contra Supabase)
export async function opDirecta(accion, d = {}) {
  switch (accion) {
    // Nuevas candidatas (las que ya estaban, incluidas las publicadas, no se tocan)
    case 'candidatas': {
      const items = (d.items || []).filter((n) => n.link && n.titulo && !String(n.link).startsWith('propia:'));
      if (!items.length) return 0;
      await rest('POST', 'noticias?on_conflict=link', items.map((n) => fila(n)), 'resolution=ignore-duplicates,return=minimal');
      return items.length;
    }
    // Salieron: en qué formato (reel, imagen, carrusel) y en qué redes
    case 'publicadas': {
      const items = (d.items || []).filter((n) => n.link && n.titulo);
      if (!items.length) return 0;
      await rest('POST', 'noticias?on_conflict=link', items.map((n) => fila(n, { estado: 'publicada', publicada_el: new Date().toISOString(), formato: d.formato || null, redes: d.redes || null })), 'resolution=merge-duplicates,return=minimal');
      return items.length;
    }
    case 'descartar': {
      if (!d.link) return 0;
      await rest('PATCH', `noticias?link=eq.${encodeURIComponent(d.link)}`, { estado: 'descartada' }, 'return=minimal');
      return 1;
    }
    // Lo publicado o descartado de los últimos «dias» (para no repetir y para mostrarlo en el bot)
    case 'recientes': {
      const desde = new Date(Date.now() - (d.dias || 10) * 864e5).toISOString();
      return rest('GET', `noticias?select=link,titulo,medio,cat,estado,publicada_el,formato,redes,creada&estado=in.(publicada,descartada)&or=(publicada_el.gte.${desde},and(estado.eq.descartada,creada.gte.${desde}))&order=publicada_el.desc.nullslast&limit=300`);
    }
    // ---------- programación (supabase/programacion.sql): la fuente de la verdad de lo que sale y cuándo ----------
    case 'prog-lista': return rest('GET', 'programacion?select=*&order=hora.asc,id.asc');
    case 'prog-insertar': {
      const filas = (d.filas || []).map(filaProg);
      return filas.length ? rest('POST', 'programacion', filas, 'return=representation') : [];
    }
    case 'prog-cambiar': {
      if (!d.id) return null;
      return rest('PATCH', `programacion?id=eq.${+d.id}`, { ...filaProg(d.cambios || {}, true), cambiada: new Date().toISOString() }, 'return=representation');
    }
    // ---------- cambios de un día (los del bot) ----------
    case 'cambios-lista': return rest('GET', `cambios?select=clave,op&clave=gte.${encodeURIComponent(d.desde || '2000-01-01')}&order=id.asc&limit=5000`);
    case 'cambios-agregar': {
      if (!d.clave || !d.op) return null;
      await rest('POST', 'cambios', [{ clave: String(d.clave), op: d.op }], 'return=minimal');
      return 1;
    }
    // ---------- envíos (lo que salió, por red) ----------
    // ¿Ya salió esta huella en esta red en las últimas «horas»? (sin contar los reenvíos que pediste)
    case 'envio-buscar': {
      if (!d.red || !d.huella) return [];
      const desde = new Date(Date.now() - (d.horas || 72) * 3600e3).toISOString();
      return rest('GET', `envios?select=id,red,titulo,post_id,url,creado&red=eq.${d.red}&huella=eq.${encodeURIComponent(d.huella)}&creado=gte.${desde}&limit=5`);
    }
    case 'envio-agregar': {
      const e = d.envio || {};
      if (!e.red) return null;
      await rest('POST', 'envios', [{ red: e.red, huella: e.huella || null, tipo: e.tipo || null, titulo: e.titulo ? String(e.titulo).slice(0, 300) : null, post_id: e.post_id ? String(e.post_id) : null, url: e.url || null, workflow: e.workflow || null, run_id: e.run_id ? String(e.run_id) : null, reenvio: !!e.reenvio }], 'return=minimal');
      return 1;
    }
    case 'envios-lista': {
      const desde = new Date(Date.now() - (d.dias || 7) * 864e5).toISOString();
      return rest('GET', `envios?select=*&creado=gte.${desde}&order=creado.desc&limit=2000`);
    }
    case 'envio-vistas': {
      if (!d.id) return null;
      await rest('PATCH', `envios?id=eq.${+d.id}`, { vistas: Math.round(+d.vistas || 0), vistas_al: new Date().toISOString() }, 'return=minimal');
      return 1;
    }
    // ---------- videos generados ----------
    case 'video-guardar': {
      const v = d.video || {};
      if (!v.huella) return null;
      const r = await rest('POST', 'videos?on_conflict=huella', [{ huella: v.huella, formato: v.formato || null, titulo: v.titulo ? String(v.titulo).slice(0, 300) : null, descripcion: v.descripcion || null, run_id: v.run_id ? String(v.run_id) : null, artefacto: v.artefacto || null, archivo: v.archivo || null, meta: v.meta || null }], 'resolution=ignore-duplicates,return=representation');
      return r?.[0] || null;
    }
    case 'videos-lista': {
      const desde = new Date(Date.now() - (d.dias || 30) * 864e5).toISOString();
      return rest('GET', `videos?select=*&creado=gte.${desde}&order=creado.desc&limit=${Math.min(+d.limite || 200, 500)}`);
    }
    case 'video-de': return d.id ? (await rest('GET', `videos?select=*&id=eq.${+d.id}`))?.[0] || null : null;
    case 'video-vistas': {
      if (!d.id) return null;
      const vistas = d.vistas || {}, total = Object.values(vistas).reduce((a, b) => a + (+b || 0), 0);
      await rest('PATCH', `videos?id=eq.${+d.id}`, { vistas, vistas_total: total, vistas_al: new Date().toISOString() }, 'return=minimal');
      return 1;
    }
    default: throw new Error(`Acción desconocida: ${accion}`);
  }
}
export const ACCIONES = ['candidatas', 'publicadas', 'descartar', 'recientes', 'prog-lista', 'prog-insertar', 'prog-cambiar', 'cambios-lista', 'cambios-agregar', 'envio-buscar', 'envio-agregar', 'envios-lista', 'envio-vistas', 'video-guardar', 'videos-lista', 'video-de', 'video-vistas'];
// Un renglón de «programacion» con solo las columnas que existen (parcial = para un PATCH)
const COLS = ['hora', 'pieza', 'fb', 'ig', 'tt', 'yt', 'dias', 'fecha', 'desde', 'hasta', 'inputs', 'activo', 'nota'];
function filaProg(f, parcial = false) {
  const out = {};
  for (const k of COLS) if (k in f) out[k] = f[k] === undefined ? null : f[k];
  if (!parcial) for (const r of ['fb', 'ig', 'tt', 'yt']) out[r] = !!out[r];
  return out;
}

// Desde cualquier lado: directo si hay claves de Supabase; si no, por /api/datos
export async function db(accion, d = {}) {
  if (directo()) return opDirecta(accion, d);
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  const r = await fetch(API(), { method: 'POST', signal: AbortSignal.timeout(20000), headers: { 'content-type': 'application/json', 'x-potter-datos': claveDatos() }, body: JSON.stringify({ accion, ...d }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(`Base de datos: ${j.error || r.status}`);
  return j.resultado;
}
const avisar = (e) => { console.error(`Aviso: base de datos: ${e.message}`); return null; };
export const guardarCandidatas = (items) => db('candidatas', { items }).catch(avisar);
export const marcarPublicadas = (items, { formato, redes } = {}) => db('publicadas', { items, formato, redes }).catch(avisar);
export const descartarNoticia = (link) => db('descartar', { link }).catch(avisar);
export const recientesDb = async (dias = 10) => (await db('recientes', { dias }).catch(avisar)) || [];
// Para filtrar: enlaces y títulos de lo que ya salió o se descartó
export async function yaSalieronDb(dias = 10) {
  const r = await recientesDb(dias);
  return { links: new Set(r.map((x) => x.link)), titulos: r.map((x) => x.titulo) };
}
