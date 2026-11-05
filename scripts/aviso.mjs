#!/usr/bin/env node
// Aviso al final de cada corrida, SOLO si la corrida falló (JOB_STATUS=failure) o algo necesita tu intervención: un borrador en la bandeja de TikTok (o uno
// que TikTok no aceptó y hay que subir a mano) o un video privado en YouTube que hay que publicar en Studio. Lo que se
// publica solo en Facebook e Instagram no avisa.
// Canales (el primero que esté configurado; si hay varios, a todos):
//   Telegram: TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID (npm run avisos:telegram)
//   WhatsApp: CALLMEBOT_PHONE y CALLMEBOT_APIKEY (CallMeBot, gratis)
//   Si no hay ninguno: comentario en el issue «Videos para publicar» (llega por correo)
//   node scripts/aviso.mjs [--dir out] [--prueba]   (--prueba: muestra el mensaje y no envía nada)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import './lib/env-file.mjs';
import { parseCli } from './lib/cli.mjs';

const o = parseCli({ dir: { type: 'string', default: 'out' }, prueba: { type: 'boolean', default: false } });
const run = process.env.RUN_URL || '';
const leer = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const metas = fs.existsSync(o.dir) ? fs.readdirSync(o.dir).filter((f) => f.endsWith('.json')).map((f) => leer(path.join(o.dir, f))).filter((m) => m && (m.post || m.youtube)) : [];

// Qué necesita intervención en cada pieza
const pendientes = [];
for (const m of metas) {
  const t = (m.tiktok || []).at(-1), tareas = [];
  if (t?.status === 'SEND_TO_USER_INBOX') tareas.push(`📱 TikTok: borrador en tu bandeja («Tu contenido de Circularte está listo»). Pega esta descripción:\n${m.post?.text || ''}`);
  else if (t?.status === 'LIMIT') tareas.push(`⚠️ TikTok no aceptó más borradores (5 pendientes). Bájalo y súbelo a mano:\n${m.videoDownload || m.videoUrl || run}\n\nDescripción:\n${m.post?.text || ''}`);
  else if (t && t.status !== 'PUBLISH_COMPLETE' && /error/i.test(t.status || '')) tareas.push(`❌ TikTok falló: ${t.fail_reason || t.status}`);
  if (m.youtube?.studio) tareas.push(`▶️ YouTube: subido como PRIVADO. Publícalo (audiencia + «Público»):\n${m.youtube.studio}`);
  else if (m.youtube?.error) tareas.push(`❌ YouTube no lo subió: ${m.youtube.error}`);
  if (tareas.length) pendientes.push(`🎬 ${m.title}${m.duration ? ` · ${m.duration >= 120 ? `${(m.duration / 60).toFixed(1)} min` : `${Math.round(m.duration)} s`}` : ''}\n\n${tareas.join('\n\n')}`);
}
// Corrida fallida: un aviso corto con el nombre del workflow y el enlace (GitHub ya no manda correo)
const fallo = process.env.JOB_STATUS === 'failure';
if (!pendientes.length && !fallo) { console.log('Nada que necesite tu intervención: sin aviso'); process.exit(0); }
const hora = new Date().toLocaleString('es-HN', { timeZone: 'America/Tegucigalpa', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const encabezado = fallo ? `❌ Falló «${process.env.WORKFLOW_NAME || 'una corrida'}» · ${hora}` : `Potter Play · ${pendientes.length === 1 ? 'algo para revisar' : `${pendientes.length} cosas para revisar`}`;
let msg = `${encabezado}${pendientes.length ? `\n\n${pendientes.join('\n\n———\n\n')}` : ''}${run ? `\n\n${fallo ? 'Ver qué pasó' : 'Corrida'}: ${run}` : ''}`;
if (o.prueba) { console.log(msg); process.exit(0); }

let enviado = false;
const { TELEGRAM_BOT_TOKEN: tg, TELEGRAM_CHAT_ID: chat, CALLMEBOT_PHONE: tel, CALLMEBOT_APIKEY: key } = process.env;
if (tg && chat) {
  // Telegram acepta hasta 4096 caracteres por mensaje
  for (let i = 0; i < msg.length; i += 4000) {
    const r = await fetch(`https://api.telegram.org/bot${tg}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: msg.slice(i, i + 4000), disable_web_page_preview: true }) }).catch((e) => ({ ok: false, statusText: e.message }));
    console.log(`Telegram: ${r.ok ? 'enviado' : `falló (${r.status || ''} ${r.statusText || ''})`}`); enviado ||= r.ok;
  }
}
if (tel && key) {
  const r = await fetch(`https://api.callmebot.com/whatsapp.php?${new URLSearchParams({ phone: tel, text: msg.slice(0, 3500), apikey: key })}`).catch((e) => ({ ok: false, statusText: e.message }));
  console.log(`WhatsApp: ${r.ok ? 'enviado' : `falló (${r.status || ''} ${r.statusText || ''})`}`); enviado ||= r.ok;
}
// Sin canal (o si fallaron): el comentario en el issue, que llega por correo
if (!enviado && process.env.GH_TOKEN && process.env.GITHUB_REPOSITORY) {
  const repo = process.env.GITHUB_REPOSITORY, gh = (...a) => execFileSync('gh', a, { encoding: 'utf8' }).trim();
  let n = gh('issue', 'list', '--repo', repo, '--state', 'open', '--search', 'Videos para publicar in:title', '--json', 'number', '--jq', '.[0].number // empty');
  if (!n) n = gh('issue', 'create', '--repo', repo, '--title', 'Videos para publicar', '--body', 'Avisos de lo que necesita tu intervención (TikTok y YouTube).').match(/(\d+)$/)?.[1];
  fs.writeFileSync('aviso.md', '```\n' + msg + '\n```\n');
  gh('issue', 'comment', n, '--repo', repo, '--body-file', 'aviso.md'); console.log('Aviso por correo (comentario en el issue)');
}
