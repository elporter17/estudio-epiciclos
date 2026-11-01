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
import { publicacionesRecientes, evaluar, mensaje } from './lib/respuestas.mjs';

const o = parseCli({ max: { type: 'string', default: '25' }, 'dry-run': { type: 'boolean', default: false } });
const VISTOS = path.join(ROOT, 'data', 'comentarios-respondidos.json');
const vistos = new Set((() => { try { return JSON.parse(fs.readFileSync(VISTOS, 'utf8')); } catch { return []; } })());
const pausa = () => new Promise((r) => setTimeout(r, 3000 + Math.random() * 3000)); // sin ráfagas: parece menos automático

if (!facebookReady()) { console.log('Faltan FB_PAGE_ID o FB_PAGE_TOKEN'); process.exit(0); }
const page = process.env.FB_PAGE_ID, ig = await instagramReady();
const igUser = ig ? (await graph('GET', `/${ig}`, { fields: 'username' }).catch(() => ({}))).username : null;

async function comentarios(p) {
  if (p.red === 'facebook') {
    const d = await graph('GET', `/${p.id}/comments`, { filter: 'toplevel', limit: 100, fields: 'id,message,from{id},created_time' });
    return (d.data || []).filter((c) => c.from?.id !== page).map((c) => ({ id: c.id, texto: c.message || '' }));
  }
  const d = await graph('GET', `/${p.id}/comments`, { limit: 100, fields: 'id,text,username,timestamp' });
  return (d.data || []).filter((c) => c.username !== igUser).map((c) => ({ id: c.id, texto: c.text || '' }));
}
async function contestar(p, c, msg, bien) {
  if (p.red === 'facebook') {
    await graph('POST', `/${c.id}/comments`, { message: msg });
    if (bien) await graph('POST', `/${c.id}/likes`).catch(() => {});
  } else await graph('POST', `/${c.id}/replies`, { message: msg });
}

let hechas = 0, revisados = 0;
const errores = new Map();
for (const p of publicacionesRecientes(3)) {
  if (hechas >= +o.max) break;
  if (p.red === 'instagram' && !ig) continue;
  let lista;
  try { lista = await comentarios(p); } catch (e) { errores.set(`${p.red}: leer`, e.message); continue; }
  for (const c of lista) {
    if (hechas >= +o.max) break;
    if (vistos.has(c.id)) continue;
    revisados++;
    const v = evaluar(p.clave, c.texto), msg = v && mensaje(v, p.clave);
    if (!msg) { vistos.add(c.id); continue; }
    console.log(`${p.red} · ${p.titulo}: «${c.texto.slice(0, 60)}» → ${msg}`);
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
