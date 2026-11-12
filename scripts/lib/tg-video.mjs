// Manda un video largo a tu Telegram para revisarlo (sendVideo). Telegram acepta hasta 50 MB a los bots: si el video pesa
// más, se manda una copia 720p comprimida (calidad suficiente para revisar). Lo usan los videos largos (ysi, gta-largo,
// youtube-largo) cada vez que se generan, con o sin subida a YouTube.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

// La descripción para pegar, en un mensaje propio y dentro de un bloque <pre>: al tocarlo, Telegram copia todo el texto de
// una vez (los botones «copiar» de los bots solo aceptan 256 caracteres y las descripciones son más largas)
export async function mandarDescripcion(texto, titulo = '') {
  const tg = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!tg || !chat) return false;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const j = await fetch(`https://api.telegram.org/bot${tg}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, parse_mode: 'HTML', text: `📋 <b>Descripción${titulo ? ` · ${esc(titulo)}` : ''}</b> (toca el recuadro para copiarla)\n\n<pre>${esc(texto).slice(0, 3800)}</pre>` })
  }).then((x) => x.json()).catch((e) => ({ ok: false, description: e.message }));
  if (!j.ok) console.error(`Aviso: Telegram no recibió la descripción: ${j.description}`);
  return !!j.ok;
}

// Manda un carrusel (hasta 10 fotos) como álbum de Telegram, para guardarlas y subirlas a mano
export async function mandarFotosATelegram(archivos, caption = '') {
  const tg = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  const lista = archivos.filter((a) => fs.existsSync(a)).slice(0, 10);
  if (!tg || !chat || lista.length < 2) return false;
  const f = new FormData(); f.set('chat_id', chat);
  f.set('media', JSON.stringify(lista.map((a, i) => ({ type: 'photo', media: `attach://f${i}`, ...(i === 0 && caption ? { caption: caption.slice(0, 1000) } : {}) }))));
  lista.forEach((a, i) => f.set(`f${i}`, new Blob([fs.readFileSync(a)], { type: 'image/jpeg' }), path.basename(a)));
  const j = await fetch(`https://api.telegram.org/bot${tg}/sendMediaGroup`, { method: 'POST', body: f }).then((x) => x.json()).catch((e) => ({ ok: false, description: e.message }));
  if (!j.ok) console.error(`Aviso: Telegram no recibió las fotos: ${j.description}`);
  return !!j.ok;
}

const LIMITE = 48 * 1024 * 1024;
export async function mandarVideoATelegram(archivo, caption = '', { duracion } = {}) {
  const tg = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!tg || !chat || !fs.existsSync(archivo)) return false;
  let ruta = archivo, tmp = null;
  if (fs.statSync(archivo).size > LIMITE) {
    tmp = path.join(os.tmpdir(), `tg-${process.pid}-${Date.now()}.mp4`);
    // Bitrate objetivo según la duración, para quedar bajo el límite (audio 96 kbps)
    const seg = duracion || 600, kbps = Math.max(250, Math.min(1500, Math.floor(((LIMITE * 0.92 * 8) / seg) / 1000) - 96));
    const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', archivo, '-vf', 'scale=-2:720', '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', `${kbps}k`, '-maxrate', `${Math.round(kbps * 1.3)}k`, '-bufsize', `${kbps * 2}k`, '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', tmp], { stdio: ['ignore', 'ignore', 'pipe'] });
    if (r.status !== 0 || fs.statSync(tmp).size > 50 * 1024 * 1024) { console.error(`Aviso: no pude comprimir el video para Telegram: ${String(r.stderr).slice(0, 150)}`); if (tmp) fs.rmSync(tmp, { force: true }); return false; }
    ruta = tmp;
  }
  try {
    const f = new FormData(); f.set('chat_id', chat); f.set('caption', caption.slice(0, 1000)); f.set('parse_mode', 'HTML'); f.set('supports_streaming', 'true');
    f.set('video', new Blob([fs.readFileSync(ruta)], { type: 'video/mp4' }), path.basename(archivo));
    const j = await fetch(`https://api.telegram.org/bot${tg}/sendVideo`, { method: 'POST', body: f }).then((x) => x.json()).catch((e) => ({ ok: false, description: e.message }));
    if (!j.ok) console.error(`Aviso: Telegram no recibió el video: ${j.description}`);
    return !!j.ok;
  } finally { if (tmp) fs.rmSync(tmp, { force: true }); }
}
