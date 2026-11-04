// Máquinas en 2D animadas para «Cómo se hace» (sin IA): una fábrica dibujada con formas planas y contorno grueso,
// engranajes que giran al fondo y la máquina de cada paso en el centro. Lo que entra (emoji «entrada») se ve antes de
// la máquina y lo que sale («salida») después, así se entiende la transformación sin narración.
//   dibujarMaquina(ctx, tipo, caja {x, y, w, h}, t (s desde que empieza el paso), paso, emoji(ctx, e, x, y, size))
// Tipos: cosecha cinta lavado horno tostar prensa corte mezcla molde enfria empaque molino fundir secado fermenta
//        extruir inspeccion camion
const TINTA = '#1d1a17', METAL = '#9aa4ad', METAL2 = '#6c7680', BANDA = '#2b2f33';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
// Ruido determinista (las partículas no tiemblan entre cuadros)
const rnd = (k) => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function rr(ctx, x, y, w, h, r, fill, stroke = TINTA, lw = 7) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function circulo(ctx, x, y, r, fill, stroke = TINTA, lw = 7) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
export function engranaje(ctx, x, y, r, dientes, ang, color, borde = TINTA) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.beginPath();
  for (let i = 0; i < dientes * 2; i++) {
    const a0 = (i / (dientes * 2)) * Math.PI * 2, a1 = ((i + 1) / (dientes * 2)) * Math.PI * 2, rr2 = i % 2 ? r : r * 1.18;
    ctx.lineTo(rr2 * Math.cos(a0), rr2 * Math.sin(a0)); ctx.lineTo(rr2 * Math.cos(a1), rr2 * Math.sin(a1));
  }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = borde; ctx.lineWidth = 5; ctx.stroke();
  circulo(ctx, 0, 0, r * 0.32, '#e9e4da', borde, 5); ctx.restore();
}

// Fondo de fábrica: pared con tubos, engranajes girando y piso; el color de acento es el del tema
export function fabrica(ctx, b, t, acento, radio = 40) {
  ctx.save(); ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, radio); ctx.clip();
  const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, '#f3ead9'); g.addColorStop(1, '#e2d5bd');
  ctx.fillStyle = g; ctx.fillRect(b.x, b.y, b.w, b.h);
  // Ladrillos suaves
  ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.lineWidth = 3;
  for (let y = b.y + 30, f = 0; y < b.y + b.h * 0.78; y += 54, f++) for (let x = b.x - (f % 2) * 60; x < b.x + b.w; x += 120) ctx.strokeRect(x, y, 120, 54);
  // Engranajes del fondo
  engranaje(ctx, b.x + 110, b.y + 120, 62, 10, t * 0.8, 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.12)');
  engranaje(ctx, b.x + 205, b.y + 80, 38, 8, -t * 1.3, 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.12)');
  engranaje(ctx, b.x + b.w - 110, b.y + 140, 70, 11, -t * 0.6, 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.12)');
  // Tubo con vapor
  rr(ctx, b.x + b.w - 70, b.y - 10, 34, b.h * 0.5, 8, '#c9bda8', 'rgba(0,0,0,0.15)', 4);
  for (let i = 0; i < 4; i++) { const k = (t * 0.6 + i / 4) % 1; ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(b.x + b.w - 53 + Math.sin(k * 6 + i) * 14, b.y + b.h * 0.5 - k * 160, 16 + k * 28, 0, Math.PI * 2); ctx.fill(); }
  // Piso
  const py = b.y + b.h * 0.8; ctx.fillStyle = '#b9a98c'; ctx.fillRect(b.x, py, b.w, b.h - (py - b.y));
  ctx.fillStyle = acento; ctx.fillRect(b.x, py, b.w, 10);
  ctx.restore();
  return py;
}

// Cinta transportadora: los objetos avanzan de izquierda a derecha; antes de «corte» se ven como entrada y después como salida
function cinta(ctx, b, t, py, { entrada, salida, emoji, corte = 0.5, vel = 140, tam = 110, ocultar = null }) {
  const y = py - 70, x0 = b.x + 30, x1 = b.x + b.w - 30;
  rr(ctx, x0, y, x1 - x0, 46, 23, BANDA, TINTA, 6);
  ctx.strokeStyle = '#4a5056'; ctx.lineWidth = 5;
  for (let x = x0 + ((t * vel) % 60); x < x1 - 10; x += 60) { ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x - 14, y + 38); ctx.stroke(); }
  for (const x of [x0 + 30, x1 - 30]) circulo(ctx, x, y + 23, 18, METAL, TINTA, 5);
  for (const x of [x0 + 80, (x0 + x1) / 2, x1 - 80]) rr(ctx, x - 12, y + 46, 24, py - y - 46, 4, METAL2, TINTA, 5);
  const paso = 230, cx = x0 + (x1 - x0) * corte;
  for (let x = x0 - paso + ((t * vel) % paso); x < x1 + paso; x += paso) {
    if (x < x0 - 40 || x > x1 + 40) continue;
    if (ocultar && Math.abs(x - cx) < ocultar) continue;
    emoji(ctx, x < cx ? entrada : salida, x, y - tam * 0.42 + Math.sin(t * 6 + x) * 3, tam);
  }
  return { y, cx };
}

const MAQ = {
  cinta(ctx, b, t, py, p, emoji) {
    const { y, cx } = cinta(ctx, b, t, py, { ...p, emoji });
    // Arco de control en el centro
    rr(ctx, cx - 150, y - 300, 40, 300, 10, METAL, TINTA, 6); rr(ctx, cx + 110, y - 300, 40, 300, 10, METAL, TINTA, 6); rr(ctx, cx - 165, y - 330, 330, 54, 16, '#e7b93a', TINTA, 6);
    ctx.fillStyle = Math.sin(t * 8) > 0 ? '#2fbf71' : '#9fe3bf'; circulo(ctx, cx, y - 303, 14, ctx.fillStyle, TINTA, 4);
  },
  inspeccion(ctx, b, t, py, p, emoji) {
    const { y, cx } = cinta(ctx, b, t, py, { ...p, emoji });
    // Lupa que barre y marcas de aprobado
    const lx = cx + Math.sin(t * 1.6) * 220, ly = y - 260;
    ctx.fillStyle = 'rgba(120,200,255,0.18)'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - 90, y - 10); ctx.lineTo(lx + 90, y - 10); ctx.closePath(); ctx.fill();
    circulo(ctx, lx, ly, 70, 'rgba(200,235,255,0.55)', TINTA, 9); ctx.strokeStyle = TINTA; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(lx + 50, ly - 50); ctx.lineTo(lx + 105, ly - 105); ctx.stroke();
    if ((t % 1.2) < 0.6) emoji(ctx, '✅', cx + 260, y - 330, 80);
  },
  lavado(ctx, b, t, py, p, emoji) {
    const { y, cx } = cinta(ctx, b, t, py, { ...p, emoji });
    rr(ctx, cx - 220, y - 360, 440, 50, 18, METAL, TINTA, 6);
    for (let i = 0; i < 5; i++) {
      const nx = cx - 180 + i * 90; rr(ctx, nx - 14, y - 312, 28, 30, 6, METAL2, TINTA, 4);
      for (let k = 0; k < 6; k++) { const f = (t * 1.8 + k / 6 + i * 0.13) % 1; ctx.fillStyle = 'rgba(70,160,255,0.75)'; ctx.beginPath(); ctx.ellipse(nx + (rnd(i * 9 + k) - 0.5) * 50 * f, y - 280 + f * 230, 6, 12, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    for (let k = 0; k < 10; k++) { const f = (t * 0.7 + k / 10) % 1; circulo(ctx, cx - 250 + rnd(k) * 500, y - 20 - f * 140, 10 + rnd(k + 3) * 14, 'rgba(255,255,255,0.7)', 'rgba(70,160,255,0.6)', 3); }
  },
  horno(ctx, b, t, py, p, emoji) {
    const { y, cx } = cinta(ctx, b, t, py, { ...p, emoji, ocultar: 190 });
    rr(ctx, cx - 210, y - 360, 420, 400, 30, '#c2552f', TINTA, 8);
    const brillo = 0.75 + 0.25 * Math.sin(t * 9);
    const g = ctx.createRadialGradient(cx, y - 150, 10, cx, y - 150, 170); g.addColorStop(0, `rgba(255,230,120,${brillo})`); g.addColorStop(1, 'rgba(255,120,30,0.9)');
    rr(ctx, cx - 150, y - 290, 300, 230, 24, g, TINTA, 7);
    emoji(ctx, p.entrada, cx, y - 170, 110);
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(255,140,40,0.7)'; ctx.lineWidth = 7; ctx.beginPath(); for (let k = 0; k <= 20; k++) { const yy = y - 380 - k * 9, xx = cx - 90 + i * 90 + Math.sin(k * 0.6 + t * 6 + i) * 12; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    rr(ctx, cx + 150, y - 340, 46, 46, 12, '#e7b93a', TINTA, 5); ctx.font = '700 30px sans-serif'; ctx.fillStyle = TINTA; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('°C', cx + 173, y - 316);
  },
  tostar(ctx, b, t, py, p, emoji) {
    // Tambor que gira con fuego debajo
    const cx = b.x + b.w / 2, cy = py - 290;
    for (let i = 0; i < 7; i++) { const h = 60 + 40 * Math.abs(Math.sin(t * 7 + i)); ctx.fillStyle = i % 2 ? '#ff9a2e' : '#ffd23f'; ctx.beginPath(); ctx.moveTo(cx - 180 + i * 60, py - 40); ctx.quadraticCurveTo(cx - 205 + i * 60, py - 40 - h * 0.6, cx - 180 + i * 60 + 12, py - 40 - h); ctx.quadraticCurveTo(cx - 150 + i * 60, py - 40 - h * 0.5, cx - 150 + i * 60, py - 40); ctx.fill(); }
    rr(ctx, cx - 230, cy - 170, 460, 300, 150, '#7d8790', TINTA, 9);
    ctx.save(); ctx.beginPath(); ctx.roundRect(cx - 230, cy - 170, 460, 300, 150); ctx.clip();
    for (let k = 0; k < 9; k++) { const a = t * 2.2 + k * 0.7; emoji(ctx, k % 3 ? p.entrada : p.salida, cx + Math.cos(a) * 130, cy - 20 + Math.sin(a) * 80, 80); }
    ctx.restore();
    ctx.strokeStyle = TINTA; ctx.lineWidth = 6; for (let k = 0; k < 6; k++) { const a = t * 2.2 + k; ctx.beginPath(); ctx.moveTo(cx, cy - 20); ctx.lineTo(cx + Math.cos(a) * 200, cy - 20 + Math.sin(a) * 120); ctx.stroke(); }
    emoji(ctx, p.salida, cx + 330, py - 90, 110);
  },
  prensa(ctx, b, t, py, p, emoji) {
    const { y, cx } = cinta(ctx, b, t, py, { ...p, emoji, ocultar: 110, vel: 0 });
    const golpe = Math.max(0, Math.sin(t * 2.6)) ** 6, baja = golpe * 150;
    rr(ctx, cx - 190, y - 560, 380, 70, 16, METAL2, TINTA, 7);
    rr(ctx, cx - 30, y - 490, 60, 140 + baja, 6, METAL, TINTA, 6);
    rr(ctx, cx - 150, y - 360 + baja, 300, 90, 16, '#d7263d', TINTA, 7);
    for (const x of [cx - 220, cx + 190]) rr(ctx, x, y - 560, 30, 560, 8, METAL2, TINTA, 6);
    const aplasta = golpe > 0.6;
    ctx.save(); ctx.translate(cx, y - 50); ctx.scale(1 + golpe * 0.35, 1 - golpe * 0.45); emoji(ctx, aplasta ? p.salida : p.entrada, 0, -10, 130); ctx.restore();
    if (golpe > 0.8) for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI; ctx.strokeStyle = '#e7b93a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 170, y - 60 - Math.sin(a) * 40); ctx.lineTo(cx + Math.cos(a) * 230, y - 60 - Math.sin(a) * 70); ctx.stroke(); }
    emoji(ctx, p.entrada, b.x + 120, y - 50, 100); emoji(ctx, p.salida, b.x + b.w - 120, y - 50, 100);
  },
  corte(ctx, b, t, py, p, emoji) {
    const { y, cx } = cinta(ctx, b, t, py, { ...p, emoji, vel: 120 });
    rr(ctx, cx - 20, y - 420, 40, 170, 8, METAL2, TINTA, 6);
    ctx.save(); ctx.translate(cx, y - 220); ctx.rotate(t * 14);
    ctx.beginPath(); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 120 : 140; ctx.lineTo(r * Math.cos(a), r * Math.sin(a)); } ctx.closePath();
    ctx.fillStyle = '#d6dde3'; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 6; ctx.stroke(); circulo(ctx, 0, 0, 30, METAL2, TINTA, 5); ctx.restore();
    for (let k = 0; k < 12; k++) { const f = (t * 2 + k / 12) % 1, a = -0.3 - rnd(k) * 1.2; ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.arc(cx + 60 + Math.cos(a) * f * 260, y - 100 + Math.sin(a) * f * 200 + f * f * 120, 7 * (1 - f) + 2, 0, Math.PI * 2); ctx.fill(); }
  },
  mezcla(ctx, b, t, py, p, emoji) {
    const cx = b.x + b.w / 2, cy = py - 250;
    // Ingredientes que caen al tazón
    for (let k = 0; k < 4; k++) { const f = (t * 0.8 + k / 4) % 1; emoji(ctx, (p.extra || [p.entrada])[k % (p.extra || [p.entrada]).length], cx - 120 + k * 80, b.y + 60 + f * 260, 80 * (1 - f * 0.4)); }
    rr(ctx, cx - 26, b.y + 20, 52, 200, 10, METAL2, TINTA, 6);
    ctx.beginPath(); ctx.moveTo(cx - 300, cy - 60); ctx.quadraticCurveTo(cx, cy + 320, cx + 300, cy - 60); ctx.closePath(); ctx.fillStyle = '#c9d2da'; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 9; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy - 60, 290, 60, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = p.color || '#8a5a3b'; ctx.fillRect(cx - 300, cy - 130, 600, 140);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 8; ctx.beginPath(); for (let a = 0; a < 18; a += 0.2) { const r = a * 14, x = cx + Math.cos(a + t * 4) * r, y = cy - 60 + Math.sin(a + t * 4) * r * 0.22; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
    ctx.strokeStyle = TINTA; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(cx, cy - 60, 290, 60, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.translate(cx, cy - 70); ctx.rotate(Math.sin(t * 5) * 0.5); rr(ctx, -16, -160, 32, 170, 8, METAL, TINTA, 6); ctx.restore();
    emoji(ctx, p.salida, cx + 330, py - 90, 110);
  },
  molde(ctx, b, t, py, p, emoji) {
    const y = py - 70, cx = b.x + b.w / 2;
    rr(ctx, b.x + 30, y, b.w - 60, 46, 23, BANDA, TINTA, 6);
    rr(ctx, cx - 70, b.y + 30, 140, 150, 20, METAL, TINTA, 7); rr(ctx, cx - 18, b.y + 178, 36, 50, 6, METAL2, TINTA, 5);
    // Chorro
    ctx.fillStyle = p.color || '#7a4a2a'; ctx.fillRect(cx - 10, b.y + 228, 20, y - 150 - (b.y + 228));
    const mov = (t * 90) % 260;
    for (let i = -2; i < 4; i++) {
      const mx = cx - 390 + i * 260 + mov, nivel = clamp((mx - (cx - 130)) / 130);
      rr(ctx, mx - 100, y - 150, 200, 150, 14, '#e7e1d6', TINTA, 6);
      if (nivel > 0) { ctx.fillStyle = p.color || '#7a4a2a'; ctx.fillRect(mx - 92, y - 8 - 130 * nivel, 184, 130 * nivel); }
      if (nivel >= 1) emoji(ctx, p.salida, mx, y - 80, 90);
    }
  },
  enfria(ctx, b, t, py, p, emoji) {
    const { y, cx } = cinta(ctx, b, t, py, { ...p, emoji, ocultar: 170 });
    rr(ctx, cx - 200, y - 380, 400, 400, 30, '#bfe3ff', TINTA, 8);
    rr(ctx, cx - 140, y - 320, 280, 250, 20, 'rgba(255,255,255,0.65)', TINTA, 6);
    emoji(ctx, p.entrada, cx, y - 195, 110);
    for (let k = 0; k < 14; k++) { const f = (t * 0.5 + k / 14) % 1; emoji(ctx, '❄️', cx - 260 + rnd(k) * 520, b.y + 40 + f * (y - b.y - 80), 40); }
    rr(ctx, cx - 60, y - 420, 120, 50, 12, '#2f6fb5', TINTA, 5); ctx.font = '700 30px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('-18°', cx, y - 394);
  },
  empaque(ctx, b, t, py, p, emoji) {
    const y = py - 70, cx = b.x + b.w / 2;
    rr(ctx, b.x + 30, y, b.w - 60, 46, 23, BANDA, TINTA, 6);
    const f = (t * 0.45) % 1;
    // El objeto baja a la caja, las tapas se cierran y sale con sello
    const caeY = b.y + 120 + clamp(f / 0.4) * (y - 260 - (b.y + 120));
    rr(ctx, cx - 160, y - 220, 320, 220, 10, '#c99a5b', TINTA, 7);
    if (f < 0.55) emoji(ctx, p.entrada, cx, caeY, 120);
    const cierra = clamp((f - 0.45) / 0.25);
    ctx.save(); ctx.translate(cx - 160, y - 220); ctx.rotate(-Math.PI * 0.75 * (1 - cierra)); rr(ctx, 0, -10, 160, 20, 6, '#b5854a', TINTA, 6); ctx.restore();
    ctx.save(); ctx.translate(cx + 160, y - 220); ctx.rotate(Math.PI * 0.75 * (1 - cierra)); rr(ctx, -160, -10, 160, 20, 6, '#b5854a', TINTA, 6); ctx.restore();
    if (f > 0.75) { ctx.save(); ctx.translate(cx, y - 110); ctx.rotate(-0.15); rr(ctx, -110, -40, 220, 80, 12, null, '#d7263d', 8); ctx.font = '400 40px "Archivo Black", Impact, sans-serif'; ctx.fillStyle = '#d7263d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('LISTO', 0, 2); ctx.restore(); }
    emoji(ctx, p.salida || '📦', b.x + b.w - 130, y - 70, 110);
  },
  molino(ctx, b, t, py, p, emoji) {
    const cx = b.x + b.w / 2, cy = b.y + b.h * 0.42;
    rr(ctx, cx - 160, b.y + 40, 320, 120, 20, METAL, TINTA, 7);
    for (let k = 0; k < 4; k++) { const f = (t * 0.9 + k / 4) % 1; emoji(ctx, p.entrada, cx - 60 + k * 40, b.y - 20 + f * 160, 70); }
    engranaje(ctx, cx - 78, cy, 80, 12, t * 3, '#cfd6dc'); engranaje(ctx, cx + 78, cy, 80, 12, -t * 3 + 0.26, '#cfd6dc');
    for (let k = 0; k < 40; k++) { const f = (t * 1.4 + rnd(k)) % 1; ctx.fillStyle = p.color || '#8a5a3b'; ctx.beginPath(); ctx.arc(cx + (rnd(k + 7) - 0.5) * 80 * (0.4 + f), cy + 90 + f * (py - cy - 150), 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = p.color || '#8a5a3b'; ctx.beginPath(); ctx.ellipse(cx, py - 40, 200, 50, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 6; ctx.stroke();
    emoji(ctx, p.salida, cx + 320, py - 90, 110);
  },
  fundir(ctx, b, t, py, p, emoji) {
    const cx = b.x + b.w / 2 - 80, cy = py - 230;
    for (let i = 0; i < 6; i++) { const h = 70 + 50 * Math.abs(Math.sin(t * 8 + i * 1.3)); ctx.fillStyle = i % 2 ? '#ff6b2e' : '#ffd23f'; ctx.beginPath(); ctx.moveTo(cx - 150 + i * 60, py - 30); ctx.quadraticCurveTo(cx - 170 + i * 60, py - 30 - h * 0.7, cx - 140 + i * 60, py - 30 - h); ctx.quadraticCurveTo(cx - 110 + i * 60, py - 30 - h * 0.5, cx - 110 + i * 60, py - 30); ctx.fill(); }
    const incl = clamp((Math.sin(t * 1.2) + 0.2)) * 0.5;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(incl);
    ctx.beginPath(); ctx.moveTo(-170, -130); ctx.lineTo(170, -130); ctx.lineTo(130, 110); ctx.lineTo(-130, 110); ctx.closePath(); ctx.fillStyle = '#5d6670'; ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 9; ctx.stroke();
    const g = ctx.createLinearGradient(0, -110, 0, 0); g.addColorStop(0, '#fff3a0'); g.addColorStop(1, '#ff7a1a'); ctx.fillStyle = g; ctx.fillRect(-155, -112, 310, 70);
    ctx.restore();
    if (incl > 0.3) { ctx.strokeStyle = '#ff9a2e'; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + 175, cy - 70); ctx.quadraticCurveTo(cx + 250, cy - 40, cx + 270, py - 120); ctx.stroke(); ctx.lineCap = 'butt'; }
    rr(ctx, cx + 200, py - 130, 150, 100, 12, '#7d8790', TINTA, 6);
    emoji(ctx, p.salida, cx + 275, py - 200, 90);
  },
  secado(ctx, b, t, py, p, emoji) {
    const cx = b.x + b.w / 2;
    ctx.save(); ctx.translate(b.x + 170, b.y + 150); ctx.rotate(t * 0.6);
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); rr(ctx, 70, -8, 50, 16, 8, '#ffb703', null); }
    ctx.restore(); circulo(ctx, b.x + 170, b.y + 150, 62, '#ffd23f', TINTA, 6);
    // Bandejas con el producto
    for (let r = 0; r < 2; r++) {
      const yy = py - 140 - r * 190; rr(ctx, cx - 300, yy, 600, 26, 10, '#a77b4f', TINTA, 6);
      for (let k = 0; k < 5; k++) emoji(ctx, (t + k * 0.4 + r) % 4 < 2 ? p.entrada : p.salida, cx - 240 + k * 120, yy - 42, 80);
    }
    ctx.strokeStyle = 'rgba(80,140,200,0.55)'; ctx.lineWidth = 6;
    for (let k = 0; k < 5; k++) { const f = (t * 0.9 + k / 5) % 1; ctx.beginPath(); for (let s = 0; s < 30; s++) { const x = b.x + 40 + f * b.w + s * 10, y = b.y + 300 + k * 60 + Math.sin(s * 0.5 + t * 4) * 10; s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  },
  fermenta(ctx, b, t, py, p, emoji) {
    const cx = b.x + b.w / 2;
    for (const [dx, w] of [[-170, 260], [170, 260]]) {
      rr(ctx, cx + dx - w / 2, py - 460, w, 440, 50, '#a77b4f', TINTA, 8);
      for (const yy of [py - 380, py - 160]) rr(ctx, cx + dx - w / 2 - 6, yy, w + 12, 24, 8, METAL2, TINTA, 5);
      for (let k = 0; k < 8; k++) { const f = (t * 0.6 + k / 8 + dx) % 1; circulo(ctx, cx + dx - 70 + rnd(k + dx) * 140, py - 60 - f * 380, 8 + rnd(k) * 10, 'rgba(255,255,255,0.75)', 'rgba(0,0,0,0.25)', 3); }
      emoji(ctx, p.entrada, cx + dx, py - 250, 100);
    }
    // Reloj: el tiempo pasa
    const rx = cx, ry = b.y + 90; circulo(ctx, rx, ry, 62, '#fff', TINTA, 6);
    ctx.strokeStyle = TINTA; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(t * 4 - 1.57) * 44, ry + Math.sin(t * 4 - 1.57) * 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(t * 0.33 - 1.57) * 28, ry + Math.sin(t * 0.33 - 1.57) * 28); ctx.stroke();
  },
  extruir(ctx, b, t, py, p, emoji) {
    const y = py - 70, cx = b.x + 300;
    rr(ctx, b.x + 30, y, b.w - 60, 46, 23, BANDA, TINTA, 6);
    rr(ctx, b.x + 60, y - 340, 300, 300, 30, '#4f7fb3', TINTA, 8);
    rr(ctx, b.x + 120, y - 450, 180, 120, 16, METAL, TINTA, 6);
    for (let k = 0; k < 3; k++) { const f = (t * 0.8 + k / 3) % 1; emoji(ctx, p.entrada, b.x + 170 + k * 40, y - 520 + f * 90, 60); }
    engranaje(ctx, b.x + 210, y - 190, 70, 10, t * 2, '#cfd6dc');
    // Tira continua que sale y se corta en piezas
    const largo = b.w - 420; ctx.fillStyle = p.color || '#d7263d';
    rr(ctx, cx + 60, y - 110, largo, 70, 14, p.color || '#d7263d', TINTA, 6);
    ctx.strokeStyle = TINTA; ctx.lineWidth = 6; for (let x = cx + 60 + ((t * 120) % 140); x < cx + 60 + largo; x += 140) { ctx.beginPath(); ctx.moveTo(x, y - 110); ctx.lineTo(x, y - 40); ctx.stroke(); }
    emoji(ctx, p.salida, b.x + b.w - 120, y - 200, 100);
  },
  cosecha(ctx, b, t, py, p, emoji) {
    const tx = b.x + 300;
    rr(ctx, tx - 30, py - 360, 60, 340, 12, '#8a5a3b', TINTA, 7);
    for (const [dx, dy, r] of [[0, -470, 190], [-150, -380, 130], [150, -380, 130]]) circulo(ctx, tx + dx, py + dy, r, '#3fa65c', TINTA, 7);
    for (let k = 0; k < 6; k++) emoji(ctx, p.entrada, tx - 150 + (k % 3) * 150, py - 520 + Math.floor(k / 3) * 140 + Math.sin(t * 2 + k) * 4, 80);
    for (let k = 0; k < 3; k++) { const f = (t * 0.7 + k / 3) % 1; emoji(ctx, p.entrada, tx + 120 + f * 220, py - 360 + f * f * 250, 80); }
    const bx = b.x + b.w - 260; ctx.fillStyle = '#c99a5b'; ctx.beginPath(); ctx.moveTo(bx - 140, py - 220); ctx.lineTo(bx + 140, py - 220); ctx.lineTo(bx + 110, py - 30); ctx.lineTo(bx - 110, py - 30); ctx.closePath(); ctx.fill(); ctx.strokeStyle = TINTA; ctx.lineWidth = 7; ctx.stroke();
    for (let k = 0; k < 3; k++) emoji(ctx, p.salida || p.entrada, bx - 70 + k * 70, py - 240, 80);
  },
  camion(ctx, b, t, py, p, emoji) {
    // Carretera que corre, el camión y la tienda que se acerca
    ctx.fillStyle = '#5b6168'; ctx.fillRect(b.x, py - 120, b.w, 120);
    ctx.fillStyle = '#ffd23f'; for (let x = b.x - ((t * 400) % 160); x < b.x + b.w; x += 160) ctx.fillRect(x, py - 66, 80, 12);
    for (let k = 0; k < 5; k++) { const x = b.x + ((k * 260 - t * 120) % (b.w + 300) + b.w + 300) % (b.w + 300) - 150; rr(ctx, x, py - 120 - 160 - (k % 3) * 60, 120, 160 + (k % 3) * 60, 6, 'rgba(0,0,0,0.12)', null); }
    const tienda = b.x + b.w + 200 - ((t * 60) % (b.w + 400));
    emoji(ctx, '🏪', tienda, py - 230, 180);
    emoji(ctx, '🚚', b.x + b.w * 0.42 + Math.sin(t * 9) * 2, py - 160 + Math.abs(Math.sin(t * 12)) * -4, 230);
    emoji(ctx, p.salida || '📦', b.x + b.w * 0.42 + 10, py - 330, 80);
  }
};

export const TIPOS_MAQUINA = Object.keys(MAQ);
// continuo: las estaciones van una al lado de la otra (sin bordes), para recorrer la fábrica en un solo plano
export function dibujarMaquina(ctx, tipo, b, t, paso, emoji, acento = '#e7b93a', { continuo = false } = {}) {
  const radio = continuo ? 0 : 40, py = fabrica(ctx, b, t, acento, radio);
  ctx.save(); ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, radio); ctx.clip();
  (MAQ[tipo] || MAQ.cinta)(ctx, b, t, py, paso, emoji);
  ctx.restore();
  if (!continuo) rr(ctx, b.x, b.y, b.w, b.h, 40, null, 'rgba(0,0,0,0.25)', 6);
  else { ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(b.x + b.w - 8, b.y, 16, py - b.y); }
}
