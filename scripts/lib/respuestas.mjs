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

// ---------- respuestas que suenan a persona ----------
// Cada respuesta se arma con partes al azar: una apertura (a veces ninguna), la frase según el caso y el formato, a veces
// un cierre, un emoji (o ninguno) y, a veces, el nombre de quien comentó. Se descartan las que ya se usaron en ese mismo
// video o hace poco (ver «usadas»), así no hay dos iguales en un video y casi nunca entre videos.
const P = {
  apertura: ['', '', '', '', 'Uff, ', 'Wow, ', 'Ey, ', 'Oye, ', 'Jaja, ', 'Mira nada más, ', 'Qué bien, ', 'Bueno bueno, '],
  perfecto: ['{n} de {max}, no se te escapó ni una', 'puntaje perfecto', 'todas bien, eso es tener nivel', '{n}/{max}, impresionante', 'las {max}, qué crack', 'ni una mala, así se juega', 'perfecto, ¿cuál te costó más?', '{n} de {max}, vienes entrenado', 'pleno, no cualquiera lo logra'],
  alto: ['{n} de {max}, muy bien', '{n}/{max} está buenísimo', 'casi perfecto con {n}', '{n} de {max}, la próxima sacas las {max}', 'con {n} ya eres de los buenos', '{n}, nada mal', '{n} de {max}, te faltó poquito', '{n}, muy buen ojo'],
  medio: ['{n} de {max}, vas bien', '{n}/{max}, nada mal', 'con {n} ya pasaste', '{n} de {max}, el próximo te sale mejor', 'buen intento, {n} está bien', '{n}, y la próxima más', '{n} de {max}, no estaba fácil'],
  bajo: ['lo importante es jugar', 'el próximo te sale mejor, seguro', 'gracias por animarte', 'esta estaba difícil, hay revancha', 'para eso son los retos', 'nadie nace sabiendo, a la próxima', 'tranqui, el siguiente es más fácil'],
  bien: ['correcto', 'exacto, esa era', 'bien visto', 'lo encontraste', 'eso es, ojo de águila', 'respuesta correcta, pocos la sacan', 'esa es, qué rápido', 'sí, esa era', 'justo esa', 'bingo'],
  mal: ['casi, pero no es esa', 'uy, cerca', 'no es esa, mira otra vez', 'todavía no, tú puedes', 'esa no, pero vas bien', 'mmm, revisa de nuevo', 'casi casi, fíjate bien', 'esa no es, pero no te rindas'],
  nombre: ['{N} cumple: {L} letras y {modo} {pista}', '{N}, perfecto, cumple con todo', 'sí, {N} tiene {L} letras', '{N} va perfecto', '{N}, ese no lo había pensado', '{N}, muy bien', 'claro, {N}'],
  charla: {
    banderas: ['¿cuál bandera te costó más?', 'gracias por jugar', 'las del final siempre engañan', 'qué bueno que te gustó', 'hay banderas que se parecen demasiado'],
    prefieres: ['esa estaba difícil', 'buena elección', 'yo también dudé con esa', 'difícil decidir, ¿verdad?', 'tremendo dilema', 'esa la discutimos toda la tarde'],
    gta: ['ya falta poco', 'se viene con todo', 'la cuenta atrás sigue', 'qué ganas de jugarlo', 'cada día falta menos'],
    noticias: ['gracias por leer', 'interesante, ¿verdad?', 'mañana traemos más'],
    generico: ['gracias por comentar', 'qué bueno verte por aquí', 'gracias por jugar', 'así se habla', 'gracias, mañana hay más', 'qué bueno que te gustó', 'gracias por pasar']
  },
  cierre: ['', '', '', '', ' Mañana hay otro.', ' Más tarde sale otro.', ' ¿Te animas con el siguiente?', ' Gracias por jugar.'],
  emoji: ['', '', '🔥', '👏', '💪', '😄', '🙌', '🎯', '✨', '😎', '🤩', '👀', '🫡']
};
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const llenar = (s, d) => s.replace(/\{(\w+)\}/g, (_, k) => d[k] ?? '');
// La «firma» de una respuesta (sin nombres, emojis ni signos) para comparar si ya se usó
export const firma = (s) => norm(s).replace(/@\S+/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const formatoDe = (contexto = '') => { const t = norm(contexto); return t.includes('bandera') ? 'banderas' : t.includes('prefieres') ? 'prefieres' : t.includes('gta') ? 'gta' : t.includes('noticia') ? 'noticias' : 'generico'; };

// usadas: firmas ya usadas (en ese video y recientes); usuario: «@nombre» (Instagram) o nombre de pila (Facebook)
export function mensaje(v, clave, { usadas = new Set(), usuario = null, contexto = '' } = {}) {
  let nucleo, datos = {};
  if (v === 'bien') nucleo = P.bien;
  else if (v === 'mal') nucleo = P.mal;
  else if (v.charla) nucleo = P.charla[formatoDe(contexto)].concat(P.charla.generico);
  else if (v.bien) { nucleo = P.nombre; datos = { N: cap(v.bien.toLowerCase()), L: clave.largo, modo: clave.empieza ? 'empieza con' : 'termina en', pista: clave.pista }; }
  else if (v.puntaje != null) { const r = v.puntaje / clave.max; nucleo = r === 1 ? P.perfecto : r >= 0.7 ? P.alto : r >= 0.4 ? P.medio : P.bajo; datos = { n: v.puntaje, max: clave.max }; }
  else return null;
  let ultima = null;
  for (let i = 0; i < 40; i++) {
    const n = azar(nucleo), ap = azar(P.apertura), ci = azar(P.cierre);
    // Sin ecos: «Qué bien, qué bueno…» ni «gracias… Gracias por jugar»
    let s = llenar((/^qu[eé]/i.test(n) && /^Qu[eé]/.test(ap) ? '' : ap) + n, datos);
    const pregunta = /\?$/.test(s);
    s = Math.random() < 0.45 && !pregunta ? `¡${cap(s)}!` : cap(s) + (pregunta ? '' : '.');
    if (!pregunta && !(/gracias/i.test(n) && /gracias/i.test(ci))) s += ci;
    const e = azar(P.emoji); if (e) s += ` ${e}`;
    // A veces se nombra a la persona, como haría alguien que contesta a mano
    if (usuario && Math.random() < 0.35) s = usuario.startsWith('@') ? `${usuario} ${s}` : `${usuario}, ${s[0] === '¡' ? s : s[0].toLowerCase() + s.slice(1)}`;
    ultima = s;
    if (!usadas.has(firma(s))) break;
  }
  usadas.add(firma(ultima));
  return ultima;
}
