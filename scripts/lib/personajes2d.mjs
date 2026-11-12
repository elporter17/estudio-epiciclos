// Personajes 2D de Potter Play para las historias «¿Y si pudieras ver…?» (sin IA): un cuerpo redondo oscuro con ojos
// grandes, sudadera de color y peinado propio de cada uno; parpadean, se mueven al hablar y llevan encima un número
// (las mentiras, el dinero…) que sube con un golpe de color cuando cambia. Todo se dibuja con canvas.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => 1 - (1 - clamp(x)) ** 3;
const back = (x) => { x = clamp(x); const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const PIEL = '#17141f', BORDE = '#0a0810';

function pelo(ctx, tipo, r, color) {
  ctx.fillStyle = color;
  if (tipo === 'gorra') {
    ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 1.02, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.75, -r * 0.2, r * 0.6, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  } else if (tipo === 'largo' || tipo === 'cola' || tipo === 'coletas') {
    ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 1.08, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); ctx.fill();
    if (tipo === 'largo') { ctx.beginPath(); ctx.roundRect(-r * 1.08, -r * 0.1, r * 0.42, r * 1.5, r * 0.2); ctx.roundRect(r * 0.66, -r * 0.1, r * 0.42, r * 1.5, r * 0.2); ctx.fill(); }
    if (tipo === 'cola') { ctx.beginPath(); ctx.ellipse(r * 1.0, -r * 0.55, r * 0.32, r * 0.7, 0.6, 0, Math.PI * 2); ctx.fill(); }
    if (tipo === 'coletas') { for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 1.05, -r * 0.35, r * 0.34, 0, Math.PI * 2); ctx.fill(); } }
  } else if (tipo === 'rizado') {
    for (let k = 0; k < 9; k++) { const a = Math.PI * (1.05 + k * 0.11); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92 - r * 0.05, r * 0.3, 0, Math.PI * 2); ctx.fill(); }
  } else if (tipo === 'moño') {
    ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 1.04, Math.PI * 1.0, Math.PI * 2.0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -r * 1.12, r * 0.36, 0, Math.PI * 2); ctx.fill();
  } else if (tipo === 'corto') {
    ctx.beginPath(); ctx.arc(0, -r * 0.12, r * 1.03, Math.PI * 1.08, Math.PI * 1.92); ctx.closePath(); ctx.fill();
  }
  // calvo: nada
}

// Cara: ojos (con parpadeo y mirada) y boca según la expresión; habla = la boca se abre y cierra
function cara(ctx, r, expresion, t, habla, mira = 0) {
  const parpadeo = (t % 4.1) > 3.95 ? 0.15 : 1;
  const ojoY = -r * 0.12, sep = r * 0.38, ow = r * 0.24, oh = r * (expresion === 'sorpresa' ? 0.34 : expresion === 'sueño' ? 0.09 : 0.28) * parpadeo;
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(s * sep, ojoY, ow, Math.max(2, oh), 0, 0, Math.PI * 2); ctx.fill();
    if (oh > 4) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(s * sep + mira * ow * 0.45, ojoY + oh * 0.15, Math.min(ow, oh) * 0.5, 0, Math.PI * 2); ctx.fill(); }
    // Cejas
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round'; ctx.beginPath();
    const cy = ojoY - r * 0.42, inc = expresion === 'enojado' ? 0.16 : expresion === 'triste' ? -0.14 : expresion === 'sorpresa' ? 0 : 0.03;
    ctx.moveTo(s * (sep + ow), cy - (expresion === 'sorpresa' ? r * 0.08 : 0)); ctx.lineTo(s * (sep - ow), cy + s * 0 + inc * r * (s > 0 ? 1 : 1)); ctx.stroke();
  }
  const by = r * 0.42, abre = habla ? (0.25 + 0.75 * Math.abs(Math.sin(t * 13))) : 0;
  ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  if (abre > 0.05 || expresion === 'sorpresa') { ctx.ellipse(0, by, r * (expresion === 'sorpresa' ? 0.13 : 0.18), r * (expresion === 'sorpresa' ? 0.17 : 0.05 + 0.14 * abre), 0, 0, Math.PI * 2); ctx.fill(); }
  else if (expresion === 'feliz') { ctx.arc(0, by - r * 0.12, r * 0.26, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  else if (expresion === 'triste') { ctx.arc(0, by + r * 0.16, r * 0.22, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); }
  else if (expresion === 'enojado') { ctx.moveTo(-r * 0.2, by + r * 0.04); ctx.lineTo(r * 0.2, by - r * 0.02); ctx.stroke(); }
  else if (expresion === 'pensando') { ctx.moveTo(-r * 0.12, by); ctx.lineTo(r * 0.18, by - r * 0.05); ctx.stroke(); }
  else { ctx.moveTo(-r * 0.15, by); ctx.lineTo(r * 0.15, by); ctx.stroke(); }
}

// El número encima de la cabeza: { valor, de?, en? (0..1 de la escena), rojo? }. Devuelve el alto que ocupa
const fmt = (n) => Math.round(n).toLocaleString('es-HN').replace(/,/g, '.');
export function numeroSobre(ctx, cx, y, num, p, t, { fuente = 'Archivo Black, Impact, sans-serif', escala = 1 } = {}) {
  const en = num.en ?? 0.55, cambia = num.de != null && num.de !== num.valor, k = cambia ? ease((p - en) / 0.06) : 1;
  const v = cambia ? num.de + (num.valor - num.de) * k : num.valor;
  const golpe = cambia && p >= en && p < en + 0.12 ? 1 + 0.35 * (1 - (p - en) / 0.12) : 1;
  const aparece = num.aparece ? back(p / 0.12) : 1;
  const texto = `${num.prefijo || ''}${fmt(v)}`, size = 64 * escala;
  ctx.save(); ctx.translate(cx, y); ctx.scale(aparece * golpe, aparece * golpe);
  ctx.font = `400 ${size}px ${fuente}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(texto).width + size * 0.8, h = size * 1.35;
  const color = num.color || (num.valor > 1000 ? '#ef4444' : num.valor > 100 ? '#f59e0b' : '#22c55e');
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.fillText(texto, 0, size * 0.04);
  ctx.restore();
  return h;
}

// Un personaje: p = { ropa, pelo, colorPelo, tam, lentes, traje }, (x, suelo) en píxeles, alto en píxeles
export function dibujarPersona(ctx, p, x, suelo, alto, { t = 0, habla = false, expresion = 'neutro', mira = 0, entra = 1 } = {}) {
  const tam = p.tam || 1, H = alto * tam, r = H * 0.2, bob = habla ? Math.sin(t * 9) * H * 0.008 : Math.sin(t * 1.6 + x) * H * 0.006;
  ctx.save(); ctx.translate(x, suelo + bob); ctx.globalAlpha *= entra;
  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0, 0, H * 0.24, H * 0.04, 0, 0, Math.PI * 2); ctx.fill();
  // Piernas
  ctx.fillStyle = PIEL; ctx.beginPath(); ctx.roundRect(-H * 0.11, -H * 0.3, H * 0.09, H * 0.3, H * 0.04); ctx.roundRect(H * 0.02, -H * 0.3, H * 0.09, H * 0.3, H * 0.04); ctx.fill();
  // Cuerpo con sudadera (o traje)
  ctx.fillStyle = p.ropa || '#14b8a6'; ctx.strokeStyle = BORDE; ctx.lineWidth = H * 0.012;
  ctx.beginPath(); ctx.roundRect(-H * 0.19, -H * 0.66, H * 0.38, H * 0.4, H * 0.14); ctx.fill(); ctx.stroke();
  if (p.traje) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-H * 0.05, -H * 0.64); ctx.lineTo(0, -H * 0.5); ctx.lineTo(H * 0.05, -H * 0.64); ctx.fill(); ctx.fillStyle = '#b91c1c'; ctx.fillRect(-H * 0.012, -H * 0.6, H * 0.024, H * 0.14); }
  else { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = H * 0.01; ctx.beginPath(); ctx.moveTo(-H * 0.07, -H * 0.4); ctx.lineTo(H * 0.07, -H * 0.4); ctx.stroke(); }
  // Brazos (al hablar, uno se mueve)
  ctx.fillStyle = p.ropa || '#14b8a6';
  const gesto = habla ? Math.sin(t * 5) * 0.35 : 0;
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * H * 0.18, -H * 0.6); ctx.rotate(s * (0.18 + (s > 0 ? gesto : 0)));
    ctx.beginPath(); ctx.roundRect(-H * 0.045, 0, H * 0.09, H * 0.3, H * 0.045); ctx.fill(); ctx.strokeStyle = BORDE; ctx.lineWidth = H * 0.01; ctx.stroke();
    ctx.fillStyle = PIEL; ctx.beginPath(); ctx.arc(0, H * 0.31, H * 0.045, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = p.ropa || '#14b8a6';
    ctx.restore();
  }
  // Cabeza
  ctx.translate(0, -H * 0.66 - r * 0.82);
  ctx.fillStyle = PIEL; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  pelo(ctx, p.pelo, r, p.colorPelo || '#2b2333');
  cara(ctx, r, expresion, t + x * 0.01, habla, mira);
  if (p.lentes) { ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = r * 0.06; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.38, -r * 0.12, r * 0.3, 0, Math.PI * 2); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-r * 0.08, -r * 0.14); ctx.lineTo(r * 0.08, -r * 0.14); ctx.stroke(); }
  ctx.restore();
  // Dónde va el número: encima de la cabeza
  return { cabeza: suelo + bob - H * 0.66 - r * 1.82 - (p.pelo === 'moño' ? r * 0.5 : 0) };
}
