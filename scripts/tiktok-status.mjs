#!/usr/bin/env node
// Estado de las subidas en TikTok (lo que TikTok dice de cada publish_id).
//   node scripts/tiktok-status.mjs v_inbox_file~v2.123…   (uno o varios)
//   node scripts/tiktok-status.mjs                         (las últimas 10 de data/tiktok-log.json)
// En GitHub: lanzar «Video diario a TikTok» a mano con el campo «estado» (ids o «ultimos»).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { accessToken, api } from './lib/tiktok.mjs';
import { ROOT } from './lib/node-env.mjs';

export const LOG_FILE = path.join(ROOT, 'data', 'tiktok-log.json');
export const readLog = () => { try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch { return []; } };
// Cada subida aceptada o rechazada queda anotada (el archivo vive en el estado cifrado de Actions, no en git)
export function logUpload(entry) {
  const l = readLog(); l.push(entry);
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(l.slice(-100), null, 2) + '\n');
}

async function main() {
  const ids = process.argv.slice(2).filter((a) => a !== 'ultimos');
  const items = ids.length ? ids.map((publish_id) => ({ publish_id })) : readLog().filter((e) => e.publish_id).slice(-10);
  if (!items.length) { console.log('No hay subidas anotadas todavía.'); return; }
  const token = await accessToken(), rows = [];
  for (const e of items) {
    let line;
    try {
      const d = await api('/v2/post/publish/status/fetch/', { publish_id: e.publish_id }, token);
      line = [e.at || '', e.title || '', e.publish_id, d.status + (d.fail_reason ? ` (${d.fail_reason})` : ''), d.uploaded_bytes != null ? `${(d.uploaded_bytes / 1e6).toFixed(1)} MB` : ''];
    } catch (err) { line = [e.at || '', e.title || '', e.publish_id, `error: ${err.message}`, '']; }
    rows.push(line); console.log(line.filter(Boolean).join(' · '));
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = ['### Estado en TikTok', '', '| Subida | Video | publish_id | Estado | Bytes |', '|---|---|---|---|---|', ...rows.map((r) => `| ${r.join(' | ')} |`)];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
}
