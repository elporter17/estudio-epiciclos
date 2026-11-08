#!/usr/bin/env node
// Videos desde una idea (formato «Idea»; el 3D de datos de la cola no se toca). El borrador lo arma el bot de Telegram
// (scripts/lib/constructor.mjs: Wikipedia + reglas) y queda en el almacén; esto corre en GitHub Actions (ideas.yml):
//   --render <id>     narra, renderiza con Remotion (composición «Idea»), sube el video y te lo manda por Telegram
//                     con botones para publicarlo o descartarlo
//   --publicar <id>   lo publica en las redes elegidas (--redes fb,ig,tt,yt): Reel en FB e IG, borrador en TikTok,
//                     Short privado en YouTube, con sus fuentes en el aviso
//   --guion <archivo> renderiza un guion local (prueba), sin almacén ni Telegram
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import './lib/env-file.mjs';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';
import { publicarEnlace } from './lib/video-link.mjs';
import { leerIdea, guardarIdea, telegram, tgApi, esc } from './lib/control.mjs';
import { aGuion } from './lib/constructor.mjs';
import { textoPost, textoFuentes, avisoExtra } from './lib/video3d-cola.mjs';

const o = parseCli({ render: { type: 'string' }, publicar: { type: 'string' }, guion: { type: 'string' }, redes: { type: 'string', default: 'fb,ig,tt,yt' } });
const correr = (cmd, args, cwd = ROOT) => { const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && cmd === 'npx' }); if (r.status !== 0) throw new Error(`Falló: ${cmd} ${args.slice(0, 3).join(' ')}…`); };

// Narra, renderiza y normaliza el volumen: devuelve el MP4 final
function renderizar(g) {
  const dir = path.join(ROOT, 'video3d', 'guiones', 'ideas'); fs.mkdirSync(dir, { recursive: true });
  const archivo = path.join(dir, `${g.id}.json`); fs.writeFileSync(archivo, JSON.stringify(g, null, 2) + '\n');
  correr(process.execPath, [path.join(ROOT, 'scripts', 'video3d-preparar.mjs'), '--guion', archivo]);
  const crudo = path.join(ROOT, 'video3d', 'out', `${g.id}-crudo.mp4`), final = path.join(ROOT, 'out', `${g.id}.mp4`);
  fs.mkdirSync(path.dirname(crudo), { recursive: true }); fs.mkdirSync(path.dirname(final), { recursive: true });
  const gl = process.env.VIDEO3D_GL || (process.env.GITHUB_ACTIONS ? 'swangle' : 'angle');
  correr('npx', ['remotion', 'render', 'src/index.jsx', 'Idea', crudo, `--gl=${gl}`, `--concurrency=${process.env.VIDEO3D_HILOS || 4}`, '--codec=h264', '--crf=20', '--log=error'], path.join(ROOT, 'video3d'));
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', crudo, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', final]);
  if (r.status !== 0) throw new Error(`ffmpeg: ${String(r.stderr).slice(-300)}`);
  return final;
}
// Manda el video por Telegram (hasta 50 MB) con sus botones
async function mandarVideo(file, caption, teclado) {
  const tg = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID; if (!tg || !chat) return false;
  const f = new FormData();
  f.set('chat_id', chat); f.set('caption', caption.slice(0, 1000)); f.set('parse_mode', 'HTML'); f.set('supports_streaming', 'true');
  if (teclado) f.set('reply_markup', JSON.stringify(teclado));
  f.set('video', new Blob([fs.readFileSync(file)], { type: 'video/mp4' }), path.basename(file));
  const r = await fetch(`https://api.telegram.org/bot${tg}/sendVideo`, { method: 'POST', body: f }).then((x) => x.json()).catch((e) => ({ ok: false, description: e.message }));
  if (!r.ok) console.error(`Telegram: ${r.description}`);
  return r.ok;
}

if (o.guion) { console.log(renderizar(JSON.parse(fs.readFileSync(path.resolve(o.guion), 'utf8')))); process.exit(0); }

if (o.render) {
  // «archivo:video3d/guiones/ideas/x.json»: un guion escrito a mano en el repo; se guarda como idea para que funcionen
  // los botones de publicar
  let b;
  if (o.render.startsWith('archivo:')) {
    const g = JSON.parse(fs.readFileSync(path.resolve(ROOT, o.render.slice(8)), 'utf8')), id = Date.now().toString(36).slice(-6);
    b = await guardarIdea(id, { idea: g.titulo, tema: g.titulo, url: g.fuentes?.find((x) => x.url)?.url || '', guion: { ...g, id: `idea-${g.id}-${id}` }, estado: 'generando' });
  } else b = await leerIdea(o.render);
  if (!b) throw new Error(`No encontré la idea ${o.render}`);
  const g = b.guion || aGuion(b);
  try {
    const ti = Date.now(), video = renderizar(g), enlace = await publicarEnlace(video, { days: 7 });
    const render = JSON.parse(fs.readFileSync(path.join(ROOT, 'video3d', 'public', 'render.json'), 'utf8'));
    await guardarIdea(b.id, { ...b, guion: g, estado: 'listo', video: enlace, duracion: render.duracion });
    const teclado = { inline_keyboard: [[{ text: '✅ Publicar', callback_data: `ip|${b.id}` }, { text: '🗑️ Descartar', callback_data: `ix|${b.id}` }]] };
    const ok = await mandarVideo(video, `🎬 <b>${esc(g.titulo)}</b> · ${Math.round(render.duracion)} s (listo en ${Math.round((Date.now() - ti) / 60000)} min)\nDe tu idea «${esc(b.idea)}» · fuente: <a href="${esc(b.url)}">Wikipedia</a>\n\n¿Lo publico?`, teclado);
    if (!ok) await telegram(`🎬 <b>${esc(g.titulo)}</b> está listo, pero no pude mandarte el video por aquí.\n<a href="${esc(enlace.url)}">Míralo aquí</a> y publícalo desde «💡 Ideas».`, { teclado });
    console.log(JSON.stringify({ id: b.id, video: enlace.url, duracion: render.duracion }));
  } catch (e) {
    await guardarIdea(b.id, { ...b, guion: g, estado: 'error', error: e.message });
    await telegram(`⚠️ No pude hacer el video de tu idea «${esc(b.idea)}»: ${esc(e.message.slice(0, 300))}`);
    throw e;
  }
}

if (o.publicar) {
  const b = await leerIdea(o.publicar); if (!b?.video) throw new Error(`La idea ${o.publicar} no tiene video listo`);
  const g = b.guion, redes = o.redes.split(',').filter(Boolean), texto = textoPost(g);
  const { publishReel, facebookReady } = await import('./facebook.mjs');
  const { publishInstagramSeguro, instagramReady } = await import('./instagram.mjs');
  const { publishVideo } = await import('./publish.mjs');
  const { logUpload } = await import('./tiktok-status.mjs');
  const { subirYouTube, youtubeReady } = await import('./lib/youtube.mjs');
  const { registrarRespuesta } = await import('./lib/respuestas.mjs');
  const video = path.join(ROOT, 'out', `${b.id}.mp4`); fs.mkdirSync(path.dirname(video), { recursive: true });
  if (!fs.existsSync(video)) { const r = await fetch(b.video.download || b.video.url); if (!r.ok) throw new Error(`No se pudo bajar el video (${r.status})`); fs.writeFileSync(video, Buffer.from(await r.arrayBuffer())); }
  const meta = { kind: 'idea', title: g.titulo, file: path.basename(video), duration: b.duracion, videoUrl: b.video.url, videoDownload: b.video.download, post: { text: texto }, createdAt: new Date().toISOString() };
  if (redes.includes('fb') && facebookReady()) { try { meta.facebook = await publishReel({ video, description: texto }); } catch (e) { meta.facebook = { status: 'error', error: e.message }; } registrarRespuesta({ red: 'facebook', id: meta.facebook?.video_id, clave: { modo: 'charla' }, titulo: g.titulo }); }
  if (redes.includes('ig') && await instagramReady()) { meta.instagram = await publishInstagramSeguro({ tipo: 'reel', url: b.video.url, caption: texto }); registrarRespuesta({ red: 'instagram', id: meta.instagram.media_id, clave: { modo: 'charla' }, titulo: g.titulo }); }
  if (redes.includes('tt')) {
    try { meta.tiktok = [await publishVideo({ video, mode: 'draft', coverMs: 0 })]; }
    catch (e) { meta.tiktok = [{ mode: 'draft', status: /spam_risk|pending/i.test(e.message) ? 'LIMIT' : 'error', fail_reason: e.message }]; }
    logUpload({ at: new Date().toISOString(), title: g.titulo, publish_id: meta.tiktok[0]?.publish_id || null, status: meta.tiktok[0]?.status, run: process.env.GITHUB_RUN_ID || null });
  }
  if (redes.includes('yt') && youtubeReady()) {
    try { meta.youtube = await subirYouTube({ file: video, titulo: `${g.titulo} #Shorts`, descripcion: `${texto}\n\nFuente: ${b.url}\n\n🔔 Suscríbete a Potter Play.`, etiquetas: ['datos curiosos', 'shorts', 'potter play'] }); }
    catch (e) { meta.youtube = { status: 'error', error: e.message }; }
  }
  fs.writeFileSync(path.join(ROOT, 'out', `${b.id}.json`), JSON.stringify(meta, null, 2) + '\n');
  avisoExtra(`✅ Publiqué tu idea «${g.titulo}» en ${redes.join(', ')}.\n${textoFuentes(g)}`);
  await guardarIdea(b.id, { ...b, estado: 'publicado', redes, publicadoEl: new Date().toISOString() });
  console.log(JSON.stringify({ titulo: g.titulo, facebook: meta.facebook?.status, instagram: meta.instagram?.status, tiktok: meta.tiktok?.[0]?.status, youtube: meta.youtube?.estado || meta.youtube?.error }, null, 2));
}
