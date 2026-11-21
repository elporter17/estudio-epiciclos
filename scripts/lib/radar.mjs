// Radar diario de tendencias, sin navegador (2026-11-21). Junta lo que se mueve hoy en Honduras con fuentes abiertas:
//   · Google Trends Honduras (búsquedas del día, con tráfico aproximado)
//   · Google News Honduras (deportes, cultura y turismo; ya sin política ni crímenes)
//   · YouTube: los videos más populares de Honduras (API oficial, 1 unidad de cuota)
// Instagram, Facebook y TikTok no tienen API pública de tendencias (el «audio en tendencia» solo se ve dentro de la app),
// así que este radar usa esas señales como pista para cada red y no promete ver lo que ve la app. Lo arma scripts/noticias.mjs
// cada mañana: lo guarda en data/radar-hoy.json y lo manda por Telegram con un ángulo sugerido por plataforma.
import { leerFuente } from './noticias.mjs';
import { youtubeReady, api } from './youtube.mjs';

const GN = (q) => `https://news.google.com/rss/${q}hl=es-419&gl=HN&ceid=HN:es-419`;
const limpio = (s) => String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
const sinMedio = (t) => { const i = t.lastIndexOf(' - '); return i > 20 ? t.slice(0, i) : t; };

async function trendsHN() {
  try {
    const xml = await (await fetch('https://trends.google.com/trending/rss?geo=HN', { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) })).text();
    return (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []).map((it) => ({
      termino: limpio(it.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || ''),
      trafico: +((it.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/i)?.[1] || '0').replace(/\D/g, '')) || 0
    })).filter((x) => x.termino).sort((a, b) => b.trafico - a.trafico);
  } catch { return []; }
}
async function noticiasHN() {
  const fuentes = [
    GN('search?q=Honduras+Olimpia+OR+Motagua+OR+Selecci%C3%B3n+OR+Bicolor+when:2d&'),
    GN('search?q=Honduras+turismo+OR+cultura+OR+m%C3%BAsica+OR+gastronom%C3%ADa+OR+viral+when:3d&'),
    GN('search?q=catracho+OR+hondure%C3%B1o+OR+hondure%C3%B1a+when:2d&')
  ];
  const out = [];
  for (const url of fuentes) { try { out.push(...(await leerFuente({ url, medio: 'Google News', cat: 'honduras' }))); } catch { /* sigue con las demás */ } }
  const vistos = new Set();
  return out.sort((a, b) => b.fecha - a.fecha).map((n) => ({ titulo: sinMedio(n.titulo), link: n.link, fecha: n.fecha }))
    .filter((n) => n.titulo.length >= 25 && !vistos.has(n.titulo.toLowerCase().slice(0, 40)) && vistos.add(n.titulo.toLowerCase().slice(0, 40)));
}
async function youtubeHN() {
  if (!youtubeReady()) return [];
  try {
    const j = await api('/videos', { query: { part: 'snippet', chart: 'mostPopular', regionCode: 'HN', maxResults: '15' } });
    return (j.items || []).map((v) => ({ titulo: v.snippet.title, canal: v.snippet.channelTitle, categoria: v.snippet.categoryId }));
  } catch { return []; }
}

export async function radar() {
  const [trends, noticias, youtube] = await Promise.all([trendsHN(), noticiasHN(), youtubeHN()]);
  return { fecha: new Date().toISOString(), trends: trends.slice(0, 15), noticias: noticias.slice(0, 10), youtube: youtube.slice(0, 10) };
}

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lista = (xs, f, n) => xs.slice(0, n).map((x) => `• ${esc(f(x))}`).join('\n') || '• (sin datos hoy)';
// El mensaje de Telegram: qué se mueve y un ángulo por red
export function mensajeRadar(r) {
  const t = (x) => `${x.termino}${x.trafico ? ` (${x.trafico >= 1000 ? `${Math.round(x.trafico / 1000)} mil` : x.trafico}+)` : ''}`;
  return `📡 <b>Radar de tendencias</b> · Honduras\n\n` +
    `📘 <b>Facebook</b> (prueba local): noticias y orgullo de Honduras\n${lista(r.noticias, (n) => n.titulo, 4)}\n\n` +
    `📸 <b>Instagram</b>: búsquedas de hoy, para un gancho de quiz o reto\n${lista(r.trends, t, 5)}\n\n` +
    `🎵 <b>TikTok</b>: sátira o reacción con lo que se busca\n${lista(r.trends.slice(5), t, 4)}\n\n` +
    `▶️ <b>YouTube</b>: lo más visto hoy en Honduras\n${lista(r.youtube, (v) => `${v.titulo} — ${v.canal}`, 4)}\n\n` +
    `<i>Instagram, Facebook y TikTok no publican tendencias por API: esto es una pista, no lo que ves dentro de cada app. Las noticias de Honduras ya alimentan el Reel de las 7:45 en Facebook.</i>`;
}
