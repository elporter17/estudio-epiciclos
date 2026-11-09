#!/usr/bin/env node
// Vistas de lo publicado (tabla «envios» de Supabase, últimos 14 días) y su suma por video (tabla «videos»): así el
// bot muestra qué videos tuvieron pocas vistas para reenviarlos. Una vez al día (vistas.yml, lo lanza el relojero).
// Facebook: plays del Reel · Instagram: views · YouTube: viewCount. TikTok no da vistas de los borradores por la API.
//   node --env-file=.env scripts/vistas.mjs [--dias 14]
import { parseCli } from './lib/cli.mjs';
import { db } from './lib/db.mjs';
import { graph, facebookReady } from './facebook.mjs';
import { api as yt, youtubeReady } from './lib/youtube.mjs';

const o = parseCli({ dias: { type: 'string', default: '14' } });
const num = (x) => (typeof x === 'number' ? x : +x || 0);
const valor = (ins, ...nombres) => { for (const n of nombres) { const m = ins.find((x) => x.name === n); if (m) return m.values?.[0]?.value ?? m.total_value?.value; } return undefined; };

async function vistasDe(e) {
  if (e.red === 'fb' && facebookReady() && e.tipo === 'reel') {
    const ins = (await graph('GET', `/${e.post_id}/video_insights`, {}).catch(() => ({ data: [] }))).data || [];
    return num(valor(ins, 'fb_reels_total_plays', 'blue_reels_play_count', 'post_video_views'));
  }
  if (e.red === 'ig' && facebookReady()) {
    const d = await graph('GET', `/${e.post_id}/insights`, { metric: 'views' }).catch(() => null);
    return d?.data ? num(valor(d.data, 'views')) : null;
  }
  if (e.red === 'yt' && youtubeReady()) {
    const j = await yt('/videos', { query: { part: 'statistics', id: e.post_id } }).catch(() => null);
    return j?.items?.[0] ? num(j.items[0].statistics?.viewCount) : null;
  }
  return null;
}

async function main() {
  const envios = (await db('envios-lista', { dias: +o.dias })) || [];
  let n = 0;
  for (const e of envios) {
    if (!e.post_id) continue;
    const v = await vistasDe(e);
    if (v == null) continue;
    e.vistas = v; n++;
    await db('envio-vistas', { id: e.id, vistas: v });
  }
  console.log(`Vistas al día de ${n} de ${envios.length} envíos`);
  // Suma por video (misma huella), por red
  const videos = (await db('videos-lista', { dias: +o.dias + 1, limite: 500 })) || [];
  for (const v of videos) {
    const suyos = envios.filter((e) => e.huella === v.huella && e.vistas != null);
    if (!suyos.length) continue;
    const vistas = {};
    for (const e of suyos) vistas[e.red] = (vistas[e.red] || 0) + e.vistas;
    await db('video-vistas', { id: v.id, vistas });
  }
  console.log(`Videos actualizados: ${videos.length}`);
}

main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
