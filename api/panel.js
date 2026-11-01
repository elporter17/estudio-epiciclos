// /api/panel — datos y acciones del panel privado (/panel.html). Acceso con contraseña (PANEL_CLAVE) y código de 6
// dígitos de una app de autenticación (PANEL_TOTP). Todas las peticiones POST llevan la cabecera «x-panel: 1» (una
// página de otro sitio no puede ponerla sin permiso del navegador: así no se puede usar la sesión desde afuera).
//   GET                                      el día: horario con el estado y las redes de cada corrida, y las últimas corridas
//   POST {accion:'entrar', clave, codigo}     abre la sesión (cookie de 12 horas)
//   POST {accion:'nuevo-2fa'}                 (solo sin 2FA y con sesión) un secreto nuevo para la app de autenticación
//   POST {accion:'probar-2fa', secreto, codigo} comprueba que la app da códigos válidos para ese secreto
//   POST {accion:'correr', workflow, inputs}  lanza ya un workflow en GitHub Actions (necesita el 2FA configurado)
//   POST {accion:'salir'}
import { json, diaConEstado, lanzar, cookieSesion, cookieSalir, autorizado, claveCorrecta, hay2fa, codigoValido, nuevoSecreto, ipDe, bloqueado, fallo, acierto } from './_panel.js';
import { NOMBRES, redesDe } from '../scripts/lib/horario.mjs';

const PERMITIDOS = new Set(Object.keys(NOMBRES));

export default { async fetch(request) {
  try {
    if (request.method === 'POST') {
      if (request.headers.get('x-panel') !== '1') return json({ error: 'Petición no permitida.' }, 403);
      const b = await request.json().catch(() => ({})), ip = ipDe(request);
      if (b.accion === 'entrar') {
        if (bloqueado(ip)) return json({ error: 'Demasiados intentos. Espera 15 minutos.' }, 429);
        if (!claveCorrecta(b.clave, 'PANEL_CLAVE') || (hay2fa() && !codigoValido(b.codigo))) { await fallo(ip); return json({ error: hay2fa() ? 'Contraseña o código incorrecto.' : 'Contraseña incorrecta.' }, 401); }
        acierto(ip);
        return json({ ok: true, dosPasos: hay2fa() }, 200, { 'set-cookie': cookieSesion() });
      }
      if (b.accion === 'salir') return json({ ok: true }, 200, { 'set-cookie': cookieSalir });
      if (!autorizado(request)) return json({ error: 'Inicia sesión.' }, 401);
      if (b.accion === 'nuevo-2fa') {
        if (hay2fa()) return json({ error: 'El 2FA ya está configurado. Para cambiarlo, borra PANEL_TOTP en Vercel.' }, 400);
        const secreto = nuevoSecreto();
        return json({ secreto, uri: `otpauth://totp/Potter%20Play:panel?secret=${secreto}&issuer=Potter%20Play&digits=6&period=30` });
      }
      if (b.accion === 'probar-2fa') return json({ ok: codigoValido(b.codigo, String(b.secreto || '')) });
      if (b.accion === 'correr') {
        if (!hay2fa()) return json({ error: 'Configura primero el 2FA para poder lanzar corridas.' }, 403);
        if (!PERMITIDOS.has(b.workflow)) return json({ error: 'Ese workflow no existe.' }, 400);
        const inputs = Object.fromEntries(Object.entries(b.inputs || {}).filter(([k, v]) => /^[a-z]+$/.test(k) && typeof v === 'string' && v.length < 40));
        await lanzar(b.workflow, inputs);
        return json({ ok: true, mensaje: `Lanzado: ${NOMBRES[b.workflow]}. Aparece en la lista en unos segundos.` });
      }
      return json({ error: 'Acción desconocida.' }, 400);
    }
    if (!autorizado(request)) return json({ error: 'Inicia sesión.', dosPasos: hay2fa() }, 401);
    const { fecha, min, lista, corridas } = await diaConEstado();
    // redes: dónde publica cada workflow (fb, ig, tt), para las etiquetas y los filtros del panel
    const redes = Object.fromEntries(Object.keys(NOMBRES).map((w) => [w, redesDe(w)]));
    return json({ fecha, min, horario: lista, corridas: corridas.slice(-25).reverse(), workflows: NOMBRES, redes, dosPasos: hay2fa() });
  } catch (e) { return json({ error: e.message }, 500); }
} };
