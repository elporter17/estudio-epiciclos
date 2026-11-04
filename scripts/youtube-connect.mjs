#!/usr/bin/env node
// Conecta el canal de YouTube (Potter Play): abre el navegador, eliges la cuenta y el canal, autorizas, y el token de
// renovación queda en .env como YOUTUBE_REFRESH_TOKEN (con --github, también en los secretos del repo, sin mostrarlo).
//   npm run youtube:connect                → conectar
//   npm run youtube:connect -- --github    → conectar y guardar también en GitHub
//   npm run youtube:connect -- --status    → qué canal está conectado
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import './lib/env-file.mjs';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';
import { SCOPES, tokenDesdeCodigo, miCanal } from './lib/youtube.mjs';

const o = parseCli({ github: { type: 'boolean', default: false }, status: { type: 'boolean', default: false } });
if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) { console.error('Faltan YOUTUBE_CLIENT_ID y YOUTUBE_CLIENT_SECRET en .env'); process.exit(1); }
if (o.status) {
  if (!process.env.YOUTUBE_REFRESH_TOKEN) { console.log('Sin canal conectado'); process.exit(0); }
  const c = await miCanal(); console.log(c ? `Canal: ${c.snippet.title} (${c.snippet.customUrl || c.id}) · ${c.statistics.subscriberCount} suscriptores` : 'La cuenta no tiene canal');
  process.exit(0);
}

const state = crypto.randomBytes(16).toString('hex');
const server = http.createServer();
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const redirect = `http://127.0.0.1:${server.address().port}`;
const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: process.env.YOUTUBE_CLIENT_ID, redirect_uri: redirect, response_type: 'code', scope: SCOPES.join(' '),
  access_type: 'offline', prompt: 'consent select_account', state
});
console.log(`Abre esta URL (se abre sola), elige la cuenta y el canal «Potter Play» y autoriza:\n\n${url}\n`);
if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url.replace(/&/g, '^&')], { detached: true, stdio: 'ignore' });

const code = await new Promise((ok, mal) => {
  server.on('request', (req, res) => {
    const q = new URL(req.url, redirect).searchParams;
    if (!q.get('code') && !q.get('error')) { res.end(); return; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(q.get('error') ? `<h2>No se autorizó: ${q.get('error')}</h2>` : '<h2>Listo: Potter Play quedó conectado. Ya puedes cerrar esta pestaña.</h2>');
    if (q.get('state') !== state) mal(new Error('El state no coincide')); else if (q.get('error')) mal(new Error(q.get('error'))); else ok(q.get('code'));
  });
  setTimeout(() => mal(new Error('Pasaron 10 minutos sin autorizar')), 600e3);
}).finally(() => server.close());

const tok = await tokenDesdeCodigo(code, redirect);
if (!tok.refresh_token) throw new Error('Google no devolvió el token de renovación');
const envFile = path.join(ROOT, '.env');
let env = fs.readFileSync(envFile, 'utf8'); const nl = env.includes('\r\n') ? '\r\n' : '\n';
env = /^YOUTUBE_REFRESH_TOKEN=.*$/m.test(env) ? env.replace(/^YOUTUBE_REFRESH_TOKEN=.*$/m, `YOUTUBE_REFRESH_TOKEN=${tok.refresh_token}`) : env.replace(/\s*$/, '') + nl + `YOUTUBE_REFRESH_TOKEN=${tok.refresh_token}` + nl;
fs.writeFileSync(envFile, env);
process.env.YOUTUBE_REFRESH_TOKEN = tok.refresh_token;
const c = await miCanal();
console.log(c ? `Conectado: ${c.snippet.title} (${c.snippet.customUrl || c.id})` : 'Autorizado, pero esa cuenta no tiene canal: vuelve a conectar eligiendo «Potter Play»');
if (o.github) {
  for (const k of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN']) {
    const r = spawnSync('gh', ['secret', 'set', k], { input: process.env[k], encoding: 'utf8', cwd: ROOT });
    console.log(r.status === 0 ? `GitHub: ${k} guardado` : `GitHub: no se pudo guardar ${k} (${String(r.stderr).trim()})`);
  }
}
