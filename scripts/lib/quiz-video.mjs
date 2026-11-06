// Videos de quiz y curiosidades (sin IA): cada video es una lista de escenas (intro, dato, pregunta, bandera, cierre)
// dibujadas con canvas, con sonidos y una melodía de dominio público sintetizados aquí, y codificadas con ffmpeg.
// Lo usa scripts/curiosidades-video.mjs. Formato Reels: 1080×1920; lo importante queda entre y = 170 y 1430, fuera
// de la zona que tapan la descripción y los botones de Facebook.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { wavBuffer } from '../bounce.mjs';
import { midiFreq } from '../../src/melodias.js';
import { TEMAS } from './tarjetas.mjs';
import { tituloVisual, marcaVisual, insigniaNivel } from './retos-visuales.mjs';
import { escritorio, gancho as ganchoDebate } from './debate.mjs';
import { pistaMusical } from './musica.mjs';
import { dibujarMaquina, fondoFabrica } from './maquinas.mjs';
import { cargarObjetos } from './objetos3d.mjs';
import { narrar } from './voz.mjs';

export const W = 1080, H = 1920;
const SR = 44100, FPS = 30;
const SANS = '"IBM Plex Sans", "STIX Two Text", system-ui, sans-serif', BLACK = '"Archivo Black", Impact, sans-serif';
const VERDE = '#2fbf71', ROJO = '#ff5a5f';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
// Opacidad de la escena (FADE es el fundido de salida)
let FADE = 1, SOMBRA = false;
const alfa = (ctx, v) => { ctx.globalAlpha = clamp(v) * FADE; };
const ease = (x) => 1 - (1 - clamp(x)) ** 3;
const back = (x) => { x = clamp(x); const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

// ---------- texto ----------
let EMOJI = '';
const font = (peso, size, fam = SANS) => `${peso} ${size}px ${fam}${EMOJI}`;
function wrap(ctx, text, maxW) {
  const out = [];
  for (const par of String(text).split('\n')) {
    let cur = '';
    for (const w of par.split(/\s+/).filter(Boolean)) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
    out.push(cur);
  }
  return out;
}
// El tamaño más grande con el que el texto cabe en la caja (se calcula una vez por texto y caja)
const cacheFit = new Map();
function fit(ctx, text, maxW, maxH, { from = 80, to = 34, peso = 700, fam = SANS, lh = 1.2 } = {}) {
  const k = [text, maxW, maxH, from, to, peso, fam].join('|');
  if (cacheFit.has(k)) return cacheFit.get(k);
  let r;
  for (let s = from; s >= to; s -= 2) {
    ctx.font = font(peso, s, fam); const lines = wrap(ctx, text, maxW);
    if (lines.length * s * lh <= maxH && lines.every((l) => ctx.measureText(l).width <= maxW)) { r = { size: s, lines }; break; }
  }
  if (!r) { ctx.font = font(peso, to, fam); r = { size: to, lines: wrap(ctx, text, maxW) }; }
  r.lh = r.size * lh; r.peso = peso; r.fam = fam; cacheFit.set(k, r);
  return r;
}
// Texto centrado en una caja (cx, y0..y0+h)
function bloque(ctx, f, cx, y0, h, color = '#fff') {
  ctx.font = font(f.peso, f.size, f.fam); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  if (SOMBRA) { ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 3; }
  const top = y0 + (h - f.lines.length * f.lh) / 2 + f.size * 0.86;
  f.lines.forEach((l, i) => ctx.fillText(l, cx, top + i * f.lh));
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
}
// Caja de texto: translúcida clara sobre los fondos de color, oscura sobre video
const panel = (e) => e.fondo ? 'rgba(0,0,0,0.52)' : 'rgba(255,255,255,0.09)';
// Velo sobre el video: más oscuro arriba y abajo, donde van el texto y la interfaz de Facebook
function velo(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0.62)'); g.addColorStop(0.3, 'rgba(0,0,0,0.30)'); g.addColorStop(0.7, 'rgba(0,0,0,0.38)'); g.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// Imagen que cubre un rectángulo (recortada al centro), dentro de un marco redondeado
function cubrir(ctx, img, x, y, w, h, r) {
  const k = Math.max(w / img.width, h / img.height), iw = img.width * k, ih = img.height * k;
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip(); ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); ctx.restore();
}
function caja(ctx, x, y, w, h, r, fill, stroke, lw = 4) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function emoji(ctx, e, x, y, size) {
  ctx.font = `${size}px ${EMOJI ? EMOJI.slice(2) : 'sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText(e, x, y);
}
// Escala alrededor de un punto
function escala(ctx, s, x, y, fn) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y); fn(); ctx.restore(); }

// ---------- fondo, barra de progreso y marca ----------
function fondo(ctx, tema, t) {
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, tema.a); g.addColorStop(1, tema.b);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Círculos concéntricos que laten (el sello de CirculArte)
  ctx.lineWidth = 3;
  for (let k = 0, r = 90; r < 1100; r += 75, k++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.035 + 0.025 * Math.sin(t * 2 - k * 0.6) ** 2})`;
    ctx.beginPath(); ctx.arc(W * 0.92, H * 0.12, r, 0, Math.PI * 2); ctx.stroke();
  }
  // Una cadena de epiciclos girando abajo a la izquierda
  const cx = W * 0.12, cy = H * 0.9, r1 = 150, r2 = 70, r3 = 32, a1 = t * 0.7, a2 = -t * 1.9, a3 = t * 3.1;
  const p1 = [cx + r1 * Math.cos(a1), cy + r1 * Math.sin(a1)], p2 = [p1[0] + r2 * Math.cos(a2), p1[1] + r2 * Math.sin(a2)], p3 = [p2[0] + r3 * Math.cos(a3), p2[1] + r3 * Math.sin(a3)];
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 3;
  for (const [x, y, r] of [[cx, cy, r1], [...p1, r2], [...p2, r3]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(...p1); ctx.lineTo(...p2); ctx.lineTo(...p3); ctx.stroke();
  ctx.fillStyle = tema.acento; ctx.beginPath(); ctx.arc(...p3, 7, 0, Math.PI * 2); ctx.fill();
}
function cabecera(ctx, tema, idx, total, avance) {
  // Barra por partes (como las historias): las pasadas llenas, la actual avanzando
  const x0 = 70, x1 = W - 70, gap = 10, w = (x1 - x0 - gap * (total - 1)) / total;
  for (let i = 0; i < total; i++) {
    const x = x0 + i * (w + gap);
    caja(ctx, x, 175, w, 12, 6, 'rgba(255,255,255,0.22)');
    const f = i < idx ? 1 : i === idx ? clamp(avance) : 0;
    if (f > 0) caja(ctx, x, 175, Math.max(12, w * f), 12, 6, tema.acento);
  }
  marca(ctx, tema, 235);
  if (idx >= 0) { ctx.font = font(400, 40, BLACK); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(`${idx + 1}/${total}`, W - 70, 240); }
}
function marca(ctx, tema, y) {
  ctx.strokeStyle = tema.acento; ctx.lineWidth = 3;
  for (const r of [7, 13, 19]) { ctx.beginPath(); ctx.arc(92, y + 5, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.font = font(400, 34, BLACK); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillText('Potter Play', 124, y + 6);
}
// Etiqueta tipo píldora (formato de la pregunta)
function pildora(ctx, texto, y, tema, s = 1) {
  ctx.font = font(400, 42, BLACK); const w = ctx.measureText(texto).width + 70;
  escala(ctx, s, W / 2, y + 40, () => {
    caja(ctx, (W - w) / 2, y, w, 80, 40, tema.acento);
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(400, 42, BLACK); ctx.fillText(texto, W / 2, y + 43);
  });
}
// Cuenta atrás: un círculo que se vacía con el número en el centro
function reloj(ctx, cx, cy, r, restante, total, tema) {
  const f = clamp(restante / total), urge = restante <= 2;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = urge ? ROJO : tema.acento; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke(); ctx.lineCap = 'butt';
  const n = Math.max(1, Math.ceil(restante)), pulso = 1 + 0.12 * (1 - (restante % 1 || 1));
  escala(ctx, pulso, cx, cy, () => { ctx.font = font(400, r * 0.95, BLACK); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), cx, cy + 4); });
}

// ---------- escenas ----------
// Cada escena: { tipo, dur, tema, ...datos }. dibujar(ctx, escena, lt) con lt = segundos desde que empieza la escena
const ESCENAS = {
  intro(ctx, e, lt) {
    // e.lineas: [{ texto, size, color? }]; e.iconos: emojis en fila
    // Portada: el primer cuadro del video ya muestra todo (es la miniatura del Reel)
    const pop = (x) => e.portada && lt === 0 ? 1 : back(x);
    let y = e.y0 || 520;
    e.lineas.forEach((l, i) => {
      const s = pop((lt - i * 0.18) / 0.45); if (s <= 0.01) { y += l.size * 1.15; return; }
      const f = fit(ctx, l.texto, W - 160, l.size * 2.3, { from: l.size, to: Math.round(l.size * 0.55), peso: 400, fam: BLACK, lh: 1.08 });
      const h = f.lines.length * f.lh;
      escala(ctx, s, W / 2, y + h / 2, () => bloque(ctx, f, W / 2, y, h, l.color || '#fff'));
      y += h + 26;
    });
    if (e.iconos) {
      const n = e.iconos.length, paso = Math.min(170, (W - 200) / n);
      e.iconos.forEach((ic, i) => {
        const s = pop((lt - 0.5 - i * 0.08) / 0.4); if (s <= 0.01) return;
        escala(ctx, s, W / 2 + (i - (n - 1) / 2) * paso, y + 110, () => emoji(ctx, ic, W / 2 + (i - (n - 1) / 2) * paso, y + 110 + 8 * Math.sin(lt * 4 + i), 120));
      });
    }
  },
  dato(ctx, e, lt) {
    const s = back(lt / 0.35);
    escala(ctx, s, W / 2, 440, () => {
      ctx.fillStyle = e.tema.acento; ctx.beginPath(); ctx.arc(W / 2, 440, 92, 0, Math.PI * 2); ctx.fill();
      ctx.font = font(400, 84, BLACK); ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`#${e.n}`, W / 2, 446);
    });
    const si = back((lt - 0.1) / 0.4);
    if (si > 0.01 && !e.fondo) escala(ctx, si, W / 2, 680, () => emoji(ctx, e.icono, W / 2, 680 + 10 * Math.sin(lt * 3), 180));
    const a = ease((lt - 0.15) / 0.35);
    alfa(ctx, a);
    const dy = (1 - a) * 60, y0 = e.fondo ? 860 : 820;
    caja(ctx, 70, y0 + dy, W - 140, 520, 36, panel(e), 'rgba(255,255,255,0.16)', 3);
    bloque(ctx, fit(ctx, e.texto, W - 220, 470, { from: 72, to: 40, peso: 700 }), W / 2, y0 + 25 + dy, 470);
    alfa(ctx, 1);
  },
  // Verdadero o falso: la afirmación, dos botones, cuenta atrás y la respuesta
  vf(ctx, e, lt) {
    const revela = lt >= e.piensa, rt = lt - e.piensa;
    pildora(ctx, '¿VERDADERO O FALSO?', 300, e.tema, back(lt / 0.35));
    const a = ease(lt / 0.3);
    alfa(ctx, a);
    const borde = revela ? (e.verdadero ? VERDE : ROJO) : 'rgba(255,255,255,0.16)';
    caja(ctx, 70, 420, W - 140, 580, 36, panel(e), borde, revela ? 7 : 3);
    if (!revela || e.verdadero) {
      emoji(ctx, e.icono, W / 2, 505, 110);
      bloque(ctx, fit(ctx, `«${e.texto}»`, W - 220, 400, { from: 68, to: 38, peso: 700 }), W / 2, 570, 400);
    } else {
      // Si era falso, se muestra lo real
      const b = ease(rt / 0.3); alfa(ctx, a * b);
      ctx.font = font(400, 40, BLACK); ctx.fillStyle = VERDE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✔ LO REAL:', W / 2, 490);
      bloque(ctx, fit(ctx, e.real, W - 220, 430, { from: 62, to: 36, peso: 700 }), W / 2, 540, 430);
    }
    alfa(ctx, a);
    const bot = [{ t: '✅ VERDADERO', ok: e.verdadero, x: 70 }, { t: '❌ FALSO', ok: !e.verdadero, x: W / 2 + 15 }];
    for (const b of bot) {
      const w = W / 2 - 85, s = revela && b.ok ? 1 + 0.07 * back(rt / 0.3) : 1;
      alfa(ctx, a * (revela && !b.ok ? 0.3 : 1));
      escala(ctx, s, b.x + w / 2, 1125, () => {
        caja(ctx, b.x, 1060, w, 130, 65, revela && b.ok ? VERDE : 'rgba(255,255,255,0.14)', revela && b.ok ? '#fff' : null, 4);
        ctx.font = font(700, 48); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.t, b.x + w / 2, 1127);
      });
    }
    alfa(ctx, 1);
    if (!revela) reloj(ctx, W / 2, 1335, 72, e.piensa - lt, e.piensa, e.tema);
    else sello(ctx, e.verdadero ? '¡VERDADERO!' : '¡FALSO!', e.verdadero ? VERDE : ROJO, rt);
  },
  // Tres opciones (retos de matemáticas, cálculo mental y banderas)
  opciones(ctx, e, lt) {
    const revela = lt >= e.piensa, rt = lt - e.piensa;
    pildora(ctx, e.etiqueta, 300, e.tema, back(lt / 0.35));
    const a = ease(lt / 0.3);
    alfa(ctx, a);
    let yOp;
    if (e.bandera) {
      const s = back((lt - 0.05) / 0.4);
      escala(ctx, s, W / 2, 610, () => emoji(ctx, e.bandera, W / 2, 610, 300));
      yOp = 850;
    } else {
      caja(ctx, 70, 420, W - 140, 370, 36, panel(e), 'rgba(255,255,255,0.16)', 3);
      if (revela && e.explicacion) {
        alfa(ctx, a * ease(rt / 0.3));
        bloque(ctx, fit(ctx, e.explicacion, W - 220, 320, { from: 54, to: 32, peso: 600 }), W / 2, 445, 320);
      } else bloque(ctx, fit(ctx, e.texto, W - 220, 320, { from: 70, to: 38, peso: 700 }), W / 2, 445, 320);
      yOp = 830;
    }
    e.opciones.forEach((op, i) => {
      const y = yOp + i * 150, ok = i === e.respuesta, s0 = back((lt - 0.15 - i * 0.08) / 0.35);
      const s = s0 * (revela && ok ? 1 + 0.06 * back(rt / 0.3) : 1);
      alfa(ctx, a * (revela && !ok ? 0.3 : 1));
      if (s > 0.01) escala(ctx, s, W / 2, y + 62, () => {
        caja(ctx, 110, y, W - 220, 124, 62, revela && ok ? VERDE : 'rgba(255,255,255,0.14)', revela && ok ? '#fff' : null, 4);
        const f = fit(ctx, `${'ABC'[i]})  ${op}${revela && ok ? '  ✅' : ''}`, W - 300, 100, { from: 52, to: 30, peso: 700 });
        bloque(ctx, f, W / 2, y + 12, 100);
      });
    });
    alfa(ctx, 1);
    if (!revela) reloj(ctx, W / 2, 1335 + (e.bandera ? 25 : 0), 62, e.piensa - lt, e.piensa, e.tema);
    else sello(ctx, `¡ES LA ${'ABC'[e.respuesta]}!`, VERDE, rt, 1335 + (e.bandera ? 25 : 0));
  },
  // «Cómo se hace»: la máquina del paso animada en 2D (scripts/lib/maquinas.mjs) y el texto que aparece letra a letra.
  // Con e.resultado es el cierre: el producto terminado y un dato curioso.
  proceso(ctx, e, lt) {
    pildora(ctx, e.etiqueta, 290, e.tema, back(lt / 0.35));
    const caja0 = { x: 50, y: 395, w: W - 100, h: 740 };
    if (e.resultado) {
      ctx.save(); ctx.beginPath(); ctx.roundRect(caja0.x, caja0.y, caja0.w, caja0.h, 40); ctx.clip();
      const g = ctx.createRadialGradient(W / 2, caja0.y + 360, 40, W / 2, caja0.y + 360, 520); g.addColorStop(0, e.tema.acento); g.addColorStop(1, e.tema.b);
      ctx.fillStyle = g; ctx.fillRect(caja0.x, caja0.y, caja0.w, caja0.h);
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 + lt * 0.4; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(W / 2, caja0.y + 360); ctx.lineTo(W / 2 + Math.cos(a) * 700, caja0.y + 360 + Math.sin(a) * 700); ctx.stroke(); }
      ctx.restore();
      if (e.imgA) escala(ctx, back(lt / 0.5), W / 2, caja0.y + 360, () => { caja(ctx, W / 2 - 390, caja0.y + 70, 780, 580, 34, '#fff'); cubrir(ctx, e.imgA, W / 2 - 372, caja0.y + 88, 744, 544, 24); emoji(ctx, e.resultado, W / 2 + 330, caja0.y + 620, 150); });
      else escala(ctx, back(lt / 0.5), W / 2, caja0.y + 360, () => emoji(ctx, e.resultado, W / 2, caja0.y + 360 + 14 * Math.sin(lt * 3), 330));
    } else {
      dibujarMaquina(ctx, e.maquina, caja0, lt, e, (c, em, x, y, s) => emoji(c, em, x, y, s), e.tema.acento);
    }
    // Texto del paso: aparece de a poco, como si alguien lo contara
    const n = Math.max(1, Math.round(e.texto.length * clamp((lt - 0.3) / 1.6)));
    caja(ctx, 60, 1160, W - 120, 270, 34, 'rgba(255,255,255,0.95)', 'rgba(0,0,0,0.25)', 4);
    const f = fit(ctx, e.texto, W - 200, 230, { from: 58, to: 36, peso: 700 });
    const vis = f.lines.join('\n').slice(0, n).split('\n');
    bloque(ctx, { ...f, lines: vis.concat(Array(f.lines.length - vis.length).fill('')) }, W / 2, 1180, 230, '#161412');
  },
  // «Cómo se hace» en un solo plano: las máquinas (e.pasos) están una al lado de la otra y la cámara se desliza de una a la
  // siguiente. En cada una se queda casi todo el tiempo y al final viaja a la próxima; el texto cambia con la máquina.
  linea(ctx, e, lt) {
    const n = e.pasos.length, sec = e.dur / n, viaje = Math.min(1.6, sec * 0.2), i = Math.min(n - 1, Math.floor(lt / sec)), enSec = lt - i * sec;
    const cam = (i + (i < n - 1 ? ease((enSec - (sec - viaje)) / viaje) : 0)) * (W - 100);
    // Título fijo arriba
    ctx.font = font(400, 46, BLACK); let fs2 = 46; while (ctx.measureText(e.etiqueta).width > W - 200 && fs2 > 30) { fs2 -= 2; ctx.font = font(400, fs2, BLACK); }
    const tw = ctx.measureText(e.etiqueta).width + 70; caja(ctx, (W - tw) / 2, 290, tw, 82, 41, e.tema.acento);
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.etiqueta, W / 2, 333);
    // La fábrica: solo se dibujan las estaciones que se ven
    const vx = 50, vy = 395, vw = W - 100, vh = 740;
    ctx.save(); ctx.beginPath(); ctx.roundRect(vx, vy, vw, vh, 40); ctx.clip();
    // Acercamiento suave mientras la cámara está quieta en una máquina; vuelve a abrir al viajar
    const z = 1 + 0.05 * ease(enSec / Math.max(0.1, sec - viaje)) * (i < n - 1 ? clamp((sec - enSec) / viaje) : 1);
    ctx.translate(W / 2, vy + vh * 0.55); ctx.scale(z, z); ctx.translate(-W / 2, -(vy + vh * 0.55));
    // La nave con profundidad (se mueve más lento que las máquinas) y encima las estaciones, una pegada a la otra
    fondoFabrica(ctx, { x: vx - 60, y: vy - 40, w: vw + 120, h: vh + 80 }, cam, lt, e.tema.acento);
    for (let k = 0; k < n; k++) {
      const bx = vx + k * vw - cam; if (bx > W + 60 || bx + vw < -60) continue;
      dibujarMaquina(ctx, e.pasos[k].maquina, { x: bx, y: vy, w: vw, h: vh }, lt, e.pasos[k], (c, em, x, y, s) => emoji(c, em, x, y, s), e.tema.acento, { continuo: true, mundo: k * vw });
    }
    // Columnas en primer plano, desenfocadas, que pasan más rápido (dan sensación de profundidad)
    for (let k = 0; k <= n; k++) {
      const x = vx + k * vw * 1.4 - cam * 1.4 - 40; if (x < -200 || x > W + 200) continue;
      const g = ctx.createLinearGradient(x - 14, 0, x + 84, 0); g.addColorStop(0, 'rgba(31,36,41,0)'); g.addColorStop(0.15, '#2a3036'); g.addColorStop(0.45, '#55606a'); g.addColorStop(0.85, '#1f2429'); g.addColorStop(1, 'rgba(31,36,41,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 14, vy - 50, 98, vh + 100);
    }
    ctx.restore();
    caja(ctx, vx, vy, vw, vh, 40, null, 'rgba(0,0,0,0.25)', 6);
    // Avance continuo (una sola barra, sin partes)
    caja(ctx, vx + 40, vy + vh - 26, vw - 80, 10, 5, 'rgba(0,0,0,0.25)'); caja(ctx, vx + 40, vy + vh - 26, Math.max(10, (vw - 80) * clamp(lt / e.dur)), 10, 5, e.tema.acento);
    // Lo que pasa en esta máquina: nombre corto y el texto, que aparece de a poco y se va al viajar a la siguiente
    const a = clamp(enSec / 0.35) * (i < n - 1 ? clamp((sec - enSec) / 0.45) : 1);
    alfa(ctx, a);
    ctx.font = font(400, 34, BLACK); const nw = ctx.measureText(e.pasos[i].nombre).width + 50;
    caja(ctx, 80, 1160, nw, 60, 30, e.tema.acento); ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.pasos[i].nombre, 80 + nw / 2, 1192);
    caja(ctx, 60, 1232, W - 120, 210, 34, 'rgba(255,255,255,0.95)', 'rgba(0,0,0,0.25)', 4);
    const txt = e.pasos[i].texto, f = fit(ctx, txt, W - 200, 175, { from: 54, to: 34, peso: 700 });
    const nch = Math.max(1, Math.round(txt.length * clamp((enSec - 0.25) / 1.6)));
    const vistas = f.lines.join('\n').slice(0, nch).split('\n');
    bloque(ctx, { ...f, lines: vistas.concat(Array(f.lines.length - vistas.length).fill('')) }, W / 2, 1250, 175, '#161412');
    alfa(ctx, 1);
  },
  // Reto visual (scripts/lib/retos-visuales.mjs) sobre fondo claro, como en la imagen: cuenta atrás y la respuesta marcada
  visual(ctx, e, lt) {
    const revela = lt >= e.piensa, rt = lt - e.piensa, v = e.visual;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fdfaf2'); g.addColorStop(1, '#efe8d8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.lineWidth = 3;
    for (let r = 80; r < 900; r += 60) { ctx.beginPath(); ctx.arc(W * 0.95, H * 0.85, r + 10 * Math.sin(lt * 2), 0, Math.PI * 2); ctx.stroke(); }
    marcaVisual(ctx, W, 205);
    ctx.font = font(400, 38, BLACK); ctx.fillStyle = '#777'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillText(`${e.idx + 1}/${e.total}`, W - 70, 205);
    alfa(ctx, ease(lt / 0.3));
    const topT = v.nivel != null ? insigniaNivel(ctx, v.nivel, W / 2, 240, { emoji: EMOJI.slice(2) || 'sans-serif', size: 36 }) + 18 : 250;
    const fin = tituloVisual(ctx, v, { W, top: topT, emoji: EMOJI.slice(2) || 'sans-serif', maxSize: 80 });
    const zona = { x: 70, y: fin + 30, w: W - 140, h: 1250 - fin - 30 };
    v.cuerpo(ctx, zona, EMOJI.slice(2) || 'sans-serif');
    if (revela) v.revelar(ctx, rt);
    alfa(ctx, 1);
    // El reloj se pensó para fondo oscuro: un disco oscuro debajo para que se lea sobre el claro
    if (!revela) { ctx.fillStyle = '#26221d'; ctx.beginPath(); ctx.arc(W / 2, 1345, 84, 0, Math.PI * 2); ctx.fill(); reloj(ctx, W / 2, 1345, 66, e.piensa - lt, e.piensa, e.tema); }
    else sello(ctx, v.corta, VERDE, rt, 1345);
  },
  // Reto de debate (scripts/lib/debate.mjs): el gancho arriba, la hoja o el pizarrón que se escribe a mano, la cuenta
  // atrás y el llamado a comentar. La respuesta NO se dice: la publica el bot de comentarios unas horas después
  debate(ctx, e, lt) {
    const d = e.debate, escribe = e.escribe || 2.6, rt = lt - escribe;
    escritorio(ctx, W, H); cabecera(ctx, e.tema, e.idx, e.total, lt / e.dur);
    alfa(ctx, ease(lt / 0.25));
    const fin = ganchoDebate(ctx, d.gancho, { W, y: 290, max: 84 });
    d.dibujar(ctx, { x: 70, y: fin + 40, w: W - 140, h: Math.min(1020, 1450 - fin - 40) }, clamp(lt / escribe));
    alfa(ctx, 1);
    if (rt >= 0 && rt < e.piensa) reloj(ctx, W / 2, 1600, 70, e.piensa - rt, e.piensa, e.tema);
    else if (rt >= e.piensa) {
      const s = back((rt - e.piensa) / 0.35), pulso = 1 + 0.04 * Math.sin((rt - e.piensa) * 6);
      escala(ctx, s * pulso, W / 2, 1600, () => {
        ctx.font = font(400, 54, BLACK + EMOJI); const txt = '👇 COMENTA TU RESPUESTA', w = ctx.measureText(txt).width + 90;
        caja(ctx, (W - w) / 2, 1545, w, 110, 55, e.tema.acento);
        ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, W / 2, 1602);
      });
      alfa(ctx, clamp((rt - e.piensa - 0.3) / 0.4)); ctx.font = font(500, 38); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'center'; ctx.fillText('La respuesta, en los comentarios en unas horas', W / 2, 1700); alfa(ctx, 1);
    }
  },
  // ¿Qué prefieres? Dos opciones enfrentadas, cuenta atrás y la pregunta de vuelta
  prefieres(ctx, e, lt) {
    pildora(ctx, '¿QUÉ PREFIERES?', 290, e.tema, back(lt / 0.35));
    const fin = lt >= e.piensa;
    [[e.a, e.icono_a, 400, '#2f6fb5'], [e.b, e.icono_b, 900, '#c2324a']].forEach(([txt, ic, y, color], i) => {
      const s = back((lt - 0.1 - i * 0.15) / 0.4); if (s <= 0.01) return;
      const pulso = fin ? 1 + 0.025 * Math.sin((lt - e.piensa) * 7 + i * Math.PI) : 1;
      const img = i === 0 ? e.imgA : e.imgB;
      escala(ctx, s * pulso, W / 2, y + 200, () => {
        caja(ctx, 70, y, W - 140, 400, 40, color, 'rgba(255,255,255,0.35)', 4);
        if (img) {
          // Foto real con un degradado del color de la opción abajo, para que el texto se lea
          cubrir(ctx, img, 74, y + 4, W - 148, 392, 36);
          const g = ctx.createLinearGradient(0, y + 120, 0, y + 400); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, color);
          ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(74, y + 4, W - 148, 392, 36); ctx.fill();
          emoji(ctx, ic, 150, y + 75, 70);
          SOMBRA = true; bloque(ctx, fit(ctx, txt, W - 220, 150, { from: 70, to: 40, peso: 700 }), W / 2, y + 235, 150); SOMBRA = false;
        } else {
          emoji(ctx, ic, W / 2, y + 115, 130);
          bloque(ctx, fit(ctx, txt, W - 220, 190, { from: 70, to: 40, peso: 700 }), W / 2, y + 190, 190);
        }
      });
    });
    const so = back((lt - 0.4) / 0.3);
    if (so > 0.01) escala(ctx, so, W / 2, 850, () => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(W / 2, 850, 58, 0, Math.PI * 2); ctx.fill(); ctx.font = font(400, 56, BLACK); ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('O', W / 2, 854); });
    if (!fin) reloj(ctx, W / 2, 1375, 48, e.piensa - lt, e.piensa, e.tema);
    else sello(ctx, '¿CUÁL ELEGISTE?', '#7b4bb7', lt - e.piensa, 1375);
  },
  // Adivina con emojis: los emojis grandes, cuenta atrás y la respuesta
  emoji(ctx, e, lt) {
    const revela = lt >= e.piensa, rt = lt - e.piensa;
    pildora(ctx, e.etiqueta, 300, e.tema, back(lt / 0.35));
    const ems = [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(e.emojis)].map((x) => x.segment).filter((x) => x.trim());
    const filas = ems.length > 4 ? [ems.slice(0, Math.ceil(ems.length / 2)), ems.slice(Math.ceil(ems.length / 2))] : [ems];
    const size = Math.min(190, (W - 160) / Math.max(...filas.map((f) => f.length)) * 0.9);
    filas.forEach((fila, r) => fila.forEach((em, i) => {
      const s = back((lt - 0.1 - (r * 4 + i) * 0.09) / 0.35); if (s <= 0.01) return;
      const x = W / 2 + (i - (fila.length - 1) / 2) * size * 1.08, y = 600 + (r - (filas.length - 1) / 2) * size * 1.1 + 8 * Math.sin(lt * 3 + i);
      escala(ctx, s, x, y, () => emoji(ctx, em, x, y, size));
    }));
    if (!revela) reloj(ctx, W / 2, 1050, 72, e.piensa - lt, e.piensa, e.tema);
    else {
      const s = back(rt / 0.35);
      escala(ctx, s, W / 2, 1060, () => {
        caja(ctx, 70, 950, W - 140, 220, 40, VERDE, '#fff', 5);
        bloque(ctx, fit(ctx, e.respuesta, W - 220, 170, { from: 76, to: 40, peso: 700 }), W / 2, 975, 170);
      });
    }
  },
  // Noticia: categoría, titular grande y, debajo, el resumen corto (entra un poco después); medio y fecha al pie
  noticia(ctx, e, lt) {
    pildora(ctx, e.etiqueta, 300, e.tema, back(lt / 0.35));
    const si = back((lt - 0.1) / 0.4);
    if (si > 0.01) escala(ctx, si, W / 2, 470, () => emoji(ctx, e.icono, W / 2, 470, 110));
    const a = ease((lt - 0.15) / 0.35), dy = (1 - a) * 50;
    alfa(ctx, a);
    caja(ctx, 60, 550 + dy, W - 120, 720, 36, panel(e), 'rgba(255,255,255,0.16)', 3);
    if (!e.resumen) bloque(ctx, fit(ctx, e.titular, W - 200, 660, { from: 74, to: 40, peso: 700 }), W / 2, 580 + dy, 660);
    else {
      // El titular se lleva el espacio que necesite (hasta 360 px) y el resumen, el resto
      const ft = fit(ctx, e.titular, W - 200, 360, { from: 66, to: 40, peso: 700 }), alto = Math.min(360, ft.lines.length * ft.lh + 10);
      bloque(ctx, ft, W / 2, 580 + dy, alto);
      ctx.fillStyle = e.tema.acento; ctx.fillRect(W / 2 - 60, 600 + alto + dy, 120, 5);
      const b = ease((lt - 0.6) / 0.4); alfa(ctx, a * b);
      bloque(ctx, fit(ctx, e.resumen, W - 200, 1240 - (630 + alto), { from: 46, to: 30, peso: 500 }), W / 2, 625 + alto + dy + (1 - b) * 20, 1240 - (630 + alto), 'rgba(255,255,255,0.92)');
      alfa(ctx, a);
    }
    ctx.font = font(600, 38); ctx.fillStyle = e.tema.acento; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.pie, W / 2, 1320 + dy);
    alfa(ctx, 1);
  },
  cierre(ctx, e, lt) { ESCENAS.intro(ctx, { ...e, y0: e.y0 || 560 }, lt); }
};
function sello(ctx, texto, color, rt, y = 1335) {
  const s = back(rt / 0.3);
  escala(ctx, s, W / 2, y, () => {
    ctx.font = font(400, 70, BLACK); const w = ctx.measureText(texto).width + 80;
    caja(ctx, (W - w) / 2, y - 60, w, 120, 60, color, '#fff', 5);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(texto, W / 2, y + 4);
  });
}

// ---------- audio ----------
function tono(buf, t, f, dur, vol, { tipo = 'sine', ataque = 0.004, caida = dur / 3, barrido = 0 } = {}) {
  const i0 = Math.floor(t * SR), n = Math.floor(dur * SR);
  let fase = 0;
  for (let i = 0; i < n && i0 + i < buf.length; i++) {
    const x = i / SR, env = Math.min(1, x / ataque) * Math.exp(-x / caida);
    fase += 2 * Math.PI * (f + barrido * x / dur) / SR;
    const w = tipo === 'tri' ? (2 / Math.PI) * Math.asin(Math.sin(fase)) : Math.sin(fase) + 0.25 * Math.sin(2 * fase);
    buf[i0 + i] += vol * env * w;
  }
}
function ruido(buf, t, dur, vol) {
  const i0 = Math.floor(t * SR), n = Math.floor(dur * SR); let y = 0;
  for (let i = 0; i < n && i0 + i < buf.length; i++) {
    const x = i / n, env = Math.sin(Math.PI * x) ** 2, k = 0.04 + 0.4 * x; // filtro que se abre: suena a «whoosh»
    y += k * ((Math.random() * 2 - 1) - y); buf[i0 + i] += vol * env * y;
  }
}
const SONIDOS = {
  pop: (b, t) => tono(b, t, 520, 0.12, 0.35, { barrido: 700, caida: 0.05 }),
  tick: (b, t) => tono(b, t, 1800, 0.04, 0.18, { caida: 0.01 }),
  tock: (b, t) => tono(b, t, 1200, 0.05, 0.22, { caida: 0.012 }),
  whoosh: (b, t) => ruido(b, t, 0.35, 0.5),
  bien: (b, t) => { tono(b, t, midiFreq(84), 0.5, 0.25, { caida: 0.18 }); tono(b, t + 0.09, midiFreq(91), 0.7, 0.25, { caida: 0.25 }); },
  mal: (b, t) => { tono(b, t, 220, 0.35, 0.22, { tipo: 'tri', barrido: -80, caida: 0.15 }); },
  final: (b, t) => [72, 76, 79, 84].forEach((m, i) => tono(b, t + i * 0.11, midiFreq(m), 0.9, 0.2, { caida: 0.3 }))
};

// ---------- duración ----------
// En Facebook los Reels de 45 a 60 s tienen unas 7 veces más vistas que los de 15 a 30, así que ninguno baja de 55 s.
// El tope es 59.5 s porque las historias de Facebook e Instagram no aceptan más de 60.
export const DURACION_MIN = 55, DURACION_MAX = 59.5;
const total = (escenas) => escenas.reduce((a, e) => a + e.dur, 0);
// Si falta tiempo, se reparte entre las escenas de contenido (más tiempo para leer o ver la respuesta; la cuenta atrás
// no cambia). Si sobra, se recorta de esas mismas sin tocar la cuenta atrás ni dejar menos de 1.4 s para la respuesta.
export function ajustarDuracion(escenas, { min = DURACION_MIN, max = DURACION_MAX } = {}) {
  const contenido = escenas.filter((e) => e.tipo !== 'intro' && e.tipo !== 'cierre');
  if (!contenido.length) return escenas;
  const antes = total(escenas);
  if (antes < min) { const extra = (min + 0.3 - antes) / contenido.length; for (const e of contenido) e.dur += extra; }
  else if (antes > max) {
    const piso = (e) => Math.max(e.pisoVoz || 0, e.piensa != null ? e.piensa + 1.4 : 3.5), holgura = contenido.reduce((a, e) => a + Math.max(0, e.dur - piso(e)), 0);
    const quitar = Math.min(antes - (max - 0.3), holgura);
    for (const e of contenido) e.dur -= (Math.max(0, e.dur - piso(e)) / (holgura || 1)) * quitar;
  }
  if (total(escenas) < min) throw new Error(`El Reel dura ${total(escenas).toFixed(1)} s: el mínimo es ${min} s`);
  return escenas;
}

// ---------- render ----------
// escenas: [{ tipo, dur, tema: id de TEMAS, idx?, total?, sonidos?: [[t, nombre]] }]
// estilo: pop | dembow | lofi | electro | synthwave (scripts/lib/musica.mjs). outIG: además, una copia con solo los
// efectos (sin música), para ponerle en Instagram una canción del catálogo autorizado de Meta
// duracion: { min, max } si el formato tiene otro rango (por ejemplo «Cómo se hace», que pasa del minuto)
// voz: e.voz en una escena es lo que dice el narrador al empezarla (en «linea», una frase por máquina). Si la frase no
// cabe, la escena se alarga. voz: false lo apaga (por ejemplo en la vista previa de un cuadro)
export async function renderQuiz({ escenas, out, melodia, estilo = 'pop', semilla = Date.now(), outIG, emojiFont = '', still, duracion, voz = true, log = (m) => process.stderr.write(m) }) {
  EMOJI = emojiFont ? `, ${emojiFont}` : '';
  const narrado = voz && still == null && prepararVoz(escenas, log);
  // Nunca menos de 55 s (ni más de 59.5): ver ajustarDuracion
  const antes = total(escenas); ajustarDuracion(escenas, duracion);
  if (Math.abs(total(escenas) - antes) > 0.05) log(`Duración ajustada: ${antes.toFixed(1)} → ${total(escenas).toFixed(1)} s\n`);
  let t0 = 0;
  const lista = escenas.map((e) => { const r = { ...e, t0, tema: TEMAS[e.tema] || TEMAS.noticias }; t0 += e.dur; return r; });
  // «linea»: un «whoosh» cada vez que la cámara viaja a la máquina siguiente (con la duración ya ajustada)
  for (const e of lista) if (e.tipo === 'linea' && e.whoosh) {
    const n = e.pasos.length, sec = e.dur / n, viaje = Math.min(1.6, sec * 0.2);
    e.sonidos = [...(e.sonidos || []), ...e.pasos.slice(1).map((_, i) => [sec * (i + 1) - viaje * 0.58, 'whoosh'])];
  }
  const dur = t0, frames = Math.ceil(dur * FPS);
  const cv = createCanvas(W, H), ctx = cv.getContext('2d');
  for (const e of lista) for (const k of ['A', 'B']) if (e[`foto${k}`]) e[`img${k}`] = await loadImage(fs.readFileSync(e[`foto${k}`])).catch(() => null);
  for (const e of lista) if (e.fotos) e.imgs = await Promise.all(e.fotos.map((f) => (f ? loadImage(fs.readFileSync(f)).catch(() => null) : null)));
  // Objetos 3D de las máquinas de «Cómo se hace» (lo que entra, lo que sale y los ingredientes)
  const glifos = lista.flatMap((e) => (e.pasos || (e.maquina ? [e] : [])).flatMap((p) => [p.entrada, p.salida, ...(p.extra || [])]));
  if (glifos.length) await cargarObjetos([...glifos, '❄️', '✅', '🚚', '🏪', '📦']);
  const conVideo = lista.filter((e) => e.fondo);
  const dibujar = (t, debajo) => {
    const e = lista.find((x) => t < x.t0 + x.dur) || lista.at(-1), lt = t - e.t0;
    // Con video, el canvas es una capa transparente (velo y texto) que ffmpeg pone encima del clip
    if (e.fondo) { ctx.clearRect(0, 0, W, H); if (debajo) ctx.drawImage(debajo, 0, 0, W, H); velo(ctx); } else fondo(ctx, e.tema, t);
    SOMBRA = !!e.fondo;
    if (e.idx != null) cabecera(ctx, e.tema, e.idx, e.total, lt / e.dur); else marca(ctx, e.tema, 235);
    // Salida: las escenas se desvanecen el último cuarto de segundo
    FADE = e === lista.at(-1) ? 1 : clamp((e.dur - lt) / 0.22);
    alfa(ctx, 1); ESCENAS[e.tipo](ctx, e, lt);
    FADE = 1; ctx.globalAlpha = 1; SOMBRA = false;
  };
  if (still != null) {
    // Vista previa: el cuadro del clip en ese instante debajo del texto
    const e = lista.find((x) => +still < x.t0 + x.dur) || lista.at(-1); let debajo = null;
    if (e.fondo) {
      const png = path.join(os.tmpdir(), `cuadro-${process.pid}.png`);
      spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(Math.max(0, +still - e.t0)), '-i', e.fondo, '-frames:v', '1', '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`, png]);
      debajo = await loadImage(fs.readFileSync(png)).catch(() => null); fs.rmSync(png, { force: true });
    }
    dibujar(+still, debajo); fs.writeFileSync(out, cv.toBuffer('image/png')); return { out, duration: dur };
  }

  // Audio: música propia + efectos de cada escena (por separado, para la copia de Instagram); limitador suave al final
  const largo = Math.ceil((dur + 0.5) * SR), efectos = new Float32Array(largo), mus = new Float32Array(largo);
  for (const e of lista) for (const [t, s] of e.sonidos || []) SONIDOS[s]?.(efectos, e.t0 + t);
  pistaMusical(mus, dur, { estilo, semilla, SR });
  // Narración: cada frase en su momento; la música baja mientras habla (y vuelve a subir despacio)
  const narra = new Float32Array(largo), baja = new Float32Array(largo);
  if (narrado) {
    for (const e of lista) (e._audios || []).forEach((a, i) => {
      const ini = Math.round((e.t0 + (e.tipo === 'linea' ? i * (e.dur / e.pasos.length) + VOZ_PASO : VOZ_INI)) * SR);
      for (let k = 0; k < a.length && ini + k < largo; k++) narra[ini + k] += a[k];
      // Se queda abajo 0,7 s después de cada frase: en las pausas cortas no vuelve a subir de golpe
      for (let k = Math.max(0, ini - 0.2 * SR); k < Math.min(largo, ini + a.length + 0.7 * SR); k++) baja[k] = 1;
    });
    let v = 0; const sube = 1 / (1.2 * SR), cae = 1 / (0.12 * SR);
    for (let i = 0; i < largo; i++) { v += baja[i] > v ? Math.min(cae, baja[i] - v) : -Math.min(sube, v - baja[i]); baja[i] = v; }
  }
  // Con narrador, la música va a un nivel fijo (−24 dB RMS, la voz anda por −17) y baja ~9 dB más mientras habla: queda
  // unos 16 dB por debajo de la voz, como en la radio. Antes quedaba a 6 dB y en las pausas subía por encima de la voz.
  const rmsMus = Math.sqrt(mus.reduce((s, x) => s + x * x, 0) / mus.length) || 1;
  const gMus = narrado ? 0.06 / rmsMus : 0.75;
  const buf = efectos.map((x, i) => Math.tanh((x + gMus * mus[i] * (1 - 0.65 * baja[i]) + 0.95 * narra[i]) * 1.2) * 0.9);
  const wav = `${os.tmpdir()}/quiz-${process.pid}-${Date.now()}.wav`;
  fs.writeFileSync(wav, wavBuffer(buf, SR));
  const wavIG = outIG ? wav.replace(/\.wav$/, '-efectos.wav') : null;
  if (wavIG) fs.writeFileSync(wavIG, wavBuffer(efectos.map((x, i) => Math.tanh((x + 0.95 * narra[i]) * 1.2) * 0.9), SR));

  // Sin video: el canvas es el cuadro entero. Con video: cada escena aporta su clip (o negro), se concatenan y el
  // canvas (con transparencia) va encima
  const color = 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p';
  const entradas = []; let mapa = ['-map', '0:v', '-map', '1:a', '-vf', color];
  if (conVideo.length) {
    const partes = lista.map((e, i) => {
      const d = e.dur.toFixed(3);
      if (!e.fondo) return `color=c=black:s=${W}x${H}:r=${FPS}:d=${d},format=yuv420p,setsar=1[b${i}]`;
      const k = 2 + conVideo.indexOf(e); entradas.push('-stream_loop', '-1', '-t', d, '-i', e.fondo);
      return `[${k}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},trim=duration=${d},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[b${i}]`;
    });
    const filtro = `${partes.join(';')};${lista.map((_, i) => `[b${i}]`).join('')}concat=n=${lista.length}:v=1:a=0[fondo];[0:v]format=rgba[capa];[fondo][capa]overlay=0:0:format=auto,${color}[v]`;
    mapa = ['-filter_complex', filtro, '-map', '[v]', '-map', '1:a'];
  }
  const args = ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'pipe:0', '-i', wav, ...entradas, ...mapa,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', '5M', '-bufsize', '10M', '-profile:v', 'high', '-level:v', '4.2', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-t', dur.toFixed(3), '-movflags', '+faststart', out];
  const ff = spawn(ffmpegPath, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; ff.stderr.on('data', (d) => { err += d; });
  const fin = new Promise((res, rej) => { ff.on('error', rej); ff.on('close', (c) => c === 0 ? res() : rej(new Error(`ffmpeg terminó con código ${c}: ${err.trim().slice(-600)}`))); });
  ff.stdin.on('error', () => {});
  const ti = Date.now();
  try {
    for (let i = 0; i < frames; i++) {
      dibujar(i / FPS);
      if (!ff.stdin.write(Buffer.from(cv.data()))) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % (FPS * 10) === 0) log(`  ${Math.round(100 * i / frames)}%\n`);
    }
    ff.stdin.end(); await fin;
    // Copia para Instagram: el mismo video, con solo los efectos
    if (wavIG) {
      const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', out, '-i', wavIG, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2', '-t', dur.toFixed(3), '-movflags', '+faststart', outIG]);
      if (r.status !== 0) log(`No se pudo hacer la copia para Instagram: ${String(r.stderr).slice(-200)}\n`);
    }
  } finally { fs.rmSync(wav, { force: true }); if (wavIG) fs.rmSync(wavIG, { force: true }); }
  log(`  listo en ${((Date.now() - ti) / 1000).toFixed(1)} s\n`);
  return { out, outIG: outIG && fs.existsSync(outIG) ? outIG : null, duration: +dur.toFixed(3), narrado: !!narrado };
}

// La frase de una escena empieza a VOZ_INI s; en «linea», VOZ_PASO s después de llegar a cada máquina, y la cámara no
// viaja a la siguiente hasta que termina (más 1,8 s para el viaje)
const VOZ_INI = 0.3, VOZ_PASO = 0.3;
function prepararVoz(escenas, log) {
  const con = escenas.filter((e) => e.voz && (Array.isArray(e.voz) ? e.voz.length : true));
  if (!con.length) return false;
  const textos = con.flatMap((e) => (Array.isArray(e.voz) ? e.voz : [e.voz]));
  const ti = Date.now(), audios = narrar(textos, { SR, log });
  if (!audios) return false;
  let k = 0;
  for (const e of con) {
    const n = Array.isArray(e.voz) ? e.voz.length : 1; e._audios = audios.slice(k, k += n);
    const largo = Math.max(...e._audios.map((a) => a.length / SR));
    e.pisoVoz = e.tipo === 'linea' ? n * (VOZ_PASO + largo + 1.8) : VOZ_INI + largo + 0.6;
    e.dur = Math.max(e.dur, e.pisoVoz);
  }
  log(`Narración: ${textos.length} frases en ${((Date.now() - ti) / 1000).toFixed(1)} s
`);
  return true;
}
