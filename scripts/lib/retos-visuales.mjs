// Retos visuales en imagen (sin IA), al estilo de las publicaciones de acertijos que más comentarios juntan en
// Facebook: una pregunta grande con palabras resaltadas y un dibujo generado (cuadrícula, círculo, casillas…).
// La respuesta va en la descripción, debajo de «Ver más». Todos se generan al azar: no se acaban nunca.
//   duplicado  ¿Cuál es el número duplicado? (cuadrícula de números)
//   diferente  Encuentra la letra o el emoji distinto entre muchos iguales
//   fraccion   ¿Qué fracción del círculo está pintada?
//   nombre     Un nombre de N letras que termine (o empiece) en …
//   operacion  Una operación con trampa de orden (6 + 6 × 0 + 6)
import { createCanvas } from '@napi-rs/canvas';
import { BIBLIOTECA } from './catalog.mjs';

export const VISUALES = ['duplicado', 'nombre', 'diferente', 'fraccion', 'operacion'];
const SANS = '"IBM Plex Sans", "STIX Two Text", system-ui, sans-serif', BLACK = '"Archivo Black", Impact, sans-serif';
const TINTA = '#141414', ROJO = '#d7263d';
const PALETAS = [['#c8643b', '#a24a26'], ['#2f6fb5', '#1f4f86'], ['#1f8a5b', '#146442'], ['#7b4bb7', '#5a3290'], ['#d08a1f', '#a9690c']];
const azar = (a) => a[Math.floor(Math.random() * a.length)];
const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const mezclar = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const sinAcentos = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
const OCULTAR = '\n\n.\n.\n.\n\n';
const TAGS = '#retos #acertijos #retovisual #juegosmentales #agilidadmental #potterplay';

// ---------- generadores: { tipo, clave, titulo: [[texto, resaltar]], cuerpo(ctx, caja, emoji), texto } ----------
// clave: la respuesta correcta en una forma que scripts/lib/respuestas.mjs sabe comparar con un comentario
function duplicado() {
  const filas = 4, cols = 5, n = filas * cols, nums = mezclar(Array.from({ length: 90 }, (_, i) => i + 10)).slice(0, n);
  let i, j;
  do { i = entre(0, n - 1); j = entre(0, n - 1); } while (i === j || Math.abs(Math.floor(i / cols) - Math.floor(j / cols)) < 1);
  nums[j] = nums[i];
  const [c1, c2] = azar(PALETAS), fila = (k) => Math.floor(k / cols) + 1;
  return {
    tipo: 'duplicado', clave: { modo: 'numero', valor: nums[i] }, titulo: [['¿Cuál es el número', false], ['DUPLICADO?', true]],
    cuerpo(ctx, b) {
      const gap = 18, s = Math.min((b.w - gap * (cols - 1)) / cols, (b.h - gap * (filas - 1)) / filas), x0 = b.x + (b.w - (s * cols + gap * (cols - 1))) / 2, y0 = b.y + (b.h - (s * filas + gap * (filas - 1))) / 2;
      nums.forEach((v, k) => {
        const x = x0 + (k % cols) * (s + gap), y = y0 + Math.floor(k / cols) * (s + gap);
        const g = ctx.createLinearGradient(x, y, x, y + s); g.addColorStop(0, c1); g.addColorStop(1, c2);
        ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, s, s, 22); ctx.fill();
        ctx.fillStyle = '#fff8ec'; ctx.font = `400 ${Math.round(s * 0.42)}px ${BLACK}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(v), x + s / 2, y + s / 2 + 4);
      });
    },
    texto: `👀 ¿Qué número está repetido? Los más observadores lo ven en menos de 10 segundos.${OCULTAR}✅ Respuesta: el ${nums[i]} (está en la fila ${fila(i)} y en la fila ${fila(j)}).\n\n${TAGS} #observacion`
  };
}

function diferente() {
  const pares = [['O', 'Q', 'letra'], ['E', 'F', 'letra'], ['M', 'N', 'letra'], ['b', 'd', 'letra'], ['C', 'G', 'letra'], ['P', 'R', 'letra'], ['3', '8', 'número'], ['6', '9', 'número'], ['5', 'S', 'letra'],
    ['🍎', '🍅', 'emoji'], ['🙂', '🙃', 'emoji'], ['😀', '😃', 'emoji'], ['🐻', '🐼', 'emoji'], ['🍊', '🍑', 'emoji'], ['⚽', '🏐', 'emoji']];
  const [base, raro, clase] = azar(pares), cols = 8, filas = 10, pos = entre(0, cols * filas - 1);
  const titulo = clase === 'emoji' ? [['Encuentra el', false], ['emoji diferente', true]] : clase === 'número' ? [['Encuentra el', false], [raro, true], ['escondido', false]] : [['Encuentra la', false], [raro, true], ['escondida', false]];
  return {
    tipo: 'diferente', clave: { modo: 'posicion', fila: Math.floor(pos / cols) + 1, col: pos % cols + 1 }, titulo,
    cuerpo(ctx, b, emoji) {
      const s = Math.min(b.w / cols, b.h / filas), x0 = b.x + (b.w - s * cols) / 2, y0 = b.y + (b.h - s * filas) / 2;
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(x0 - 16, y0 - 16, s * cols + 32, s * filas + 32, 26); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = TINTA;
      ctx.font = clase === 'emoji' ? `${Math.round(s * 0.66)}px ${emoji}` : `700 ${Math.round(s * 0.7)}px ${SANS}`;
      for (let k = 0; k < cols * filas; k++) ctx.fillText(k === pos ? raro : base, x0 + (k % cols + 0.5) * s, y0 + (Math.floor(k / cols) + 0.5) * s + 2);
    },
    texto: `🔎 ${clase === 'emoji' ? 'Hay un emoji distinto a los demás' : `Hay ${clase === 'número' ? 'un' : 'una'} ${raro} entre ${clase === 'número' ? 'los' : 'las'} ${base}`}. ¿En qué fila y columna está? Pocos lo encuentran a la primera.${OCULTAR}✅ Respuesta: fila ${Math.floor(pos / cols) + 1}, columna ${pos % cols + 1} (contando desde arriba a la izquierda).\n\n${TAGS} #observacion`
  };
}

function fraccion() {
  const n = azar([6, 8, 10, 12]); let k; do { k = entre(2, n - 1); } while (k * 2 === n);
  const mcd = (a, c) => (c ? mcd(c, a % c) : a), d = mcd(k, n), inicio = entre(0, n - 1);
  // A veces las partes pintadas no van juntas: cuesta más contarlas
  const pintadas = new Set(Math.random() < 0.5 ? Array.from({ length: k }, (_, i) => (inicio + i) % n) : mezclar(Array.from({ length: n }, (_, i) => i)).slice(0, k));
  return {
    tipo: 'fraccion', clave: { modo: 'fraccion', k, n }, titulo: [['¿Qué', false], ['fracción', true], ['del círculo está', false], ['pintada?', true]],
    cuerpo(ctx, b) {
      const r = Math.min(b.w, b.h) / 2 * 0.92, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      for (let i = 0; i < n; i++) {
        const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n, a1 = a0 + (2 * Math.PI) / n;
        ctx.fillStyle = pintadas.has(i) ? '#14834f' : '#ffffff'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = TINTA; ctx.lineWidth = 7;
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    },
    texto: `🟢 ¿Qué fracción del círculo está pintada de verde? Parece fácil… pero cuenta bien las partes.${OCULTAR}✅ Respuesta: ${k}/${n}${d > 1 ? `, que simplificado es ${k / d}/${n / d}` : ''}. El círculo tiene ${n} partes iguales y ${k} están pintadas.\n\n${TAGS} #matematicas #fracciones`
  };
}

function nombre() {
  // Nombres de una sola palabra de la biblioteca, sin tildes, agrupados por largo y terminación (o inicio)
  const original = new Map(BIBLIOTECA.nombres.filter((x) => !/\s/.test(x)).map((x) => [sinAcentos(x), x])), lista = [...original.keys()];
  const empieza = Math.random() < 0.35, grupos = new Map();
  for (const x of lista) for (const m of [2, 3]) {
    if (x.length < m + 3) continue;
    const pista = empieza ? x.slice(0, m) : x.slice(-m), k = `${x.length}|${pista}`;
    grupos.set(k, [...(grupos.get(k) || []), x]);
  }
  const opciones = [...grupos].filter(([, v]) => v.length >= 3);
  const [k, ejemplos] = azar(opciones), [largo, pista] = k.split('|'), L = +largo;
  return {
    tipo: 'nombre', clave: { modo: 'patron', largo: L, pista, empieza }, titulo: [['A ver quién sabe un nombre de', false], [`${L} letras`, true], [empieza ? 'que empiece con' : 'que termine en', false], [pista, true]],
    cuerpo(ctx, b, emoji) {
      const s = Math.min(150, (b.w - 12 * (L - 1)) / L), x0 = b.x + (b.w - (s * L + 12 * (L - 1))) / 2, y = b.y + b.h * 0.22;
      for (let i = 0; i < L; i++) {
        const x = x0 + i * (s + 12), letra = empieza ? (i < pista.length ? pista[i] : '') : (i >= L - pista.length ? pista[i - (L - pista.length)] : '');
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = TINTA; ctx.lineWidth = 5; ctx.beginPath(); ctx.rect(x, y, s, s); ctx.fill(); ctx.stroke();
        if (letra) { ctx.fillStyle = TINTA; ctx.font = `400 ${Math.round(s * 0.55)}px ${BLACK}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letra, x + s / 2, y + s / 2 + 3); }
      }
      ctx.font = `${Math.round(b.h * 0.3)}px ${emoji}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🤔', b.x + b.w / 2, y + s + b.h * 0.3);
    },
    texto: `✍️ Un nombre de ${L} letras que ${empieza ? 'empiece con' : 'termine en'} ${pista}. ¿Cuál se te ocurre primero? Seguro conoces a alguien que se llama así.${OCULTAR}💡 Algunos: ${ejemplos.slice(0, 5).map((x) => original.get(x)).join(', ')}… ¡y hay más!\n\n${TAGS} #nombres #palabras`
  };
}

function operacion() {
  const t = entre(0, 3); let expr, res, explica;
  if (t === 0) { const a = entre(3, 9); expr = `${a} + ${a} × 0 + ${a}`; res = 2 * a; explica = `Primero la multiplicación: ${a} × 0 = 0. Queda ${a} + 0 + ${a} = ${res}.`; }
  else if (t === 1) { const b = entre(2, 6), c = entre(2, 5), a = b * c * entre(1, 3); expr = `${a} ÷ ${b} × ${c}`; res = (a / b) * c; explica = `División y multiplicación van de izquierda a derecha: ${a} ÷ ${b} = ${a / b}, y ${a / b} × ${c} = ${res}.`; }
  else if (t === 2) { const a = entre(10, 20), b = entre(2, 6), c = entre(2, 6), d = entre(1, 9); expr = `${a} − ${b} × ${c} + ${d}`; res = a - b * c + d; explica = `Primero ${b} × ${c} = ${b * c}. Después, de izquierda a derecha: ${a} − ${b * c} + ${d} = ${res}.`; }
  else { const c = entre(2, 5), b = c * entre(2, 6), a = entre(2, 9), d = entre(1, 5); expr = `${a} + ${b} ÷ ${c} − ${d}`; res = a + b / c - d; explica = `Primero ${b} ÷ ${c} = ${b / c}. Después ${a} + ${b / c} − ${d} = ${res}.`; }
  return {
    tipo: 'operacion', clave: { modo: 'numero', valor: res }, titulo: [['Resuelve', false], ['sin calculadora', true]],
    cuerpo(ctx, b) {
      const linea = `${expr} = ?`; let s = 150;
      do { ctx.font = `400 ${s}px ${BLACK}`; s -= 6; } while (ctx.measureText(linea).width > b.w - 40 && s > 60);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(b.x, b.y + b.h * 0.2, b.w, b.h * 0.42, 36); ctx.fill();
      ctx.strokeStyle = TINTA; ctx.lineWidth = 6; ctx.stroke();
      ctx.fillStyle = TINTA; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(linea, b.x + b.w / 2, b.y + b.h * 0.41 + 4);
      ctx.font = `600 46px ${SANS}`; ctx.fillStyle = '#555'; ctx.fillText('Cuidado con el orden de las operaciones', b.x + b.w / 2, b.y + b.h * 0.78);
    },
    texto: `🧮 ¿Cuánto da ${expr}? La mayoría se equivoca por el orden de las operaciones.${OCULTAR}✅ Respuesta: ${res}. ${explica}\n\n${TAGS} #matematicas #calculomental`
  };
}

const GEN = { duplicado, diferente, fraccion, nombre, operacion };
export const crearVisual = (tipo) => GEN[tipo]();

// ---------- dibujo: fondo claro, pregunta grande con palabras resaltadas, el reto y la marca abajo ----------
export function dibujarVisual(v, { W = 1080, H = 1350, emojiFont = '' } = {}) {
  const cv = createCanvas(W, H), ctx = cv.getContext('2d'), emoji = emojiFont || 'sans-serif';
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fdfaf2'); g.addColorStop(1, '#efe8d8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,0,0,0.045)'; ctx.lineWidth = 3;
  for (let r = 80; r < 700; r += 60) { ctx.beginPath(); ctx.arc(W * 0.95, H * 0.95, r, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(W * 0.04, H * 0.04, r * 0.7, 0, Math.PI * 2); ctx.stroke(); }

  // Título: palabras en negro y las resaltadas en rojo, centrado, el tamaño más grande que quepa en 3 líneas
  const palabras = v.titulo.flatMap(([t, r]) => t.split(' ').map((w) => ({ w, r })));
  const pad = 70, maxW = W - pad * 2, top = H > 1500 ? 230 : 70;
  let size = 96, lineas;
  for (; size >= 54; size -= 4) {
    ctx.font = `400 ${size}px ${BLACK}, ${emoji}`; lineas = [[]]; let ancho = 0;
    for (const p of palabras) { const w = ctx.measureText(p.w + ' ').width; if (ancho + w > maxW && lineas.at(-1).length) { lineas.push([]); ancho = 0; } lineas.at(-1).push(p); ancho += w; }
    if (lineas.length <= 3) break;
  }
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  lineas.forEach((l, i) => {
    const total = ctx.measureText(l.map((p) => p.w).join(' ')).width; let x = (W - total) / 2;
    for (const p of l) { ctx.fillStyle = p.r ? ROJO : TINTA; ctx.fillText(p.w, x, top + size * (i + 0.85) * 1.08); x += ctx.measureText(p.w + ' ').width; }
  });
  const yCuerpo = top + size * lineas.length * 1.08 + 40, pie = H > 1500 ? 260 : 110;
  v.cuerpo(ctx, { x: pad, y: yCuerpo, w: W - pad * 2, h: H - yCuerpo - pie }, emoji);

  // Marca
  ctx.font = `400 34px ${BLACK}`; const bw = ctx.measureText('Potter Play').width, bx = (W - bw) / 2 + 22, by = H - (H > 1500 ? 200 : 52);
  ctx.strokeStyle = ROJO; ctx.lineWidth = 3; for (const r of [7, 13, 19]) { ctx.beginPath(); ctx.arc(bx - 34, by - 12, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = TINTA; ctx.textAlign = 'left'; ctx.fillText('Potter Play', bx, by);
  return cv;
}
