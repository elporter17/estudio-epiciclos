#!/usr/bin/env node
// Paso 4 · montaje. Dibuja cada cuadro con canvas y lo codifica con ffmpeg: 1080×1920 a 30 fps, H.264 + AAC.
//   · imágenes con movimiento lento (zoom o paneo) y fundido entre escenas, sincronizadas con la voz
//   · subtítulos grandes de 2 a 4 palabras con la palabra que se está diciendo resaltada
//   · «PARTE N» arriba, texto gancho los primeros 3 s y tarjeta «PARTE N+1 EN MI PERFIL» al cierre
//   · música opcional desde assets/music (se baja sola cuando habla la voz)
//   · todo el texto dentro de la zona segura de TikTok (x 6–84 % de W, y 15–78 % de H); si algo se sale, falla
//
//   npm run assemble -- --ep 1
//   npm run assemble -- --ep 1 --still 2.5 --safe-overlay   (PNG de ese instante, con la zona segura marcada)
//   npm run assemble -- --ep all --music none
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { parseCli, parseEpisodes, run } from './lib/cli.mjs';
import { ROOT, log } from './lib/env.mjs';
import { loadSeries, episode, imageDir, timelineFile, videoFile, readJson, writeJson } from './lib/series.mjs';

export const W = 1080, H = 1920, FPS = 30;
export const SAFE = { x0: 0.06 * W, x1: 0.84 * W, y0: 0.15 * H, y1: 0.78 * H };
export const CX = (SAFE.x0 + SAFE.x1) / 2; // el texto se centra en la zona segura, no en el cuadro
const FONT = 'Montserrat';
export const LOOK = {
  sub: { size: 86, min: 58, y: 0.655 * H, stroke: 15, color: '#FFFFFF', active: '#FFE14D', lineGap: 1.08 },
  part: { size: 44, padX: 30, padY: 16, top: SAFE.y0 + 12, bg: 'rgba(225,29,72,0.94)' },
  hook: { size: 72, min: 54, stroke: 13, gapTop: 34, until: 3.0, fade: 0.35, maxLines: 3 },
  end: { big: 138, small: 66, y: 0.43 * H, stroke: 16, color: '#FFE14D' },
  zoom: 0.11, xfade: 0.4
};
const MUSIC_DIR = path.join(ROOT, 'assets', 'music');

let fontsReady = false;
export function setupFonts() {
  if (fontsReady) return;
  const dir = path.join(ROOT, 'node_modules', '@fontsource', 'montserrat', 'files');
  for (const f of fs.readdirSync(dir).filter((f) => /-(latin|latin-ext)-(800|900)-normal\.woff2$/.test(f))) GlobalFonts.registerFromPath(path.join(dir, f), FONT);
  fontsReady = true;
}
const font = (weight, size) => `${weight} ${size}px ${FONT}`;

/* ---------------- subtítulos ---------------- */
const clean = (w) => w.replace(/[.,;:…]+(["»”)]*)$/u, '$1').toLocaleUpperCase('es');

// Agrupa las palabras de una línea en bloques de 2 a 4, cortando de preferencia en la puntuación
export function chunkWords(words) {
  const phrases = []; let cur = [];
  for (const w of words) { cur.push(w); if (/[.,;:!?…]["»”)]*$/u.test(w.w)) { phrases.push(cur); cur = []; } }
  if (cur.length) phrases.push(cur);
  for (let i = 0; i < phrases.length && phrases.length > 1; i++) {
    if (phrases[i].length !== 1) continue;
    const j = i > 0 && phrases[i - 1].length < 4 ? i - 1 : i + 1 < phrases.length ? i + 1 : i - 1;
    if (j < i) phrases[j].push(...phrases[i]); else phrases[j].unshift(...phrases[i]);
    phrases.splice(i, 1); i--;
  }
  return phrases.flatMap(splitPhrase);
}

// Palabras que no deben cerrar un bloque («EL CINE QUE MI | MADRE»): artículos, preposiciones, posesivos, etc.
const WEAK = new Set(('el la los las lo un una unos unas al del de en a y e o u ni que con sin por para mi mis tu tus su sus ' +
  'nuestro nuestra me te se le les nos no muy más tan como cuando si pero porque hasta desde entre sobre ' +
  'the a an of to in on at and or but my your his her their our is was').split(' '));
const bare = (w) => w.w.toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]/gu, '');

// Parte una frase en bloques de 2 a 4 palabras con el menor costo: bloques de ~3 palabras, sin terminar en
// palabra débil y sin pasarse de ~20 letras (para que quepan grandes en un renglón)
function splitPhrase(p) {
  if (p.length <= 2) return [p];
  const cost = (a, b) => {
    const ws = p.slice(a, b), chars = ws.reduce((s, w) => s + w.w.length, 0) + ws.length - 1;
    return 1 + 0.5 * (ws.length - 3) ** 2 + (b < p.length && WEAK.has(bare(ws[ws.length - 1])) ? 4 : 0) + Math.max(0, chars - 20) * 0.3;
  };
  const best = [{ c: 0, from: -1 }];
  for (let i = 1; i <= p.length; i++) {
    best[i] = { c: Infinity, from: -1 };
    for (let size = 2; size <= 4; size++) {
      const j = i - size;
      if (j < 0 || best[j].c === Infinity) continue;
      const c = best[j].c + cost(j, i);
      if (c < best[i].c) best[i] = { c, from: j };
    }
  }
  if (best[p.length].c === Infinity) return [p]; // no ocurre con 3+ palabras (siempre hay combinación de 2–4)
  const out = [];
  for (let i = p.length; i > 0; i = best[i].from) out.unshift(p.slice(best[i].from, i));
  return out;
}

// Bloques con tiempo: visibles desde su primera palabra hasta el siguiente bloque (o poco después de la línea)
export function buildCaptions(timeline, { standalone = false } = {}) {
  const out = [];
  timeline.lines.forEach((line, li) => {
    if (!standalone && line.beat === 'cierre') return; // el cierre lo dice la tarjeta final
    const next = timeline.lines[li + 1];
    const chunks = chunkWords(line.words);
    chunks.forEach((ws, ci) => {
      const end = ci + 1 < chunks.length ? chunks[ci + 1][0].start : Math.min(line.end + 0.35, next ? next.start - 0.03 : line.end + 0.6);
      out.push({ start: ws[0].start, end, words: ws.map((w) => ({ ...w, text: clean(w.w) })) });
    });
  });
  return out;
}

// Coloca palabras en 1 o 2 renglones centrados en CX; achica la letra hasta que quepa en la zona segura.
// Un renglón solo si cabe a buen tamaño (oneLineMin); si no, dos renglones grandes antes que uno diminuto.
export function layoutWords(ctx, words, { size, min, stroke, weight = 900, maxLines = 2, lineGap = 1.08, oneLineMin = Math.round(size * 0.78) }) {
  const maxW = SAFE.x1 - SAFE.x0 - stroke - 8;
  const rowOf = (ws, space) => {
    const widths = ws.map((w) => ctx.measureText(w.text).width);
    return { ws, widths, width: widths.reduce((a, b) => a + b, 0) + space * (ws.length - 1) };
  };
  // De todas las formas de partir en n renglones seguidos, la de renglones más parejos de ancho
  const split = (n, space) => {
    let best = null;
    const walk = (at, left, acc) => {
      if (left === 1) {
        const rows = [...acc, rowOf(words.slice(at), space)], widest = Math.max(...rows.map((r) => r.width));
        if (!best || widest < best.widest) best = { rows, widest };
        return;
      }
      for (let end = at + 1; end <= words.length - left + 1; end++) walk(end, left - 1, [...acc, rowOf(words.slice(at, end), space)]);
    };
    walk(0, n, []);
    return best.rows;
  };
  for (let n = 1; n <= Math.min(maxLines, words.length); n++) {
    const floor = n < Math.min(maxLines, words.length) ? Math.max(min, oneLineMin) : min;
    for (let s = size; s >= floor; s -= 2) {
      ctx.font = font(weight, s);
      const space = ctx.measureText(' ').width;
      const rows = split(n, space);
      if (rows.every((r) => r.width <= maxW)) {
        const m = ctx.measureText('ÁÉÑQgjy'), asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
        return { size: s, space, rows, asc, desc, lineH: s * lineGap, weight };
      }
    }
  }
  throw new Error(`El texto «${words.map((w) => w.text).join(' ')}» no cabe en la zona segura ni a ${min}px`);
}

// Caja ocupada (con el contorno) de un bloque centrado en (CX, y = primera línea base)
export function boxOf(L, baseY, stroke) {
  const w = Math.max(...L.rows.map((r) => r.width));
  return { x0: CX - w / 2 - stroke / 2, x1: CX + w / 2 + stroke / 2, y0: baseY - L.asc - stroke / 2, y1: baseY + (L.rows.length - 1) * L.lineH + L.desc + stroke / 2 };
}

export function drawRows(ctx, L, baseY, { stroke, color, active = -1, activeColor, scale = 1, alpha = 1 }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const midY = baseY + ((L.rows.length - 1) * L.lineH) / 2 - (L.asc - L.desc) / 2;
  ctx.translate(CX, midY); ctx.scale(scale, scale); ctx.translate(-CX, -midY);
  ctx.font = font(L.weight, L.size); ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  let idx = 0;
  L.rows.forEach((r, ri) => {
    let x = CX - r.width / 2; const y = baseY + ri * L.lineH;
    r.ws.forEach((w, wi) => {
      ctx.lineWidth = stroke; ctx.strokeStyle = 'rgba(0,0,0,0.92)';
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
      ctx.strokeText(w.text, x, y);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = idx === active ? activeColor : color;
      ctx.fillText(w.text, x, y);
      x += r.widths[wi] + L.space; idx++;
    });
  });
  ctx.restore();
}

/* ---------------- imágenes con movimiento ---------------- */
// Intervalo visible de cada escena: entra con un fundido que termina justo cuando empieza su voz
function sceneWindows(timeline) {
  const sc = timeline.scenes;
  return sc.map((s, i) => {
    const fadeIn = i === 0 ? 0 : Math.max(sc[i - 1].end, s.start - LOOK.xfade);
    const next = sc[i + 1];
    const out = next ? Math.max(s.end, next.start - LOOK.xfade) : timeline.duration;
    return { id: s.id, beat: s.beat, fadeIn, start: i === 0 ? 0 : s.start, until: next ? next.start : timeline.duration, moveFrom: fadeIn, moveTo: next ? next.start : timeline.duration, out };
  });
}

function drawMoving(ctx, img, motion, u, alpha) {
  const base = Math.max(W / img.width, H / img.height), z = LOOK.zoom;
  let k = 1 + z, ox = 0, oy = 0;
  if (motion === 'zoom_in') k = 1 + z * u;
  else if (motion === 'zoom_out') k = 1 + z * (1 - u);
  const dw = img.width * base * k, dh = img.height * base * k;
  const mx = (dw - W) / 2 * 0.85, my = (dh - H) / 2 * 0.85;
  if (motion === 'pan_left') ox = mx * (1 - 2 * u);
  else if (motion === 'pan_right') ox = -mx * (1 - 2 * u);
  else if (motion === 'pan_up') oy = my * (1 - 2 * u);
  else if (motion === 'pan_down') oy = -my * (1 - 2 * u);
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, (W - dw) / 2 + ox, (H - dh) / 2 + oy, dw, dh);
  ctx.globalAlpha = 1;
}

function shadeLayer() {
  const c = createCanvas(W, H), g = c.getContext('2d');
  let gr = g.createLinearGradient(0, 0, 0, 0.32 * H);
  gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, 0.32 * H);
  gr = g.createLinearGradient(0, 0.48 * H, 0, H);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.62)');
  g.fillStyle = gr; g.fillRect(0, 0.48 * H, W, 0.52 * H);
  return c;
}

export const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

/* ---------------- escena completa ---------------- */
export async function prepare(series, n) {
  setupFonts();
  const ep = episode(series, n);
  const timeline = readJson(timelineFile(series.slug, n));
  if (!timeline) throw new Error(`Falta la voz de la parte ${n}: ejecuta «npm run voice -- --ep ${n}».`);
  const dir = imageDir(series.slug, n), imgs = {};
  let last = null;
  for (const s of ep.scenes) {
    const f = path.join(dir, `${s.id}.jpg`);
    if (fs.existsSync(f)) last = imgs[s.id] = await loadImage(fs.readFileSync(f));
    else if (last) { imgs[s.id] = last; log(`  aviso: falta la imagen de ${s.id}, repito la anterior\n`); }
  }
  if (!Object.keys(imgs).length) throw new Error(`Faltan las imágenes de la parte ${n}: ejecuta «npm run images -- --ep ${n}».`);
  const first = imgs[ep.scenes.find((s) => imgs[s.id]).id];
  for (const s of ep.scenes) imgs[s.id] ||= first;

  const cv = createCanvas(W, H), ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // series.standalone: video suelto (sin «PARTE N» ni tarjeta «PARTE N+1 EN MI PERFIL»); el cierre se subtitula
  const standalone = !!series.standalone;
  const captions = buildCaptions(timeline, { standalone });
  const windows = sceneWindows(timeline);
  const motions = Object.fromEntries(ep.scenes.map((s) => [s.id, s.motion]));
  const closing = standalone ? null : timeline.lines.find((l) => l.beat === 'cierre');
  const lang = series.language;

  // Layouts fijos (se calculan una vez) y revisión de la zona segura
  const violations = [];
  const check = (what, b) => {
    const bad = [];
    if (b.x0 < SAFE.x0) bad.push(`izq ${b.x0.toFixed(0)} < ${SAFE.x0.toFixed(0)}`);
    if (b.x1 > SAFE.x1) bad.push(`der ${b.x1.toFixed(0)} > ${SAFE.x1.toFixed(0)}`);
    if (b.y0 < SAFE.y0) bad.push(`arriba ${b.y0.toFixed(0)} < ${SAFE.y0.toFixed(0)}`);
    if (b.y1 > SAFE.y1) bad.push(`abajo ${b.y1.toFixed(0)} > ${SAFE.y1.toFixed(0)}`);
    if (bad.length) violations.push(`${what}: ${bad.join(', ')}`);
  };

  const P = LOOK.part;
  ctx.font = font(800, P.size);
  const partText = lang === 'en' ? `PART ${n}` : `PARTE ${n}`;
  const pm = ctx.measureText(partText), pw = pm.width + P.padX * 2, ph = P.size + P.padY * 2;
  const part = { text: partText, x0: CX - pw / 2, y0: P.top, w: pw, h: ph };
  check('Parte N', { x0: part.x0, x1: part.x0 + pw, y0: part.y0, y1: part.y0 + ph });

  const Hk = LOOK.hook;
  const hookWords = ep.hook_text.trim().split(/\s+/).map((w) => ({ text: w.toLocaleUpperCase('es') }));
  const hookL = layoutWords(ctx, hookWords, { size: Hk.size, min: Hk.min, stroke: Hk.stroke, maxLines: Hk.maxLines, lineGap: 1.1 });
  const hookY = part.y0 + ph + Hk.gapTop + hookL.asc + Hk.stroke / 2;
  check('Gancho', boxOf(hookL, hookY, Hk.stroke));

  const E = LOOK.end;
  const endBig = layoutWords(ctx, [{ text: lang === 'en' ? `PART ${n + 1}` : `PARTE ${n + 1}` }], { size: E.big, min: 90, stroke: E.stroke, maxLines: 1 });
  const endSmall = layoutWords(ctx, (lang === 'en' ? 'ON MY PROFILE' : 'EN MI PERFIL').split(' ').map((t) => ({ text: t })), { size: E.small, min: 48, stroke: E.stroke - 4, maxLines: 1 });
  const endY = E.y, endY2 = E.y + endBig.desc + 30 + endSmall.asc;
  check('Cierre', boxOf(endBig, endY, E.stroke)); check('Cierre', boxOf(endSmall, endY2, E.stroke - 4));

  const S = LOOK.sub;
  for (const c of captions) {
    c.L = layoutWords(ctx, c.words, { size: S.size, min: S.min, stroke: S.stroke, lineGap: S.lineGap });
    // la línea base se ajusta para que el bloque (1 o 2 renglones) quede centrado en S.y
    c.baseY = S.y - ((c.L.rows.length - 1) * c.L.lineH) / 2 + (c.L.asc - c.L.desc) / 2;
    check(`Subtítulo «${c.words.map((w) => w.text).join(' ')}»`, boxOf(c.L, c.baseY, S.stroke));
  }

  const shade = shadeLayer();

  function render(t, { safeOverlay = false } = {}) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // imágenes: la escena actual y, durante el fundido, la siguiente encima
    for (let i = 0; i < windows.length; i++) {
      const w = windows[i];
      const visible = t >= w.fadeIn && (i + 1 >= windows.length || t < windows[i + 1].start);
      if (!visible) continue;
      const alpha = i === 0 || t >= w.start ? 1 : (t - w.fadeIn) / Math.max(0.01, w.start - w.fadeIn);
      const u = Math.min(1, Math.max(0, (t - w.moveFrom) / Math.max(0.01, w.moveTo + LOOK.xfade - w.moveFrom)));
      drawMoving(ctx, imgs[w.id], motions[w.id], u, Math.min(1, alpha));
    }
    ctx.drawImage(shade, 0, 0);

    // tarjeta final
    const endOn = closing && t >= closing.start - 0.15;
    if (endOn) {
      const k = ease((t - closing.start + 0.15) / 0.35);
      ctx.fillStyle = `rgba(0,0,0,${0.38 * k})`; ctx.fillRect(0, 0, W, H);
      drawRows(ctx, endBig, endY, { stroke: E.stroke, color: E.color, scale: 0.8 + 0.2 * k, alpha: k });
      drawRows(ctx, endSmall, endY2, { stroke: E.stroke - 4, color: '#FFFFFF', scale: 0.8 + 0.2 * k, alpha: k });
    }

    // PARTE N
    if (!standalone) {
      ctx.fillStyle = P.bg;
      ctx.beginPath(); ctx.roundRect(part.x0, part.y0, part.w, part.h, part.h / 2); ctx.fill();
      ctx.font = font(800, P.size); ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText(part.text, CX, part.y0 + part.h / 2 + 2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    // gancho de los primeros 3 s
    if (t < Hk.until + Hk.fade) {
      const a = t < Hk.until ? 1 : 1 - (t - Hk.until) / Hk.fade;
      drawRows(ctx, hookL, hookY, { stroke: Hk.stroke, color: '#FFFFFF', alpha: a, scale: 0.94 + 0.06 * ease(t / 0.18) });
    }

    // subtítulo activo
    if (!endOn) {
      const c = captions.find((x) => t >= x.start && t < x.end);
      if (c) {
        let active = -1; c.words.forEach((w, i) => { if (t >= w.start - 0.02) active = i; });
        drawRows(ctx, c.L, c.baseY, { stroke: S.stroke, color: S.color, active, activeColor: S.active, scale: 0.9 + 0.1 * ease((t - c.start) / 0.1) });
      }
    }

    if (safeOverlay) {
      ctx.save(); ctx.strokeStyle = '#00E5FF'; ctx.lineWidth = 4; ctx.setLineDash([18, 12]);
      ctx.strokeRect(SAFE.x0, SAFE.y0, SAFE.x1 - SAFE.x0, SAFE.y1 - SAFE.y0); ctx.restore();
    }
    return cv;
  }

  return { ep, timeline, captions, violations, render, canvas: cv };
}

// Hashtags sin repetir (sin distinguir mayúsculas): #Minidrama y #minidrama cuentan como uno
export const hashtagLine = (tags) => [...new Map(tags.map((h) => [h.toLowerCase(), h])).values()].map((h) => `#${h}`).join(' ');

/* ---------------- música ---------------- */
function pickMusic(choice, seed) {
  if (choice === 'none') return null;
  if (choice && choice !== 'auto') { const f = path.resolve(choice); if (!fs.existsSync(f)) throw new Error(`No existe la música ${f}`); return f; }
  if (!fs.existsSync(MUSIC_DIR)) return null;
  const files = fs.readdirSync(MUSIC_DIR).filter((f) => /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(f)).sort();
  if (!files.length) return null;
  const h = parseInt(crypto.createHash('sha1').update(seed).digest('hex').slice(0, 8), 16);
  return path.join(MUSIC_DIR, files[h % files.length]);
}

export async function assembleEpisode(series, n, { music = 'auto', musicVolume = '0.22', crf = '19', still, safeOverlay = false, allowUnsafe = false } = {}) {
  const R = await prepare(series, n);
  if (R.violations.length) {
    const msg = `Texto fuera de la zona segura en la parte ${n}:\n  ${R.violations.join('\n  ')}`;
    if (!allowUnsafe) throw new Error(msg);
    log(`AVISO: ${msg}\n`);
  }
  const out = videoFile(series.slug, n);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  if (still != null) {
    const png = out.replace(/\.mp4$/, `-${still}s.png`);
    fs.writeFileSync(png, R.render(+still, { safeOverlay }).toBuffer('image/png'));
    log(`PNG: ${png}\n`);
    return { png };
  }

  const dur = R.timeline.duration, frames = Math.ceil(dur * FPS);
  const voice = path.join(path.dirname(timelineFile(series.slug, n)), R.timeline.audio);
  const track = pickMusic(music, `${series.slug}-${n}`);
  log(`Parte ${n}: ${dur.toFixed(1)} s · ${frames} cuadros · ${R.captions.length} subtítulos · música: ${track ? path.basename(track) : 'no'}\n`);

  const audioIn = ['-i', voice, ...(track ? ['-stream_loop', '-1', '-i', track] : [])];
  const norm = 'loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000';
  const filter = track
    ? `[1:a]aresample=48000,asplit=2[v1][v2];[2:a]aresample=48000,volume=${musicVolume},afade=t=in:d=1.5,afade=t=out:st=${Math.max(0, dur - 2.5).toFixed(2)}:d=2.5[m];` +
      `[m][v2]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=350[md];[v1][md]amix=inputs=2:duration=first:normalize=0,${norm}[a]`
    : `[1:a]aresample=48000,${norm}[a]`;
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'pipe:0',
    ...audioIn,
    '-filter_complex', filter, '-map', '0:v', '-map', '[a]',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-profile:v', 'high', '-level:v', '4.2',
    '-g', String(FPS * 2), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-t', dur.toFixed(3), '-movflags', '+faststart', out
  ];
  const ff = spawn(ffmpegPath, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let errText = '';
  ff.stderr.on('data', (d) => { errText += d; });
  const done = new Promise((res, rej) => {
    ff.on('error', rej);
    ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg terminó con código ${code}: ${errText.trim().slice(-800)}`))));
  });
  ff.stdin.on('error', () => { /* el error real llega por 'close' */ });

  const t0 = Date.now(); let lastPct = -1;
  for (let i = 0; i < frames; i++) {
    const cv = R.render(i / FPS);
    if (!ff.stdin.write(Buffer.from(cv.data()))) await new Promise((r) => ff.stdin.once('drain', r));
    const pct = Math.floor((100 * (i + 1)) / frames);
    if (pct !== lastPct && pct % 5 === 0) { lastPct = pct; log(`\r  ${pct}% · cuadro ${i + 1}/${frames}`); }
  }
  ff.stdin.end();
  await done;
  log(`\n  listo en ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);

  // Datos para publish: descripción con hashtags y aviso de ficción hecha con IA
  const ep = R.ep;
  const disclosure = series.language === 'en' ? 'Fiction · AI-generated' : 'Ficción · hecho con IA';
  const tags = hashtagLine([...ep.hashtags, 'minidrama']);
  const text = `${ep.post_description}\n${disclosure}\n\n${tags}`.slice(0, 2200);
  const sidecar = out.replace(/\.mp4$/, '.json');
  writeJson(sidecar, {
    file: path.basename(out), series: series.slug, seriesTitle: series.title, episode: n, title: ep.title, lang: series.language,
    duration: dur, fps: FPS, width: W, height: H, music: track ? path.basename(track) : null, ai_generated: true,
    hook_text: ep.hook_text, safe_zone: SAFE, violations: R.violations,
    post: { text, description: ep.post_description, hashtags: ep.hashtags, source: series.model },
    createdAt: new Date().toISOString()
  });
  log(`MP4: ${out}\nDatos: ${sidecar}\n`);
  return { out, sidecar };
}

async function main() {
  const o = parseCli({
    series: { type: 'string' }, ep: { type: 'string' }, music: { type: 'string', default: 'auto' }, 'music-volume': { type: 'string', default: '0.22' },
    crf: { type: 'string', default: '19' }, still: { type: 'string' }, 'safe-overlay': { type: 'boolean', default: false },
    'allow-unsafe': { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' }
  });
  if (o.help) { console.log('Uso: npm run assemble -- [--series <slug>] [--ep 1|all] [--music auto|none|<archivo>] [--music-volume 0.22] [--still <s> [--safe-overlay]] [--allow-unsafe]'); return; }
  const series = loadSeries(o.series);
  for (const n of parseEpisodes(o.ep, series.episodes.length)) {
    await assembleEpisode(series, n, { music: o.music, musicVolume: o['music-volume'], crf: o.crf, still: o.still, safeOverlay: o['safe-overlay'], allowUnsafe: o['allow-unsafe'] });
  }
}

run(import.meta.url, main);
