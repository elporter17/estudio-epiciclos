#!/usr/bin/env node
// Guías de GTA VI en video (después del lanzamiento; la cuenta atrás de gta6.mjs ya terminó): un Reel narrado por guía
// de data/gta6-guias.json (para empezar, dinero, walkthrough sin spoilers, secretos, errores…), con un paso por escena.
// Fondo de cada paso: un clip propio de la PS5 si existe (assets/gta6/clips/<clip>, ignorado por git; se usa solo la
// imagen, nunca el audio del juego: la radio tiene música con licencia) y si no, el arte oficial de Rockstar con crédito.
// Nada de clips de otros canales ni tráilers (Content ID). Va a Facebook e Instagram (Reel + historia), a TikTok como
// borrador sin sonido y a YouTube como Short privado, igual que gta6.mjs. Historial: data/gta6-guias-historial.json.
//   node scripts/gta6-guias.mjs --lista                  (guías y si tienen clips propios)
//   node scripts/gta6-guias.mjs --dry-run [--id dinero-temprano]   (solo el video, en out/)
import { MARCA } from './lib/marca.mjs';
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
import { fondosVerticales, CIERRE_GTA, CREDITO_GTA, hayArte } from './lib/gta-arte.mjs';

const o = parseCli({ id: { type: 'string' }, lista: { type: 'boolean', default: false }, 'dry-run': { type: 'boolean', default: false }, voz: { type: 'string', default: 'si' }, tiktok: { type: 'string', default: 'draft' }, facebook: { type: 'string', default: 'si' }, instagram: { type: 'string', default: 'si' }, youtube: { type: 'string', default: 'si' } });
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gta6-guias.json'), 'utf8'));
const HIST = path.join(ROOT, 'data', 'gta6-guias-historial.json');
const hist = (() => { try { return JSON.parse(fs.readFileSync(HIST, 'utf8')); } catch { return { hechas: [] }; } })();
const CLIPS = path.join(ROOT, 'assets', 'gta6', 'clips');
const CREDITO_PROPIO = `Captura: ${MARCA}`;
const clipDe = (p) => p.clip && fs.existsSync(path.join(CLIPS, p.clip)) ? path.join(CLIPS, p.clip) : null;

if (o.lista) {
  for (const g of D.guias) {
    const propios = g.pasos.filter(clipDe).length, hecha = hist.hechas.find((h) => h.id === g.id);
    console.log(`${g.id.padEnd(24)} ${String(g.pasos.length).padStart(2)} pasos · clips propios ${propios}/${g.pasos.length}${hecha ? ` · publicada ${hecha.at.slice(0, 10)}` : ''}`);
  }
  process.exit(0);
}

// La guía pedida, o la primera que falte (en el orden del archivo); cuando todas salieron, la más antigua
const guia = o.id ? D.guias.find((g) => g.id === o.id)
  : D.guias.find((g) => !hist.hechas.some((h) => h.id === g.id)) || [...D.guias].sort((a, b) => (hist.hechas.find((h) => h.id === a.id)?.at || '').localeCompare(hist.hechas.find((h) => h.id === b.id)?.at || ''))[0];
if (!guia) { console.error(o.id ? `No existe la guía «${o.id}».` : 'No hay guías.'); process.exit(1); }
const ETIQUETA = { principiantes: 'PARA EMPEZAR', dinero: 'DINERO', mision: 'WALKTHROUGH', secretos: 'SECRETO', errores: 'NO HAGAS ESTO', mapa: 'EL MAPA', datos: 'DATO' };

// Escenas: portada (gancho), un paso por escena y cierre. Cada paso narra «Título. Texto» (el consejo solo se lee en pantalla, para no pasar de 60 s)
const arte = hayArte() ? fondosVerticales(guia.pasos.length + 1) : [];
const fondo = (p, i) => {
  const clip = clipDe(p);
  if (clip) return { fondo: clip, fondoDesde: p.desde || 0, credito: CREDITO_PROPIO };
  return arte[i] ? { imagen: arte[i], credito: CREDITO_GTA } : {};
};
const tema = 'gtaguia', son = [[0, 'whoosh'], [0.05, 'pop']], voz = o.voz !== 'no';
const escenas = [
  { tipo: 'intro', dur: 3.4, tema, portada: true, y0: 470, ...fondo(guia.portada || {}, 0), sonidos: [[0, 'whoosh'], [0.05, 'pop'], [0.23, 'pop']],
    lineas: guia.gancho.map((l, i) => ({ texto: l, size: i === 1 ? 150 : 96, color: i === 1 ? TEMAS[tema].acento : '#fff' })).concat([{ texto: `${guia.pasos.length} pasos · sin spoilers`, size: 50, color: 'rgba(255,255,255,0.85)' }]),
    ...(voz ? { voz: guia.vozIntro || guia.gancho.join(' ') } : {}) },
  ...guia.pasos.map((p, i) => ({ tipo: 'paso', dur: 7, tema, idx: i, total: guia.pasos.length, n: i + 1, etiqueta: p.etiqueta || ETIQUETA[guia.categoria], titulo: p.titulo, texto: p.texto, consejo: p.consejo,
    ...fondo(p, i + 1), sonidos: son, ...(voz ? { voz: p.voz || `${p.titulo}. ${p.texto}` } : {}) })),
  { tipo: 'cierre', dur: 3.4, tema, imagen: CIERRE_GTA, credito: CREDITO_GTA, sonidos: [[0, 'final']],
    lineas: [{ texto: guia.cierre || 'GUÍA COMPLETA', size: 104, color: TEMAS[tema].acento }, { texto: guia.siguiente ? `Siguiente: ${guia.siguiente}` : 'Mañana, otra guía', size: 58 }, { texto: `Sigue a ${MARCA}`, size: 50, color: 'rgba(255,255,255,0.85)' }],
    ...(voz ? { voz: guia.siguiente ? `La siguiente guía: ${guia.siguiente}. Sigue a ${MARCA}.` : `Sigue a ${MARCA} para la siguiente guía.` } : {}) }
];
for (const e of escenas) if (!e.imagen && !e.fondo) delete e.credito;

const fx = setupNode(), outDir = path.join(ROOT, 'out'); fs.mkdirSync(outDir, { recursive: true });
const video = path.join(outDir, `gta6-guia-${guia.id}.mp4`);
const propios = guia.pasos.filter(clipDe).length;
console.error(`Guía «${guia.titulo}» · ${guia.pasos.length} pasos · clips propios ${propios}/${guia.pasos.length}`);
const r = await renderQuiz({ escenas, out: video, emojiFont: fx.emoji ? `"${fx.emoji}"` : '', estilo: 'synthwave', semilla: guia.id.length * 977, outIG: video.replace(/\.mp4$/, '-ig.mp4'), voz });
console.error(`${guia.titulo} · ${r.duration.toFixed(1)} s${r.narrado ? ' · narrado' : ''} · ${video}`);

const tags = ['#gta6', '#gtavi', '#guiagta6', '#gta', '#videojuegos', '#gaming', '#ps5', '#potterplay'];
let texto = `${guia.emoji || '🎮'} ${guia.titulo} (sin spoilers)\n\n${guia.pasos.map((p, i) => `${i + 1}. ${p.titulo}: ${p.texto}`).join('\n')}\n\n${guia.siguiente ? `Siguiente guía: ${guia.siguiente}.\n\n` : ''}${tags.join(' ')}`;
const meta = { kind: 'gta6-guia', id: guia.id, title: guia.titulo, file: path.basename(video), duration: r.duration, clipsPropios: propios, post: { text: texto }, fuentes: guia.fuentes, createdAt: new Date().toISOString() };

if (!o['dry-run']) {
  const link = await publicarEnlace(video).catch(() => null);
  if (link) { meta.videoUrl = link.url; meta.videoDownload = link.downloadUrl; }
  if (o.facebook !== 'no' && facebookReady()) {
    try { meta.facebook = await publishReel({ video, description: texto }); } catch (e) { meta.facebook = { status: 'error', error: e.message }; }
    try { meta.facebookStory = await publishStory({ video }); } catch (e) { meta.facebookStory = { status: 'error', error: e.message }; }
  }
  if (o.instagram !== 'no' && meta.videoUrl && await instagramReady()) {
    meta.instagram = await publishInstagramSeguro({ tipo: 'reel', url: meta.videoUrl, caption: texto });
    meta.instagramStory = await publishInstagramSeguro({ tipo: 'historia', url: meta.videoUrl });
  }
  // TikTok: borrador sin sonido (ahí se le pone una canción del momento)
  if (o.tiktok !== 'no') {
    const mudo = video.replace(/\.mp4$/, '-tiktok.mp4');
    const m = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', r.outIG || video, '-c', 'copy', '-movflags', '+faststart', mudo]);
    if (m.status === 0) {
      try { meta.tiktok = [await publishVideo({ video: mudo, mode: o.tiktok, coverMs: 0 })]; }
      catch (e) { meta.tiktok = [{ mode: o.tiktok, status: /spam_risk|pending/i.test(e.message) ? 'LIMIT' : 'error', fail_reason: e.message }]; console.error(`Aviso: TikTok: ${e.message}`); }
      logUpload({ at: new Date().toISOString(), title: guia.titulo, publish_id: meta.tiktok[0]?.publish_id || null, status: meta.tiktok[0]?.status, run: process.env.GITHUB_RUN_ID || null });
    }
  }
  if (o.youtube !== 'no' && youtubeReady()) {
    try { meta.youtube = await subirYouTube({ file: video, titulo: `${guia.titulo} #Shorts`, descripcion: `${texto}\n\n🔔 Suscríbete a ${MARCA}: guías de GTA VI sin spoilers.`, etiquetas: ['gta 6', 'gta vi', 'guia gta 6', 'grand theft auto', 'rockstar', 'ps5', 'shorts', 'potter play'] }); }
    catch (e) { meta.youtube = { status: 'error', error: e.message }; console.error(`Aviso: YouTube: ${e.message}`); }
  }
  hist.hechas = [...hist.hechas.filter((h) => h.id !== guia.id), { id: guia.id, at: new Date().toISOString() }];
  fs.writeFileSync(HIST, JSON.stringify(hist, null, 2) + '\n');
}
fs.writeFileSync(video.replace(/\.mp4$/, '.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(JSON.stringify({ video, guia: guia.id, duracion: r.duration, clipsPropios: propios, facebook: meta.facebook?.status, instagram: meta.instagram?.status, tiktok: meta.tiktok?.[0]?.status }, null, 2));
