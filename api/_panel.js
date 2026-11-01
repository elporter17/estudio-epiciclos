// Código compartido por /api/relojero.js y /api/panel.js (Vercel ignora los archivos de api/ que empiezan con «_»).
// Lanza workflows de GitHub Actions con un token fino (GITHUB_PANEL_TOKEN: solo este repo, Actions de lectura y escritura)
// que vive únicamente en las variables de Vercel. El horario sale de scripts/lib/horario.mjs.
import crypto from 'node:crypto';
import { delDia, ahoraHN, minutos, instante, NOMBRES, redesDe } from '../scripts/lib/horario.mjs';

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
    return { ...s, nombre: NOMBRES[s.workflow] || s.workflow, redes: redesDe(s.workflow, s.inputs), estado, corrida: r || null };
  });
  // Si ya salió un horario posterior del mismo workflow, los pendientes anteriores ya no se lanzan
  lista.forEach((s, i) => { if (s.estado === 'pendiente' && lista.slice(i + 1).some((x) => x.workflow === s.workflow && x.corrida)) s.estado = 'perdido'; });
  return { fecha, min, lista, corridas };
}

// ---------- acceso al panel: contraseña + código de 6 dígitos (TOTP, RFC 6238) ----------
// Variables de Vercel: PANEL_CLAVE (contraseña), PANEL_TOTP (secreto base32 de la app de autenticación) y, opcional,
// PANEL_SESION (cambiarla cierra todas las sesiones). Cambiar cualquiera de las tres invalida las cookies existentes.
export const hay2fa = () => !!process.env.PANEL_TOTP;
const iguales = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y); };
export const claveCorrecta = (dada, env) => iguales(dada || '', process.env[env] || '');

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const nuevoSecreto = () => [...crypto.randomBytes(20)].reduce((acc, b) => acc + b.toString(2).padStart(8, '0'), '').match(/.{5}/g).map((x) => B32[parseInt(x, 2)]).join('');
function base32(s) {
  const bits = String(s).toUpperCase().replace(/[^A-Z2-7]/g, '').split('').map((c) => B32.indexOf(c).toString(2).padStart(5, '0')).join('');
  return Buffer.from((bits.match(/.{8}/g) || []).map((b) => parseInt(b, 2)));
}
function totp(secreto, contador) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(contador));
  const h = crypto.createHmac('sha1', base32(secreto)).update(msg).digest(), o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0');
}
// Acepta el código de los 30 s actuales y de los vecinos (relojes un poco desfasados)
export function codigoValido(codigo, secreto = process.env.PANEL_TOTP) {
  const c = String(codigo || '').replace(/\D/g, ''); if (!secreto || c.length !== 6) return false;
  const t = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some((d) => iguales(totp(secreto, t + d), c));
}

// Sesión: cookie __Host- firmada (HMAC con la contraseña, el secreto 2FA y PANEL_SESION) que dura 12 horas
const HORAS = 12, COOKIE = '__Host-panel';
const firma = (txt) => crypto.createHmac('sha256', `panel:${process.env.PANEL_CLAVE}:${process.env.PANEL_TOTP || ''}:${process.env.PANEL_SESION || ''}`).update(txt).digest('base64url');
export function cookieSesion() {
  const exp = Date.now() + HORAS * 3600e3;
  return `${COOKIE}=${exp}.${firma(String(exp))}; Path=/; Max-Age=${HORAS * 3600}; HttpOnly; Secure; SameSite=Strict`;
}
export const cookieSalir = `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
export function autorizado(request) {
  if (!process.env.PANEL_CLAVE) return false;
  const v = (request.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!v) return false;
  const [exp, f = ''] = v.split('.');
  return +exp > Date.now() && iguales(f, firma(exp));
}

// Intentos fallidos por IP (en memoria de la función: frena ráfagas; el 2FA es lo que de verdad protege)
const fallos = new Map();
export const ipDe = (request) => (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '?').split(',')[0].trim();
export function bloqueado(ip) { const f = fallos.get(ip); return !!f && f.n >= 5 && Date.now() - f.t < 15 * 60e3; }
export async function fallo(ip) {
  const f = fallos.get(ip); fallos.set(ip, { n: f && Date.now() - f.t < 15 * 60e3 ? f.n + 1 : 1, t: Date.now() });
  await new Promise((r) => setTimeout(r, 1500)); // cada intento fallido tarda
}
export const acierto = (ip) => fallos.delete(ip);
