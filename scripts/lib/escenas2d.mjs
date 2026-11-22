// Escenas del motor 2D (el «tipo» de cada escena del guion es el mismo que en el 3D: portada, foco, pila, lluvia, cuadricula,
// gente, globo, linea, comparacion, calendario, torre, calle y cierre). Cada una recibe (ctx, t, dur, e, c) con c = { A, g, logo }
// y depende solo del tiempo t, así que cada cuadro se puede dibujar suelto. Las escenas con nombres propios del 3D (vaso,
// botellas, piscina…) se dibujan con la genérica que más se les parece (ALIAS).
import { W, H, clamp, ease, easeInOut, lerp, rebote, salida, azar, txt, objeto2d, spriteEmoji, emojiDe, paisaje, persona, pastilla, sombrear, formato, BLACK, AMARILLO } from './dibujo2d.mjs';

const OBJ = (e, def = 'moneda') => e.objeto || def;
const cx = W / 2;
// Zona de arte: debajo de los subtítulos (y 250-520) y del contador (y ~640)
const ARTE = { y0: 760, y1: 1700 };

export function portada(ctx, t, dur, e, c) {
  paisaje(ctx, c.A, t, { horizonte: 0.58, arboles: 7, semilla: 3 });
  // Pedestal que brilla y objeto grande con salto suave
  const abajo = c.g?.estilo?.portada === 'abajo', y = H * (abajo ? 0.4 : 0.66), g = ctx.createRadialGradient(cx, y, 40, cx, y, 420); g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y - 430, W, 860);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx, y + 190, 330, 70, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = c.acento; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(cx, y + 190, 270, 52, 0, 0, 7); ctx.stroke();
  const s = 640 * salida(t / 0.6) * (1 + 0.03 * Math.sin(t * 2.2));
  objeto2d(ctx, OBJ(e), cx, y - 30 - Math.abs(Math.sin(t * 2.2)) * 24, s, { rot: Math.sin(t * 1.4) * 0.06 });
  const r = azar(4); for (let i = 0; i < 18; i++) { const px = r() * W, py = y - 500 + r() * 700, k = 0.5 + 0.5 * Math.abs(Math.sin(t * 3 + i)); ctx.fillStyle = `rgba(255,255,255,${0.9 * k})`; ctx.fillRect(px, py + Math.sin(t * 2 + i) * 14, 9 * k, 9 * k); }
}
export function foco(ctx, t, dur, e, c) {
  paisaje(ctx, c.A, t, { horizonte: 0.62, arboles: 6, semilla: 9 });
  const n = clamp(e.cantidad || 1, 1, 4), y = H * 0.66, ancho = n === 1 ? 700 : n === 2 ? 480 : n === 3 ? 360 : 280;
  // Foco de luz sobre el suelo
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(cx, y + 200, W * 0.46, 90, 0, 0, 7); ctx.fill();
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? cx : cx + (i - (n - 1) / 2) * (ancho + 30), k = salida((t - 0.15 - i * 0.35) / 0.55);
    objeto2d(ctx, OBJ(e), x, y - Math.abs(Math.sin(t * 2 + i)) * 12, ancho * Math.max(0.01, k), { rot: Math.sin(t + i) * 0.05 });
  }
}
export function pila(ctx, t, dur, e, c) {
  paisaje(ctx, c.A, t, { horizonte: 0.66, arboles: 5, semilla: 12 });
  const total = clamp(e.cantidad || 120, 6, 300), niveles = Math.ceil((Math.sqrt(1 + 8 * total) - 1) / 2), tam = clamp(Math.floor(820 / niveles), 46, 150), base = H * 0.86;
  let k = 0; const r = azar(5);
  for (let nivel = 0; nivel < niveles; nivel++) {
    for (let j = 0; j <= nivel && k < total; j++, k++) {
      const llega = 0.1 + (k / total) * dur * 0.62, a = (t - llega) / 0.45; if (a < 0) continue;
      const x = cx + (j - nivel / 2) * tam * 0.92, y = base - (niveles - 1 - nivel) * tam * 0.82 - tam / 2, caida = (1 - rebote(a)) * 900;
      objeto2d(ctx, OBJ(e), x, y - caida, tam * 1.05, { sombra: false, rot: (r() - 0.5) * 0.25 });
    }
  }
}
export function lluvia(ctx, t, dur, e, c) {
  paisaje(ctx, c.A, t, { horizonte: 0.7, arboles: 4, semilla: 21 });
  const n = clamp(e.cantidad || 120, 20, 240), r = azar(8), tam = clamp(520 / Math.sqrt(n) + 40, 56, 150);
  for (let i = 0; i < n; i++) {
    const x = r() * (W - 100) + 50, inicio = (i / n) * dur * 0.7, y = lerp(-150, H * (0.7 + r() * 0.24), clamp((t - inicio) / 1.2)) ; if (t < inicio) { r(); continue; }
    const llego = (t - inicio) / 1.2 >= 1; objeto2d(ctx, OBJ(e), x, y, tam, { sombra: false, rot: llego ? (r() - 0.5) * 0.5 : t * 2 + i }); if (llego) continue;
  }
}
export function cuadricula(ctx, t, dur, e, c) {
  paisaje(ctx, c.A, t, { horizonte: 0.5, arboles: 0, semilla: 4 });
  const lado = clamp(e.lado || 14, 4, 24), tam = 920 / lado, x0 = (W - lado * tam) / 2, y0 = H * 0.5 - (lado * tam) / 2 + 160;
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.roundRect(x0 - 24, y0 - 24, lado * tam + 48, lado * tam + 48, 40); ctx.fill();
  const total = lado * lado; for (let i = 0; i < total; i++) {
    const a = (t - 0.1 - (i / total) * dur * 0.6) / 0.35; if (a < 0) continue;
    objeto2d(ctx, OBJ(e), x0 + (i % lado + 0.5) * tam, y0 + (Math.floor(i / lado) + 0.5) * tam, tam * 0.92 * salida(a), { sombra: false });
  }
}
export function gente(ctx, t, dur, e, c) {
  paisaje(ctx, c.A, t, { horizonte: 0.5, arboles: 5, semilla: 31 });
  const n = clamp(e.cantidad || 24, 4, 40), cols = Math.ceil(Math.sqrt(n * 1.2)), filas = Math.ceil(n / cols), h = clamp(560 / filas, 150, 330);
  for (let i = 0; i < n; i++) {
    const fila = Math.floor(i / cols), col = i % cols, enFila = Math.min(cols, n - fila * cols), a = ease((t - 0.1 - (i / n) * dur * 0.55) / 0.35); if (a <= 0) continue;
    const x = cx + (col - (enFila - 1) / 2) * (W * 0.82 / cols) + (fila % 2) * 24, y = 1000 + fila * (h * 0.62) + 120;
    persona(ctx, x, y, h * a, i, t + i * 0.2, { saluda: i % 5 === 2 });
  }
}
// Globo terráqueo con continentes que giran y luces de ciudades
export function globo(ctx, t, dur, e, c) {
  paisaje(ctx, c.A, t, { horizonte: 0.5, arboles: 0, semilla: 6, oscuro: 0.35 });
  const R = 400, gx = cx, gy = 1180, g = ctx.createRadialGradient(gx - 120, gy - 140, 60, gx, gy, R);
  g.addColorStop(0, '#5ec4ff'); g.addColorStop(1, '#0b4f9c');
  ctx.save(); ctx.beginPath(); ctx.arc(gx, gy, R * Math.min(1, 0.6 + 0.4 * ease(t / 0.5)), 0, 7); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(gx - R, gy - R, 2 * R, 2 * R);
  const r = azar(77); ctx.fillStyle = '#4caf50';
  for (let k = 0; k < 11; k++) { const bx = ((r() * 2 * R * 2 + t * 38) % (4 * R)) - 2 * R + gx, by = gy + (r() - 0.5) * R * 1.5, s = 70 + r() * 110; ctx.beginPath(); for (let q = 0; q < 8; q++) { const a = (q / 8) * Math.PI * 2, rr = s * (0.6 + 0.4 * Math.sin(q * 2.3 + k)); ctx.lineTo(bx + Math.cos(a) * rr * 1.3, by + Math.sin(a) * rr * 0.8); } ctx.fill(); }
  if (e.modo === 'luces') for (let k = 0; k < 40; k++) { const px = gx + (r() - 0.5) * R * 1.7, py = gy + (r() - 0.5) * R * 1.6; ctx.fillStyle = `rgba(255,230,120,${0.5 + 0.5 * Math.sin(t * 3 + k)})`; ctx.beginPath(); ctx.arc(px, py, 7, 0, 7); ctx.fill(); }
  const s = ctx.createRadialGradient(gx - 160, gy - 160, 40, gx, gy, R * 1.05); s.addColorStop(0, 'rgba(255,255,255,0.35)'); s.addColorStop(0.5, 'rgba(255,255,255,0)'); s.addColorStop(1, 'rgba(0,0,40,0.55)'); ctx.fillStyle = s; ctx.fillRect(gx - R, gy - R, 2 * R, 2 * R); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(gx, gy, R * Math.min(1, 0.6 + 0.4 * ease(t / 0.5)), 0, 7); ctx.stroke();
}
// Línea de tiempo: la barra avanza y cada hito aparece con su fecha
export function linea(ctx, t, dur, e, c) {
  paisaje(ctx, c.A, t, { horizonte: 0.45, arboles: 0, semilla: 8, oscuro: 0.18 });
  const hs = e.hitos || [], a0 = Math.min(...hs.map((h) => h.anio)), a1 = Math.max(...hs.map((h) => h.anio)), y = 1240, x0 = 140, x1 = W - 140, p = ease(t / (dur * 0.7));
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(lerp(x0, x1, p), y); ctx.stroke();
  hs.forEach((h, i) => {
    const f = a1 === a0 ? 0.5 : (h.anio - a0) / (a1 - a0), x = lerp(x0, x1, f), a = ease((p - f * 0.95) / 0.15 + 0.01); if (a <= 0.01) return;
    const arriba = i % 2 === 0, dy = arriba ? -1 : 1;
    ctx.fillStyle = AMARILLO; ctx.beginPath(); ctx.arc(x, y, 24 * a, 0, 7); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y + dy * 30); ctx.lineTo(x, y + dy * 120 * a); ctx.stroke();
    ctx.globalAlpha = a; txt(ctx, String(h.etiqueta_anio || h.anio), clamp(x, 200, W - 200), y + dy * 170, 50, { color: AMARILLO });
    ctx.font = `34px ${BLACK}`; envolver(ctx, h.texto || '', clamp(x, 220, W - 220), y + dy * (arriba ? 250 : 255), 360, 40, '#fff'); ctx.globalAlpha = 1;
    if (h.objeto && i === 0) objeto2d(ctx, h.objeto, clamp(x, 160, W - 160), y + dy * 400, 150 * a);
  });
}
function envolver(ctx, s, x, y, ancho, alto, color) {
  const ps = s.split(' '), ls = []; let cur = '';
  for (const p of ps) { const q = cur ? `${cur} ${p}` : p; if (ctx.measureText(q).width > ancho && cur) { ls.push(cur); cur = p; } else cur = q; }
  ls.push(cur); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ls.forEach((l, i) => { const yy = y + (i - (ls.length - 1) / 2) * alto; ctx.strokeStyle = 'rgba(10,20,40,0.85)'; ctx.lineWidth = 9; ctx.strokeText(l, x, yy); ctx.fillStyle = color; ctx.fillText(l, x, yy); });
}
// Barras que crecen, con el objeto encima y la cifra
export function comparacion(ctx, t, dur, e, c) {
  paisaje(ctx, c.A, t, { horizonte: 0.46, arboles: 0, semilla: 10, oscuro: 0.12 });
  const bs = e.barras || [], max = Math.max(...bs.map((b) => b.valor)) || 1, base = 1560, alto = 640, ancho = Math.min(300, 880 / bs.length - 40), colores = [c.acento, '#34d399', '#f97316', '#a78bfa', '#38bdf8'];
  bs.forEach((b, i) => {
    const x = cx + (i - (bs.length - 1) / 2) * (ancho + 50), k = ease((t - 0.2 - i * 0.3) / 0.9), h = Math.max(6, (b.valor / max) * alto * k);
    ctx.fillStyle = sombrear(colores[i % colores.length], -0.1); ctx.beginPath(); ctx.roundRect(x - ancho / 2, base - h, ancho, h, 24); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x - ancho / 2 + 14, base - h + 10, 22, Math.max(0, h - 20));
    if (b.objeto) objeto2d(ctx, b.objeto, x, base - h - 90, 150 * k);
    ctx.globalAlpha = k; txt(ctx, b.texto || String(b.valor), x, base - h - (b.objeto ? 210 : 70), 70, { color: AMARILLO });
    ctx.font = `38px ${BLACK}`; envolver(ctx, b.etiqueta || '', x, base + 70, ancho + 40, 44, '#fff'); ctx.globalAlpha = 1;
  });
}
// Hoja de calendario con los días que se van tachando
export function calendario(ctx, t, dur, e, c) {
  paisaje(ctx, c.A, t, { horizonte: 0.5, arboles: 0, semilla: 14, oscuro: 0.1 });
  const x0 = 130, w = W - 260, y0 = 780, h = 840, filas = 5, col = 7, ct = w / col, rf = (h - 170) / filas, total = filas * col, hecho = Math.floor(total * ease(t / (dur * 0.75)));
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 36); ctx.fill(); ctx.fillStyle = '#e11d48'; ctx.beginPath(); ctx.roundRect(x0, y0, w, 150, [36, 36, 0, 0]); ctx.fill();
  txt(ctx, 'CALENDARIO', cx, y0 + 76, 64, { color: '#fff', trazo: null });
  for (let i = 0; i < total; i++) {
    const px = x0 + (i % col + 0.5) * ct, py = y0 + 170 + (Math.floor(i / col) + 0.5) * rf; txt(ctx, String(i + 1), px, py, 46, { color: i < hecho ? '#9ca3af' : '#111827', trazo: null });
    if (i < hecho) { ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(px - 30, py - 30); ctx.lineTo(px + 30, py + 30); ctx.moveTo(px + 30, py - 30); ctx.lineTo(px - 30, py + 30); ctx.stroke(); }
  }
}
// Torre de objetos apilados que sube hasta salir de cuadro
export function torre(ctx, t, dur, e, c) {
  const n = clamp(e.cantidad || 30, 6, 80), tam = 190, subida = Math.max(0, (n * tam * 0.62 - 860) * ease(t / (dur * 0.85)));
  paisaje(ctx, c.A, t, { horizonte: 0.74, arboles: 3, semilla: 18 });
  ctx.save(); ctx.translate(0, subida);
  for (let i = 0; i < n; i++) { const a = (t - 0.1 - (i / n) * dur * 0.6) / 0.3; if (a < 0) continue; objeto2d(ctx, OBJ(e), cx + Math.sin(i * 1.7) * 14, H * 0.9 - i * tam * 0.62, tam * Math.min(1, ease(a)), { sombra: false }); }
  ctx.restore();
}
// Calle con una fila de autos que pasa
export function calle(ctx, t, dur, e, c) {
  paisaje(ctx, c.A, t, { horizonte: 0.55, arboles: 5, semilla: 25 });
  ctx.fillStyle = '#3d4048'; ctx.fillRect(0, H * 0.66, W, 360); ctx.fillStyle = '#f4f1e6'; for (let x = -80 + ((t * 220) % 220); x < W; x += 220) ctx.fillRect(x, H * 0.66 + 170, 120, 14);
  const n = clamp(e.cantidad || 8, 2, 10), r = azar(2);
  for (let i = 0; i < n; i++) { const v = 180 + r() * 120, x = ((t * v + i * 330) % (W + 700)) - 350, carril = i % 2 ? 0.86 : 0.78; objeto2d(ctx, OBJ(e, 'autos/sedan'), x, H * carril, 230, { sombra: false, flip: false }); }
}
export function cierre(ctx, t, dur, e, c) {
  paisaje(ctx, c.A, t, { horizonte: 0.56, arboles: 6, semilla: 40 });
  for (let i = 0; i < 5; i++) persona(ctx, 150 + i * 195, 1560 + (i % 2) * 40, 330, i + 2, t + i * 0.3, { saluda: true, salta: Math.abs(Math.sin(t * 3 + i)) * 0.06 });
  objeto2d(ctx, OBJ(e), cx, 1180, 420 * salida(t / 0.6) * (1 + 0.04 * Math.sin(t * 3)));
  const r = azar(17); for (let i = 0; i < 70; i++) { const px = r() * W, v = 0.8 + r(), py = ((t * 260 * v + r() * H) % (H + 100)) - 50; ctx.fillStyle = ['#ffd23c', '#ff5a8a', '#4fb6ff', '#34d399', '#fff'][i % 5]; ctx.save(); ctx.translate(px, py); ctx.rotate(t * 3 + i); ctx.fillRect(-9, -5, 18, 10); ctx.restore(); }
}
export const ESCENAS_2D = { portada, foco, pila, lluvia, cuadricula, gente, globo, linea, comparacion, calendario, torre, calle, cierre };
// Escenas del 3D con nombre propio → la genérica 2D que más se parece
export const ALIAS = { vaso: foco, botellas: pila, camion: calle, piscina: cuadricula, piscinas: cuadricula };
