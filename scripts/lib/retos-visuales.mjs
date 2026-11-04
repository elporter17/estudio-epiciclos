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

// ---------- niveles ----------
// 0 fácil · 1 medio · 2 difícil · 3 imposible · 4 GOD. Cada tipo sube la dificultad a su manera (cuadrícula más grande,
// símbolos más parecidos, más partes, nombres más largos, operaciones con más pasos).
export const NIVELES = [
  { nombre: 'FÁCIL', emoji: '🟢', color: '#1f8a5b' },
  { nombre: 'MEDIO', emoji: '🟡', color: '#c99a06' },
  { nombre: 'DIFÍCIL', emoji: '🟠', color: '#d9661f' },
  { nombre: 'IMPOSIBLE', emoji: '🔥', color: '#d7263d' },
  { nombre: 'GOD', emoji: '💀', color: '#141414' }
];
const nv = (n) => Math.max(0, Math.min(4, n ?? 1));
const frase = ['Calentamiento', 'Ya no tan fácil', 'Aquí empieza lo bueno', 'Casi nadie lo saca', 'Solo para genios'];

// ---------- generadores: { tipo, nivel, clave, titulo: [[texto, resaltar]], cuerpo(ctx, caja, emoji), texto } ----------
// clave: la respuesta correcta en una forma que scripts/lib/respuestas.mjs sabe comparar con un comentario
function duplicado(nivel) {
  // Más casillas en cada nivel; desde «imposible», números de 3 cifras con los mismos dígitos (se confunden)
  const [filas, cols] = [[4, 4], [4, 5], [5, 6], [6, 7], [7, 8]][nivel], n = filas * cols;
  // 4 dígitos dan 64 números distintos (alcanza para 7 × 8); en GOD, los que más se confunden entre sí
  const digitos = nivel === 4 ? ['3', '6', '8', '9'] : nivel === 3 ? mezclar(['1', '3', '5', '6', '8', '9']).slice(0, 4) : null;
  const pool = digitos ? [...new Set(Array.from({ length: 400 }, () => Array.from({ length: 3 }, () => azar(digitos)).join('')))].filter((x) => x[0] !== '0').map(Number)
    : Array.from({ length: 90 }, (_, i) => i + 10);
  const nums = mezclar(pool).slice(0, n);
  while (nums.length < n) nums.push(nums[nums.length % pool.length] + 1000); // no pasa con estos tamaños
  let i, j;
  do { i = entre(0, n - 1); j = entre(0, n - 1); } while (i === j || Math.abs(Math.floor(i / cols) - Math.floor(j / cols)) < 1);
  nums[j] = nums[i];
  const [c1, c2] = azar(PALETAS), fila = (k) => Math.floor(k / cols) + 1;
  let lay;
  return {
    corta: `¡EL ${nums[i]}!`,
    revelar(ctx, t) {
      if (!lay) return; ctx.strokeStyle = ROJO; ctx.lineWidth = 10;
      for (const k of [i, j]) { const x = lay.x0 + (k % cols) * (lay.s + lay.gap), y = lay.y0 + Math.floor(k / cols) * (lay.s + lay.gap), r = lay.s * (0.62 + 0.04 * Math.sin(t * 8)); ctx.beginPath(); ctx.arc(x + lay.s / 2, y + lay.s / 2, r, 0, Math.PI * 2); ctx.stroke(); }
    },
    tipo: 'duplicado', nivel, clave: { modo: 'numero', valor: nums[i] }, titulo: [['¿Cuál es el número', false], ['DUPLICADO?', true]],
    cuerpo(ctx, b) {
      const gap = nivel >= 3 ? 12 : 18, s = Math.min((b.w - gap * (cols - 1)) / cols, (b.h - gap * (filas - 1)) / filas), x0 = b.x + (b.w - (s * cols + gap * (cols - 1))) / 2, y0 = b.y + (b.h - (s * filas + gap * (filas - 1))) / 2;
      lay = { x0, y0, s, gap };
      nums.forEach((v, k) => {
        const x = x0 + (k % cols) * (s + gap), y = y0 + Math.floor(k / cols) * (s + gap);
        const g = ctx.createLinearGradient(x, y, x, y + s); g.addColorStop(0, c1); g.addColorStop(1, c2);
        ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, s, s, Math.round(s * 0.16)); ctx.fill();
        ctx.fillStyle = '#fff8ec'; ctx.font = `400 ${Math.round(s * (String(v).length > 2 ? 0.34 : 0.42))}px ${BLACK}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(v), x + s / 2, y + s / 2 + 4);
      });
    },
    texto: `👀 Nivel ${NIVELES[nivel].nombre} ${NIVELES[nivel].emoji}: ¿qué número está repetido entre los ${n}? ${frase[nivel]}.${OCULTAR}✅ Respuesta: el ${nums[i]} (está en la fila ${fila(i)} y en la fila ${fila(j)}).\n\n${TAGS} #observacion`
  };
}

// Pares de símbolos por nivel: cada vez más parecidos, y la cuadrícula más grande
const PARES = [
  [['🙂', '🙃', 'emoji'], ['⚽', '🏐', 'emoji'], ['🐻', '🐼', 'emoji'], ['E', 'F', 'letra'], ['🍎', '🍐', 'emoji']],
  [['O', 'Q', 'letra'], ['M', 'N', 'letra'], ['P', 'R', 'letra'], ['🍊', '🍑', 'emoji'], ['3', '8', 'número']],
  [['b', 'd', 'letra'], ['C', 'G', 'letra'], ['6', '9', 'número'], ['🍎', '🍅', 'emoji'], ['5', 'S', 'letra']],
  [['😀', '😃', 'emoji'], ['n', 'h', 'letra'], ['V', 'Y', 'letra'], ['E', 'B', 'letra'], ['u', 'v', 'letra']],
  [['O', '0', 'número'], ['I', 'l', 'letra'], ['8', 'B', 'letra'], ['Z', '2', 'número'], ['😐', '😑', 'emoji']]
];
function diferente(nivel) {
  const [base, raro, clase] = azar(PARES[nivel]), [cols, filas] = [[6, 8], [8, 10], [9, 12], [10, 13], [11, 14]][nivel], pos = entre(0, cols * filas - 1);
  let lay;
  const titulo = clase === 'emoji' ? [['Encuentra el', false], ['emoji diferente', true]] : clase === 'número' ? [['Encuentra el', false], [raro, true], ['escondido', false]] : [['Encuentra la', false], [raro, true], ['escondida', false]];
  return {
    corta: `FILA ${Math.floor(pos / cols) + 1} · COLUMNA ${pos % cols + 1}`,
    revelar(ctx, t) {
      if (!lay) return; const cx = lay.x0 + (pos % cols + 0.5) * lay.s, cy = lay.y0 + (Math.floor(pos / cols) + 0.5) * lay.s;
      ctx.strokeStyle = ROJO; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, lay.s * (0.62 + 0.05 * Math.sin(t * 8)), 0, Math.PI * 2); ctx.stroke();
    },
    tipo: 'diferente', nivel, clave: { modo: 'posicion', fila: Math.floor(pos / cols) + 1, col: pos % cols + 1 }, titulo,
    cuerpo(ctx, b, emoji) {
      const s = Math.min(b.w / cols, b.h / filas), x0 = b.x + (b.w - s * cols) / 2, y0 = b.y + (b.h - s * filas) / 2;
      lay = { x0, y0, s };
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(x0 - 16, y0 - 16, s * cols + 32, s * filas + 32, 26); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = TINTA;
      ctx.font = clase === 'emoji' ? `${Math.round(s * 0.66)}px ${emoji}` : `700 ${Math.round(s * 0.7)}px ${SANS}`;
      for (let k = 0; k < cols * filas; k++) ctx.fillText(k === pos ? raro : base, x0 + (k % cols + 0.5) * s, y0 + (Math.floor(k / cols) + 0.5) * s + 2);
    },
    texto: `🔎 Nivel ${NIVELES[nivel].nombre} ${NIVELES[nivel].emoji}: ${clase === 'emoji' ? 'hay un emoji distinto a los demás' : `hay ${clase === 'número' ? 'un' : 'una'} ${raro} entre ${clase === 'número' ? 'los' : 'las'} ${base}`}. ¿En qué fila y columna está? ${frase[nivel]}.${OCULTAR}✅ Respuesta: fila ${Math.floor(pos / cols) + 1}, columna ${pos % cols + 1} (contando desde arriba a la izquierda).\n\n${TAGS} #observacion`
  };
}

function fraccion(nivel) {
  // Más partes en cada nivel; desde «difícil», las pintadas van sueltas (hay que contarlas una por una)
  const n = azar([[4, 6], [6, 8], [10, 12], [14, 16], [18, 20, 24]][nivel]); let k;
  // Desde «difícil», ni muy pocas ni casi todas pintadas: hay que contar de verdad
  do { k = nivel >= 2 ? entre(Math.ceil(n / 4), Math.floor((3 * n) / 4)) : entre(2, n - 1); } while (k * 2 === n);
  const mcd = (a, c) => (c ? mcd(c, a % c) : a), d = mcd(k, n), inicio = entre(0, n - 1);
  const sueltas = nivel >= 2 || (nivel === 1 && Math.random() < 0.5);
  const pintadas = new Set(!sueltas ? Array.from({ length: k }, (_, i) => (inicio + i) % n) : mezclar(Array.from({ length: n }, (_, i) => i)).slice(0, k));
  return {
    corta: `¡${k}/${n}!`, revelar() {},
    tipo: 'fraccion', nivel, clave: { modo: 'fraccion', k, n }, titulo: [['¿Qué', false], ['fracción', true], ['del círculo está', false], ['pintada?', true]],
    cuerpo(ctx, b) {
      const r = Math.min(b.w, b.h) / 2 * 0.92, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      for (let i = 0; i < n; i++) {
        const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n, a1 = a0 + (2 * Math.PI) / n;
        ctx.fillStyle = pintadas.has(i) ? '#14834f' : '#ffffff'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = TINTA; ctx.lineWidth = nivel >= 3 ? 5 : 7;
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    },
    texto: `🟢 Nivel ${NIVELES[nivel].nombre} ${NIVELES[nivel].emoji}: ¿qué fracción del círculo está pintada de verde? ${nivel >= 3 ? 'Cuenta bien: son muchas partes.' : 'Parece fácil… pero cuenta bien las partes.'}${OCULTAR}✅ Respuesta: ${k}/${n}${d > 1 ? `, que simplificado es ${k / d}/${n / d}` : ''}. El círculo tiene ${n} partes iguales y ${k} están pintadas.\n\n${TAGS} #matematicas #fracciones`
  };
}

function nombre(nivel) {
  // Nombres de una sola palabra de la biblioteca, sin tildes. Fácil: cortos y con 2 letras de pista; GOD: largos,
  // que empiecen con una pista de 3 letras y con pocos que cumplan
  const original = new Map(BIBLIOTECA.nombres.filter((x) => !/\s/.test(x)).map((x) => [sinAcentos(x), x])), lista = [...original.keys()];
  const [min, max, m, minEj] = [[4, 5, 2, 5], [5, 6, 2, 4], [6, 7, 2, 3], [7, 8, 3, 3], [8, 12, 3, 3]][nivel];
  let opciones = [], empieza = nivel >= 2 ? Math.random() < 0.6 : Math.random() < 0.3;
  for (const e of [empieza, !empieza]) {
    const grupos = new Map();
    for (const x of lista) {
      if (x.length < Math.max(min, m + 2) || x.length > max) continue;
      const pista = e ? x.slice(0, m) : x.slice(-m), k = `${x.length}|${pista}`;
      grupos.set(k, [...(grupos.get(k) || []), x]);
    }
    opciones = [...grupos].filter(([, v]) => v.length >= minEj);
    if (opciones.length) { empieza = e; break; }
  }
  if (!opciones.length) return nombre(Math.max(0, nivel - 1));
  const [k, ejemplos] = azar(opciones), [largo, pista] = k.split('|'), L = +largo, muestra = ejemplos[0];
  let lay;
  return {
    corta: `¡${original.get(muestra).toUpperCase()}!`,
    revelar(ctx) {
      if (!lay) return; ctx.fillStyle = '#14834f'; ctx.font = `400 ${Math.round(lay.s * 0.55)}px ${BLACK}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < L; i++) { const dada = empieza ? i < pista.length : i >= L - pista.length; if (!dada) ctx.fillText(muestra[i], lay.x0 + i * (lay.s + 12) + lay.s / 2, lay.y + lay.s / 2 + 3); }
    },
    tipo: 'nombre', nivel, clave: { modo: 'patron', largo: L, pista, empieza }, titulo: [['Un nombre de', false], [`${L} letras`, true], [empieza ? 'que empiece con' : 'que termine en', false], [pista, true]],
    cuerpo(ctx, b, emoji) {
      const s = Math.min(150, (b.w - 12 * (L - 1)) / L), x0 = b.x + (b.w - (s * L + 12 * (L - 1))) / 2, y = b.y + b.h * 0.22;
      lay = { x0, y, s };
      for (let i = 0; i < L; i++) {
        const x = x0 + i * (s + 12), letra = empieza ? (i < pista.length ? pista[i] : '') : (i >= L - pista.length ? pista[i - (L - pista.length)] : '');
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = TINTA; ctx.lineWidth = 5; ctx.beginPath(); ctx.rect(x, y, s, s); ctx.fill(); ctx.stroke();
        if (letra) { ctx.fillStyle = TINTA; ctx.font = `400 ${Math.round(s * 0.55)}px ${BLACK}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letra, x + s / 2, y + s / 2 + 3); }
      }
      ctx.font = `${Math.round(b.h * 0.3)}px ${emoji}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(nivel >= 3 ? '🤯' : '🤔', b.x + b.w / 2, y + s + b.h * 0.3);
    },
    texto: `✍️ Nivel ${NIVELES[nivel].nombre} ${NIVELES[nivel].emoji}: un nombre de ${L} letras que ${empieza ? 'empiece con' : 'termine en'} ${pista}. ${frase[nivel]}.${OCULTAR}💡 Algunos: ${ejemplos.slice(0, 5).map((x) => original.get(x)).join(', ')}${ejemplos.length > 5 ? '… ¡y hay más!' : '.'}\n\n${TAGS} #nombres #palabras`
  };
}

function operacion(nivel) {
  let expr, res, explica;
  if (nivel === 0) { const a = entre(2, 9), b = entre(2, 5), c = entre(2, 5); expr = `${a} + ${b} × ${c}`; res = a + b * c; explica = `Primero la multiplicación: ${b} × ${c} = ${b * c}. Después ${a} + ${b * c} = ${res}.`; }
  else if (nivel === 1) {
    if (Math.random() < 0.5) { const a = entre(3, 9); expr = `${a} + ${a} × 0 + ${a}`; res = 2 * a; explica = `Primero la multiplicación: ${a} × 0 = 0. Queda ${a} + 0 + ${a} = ${res}.`; }
    else { const b = entre(2, 6), c = entre(2, 5), a = b * c * entre(1, 3); expr = `${a} ÷ ${b} × ${c}`; res = (a / b) * c; explica = `División y multiplicación van de izquierda a derecha: ${a} ÷ ${b} = ${a / b}, y ${a / b} × ${c} = ${res}.`; }
  } else if (nivel === 2) {
    if (Math.random() < 0.5) { const a = entre(10, 20), b = entre(2, 6), c = entre(2, 6), d = entre(1, 9); expr = `${a} − ${b} × ${c} + ${d}`; res = a - b * c + d; explica = `Primero ${b} × ${c} = ${b * c}. Después, de izquierda a derecha: ${a} − ${b * c} + ${d} = ${res}.`; }
    else { const c = entre(2, 5), b = c * entre(2, 6), a = entre(2, 9), d = entre(1, 5); expr = `${a} + ${b} ÷ ${c} − ${d}`; res = a + b / c - d; explica = `Primero ${b} ÷ ${c} = ${b / c}. Después ${a} + ${b / c} − ${d} = ${res}.`; }
  } else if (nivel === 3) {
    // Paréntesis + división + multiplicación: hay que respetar todo el orden
    const c = entre(2, 4), d = entre(1, 4), b = (c + d) * entre(2, 4), a = entre(2, 9), e = entre(2, 5);
    expr = `${a} × ${e} − ${b} ÷ (${c} + ${d})`; res = a * e - b / (c + d);
    explica = `Primero el paréntesis: ${c} + ${d} = ${c + d}. Luego ${a} × ${e} = ${a * e} y ${b} ÷ ${c + d} = ${b / (c + d)}. Al final ${a * e} − ${b / (c + d)} = ${res}.`;
  } else {
    // GOD: cinco números, la división primero, la multiplicación de izquierda a derecha y una resta que engaña
    const c = entre(2, 4), b = c * entre(3, 6), d = entre(2, 4), a = entre(10, 30), e = entre(2, 6), f = entre(2, 4);
    expr = `${a} − ${b} ÷ ${c} × ${d} + ${e} × ${f}`; res = a - (b / c) * d + e * f;
    explica = `De izquierda a derecha con × y ÷ primero: ${b} ÷ ${c} = ${b / c}, × ${d} = ${(b / c) * d}; ${e} × ${f} = ${e * f}. Queda ${a} − ${(b / c) * d} + ${e * f} = ${res}.`;
  }
  return {
    corta: `¡${res}!`, revelar() {},
    tipo: 'operacion', nivel, clave: { modo: 'numero', valor: res }, titulo: [['Resuelve', false], ['sin calculadora', true]],
    cuerpo(ctx, b) {
      const linea = `${expr} = ?`; let s = 150;
      do { ctx.font = `400 ${s}px ${BLACK}`; s -= 6; } while (ctx.measureText(linea).width > b.w - 40 && s > 48);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(b.x, b.y + b.h * 0.2, b.w, b.h * 0.42, 36); ctx.fill();
      ctx.strokeStyle = TINTA; ctx.lineWidth = 6; ctx.stroke();
      ctx.fillStyle = TINTA; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(linea, b.x + b.w / 2, b.y + b.h * 0.41 + 4);
      ctx.font = `600 46px ${SANS}`; ctx.fillStyle = '#555'; ctx.fillText(nivel >= 3 ? 'Paréntesis, × y ÷, y después + y −' : 'Cuidado con el orden de las operaciones', b.x + b.w / 2, b.y + b.h * 0.78);
    },
    texto: `🧮 Nivel ${NIVELES[nivel].nombre} ${NIVELES[nivel].emoji}: ¿cuánto da ${expr}? ${frase[nivel]}.${OCULTAR}✅ Respuesta: ${res}. ${explica}\n\n${TAGS} #matematicas #calculomental`
  };
}

const GEN = { duplicado, diferente, fraccion, nombre, operacion };
// nivel: 0 fácil … 4 GOD (sin nivel: medio, como antes)
export const crearVisual = (tipo, nivel) => GEN[tipo](nv(nivel));

// Insignia del nivel («NIVEL 4 · IMPOSIBLE 🔴»), centrada en cx
export function insigniaNivel(ctx, nivel, cx, y, { emoji = 'sans-serif', size = 40 } = {}) {
  const N = NIVELES[nv(nivel)], txt = `NIVEL ${nv(nivel) + 1} · ${N.nombre}`;
  ctx.font = `400 ${size}px ${BLACK}`; const tw = ctx.measureText(txt).width, ew = size * 1.05, sep = size * 0.4, h = size * 1.7, w = tw + sep + ew + size * 1.4;
  const x = cx - w / 2;
  ctx.fillStyle = N.color; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x + size * 0.7, y + h / 2 + 2);
  ctx.font = `${Math.round(size * 0.9)}px ${emoji}`; ctx.fillText(N.emoji, x + size * 0.7 + tw + sep, y + h / 2 + 2);
  return y + h;
}

// ---------- dibujo: fondo claro, pregunta grande con palabras resaltadas, el reto y la marca abajo ----------
export function dibujarVisual(v, { W = 1080, H = 1350, emojiFont = '' } = {}) {
  const cv = createCanvas(W, H), ctx = cv.getContext('2d'), emoji = emojiFont || 'sans-serif';
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fdfaf2'); g.addColorStop(1, '#efe8d8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,0,0,0.045)'; ctx.lineWidth = 3;
  for (let r = 80; r < 700; r += 60) { ctx.beginPath(); ctx.arc(W * 0.95, H * 0.95, r, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(W * 0.04, H * 0.04, r * 0.7, 0, Math.PI * 2); ctx.stroke(); }

  const pad = 70; let top = H > 1500 ? 230 : 70;
  if (v.nivel != null) top = insigniaNivel(ctx, v.nivel, W / 2, top - (H > 1500 ? 40 : 30), { emoji }) + 26;
  const yCuerpo = tituloVisual(ctx, v, { W, top, emoji, maxSize: v.nivel != null ? 88 : 96 }) + 40, pie = H > 1500 ? 260 : 110;
  v.cuerpo(ctx, { x: pad, y: yCuerpo, w: W - pad * 2, h: H - yCuerpo - pie }, emoji);
  marcaVisual(ctx, W, H - (H > 1500 ? 200 : 52));
  return cv;
}

// Título: palabras en negro y las resaltadas en rojo, centrado, el tamaño más grande que quepa en 3 líneas.
// Devuelve dónde termina.
export function tituloVisual(ctx, v, { W = 1080, top = 70, emoji = 'sans-serif', maxSize = 96 } = {}) {
  const palabras = v.titulo.flatMap(([t, r]) => t.split(' ').map((w) => ({ w, r })));
  const maxW = W - 140;
  let size = maxSize, lineas;
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
  return top + size * lineas.length * 1.08;
}
export function marcaVisual(ctx, W, by) {
  ctx.font = `400 34px ${BLACK}`; const bw = ctx.measureText('Potter Play').width, bx = (W - bw) / 2 + 22;
  ctx.strokeStyle = ROJO; ctx.lineWidth = 3; for (const r of [7, 13, 19]) { ctx.beginPath(); ctx.arc(bx - 34, by - 12, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = TINTA; ctx.textAlign = 'left'; ctx.fillText('Potter Play', bx, by);
}
