// Respuestas correctas de lo publicado y cómo compararlas con un comentario (scripts/comentarios.mjs las usa para
// contestar «¡Correcto! ✅» o animar a intentar otra vez). Se guardan 7 días en data/respuestas.json (estado cifrado
// de Actions, no va a git).
//   clave: { modo: 'numero', valor } · { modo: 'posicion', fila, col } · { modo: 'fraccion', k, n }
//          { modo: 'patron', largo, pista, empieza } · { modo: 'vf', verdadero } · { modo: 'letra', letra, texto }
//          { modo: 'puntaje', max } · { modo: 'charla' } (sin respuesta correcta: «¿Qué prefieres?», noticias, GTA VI)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './node-env.mjs';

export const ARCHIVO = path.join(ROOT, 'data', 'respuestas.json');
const leer = () => { try { return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); } catch { return []; } };
const norm = (s) => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const azar = (a) => a[Math.floor(Math.random() * a.length)];

export function registrarRespuesta({ red, id, clave, titulo }) {
  if (!id || !clave) return;
  const lista = [...leer(), { red, id: String(id), clave, titulo, creado: new Date().toISOString() }].filter((x) => Date.now() - Date.parse(x.creado) < 7 * 864e5);
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true }); fs.writeFileSync(ARCHIVO, JSON.stringify(lista, null, 2) + '\n');
}
// Para lo publicado antes de que existiera el registro: la clave sale de la descripción (solo los formatos con puntaje;
// los demás se contestan como charla)
export function inferirClave(descripcion = '') {
  const t = norm(descripcion);
  if (t.includes('adivina las 10 banderas') || t.includes('10 cosas que no sabias')) return { modo: 'puntaje', max: 10 };
  if (t.includes('adivina con emojis')) return { modo: 'puntaje', max: 8 };
  if (t.includes('5 preguntas') || t.includes('5 retos visuales')) return { modo: 'puntaje', max: 5 };
  return { modo: 'charla' };
}
// Un comentario normal (no vacío, sin enlaces ni menciones en masa): se le contesta con un agradecimiento
export const comentarioNormal = (texto = '') => texto.trim().length > 0 && !/https?:\/\/|www\.|\.com\b/i.test(texto) && (texto.match(/@/g) || []).length < 3;
export const publicacionesRecientes = (dias = 3) => leer().filter((x) => Date.now() - Date.parse(x.creado) < dias * 864e5);

// 'bien' | 'mal' | { puntaje } | null (el comentario no es una respuesta: no se contesta)
export function evaluar(clave, texto) {
  const t = norm(texto), nums = (t.match(/\d+/g) || []).map(Number);
  switch (clave.modo) {
    case 'numero': return nums.length ? (nums.includes(clave.valor) ? 'bien' : 'mal') : null;
    case 'posicion': return nums.length >= 2 ? (nums[0] === clave.fila && nums[1] === clave.col ? 'bien' : 'mal') : null;
    case 'fraccion': {
      const m = t.match(/(\d+)\s*\/\s*(\d+)/); if (!m) return null;
      return +m[1] * clave.n === +m[2] * clave.k ? 'bien' : 'mal';
    }
    case 'patron': {
      // Solo se contesta a quien acierta (un nombre que cumple): con los nombres no se corrige a nadie
      const pista = norm(clave.pista);
      const ok = (String(texto).match(/\p{L}+/gu) || []).find((p) => { const w = norm(p); return w.length === clave.largo && (clave.empieza ? w.startsWith(pista) : w.endsWith(pista)); });
      return ok ? { bien: ok } : null;
    }
    case 'vf': {
      const v = /verdad|cierto|\bv\b|✅/.test(t), f = /fals|mentira|\bf\b|❌/.test(t);
      return v === f ? null : (v === clave.verdadero ? 'bien' : 'mal');
    }
    case 'letra': {
      const m = t.match(/^\s*(?:la\s+|opcion\s+|letra\s+)?([abc])\b/) || t.match(/\b(?:la|opcion|letra)\s+([abc])\b/);
      if (m) return m[1].toUpperCase() === clave.letra ? 'bien' : 'mal';
      return clave.texto && t.includes(norm(clave.texto)) ? 'bien' : null;
    }
    case 'puntaje': { const n = nums.find((x) => x <= clave.max); return n == null ? null : { puntaje: n }; }
    case 'charla': return comentarioNormal(texto) ? { charla: true } : null;
    default: return null;
  }
}

const BIEN = ['¡Correcto! ✅', '¡Exacto! 👏', '¡Bien visto! 🔎 Es correcto.', '¡Eso es! 🎯', '¡Muy bien! ✅ No todos lo sacan.', '¡Respuesta correcta! 🙌'];
const MAL = ['Mmm, no es esa 🤔 ¡Inténtalo otra vez!', 'Casi 😅 Fíjate bien y vuelve a intentarlo.', 'Todavía no 👀 ¡Tú puedes!', 'No es esa, pero vas cerca 💪 Mira otra vez.'];
const CHARLA = ['¡Gracias por comentar! 🙌', '¡Qué buena! 🔥', '¡Gracias por jugar! 💪', '¡Así se habla! 👏', '😄 ¡Gracias por estar aquí!', '¡Gracias! Mañana hay más 🎯'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function mensaje(v, clave) {
  if (v === 'bien') return azar(BIEN);
  if (v === 'mal') return azar(MAL);
  if (v.charla) return azar(CHARLA);
  if (v.bien) return `¡${cap(v.bien.toLowerCase())} cumple! ✅ ${clave.largo} letras y ${clave.empieza ? 'empieza con' : 'termina en'} ${clave.pista}.`;
  if (v.puntaje != null) {
    const r = v.puntaje / clave.max;
    return r === 1 ? `¡${v.puntaje} de ${clave.max}, perfecto! 🏆` : r >= 0.7 ? `¡${v.puntaje} de ${clave.max}, muy bien! 🔥` : r >= 0.4 ? `¡${v.puntaje} de ${clave.max}, nada mal! 👏 En el próximo sacas más.` : `¡Gracias por jugar! 💪 El próximo seguro te sale mejor.`;
  }
  return null;
}
