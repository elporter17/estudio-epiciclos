// POST /api/datos: la base de noticias (Supabase) para las corridas de GitHub Actions, que no tienen sus claves. Solo
// acepta llamadas con la clave que sale del token del bot (cabecera x-potter-datos; scripts/lib/db.mjs).
import { json } from './_panel.js';
import { opDirecta, claveDatos, directo } from '../scripts/lib/db.mjs';
import crypto from 'node:crypto';

const iguales = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y); };

export default { async fetch(request) {
  if (request.method !== 'POST') return json({ ok: false, error: 'Solo POST' }, 405);
  if (!process.env.TELEGRAM_BOT_TOKEN || !iguales(request.headers.get('x-potter-datos'), claveDatos())) return json({ ok: false, error: 'No autorizado' }, 401);
  if (!directo()) return json({ ok: false, error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Vercel' }, 500);
  const { accion, ...d } = await request.json().catch(() => ({}));
  if (!['candidatas', 'publicadas', 'descartar', 'recientes'].includes(accion)) return json({ ok: false, error: 'Acción desconocida' }, 400);
  try { return json({ ok: true, resultado: await opDirecta(accion, d) }); }
  catch (e) { return json({ ok: false, error: e.message }, 500); }
} };
