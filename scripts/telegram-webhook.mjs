#!/usr/bin/env node
// Conecta el bot de Telegram con /api/telegram (Vercel) para que lea lo que le escribes. Se corre una vez:
//   node --env-file=.env scripts/telegram-webhook.mjs [--url https://circularte.edav-tech.com/api/telegram] [--quitar] [--ver]
// Antes, en Vercel → Settings → Environment Variables: TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID (los mismos del .env).
import './lib/env-file.mjs';
import { parseCli } from './lib/cli.mjs';
import { secretoWebhook } from './lib/control.mjs';

const o = parseCli({ url: { type: 'string', default: 'https://circularte.edav-tech.com/api/telegram' }, quitar: { type: 'boolean', default: false }, ver: { type: 'boolean', default: false } });
const tg = process.env.TELEGRAM_BOT_TOKEN;
if (!tg) { console.error('Falta TELEGRAM_BOT_TOKEN en .env'); process.exit(1); }
const api = async (m, body) => (await fetch(`https://api.telegram.org/bot${tg}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) })).json();

if (o.ver) { const r = await api('getWebhookInfo'); console.log({ ...r.result, url: r.result?.url }); process.exit(0); }
if (o.quitar) { console.log(await api('deleteWebhook')); process.exit(0); }
const r = await api('setWebhook', { url: o.url, secret_token: secretoWebhook(), allowed_updates: ['message', 'edited_message', 'callback_query'], drop_pending_updates: true });
console.log(r.ok ? `Listo: el bot manda tus mensajes a ${o.url}` : `Falló: ${r.description}`);
await api('setMyCommands', { commands: [
  { command: 'plan', description: 'Plan de hoy con el estado de cada publicación' },
  { command: 'noticias', description: 'Noticias candidatas de hoy' },
  { command: 'ayuda', description: 'Todo lo que puedo cambiar' }
] });
