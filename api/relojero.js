// GET /api/relojero?clave=… — lo llama cron-job.org cada 10 minutos. Mira el horario de hoy (scripts/lib/horario.mjs)
// y lanza en GitHub Actions UNA corrida pendiente, la más antigua, si no hay otra esperando: todas comparten la cola
// «daily-tiktok» de GitHub, que solo guarda una en espera (una segunda la reemplazaría).
import { json, diaConEstado, lanzar, claveCorrecta, ACTIVO } from './_panel.js';

export default { async fetch(request) {
  const url = new URL(request.url);
  if (!claveCorrecta(url.searchParams.get('clave') || request.headers.get('x-relojero'), 'RELOJ_CLAVE')) return json({ error: 'Clave incorrecta.' }, 401);
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
