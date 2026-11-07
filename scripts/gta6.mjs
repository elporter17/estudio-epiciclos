#!/usr/bin/env node
// Especial GTA VI (sin IA, sin imágenes del juego): un Reel diario de cuenta atrás «Faltan N días» con 4 curiosidades
// confirmadas (data/gta6.json, con su fuente) hasta el lanzamiento, y el día del lanzamiento un especial con lo que hay
// que saber para jugar. Va a Facebook e Instagram (Reel + historia) y a TikTok como borrador (copia sin sonido).
// Después del lanzamiento no hace nada. Historial: data/gta6-historial.json (estado de Actions).
//   node scripts/gta6.mjs --dry-run            (solo el video, en out/)
//   node scripts/gta6.mjs --solo-lanzamiento   (corrida de la mañana: solo publica el día del lanzamiento)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { parseCli } from './lib/cli.mjs';
import { setupNode, ROOT } from './lib/node-env.mjs';
import { TEMAS } from './lib/tarjetas.mjs';
import { renderQuiz } from './lib/quiz-video.mjs';
import { publicarEnlace } from './lib/video-link.mjs';
import { publishReel, publishStory, facebookReady } from './facebook.mjs';
import { publishInstagramSeguro, instagramReady } from './instagram.mjs';
import { publishVideo } from './publish.mjs';
import { logUpload } from './tiktok-status.mjs';
import { subirYouTube, youtubeReady } from './lib/youtube.mjs';
import { ponerFondos, guardarStock } from './lib/stock.mjs';
import { registrarRespuesta } from './lib/respuestas.mjs';

const o = parseCli({ 'dry-run': { type: 'boolean', default: false }, 'solo-lanzamiento': { type: 'boolean', default: false }, tiktok: { type: 'string', default: 'draft' }, facebook: { type: 'string', default: 'si' }, instagram: { type: 'string', default: 'si' }, youtube: { type: 'string', default: 'si' }, hoy: { type: 'string' } });
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gta6.json'), 'utf8'));
const HIST = path.join(ROOT, 'data', 'gta6-historial.json');
const hist = (() => { try { return JSON.parse(fs.readFileSync(HIST, 'utf8')); } catch { return { usados: [] }; } })();
const mezclar = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

// Días que faltan, contados en hora de Honduras
const hoy = o.hoy || new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
const faltan = Math.round((Date.parse(D.lanzamiento.fecha) - Date.parse(hoy)) / 864e5);
if (faltan < 0) { console.log(`GTA VI ya salió (${D.lanzamiento.fecha}): no hay nada que publicar.`); process.exit(0); }
if (o['solo-lanzamiento'] && faltan !== 0) { console.log(`Faltan ${faltan} días: la corrida de la mañana solo publica el día del lanzamiento.`); process.exit(0); }
// El especial sale una sola vez (en la corrida de la mañana del lanzamiento); la de la noche ya no lo repite
if (faltan === 0 && hist.lanzamiento && !o['dry-run']) { console.log('El especial del lanzamiento ya se publicó.'); process.exit(0); }

const INTRO = 2.8, DATO = 6.3, CIERRE = 3.2, son = [[0, 'whoosh'], [0.05, 'pop'], [0.23, 'pop'], [0.41, 'pop']];
const plataformas = D.lanzamiento.plataformas.join(', ');
let datos, escenas, texto, titulo;
if (faltan > 0) {
  // Los últimos 37 cuentan como usados: con 45 datos siempre quedan 8 sin repetir del día anterior
  const usados = new Set(hist.usados.slice(-(D.datos.length - 8)));
  datos = mezclar(D.datos.filter((d) => !usados.has(d.id))).concat(mezclar(D.datos)).filter((d, i, a) => a.indexOf(d) === i).slice(0, 8);
  titulo = `Faltan ${faltan} días para GTA VI`;
  escenas = [
    { tipo: 'intro', dur: INTRO, tema: 'gta', portada: true, consulta: 'miami skyline night aerial', sonidos: son, iconos: ['🌴', '🏙️', '🚗', '🌅'],
      lineas: [{ texto: 'FALTAN', size: 100 }, { texto: `${faltan} ${faltan === 1 ? 'DÍA' : 'DÍAS'}`, size: 190, color: TEMAS.gta.acento }, { texto: 'PARA GTA VI', size: 110 }] },
    ...datos.map((d, i) => ({ tipo: 'dato', dur: DATO, tema: 'gta', idx: i, total: datos.length, n: i + 1, icono: d.icono, texto: d.dato, consulta: d.foto || 'miami beach palm trees', sonidos: [[0, 'whoosh'], [0.05, 'pop']] })),
    { tipo: 'cierre', dur: CIERRE, tema: 'gta', consulta: 'miami sunset palm trees', sonidos: [[0, 'final']],
      lineas: [{ texto: 'SALE EL 19 DE NOVIEMBRE', size: 96, color: TEMAS.gta.acento }, { texto: `En ${plataformas}`, size: 60 }, { texto: 'Cada día, más datos en Potter Play', size: 50, color: 'rgba(255,255,255,0.8)' }] }
  ];
  texto = `🌴 ${titulo}. Mientras llega el 19 de noviembre, ${datos.length} datos que quizá no sabías:\n\n${datos.map((d, i) => `${i + 1}. ${d.dato}`).join('\n')}\n\n¿Cuál te sorprendió más?\n\n#gta6 #gtavi #gta #videojuegos #gaming #rockstar #reels #potterplay`;
} else {
  datos = D.especial;
  titulo = '¡Hoy sale GTA VI!';
  escenas = [
    { tipo: 'intro', dur: INTRO, tema: 'gta', portada: true, consulta: 'miami ocean drive neon night', sonidos: son, iconos: ['🎮', '🌴', '🔥', '🏙️'],
      lineas: [{ texto: '¡HOY SALE', size: 130 }, { texto: 'GTA VI!', size: 200, color: TEMAS.gta.acento }, { texto: 'Lo que tienes que saber', size: 60, color: 'rgba(255,255,255,0.85)' }] },
    ...datos.map((d, i) => ({ tipo: 'dato', dur: DATO, tema: 'gta', idx: i, total: datos.length, n: i + 1, icono: d.icono, texto: d.dato, consulta: d.foto || 'miami beach palm trees', sonidos: [[0, 'whoosh'], [0.05, 'pop']] })),
    { tipo: 'cierre', dur: CIERRE, tema: 'gta', consulta: 'miami night highway lights', sonidos: [[0, 'final']],
      lineas: [{ texto: '¿YA LO TIENES?', size: 120, color: TEMAS.gta.acento }, { texto: `Disponible en ${plataformas}`, size: 60 }, { texto: 'Sigue a Potter Play para más', size: 50, color: 'rgba(255,255,255,0.8)' }] }
  ];
  texto = `🎮 ${titulo} Llegó el día: esto es lo que tienes que saber para jugar.\n\n${datos.map((d, i) => `${i + 1}. ${d.dato}`).join('\n')}\n\n¿Ya lo tienes o lo vas a esperar?\n\n#gta6 #gtavi #gta #videojuegos #gaming #lanzamiento #reels #potterplay`;
}

const fondos = await ponerFondos(escenas);
if (fondos) console.error(`Videos reales: ${fondos}`);
guardarStock();
const fx = setupNode(), outDir = path.join(ROOT, 'out'); fs.mkdirSync(outDir, { recursive: true });
const video = path.join(outDir, `gta6-${faltan > 0 ? `faltan-${faltan}` : 'lanzamiento'}.mp4`);
// Synthwave: el ambiente de Miami de noche
const r = await renderQuiz({ escenas, out: video, emojiFont: fx.emoji ? `"${fx.emoji}"` : '', estilo: 'synthwave', semilla: faltan * 131, outIG: video.replace(/\.mp4$/, '-ig.mp4') });
console.error(`${titulo} · ${r.duration.toFixed(1)} s · ${video}`);
const meta = { kind: 'gta6', title: titulo, file: path.basename(video), duration: r.duration, post: { text: texto }, createdAt: new Date().toISOString() };

if (!o['dry-run']) {
  const link = await publicarEnlace(video).catch(() => null);
  if (link) { meta.videoUrl = link.url; meta.videoDownload = link.downloadUrl; }
  if (o.facebook !== 'no' && facebookReady()) {
    try { meta.facebook = await publishReel({ video, description: texto }); } catch (e) { meta.facebook = { status: 'error', error: e.message }; }
    registrarRespuesta({ red: 'facebook', id: meta.facebook?.video_id, clave: { modo: 'charla' }, titulo });
    try { meta.facebookStory = await publishStory({ video }); } catch (e) { meta.facebookStory = { status: 'error', error: e.message }; }
  }
  if (o.instagram !== 'no' && meta.videoUrl && await instagramReady()) {
    // Instagram: el mismo video que Facebook, con nuestra música synthwave. Las canciones en tendencia de Meta salían al
    // azar, no combinaban y tapaban la narración (2026-11-06)
      meta.instagram = await publishInstagramSeguro({ tipo: 'reel', url: meta.videoUrl, caption: texto });
      registrarRespuesta({ red: 'instagram', id: meta.instagram.media_id, clave: { modo: 'charla' }, titulo });
    meta.instagramStory = await publishInstagramSeguro({ tipo: 'historia', url: meta.videoUrl });
  }
  // TikTok: borrador sin sonido (ahí se le pone una canción del momento); la descripción llega por el resumen
  if (o.tiktok !== 'no') {
    const mudo = video.replace(/\.mp4$/, '-tiktok.mp4');
    const m = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', video, '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-shortest', '-movflags', '+faststart', mudo]);
    if (m.status === 0) {
      fs.writeFileSync(mudo.replace(/\.mp4$/, '.json'), JSON.stringify({ ...meta, file: path.basename(mudo) }, null, 2) + '\n');
      try { meta.tiktok = [await publishVideo({ video: mudo, mode: o.tiktok, coverMs: 0 })]; }
      catch (e) { meta.tiktok = [{ mode: o.tiktok, status: /spam_risk|pending/i.test(e.message) ? 'LIMIT' : 'error', fail_reason: e.message }]; console.error(`Aviso: TikTok: ${e.message}`); }
      logUpload({ at: new Date().toISOString(), title: titulo, publish_id: meta.tiktok[0]?.publish_id || null, status: meta.tiktok[0]?.status, run: process.env.GITHUB_RUN_ID || null });
      fs.rmSync(mudo.replace(/\.mp4$/, '.json'), { force: true });
    }
  }
  // YouTube: el mismo video como Short PRIVADO (se publica a mano en Studio; el aviso llega por Telegram)
  if (o.youtube !== 'no' && youtubeReady()) {
    try { meta.youtube = await subirYouTube({ file: video, titulo: `${titulo} #Shorts`, descripcion: `${texto}

🔔 Suscríbete a Potter Play: la cuenta atrás de GTA VI todos los días.`, etiquetas: ['gta 6', 'gta vi', 'grand theft auto', 'rockstar', 'videojuegos', 'shorts', 'potter play'] }); console.error(`YouTube: subido como privado · ${meta.youtube.studio}`); }
    catch (e) { meta.youtube = { status: 'error', error: e.message }; console.error(`Aviso: YouTube: ${e.message}`); }
  }
  hist.usados = [...hist.usados, ...datos.map((d) => d.id)].slice(-200);
  if (faltan === 0) hist.lanzamiento = new Date().toISOString();
  fs.writeFileSync(HIST, JSON.stringify(hist, null, 2) + '\n');
}
fs.writeFileSync(video.replace(/\.mp4$/, '.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(JSON.stringify({ video, faltan, facebook: meta.facebook?.status, instagram: meta.instagram?.status, tiktok: meta.tiktok?.[0]?.status }, null, 2));
