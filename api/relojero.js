// GET /api/relojero?clave=… — lo llama cron-job.org cada 10 minutos. Mira el horario de hoy (scripts/lib/horario.mjs)
// y lanza en GitHub Actions UNA corrida pendiente, la más antigua, si no hay otra esperando: todas comparten la cola
// «daily-tiktok» de GitHub, que solo guarda una en espera (una segunda la reemplazaría).
import { json, diaConEstado, lanzar, claveCorrecta, ACTIVO } from './_panel.js';

export default { async fetch(request) {
  const url = new URL(request.url);
  // La clave va en la cabecera «X-Relojero» (en la URL quedaría en los registros). La de la URL se acepta mientras
  // RELOJ_SOLO_CABECERA no sea «si», para cambiar cron-job.org sin perder corridas.
  const enUrl = process.env.RELOJ_SOLO_CABECERA === 'si' ? null : url.searchParams.get('clave');
  if (!claveCorrecta(request.headers.get('x-relojero') || enUrl, 'RELOJ_CLAVE')) return json({ error: 'Clave incorrecta.' }, 401);
  try {
    const { fecha, min, lista, corridas } = await diaConEstado();
    const esperando = corridas.filter((c) => ACTIVO.includes(c.estado) && c.estado !== 'in_progress');
    const pendientes = lista.filter((s) => s.estado === 'pendiente');
    if (!pendientes.length) return json({ fecha, hora: min, accion: 'nada', mensaje: 'Todo al día.' });
    if (esperando.length) return json({ fecha, hora: min, accion: 'esperar', mensaje: `Hay ${esperando.length} corrida(s) en cola; vuelvo en 10 minutos.`, pendientes: pendientes.map((s) => s.hora) });
    // Solo el último pendiente de cada workflow: si uno se atrasó y ya toca el siguiente, sale el siguiente
    const ultimo = new Map(); for (const s of pendientes) ultimo.set(s.workflow, s);
    const s = [...ultimo.values()].sort((a, b) => a.hora.localeCompare(b.hora))[0];
    await lanzar(s.workflow, s.inputs || {});
    return json({ fecha, hora: min, accion: 'lanzado', workflow: s.workflow, horario: s.hora, que: s.que });
  } catch (e) { return json({ error: e.message }, 500); }
} };
