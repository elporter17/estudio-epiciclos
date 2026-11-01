// Tarjetas de curiosidades y noticias (sin IA): texto grande, un ícono (emoji de Noto Color Emoji), colores por tema,
// círculos de fondo como sello de la marca y «Potter Play» abajo. Las usan scripts/curiosidades.mjs y noticias.
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
  noticias: { nombre: 'Noticias', a: '#1b1b1f', b: '#0a0a0c', acento: '#ffd166', tags: ['noticias'] }
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
  if (t.icono) { ctx.font = `${H > 1500 ? 210 : 170}px ${emojiFont || 'sans-serif'}`; ctx.fillText(t.icono, W / 2, y + (H > 1500 ? 110 : 90)); y += H > 1500 ? 250 : 200; }
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
  ctx.textAlign = 'right'; ctx.font = `400 36px ${BLACK}`; ctx.fillStyle = '#fff'; ctx.fillText('Potter Play', W - pad, H - 48);
  const bw = ctx.measureText('Potter Play').width, cx = W - pad - bw - 34, cy = H - 60;
  ctx.strokeStyle = tema.acento; ctx.lineWidth = 3; for (const r of [8, 15, 22]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
  return cv;
}
