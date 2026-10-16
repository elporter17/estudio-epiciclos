#!/usr/bin/env node
// Conecta tu cuenta de TikTok (Login Kit oficial). Abre la URL, autoriza, y pega aquí el código y el
// state que muestra circularte.edav-tech.com/tiktok-callback.html. Guarda los tokens en data/tiktok-token.json.
//
//   npm run tiktok:connect                       → interactivo
//   npm run tiktok:connect -- --print-url        → solo imprime la URL (y guarda el state pendiente)
//   npm run tiktok:connect -- --code X --state Y → canjea el código sin preguntar
//   npm run tiktok:connect -- --status           → muestra si hay cuenta conectada y cuándo vence
import fs from 'node:fs';
import readline from 'node:readline/promises';
import { pathToFileURL } from 'node:url';
import { parseCli } from './lib/cli.mjs';
import { startAuthorization, exchangeCode, accessToken, api, TOKEN_FILE } from './lib/tiktok.mjs';

async function showStatus() {
  if (!fs.existsSync(TOKEN_FILE)) { console.log('Sin cuenta conectada. Ejecuta «npm run tiktok:connect».'); return; }
  const t = await accessToken();
  const info = await api('/v2/post/publish/creator_info/query/', undefined, t).catch((e) => ({ error: e.message }));
  console.log(`Cuenta: ${info.creator_username ? '@' + info.creator_username : '(no se pudo leer)'} · permisos: ${t.scope}`);
  console.log(`Token vigente hasta ${t.expires_at}; la autorización vence ${t.refresh_expires_at}.`);
  if (info.privacy_level_options) console.log(`Privacidad permitida: ${info.privacy_level_options.join(', ')}`);
  if (info.error) console.log(info.error);
}

async function main() {
  const o = parseCli({
    'print-url': { type: 'boolean', default: false }, code: { type: 'string' }, state: { type: 'string' },
    status: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' }
  });
  if (o.help) { console.log('Uso: npm run tiktok:connect [-- --print-url | --code <código> --state <state> | --status]'); return; }
  if (o.status) return showStatus();

  let code = o.code, state = o.state;
  if (!code) {
    const { url } = startAuthorization();
    console.log('1. Abre esta URL, inicia sesión con tu cuenta de TikTok (la que agregaste como Target User) y autoriza:\n');
    console.log(url + '\n');
    console.log('2. TikTok te lleva a la página de CirculArte con un código y un state.');
    if (o['print-url']) { console.log('\nLuego ejecuta: npm run tiktok:connect -- --code <código> --state <state>'); return; }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    code = (await rl.question('\nPega el código: ')).trim();
    state = (await rl.question('Pega el state (la «Verificación» que aparece debajo): ')).trim();
    rl.close();
  }
  if (!code) throw new Error('No se recibió ningún código.');
  const t = await exchangeCode(code, state);
  console.log(`\nListo: cuenta conectada con permisos ${t.scope}. El token se renueva solo cuando vence.`);
  await showStatus();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
}
