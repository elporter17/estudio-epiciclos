// Vista previa SIN gasto de una historia 2D: dibuja personajes, objetos y fondos de relleno (formas de color con su nombre),
// inventa una voz en silencio con el ritmo medido (0,46 s por palabra) y deja que animate.mjs pinte los cuadros que pidas.
// Sirve para revisar posiciones, tiempos, filtro de visión, etiquetas y subtítulos antes de pagar las imágenes y la voz.
// Todo va a la serie «<slug>-prueba» (series/ y out/), que no toca la serie real.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { createCanvas } from '@napi-rs/canvas';
import { ROOT, ENV_FILE } from './env.mjs';
import { saveSeries, writeJson, OUT_DIR, wordsOf } from './series.mjs';
import { setupFonts } from '../assemble.mjs';

const COLOR = { rojo: '#DC2626', verde: '#16A34A', azul: '#2563EB', amarillo: '#FACC15', puntos: '#F97316' };
const colorDe = (id, def) => Object.entries(COLOR).find(([k]) => id.includes(k))?.[1] || def;
const PIEL = '#D9A066';

function png(file, w, h, dibujo) {
  const cv = createCanvas(w, h), ctx = cv.getContext('2d'); dibujo(ctx, w, h);
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, cv.toBuffer('image/png'));
}
function etiquetar(ctx, texto, x, y, size) {
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = size / 6; ctx.font = `800 ${size}px Montserrat`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeText(texto, x, y); ctx.fillText(texto, x, y);
}

export function vistaPrevia(serie, { stills = [] } = {}) {
  setupFonts();
  const slug = `${serie.slug}-prueba`, S = { ...serie, slug, title: `${serie.title} (prueba)` }, dir = path.join(OUT_DIR, slug);
  fs.rmSync(dir, { recursive: true, force: true });
  saveSeries(S);
  const paleta = ['#2563EB', '#16A34A', '#9333EA', '#EA580C', '#0891B2'];
  Object.entries(serie.anim.sprites).forEach(([id, [pj]], i) => png(path.join(dir, 'anim', 'sprites', `${id}.png`), 600, 1000, (ctx, w, h) => {
    const c = paleta[serie.characters.findIndex((p) => p.id === pj) % paleta.length] || '#64748B';
    ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(120, 380, 360, 560, 60); ctx.fill();
    ctx.fillStyle = PIEL; ctx.beginPath(); ctx.arc(300, 250, 190, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(230, 240, 20, 0, 7); ctx.arc(370, 240, 20, 0, 7); ctx.fill();
    etiquetar(ctx, id.replace(/_/g, ' '), 300, 600, 44);
  }));
  Object.entries(serie.anim.props).forEach(([id]) => png(path.join(dir, 'anim', 'props', `${id}.png`), 800, 500, (ctx, w, h) => {
    ctx.fillStyle = colorDe(id, '#94A3B8'); ctx.beginPath(); ctx.roundRect(40, 40, w - 80, h - 80, 70); ctx.fill(); etiquetar(ctx, id.replace(/_/g, ' '), w / 2, h / 2, 56);
  }));
  Object.entries(serie.anim.bgs).forEach(([id], i) => png(path.join(dir, 'anim', 'bg', `${id}.png`), 1088, 1920, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, ['#7DD3FC', '#FDE68A', '#FDBA74', '#C4B5FD'][i % 4]); g.addColorStop(0.55, '#86EFAC'); g.addColorStop(1, '#4ADE80');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); etiquetar(ctx, id.replace(/_/g, ' '), w / 2, h * 0.32, 70);
  }));
  // Voz inventada: cada línea dura palabras × 0,46 s; entre líneas 0,22 s y entre escenas 0,42 s
  let t = 0.08; const scenes = [], lines = [];
  for (const sc of serie.episodes[0].scenes) {
    const ini = t;
    for (const l of sc.lines) {
      const ws = wordsOf(l.text), start = t, words = ws.map((w, k) => ({ w, start: +(start + k * 0.46).toFixed(2), end: +(start + (k + 1) * 0.46 - 0.04).toFixed(2) }));
      t = start + ws.length * 0.46; lines.push({ scene: sc.id, beat: sc.beat, speaker: l.speaker, text: l.text, start, end: +t.toFixed(2), words }); t += 0.22;
    }
    scenes.push({ id: sc.id, beat: sc.beat, start: ini, end: +(t - 0.22).toFixed(2) }); t += 0.2;
  }
  const dur = +(t + 1.6).toFixed(2), audio = path.join(dir, 'ep01', 'audio');
  fs.mkdirSync(audio, { recursive: true });
  spawnSync(ffmpegPath, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(dur), '-c:a', 'pcm_s16le', path.join(audio, 'episode.wav')]);
  writeJson(path.join(audio, 'timeline.json'), { series: slug, episode: 1, duration: dur, audio: 'episode.wav', voiceModel: 'prueba', scenes, lines });
  const hits = stills.length ? stills : scenes.map((s) => +(s.start + Math.min(5, (s.end - s.start) * 0.8)).toFixed(1));
  const r = spawnSync(process.execPath, [`--env-file=${ENV_FILE}`, path.join('scripts', 'animate.mjs'), '--series', slug, '--ep', '1', '--still', hits.join(',')], { cwd: ROOT, stdio: 'inherit' });
  return { slug, dur, hits, ok: r.status === 0, dir };
}
