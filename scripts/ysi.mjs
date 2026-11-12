#!/usr/bin/env node
// Historias «¿Y si pudieras ver…?» para YouTube (horizontal, 10 a 15 min, sin IA): personajes de garabato sobre fotos
// reales (scripts/lib/estilos-personaje.mjs), un número encima de cada uno que sube cuando la persona miente (o lo que
// cuente la historia), narrador y subtítulos. El guion va en data/ysi/<episodio>.json (fondos, reparto y escenas).
// Sube el video PRIVADO a YouTube (se publica a mano desde Studio) con capítulos, miniatura y aviso por Telegram.
//   node --env-file=.env scripts/ysi.mjs --episodio mentiras --dry-run            → solo el video y la miniatura
//   node --env-file=.env scripts/ysi.mjs --episodio mentiras --dry-run --still 30 → un cuadro en PNG
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { parseCli } from './lib/cli.mjs';
import { setupNode, ROOT } from './lib/node-env.mjs';
import { renderLargo } from './lib/largo-video.mjs';
import { subirYouTube, youtubeReady, ponerMiniatura } from './lib/youtube.mjs';
import { dibujarFondo } from './lib/fondos-garabato.mjs';
import { dibujarEstilo, numeroEstilo } from './lib/estilos-personaje.mjs';
import { telegram } from './lib/control.mjs';

const o = parseCli({ miniatura: { type: 'boolean', default: false }, episodio: { type: 'string', default: 'mentiras' }, 'dry-run': { type: 'boolean', default: false }, still: { type: 'string' } });
const fx = setupNode(), emojiFont = fx.emoji ? `"${fx.emoji}"` : '';
const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ysi', `${o.episodio}.json`), 'utf8'));

// Fondos dibujados a mano (scripts/lib/fondos-garabato.mjs): todo animado, sin fotos
const escenas = G.escenas.map((e) => ({ tipo: 'historia', dur: 6, tema: 'gta', reparto: G.reparto, ...e, lugar: e.fondo }));

const outDir = path.join(ROOT, 'out'); fs.mkdirSync(outDir, { recursive: true });
const nombre = `ysi-${G.id}`;
if (o.still != null) { const png = path.join(outDir, `${nombre}-${o.still}s.png`); await renderLargo({ escenas, out: png, emojiFont, still: o.still }); console.log(png); process.exit(0); }

// Miniatura 1280×720: la foto, el personaje con el número enorme en rojo y la pregunta
async function miniatura(out) {
  const W = 1280, H = 720, cv = createCanvas(W, H), g = cv.getContext('2d'), m = G.miniatura || {};
  // El patio dibujado a mano, escalado a 1280×720
  g.save(); g.scale(W / 1920, H / 1080); dibujarFondo(g, 'patio', 1920, 1080, 0, 9); g.restore();
  const lado = g.createLinearGradient(0, 0, W, 0); lado.addColorStop(0, 'rgba(10,10,20,0.75)'); lado.addColorStop(0.55, 'rgba(10,10,20,0.15)'); lado.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lado; g.fillRect(0, 0, W, H);
  const c = dibujarEstilo(g, 'garabato', { ...G.reparto.kevin, sobreFoto: true }, 960, 700, 440, { expresion: 'feliz', semilla: 20 });
  numeroEstilo(g, 'garabato', (m.numero || 9416).toLocaleString('es-HN').replace(/,/g, '.'), 960, Math.max(80, c.cabeza - 30), 84, true);
  g.font = '400 92px "Archivo Black", Impact, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top';
  const palabras = (m.texto || '¿Y SI PUDIERAS VER?').split(' '), lineas = []; let l = '';
  for (const w of palabras) { const p = l ? `${l} ${w}` : w; if (g.measureText(p).width > 620) { lineas.push(l); l = w; } else l = p; } lineas.push(l);
  lineas.forEach((t, i) => { g.lineWidth = 14; g.strokeStyle = '#111'; g.strokeText(t, 60, 90 + i * 110); g.fillStyle = i === lineas.length - 1 ? '#facc15' : '#ffffff'; g.fillText(t, 60, 90 + i * 110); });
  fs.writeFileSync(out, cv.toBuffer('image/jpeg', 90));
}

const video = path.join(outDir, `${nombre}.mp4`), mini = path.join(outDir, `${nombre}-miniatura.jpg`);
if (o.miniatura) { await miniatura(mini); console.log(mini); process.exit(0); }
const r = await renderLargo({ escenas, out: video, emojiFont, estilo: 'lofi', semilla: 4208 });
await miniatura(mini);
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const capitulos = r.capitulos.map((c) => `${mmss(c.t)} ${c.titulo}`).join('\n');
const descripcion = `${G.titulo}\n\nUn día despiertas y puedes ver, encima de la cabeza de cada persona, cuántas mentiras ha dicho en su vida. Tu mamá, tu mejor amigo, la persona que te gusta… y tú.\n\nCapítulos:\n${capitulos}\n\n💬 ¿Cuántas mentiras crees que tendrías? Escríbelo en los comentarios.\n🔔 Suscríbete a Potter Play: una historia nueva de «¿Y si pudieras ver…?» cada semana.\n\nHistoria de ficción. Todo dibujado por Potter Play.\n\n#ysipudierasver #historias #animacion #potterplay`;
const meta = { kind: 'ysi', title: G.titulo, file: path.basename(video), duration: r.duration, post: { text: descripcion }, createdAt: new Date().toISOString() };
console.error(`${G.titulo} · ${(r.duration / 60).toFixed(1)} min\n${capitulos}`);

if (!o['dry-run'] && youtubeReady()) {
  try {
    meta.youtube = await subirYouTube({ file: video, titulo: G.titulo, descripcion, categoria: '24', etiquetas: ['y si pudieras ver', 'historias', 'animación', 'qué pasaría si', 'mentiras', 'potter play'] });
    try { await ponerMiniatura(meta.youtube.id, mini); meta.youtube.miniatura = 'ok'; } catch (e) { meta.youtube.miniatura = e.message; }
    await telegram(`📺 <b>${G.titulo}</b> (${(r.duration / 60).toFixed(1)} min) quedó subido como <b>privado</b> en YouTube. Revísalo y publícalo desde Studio: ${meta.youtube.studio}`).catch(() => {});
  } catch (e) { meta.youtube = { status: 'error', error: e.message }; console.error(`Aviso: YouTube: ${e.message}`); }
}
fs.writeFileSync(video.replace(/\.mp4$/, '.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(JSON.stringify({ video, miniatura: mini, duration: r.duration, youtube: meta.youtube }, null, 2));
