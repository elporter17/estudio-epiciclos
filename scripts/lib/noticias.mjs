// Últimas noticias desde RSS de medios en español (videojuegos, fútbol, ciencia). Solo se usan el titular, el medio,
// la fecha y el enlace: la imagen se arma con texto e ícono propios, y la descripción cita la fuente.
export const FUENTES = [
  { cat: 'videojuegos', icono: '🎮', medio: 'Eurogamer', url: 'https://www.eurogamer.es/feed' },
  { cat: 'videojuegos', icono: '🎮', medio: 'VidaExtra', url: 'https://www.vidaextra.com/feedburner.xml' },
  { cat: 'futbol', icono: '⚽', medio: 'Marca', url: 'https://e00-marca.uecdn.es/rss/futbol/mundial.xml' },
  { cat: 'futbol', icono: '⚽', medio: 'Marca', url: 'https://e00-marca.uecdn.es/rss/futbol/futbol-internacional.xml' },
  { cat: 'ciencia', icono: '🔭', medio: 'Xataka Ciencia', url: 'https://www.xatakaciencia.com/feedburner.xml' },
  { cat: 'ciencia', icono: '🔭', medio: 'Muy Interesante', url: 'https://www.muyinteresante.com/feed/' }
];
export const CAT_NOMBRE = { videojuegos: 'Videojuegos', futbol: 'Fútbol', ciencia: 'Ciencia' };

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const limpiar = (s) => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '')
  .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m)
  .replace(/\s+/g, ' ').trim();
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? limpiar(m[1]) : ''; };

// Lee una fuente RSS o Atom; devuelve [{ titulo, link, fecha, medio, cat, icono }]
export async function leerFuente(f) {
  const res = await fetch(f.url, { headers: { 'User-Agent': 'Mozilla/5.0 (CirculArte noticias)' }, signal: AbortSignal.timeout(20000) });
  const xml = await res.text();
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return items.map((it) => {
    const link = tag(it, 'link') || (it.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
    const fecha = Date.parse(tag(it, 'pubDate') || tag(it, 'published') || tag(it, 'updated')) || 0;
    return { titulo: tag(it, 'title'), link, fecha, medio: f.medio, cat: f.cat, icono: f.icono };
  }).filter((n) => n.titulo && n.link);
}

// La noticia más reciente (de las últimas «horas») que no esté en «vistos», rotando entre categorías
export async function ultimaNoticia({ vistos = new Set(), horas = 36, preferir } = {}) {
  const todas = (await Promise.all(FUENTES.map((f) => leerFuente(f).catch(() => [])))).flat();
  const limite = Date.now() - horas * 3600e3;
  const frescas = todas.filter((n) => n.fecha >= limite && !vistos.has(n.link) && n.titulo.length >= 25 && n.titulo.length <= 160)
    .sort((a, b) => b.fecha - a.fecha);
  return frescas.find((n) => n.cat === preferir) || frescas[0] || null;
}
