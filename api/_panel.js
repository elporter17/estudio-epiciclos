// Código compartido por /api/relojero.js y /api/panel.js (Vercel ignora los archivos de api/ que empiezan con «_»).
// Lanza workflows de GitHub Actions con un token fino (GITHUB_PANEL_TOKEN: solo este repo, Actions de lectura y escritura)
// que vive únicamente en las variables de Vercel. El horario sale de scripts/lib/horario.mjs.
import crypto from 'node:crypto';
import { delDia, ahoraHN, minutos, instante, NOMBRES } from '../scripts/lib/horario.mjs';

export const REPO = 'elporter17/estudio-epiciclos';
export const VENTANA = 150; // minutos: lo que se atrasó más que esto ya no se lanza (sería una ráfaga de publicaciones)
export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

export async function gh(ruta, opciones = {}) {
  const token = process.env.GITHUB_PANEL_TOKEN;
  if (!token) throw new Error('Falta GITHUB_PANEL_TOKEN en las variables de Vercel.');
  const r = await fetch(`https://api.github.com/repos/${REPO}${ruta}`, {
    ...opciones,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opciones.body ? { 'content-type': 'application/json' } : {}) }
  });
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}

// Corridas desde un instante (las de hoy alcanzan con 100)
export async function corridasDesde(desde) {
  const d = await gh(`/actions/runs?per_page=100&created=>=${desde.toISOString()}`);
  return (d.workflow_runs || []).map((r) => ({
    id: r.id, workflow: r.path?.split('/').pop(), nombre: r.name, evento: r.event, estado: r.status, resultado: r.conclusion,
    creada: r.created_at, url: r.html_url
  }));
}

export const ACTIVO = ['queued', 'in_progress', 'waiting', 'pending', 'requested'];
export async function lanzar(workflow, inputs = {}) {
  await gh(`/actions/workflows/${workflow}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main', inputs }) });
}

// El día con el estado de cada horario: hecho (con su corrida), en curso, pendiente (debería haber salido), perdido
// (más atrasado que la ventana) o próximo. A cada horario le toca la primera corrida de su workflow desde 5 min antes
// de su hora y hasta 5 min antes del siguiente horario del mismo workflow.
export async function diaConEstado(ahora = new Date()) {
  const { fecha, min } = ahoraHN(ahora), slots = delDia(fecha);
  const corridas = (await corridasDesde(instante(fecha, '00:00'))).sort((a, b) => a.creada.localeCompare(b.creada));
  const usadas = new Set();
  const lista = slots.map((s, i) => {
    const desde = instante(fecha, s.hora).getTime() - 5 * 60e3;
    const sig = slots.slice(i + 1).find((x) => x.workflow === s.workflow), hasta = sig ? instante(fecha, sig.hora).getTime() - 5 * 60e3 : Infinity;
    const r = corridas.find((c) => c.workflow === s.workflow && !usadas.has(c.id) && Date.parse(c.creada) >= desde && Date.parse(c.creada) < hasta);
    if (r) usadas.add(r.id);
    const m = minutos(s.hora);
    const estado = r ? (ACTIVO.includes(r.estado) ? 'en-curso' : 'hecho') : m > min ? 'proximo' : min - m <= VENTANA ? 'pendiente' : 'perdido';
    return { ...s, nombre: NOMBRES[s.workflow] || s.workflow, estado, corrida: r || null };
  });
  // Si ya salió un horario posterior del mismo workflow, los pendientes anteriores ya no se lanzan
  lista.forEach((s, i) => { if (s.estado === 'pendiente' && lista.slice(i + 1).some((x) => x.workflow === s.workflow && x.corrida)) s.estado = 'perdido'; });
  return { fecha, min, lista, corridas };
}

// Contraseña del panel: cookie firmada (HMAC con PANEL_CLAVE) que dura 30 días
const firma = (txt) => crypto.createHmac('sha256', `panel:${process.env.PANEL_CLAVE}`).update(txt).digest('base64url');
export function cookieSesion() {
  const exp = Date.now() + 30 * 864e5, v = `${exp}.${firma(String(exp))}`;
  return `panel=${v}; Path=/; Max-Age=${30 * 86400}; HttpOnly; Secure; SameSite=Strict`;
}
export function autorizado(request) {
  if (!process.env.PANEL_CLAVE) return false;
  const v = (request.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith('panel='))?.slice(6);
  if (!v) return false;
  const [exp, f = ''] = v.split('.'), esperada = firma(exp);
  return +exp > Date.now() && f.length === esperada.length && crypto.timingSafeEqual(Buffer.from(f), Buffer.from(esperada));
}
export const claveCorrecta = (dada, env) => {
  const a = Buffer.from(String(dada || '')), b = Buffer.from(String(process.env[env] || ''));
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};
