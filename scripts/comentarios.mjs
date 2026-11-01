#!/usr/bin/env node
// Contesta los comentarios de los retos y quiz de los últimos 3 días en Facebook e Instagram: «¡Correcto! ✅» a quien
// acierta (y en Facebook le da «me gusta»), un ánimo a quien falla y el puntaje a quien lo comparte en los quiz.
// Cada comentario se mira una sola vez (data/comentarios-respondidos.json) y no se contesta lo que no es una respuesta.
// Permisos del token: pages_read_user_content y pages_manage_engagement (Facebook), instagram_manage_comments.
//   node --env-file=.env scripts/comentarios.mjs [--max 25] [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';
import { graph, facebookReady } from './facebook.mjs';
import { instagramReady } from './instagram.mjs';
import { publicacionesRecientes, evaluar, mensaje, inferirClave, comentarioNormal } from './lib/respuestas.mjs';

const o = parseCli({ max: { type: 'string', default: '25' }, 'dry-run': { type: 'boolean', default: false }, diagnostico: { type: 'boolean', default: false } });
const VISTOS = path.join(ROOT, 'data', 'comentarios-respondidos.json');
const vistos = new Set((() => { try { return JSON.parse(fs.readFileSync(VISTOS, 'utf8')); } catch { return []; } })());
const pausa = () => new Promise((r) => setTimeout(r, 3000 + Math.random() * 3000)); // sin ráfagas: parece menos automático

if (!facebookReady()) { console.log('Faltan FB_PAGE_ID o FB_PAGE_TOKEN'); process.exit(0); }
const page = process.env.FB_PAGE_ID, ig = await instagramReady();
const igUser = ig ? (await graph('GET', `/${ig}`, { fields: 'username' }).catch(() => ({}))).username : null;

// Cada comentario de otra persona, con «respondido» si la cuenta ya le contestó (así nunca se contesta dos veces)
async function comentarios(p) {
  if (p.red === 'facebook') {
    const d = await graph('GET', `/${p.id}/comments`, { filter: 'toplevel', limit: 100, fields: 'id,message,from{id},created_time,comments.limit(25){from{id}}' });
    return (d.data || []).filter((c) => c.from?.id !== page).map((c) => ({ id: c.id, texto: c.message || '', respondido: (c.comments?.data || []).some((r) => r.from?.id === page) }));
  }
  const d = await graph('GET', `/${p.id}/comments`, { limit: 100, fields: 'id,text,username,timestamp,replies{username}' });
  return (d.data || []).filter((c) => c.username !== igUser).map((c) => ({ id: c.id, texto: c.text || '', respondido: (c.replies?.data || []).some((r) => r.username === igUser) }));
}
async function contestar(p, c, msg, bien) {
  if (p.red === 'facebook') {
    await graph('POST', `/${c.id}/comments`, { message: msg });
    if (bien) await graph('POST', `/${c.id}/likes`).catch(() => {});
  } else await graph('POST', `/${c.id}/replies`, { message: msg });
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
  for (const c of lista) {
    if (hechas >= +o.max) break;
    // Ya contestado, o ignorado antes y sigue sin ser algo que se conteste (spam, vacío)
    if (c.respondido) continue;
    revisados++;
    // Si no es una respuesta al reto pero es un comentario normal, se agradece igual (más conversación)
    const v = evaluar(p.clave, c.texto) || (comentarioNormal(c.texto) ? { charla: true } : null), msg = v && mensaje(v, p.clave);
    if (!msg) { if (!vistos.has(c.id)) vistos.add(c.id); continue; }
    console.log(`${p.red} · ${p.titulo} → ${msg}`); // sin el texto del comentario: los registros son públicos
    if (!o['dry-run']) {
      try { await contestar(p, c, msg, v === 'bien' || !!v.bien); hechas++; await pausa(); }
      catch (e) { errores.set(`${p.red}: contestar`, e.message); continue; } // sin permiso: se reintenta en la próxima corrida
    }
    vistos.add(c.id);
  }
}
if (!o['dry-run']) fs.writeFileSync(VISTOS, JSON.stringify([...vistos].slice(-5000)) + '\n');
console.log(`Comentarios nuevos revisados: ${revisados} · respuestas: ${hechas}`);
for (const [k, e] of errores) console.log(`Aviso (${k}): ${e}`);
