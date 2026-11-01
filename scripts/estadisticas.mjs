#!/usr/bin/env node
// Informe de rendimiento de la página de Facebook y de Instagram (read_insights): vistas, reacciones, comentarios y
// compartidos de cada Reel e imagen de los últimos días, agrupados por formato (nombres, futbolistas, quiz, top 10,
// banderas, curiosidades en imagen, noticias…) y por hora de publicación (Honduras). Escribe Markdown en la salida.
//   node --env-file=.env scripts/estadisticas.mjs --dias 7
import { parseCli } from './lib/cli.mjs';
import { graph, facebookReady } from './facebook.mjs';
import { instagramReady } from './instagram.mjs';

const o = parseCli({ dias: { type: 'string', default: '7' } });
const desde = Math.floor(Date.now() / 1000) - +o.dias * 86400;
const horaHN = (t) => new Date(new Date(t).getTime() - 6 * 3600e3).getUTCHours();

// Formato según el texto de la publicación (las plantillas de captions.js, curiosidades.mjs y curiosidades-video.mjs)
function formato(texto = '', tipo) {
  const t = texto.toLowerCase();
  if (t.includes('10 cosas que no sabías')) return 'Video · top 10';
  if (t.includes('5 preguntas')) return 'Video · quiz 5 preguntas';
  if (t.includes('adivina las 10 banderas')) return 'Video · banderas';
  if (t.includes('#tunombre') || t.includes('nombre') && tipo === 'video') return 'Video · nombres y parejas';
  if (t.includes('#futbol') && tipo === 'video') return 'Video · futbolistas';
  if (tipo === 'video') return 'Video · otro';
  if (t.startsWith('📰')) return 'Imagen · noticia';
  if (t.includes('verdadero o falso')) return 'Imagen · verdadero o falso';
  if (t.includes('uno es falso')) return 'Imagen · cuál es falso';
  if (t.startsWith('🧠')) return 'Imagen · reto';
  if (t.includes('sabías que')) return 'Imagen · sabías que';
  return 'Imagen · otra';
}
const valor = (ins, ...nombres) => { for (const n of nombres) { const m = ins.find((x) => x.name === n); if (m) return m.values?.[0]?.value ?? m.total_value?.value ?? 0; } return null; };
const num = (v) => (typeof v === 'number' ? v : 0);

async function facebook() {
  const page = process.env.FB_PAGE_ID, filas = [];
  const reels = await graph('GET', `/${page}/video_reels`, { since: desde, limit: 100, fields: 'id,description,created_time,permalink_url,likes.summary(true).limit(0),comments.summary(true).limit(0)' }).catch((e) => ({ data: [], error: e.message }));
  if (reels.error) console.error(`Reels: ${reels.error}`);
  for (const r of reels.data || []) {
    if (Date.parse(r.created_time) / 1000 < desde) continue;
    const ins = (await graph('GET', `/${r.id}/video_insights`, {}).catch(() => ({ data: [] }))).data || [];
    filas.push({
      red: 'Facebook', tipo: 'video', fecha: r.created_time, texto: r.description || '', enlace: r.permalink_url ? `https://www.facebook.com${r.permalink_url}` : '',
      vistas: num(valor(ins, 'fb_reels_total_plays', 'blue_reels_play_count', 'post_video_views')), alcance: num(valor(ins, 'post_impressions_unique')),
      reacciones: r.likes?.summary?.total_count || 0, comentarios: r.comments?.summary?.total_count || 0, compartidos: num(valor(ins, 'post_video_social_actions')?.SHARE)
    });
  }
  const posts = await graph('GET', `/${page}/published_posts`, { since: desde, limit: 100, fields: 'id,message,created_time,permalink_url,shares,reactions.summary(true).limit(0),comments.summary(true).limit(0),attachments{media_type}' }).catch((e) => ({ data: [], error: e.message }));
  if (posts.error) console.error(`Publicaciones: ${posts.error}`);
  for (const p of posts.data || []) {
    if (p.attachments?.data?.[0]?.media_type !== 'photo') continue;
    let ins = [];
    for (const metric of ['post_media_view', 'post_impressions_unique', 'post_impressions']) {
      const d = await graph('GET', `/${p.id}/insights`, { metric }).catch(() => null);
      if (d?.data?.length) { ins = d.data; break; }
    }
    filas.push({
      red: 'Facebook', tipo: 'imagen', fecha: p.created_time, texto: p.message || '', enlace: p.permalink_url || '',
      vistas: num(valor(ins, 'post_media_view', 'post_impressions')), alcance: num(valor(ins, 'post_impressions_unique')),
      reacciones: p.reactions?.summary?.total_count || 0, comentarios: p.comments?.summary?.total_count || 0, compartidos: p.shares?.count || 0
    });
  }
  return filas;
}

async function instagram() {
  const ig = await instagramReady(); if (!ig) return [];
  const media = await graph('GET', `/${ig}/media`, { limit: 100, fields: 'id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count' }).catch(() => ({ data: [] }));
  const filas = [];
  for (const m of media.data || []) {
    if (Date.parse(m.timestamp) / 1000 < desde) continue;
    const ins = (await graph('GET', `/${m.id}/insights`, { metric: 'views,reach,shares,saved' }).catch(() => ({ data: [] }))).data || [];
    const tipo = m.media_type === 'VIDEO' ? 'video' : 'imagen';
    filas.push({
      red: 'Instagram', tipo, fecha: m.timestamp, texto: m.caption || '', enlace: m.permalink,
      vistas: num(valor(ins, 'views')), alcance: num(valor(ins, 'reach')), reacciones: m.like_count || 0, comentarios: m.comments_count || 0, compartidos: num(valor(ins, 'shares'))
    });
  }
  return filas;
}

function tabla(filas, clave) {
  const g = new Map();
  for (const f of filas) { const k = clave(f); const a = g.get(k) || { n: 0, vistas: 0, reacciones: 0, comentarios: 0, compartidos: 0 }; a.n++; for (const c of ['vistas', 'reacciones', 'comentarios', 'compartidos']) a[c] += f[c]; g.set(k, a); }
  const out = ['| | Publicaciones | Vistas prom. | Reacciones prom. | Comentarios prom. | Compartidos prom. |', '|---|---|---|---|---|---|'];
  for (const [k, a] of [...g].sort((x, y) => y[1].vistas / y[1].n - x[1].vistas / x[1].n)) out.push(`| ${k} | ${a.n} | ${Math.round(a.vistas / a.n)} | ${(a.reacciones / a.n).toFixed(1)} | ${(a.comentarios / a.n).toFixed(1)} | ${(a.compartidos / a.n).toFixed(1)} |`);
  return out.join('\n');
}

if (!facebookReady()) { console.log('Faltan FB_PAGE_ID o FB_PAGE_TOKEN'); process.exit(0); }
const filas = [...await facebook(), ...await instagram()].map((f) => ({ ...f, formato: formato(f.texto, f.tipo), hora: horaHN(f.fecha) }));
const md = [`## Rendimiento de los últimos ${o.dias} días (${filas.length} publicaciones)`];
for (const red of ['Facebook', 'Instagram']) {
  const r = filas.filter((f) => f.red === red); if (!r.length) continue;
  md.push(`\n### ${red}: por formato\n`, tabla(r, (f) => f.formato));
  md.push(`\n### ${red}: por hora de publicación (Honduras)\n`, tabla(r, (f) => `${String(f.hora).padStart(2, '0')}:00`));
  md.push(`\n### ${red}: las 10 con más vistas\n`, '| Vistas | Reac. | Coment. | Comp. | Formato | Fecha | Enlace |', '|---|---|---|---|---|---|---|');
  for (const f of [...r].sort((a, b) => b.vistas - a.vistas).slice(0, 10)) md.push(`| ${f.vistas} | ${f.reacciones} | ${f.comentarios} | ${f.compartidos} | ${f.formato} | ${f.fecha.slice(0, 16).replace('T', ' ')} UTC | [ver](${f.enlace}) |`);
}
console.log(md.join('\n'));
