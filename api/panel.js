// /api/panel — datos y acciones del panel privado (/panel.html). Con contraseña (PANEL_CLAVE en Vercel).
//   GET                       el día: horario con el estado de cada corrida, y las últimas corridas
//   POST {accion:'entrar', clave}           abre la sesión (cookie de 30 días)
//   POST {accion:'correr', workflow, inputs} lanza ya un workflow en GitHub Actions
//   POST {accion:'salir'}
import { json, diaConEstado, lanzar, cookieSesion, autorizado, claveCorrecta } from './_panel.js';
import { NOMBRES } from '../scripts/lib/horario.mjs';

const PERMITIDOS = new Set(Object.keys(NOMBRES));

export default { async fetch(request) {
  try {
    if (request.method === 'POST') {
      const b = await request.json().catch(() => ({}));
      if (b.accion === 'entrar') {
        if (!claveCorrecta(b.clave, 'PANEL_CLAVE')) return json({ error: 'Contraseña incorrecta.' }, 401);
        return json({ ok: true }, 200, { 'set-cookie': cookieSesion() });
      }
      if (b.accion === 'salir') return json({ ok: true }, 200, { 'set-cookie': 'panel=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict' });
      if (!autorizado(request)) return json({ error: 'Inicia sesión.' }, 401);
      if (b.accion === 'correr') {
        if (!PERMITIDOS.has(b.workflow)) return json({ error: 'Ese workflow no existe.' }, 400);
        const inputs = Object.fromEntries(Object.entries(b.inputs || {}).filter(([k, v]) => /^[a-z]+$/.test(k) && typeof v === 'string' && v.length < 40));
        await lanzar(b.workflow, inputs);
        return json({ ok: true, mensaje: `Lanzado: ${NOMBRES[b.workflow]}. Aparece en la lista en unos segundos.` });
      }
      return json({ error: 'Acción desconocida.' }, 400);
    }
    if (!autorizado(request)) return json({ error: 'Inicia sesión.' }, 401);
    const { fecha, min, lista, corridas } = await diaConEstado();
    return json({ fecha, min, horario: lista, corridas: corridas.slice(-25).reverse(), workflows: NOMBRES });
  } catch (e) { return json({ error: e.message }, 500); }
} };
