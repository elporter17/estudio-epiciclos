#!/usr/bin/env node
// Informe de rendimiento de la página de Facebook y de Instagram (read_insights): vistas, reacciones, comentarios y
// compartidos de cada Reel e imagen de los últimos días, agrupados por formato (nombres, futbolistas, quiz, top 10,
// banderas, curiosidades en imagen, noticias…) y por hora de publicación (Honduras). Escribe Markdown en la salida.
//   node --env-file=.env scripts/estadisticas.mjs --dias 7
import { parseCli } from './lib/cli.mjs';
import { graph, facebookReady } from './facebook.mjs';
import { instagramReady } from './instagram.mjs';

const o = parseCli({ dias: { type: 'string', default: '7' }, json: { type: 'string' } });
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
  if (/^(👀|🔎|🟢|✍️|🧮)/u.test(texto)) return 'Imagen · reto visual';
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
  // Imágenes: el borde /photos no pide pages_read_user_content (published_posts sí); las métricas van por la publicación
  const fotos = await graph('GET', `/${page}/photos`, { type: 'uploaded', limit: 100, fields: 'id,name,created_time,link,page_story_id,likes.summary(true).limit(0),comments.summary(true).limit(0)' }).catch((e) => ({ data: [], error: e.message }));
  if (fotos.error) console.error(`Fotos: ${fotos.error}`);
  let avisado = false;
  for (const p of fotos.data || []) {
    if (Date.parse(p.created_time) / 1000 < desde) continue;
    let ins = [], post = {};
    if (p.page_story_id) {
      post = await graph('GET', `/${p.page_story_id}`, { fields: 'shares,reactions.summary(true).limit(0)' }).catch(() => ({}));
      for (const metric of ['post_media_view', 'post_impressions_unique', 'post_impressions']) {
        const d = await graph('GET', `/${p.page_story_id}/insights`, { metric }).catch((e) => { if (!avisado) { console.error(`Métricas de foto: ${e.message}`); avisado = true; } return null; });
        if (d?.data?.length) { ins = d.data; break; }
      }
    }
    filas.push({
      red: 'Facebook', tipo: 'imagen', fecha: p.created_time, texto: p.name || '', enlace: p.link || '',
      vistas: num(valor(ins, 'post_media_view', 'post_impressions')), alcance: num(valor(ins, 'post_impressions_unique')),
      reacciones: post.reactions?.summary?.total_count ?? p.likes?.summary?.total_count ?? 0, comentarios: p.comments?.summary?.total_count || 0, compartidos: post.shares?.count || 0
    });
  }
  return filas;
}

async function instagram() {
  const ig = await instagramReady(); if (!ig) return [];
  const media = await graph('GET', `/${ig}/media`, { limit: 100, fields: 'id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count' }).catch(() => ({ data: [] }));
  const filas = [], errIG = new Set();
  for (const m of media.data || []) {
    if (Date.parse(m.timestamp) / 1000 < desde) continue;
    // Una métrica por consulta: si una no existe para ese tipo de publicación, las demás igual llegan
    const ins = [];
    for (const metric of ['views', 'reach', 'shares']) {
      const d = await graph('GET', `/${m.id}/insights`, { metric }).catch((e) => { if (!errIG.has(metric)) { console.error(`Instagram ${metric}: ${e.message}`); errIG.add(metric); } return null; });
      if (d?.data) ins.push(...d.data);
    }
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

// Para el tablero local (npm run tablero): promedio por red y formato, con los nombres cortos del tablero
if (o.json) {
  const corto = { 'Video · banderas': 'Banderas', 'Video · quiz 5 preguntas': 'Quiz de 5 preguntas', 'Video · top 10': 'Top 10', 'Video · nombres y parejas': 'Nombres', 'Video · futbolistas': 'Futbolistas' };
  const g = new Map();
  for (const f of filas) {
    const k = `${f.red}|${corto[f.formato] || f.formato}`, a = g.get(k) || { publicaciones: 0, vistas: 0, vistas_max: 0, me_gusta: 0, comentarios: 0, compartidos: 0 };
    a.publicaciones++; a.vistas += f.vistas; a.vistas_max = Math.max(a.vistas_max, f.vistas); a.me_gusta += f.reacciones; a.comentarios += f.comentarios; a.compartidos += f.compartidos; g.set(k, a);
  }
  const hoy = new Date().toISOString().slice(0, 10);
  const salida = { fuente: 'Informe «Estadísticas de Facebook e Instagram» (Graph API)', periodo: `Últimos ${o.dias} días al ${hoy}`, generado: hoy,
    filas: [...g].map(([k, a]) => { const [red, formato] = k.split('|'); return { red, formato, publicaciones: a.publicaciones, vistas_prom: Math.round(a.vistas / a.publicaciones), vistas_max: a.vistas_max, me_gusta: a.me_gusta, comentarios: a.comentarios, compartidos: a.compartidos }; }) };
  (await import('node:fs')).writeFileSync(o.json, JSON.stringify(salida, null, 2) + '\n');
}
