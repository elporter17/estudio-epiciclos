// Videos largos y horizontales para YouTube (1920×1080, sin IA): «Cómo se hacen N cosas que usas todos los días».
// Reutiliza las máquinas de «Cómo se hace» (maquinas.mjs) en una pantalla ancha: la fábrica a la izquierda y el panel con
// el paso a la derecha. Retención (consejos de YouTube): gancho en los primeros segundos, una intriga entre productos
// (≈ cada 90 s), capítulos con su tiempo y narrador (voz local, voz.mjs). Lo usa scripts/youtube-largo.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { wavBuffer } from '../bounce.mjs';
import { TEMAS } from './tarjetas.mjs';
import { pistaMusical } from './musica.mjs';
import { dibujarMaquina, fondoFabrica } from './maquinas.mjs';
import { cargarObjetos, objeto3d } from './objetos3d.mjs';
import { narrar } from './voz.mjs';
import { ROOT } from './node-env.mjs';

export const W = 1920, H = 1080;
const SR = 44100, FPS = 30;
const SANS = '"IBM Plex Sans", "STIX Two Text", system-ui, sans-serif', BLACK = '"Archivo Black", Impact, sans-serif';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => 1 - (1 - clamp(x)) ** 3;
const back = (x) => { x = clamp(x); const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
let EMOJI = '';
const font = (peso, size, fam = SANS) => `${peso} ${size}px ${fam}${EMOJI}`;

function wrap(ctx, text, maxW) {
  const out = []; let cur = '';
  for (const w of String(text).split(/\s+/).filter(Boolean)) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); return out;
}
const cacheFit = new Map();
function fit(ctx, text, maxW, maxH, { from = 64, to = 28, peso = 700, fam = SANS, lh = 1.25 } = {}) {
  const k = [text, maxW, maxH, from, peso, fam].join('|'); if (cacheFit.has(k)) return cacheFit.get(k);
  let r;
  for (let s = from; s >= to; s -= 2) { ctx.font = font(peso, s, fam); const lines = wrap(ctx, text, maxW); if (lines.length * s * lh <= maxH) { r = { size: s, lines }; break; } }
  if (!r) { ctx.font = font(peso, to, fam); r = { size: to, lines: wrap(ctx, text, maxW) }; }
  Object.assign(r, { lh: r.size * lh, peso, fam }); cacheFit.set(k, r); return r;
}
function texto(ctx, f, x, y, { color = '#fff', align = 'left', hasta = Infinity } = {}) {
  ctx.font = font(f.peso, f.size, f.fam); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'top';
  let quedan = hasta;
  f.lines.forEach((l, i) => { if (quedan <= 0) return; const s = l.slice(0, Math.max(0, quedan)); quedan -= l.length + 1; ctx.fillText(s, x, y + i * f.lh); });
}
function caja(ctx, x, y, w, h, r, fill, stroke, lw = 4) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } }
function icono(ctx, g, x, y, s) {
  const img = objeto3d(g); if (img) { ctx.drawImage(img, x - s / 2, y - s / 2, s, s); return; }
  ctx.font = `${Math.round(s * 0.85)}px ${EMOJI ? EMOJI.slice(2) : 'sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(g, x, y);
}
function pildora(ctx, t, x, y, color, { size = 34, centro = false } = {}) {
  ctx.font = font(400, size, BLACK); const w = ctx.measureText(t).width + size * 1.6, h = size * 1.9, x0 = centro ? x - w / 2 : x;
  caja(ctx, x0, y, w, h, h / 2, color); ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x0 + w / 2, y + h / 2 + 2);
  return w;
}
function fondo(ctx, tema, t) {
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, tema.a); g.addColorStop(1, tema.b); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 3;
  for (let k = 0, r = 90; r < 1500; r += 80, k++) { ctx.strokeStyle = `rgba(255,255,255,${0.03 + 0.025 * Math.sin(t * 2 - k * 0.6) ** 2})`; ctx.beginPath(); ctx.arc(W * 0.95, H * 0.08, r, 0, Math.PI * 2); ctx.stroke(); }
}
function marca(ctx, tema) {
  ctx.strokeStyle = tema.acento; ctx.lineWidth = 3;
  for (const r of [6, 11, 16]) { ctx.beginPath(); ctx.arc(80, 62, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.font = font(400, 28, BLACK); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText('Potter Play', 106, 64);
}

// Foto de fondo (e.imagen: arte oficial o foto de stock) con zoom lento, oscurecida a la izquierda donde va el texto
function fondoImagen(ctx, img, lt, dur, sentido = 1) {
  const p = Math.min(1, lt / Math.max(1, dur)), z = 1.03 + 0.08 * p, k = Math.max(W / img.width, H / img.height) * z, iw = img.width * k, ih = img.height * k;
  ctx.drawImage(img, (W - iw) / 2 + sentido * 40 * (p - 0.5), (H - ih) / 2, iw, ih);
  const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(10,6,25,0.86)'); g.addColorStop(0.55, 'rgba(10,6,25,0.55)'); g.addColorStop(1, 'rgba(10,6,25,0.25)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function credito(ctx, texto) {
  ctx.save(); ctx.font = font(600, 24); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillText(texto, W - 40, H - 34); ctx.restore();
}

// ---------- escenas ----------
const ESCENAS = {
  // Gancho: la promesa del video y los productos que vienen, uno tras otro
  gancho(ctx, e, lt) {
    const f = fit(ctx, e.titulo, 1500, 300, { from: 96, to: 56, peso: 400, fam: BLACK, lh: 1.1 });
    ctx.save(); ctx.globalAlpha = ease(lt / 0.5); texto(ctx, f, W / 2, 200, { align: 'center', color: '#fff' }); ctx.restore();
    const n = e.iconos.length, paso = Math.min(260, 1600 / n), x0 = W / 2 - (paso * (n - 1)) / 2;
    e.iconos.forEach((g, i) => { const a = back((lt - 0.6 - i * 0.25) / 0.5); if (a <= 0) return; icono(ctx, g, x0 + i * paso, 690 + Math.sin(lt * 2 + i) * 10, 190 * a); });
    if (e.sub) { ctx.globalAlpha = ease((lt - 1.2) / 0.5); ctx.font = font(600, 40); ctx.fillStyle = e.tema.acento; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(e.sub, W / 2, 900); ctx.globalAlpha = 1; }
  },
  // Capítulo: número grande, el producto y su objeto en 3D
  capitulo(ctx, e, lt) {
    const a = back(lt / 0.6);
    ctx.save(); ctx.translate(360, 540); ctx.scale(a, a);
    caja(ctx, -170, -170, 340, 340, 170, e.tema.acento); ctx.font = font(400, String(e.num).length > 2 ? 100 : 210, BLACK); ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(e.num), 0, 12);
    ctx.restore();
    ctx.globalAlpha = ease((lt - 0.2) / 0.5);
    // e.etiqueta: otro rótulo (la historia de GTA: «CAPÍTULO 3 DE 9»); si no, «CÓMO SE HACE»
    pildora(ctx, e.etiqueta || `CÓMO SE ${e.hace.toUpperCase()}`, 640, 330, e.tema.acento, { size: 36 });
    const f = fit(ctx, e.titulo.toUpperCase(), 820, 330, { from: 110, to: 60, peso: 400, fam: BLACK, lh: 1.05 });
    texto(ctx, f, 640, 430);
    ctx.globalAlpha = 1;
    icono(ctx, e.icono, 1620, 540 + Math.sin(lt * 2) * 14, 330 * back((lt - 0.3) / 0.6));
    // Progreso del video: un punto por producto
    for (let k = 0; k < e.total; k++) { const pos = e.idx ?? e.num; ctx.fillStyle = k < pos ? e.tema.acento : 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(W / 2 - (e.total - 1) * 22 + k * 44, 990, k === pos - 1 ? 12 : 8, 0, Math.PI * 2); ctx.fill(); }
  },
  // La fábrica en un solo plano (izquierda) y el paso actual (derecha)
  linea(ctx, e, lt) {
    const n = e.pasos.length, sec = e.dur / n, viaje = Math.min(1.6, sec * 0.2), i = Math.min(n - 1, Math.floor(lt / sec)), enSec = lt - i * sec;
    const vx = 50, vy = 120, vw = 1130, vh = 860;
    const cam = (i + (i < n - 1 ? ease((enSec - (sec - viaje)) / viaje) : 0)) * vw;
    ctx.save(); ctx.beginPath(); ctx.roundRect(vx, vy, vw, vh, 36); ctx.clip();
    const z = 1 + 0.04 * ease(enSec / Math.max(0.1, sec - viaje)) * (i < n - 1 ? clamp((sec - enSec) / viaje) : 1);
    ctx.translate(vx + vw / 2, vy + vh * 0.55); ctx.scale(z, z); ctx.translate(-(vx + vw / 2), -(vy + vh * 0.55));
    fondoFabrica(ctx, { x: vx - 60, y: vy - 40, w: vw + 120, h: vh + 80 }, cam, lt, e.tema.acento);
    for (let k = 0; k < n; k++) {
      const bx = vx + k * vw - cam; if (bx > vx + vw + 60 || bx + vw < vx - 60) continue;
      dibujarMaquina(ctx, e.pasos[k].maquina, { x: bx, y: vy, w: vw, h: vh }, lt, e.pasos[k], icono, e.tema.acento, { continuo: true, mundo: k * vw });
    }
    ctx.restore();
    caja(ctx, vx, vy, vw, vh, 36, null, 'rgba(0,0,0,0.3)', 6);
    caja(ctx, vx + 40, vy + vh - 26, vw - 80, 10, 5, 'rgba(0,0,0,0.3)'); caja(ctx, vx + 40, vy + vh - 26, Math.max(10, (vw - 80) * clamp(lt / e.dur)), 10, 5, e.tema.acento);
    // Panel derecho
    const px = 1230, pw = 640;
    ctx.font = font(400, 26, BLACK); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(e.etiqueta, px, 132);
    const a = clamp(enSec / 0.35) * (i < n - 1 ? clamp((sec - enSec) / 0.45) : 1);
    ctx.globalAlpha = a;
    pildora(ctx, `PASO ${i + 1} DE ${n}`, px, 190, e.tema.acento, { size: 30 });
    ctx.font = font(400, 60, BLACK); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(e.pasos[i].nombre, px, 270);
    const f = fit(ctx, e.pasos[i].texto, pw, 300, { from: 44, to: 30, peso: 600 });
    texto(ctx, f, px, 360, { hasta: Math.floor((enSec - 0.2) * 38) });
    ctx.globalAlpha = 1;
    // Lista de pasos: el actual resaltado
    const y0 = 700, alto = Math.min(36, 270 / n);
    e.pasos.forEach((p, k) => {
      const col = k === i ? e.tema.acento : k < i ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.28)', y = y0 + k * alto, cy = y + alto * 0.42;
      // Hecho: punto lleno · actual: anillo con punto · pendiente: anillo tenue
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px + 10, cy, 9, 0, Math.PI * 2); if (k < i) ctx.fill(); else ctx.stroke();
      if (k === i) { ctx.beginPath(); ctx.arc(px + 10, cy, 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.font = font(k === i ? 700 : 500, Math.min(26, alto * 0.75)); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(p.nombre[0] + p.nombre.slice(1).toLowerCase(), px + 34, y);
    });
  },
  // ¿Sabías que…?
  dato(ctx, e, lt) {
    ctx.globalAlpha = ease(lt / 0.4); pildora(ctx, '¿SABÍAS QUE…?', 160, 240, e.tema.acento, { size: 40 });
    const f = fit(ctx, e.texto, 1050, 520, { from: 72, to: 40, peso: 700 }); texto(ctx, f, 160, 380, { hasta: Math.floor((lt - 0.3) * 45) });
    ctx.globalAlpha = 1; icono(ctx, e.icono, 1530, 560 + Math.sin(lt * 2) * 12, 380 * back((lt - 0.2) / 0.6));
  },
  // Intriga entre productos (retención): una frase grande y una pista del siguiente
  intriga(ctx, e, lt) {
    const f = fit(ctx, e.texto, 1500, 360, { from: 92, to: 52, peso: 400, fam: BLACK, lh: 1.12 });
    ctx.globalAlpha = ease(lt / 0.4); texto(ctx, f, W / 2, 300, { align: 'center' }); ctx.globalAlpha = 1;
    if (e.pista) { const s = 150 + 20 * Math.sin(lt * 5); ctx.save(); ctx.globalAlpha = 0.9; icono(ctx, e.pista, W / 2, 820, s * back((lt - 0.4) / 0.5)); ctx.restore(); }
  },
  cierre(ctx, e, lt) {
    const f = fit(ctx, e.titulo, 1500, 260, { from: 96, to: 56, peso: 400, fam: BLACK, lh: 1.1 });
    ctx.globalAlpha = ease(lt / 0.4); texto(ctx, f, W / 2, 230, { align: 'center', color: e.tema.acento });
    ctx.font = font(600, 50); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(e.sub, W / 2, 560); ctx.globalAlpha = 1;
    icono(ctx, '🔔', W / 2, 820, 170 * back((lt - 0.5) / 0.5) * (1 + 0.06 * Math.sin(lt * 10)));
  }
};

// Narración: e.voz (o una frase por paso en «linea»). Cada escena se alarga si la frase no cabe
const VOZ_INI = 0.35, VOZ_PASO = 0.3;
function prepararVoz(escenas, log) {
  const con = escenas.filter((e) => e.voz), textos = con.flatMap((e) => (Array.isArray(e.voz) ? e.voz : [e.voz]));
  if (!textos.length) return false;
  const ti = Date.now(), audios = narrar(textos, { SR, log }); if (!audios) return false;
  let k = 0;
  for (const e of con) {
    const n = Array.isArray(e.voz) ? e.voz.length : 1; e._audios = audios.slice(k, k += n);
    const largo = Math.max(...e._audios.map((a) => a.length / SR));
    e.dur = Math.max(e.dur, e.tipo === 'linea' ? n * Math.max(6.5, VOZ_PASO + largo + 1.9) : VOZ_INI + largo + 0.7);
  }
  log(`Narración: ${textos.length} frases en ${((Date.now() - ti) / 1000).toFixed(1)} s\n`);
  return true;
}

// escenas → MP4 1920×1080. Devuelve { out, duration, capitulos: [{ t, titulo }] }
export async function renderLargo({ escenas, out, estilo = 'lofi', semilla = Date.now(), emojiFont = '', still, log = (m) => process.stderr.write(m) }) {
  EMOJI = emojiFont ? `, ${emojiFont}` : '';
  const narrado = still == null && prepararVoz(escenas, log);
  let t0 = 0; const lista = escenas.map((e) => { const r = { ...e, t0, tema: TEMAS[e.tema] || TEMAS.inventos }; t0 += e.dur; return r; });
  const dur = t0, frames = Math.ceil(dur * FPS);
  await cargarObjetos([...new Set(lista.flatMap((e) => [e.icono, e.pista, ...(e.iconos || []), ...(e.pasos || []).flatMap((p) => [p.entrada, p.salida, ...(p.extra || [])])]).filter(Boolean)), '❄️', '✅', '🚚', '🏪', '📦', '🔔']);
  // Fotos de fondo (e.imagen)
  for (const e of lista) if (e.imagen) e.imgFondo = await loadImage(fs.readFileSync(e.imagen)).catch(() => null);
  const cv = createCanvas(W, H), ctx = cv.getContext('2d');
  const dibujar = (t) => {
    const e = lista.find((x) => t < x.t0 + x.dur) || lista.at(-1), lt = t - e.t0;
    if (e.imgFondo) fondoImagen(ctx, e.imgFondo, lt, e.dur, lista.indexOf(e) % 2 ? -1 : 1); else fondo(ctx, e.tema, t);
    marca(ctx, e.tema);
    ctx.globalAlpha = 1; ESCENAS[e.tipo](ctx, e, lt); ctx.globalAlpha = 1;
    if (e.credito) credito(ctx, e.credito);
    // Fundido a negro corto entre escenas
    const f = Math.max(0, 1 - lt / 0.25, e === lista.at(-1) ? 0 : 1 - (e.dur - lt) / 0.25);
    if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${0.85 * f})`; ctx.fillRect(0, 0, W, H); }
  };
  const capitulos = lista.filter((e) => e.capitulo).map((e) => ({ t: e.t0, titulo: e.capitulo }));
  if (still != null) { dibujar(+still); fs.writeFileSync(out, cv.toBuffer('image/png')); return { out, duration: dur, capitulos }; }

  // Audio: música propia (baja cuando habla el narrador) + narración
  const largo = Math.ceil((dur + 0.5) * SR), mus = new Float32Array(largo), narra = new Float32Array(largo), baja = new Float32Array(largo);
  pistaMusical(mus, dur, { estilo, semilla, SR });
  if (narrado) {
    for (const e of lista) (e._audios || []).forEach((a, i) => {
      const ini = Math.round((e.t0 + (e.tipo === 'linea' ? i * (e.dur / e.pasos.length) + VOZ_PASO : VOZ_INI)) * SR);
      for (let k = 0; k < a.length && ini + k < largo; k++) narra[ini + k] += a[k];
      for (let k = Math.max(0, ini - 0.2 * SR); k < Math.min(largo, ini + a.length + 0.7 * SR); k++) baja[k] = 1;
    });
    let v = 0; const sube = 1 / (1.2 * SR), cae = 1 / (0.12 * SR);
    for (let i = 0; i < largo; i++) { v += baja[i] > v ? Math.min(cae, baja[i] - v) : -Math.min(sube, v - baja[i]); baja[i] = v; }
  }
  // Igual que en los Reels (quiz-video.mjs): música a −24 dB RMS con narrador y ~9 dB más abajo mientras habla
  const rmsMus = Math.sqrt(mus.reduce((s, x) => s + x * x, 0) / mus.length) || 1, gMus = narrado ? 0.06 / rmsMus : 0.6;
  const buf = mus.map((x, i) => Math.tanh((gMus * x * (1 - 0.65 * baja[i]) + 0.95 * narra[i]) * 1.2) * 0.9);
  const wav = path.join(os.tmpdir(), `largo-${process.pid}-${Date.now()}.wav`); fs.writeFileSync(wav, wavBuffer(buf, SR));
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'pipe:0', '-i', wav,
    '-map', '0:v', '-map', '1:a', '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-maxrate', '8M', '-bufsize', '16M', '-profile:v', 'high', '-level:v', '4.2', '-g', String(FPS * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', dur.toFixed(3), '-movflags', '+faststart', out];
  const ff = spawn(ffmpegPath, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; ff.stderr.on('data', (d) => { err += d; }); ff.stdin.on('error', () => {});
  const fin = new Promise((res, rej) => { ff.on('error', rej); ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg: ${err.trim().slice(-500)}`)))); });
  const ti = Date.now();
  try {
    for (let i = 0; i < frames; i++) {
      dibujar(i / FPS);
      if (!ff.stdin.write(Buffer.from(cv.data()))) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % (FPS * 30) === 0) log(`  ${Math.round((100 * i) / frames)}% (${((Date.now() - ti) / 1000).toFixed(0)} s)\n`);
    }
    ff.stdin.end(); await fin;
  } finally { fs.rmSync(wav, { force: true }); }
  log(`  listo en ${((Date.now() - ti) / 1000).toFixed(1)} s\n`);
  return { out, duration: +dur.toFixed(3), capitulos, narrado: !!narrado };
}

// Miniatura 1280×720: 3 palabras grandes (no repiten el título), los objetos en 3D y el logo
export async function renderMiniatura({ out, palabras, iconos, tema = 'inventos', emojiFont = '' }) {
  EMOJI = emojiFont ? `, ${emojiFont}` : '';
  await cargarObjetos(iconos);
  const T = TEMAS[tema] || TEMAS.inventos, cv = createCanvas(1280, 720), ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(900, 360, 50, 900, 360, 900); g.addColorStop(0, T.a); g.addColorStop(1, '#07070c'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
  // Rayos de luz detrás de los objetos
  ctx.save(); ctx.translate(930, 380); for (let k = 0; k < 16; k++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = k % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.0)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -120); ctx.lineTo(900, 120); ctx.fill(); } ctx.restore();
  const pos = [[930, 330, 330], [790, 600, 180], [1110, 520, 190], [1130, 150, 170], [720, 170, 160]];
  iconos.slice(0, pos.length).forEach((ic, i) => { const [x, y, s] = pos[i]; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; icono(ctx, ic, x, y, s); ctx.restore(); });
  // Texto: hasta 3 palabras, una por renglón, con borde grueso
  const lineas = palabras.toUpperCase().split(/\s+/).slice(0, 3);
  let size = 150; ctx.font = font(400, size, BLACK); while (lineas.some((l) => ctx.measureText(l).width > 600) && size > 70) { size -= 6; ctx.font = font(400, size, BLACK); }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  const y0 = 360 - (lineas.length * size * 1.02) / 2;
  lineas.forEach((l, i) => { const y = y0 + i * size * 1.02; ctx.lineWidth = 18; ctx.strokeStyle = '#000'; ctx.strokeText(l, 50, y); ctx.fillStyle = i === lineas.length - 1 ? T.acento : '#fff'; ctx.fillText(l, 50, y); });
  // Logo del canal
  const logo = await loadImage(fs.readFileSync(path.join(ROOT, 'assets', 'marca', 'potter-play-logo.jpg')));
  ctx.save(); ctx.beginPath(); ctx.arc(1200, 650, 52, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(logo, 232, 155, 500, 500, 1148, 598, 104, 104); ctx.restore();
  fs.writeFileSync(out, cv.toBuffer('image/jpeg', 90));
  return out;
}
