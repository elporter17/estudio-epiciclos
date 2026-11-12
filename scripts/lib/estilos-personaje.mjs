// Estilos de personaje para las historias «¿Y si pudieras ver…?» (propuestas, 2026-11-12; sin IA, todo con canvas).
// El mismo personaje (cabeza, cuerpo, brazos, piernas como polígonos) se dibuja de 5 formas:
//   garabato  línea de bolígrafo que «tiembla» (cambia cada 0,15 s) sobre papel de cuaderno
//   pegatina  colores planos, borde blanco grueso y sombra, como un sticker de WhatsApp
//   neon      solo contornos que brillan, sobre fondo oscuro
//   barro     figurita de barro con los zigzags blancos de la cerámica lenca
//   papel     papel recortado: bordes rasgados, textura y sombra de collage
import { createCanvas } from '@napi-rs/canvas';

const azar = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
// Polígonos básicos (en coordenadas del personaje: suelo en y = 0, alto H)
const circulo = (cx, cy, r, n = 28) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r]);
function rrect(x, y, w, h, r, n = 6) {
  const p = [], esq = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of esq) for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (Math.PI / 2); p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return p;
}
// El cuerpo: lista de { pts, rol } (rol: piel, ropa, pelo, detalle)
function cuerpo(H, p) {
  const r = H * 0.2, cabezaY = -H * 0.66 - r * 0.85, partes = [];
  partes.push({ rol: 'piel', pts: rrect(-H * 0.11, -H * 0.3, H * 0.09, H * 0.3, H * 0.04) }, { rol: 'piel', pts: rrect(H * 0.02, -H * 0.3, H * 0.09, H * 0.3, H * 0.04) });
  partes.push({ rol: 'ropa', pts: rrect(-H * 0.26, -H * 0.64, H * 0.09, H * 0.32, H * 0.045) }, { rol: 'ropa', pts: rrect(H * 0.17, -H * 0.64, H * 0.09, H * 0.32, H * 0.045) });
  partes.push({ rol: 'ropa', pts: rrect(-H * 0.19, -H * 0.68, H * 0.38, H * 0.42, H * 0.13) });
  // Pelo largo: la melena va detrás de la cabeza (y encima, un fleco)
  if (p.pelo === 'largo') partes.push({ rol: 'pelo', pts: rrect(-r * 1.15, cabezaY - r * 1.05, r * 2.3, r * 2.45, r * 0.9) });
  partes.push({ rol: 'piel', pts: circulo(0, cabezaY, r) });
  if (p.pelo === 'largo') partes.push({ rol: 'pelo', pts: circulo(0, cabezaY - r * 0.05, r * 1.04, 28).filter(([, y]) => y < cabezaY - r * 0.4) });
  else if (p.pelo === 'gorra') partes.push({ rol: 'pelo', pts: [...circulo(0, cabezaY - r * 0.1, r * 1.03, 28).filter(([, y]) => y < cabezaY - r * 0.15), [r * 1.5, cabezaY - r * 0.2], [r * 1.0, cabezaY - r * 0.05]] });
  else if (p.pelo === 'rizado') for (let k = 0; k < 8; k++) { const a = Math.PI * (1.08 + k * 0.12); partes.push({ rol: 'pelo', pts: circulo(Math.cos(a) * r * 0.92, cabezaY + Math.sin(a) * r * 0.92, r * 0.3, 14) }); }
  else if (p.pelo === 'coletas') for (const s of [-1, 1]) partes.push({ rol: 'pelo', pts: circulo(s * r * 1.08, cabezaY - r * 0.35, r * 0.34, 14) });
  else if (p.pelo === 'cola') partes.push({ rol: 'pelo', pts: circulo(r * 1.0, cabezaY - r * 0.55, r * 0.4, 14).map(([x, y]) => [x, cabezaY - r * 0.55 + (y - cabezaY + r * 0.55) * 1.7]) });
  else if (p.pelo === 'moño') partes.push({ rol: 'pelo', pts: circulo(0, cabezaY - r * 1.12, r * 0.38, 14) });
  else if (p.pelo === 'corto') partes.push({ rol: 'pelo', pts: circulo(0, cabezaY - r * 0.1, r * 1.03, 28).filter(([, y]) => y < cabezaY - r * 0.35) });
  return { partes, r, cabezaY };
}
const jitter = (pts, amp, rnd) => pts.map(([x, y]) => [x + (rnd() - 0.5) * amp, y + (rnd() - 0.5) * amp]);
function trazar(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }

const PALETA = {
  garabato: { piel: '#ffffff', ropa: null, pelo: '#1e3a8a', tinta: '#1d4ed8' },
  pegatina: { piel: '#2a1f36', pelo: '#120d18' },
  neon: { piel: '#00e5ff', pelo: '#ff3df2' },
  barro: { piel: '#b9582f', ropa: '#8f3d1f', pelo: '#5e2814' },
  papel: { piel: '#e8c9a0', pelo: '#3b2a20' }
};

// Ojos y boca, según el estilo
function cara(ctx, estilo, r, cy, t, habla, expresion, rnd) {
  const sep = r * 0.38, oy = cy - r * 0.12, abre = habla ? 0.3 + 0.7 * Math.abs(Math.sin(t * 13)) : 0;
  const ojo = estilo === 'neon' ? '#ffffff' : estilo === 'garabato' ? '#1d4ed8' : estilo === 'barro' ? '#f6eee3' : '#ffffff';
  for (const s of [-1, 1]) {
    if (estilo === 'garabato') { ctx.strokeStyle = ojo; ctx.lineWidth = r * 0.07; trazar(ctx, jitter(circulo(s * sep, oy, r * 0.18, 10), r * 0.06, rnd)); ctx.stroke(); ctx.fillStyle = ojo; ctx.beginPath(); ctx.arc(s * sep, oy + r * 0.03, r * 0.07, 0, Math.PI * 2); ctx.fill(); }
    else if (estilo === 'barro') { ctx.fillStyle = ojo; ctx.beginPath(); ctx.arc(s * sep, oy, r * 0.11, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillStyle = ojo; ctx.beginPath(); ctx.ellipse(s * sep, oy, r * 0.22, r * (expresion === 'sorpresa' ? 0.32 : 0.26), 0, 0, Math.PI * 2); ctx.fill(); if (estilo !== 'neon') { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(s * sep, oy + r * 0.05, r * 0.11, 0, Math.PI * 2); ctx.fill(); } }
  }
  ctx.strokeStyle = ojo; ctx.fillStyle = ojo; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
  ctx.beginPath();
  if (abre > 0.05) { ctx.ellipse(0, cy + r * 0.42, r * 0.17, r * (0.05 + 0.13 * abre), 0, 0, Math.PI * 2); ctx.fill(); }
  else if (expresion === 'sorpresa') { ctx.ellipse(0, cy + r * 0.45, r * 0.12, r * 0.16, 0, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.arc(0, cy + r * 0.28, r * 0.26, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke(); }
}

// Dibuja el personaje en (x, suelo) con alto H. p = { ropa, pelo }
export function dibujarEstilo(ctx, estilo, p, x, suelo, H, { t = 0, habla = false, expresion = 'neutro', semilla = 7 } = {}) {
  H *= p.tam || 1;
  const { partes, r, cabezaY } = cuerpo(H, p), pal = PALETA[estilo];
  const color = (rol) => rol === 'ropa' ? (pal.ropa || p.ropa) : pal[rol] || p.ropa;
  // El garabato «tiembla»: la línea cambia cada 0,15 s
  const rnd = azar(estilo === 'garabato' ? semilla + Math.floor(t / 0.15) * 7 : semilla);
  ctx.save(); ctx.translate(x, suelo + (habla ? Math.sin(t * 9) * H * 0.008 : 0));
  if (estilo === 'pegatina') {
    // Silueta blanca gruesa (el borde del sticker) y sombra, luego los colores
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = H * 0.04; ctx.shadowOffsetY = H * 0.02;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = H * 0.07; ctx.lineJoin = 'round';
    for (const pt of partes) { trazar(ctx, pt.pts); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    for (const pt of partes) { ctx.fillStyle = color(pt.rol); trazar(ctx, pt.pts); ctx.fill(); }
  } else if (estilo === 'neon') {
    ctx.lineJoin = 'round'; ctx.lineWidth = H * 0.014;
    for (const pt of partes) { const c = pt.rol === 'ropa' ? p.ropa : color(pt.rol); ctx.shadowColor = c; ctx.shadowBlur = H * 0.05; ctx.strokeStyle = c; trazar(ctx, pt.pts); ctx.stroke(); ctx.shadowBlur = H * 0.02; ctx.stroke(); }
    ctx.shadowBlur = 0;
  } else if (estilo === 'garabato') {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const pt of partes) {
      const pts = jitter(pt.pts, H * 0.012, rnd);
      // Sobre una foto: relleno blanco (como papel) para que el dibujo se lea encima
      if (p.sobreFoto) { ctx.fillStyle = 'rgba(255,255,255,0.93)'; trazar(ctx, pts); ctx.fill(); }
      if (pt.rol === 'ropa') { ctx.fillStyle = p.ropa + (p.sobreFoto ? '88' : '55'); trazar(ctx, pts); ctx.fill(); }
      if (pt.rol === 'pelo' && p.sobreFoto) { ctx.fillStyle = (p.colorPelo || '#1e3a8a') + 'cc'; trazar(ctx, pts); ctx.fill(); }
      ctx.strokeStyle = pal.tinta; ctx.lineWidth = H * 0.009; trazar(ctx, pts); ctx.stroke();
      trazar(ctx, jitter(pt.pts, H * 0.012, rnd)); ctx.lineWidth = H * 0.005; ctx.stroke();
    }
  } else if (estilo === 'barro') {
    for (const pt of partes) {
      const xs = pt.pts.map((q) => q[0]), ys = pt.pts.map((q) => q[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, rr = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const g = ctx.createRadialGradient(cx - rr * 0.2, cy - rr * 0.25, rr * 0.05, cx, cy, rr * 0.75); const c = color(pt.rol);
      g.addColorStop(0, '#e08a5c'); g.addColorStop(0.6, c); g.addColorStop(1, '#5a2410');
      ctx.fillStyle = g; trazar(ctx, pt.pts); ctx.fill();
    }
    // Zigzag lenca en la sudadera y una franja de puntos
    ctx.strokeStyle = '#f6eee3'; ctx.lineWidth = H * 0.012; ctx.lineJoin = 'miter';
    for (const yy of [-H * 0.56, -H * 0.42]) { ctx.beginPath(); for (let k = 0; k <= 8; k++) { const xx = -H * 0.16 + k * H * 0.04, y = yy + (k % 2 ? -H * 0.025 : H * 0.025); k ? ctx.lineTo(xx, y) : ctx.moveTo(xx, y); } ctx.stroke(); }
    ctx.fillStyle = '#f6eee3'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(-H * 0.13 + k * H * 0.052, -H * 0.33, H * 0.008, 0, Math.PI * 2); ctx.fill(); }
  } else if (estilo === 'papel') {
    for (const pt of partes) {
      const pts = jitter(pt.pts, H * 0.018, rnd);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowOffsetX = H * 0.012; ctx.shadowOffsetY = H * 0.015; ctx.shadowBlur = H * 0.01;
      ctx.fillStyle = color(pt.rol); trazar(ctx, pts); ctx.fill(); ctx.restore();
      // Borde blanco del papel rasgado y fibras
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = H * 0.006; trazar(ctx, pts); ctx.stroke();
      ctx.save(); trazar(ctx, pts); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
      for (let k = 0; k < 40; k++) { const a = rnd() * H - H, b = -rnd() * H; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + H * 0.2, b + (rnd() - 0.5) * H * 0.05); ctx.stroke(); }
      ctx.restore();
    }
  }
  cara(ctx, estilo, r, cabezaY, t, habla, expresion, rnd);
  // Lentes y tele (garabato)
  if (p.lentes) { ctx.strokeStyle = pal.tinta || '#1d4ed8'; ctx.lineWidth = r * 0.07; for (const s of [-1, 1]) { trazar(ctx, jitter(circulo(s * r * 0.38, cabezaY - r * 0.12, r * 0.3, 12), r * 0.05, rnd)); ctx.stroke(); } }
  if (p.tele) { ctx.strokeStyle = pal.tinta || '#1d4ed8'; ctx.lineWidth = H * 0.012; const tw = H * 0.9, th = H * 1.05; trazar(ctx, jitter(rrect(-tw / 2, -th * 0.98, tw, th * 0.9, 30), H * 0.012, rnd)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-H * 0.1, -th * 0.98); ctx.lineTo(-H * 0.25, -th * 1.2); ctx.moveTo(H * 0.1, -th * 0.98); ctx.lineTo(H * 0.25, -th * 1.2); ctx.stroke(); }
  ctx.restore();
  return { cabeza: suelo + cabezaY - r * 1.6 };
}

// El número encima, en el estilo de cada uno
export function numeroEstilo(ctx, estilo, texto, cx, y, size = 64, rojo = true) {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (estilo === 'garabato') {
    ctx.font = `700 ${size}px "Comic Sans MS", "IBM Plex Sans", sans-serif`;
    const w = ctx.measureText(texto).width, tinta = rojo ? '#dc2626' : '#15803d';
    // Una mancha blanca detrás para que se lea sobre la foto
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.beginPath(); ctx.ellipse(cx, y, w * 0.72, size * 0.8, -0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = tinta; ctx.fillText(texto, cx, y);
    ctx.strokeStyle = tinta; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx, y, w * 0.68, size * 0.75, -0.05, 0, Math.PI * 2); ctx.stroke();
  } else if (estilo === 'neon') {
    ctx.font = `400 ${size}px "Archivo Black", Impact, sans-serif`; ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = 30; ctx.fillStyle = '#ffd1dc'; ctx.fillText(texto, cx, y); ctx.shadowBlur = 12; ctx.fillText(texto, cx, y);
  } else if (estilo === 'barro') {
    ctx.font = `400 ${size}px "Archivo Black", Impact, sans-serif`; const w = ctx.measureText(texto).width + size;
    ctx.fillStyle = '#f6eee3'; ctx.beginPath(); ctx.roundRect(cx - w / 2, y - size * 0.7, w, size * 1.4, 18); ctx.fill(); ctx.fillStyle = '#8f3d1f'; ctx.fillText(texto, cx, y + 3);
  } else if (estilo === 'papel') {
    ctx.font = `400 ${size}px "Archivo Black", Impact, sans-serif`; const w = ctx.measureText(texto).width + size;
    ctx.save(); ctx.rotate(-0.04); ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowOffsetY = 8; ctx.fillStyle = '#fef08a'; ctx.fillRect(cx - w / 2, y - size * 0.7, w, size * 1.4); ctx.restore();
    ctx.fillStyle = '#b91c1c'; ctx.fillText(texto, cx, y);
  } else {
    ctx.font = `400 ${size}px "Archivo Black", Impact, sans-serif`; const w = ctx.measureText(texto).width + size;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(cx - w / 2 - 8, y - size * 0.7 - 8, w + 16, size * 1.4 + 16, 40); ctx.fill();
    ctx.fillStyle = rojo ? '#ef4444' : '#22c55e'; ctx.beginPath(); ctx.roundRect(cx - w / 2, y - size * 0.7, w, size * 1.4, 34); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(texto, cx, y + 3);
  }
  ctx.restore();
}

// Fondo propio de cada estilo (para la muestra)
export function fondoEstilo(ctx, estilo, W, H) {
  if (estilo === 'garabato') { ctx.fillStyle = '#fbfaf3'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(59,130,246,0.18)'; ctx.lineWidth = 2; for (let y = 0; y < H; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } for (let x = 0; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } ctx.strokeStyle = 'rgba(239,68,68,0.5)'; ctx.beginPath(); ctx.moveTo(90, 0); ctx.lineTo(90, H); ctx.stroke(); }
  else if (estilo === 'neon') { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0620'); g.addColorStop(1, '#2a0b3d'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(255,61,242,0.35)'; ctx.lineWidth = 2; for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.moveTo(W / 2, H * 0.62); ctx.lineTo((k / 13) * W * 1.6 - W * 0.3, H); ctx.stroke(); } for (let y = H * 0.62; y < H; y += (y - H * 0.6) * 0.35 + 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
  else if (estilo === 'barro') { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f3d9b8'); g.addColorStop(1, '#d9a777'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(143,61,31,0.18)'; for (let k = 0; k < 10; k++) { ctx.beginPath(); for (let i = 0; i <= 20; i++) ctx.lineTo((i / 20) * W, H * 0.12 + k * 22 + (i % 2 ? 10 : -10)); ctx.lineTo(W, H * 0.12 + k * 22 + 4); ctx.lineTo(0, H * 0.12 + k * 22 + 4); ctx.fill(); } }
  else if (estilo === 'papel') { ctx.fillStyle = '#c9b48f'; ctx.fillRect(0, 0, W, H); const r = azar(3); ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let k = 0; k < 400; k++) ctx.fillRect(r() * W, r() * H, 2 + r() * 6, 1); ctx.fillStyle = '#6aa5c9'; ctx.fillRect(0, 0, W, H * 0.45); ctx.fillStyle = '#f2f0e6'; ctx.beginPath(); ctx.arc(W * 0.8, H * 0.15, 60, 0, Math.PI * 2); ctx.fill(); }
  else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7dd3fc'); g.addColorStop(1, '#fde68a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
}
export const ESTILOS_PERSONAJE = ['garabato', 'pegatina', 'neon', 'barro', 'papel'];
export { createCanvas };
