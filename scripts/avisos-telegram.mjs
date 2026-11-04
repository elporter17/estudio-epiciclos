#!/usr/bin/env node
// Conecta los avisos por Telegram (scripts/aviso.mjs). Antes: en Telegram, abre @BotFather → /newbot → ponle nombre
// (p. ej. «Potter Play Avisos») → copia el token. Luego abre tu bot nuevo y pulsa «Iniciar» (o escríbele «hola»).
//   npm run avisos:telegram            → pide el token, encuentra tu chat, manda un mensaje de prueba y guarda
//                                        TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en .env y en los secretos de GitHub
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import './lib/env-file.mjs';
import { ROOT } from './lib/node-env.mjs';

let token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); token = (await rl.question('Pega el token del bot (de @BotFather): ')).trim(); rl.close(); }
const api = async (m, body) => { const r = await fetch(`https://api.telegram.org/bot${token}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) }); const j = await r.json(); if (!j.ok) throw new Error(`Telegram: ${j.description}`); return j.result; };
const bot = await api('getMe');
const updates = await api('getUpdates');
const chat = updates.map((u) => (u.message || u.my_chat_member || {}).chat).filter(Boolean).at(-1);
if (!chat) { console.log(`Abre t.me/${bot.username}, pulsa «Iniciar» (o escríbele «hola») y vuelve a correr este comando.`); process.exit(1); }
await api('sendMessage', { chat_id: chat.id, text: '✅ Potter Play: avisos conectados. Aquí te llegará solo lo que necesita tu intervención (borradores de TikTok y videos de YouTube para publicar).' });

const envFile = path.join(ROOT, '.env'); let env = fs.readFileSync(envFile, 'utf8'); const nl = env.includes('\r\n') ? '\r\n' : '\n';
for (const [k, v] of [['TELEGRAM_BOT_TOKEN', token], ['TELEGRAM_CHAT_ID', String(chat.id)]]) {
  env = new RegExp(`^${k}=.*$`, 'm').test(env) ? env.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`) : env.replace(/\s*$/, '') + nl + `${k}=${v}` + nl;
  const r = spawnSync('gh', ['secret', 'set', k], { input: v, encoding: 'utf8', cwd: ROOT });
  console.log(r.status === 0 ? `GitHub: ${k} guardado` : `GitHub: no se pudo guardar ${k} (${String(r.stderr).trim()})`);
}
fs.writeFileSync(envFile, env);
console.log(`Listo: @${bot.username} → ${chat.first_name || chat.title || chat.id}. Te mandé un mensaje de prueba.`);
