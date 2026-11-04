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
// El token se guarda en .env desde ya: si hay que repetir, no se vuelve a pegar
const envFile = path.join(ROOT, '.env');
function guardar(k, v) {
  let env = fs.readFileSync(envFile, 'utf8'); const nl = env.includes('\r\n') ? '\r\n' : '\n';
  env = new RegExp(`^${k}=.*$`, 'm').test(env) ? env.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`) : env.replace(/\s*$/, '') + nl + `${k}=${v}` + nl;
  fs.writeFileSync(envFile, env);
}
guardar('TELEGRAM_BOT_TOKEN', token);
// Espera hasta 1 minuto a que le escribas al bot («Iniciar» o «hola»)
let chat = null;
for (let i = 0; i < 12 && !chat; i++) {
  chat = (await api('getUpdates')).map((u) => (u.message || u.my_chat_member || {}).chat).filter(Boolean).at(-1);
  if (!chat) { if (i === 0) console.log(`Esperando tu mensaje: abre t.me/${bot.username} y escríbele «hola»…`); await new Promise((ok) => setTimeout(ok, 5000)); }
}
if (!chat) { console.log(`No llegó ningún mensaje. Escríbele «hola» a t.me/${bot.username} y vuelve a correr: npm run avisos:telegram`); process.exitCode = 1; }
else {
  await api('sendMessage', { chat_id: chat.id, text: '✅ Potter Play: avisos conectados. Aquí te llegará solo lo que necesita tu intervención (borradores de TikTok y videos de YouTube para publicar).' });
  guardar('TELEGRAM_CHAT_ID', String(chat.id));
  for (const [k, v] of [['TELEGRAM_BOT_TOKEN', token], ['TELEGRAM_CHAT_ID', String(chat.id)]]) {
    const r = spawnSync('gh', ['secret', 'set', k], { input: v, encoding: 'utf8', cwd: ROOT });
    console.log(r.status === 0 ? `GitHub: ${k} guardado` : `GitHub: no se pudo guardar ${k} (${String(r.stderr).trim()})`);
  }
  console.log(`Listo: @${bot.username} → ${chat.first_name || chat.title || chat.id}. Te mandé un mensaje de prueba.`);
}
