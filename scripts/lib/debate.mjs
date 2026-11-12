// Retos de debate (2026-11-06), hechos para que la gente comente: la «ley de Cunningham» (la mejor forma de conseguir la
// respuesta correcta en internet es publicar la incorrecta). Sin IA, con estilo de cuaderno y pizarrón escrito a mano.
//   error   «Mi profe me lo marcó mal y yo digo que está bien»: una tarea resuelta MAL con toda seguridad; la gente
//           entra a corregir y a explicar por qué
//   divide  «El 90 % falla»: operaciones y acertijos que parten a la gente en dos bandos (6 ÷ 2(1+2): ¿1 o 9?)
//   cuenta  «¿Cuántos ves?»: cuadrados, triángulos o rectángulos; casi nadie da el mismo número
// La respuesta NO se da en la publicación: scripts/comentarios.mjs la publica como comentario unas horas después
// (clave { modo: 'debate', revelar }), y mientras tanto contesta sin decir quién tiene razón.
// Solo matemáticas, lógica y datos curiosos sin riesgo: nunca salud, noticias ni nada que confunda si se lee suelto.
import { MARCA } from './marca.mjs';
import { createCanvas } from '@napi-rs/canvas';

export const TIPOS_DEBATE = ['error', 'divide', 'cuenta'];
const MANO = '"Kalam", "IBM Plex Sans", sans-serif', BLACK = '"Archivo Black", Impact, sans-serif', SANS = '"IBM Plex Sans", system-ui, sans-serif';
const TINTA = '#1d3fa8', ROJO = '#d42a2a', TIZA = '#f4f1e8', AMARILLO = '#ffd166';
const azar = (a) => a[Math.floor(Math.random() * a.length)];
const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (x) => Math.max(0, Math.min(1, x));
const OCULTAR = '\n\n.\n.\n.\n\n';
const TAGS = '#retos #debate #acertijos #matematicas #potterplay';
// Generador con semilla (las manchas de tiza no pueden cambiar de un cuadro a otro del video)
const rng = (s) => { let a = [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) || 1; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
const fmt = (n) => String(n).replace('.', ',').replace('-', '−');

// ---------- «Error a propósito» ----------
// Datos: la respuesta equivocada es la que mucha gente cree (así más gente se siente segura para corregir)
const DATOS = [
  ['¿Cuál es la capital de Australia?', 'Sídney', 'Canberra', 'Sídney es la ciudad más grande, pero la capital es Canberra desde 1913.'],
  ['¿Cuál es la capital de Canadá?', 'Toronto', 'Ottawa', 'Toronto es la más grande; la capital es Ottawa.'],
  ['¿Cuántos corazones tiene un pulpo?', '1', '3', 'Tiene 3: dos bombean sangre a las branquias y uno al resto del cuerpo.'],
  ['¿Cuál es el planeta más caliente?', 'Mercurio', 'Venus', 'Mercurio está más cerca del Sol, pero Venus es más caliente: su atmósfera atrapa el calor (unos 465 °C).'],
  ['¿En qué museo está la Mona Lisa?', 'El Prado', 'El Louvre', 'Está en el Museo del Louvre, en París.'],
  ['¿Las arañas son insectos?', 'Sí', 'No', 'Son arácnidos: tienen 8 patas y los insectos tienen 6.'],
  ['¿Qué guardan los camellos en la joroba?', 'Agua', 'Grasa', 'Guardan grasa, que les sirve de energía cuando no hay comida.'],
  ['¿Cuántos huesos tiene un adulto?', '300', '206', 'Un adulto tiene 206; los bebés nacen con unos 300 que se van uniendo.'],
  ['¿Cuál es el animal terrestre más rápido?', 'El león', 'El guepardo', 'El guepardo llega a unos 110 km/h.'],
  ['¿Cuál es el océano más grande?', 'El Atlántico', 'El Pacífico', 'El Pacífico es el más grande: cubre casi un tercio del planeta.'],
  ['¿En qué año llegó el ser humano a la Luna?', '1972', '1969', 'Fue el 20 de julio de 1969, con el Apolo 11 (en 1972 fue la última misión).'],
  ['¿Cuántos minutos tiene un día?', '1.240', '1.440', '24 horas × 60 minutos = 1.440.'],
  ['¿Honduras tiene costa en el océano Pacífico?', 'No', 'Sí', 'Sí: en el Golfo de Fonseca, además de su costa en el Caribe.'],
  ['¿Cuántas patas tiene un insecto?', '8', '6', 'Los insectos tienen 6 patas; las de 8 son arácnidos.'],
  ['¿Cuál es el río más largo de América?', 'El Misisipi', 'El Amazonas', 'El Amazonas, con unos 7.000 km.'],
  ['¿Los murciélagos son ciegos?', 'Sí', 'No', 'Ven, y además se orientan con ecolocalización.'],
  ['¿Un rayo puede caer dos veces en el mismo lugar?', 'Nunca', 'Sí', 'Puede, y pasa: al Empire State le caen unos 20 rayos al año.'],
  ['¿Cuántos lados tiene un hexágono?', '8', '6', 'Hexa = 6. El de 8 lados es el octágono.'],
  ['¿Cuál es el país más grande del mundo?', 'China', 'Rusia', 'Rusia, con unos 17 millones de km²; China es el cuarto.'],
  ['¿Cuántos continentes tocan el ecuador?', '2', '3', 'América, África y Asia (por Indonesia).']
];
function errorMate() {
  const t = entre(0, 7);
  if (t === 0) { const a = entre(2, 9), b = entre(2, 9), c = entre(2, 9); return [`${a} + ${b} × ${c} =`, fmt((a + b) * c), fmt(a + b * c), `Primero la multiplicación: ${b} × ${c} = ${b * c}, y después ${a} + ${b * c} = ${a + b * c}.`]; }
  if (t === 1) { const a = entre(12, 30), b = entre(2, 9), c = entre(2, 9); return [`${a} − ${b} + ${c} =`, fmt(a - (b + c)), fmt(a - b + c), `Suma y resta van de izquierda a derecha: ${a} − ${b} = ${a - b}, y ${a - b} + ${c} = ${a - b + c}.`]; }
  if (t === 2) { const [a, b] = azar([[2, 3], [2, 5], [3, 4], [2, 4], [3, 5]]), n = a + b, d = a * b; return [`1/${a} + 1/${b} =`, `2/${a + b}`, `${n}/${d}`, `No se suman los de abajo: 1/${a} + 1/${b} = ${b}/${d} + ${a}/${d} = ${n}/${d}.`]; }
  if (t === 3) { const a = entre(3, 9); return [`${a}² =`, fmt(2 * a), fmt(a * a), `Al cuadrado es ${a} × ${a} = ${a * a}, no ${a} × 2.`]; }
  if (t === 4) { const a = entre(2, 9); return [`−${a}² =`, fmt(a * a), fmt(-a * a), `La potencia va primero y el signo después: −(${a}²) = −${a * a}. Si fuera (−${a})², sí daría ${a * a}.`]; }
  if (t === 5) { const [a, b] = azar([[5, 25], [2, 15], [4, 35], [3, 45]]); return [`0,${a} + 0,${b} =`, `0,${a + b}`, fmt((a / 10 + b / 100).toFixed(2)), `0,${a} es 0,${a}0; 0,${a}0 + 0,${b} = ${fmt((a / 10 + b / 100).toFixed(2))}.`]; }
  if (t === 6) { const p = azar([10, 20, 25, 30]), n = azar([40, 50, 60, 80]); return [`El ${p} % de ${n} =`, fmt(p), fmt((p * n) / 100), `${p} % de ${n} = ${n} × ${p} ÷ 100 = ${(p * n) / 100}.`]; }
  const a = entre(3, 9); return [`${a} × 0 + ${a} =`, '0', fmt(a), `Primero ${a} × 0 = 0, y después 0 + ${a} = ${a}.`];
}
function error() {
  const mate = Math.random() < 0.55, [pregunta, malo, bien, explica] = mate ? errorMate() : azar(DATOS);
  const sello = rng(pregunta + malo);
  return {
    tipo: 'error', gancho: [['Mi profe me lo marcó', false], ['MAL', true], ['y yo digo que está', false], ['BIEN', true]],
    voz: 'Mi profe me marcó esto mal. Yo digo que está bien. ¿Quién tiene razón?',
    correcta: bien, comun: malo, explica, pregunta: mate ? `${pregunta} ${bien}` : pregunta,
    texto: `😤 Mi profe me lo marcó MAL… y yo digo que está BIEN. ¿Quién tiene razón: yo o el profe? Explícalo en los comentarios 👇${OCULTAR}La respuesta la doy en los comentarios en unas horas 👀\n\n${TAGS} #tarea #profe`,
    revelar: `✅ La respuesta: ${bien}. ${explica} Tenían razón los que corrigieron 👏 (y el profe 😅)`,
    dibujar(ctx, b, p = 1) {
      hoja(ctx, b, sello);
      const x = b.x + 150, ancho = b.w - 210, paso = Math.round(b.h / 12);
      let y = b.y + paso * 1.6;
      escribir(ctx, 'Tarea:', x, y, { size: Math.round(paso * 0.62), color: '#6b7fae', p: clamp(p * 4) });
      y += paso * 1.15;
      const fp = ajustar(ctx, pregunta, ancho, mate ? 120 : 74, 46, MANO, 700);
      fp.lineas.forEach((l, i) => escribir(ctx, l, x, y + i * fp.size * 1.25, { size: fp.size, color: TINTA, p: clamp((p - 0.1) * 3 - i * 0.6) }));
      y += fp.lineas.length * fp.size * 1.25 + paso * 0.5;
      const fr = ajustar(ctx, mate ? malo : `R: ${malo}`, ancho - 220, mate ? 150 : 96, 40, MANO, 700, 1);
      const anchoR = escribir(ctx, fr.lineas[0], x + (mate ? 40 : 0), y + fr.size * 0.4, { size: fr.size, color: TINTA, p: clamp((p - 0.45) * 4) });
      // La X roja del profe, y su nota
      const q = clamp((p - 0.72) / 0.2), cx = x + (mate ? 40 : 0) + anchoR + fr.size * 0.75, cy = y;
      if (q > 0) {
        ctx.strokeStyle = ROJO; ctx.lineWidth = 12; ctx.lineCap = 'round'; const r = fr.size * 0.45;
        ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx - r + 2 * r * clamp(q * 2), cy - r + 2 * r * clamp(q * 2)); ctx.stroke();
        if (q > 0.5) { ctx.beginPath(); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx + r - 2 * r * clamp(q * 2 - 1), cy - r + 2 * r * clamp(q * 2 - 1)); ctx.stroke(); }
        ctx.lineCap = 'butt';
        ctx.save(); ctx.translate(cx + r + 30, cy - r * 0.2); ctx.rotate(-0.12); escribir(ctx, '¡Mal!', 0, 0, { size: Math.round(fr.size * 0.55), color: ROJO, p: clamp(q * 2 - 1) }); ctx.restore();
      }
      // La nota adhesiva: «yo digo que está bien»
      const n = clamp((p - 0.86) / 0.14);
      if (n > 0) postit(ctx, b.x + b.w - 430, b.y + b.h - 330, 360, 280, ['Yo digo que', 'está BIEN', '¿quién tiene', 'razón?'], n, sello);
    }
  };
}

// ---------- «El 90 % falla» ----------
const DIVIDE = [
  ['6 ÷ 2(1+2) = ?', '9', '1', 'Con la regla de siempre (× y ÷ de izquierda a derecha): 6 ÷ 2 = 3, y 3 × 3 = 9. Algunas calculadoras dan 1 porque toman 2(1+2) como un solo bloque: por eso divide a internet.'],
  ['8 ÷ 2(2+2) = ?', '16', '1', 'De izquierda a derecha: 8 ÷ 2 = 4, y 4 × 4 = 16. Quien da 1 multiplica primero 2(2+2).'],
  ['1 + 1 + 1 + 1 + 1 + 1 × 0 + 1 = ?', '6', '0', 'Primero la multiplicación: 1 × 0 = 0. Queda 1 + 1 + 1 + 1 + 1 + 0 + 1 = 6.'],
  ['3 − 3 × 6 + 2 = ?', '−13', '2', 'Primero 3 × 6 = 18. Después 3 − 18 + 2 = −13.'],
  ['9 − 3 ÷ 1/3 + 1 = ?', '1', '9', '3 ÷ 1/3 = 9 (dividir entre un tercio es multiplicar por 3). Queda 9 − 9 + 1 = 1.'],
  ['7 + 7 ÷ 7 + 7 × 7 − 7 = ?', '50', '56', '7 ÷ 7 = 1 y 7 × 7 = 49. Queda 7 + 1 + 49 − 7 = 50.'],
  ['50 + 50 − 25 × 0 + 2 + 2 = ?', '104', '4', '25 × 0 = 0. Queda 50 + 50 − 0 + 2 + 2 = 104.'],
  ['2 + 2 × 2 − 2 ÷ 2 = ?', '5', '3', '2 × 2 = 4 y 2 ÷ 2 = 1. Queda 2 + 4 − 1 = 5.'],
  ['Un bate y una pelota cuestan $1.10. El bate cuesta $1 más que la pelota. ¿Cuánto cuesta la pelota?', '$0.05', '$0.10', 'Si la pelota costara $0.10, el bate costaría $1.10 y juntos $1.20. Con $0.05: bate $1.05 + pelota $0.05 = $1.10.'],
  ['5 máquinas hacen 5 piezas en 5 minutos. ¿Cuánto tardan 100 máquinas en hacer 100 piezas?', '5 min', '100 min', 'Cada máquina hace 1 pieza en 5 minutos, así que 100 máquinas hacen 100 piezas en los mismos 5 minutos.'],
  ['Unas algas se duplican cada día y cubren el lago en 48 días. ¿En cuántos días cubren la mitad?', '47', '24', 'Si se duplican cada día, un día antes de cubrirlo todo cubrían la mitad: el día 47.'],
  ['Un granjero tiene 17 ovejas. Todas menos 9 se escapan. ¿Cuántas le quedan?', '9', '8', '«Todas menos 9 se escapan»: se quedan 9.'],
  ['¿Cuántos meses del año tienen 28 días?', '12', '1', 'Todos los meses tienen (al menos) 28 días: los 12.'],
  ['En una carrera adelantas al que va de segundo. ¿En qué lugar quedas?', 'Segundo', 'Primero', 'Si lo adelantas, ocupas su lugar: quedas de segundo.'],
  ['Si 3 gatos cazan 3 ratones en 3 minutos, ¿cuántos gatos cazan 100 ratones en 100 minutos?', '3', '100', 'Cada gato caza 1 ratón cada 3 minutos: en 100 minutos, 3 gatos cazan unos 100.']
];
function divide() {
  const [pregunta, bien, malo, explica] = azar(DIVIDE), sello = rng(pregunta), opciones = Math.random() < 0.5 ? [bien, malo] : [malo, bien];
  const corta = pregunta.length < 40;
  return {
    tipo: 'divide', gancho: [['El', false], ['90 %', true], ['falla esta.', false], ['¿Y tú?', true]],
    voz: corta ? 'Casi todos fallan esta. ¿Cuánto te da?' : 'Casi todos fallan este acertijo. ¿Tú qué dices?',
    correcta: bien, comun: malo, explica, pregunta,
    texto: `🤯 El 90 % falla esta: ${pregunta}\n¿${opciones[0]} o ${opciones[1]}? Comenta tu respuesta y defiéndela 👇${OCULTAR}La respuesta la doy en los comentarios en unas horas 👀\n\n${TAGS} #logica #acertijo`,
    revelar: `✅ La respuesta: ${bien}. ${explica}`,
    dibujar(ctx, b, p = 1) {
      pizarron(ctx, b, sello);
      const x = b.x + 70, ancho = b.w - 140;
      const f = ajustar(ctx, pregunta, ancho, corta ? 112 : 64, corta ? 56 : 42, MANO, 700);
      const alto = f.lineas.length * f.size * 1.25, y0 = b.y + (corta ? b.h * 0.3 : b.h * 0.12) + f.size * 0.6;
      f.lineas.forEach((l, i) => escribir(ctx, l, b.x + b.w / 2, y0 + i * f.size * 1.25, { size: f.size, color: TIZA, p: clamp(p * 2.4 - i * 0.5), align: 'center', tiza: true }));
      // Los dos bandos
      const q = clamp((p - 0.6) / 0.35), yo = Math.max(y0 + alto + 90, b.y + b.h * 0.68);
      if (q > 0) {
        ctx.globalAlpha *= q;
        const colores = [AMARILLO, '#ff8fab'];
        opciones.forEach((o, i) => {
          const cx = b.x + b.w * (i ? 0.72 : 0.28);
          ctx.strokeStyle = colores[i]; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(cx, yo, 170, 92, 0, 0, Math.PI * 2); ctx.stroke();
          escribir(ctx, `¿${o}?`, cx, yo + 26, { size: ajustar(ctx, `¿${o}?`, 300, 84, 40, MANO, 700).size, color: colores[i], align: 'center', tiza: true });
        });
        escribir(ctx, 'o', b.x + b.w / 2, yo + 20, { size: 60, color: TIZA, align: 'center', tiza: true });
        ctx.globalAlpha = Math.min(1, ctx.globalAlpha / Math.max(q, 0.001));
      }
    }
  };
}

// ---------- «¿Cuántos ves?» ----------
function cuenta() {
  const t = azar(['cuadrados', 'cuadrados', 'triangulos', 'rectangulos']);
  let lineas, total, comun, explica, que;
  if (t === 'cuadrados') {
    const n = azar([3, 4, 4, 5]); que = 'cuadrados';
    total = Array.from({ length: n }, (_, k) => (k + 1) ** 2).reduce((a, c) => a + c, 0); comun = n * n;
    explica = `No son solo los ${n * n} pequeños: ${Array.from({ length: n }, (_, k) => `${(n - k) ** 2} de ${k + 1}×${k + 1}`).join(', ')}. En total ${total}.`;
    lineas = [];
    for (let i = 0; i <= n; i++) { lineas.push([[i / n, 0], [i / n, 1]]); lineas.push([[0, i / n], [1, i / n]]); }
  } else if (t === 'rectangulos') {
    const [a, c] = azar([[2, 3], [2, 4], [3, 3]]); que = 'rectángulos';
    total = (a * (a + 1) / 2) * (c * (c + 1) / 2); comun = a * c;
    explica = `Cada rectángulo se forma eligiendo 2 líneas verticales y 2 horizontales: ${(c * (c + 1)) / 2} × ${(a * (a + 1)) / 2} = ${total} (los cuadrados también cuentan).`;
    lineas = [];
    for (let i = 0; i <= c; i++) lineas.push([[i / c, 0.15], [i / c, 0.85]]);
    for (let j = 0; j <= a; j++) lineas.push([[0, 0.15 + (0.7 * j) / a], [1, 0.15 + (0.7 * j) / a]]);
  } else {
    const m = azar([3, 4]), h = azar([1, 2]); que = 'triángulos';
    total = (h + 1) * (m * (m + 1)) / 2; comun = m * (h + 1);
    explica = `Con ${m + 1} líneas desde la punta se forman ${(m * (m + 1)) / 2} triángulos por cada franja, y hay ${h + 1} franjas: ${total}.`;
    const A = [0.5, 0], base = (y) => [[0.5 - 0.5 * y, y], [0.5 + 0.5 * y, y]];
    lineas = [];
    for (let i = 0; i <= m; i++) lineas.push([A, [i / m, 1]]);
    lineas.push(base(1));
    for (let k = 1; k <= h; k++) { const y = 0.35 + (0.4 * k) / h; lineas.push(base(y)); }
  }
  const sello = rng(que + total);
  return {
    tipo: 'cuenta', gancho: [['¿Cuántos', false], [que, true], ['ves?', false]],
    voz: `¿Cuántos ${que} ves? Casi nadie acierta.`,
    correcta: String(total), comun: String(comun), explica, pregunta: `¿Cuántos ${que} hay?`,
    texto: `👀 ¿Cuántos ${que} ves? Solo 1 de cada 10 acierta a la primera. Comenta tu número 👇${OCULTAR}La respuesta la doy en los comentarios en unas horas 👀\n\n${TAGS} #observacion #cuantosves`,
    revelar: `✅ Son ${total} ${que}. ${explica}`,
    dibujar(ctx, b, p = 1) {
      hoja(ctx, b, sello, { cuadricula: true });
      const lado = Math.min(b.w - 220, b.h - 300), x0 = b.x + (b.w - lado) / 2 + 30, y0 = b.y + (b.h - lado) / 2 + 40;
      escribir(ctx, `¿Cuántos ${que}?`, b.x + b.w / 2 + 30, b.y + 110, { size: 64, color: TINTA, align: 'center', p: clamp(p * 4) });
      ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const visibles = lineas.length * clamp((p - 0.15) / 0.75);
      lineas.forEach(([[ax, ay], [bx, by]], i) => {
        const f = clamp(visibles - i); if (f <= 0) return;
        ctx.beginPath(); ctx.moveTo(x0 + ax * lado, y0 + ay * lado); ctx.lineTo(x0 + (ax + (bx - ax) * f) * lado, y0 + (ay + (by - ay) * f) * lado); ctx.stroke();
      });
      ctx.lineCap = 'butt';
    }
  };
}

const GEN = { error, divide, cuenta };
// Un reto de debate (tipo al azar si no se pide uno). clave: lo que scripts/comentarios.mjs necesita
export function crearDebate(tipo = azar(TIPOS_DEBATE)) {
  const d = GEN[tipo]();
  d.clave = { modo: 'debate', revelar: d.revelar };
  d.imagen = (opts) => dibujarDebate(d, opts);
  return d;
}

// ---------- dibujo ----------
// Mide y parte un texto en líneas con el tamaño más grande que quepa (como mucho 4 líneas)
function ajustar(ctx, texto, ancho, max, min, fam = MANO, peso = 700, maxLineas = 4) {
  for (let s = max; s >= min; s -= 2) {
    ctx.font = `${peso} ${s}px ${fam}`;
    const palabras = String(texto).split(' '), lineas = [''];
    for (const w of palabras) { const t = lineas.at(-1) ? `${lineas.at(-1)} ${w}` : w; if (ctx.measureText(t).width > ancho && lineas.at(-1)) lineas.push(w); else lineas[lineas.length - 1] = t; }
    if (lineas.length <= maxLineas && lineas.every((l) => ctx.measureText(l).width <= ancho)) return { size: s, lineas };
  }
  ctx.font = `${peso} ${min}px ${fam}`; return { size: min, lineas: [String(texto)] };
}
// Escribe a mano: p (0 a 1) es cuánto del texto ya se escribió (se revela de izquierda a derecha). Devuelve el ancho
function escribir(ctx, texto, x, y, { size = 60, color = TINTA, p = 1, align = 'left', tiza = false, peso = 700 } = {}) {
  ctx.font = `${peso} ${size}px ${MANO}`; const w = ctx.measureText(texto).width;
  if (p <= 0) return w;
  const x0 = align === 'center' ? x - w / 2 : x;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 - 10, y - size * 1.3, (w + 20) * clamp(p), size * 1.9); ctx.clip();
  ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (tiza) { ctx.globalAlpha *= 0.35; ctx.fillText(texto, x0 + 2, y + 2); ctx.globalAlpha /= 0.35; ctx.globalAlpha *= 0.92; }
  ctx.fillText(texto, x0, y);
  ctx.restore();
  return w;
}
// Hoja de cuaderno: renglones azules, margen rojo y agujeros (o cuadriculada)
function hoja(ctx, b, r, { cuadricula = false } = {}) {
  ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.rotate((r() - 0.5) * 0.025); ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
  ctx.shadowColor = 'rgba(0,0,0,0.38)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#fffdf5'; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 10); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 10); ctx.clip();
  if (cuadricula) {
    ctx.strokeStyle = 'rgba(70,120,190,0.16)'; ctx.lineWidth = 2;
    for (let x = b.x + 30; x < b.x + b.w; x += 44) { ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, b.y + b.h); ctx.stroke(); }
    for (let y = b.y + 30; y < b.y + b.h; y += 44) { ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke(); }
  } else {
    const paso = Math.round(b.h / 12);
    ctx.strokeStyle = 'rgba(70,120,190,0.35)'; ctx.lineWidth = 2;
    for (let y = b.y + paso * 1.6; y < b.y + b.h - 20; y += paso) { ctx.beginPath(); ctx.moveTo(b.x, y + paso * 0.18); ctx.lineTo(b.x + b.w, y + paso * 0.18); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(214,80,80,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x + 120, b.y); ctx.lineTo(b.x + 120, b.y + b.h); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#2b2118';
  for (const f of [0.18, 0.5, 0.82]) { ctx.beginPath(); ctx.arc(b.x + 48, b.y + b.h * f, 17, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// Pizarrón verde con marco de madera y manchas de tiza
function pizarron(ctx, b, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#7a5230'; ctx.beginPath(); ctx.roundRect(b.x - 22, b.y - 22, b.w + 44, b.h + 44, 14); ctx.fill();
  ctx.shadowColor = 'transparent';
  const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h); g.addColorStop(0, '#2a4a3a'); g.addColorStop(1, '#1b3328');
  ctx.fillStyle = g; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
  for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(255,255,255,${0.025 + r() * 0.035})`; ctx.beginPath(); ctx.ellipse(b.x + r() * b.w, b.y + r() * b.h, 80 + r() * 220, 25 + r() * 60, r() * 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  // Repisa con un gis
  ctx.fillStyle = '#6a4626'; ctx.fillRect(b.x - 22, b.y + b.h + 4, b.w + 44, 22);
  ctx.fillStyle = TIZA; ctx.beginPath(); ctx.roundRect(b.x + b.w * 0.7, b.y + b.h - 6, 90, 16, 6); ctx.fill();
  ctx.restore();
}
// Nota adhesiva amarilla, un poco torcida
function postit(ctx, x, y, w, h, lineas, a, r) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x + w / 2, y + h / 2); ctx.rotate(0.06 + (r() - 0.5) * 0.04); ctx.scale(0.9 + 0.1 * a, 0.9 + 0.1 * a); ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#ffe270'; ctx.fillRect(x, y, w, h); ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(x, y, w, 36);
  const s = Math.round(h / (lineas.length + 0.9));
  lineas.forEach((l, i) => escribir(ctx, l, x + w / 2, y + 36 + s * (i + 0.95), { size: Math.round(s * 0.78), color: '#2b2118', align: 'center' }));
  ctx.restore();
}
// Fondo de escritorio de madera oscura (imagen y video)
export function escritorio(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, W * 0.3, H); g.addColorStop(0, '#4a3322'); g.addColorStop(1, '#22160d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = rng('mesa');
  for (let i = 0; i < 40; i++) { ctx.strokeStyle = `rgba(255,220,180,${0.02 + r() * 0.03})`; ctx.lineWidth = 2 + r() * 3; const y = r() * H; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(W * 0.3, y + (r() - 0.5) * 60, W * 0.7, y + (r() - 0.5) * 60, W, y + (r() - 0.5) * 40); ctx.stroke(); }
}
// El gancho arriba: palabras en blanco y las resaltadas en amarillo, el tamaño más grande que quepa en 2 líneas
export function gancho(ctx, partes, { W = 1080, y = 90, max = 92, ancho = W - 120 } = {}) {
  const palabras = partes.flatMap(([t, r]) => t.split(' ').map((w) => ({ w, r })));
  let size = max, lineas;
  for (; size >= 48; size -= 4) {
    ctx.font = `400 ${size}px ${BLACK}`; lineas = [[]]; let a = 0;
    for (const p of palabras) { const w = ctx.measureText(`${p.w} `).width; if (a + w > ancho && lineas.at(-1).length) { lineas.push([]); a = 0; } lineas.at(-1).push(p); a += w; }
    if (lineas.length <= 2) break;
  }
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  lineas.forEach((l, i) => {
    const total = ctx.measureText(l.map((p) => p.w).join(' ')).width; let x = (W - total) / 2;
    for (const p of l) { ctx.fillStyle = p.r ? AMARILLO : '#ffffff'; ctx.fillText(p.w, x, y + size * (i + 0.85) * 1.1); x += ctx.measureText(`${p.w} `).width; }
  });
  return y + size * lineas.length * 1.1;
}
// Imagen para Facebook/Instagram (4:5) o vertical: gancho, la hoja o el pizarrón y el llamado a comentar
export function dibujarDebate(d, { W = 1080, H = 1350 } = {}) {
  const cv = createCanvas(W, H), ctx = cv.getContext('2d');
  escritorio(ctx, W, H);
  const top = H > 1500 ? 230 : 60, fin = gancho(ctx, d.gancho, { W, y: top, max: H > 1500 ? 92 : 80 });
  const pie = H > 1500 ? 330 : 150, b = { x: 70, y: fin + 50, w: W - 140, h: H - fin - 50 - pie };
  d.dibujar(ctx, b, 1);
  ctx.font = `400 46px ${BLACK}`; ctx.fillStyle = AMARILLO; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('COMENTA TU RESPUESTA', W / 2, H - pie + 92);
  ctx.font = `500 30px ${SANS}`; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillText(MARCA + ' · la respuesta, en unas horas en los comentarios', W / 2, H - pie + 140);
  return cv;
}
