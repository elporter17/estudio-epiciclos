#!/usr/bin/env node
// Motor 2D (SIN IA, gratis): dibuja los videos de datos del motor 3D con canvas y emojis. Toma lo que deja
// scripts/video3d-preparar.mjs en video3d/public (render.json, voz/NN.wav, musica.wav, sfx/) y escribe un MP4 vertical con audio:
//   node --env-file=.env scripts/video3d-preparar.mjs --guion video3d/guiones/2d/xxx.json
//   node --env-file=.env scripts/render2d.mjs --salida video3d/out/xxx-crudo.mp4 [--still 12,30]
// Lo llama scripts/video3d-render.mjs cuando el guion trae «motor»: «2d».
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import './lib/env-file.mjs';
import { parseCli } from './lib/cli.mjs';
import { ROOT, setupNode } from './lib/node-env.mjs';
import { AMBIENTES } from '../video3d/src/ambientes.js';
import { W, H, FPS, clamp, ease, easeInOut, lerp, txt, pastilla, logo, formato, BLACK, AMARILLO } from './lib/dibujo2d.mjs';
import { ESCENAS_2D, ALIAS } from './lib/escenas2d.mjs';

const PUB = path.join(ROOT, 'video3d', 'public'), SR = 44100;
// Acento y nombre de cada categoría (los mismos que TEMAS en video3d/src/genericas.jsx)
const TEMAS = {
  ciencia: ['#60a5fa', 'DATO CIENTÍFICO'], historia: ['#f59e0b', 'HISTORIA'], datos: ['#34d399', 'DATO'], curiosidad: ['#a78bfa', 'CURIOSIDAD'], noticia: ['#f87171', 'EXPLICADO'],
  especial: ['#f472b6', 'ESPECIAL'], minihistoria: ['#f9a8d4', 'MINI HISTORIA'], mito: ['#fdba74', '¿MITO O VERDAD?'], honduras: ['#93c5fd', 'ORGULLO HONDUREÑO']
};
const sinSignos = (w) => w.replace(/[¿?¡!.,:;«»"]/g, '').toLowerCase();
function tiempos(texto, inicio, voz) { // igual que en Dato.jsx: el audio se reparte por lo larga que es cada palabra y las pausas
  const ps = texto.split(/\s+/).filter(Boolean), peso = ps.map((w) => { const s = sinSignos(w); return (/\d/.test(s) ? s.replace(/\D/g, '').length * 3.2 : s.length) + 1.5 + (/[.,:;?!]$/.test(w) ? 3 : 0); });
  const total = peso.reduce((a, b) => a + b, 0); let acc = 0;
  return ps.map((w, i) => { const t = inicio + (acc / total) * voz; acc += peso[i]; return { w, t }; });
}
const grupos = (ps) => { const out = []; let cur = []; for (const p of ps) { cur.push(p); if (cur.length >= 4 || /[.,:;?!]$/.test(p.w)) { out.push(cur); cur = []; } } if (cur.length) out.push(cur); return out; };

function subtitulos(ctx, e, t) {
  const gs = grupos(tiempos(e.texto, 0.25, e.voz)), g = [...gs].reverse().find((x) => t >= x[0].t - 0.05) || gs[0];
  const clave = new Set((e.resaltar || []).map(sinSignos)), esClave = (w) => clave.has(sinSignos(w)) || /\d/.test(w);
  ctx.font = `78px ${BLACK}`; const mids = g.map((p) => ctx.measureText(p.w).width + 24), total = mids.reduce((a, b) => a + b, 0), escala = total > W - 140 ? (W - 140) / total : 1;
  let x = W / 2 - (total * escala) / 2;
  g.forEach((p, i) => {
    const a = clamp((t - p.t) / 0.12), w = mids[i] * escala, es = esClave(p.w), y = 330 + (1 - ease(a)) * 18;
    ctx.save(); ctx.globalAlpha = 0.25 + 0.75 * a; ctx.translate(x + w / 2, y); ctx.scale(escala * (0.9 + 0.1 * ease(a)), escala * (0.9 + 0.1 * ease(a)));
    if (es && a > 0.5) { ctx.fillStyle = AMARILLO; ctx.beginPath(); ctx.roundRect(-w / escala / 2 - 4, -52, w / escala + 8, 104, 22); ctx.fill(); txt(ctx, p.w, 0, 3, 78, { color: '#111', trazo: null }); }
    else txt(ctx, p.w, 0, 0, 78, { color: '#fff' });
    ctx.restore(); x += w;
  });
}
function contador(ctx, cn, t, dur) {
  const v = cn.desde + (cn.hasta - cn.desde) * ease(t / (dur * 0.7)), a = ease(t / 0.4), num = cn.hasta % 1 ? v.toFixed(1).replace('.', ',') : formato(v), unidad = Math.round(v) === 1 ? cn.unidad.replace(/s$/, '') : cn.unidad;
  ctx.save(); ctx.translate(W / 2, 640); ctx.globalAlpha = a; ctx.scale(0.7 + 0.3 * a, 0.7 + 0.3 * a);
  ctx.font = `96px ${BLACK}`; const w1 = ctx.measureText(num).width; ctx.font = `bold 48px "IBM Plex Sans", sans-serif`; const w2 = ctx.measureText(unidad).width + 16, w = w1 + w2 + 84;
  pastilla(ctx, 0, 0, w, 140, 'rgba(17,24,39,0.84)', 'rgba(255,255,255,0.4)');
  txt(ctx, num, -w / 2 + 42, 4, 96, { align: 'left', trazo: null }); txt(ctx, unidad, -w / 2 + 42 + w1 + 16, 12, 48, { align: 'left', trazo: null, color: AMARILLO, fuente: '"IBM Plex Sans", sans-serif' });
  ctx.restore();
}
function portadaTexto(ctx, g, t, c) {
  const [acento, nombre] = TEMAS[g.categoria] || TEMAS.datos, abajo = g.estilo?.portada === 'abajo', ya = abajo ? 1150 : 210, ty = abajo ? 1290 : 380;
  ctx.font = `44px ${BLACK}`; const w = ctx.measureText(nombre).width + 70; pastilla(ctx, W / 2, ya + 28, w, 84, acento); txt(ctx, nombre, W / 2, ya + 32, 44, { color: '#111', trazo: null });
  if (g.temporada) { ctx.save(); ctx.translate(210, ya - 40); ctx.rotate(-0.07); const l = `TEMPORADA ${g.temporada}${g.episodio ? ` · EP ${g.episodio}` : ''}`; ctx.font = `34px ${BLACK}`; const w2 = ctx.measureText(l).width + 48; pastilla(ctx, 0, 0, w2, 62, '#111', AMARILLO); txt(ctx, l, 0, 3, 34, { color: AMARILLO, trazo: null }); ctx.restore(); }
  // Título enorme: las cifras y las palabras clave en amarillo
  const clave = new Set((g.destacar || []).map(sinSignos)), ps = g.titulo.split(' '), lineas = []; let cur = [];
  ctx.font = `104px ${BLACK}`; for (const p of ps) { const q = [...cur, p].join(' '); if (ctx.measureText(q).width > W - 120 && cur.length) { lineas.push(cur); cur = [p]; } else cur.push(p); } lineas.push(cur);
  const k = 1 + 0.03 * Math.sin(t * 2); ctx.save(); ctx.translate(W / 2, ty + lineas.length * 56); ctx.scale(k, k);
  lineas.forEach((l, li) => { const wl = ctx.measureText(l.join(' ')).width; let x = -wl / 2; l.forEach((p) => { const wp = ctx.measureText(`${p} `).width; txt(ctx, p, x, (li - (lineas.length - 1) / 2) * 118, 104, { align: 'left', color: clave.has(sinSignos(p)) || /\d/.test(p) ? AMARILLO : '#fff', grosor: 0.05 }); x += wp; }); });
  ctx.restore();
  logo(ctx, c.logo, W / 2 - 150, 1760, 86); txt(ctx, 'Potter Play', W / 2 - 80, 1764, 46, { align: 'left' });
}
function cierreTexto(ctx, t, c) {
  const a = ease(t / 0.5); ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 40);
  logo(ctx, c.logo, W / 2, 360, 230); txt(ctx, '¡SÍGUENOS!', W / 2, 560, 120, { grosor: 0.05 });
  ctx.font = `48px ${BLACK}`; const w = ctx.measureText('Un dato nuevo cada día').width + 70; pastilla(ctx, W / 2, 670, w, 92, AMARILLO); txt(ctx, 'Un dato nuevo cada día', W / 2, 674, 48, { color: '#111', trazo: null }); ctx.restore();
}
function seguir(ctx, t, dur) {
  const a = ease((t - Math.max(0.6, dur - 3.4)) / 0.35) * (1 - ease((t - (dur - 0.5)) / 0.4)); if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, 1670 - (1 - a) * -30); const p = (0.9 + 0.1 * a) * (1 + 0.05 * Math.sin(t * 9)); ctx.scale(p, p);
  ctx.font = `54px ${BLACK}`; const w = ctx.measureText('SÍGUENOS · MAÑANA OTRO').width + 80; pastilla(ctx, 0, 0, w, 100, '#ff2d55', '#fff'); txt(ctx, 'SÍGUENOS · MAÑANA OTRO', 0, 4, 54, { trazo: null }); ctx.restore();
}

// ---------- audio: voz + efectos + música mezclados en un WAV ----------
function leerAudio(file) {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  return r.status === 0 ? new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.byteLength / 4)) : new Float32Array(0);
}
function mezclar(render, wav) {
  const n = Math.ceil((render.duracion + 0.5) * SR), out = new Float32Array(n), memo = new Map();
  const poner = (file, t, vol) => { if (!fs.existsSync(file)) return; if (!memo.has(file)) memo.set(file, leerAudio(file)); const a = memo.get(file), o = Math.round(t * SR); for (let i = 0; i < a.length && o + i < n; i++) if (o + i >= 0) out[o + i] += a[i] * vol; };
  poner(path.join(PUB, 'musica.wav'), 0, 0.14);
  for (const e of render.escenas) poner(path.join(PUB, e.audio), e.inicio + 0.25, 1);
  for (const s of render.sfx || []) poner(path.join(PUB, 'sfx', `${s.s}.wav`), s.t, s.v);
  const pcm = Buffer.alloc(44 + n * 2); pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + n * 2, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.tanh(out[i] * 0.95) * 32000), 44 + i * 2);
  fs.writeFileSync(wav, pcm);
}

async function main() {
  const o = parseCli({ salida: { type: 'string' }, still: { type: 'string' }, render: { type: 'string', default: path.join(PUB, 'render.json') } });
  setupNode();
  const render = JSON.parse(fs.readFileSync(path.resolve(o.render), 'utf8')), est = render.estilo || {};
  const A = { ...(AMBIENTES[est.ambiente] || AMBIENTES.pradera), nombre: est.ambiente || 'pradera' };
  const c = { A, g: render, acento: (TEMAS[render.categoria] || TEMAS.datos)[0], logo: await loadImage(fs.readFileSync(path.join(PUB, 'marca', 'logo.jpg'))).catch(() => null) };
  const cv = createCanvas(W, H), ctx = cv.getContext('2d'), escenas = render.escenas;
  const dibujaEscena = (e, t) => { const f = ESCENAS_2D[e.tipo] || ALIAS[e.tipo] || ESCENAS_2D.foco; ctx.save(); f(ctx, t, e.dur, e, c); ctx.restore(); };
  function cuadro(T) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
    const i = Math.max(0, escenas.findIndex((x) => T < x.inicio + x.dur)), e = escenas[i === -1 ? escenas.length - 1 : i], t = T - e.inicio;
    // Barrido entre escenas: la nueva entra de izquierda a derecha sobre el último cuadro de la anterior
    const entra = i > 0 ? clamp(t / 0.3) : 1;
    if (entra < 1) { dibujaEscena(escenas[i - 1], escenas[i - 1].dur); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W * ease(entra), H); ctx.clip(); dibujaEscena(e, t); ctx.restore(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(W * ease(entra) - 8, 0, 8, H); }
    else { const z = 1 + 0.035 * (t / e.dur); ctx.save(); ctx.translate(W / 2, H * 0.55); ctx.scale(z, z); ctx.translate(-W / 2, -H * 0.55); dibujaEscena(e, t); ctx.restore(); }
    if (e.tipo === 'portada') portadaTexto(ctx, render, t, c);
    else if (e.tipo === 'cierre') cierreTexto(ctx, t, c);
    else { subtitulos(ctx, e, t); if (e.pedir) seguir(ctx, t, e.dur); if (e.contador) contador(ctx, e.contador, t, e.dur); logo(ctx, c.logo, 100, 1790, 54); txt(ctx, 'Potter Play', 145, 1792, 32, { align: 'left', color: 'rgba(255,255,255,0.88)' }); }
    if (e.tipo === 'cierre' && e.contador) contador(ctx, e.contador, t, e.dur);
    return cv;
  }
  if (o.still != null) { for (const s of o.still.split(',')) { const f = path.join(ROOT, 'out', `2d-${render.id}-${s}s.png`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, cuadro(+s).toBuffer('image/png')); console.log(`PNG: ${f}`); } return; }
  const salida = path.resolve(o.salida || path.join(ROOT, 'out', `2d-${render.id}.mp4`)); fs.mkdirSync(path.dirname(salida), { recursive: true });
  const wav = path.join(path.dirname(salida), `${render.id}-audio2d.wav`); mezclar(render, wav);
  const dur = render.duracion, frames = Math.ceil(dur * FPS);
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'pipe:0', '-i', wav, '-map', '0:v', '-map', '1:a',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-profile:v', 'high', '-g', String(FPS * 2), '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-t', dur.toFixed(3), '-movflags', '+faststart', salida];
  const ff = spawn(ffmpegPath, args, { stdio: ['pipe', 'ignore', 'pipe'] }); let err = ''; ff.stderr.on('data', (d) => { err += d; }); ff.stdin.on('error', () => {});
  const fin = new Promise((res, rej) => { ff.on('error', rej); ff.on('close', (k) => (k === 0 ? res() : rej(new Error(`ffmpeg ${k}: ${err.slice(-500)}`)))); });
  const t0 = Date.now(); for (let i = 0; i < frames; i++) { cuadro(i / FPS); if (!ff.stdin.write(Buffer.from(cv.data()))) await new Promise((r) => ff.stdin.once('drain', r)); if (i % (FPS * 10) === 0) console.error(`  ${Math.round(100 * i / frames)}%`); }
  ff.stdin.end(); await fin; fs.rmSync(wav, { force: true });
  console.error(`Listo en ${((Date.now() - t0) / 1000).toFixed(0)} s: ${salida}`);
}
main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
