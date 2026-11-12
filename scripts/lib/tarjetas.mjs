// Tarjetas de curiosidades y noticias (sin IA): texto grande, un ícono (emoji de Noto Color Emoji), colores por tema,
// círculos de fondo como sello de la marca y «Potter Play» abajo. Las usan scripts/curiosidades.mjs y noticias.
import { MARCA } from './marca.mjs';
import { createCanvas } from '@napi-rs/canvas';

export const TEMAS = {
  animales: { nombre: 'Animales y naturaleza', a: '#0f5132', b: '#0b2a1e', acento: '#7ee2a8', tags: ['animales', 'naturaleza'] },
  ciencia: { nombre: 'Espacio y ciencia', a: '#1f2a6b', b: '#0b0f2e', acento: '#8fb4ff', tags: ['ciencia', 'espacio'] },
  historia: { nombre: 'Historia y países', a: '#6b3a12', b: '#2b1606', acento: '#ffc078', tags: ['historia', 'cultura'] },
  deportes: { nombre: 'Fútbol y deportes', a: '#0b5d2a', b: '#062814', acento: '#c6f36b', tags: ['futbol', 'deportes'] },
  inventos: { nombre: 'Inventos', a: '#5b1f6b', b: '#240b2b', acento: '#f0a6ff', tags: ['inventos', 'ciencia'] },
  matematicas: { nombre: 'Matemáticas', a: '#7a1f2b', b: '#2e0b10', acento: '#ff9aa8', tags: ['matematicas', 'retos'] },
  cuerpo: { nombre: 'Cuerpo humano', a: '#7a1f4f', b: '#2b0b1c', acento: '#ff9ed2', tags: ['cuerpohumano', 'ciencia'] },
  geografia: { nombre: 'Geografía', a: '#0b4f6c', b: '#06202e', acento: '#7fd8ff', tags: ['geografia', 'mundo'] },
  comida: { nombre: 'Comida y bebidas', a: '#8a2f0f', b: '#2e1004', acento: '#ffe066', tags: ['comida', 'cultura'] },
  tecnologia: { nombre: 'Tecnología y videojuegos', a: '#0f4c4c', b: '#051f1f', acento: '#6ff0d0', tags: ['tecnologia', 'videojuegos'] },
  gta: { nombre: 'Cuenta atrás GTA VI', a: '#8a1f6b', b: '#1a0a2e', acento: '#ff9ad5', tags: ['gta6', 'gtavi', 'videojuegos'] },
  prefieres: { nombre: '¿Qué prefieres?', a: '#3a2a6b', b: '#120c2b', acento: '#ffd166', tags: ['queprefieres', 'dilemas'] },
  emojis: { nombre: 'Adivina con emojis', a: '#0f5c6b', b: '#062a31', acento: '#ffe066', tags: ['adivina', 'emojis'] },
  noticias: { nombre: 'Noticias', a: '#1b1b1f', b: '#0a0a0c', acento: '#ffd166', tags: ['noticias'] },
  // Retos de debate (scripts/lib/debate.mjs): escritorio de madera oscura
  debate: { nombre: 'Debate', a: '#4a3322', b: '#22160d', acento: '#ffd166', tags: ['retos', 'debate'] }
};
export const FORMATOS = {
  sabias: '¿SABÍAS QUE…?', vf: '¿VERDADERO O FALSO?', error: '¿CUÁL ES FALSO?', reto: 'RETO MENTAL 🧠', noticia: '📰 NOTICIA'
};

const SANS = '"IBM Plex Sans", "STIX Two Text", system-ui, sans-serif', BLACK = '"Archivo Black", Impact, sans-serif';

function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/), lines = []; let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
// Busca el tamaño de letra más grande con el que el texto cabe en la caja
function fit(ctx, text, maxW, maxH, { from = 76, to = 34, weight = 600, lh = 1.22, family = SANS, emoji = '' } = {}) {
  for (let s = from; s >= to; s -= 2) {
    ctx.font = `${weight} ${s}px ${family}${emoji}`;
    const lines = wrap(ctx, text, maxW);
    if (lines.length * s * lh <= maxH) return { size: s, lines, lh: s * lh };
  }
  ctx.font = `${weight} ${to}px ${family}${emoji}`;
  return { size: to, lines: wrap(ctx, text, maxW), lh: to * lh };
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// t: { formato, tema, icono, texto, items?: [..], opciones?: [..], pie?: 'Fuente: …' }; alto 1350 (Facebook 4:5) o 1920 (TikTok)
export function dibujarTarjeta(t, { W = 1080, H = 1350, emojiFont = '' } = {}) {
  const tema = TEMAS[t.tema] || TEMAS.noticias, cv = createCanvas(W, H), ctx = cv.getContext('2d');
  const E = emojiFont ? `, ${emojiFont}` : '';
  // Fondo: degradado del tema y círculos concéntricos (el sello de CirculArte)
  const g = ctx.createLinearGradient(0, 0, W * 0.3, H); g.addColorStop(0, tema.a); g.addColorStop(1, tema.b);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 3;
  for (let r = 120; r < 900; r += 70) { ctx.beginPath(); ctx.arc(W * 0.92, H * 0.88, r, 0, Math.PI * 2); ctx.stroke(); }
  for (let r = 60; r < 400; r += 55) { ctx.beginPath(); ctx.arc(W * 0.05, H * 0.08, r, 0, Math.PI * 2); ctx.stroke(); }

  const pad = 80, top = H > 1500 ? 220 : 90;
  // Etiqueta del formato
  ctx.font = `400 46px ${BLACK}${E}`; const label = FORMATOS[t.formato] || FORMATOS.sabias, lw = ctx.measureText(label).width;
  ctx.fillStyle = tema.acento; roundRect(ctx, (W - lw - 70) / 2, top, lw + 70, 86, 43); ctx.fill();
  ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, W / 2, top + 46);
  // Ícono
  let y = top + 120;
  if (t.imagen) {
    // Foto real (Pixabay) recortada al centro, con el ícono como sello en la esquina
    const ih = H > 1500 ? 620 : 420, iw = W - pad * 2;
    ctx.save(); roundRect(ctx, pad, y, iw, ih, 30); ctx.clip();
    const k = Math.max(iw / t.imagen.width, ih / t.imagen.height); ctx.drawImage(t.imagen, pad + (iw - t.imagen.width * k) / 2, y + (ih - t.imagen.height * k) / 2, t.imagen.width * k, t.imagen.height * k); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 6; roundRect(ctx, pad, y, iw, ih, 30); ctx.stroke();
    if (t.icono) { ctx.fillStyle = tema.acento; ctx.beginPath(); ctx.arc(pad + iw - 60, y + ih - 60, 62, 0, Math.PI * 2); ctx.fill(); ctx.font = `76px ${emojiFont || 'sans-serif'}`; ctx.fillStyle = '#fff'; ctx.fillText(t.icono, pad + iw - 60, y + ih - 56); }
    y += ih + 30;
  } else if (t.icono) { ctx.font = `${H > 1500 ? 210 : 170}px ${emojiFont || 'sans-serif'}`; ctx.fillText(t.icono, W / 2, y + (H > 1500 ? 110 : 90)); y += H > 1500 ? 250 : 200; }
  const bottom = H - (H > 1500 ? 300 : 190), maxW = W - pad * 2;
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';

  if (t.items) {
    // Tres afirmaciones A, B, C
    const boxH = (bottom - y - 40) / 3, letras = ['A', 'B', 'C'];
    t.items.forEach((it, i) => {
      const by = y + i * (boxH + 20);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(ctx, pad, by, maxW, boxH, 28); ctx.fill();
      ctx.fillStyle = tema.acento; ctx.font = `400 54px ${BLACK}`; ctx.textAlign = 'left'; ctx.fillText(letras[i], pad + 30, by + 70);
      ctx.fillStyle = '#fff'; const f = fit(ctx, it, maxW - 140, boxH - 40, { from: 44, to: 28, emoji: E });
      const y0 = by + (boxH - f.lines.length * f.lh) / 2 + f.size * 0.85;
      f.lines.forEach((l, k) => ctx.fillText(l, pad + 110, y0 + k * f.lh));
    });
  } else if (t.opciones) {
    // Reto: pregunta y tres opciones
    const qH = (bottom - y) * 0.5, f = fit(ctx, t.texto, maxW, qH - 20, { from: 66, to: 36, emoji: E });
    ctx.textAlign = 'center'; const y0 = y + (qH - f.lines.length * f.lh) / 2 + f.size * 0.85;
    f.lines.forEach((l, k) => ctx.fillText(l, W / 2, y0 + k * f.lh));
    const oy = y + qH, oh = (bottom - oy - 40) / 3;
    t.opciones.forEach((o, i) => {
      const by = oy + i * (oh + 20);
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(ctx, pad + 60, by, maxW - 120, oh, oh / 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `600 ${Math.min(52, oh * 0.45)}px ${SANS}${E}`; ctx.textAlign = 'center';
      ctx.fillText(`${'ABC'[i]})  ${o}`, W / 2, by + oh / 2 + Math.min(52, oh * 0.45) * 0.35);
    });
  } else if (t.resumen) {
    // Noticia: titular arriba (hasta la mitad del espacio) y el resumen corto debajo, más pequeño
    const total = bottom - y - 20, ft = fit(ctx, t.texto, maxW, total * 0.5, { from: 68, to: 36, weight: 700, emoji: E });
    const altoT = ft.lines.length * ft.lh;
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.font = `700 ${ft.size}px ${SANS}${E}`;
    ft.lines.forEach((l, k) => ctx.fillText(l, W / 2, y + ft.size * 0.85 + k * ft.lh));
    const ly = y + altoT + 22; ctx.fillStyle = tema.acento; ctx.fillRect(W / 2 - 60, ly, 120, 5);
    const fr = fit(ctx, t.resumen, maxW, bottom - ly - 40, { from: 44, to: 28, weight: 500, emoji: E });
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    fr.lines.forEach((l, k) => ctx.fillText(l, W / 2, ly + 40 + fr.size * 0.85 + k * fr.lh));
  } else {
    const f = fit(ctx, t.texto, maxW, bottom - y - 30, { from: 78, to: 38, emoji: E });
    ctx.textAlign = 'center'; const y0 = y + (bottom - y - f.lines.length * f.lh) / 2 + f.size * 0.85;
    f.lines.forEach((l, k) => ctx.fillText(l, W / 2, y0 + k * f.lh));
  }

  // Llamado a comentar
  const cta = t.formato === 'vf' ? '✅ ¿Verdadero o falso? ❌' : t.formato === 'error' || t.formato === 'reto' ? '¿A, B o C?' : t.pie || '¿Lo sabías? 🤯';
  ctx.textAlign = 'center'; ctx.fillStyle = tema.acento; ctx.font = `600 40px ${SANS}${E}`;
  ctx.fillText(cta, W / 2, H - (H > 1500 ? 220 : 120));
  // Pie: tema a la izquierda, marca a la derecha con su sello de círculos
  ctx.font = `500 30px ${SANS}`; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.textAlign = 'left';
  ctx.fillText(tema.nombre, pad, H - 50);
  ctx.textAlign = 'right'; ctx.font = `400 36px ${BLACK}`; ctx.fillStyle = '#fff'; ctx.fillText(MARCA, W - pad, H - 48);
  const bw = ctx.measureText(MARCA).width, cx = W - pad - bw - 34, cy = H - 60;
  ctx.strokeStyle = tema.acento; ctx.lineWidth = 3; for (const r of [8, 15, 22]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
  return cv;
}

// ---------- carruseles: portada con gancho y tarjeta final ----------
// La portada es lo único que se ve en el feed: frase corta y grande (con una parte resaltada), una fila que adelanta lo
// que viene (niveles o íconos) y «DESLIZA» a la derecha. Lo importante va en el centro (se ve igual en la miniatura
// cuadrada del perfil). gancho: [[texto, resaltar]]; chips: [{ texto, color }] o iconos: ['🐙', …]
export function dibujarPortada({ gancho, sub, chips, iconos, fondo, tema: idTema = 'matematicas', etiqueta = 'CARRUSEL' }, { W = 1080, H = 1350, emojiFont = '' } = {}) {
  const tema = TEMAS[idTema] || TEMAS.noticias, cv = createCanvas(W, H), ctx = cv.getContext('2d'), E = emojiFont ? `, ${emojiFont}` : '';
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, tema.a); g.addColorStop(1, tema.b);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (fondo) {
    // Foto real de fondo, oscurecida con el color del tema para que el gancho se lea
    const k = Math.max(W / fondo.width, H / fondo.height); ctx.drawImage(fondo, (W - fondo.width * k) / 2, (H - fondo.height * k) / 2, fondo.width * k, fondo.height * k);
    ctx.globalAlpha = 0.72; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 4;
  for (let r = 140; r < 1100; r += 80) { ctx.beginPath(); ctx.arc(W * 0.5, H * 0.5, r, 0, Math.PI * 2); ctx.stroke(); }
  const top = H > 1500 ? 300 : 80, dy = H - (H > 1500 ? 330 : 170);
  // Etiqueta arriba
  ctx.font = `400 40px ${BLACK}${E}`; const lw = ctx.measureText(etiqueta).width;
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; roundRect(ctx, (W - lw - 60) / 2, top, lw + 60, 74, 37); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(etiqueta, W / 2, top + 39);
  // Gancho: el tamaño más grande con el que todo (gancho, fila y subtítulo) cabe entre la etiqueta y «DESLIZA»
  const zona0 = top + 74 + 40, zona1 = dy - 40, extra = (chips?.length ? 64 + 50 : iconos?.length ? 120 + 50 : 0) + (sub ? 90 : 0);
  const palabras = gancho.flatMap(([t, r]) => t.split(' ').filter(Boolean).map((w) => ({ w, r })));
  let size = 150, lineas, lh;
  for (; size >= 60; size -= 6) {
    ctx.font = `400 ${size}px ${BLACK}${E}`; lineas = [[]]; let ancho = 0;
    for (const p of palabras) { const w = ctx.measureText(p.w + ' ').width; if (ancho + w > W - 130 && lineas.at(-1).length) { lineas.push([]); ancho = 0; } lineas.at(-1).push(p); ancho += w; }
    lh = size * 1.06;
    if (lineas.length <= 4 && lineas.length * lh + extra <= zona1 - zona0) break;
  }
  let y = zona0 + (zona1 - zona0 - (lineas.length * lh + extra)) / 2;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const esp = ctx.measureText(' ').width;
  for (const l of lineas) {
    const total = ctx.measureText(l.map((p) => p.w).join(' ')).width; let x = (W - total) / 2;
    // Las palabras resaltadas seguidas van en un solo recuadro
    for (let i = 0; i < l.length;) {
      let j = i; while (j < l.length && l[j].r === l[i].r) j++;
      const txt = l.slice(i, j).map((p) => p.w).join(' '), w = ctx.measureText(txt).width;
      if (l[i].r) { ctx.fillStyle = tema.acento; roundRect(ctx, x - 12, y + lh * 0.1, w + 24, lh * 0.94, 18); ctx.fill(); ctx.fillStyle = '#111'; }
      else ctx.fillStyle = '#fff';
      ctx.fillText(txt, x, y + lh * 0.84); x += w + esp; i = j;
    }
    y += lh;
  }
  // Lo que viene: chips (niveles) o íconos
  y += 50;
  if (chips?.length) {
    ctx.font = `400 30px ${BLACK}${E}`;
    const ws = chips.map((c) => ctx.measureText(c.texto).width + 40), total = ws.reduce((a, b) => a + b, 0) + 14 * (chips.length - 1);
    let x = (W - total) / 2;
    chips.forEach((c, i) => { ctx.fillStyle = c.color; roundRect(ctx, x, y, ws[i], 64, 32); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.texto, x + ws[i] / 2, y + 34); x += ws[i] + 14; });
    y += 64;
  } else if (iconos?.length) {
    const paso = Math.min(150, (W - 200) / iconos.length); ctx.font = `100px ${emojiFont || 'sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    iconos.forEach((ic, i) => ctx.fillText(ic, W / 2 + (i - (iconos.length - 1) / 2) * paso, y + 60));
    y += 120;
  }
  if (sub) { ctx.font = `600 44px ${SANS}${E}`; ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(sub, W / 2, y + 70); }
  // «DESLIZA ➜» abajo a la derecha (invita a pasar a la siguiente)
  ctx.font = `400 42px ${BLACK}`; const dw = ctx.measureText('DESLIZA').width + 110;
  ctx.fillStyle = tema.acento; roundRect(ctx, W - dw - 60, dy, dw, 84, 42); ctx.fill();
  ctx.fillStyle = '#111'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('DESLIZA', W - dw - 30, dy + 44);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 7; ctx.lineCap = 'round'; const ax = W - 100, ay = dy + 42;
  ctx.beginPath(); ctx.moveTo(ax - 30, ay); ctx.lineTo(ax, ay); ctx.moveTo(ax - 14, ay - 15); ctx.lineTo(ax, ay); ctx.lineTo(ax - 14, ay + 15); ctx.stroke(); ctx.lineCap = 'butt';
  pie(ctx, tema, W, H);
  return cv;
}

// Última del carrusel: la pregunta para comentar y dónde están las respuestas
export function dibujarCierre({ titulo, sub, nota, tema: idTema = 'matematicas' }, { W = 1080, H = 1350, emojiFont = '' } = {}) {
  const tema = TEMAS[idTema] || TEMAS.noticias, cv = createCanvas(W, H), ctx = cv.getContext('2d'), E = emojiFont ? `, ${emojiFont}` : '';
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, tema.b); g.addColorStop(1, tema.a);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = tema.acento; const f = fit(ctx, titulo, W - 160, 420, { from: 120, to: 60, weight: 400, family: BLACK, lh: 1.06, emoji: E });
  let y = H / 2 - (f.lines.length * f.lh) / 2 - 60;
  f.lines.forEach((l) => { ctx.fillText(l, W / 2, y + f.size * 0.9); y += f.lh; });
  ctx.fillStyle = '#fff'; ctx.font = `600 50px ${SANS}${E}`; if (sub) ctx.fillText(sub, W / 2, y + 90);
  if (nota) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = `500 40px ${SANS}${E}`; ctx.fillText(nota, W / 2, y + 170); }
  ctx.fillStyle = '#fff'; ctx.font = `400 46px ${BLACK}`; ctx.fillText(`Sigue a ${MARCA}`, W / 2, H - (H > 1500 ? 330 : 200));
  pie(ctx, tema, W, H);
  return cv;
}

function pie(ctx, tema, W, H) {
  const pad = 80;
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.font = `400 36px ${BLACK}`; ctx.fillStyle = '#fff'; ctx.fillText(MARCA, W - pad, H - 48);
  const bw = ctx.measureText(MARCA).width, cx = W - pad - bw - 34, cy = H - 60;
  ctx.strokeStyle = tema.acento; ctx.lineWidth = 3; for (const r of [8, 15, 22]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
}
