#!/usr/bin/env node
// Video largo para YouTube (horizontal, sin IA): «La historia de GTA, de 1997 a GTA VI», para la semana del lanzamiento
// (2026-11-19). Un capítulo por juego con sus datos (data/gta-historia.json, cada uno con su fuente), narrador,
// intrigas entre capítulos y la pregunta «¿cuál fue tu primer GTA?» al final. Sube el video PRIVADO a YouTube (como el
// de «Cómo se hace»: se publica a mano desde Studio) con capítulos en la descripción y su miniatura.
//   node --env-file=.env scripts/gta-largo.mjs --dry-run            → solo el video y la miniatura, en out/
//   node --env-file=.env scripts/gta-largo.mjs --dry-run --still 30 → un cuadro en PNG
import fs from 'node:fs';
import path from 'node:path';
import { parseCli } from './lib/cli.mjs';
import { setupNode, ROOT } from './lib/node-env.mjs';
import { renderLargo, renderMiniatura } from './lib/largo-video.mjs';
import { subirYouTube, youtubeReady, ponerMiniatura } from './lib/youtube.mjs';
import { telegram } from './lib/control.mjs';
import { mandarVideoATelegram } from './lib/tg-video.mjs';
import { fotoStock, guardarStock } from './lib/stock.mjs';
import { hayArte, HORIZONTALES, POSTER, CREDITO_GTA } from './lib/gta-arte.mjs';

const o = parseCli({ 'dry-run': { type: 'boolean', default: false }, still: { type: 'string' } });
const fx = setupNode(), emojiFont = fx.emoji ? `"${fx.emoji}"` : '';
const H = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gta-historia.json'), 'utf8')).capitulos;
const INTRIGAS = [
  'Y lo que vino después cambió los videojuegos para siempre.',
  'Pero el salto más grande todavía estaba por llegar.',
  'Y entonces llegó el juego que todos recuerdan.',
  'Lo siguiente rompió todos los récords.',
  'Y después… trece años de espera.'
];

const escenas = [{
  tipo: 'gancho', dur: 6, tema: 'gta', titulo: 'De un juego en 2D a GTA VI: la historia completa de Grand Theft Auto',
  iconos: ['🕹️', '🌴', '🌉', '🗽', '💵', '🔥'], sub: 'Sale el 19 de noviembre · ¿Cuál fue tu primer GTA?', capitulo: 'Intro',
  voz: 'Antes de que salga GTA VI, repasemos toda la historia de Grand Theft Auto: de un juego en dos dimensiones hecho en Escocia, a la saga más vendida de su tiempo. Y quédate hasta el final, porque te voy a preguntar cuál fue tu primer GTA.'
}];
H.forEach((c, k) => {
  if (k > 0 && k % 2 === 0) { const t = INTRIGAS[(k / 2 - 1) % INTRIGAS.length]; escenas.push({ tipo: 'intriga', dur: 3.5, tema: 'gta', texto: t, pista: c.icono, voz: t }); }
  escenas.push({ tipo: 'capitulo', dur: 3.6, tema: 'gta', num: c.anio, total: H.length, idx: k + 1, titulo: c.titulo, icono: c.icono, etiqueta: `CAPÍTULO ${k + 1} DE ${H.length}`, capitulo: `${c.anio} · ${c.titulo}`, voz: `${c.anio}: ${c.titulo}.` });
  for (const d of c.datos) escenas.push({ tipo: 'dato', dur: 6.5, tema: 'gta', texto: d.dato, icono: c.icono, etiqueta: c.titulo.toUpperCase(), voz: d.dato });
});
escenas.push({ tipo: 'cierre', dur: 6, tema: 'gta', titulo: '¿Cuál fue tu primer GTA?', sub: 'Escríbelo en los comentarios · Suscríbete a Potter Play', capitulo: 'Cierre', voz: '¿Y tú? ¿Cuál fue tu primer GTA? Escríbelo en los comentarios, y suscríbete a Potter Play para no perderte nada del lanzamiento de GTA VI.' });

// Fondos: el arte oficial de GTA VI (con crédito) en la intro, el capítulo de GTA VI y el cierre; en los juegos de antes,
// fotos reales de la ciudad en la que se inspiran (Pixabay)
const CIUDAD = { 1997: 'retro arcade neon', 1999: 'city night neon rain', 2001: 'new york city night street', 2002: 'miami ocean drive neon night', 2004: 'los angeles sunset palm trees', 2006: 'miami beach sunset', 2008: 'new york skyline night bridge', 2013: 'los angeles hollywood hills city', 2026: '' };
let anio = null, k = 0;
const arte = hayArte() ? [...HORIZONTALES, POSTER] : [];
for (const e of escenas) {
  if (e.tipo === 'capitulo') anio = e.num;
  const deGta6 = e.tipo === 'gancho' || e.tipo === 'cierre' || anio === '2026';
  if (deGta6 && arte.length) { e.imagen = arte[k++ % arte.length]; e.credito = CREDITO_GTA; }
  else if (anio && CIUDAD[anio]) { const f = await fotoStock(CIUDAD[anio]).catch(() => null); if (f) e.imagen = f.archivo; }
}
guardarStock();
const titulo = 'La historia de GTA antes de GTA VI', mini = 'DE 1997 A GTA VI';
const outDir = path.join(ROOT, 'out'); fs.mkdirSync(outDir, { recursive: true });
const nombre = `gta-historia-${new Date().toISOString().slice(0, 10)}`;
if (o.still != null) { const png = path.join(outDir, `${nombre}-${o.still}s.png`); await renderLargo({ escenas, out: png, emojiFont, still: o.still }); console.log(png); process.exit(0); }

const video = path.join(outDir, `${nombre}.mp4`), miniatura = path.join(outDir, `${nombre}-miniatura.jpg`);
const r = await renderLargo({ escenas, out: video, emojiFont, estilo: 'synthwave', semilla: 1997 });
await renderMiniatura({ out: miniatura, palabras: mini, iconos: ['🌴', '🕹️', '💵', '🔥', '🌉'], tema: 'gta', emojiFont });
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const capitulos = r.capitulos.map((c) => `${mmss(c.t)} ${c.titulo}`).join('\n');
const fuentes = [...new Set(H.flatMap((c) => c.datos.map((d) => d.fuente)))];
const descripcion = `🎮 Antes de que salga GTA VI (19 de noviembre de 2026), repasamos toda la historia de Grand Theft Auto: de 1997 a hoy.\n\nCapítulos:\n${capitulos}\n\n💬 ¿Cuál fue tu primer GTA? Escríbelo en los comentarios.\n🔔 Suscríbete a Potter Play: todo el lanzamiento de GTA VI, datos y retos cada día.\n\nFuentes:\n${fuentes.join('\n')}\n\n#gta6 #gtavi #gta #historia #videojuegos #rockstar #potterplay`;
const meta = { kind: 'youtube-largo', title: titulo, miniatura: mini, file: path.basename(video), duration: r.duration, post: { text: descripcion }, createdAt: new Date().toISOString() };
console.error(`${titulo} · ${(r.duration / 60).toFixed(1)} min\n${capitulos}`);

if (!o['dry-run'] && youtubeReady()) {
  try {
    meta.youtube = await subirYouTube({ file: video, titulo, descripcion, categoria: '20', etiquetas: ['gta 6', 'gta vi', 'historia de gta', 'grand theft auto', 'rockstar games', 'vice city', 'san andreas', 'gta v', 'videojuegos', 'potter play'] });
    console.error(`YouTube: subido como privado · ${meta.youtube.studio}`);
    try { await ponerMiniatura(meta.youtube.id, miniatura); meta.youtube.miniatura = 'ok'; }
    catch (e) { meta.youtube.miniatura = e.message; console.error(`Aviso: miniatura: ${e.message}`); }
    await telegram(`📺 <b>${titulo}</b> (${(r.duration / 60).toFixed(1)} min) quedó subido como <b>privado</b> en YouTube.\nRevísalo y publícalo desde Studio: ${meta.youtube.studio}`).catch(() => {});
  } catch (e) { meta.youtube = { status: 'error', error: e.message }; console.error(`Aviso: YouTube: ${e.message}`); }
}
const aviso = `📺 <b>${titulo}</b> · ${(r.duration / 60).toFixed(1)} min` + (meta.youtube?.studio ? `\nSubido como privado: ${meta.youtube.studio}` : o['dry-run'] ? '\n(prueba: no se subió a YouTube)' : '');
console.error(`Telegram: ${(await mandarVideoATelegram(video, aviso, { duracion: r.duration })) ? 'enviado' : 'no se pudo enviar'}`);
fs.writeFileSync(video.replace(/\.mp4$/, '.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(JSON.stringify({ video, miniatura, duration: r.duration, youtube: meta.youtube }, null, 2));
