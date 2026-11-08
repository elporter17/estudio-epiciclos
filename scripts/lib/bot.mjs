// Lo que entiende el bot de Telegram (api/telegram.js), sin IA: frases normales en español con una hora y/o el nombre de
// una pieza. Devuelve qué hacer; api/telegram.js lo aplica. Se prueba con: node scripts/bot-prueba.mjs "quita las 2:30"
import { ALIAS, PIEZAS, editable, nombreSlot, tablaPlan, redesDe, redesPosibles } from './horario.mjs';
const RED_LARGO = { fb: 'Facebook', ig: 'Instagram', tt: 'TikTok', yt: 'YouTube' };
import { esc } from './control.mjs';
import { N_REEL } from './noticias.mjs';

export const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿¡]/g, '').replace(/\s+/g, ' ').trim();
const dosDig = (n) => String(n).padStart(2, '0');

// Horas que aparecen en el texto, en orden: «14:30», «2:30 pm», «a las 5», «las 7 de la noche», «al mediodía»
export function horas(t) {
  const out = [];
  const add = (i, h, m, suf = '') => {
    h = +h; m = +(m || 0); if (h > 23 || m > 59) return;
    if (/p|tarde|noche/.test(suf) && h < 12) h += 12;
    else if (/a\.? ?m|manana/.test(suf) && h === 12) h = 0;
    else if (!suf && h >= 1 && h <= 6) h += 12; // «a las 3» es de la tarde: de madrugada no se publica
    if (!out.some((x) => Math.abs(x.i - i) < 3)) out.push({ i, hora: `${dosDig(h)}:${dosDig(m)}` });
  };
  const SUF = '\\s*(a\\.? ?m\\.?|p\\.? ?m\\.?|de la manana|de la tarde|de la noche)?';
  for (const m of t.matchAll(new RegExp(`\\b(\\d{1,2})[:.h](\\d{2})${SUF}`, 'g'))) add(m.index, m[1], m[2], m[3] || '');
  for (const m of t.matchAll(new RegExp(`\\b(?:a|de|desde|para|el de|la de)? ?las? (\\d{1,2})\\b(?![:.h]\\d)${SUF}`, 'g'))) add(m.index + m[0].indexOf(m[1]), m[1], 0, m[2] || '');
  for (const m of t.matchAll(/\b(\d{1,2}) ?(am|pm|a\. ?m\.|p\. ?m\.)/g)) add(m.index, m[1], 0, m[2]);
  for (const m of t.matchAll(/\b(?:a|al) mediodia\b/g)) add(m.index, 12, 0, 'pm');
  return out.sort((a, b) => a.i - b.i).map((x) => x.hora);
}
// Piezas nombradas en el texto, en orden de aparición
export function piezas(t) {
  const out = []; let resto = ` ${t} `;
  for (const [alias, p] of ALIAS) {
    const re = new RegExp(`(?<=[^a-z0-9])${alias.replace(/ /g, '\\s')}(?=[^a-z0-9])`);
    const m = resto.match(re);
    if (m) { out.push({ i: m.index, p }); resto = resto.slice(0, m.index) + ' '.repeat(alias.length) + resto.slice(m.index + alias.length); }
  }
  return out.sort((a, b) => a.i - b.i).map((x) => x.p);
}
export function redes(t) {
  if (/\b(todas|todos lados|todas las redes)\b/.test(t)) return ['fb', 'ig', 'tt', 'yt'];
  const r = [];
  if (/\b(fb|face|facebook)\b/.test(t)) r.push('fb');
  if (/\b(ig|insta|instagram)\b/.test(t)) r.push('ig');
  if (/\b(tt|tiktok|tik tok)\b/.test(t)) r.push('tt');
  if (/\b(yt|youtube|shorts?)\b/.test(t)) r.push('yt');
  return r.length ? r : null;
}
const aMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };

// La corrida a la que te refieres: por hora (exacta o la más cercana a ±20 min) o por pieza (la próxima que no salió)
export function buscar(slots, { hora, pieza }) {
  const ed = slots.filter(editable);
  if (hora) {
    let c = ed.filter((s) => s.hora === hora);
    if (!c.length) { const cerca = ed.map((s) => [Math.abs(aMin(s.hora) - aMin(hora)), s]).filter(([d]) => d <= 20).sort((a, b) => a[0] - b[0]); c = cerca.length ? [cerca[0][1]] : []; }
    if (pieza) c = c.filter((s) => s.pieza === pieza || (pieza === 'banderas' || pieza === 'retos') && s.pieza === 'estrella').concat(c);
    return c[0] || null;
  }
  if (pieza) {
    const c = ed.filter((s) => s.pieza === pieza || (pieza === 'banderas' || pieza === 'retos') && s.pieza === 'estrella' && !ed.some((x) => x.pieza === pieza));
    return c.find((s) => !s.estado || s.estado === 'proximo') || c.find((s) => s.estado === 'pendiente') || c[0] || null;
  }
  return null;
}

const NO_AGREGAR = new Set(['video3d1', 'video3d2', 'largo']);
// texto → { tipo: 'ayuda' | 'plan' | 'noticias' | 'op' | 'lanzar' | 'enlace' | 'error', … }
export function interpretar(textoOriginal, { slots = [] } = {}) {
  const t = norm(textoOriginal);
  const dia = /(?<!la )(?<!pasado )\bmanana\b/.test(t) ? 'manana' : 'hoy';
  if (!t || /^\/?(start|ayuda|help|comandos|menu|\?)$/.test(t) || /\b(ayuda|que puedes hacer|como te uso)\b/.test(t)) return { tipo: 'ayuda' };

  // Noticias
  const url = String(textoOriginal).match(/https?:\/\/\S+/)?.[0];
  if (url) return { tipo: 'enlace', url, dia };
  const propia = String(textoOriginal).match(/^\s*noticia\s*:\s*(.+)$/is);
  if (propia) { const [titulo, ...r] = propia[1].split(/\s*\|\s*|\n+/); return { tipo: 'op', dia, op: { t: 'noticia-propia', noticia: { titulo: titulo.trim().slice(0, 150), resumen: r.join(' ').trim().slice(0, 170), link: `propia:${Date.now()}`, fecha: Date.now(), medio: 'Potter Play', cat: 'general', icono: '📰', propia: true } }, resumen: `Agregué tu noticia: «${titulo.trim()}». Va primero en el Reel.` }; }
  // Números de noticia: «noticia 3», «noticias 2 y 5», «la 4 de noticias» (no las horas: «noticias a las 6»)
  const grupo = t.match(/noticias?\s+(?:numero\s+|n[o°]?\.?\s*)?(\d{1,2}(?:\s*(?:,|y)\s*(?:la\s+)?\d{1,2})*)\b(?![:.]\d)/)?.[1] || t.match(/\bla (\d{1,2}(?:\s*(?:,|y)\s*(?:la\s+)?\d{1,2})*) de (?:las )?noticias/)?.[1] || '';
  const nums = [...grupo.matchAll(/\d{1,2}/g)].map((m) => +m[0]);
  if (/noticia/.test(t) && nums.length) {
    if (/\b(quita|quitar|saca|sacar|elimina|borra|no (uses|pongas|va)|fuera|descarta|cambia)\b/.test(t)) return { tipo: 'noticias-op', dia, accion: 'fuera', nums };
    if (/\b(fija|fijar|primero|primera|usa|pon|ponla|sube|destaca|incluye|mete|agrega)\b/.test(t)) return { tipo: 'noticias-op', dia, accion: 'fija', nums };
    return { tipo: 'error', msg: '¿Quito o fijo esas noticias? Escribe, por ejemplo, «quita noticia 3» o «fija noticia 5».' };
  }
  if (/\b(actualiza|actualizar|refresca|refrescar|junta|juntar|busca|buscar|trae|traer|renueva)\b.*\bnoticias\b/.test(t) || /\bnoticias (nuevas|frescas|actualizadas|recientes)\b/.test(t)) return { tipo: 'noticias-actualizar', dia };
  if (/^\/?noticias\??$/.test(t) || /\b(ver|cuales|que|lista de|muestra|manda) (son )?(las )?noticias\b/.test(t)) return { tipo: 'noticias', dia };

  if (/\b(deshaz|deshacer|deshace|undo|revierte|revertir|como estaba)\b/.test(t)) return { tipo: 'op', dia, op: { t: 'deshacer' }, resumen: 'Deshice el último cambio.' };
  if (/\b(reanuda|reanudar|quita la pausa|vuelve a publicar|activa todo)\b/.test(t)) return { tipo: 'op', dia, op: { t: 'reanudar-pausa' }, resumen: 'Quité la pausa.' };
  if (/\b(pausa|pausar|no publiques nada|para todo|deten todo|nada de publicaciones|sin publicaciones)\b/.test(t)) return { tipo: 'op', dia, op: { t: 'pausa' }, resumen: `Pausé todas las publicaciones de ${dia === 'hoy' ? 'hoy' : 'mañana'} (los renders y las respuestas siguen). «reanuda» para quitar la pausa.` };

  const hs = horas(t), ps = piezas(t), rs = redes(t);
  const etiqueta = (s) => `${nombreSlot(s)} de las ${s.hora}`;

  // Publicar ya (fuera del horario)
  if (/\b(publica|lanza|sube|saca|manda|haz|genera)\b/.test(t) && /\b(ya|ahora|ahorita|de una|en este momento|inmediato)\b/.test(t)) {
    const p = ps[0]; if (!p || !PIEZAS[p] || NO_AGREGAR.has(p)) return { tipo: 'error', msg: '¿Qué publico ya? Por ejemplo: «publica ya unos retos en fb e ig».' };
    return { tipo: 'lanzar', pieza: p, redes: rs };
  }
  // Quitar
  if (/\b(quita|quitar|quitalo|cancela|cancelar|elimina|eliminar|borra|borrar|saca|sacar|no publiques|no subas|omite|salta|salta(te)?)\b/.test(t)) {
    const s = buscar(slots, { hora: hs[0], pieza: ps[0] });
    if (!s) return { tipo: 'error', msg: `No encontré esa publicación ${hs[0] ? `a las ${hs[0]}` : ''}. Escribe «plan» para ver las horas.` };
    if (s.estado === 'hecho' || s.estado === 'en-curso') return { tipo: 'error', msg: `${etiqueta(s)} ya ${s.estado === 'hecho' ? 'salió' : 'se está haciendo'}; no se puede quitar.` };
    // «quita instagram del de las 15:45»: solo esas redes (si quedan otras)
    const actuales = redesDe(s.workflow, s.inputs), quedan = rs ? actuales.filter((r) => !rs.includes(r)) : [];
    if (rs && quedan.length && quedan.length < actuales.length) return { tipo: 'op', dia, op: { t: 'cambiar', hora: s.hora, pieza: s.pieza, redes: quedan }, resumen: `${etiqueta(s)} ya no sale en ${rs.filter((r) => actuales.includes(r)).map((r) => RED_LARGO[r]).join(', ')}; queda en ${quedan.map((r) => RED_LARGO[r]).join(', ')}.` };
    return { tipo: 'op', dia, op: { t: 'quitar', hora: s.hora, pieza: s.pieza }, resumen: `Quité ${etiqueta(s)}.` };
  }
  // «agrega tiktok al de las 15:45», «pon retos también en instagram»: más redes para una publicación que ya está
  if (rs && /\b(agrega|agregar|anade|anadir|pon|ponle|poner|suma|mete|tambien)\b/.test(t) && !/\b(otro|otra|extra|nuevo|nueva)\b/.test(t)) {
    const s = buscar(slots, { hora: hs[0], pieza: ps[0] });
    if (s && (!hs[0] || Math.abs(aMin(s.hora) - aMin(hs[0])) <= 20) && (!ps[0] || s.pieza === ps[0] || s.pieza === 'estrella') && s.pieza && PIEZAS[s.pieza]) {
      const actuales = redesDe(s.workflow, s.inputs), nuevas = rs.filter((r) => !actuales.includes(r) && redesPosibles(s.pieza).includes(r));
      const imposibles = rs.filter((r) => !redesPosibles(s.pieza).includes(r));
      if (imposibles.length && !nuevas.length) return { tipo: 'error', msg: `${nombreSlot(s)} no se puede publicar en ${imposibles.map((r) => RED_LARGO[r]).join(', ')}: solo en ${redesPosibles(s.pieza).map((r) => RED_LARGO[r]).join(', ')}.` };
      if (!nuevas.length) return { tipo: 'error', msg: `${etiqueta(s)} ya sale en ${rs.map((r) => RED_LARGO[r]).join(', ')}.` };
      return { tipo: 'op', dia, op: { t: 'cambiar', hora: s.hora, pieza: s.pieza, redes: [...actuales, ...nuevas] }, resumen: `${etiqueta(s)} ahora también sale en ${nuevas.map((r) => RED_LARGO[r]).join(', ')}.` };
    }
  }
  // Mover de hora
  if (/\b(mueve|mover|muevelo|pasa|pasalo|pasar|atrasa|atrasalo|adelanta|adelantalo|reprograma|corre|correlo|cambia la hora|cambiale la hora)\b/.test(t)) {
    const destino = hs.at(-1), origen = hs.length > 1 ? hs[0] : null;
    if (!destino) return { tipo: 'error', msg: '¿A qué hora lo muevo? Por ejemplo: «mueve retos a las 5 pm».' };
    const s = buscar(slots, { hora: origen, pieza: ps[0] });
    if (!s) return { tipo: 'error', msg: 'No sé cuál mover. Dime la hora o el nombre: «mueve el de las 15:45 a las 17:00».' };
    if (s.estado === 'hecho' || s.estado === 'en-curso') return { tipo: 'error', msg: `${etiqueta(s)} ya ${s.estado === 'hecho' ? 'salió' : 'se está haciendo'}.` };
    return { tipo: 'op', dia, op: { t: 'mover', hora: s.hora, pieza: s.pieza, a: destino }, resumen: `Moví ${nombreSlot(s)} de las ${s.hora} a las ${destino}.` };
  }
  // Cambiar una pieza por otra («cambia el de las 20:30 por emojis», «en vez de prefieres pon emojis»)
  const cambiar = /\b(cambia|cambiar|cambialo|reemplaza|reemplazar|en vez de|en lugar de|sustituye)\b/.test(t);
  const poner = /\b(pon|ponle|poner|agrega|agregar|anade|anadir|mete|suma|programa|publica)\b/.test(t);
  if (cambiar || (poner && hs[0] && slots.some((s) => s.hora === hs[0] && editable(s)) && !/\b(agrega|agregar|anade|anadir|suma|otro|otra|extra|ademas)\b/.test(t))) {
    const nueva = cambiar && ps.length > 1 ? ps[1] : ps.at(-1);
    const s = buscar(slots, { hora: hs[0], pieza: hs[0] ? null : (ps.length > 1 ? ps[0] : null) });
    if (!s || !nueva) return { tipo: 'error', msg: 'No entendí qué cambio por qué. Por ejemplo: «cambia el de las 20:30 por emojis».' };
    if (NO_AGREGAR.has(nueva)) return { tipo: 'error', msg: 'Los videos 3D y el largo se preparan de madrugada: solo se pueden mover o quitar.' };
    if (s.estado === 'hecho' || s.estado === 'en-curso') return { tipo: 'error', msg: `${etiqueta(s)} ya ${s.estado === 'hecho' ? 'salió' : 'se está haciendo'}.` };
    return { tipo: 'op', dia, op: { t: 'cambiar', hora: s.hora, pieza: nueva, ...(rs ? { redes: rs } : {}) }, resumen: `A las ${s.hora} va ${nueva === s.pieza ? 'lo mismo' : `${NOMBRE(nueva)} en vez de ${nombreSlot(s)}`}${rs ? ` (${rs.join(', ')})` : ''}.` };
  }
  // Agregar
  if (poner) {
    const p = ps[0];
    if (!p || !PIEZAS[p]) return { tipo: 'error', msg: '¿Qué agrego? Por ejemplo: «agrega un quiz a las 13:00 en fb».' };
    if (NO_AGREGAR.has(p)) return { tipo: 'error', msg: 'Los videos 3D y el largo se preparan de madrugada: no se pueden agregar en el día.' };
    if (!hs[0]) return { tipo: 'error', msg: `¿A qué hora pongo ${NOMBRE(p)}? Por ejemplo: «agrega ${p} a las 13:00».` };
    // ¿Para siempre? (alcanceDe); si no lo dice, el bot pregunta
    const { alcance, dias = [] } = alcanceDe(t);
    return { tipo: 'op', dia, alcance, ...(dias.length ? { dias } : {}), op: { t: 'agregar', hora: hs[0], pieza: p, ...(rs ? { redes: rs } : {}) }, resumen: `Agregué ${NOMBRE(p)} a las ${hs[0]}${rs ? ` en ${rs.map((r) => RED_LARGO[r]).join(', ')}` : ''}.` };
  }
  if (/\b(plan|hoy|tabla|agenda|programacion|horario|que (sale|hay|se publica|toca))\b/.test(t) || dia === 'manana') return { tipo: 'plan', dia };
  return { tipo: 'error', msg: 'No te entendí 😅' , ayuda: true };
}
const NOMBRE = (p) => nombreSlot({ pieza: p });
// ¿Para siempre? «todos los días», «siempre», «cada viernes», «los sábados»; «solo hoy». { alcance: 't'|'s'|'d'|null, dias? }
export function alcanceDe(texto) {
  const t = norm(texto), SEM = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const semanal = new RegExp(`\\b(cada|los|todos los) (${SEM.join('|')})`).test(t);
  const dias = semanal ? SEM.map((d, i) => new RegExp(`\\b${d}s?\\b`).test(t) ? i : -1).filter((i) => i >= 0) : [];
  const alcance = dias.length ? 's' : /\b(todos los dias|diario|diariamente|cada dia|siempre|de ahora en adelante|fijo|para siempre)\b/.test(t) ? 't' : /\bsolo (hoy|manana|ese dia|este dia|una vez)\b/.test(t) ? 'd' : null;
  return { alcance, ...(dias.length ? { dias } : {}) };
}

export const AYUDA = `<b>Lo que puedo hacer</b> (escribe normal, sin comandos):

📅 <b>Plan</b>
• «plan» o «plan de mañana»: la tabla del día
• «quita las 14:30» · «cancela prefieres»
• «mueve retos a las 5 pm» · «pasa el de las 15:45 a las 17:00»
• «cambia el de las 20:30 por emojis» · «en vez de prefieres pon quiz»
• «agrega un quiz a las 13:00 en fb e ig»
• «quita instagram del de las 15:45» · «agrega tiktok a retos»
• «agrega un quiz a las 13:00 todos los días» · «… cada viernes» (si no lo dices, te pregunto). 🔁 Fijos para verlos o borrarlos
• «publica ya unos retos» (sale en los próximos minutos)
• «pausa hoy» / «reanuda» · «deshaz» (anula el último cambio)
Si dices «mañana», el cambio es para mañana. Lo más fácil: los botones (📅 Plan de hoy → toca una publicación).

📰 <b>Noticias</b>
• «noticias»: las candidatas de hoy, numeradas · «actualiza las noticias»: trae las más recientes
• «videos»: qué videos 3D y largo vienen

💡 <b>Videos desde una idea</b>
• «💡 Idea» o «idea: daltonismo»: armo el guion con datos de Wikipedia, lo ajustas con botones y te mando el video para aprobarlo
• «formato»: el formato para que otra IA (ChatGPT…) escriba el guion; luego me pegas el JSON o me mandas el archivo
• «quita noticia 3» · «fija noticia 5» (va primero)
• Pega un enlace de una noticia para agregarla
• «noticia: Título | resumen corto» para escribirla tú

Piezas: debate (video), debate en imagen, banderas, retos, emojis, quiz, prefieres, cómo se hace, imagen, gta, nombres, futbolista, noticias en video, noticias en imagen, 3D de mediodía / de la tarde.
Horas: «14:30», «2:30 pm» o «a las 3» (de 1 a 6 se entiende de la tarde).`;

// ---------- mensajes (HTML de Telegram) ----------
export const diaBonito = (fecha) => new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
export function mensajePlan(fecha, slots, { estado = false, ops = [], titulo } = {}) {
  const pausa = ops.some((o) => o.t === 'pausa'), cambios = slots.some((s) => s.cambio);
  return `📅 <b>${titulo || `Plan de ${diaBonito(fecha)}`}</b>${pausa ? '\n⏸️ <b>Día en pausa</b>: no sale nada («reanuda» para volver)' : ''}\n<pre>${esc(tablaPlan(slots, { estado }) || '(nada programado)')}</pre>${cambios ? `\n${[slots.some((s) => s.cambio && !s.fijo && !s.ya) ? '* cambiado por ti' : '', slots.some((s) => s.fijo) ? '🔁 programación fija' : '', slots.some((s) => s.ya) ? '🚀 publicado ya' : ''].filter(Boolean).join(' · ')}` : ''}${estado ? '\n✅ salió · ⏳ en curso · ⏰ atrasado · ❌ perdido' : ''}`;
}
export function mensajeNoticias(lista, { horaReel, max = 10 } = {}) {
  if (!lista.length) return '📰 Hoy no hay noticias candidatas todavía (se juntan a las 6:23).';
  const filas = lista.slice(0, max).map((n, i) => `${i < N_REEL ? '✅' : '▫️'} <b>${n.num ? `${n.num}.` : '★'}</b> ${n.icono || '📰'} <b>${esc(n.titulo)}</b>${n.resumen ? `\n<i>${esc(n.resumen)}</i>` : ''}\n${esc(n.medio)}${n.link?.startsWith('http') ? ` · <a href="${esc(n.link)}">ver</a>` : ''}`);
  return `📰 <b>Noticias de hoy</b>: las ✅ van en el Reel${horaReel ? ` de las ${horaReel}` : ''}\n\n${filas.join('\n\n')}`;
}
