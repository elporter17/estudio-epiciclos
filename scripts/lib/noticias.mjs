// Últimas noticias desde RSS de medios en español (videojuegos, fútbol, ciencia y tecnología). Se usan el titular, un
// resumen corto (la primera o las dos primeras frases de la entradilla del RSS), el medio, la fecha y el enlace: la
// imagen y el video se arman con texto e ícono propios, y la descripción cita la fuente.
// Fuentes elegidas el 2026-11-06 midiendo cuántas notas frescas traen en 24 h y si traen entradilla: Marca (fútbol
// internacional) y Eurogamer casi no publicaban, por eso las noticias salían viejas o solo con el titular.
export const FUENTES = [
  { cat: 'videojuegos', medio: '3DJuegos', url: 'https://www.3djuegos.com/feedburner.xml' },
  { cat: 'videojuegos', medio: 'Vandal', url: 'https://vandal.elespanol.com/xml.cgi' },
  { cat: 'videojuegos', medio: 'VidaExtra', url: 'https://www.vidaextra.com/feedburner.xml' },
  { cat: 'videojuegos', medio: 'Eurogamer', url: 'https://www.eurogamer.es/feed' },
  { cat: 'futbol', medio: 'Mundo Deportivo', url: 'https://www.mundodeportivo.com/rss/futbol' },
  { cat: 'futbol', medio: 'Marca', url: 'https://e00-marca.uecdn.es/rss/portada.xml' },
  { cat: 'futbol', medio: 'Infobae', url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/deportes/' },
  { cat: 'ciencia', medio: 'National Geographic', url: 'https://www.nationalgeographic.com.es/feeds/rss.xml' },
  { cat: 'ciencia', medio: 'Xataka Ciencia', url: 'https://www.xatakaciencia.com/feedburner.xml' },
  { cat: 'ciencia', medio: 'Muy Interesante', url: 'https://www.muyinteresante.com/feed/' },
  { cat: 'ciencia', medio: 'Infobae', url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/america/ciencia-america/' },
  { cat: 'tecnologia', medio: 'Xataka', url: 'https://www.xataka.com/feedburner.xml' },
  { cat: 'tecnologia', medio: 'Hipertextual', url: 'https://hipertextual.com/feed' },
  { cat: 'tecnologia', medio: 'Infobae', url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/tecno/' }
];
export const ICONO = { videojuegos: '🎮', futbol: '⚽', ciencia: '🔭', tecnologia: '📱', general: '📰' };
export const CAT_NOMBRE = { videojuegos: 'Videojuegos', futbol: 'Fútbol', ciencia: 'Ciencia', tecnologia: 'Tecnología', general: 'Noticias' };
export const CATS = ['videojuegos', 'futbol', 'ciencia', 'tecnologia'];
export const N_REEL = 5; // noticias en el Reel «Noticias de hoy»

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', ndash: '–', mdash: '—', iexcl: '¡', iquest: '¿' };
const entidades = (s) => s.replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m);
// Sin CDATA ni etiquetas, también las que venían escapadas (&lt;b&gt;)
export const limpiar = (s) => entidades(String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' '))
  .replace(/<[^>]+>/g, ' ').replace(/<!--[\s\S]*?-->|!--[\w-]*--/g, ' ').replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? limpiar(m[1]) : ''; };

// Resumen de una o dos frases (máx. «largo» caracteres), sin colas tipo «Leer más» o «La entrada … apareció primero en …»
export function resumir(texto, titulo = '', largo = 170) {
  let t = limpiar(texto).replace(/\b(Leer m[aá]s|Seguir leyendo|Leer)\s*\.?\s*$/i, '').replace(/(La entrada|The post) .* apareci[oó] primero en .*$/i, '')
    .replace(/\[(…|\.\.\.)\]\s*$/, '').trim();
  if (!t) return '';
  // Si la entradilla empieza repitiendo el titular, se quita
  if (titulo && t.toLowerCase().startsWith(titulo.toLowerCase().slice(0, 40))) t = t.slice(titulo.length).replace(/^[\s.:–-]+/, '');
  const frases = t.match(/[^.!?…]+[.!?…]+(\s|$)/g) || [t];
  let r = '';
  for (const f of frases) { if ((r + f).trim().length > largo) break; r += f; if (r.length >= 70) break; }
  r = r.trim();
  if (r.length < 40) {
    // La primera frase es muy larga: se corta en la última coma (o, si no hay, en la última palabra que quepa)
    r = t.slice(0, largo);
    if (t.length > largo) { const coma = Math.max(r.lastIndexOf(', '), r.lastIndexOf('; '), r.lastIndexOf(': ')); r = (coma >= 70 ? r.slice(0, coma) : r.replace(/\s+\S*$/, '').replace(/\s+(de|del|la|las|el|los|y|o|con|en|a|para|por|que|un|una)$/i, '')) + '…'; }
  }
  return r;
}

// El texto con la codificación que declara el RSS (Vandal usa ISO-8859-1)
async function texto(res) {
  const buf = Buffer.from(await res.arrayBuffer());
  const cab = (res.headers.get('content-type') || '').match(/charset=([\w-]+)/i)?.[1];
  const xml = buf.subarray(0, 200).toString('latin1').match(/encoding=["']([\w-]+)["']/i)?.[1];
  const cs = (cab || xml || 'utf-8').toLowerCase();
  try { return new TextDecoder(cs === 'iso-8859-1' || cs === 'latin1' ? 'windows-1252' : cs).decode(buf); } catch { return buf.toString('utf8'); }
}

// Lee una fuente RSS o Atom; devuelve [{ titulo, resumen, link, fecha, medio, cat, icono }]
export async function leerFuente(f) {
  const res = await fetch(f.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Potter Play noticias)' }, signal: AbortSignal.timeout(20000) });
  const xml = await texto(res);
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return items.map((it) => {
    const link = tag(it, 'link') || (it.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
    const fecha = Date.parse(tag(it, 'pubDate') || tag(it, 'published') || tag(it, 'updated') || tag(it, 'dc:date')) || 0;
    const titulo = tag(it, 'title');
    const resumen = resumir(tag(it, 'description') || tag(it, 'summary') || tag(it, 'content:encoded') || tag(it, 'content'), titulo);
    return { titulo, resumen, link, fecha, medio: f.medio, cat: f.cat, icono: ICONO[f.cat] };
  }).filter((n) => n.titulo && n.link);
}

// ---------- qué noticia vale más (sin IA) ----------
// Publicidad, ofertas, guías y reseñas no son noticias; política, crímenes y tragedias no van con la marca
const ANUNCIO = /precio|oferta|descuento|rebaja|chollo|cup[oó]n|black friday|cyber monday|amazon|mediamarkt|aliexpress|c[oó]digo promocional|compra|barat|gratis por tiempo|\bgu[ií]a\b|trucos|c[oó]mo conseguir|d[oó]nde comprar|paso a paso|^c[oó]mo |^as[ií] (puedes|se)|an[aá]lisis de|review|opini[oó]n|\bpodcast\b|en directo|en vivo|minuto a minuto|horario y d[oó]nde ver|d[oó]nde ver|alineaci[oó]n(es)? (de|del|confirmada)|apuestas|pron[oó]stico/i;
const SENSIBLE = /asesin|homicid|viol(a|ó)|abuso|sexual|suicid|muert[oe]s? (en|tras)|fallec|tiroteo|guerra|ataque|bomba|elecciones|partido pol[ií]tico|presidente|gobierno|trump|congreso|senado|c[aá]ncer|accidente/i;
// Lo que más interesa a la audiencia (videojuegos grandes, estrellas del fútbol, espacio y descubrimientos)
const GANCHO = /gta|rockstar|nintendo|switch 2|playstation|ps5|ps6|xbox|pok[eé]mon|minecraft|fortnite|call of duty|zelda|mario|elden ring|hollow knight|resident evil|silksong|steam|messi|cristiano|ronaldo|mbapp[eé]|haaland|yamal|vin[ií]cius|neymar|real madrid|barcelona|bar[cç]a|champions|mundial|selecci[oó]n|nasa|marte|la luna|asteroide|cometa|agujero negro|telescopio|james webb|dinosaurio|f[oó]sil|descubr|hallazgo|r[eé]cord|primera vez|in[eé]dit|misterio|antiguo|honduras|inteligencia artificial|\bia\b|chatgpt|iphone|whatsapp|android|samsung|apple|google|tiktok|youtube|netflix/i;
const palabras = (t) => new Set(t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter((w) => w.length > 4).map((w) => w.slice(0, 5))); // raíz: «retiro» y «retirada» cuentan igual
export function puntaje(n, todas = []) {
  let p = 0;
  const g = n.titulo.match(new RegExp(GANCHO.source, 'gi')); if (g) p += 3 + Math.min(2, g.length - 1);
  if (/\bgta\b|grand theft auto|rockstar/i.test(n.titulo)) p += 3; // el especial del canal hasta el lanzamiento
  if (n.resumen && n.resumen.length >= 60) p += 2;
  if (/\d/.test(n.titulo)) p += 1; // las cifras enganchan («280 grabados», «3 millones»)
  if (/^¿|\?$/.test(n.titulo)) p -= 1; // las preguntas suelen ser artículos de opinión
  // Si varios medios cuentan lo mismo, es una noticia importante
  const w = palabras(n.titulo); let cob = 0;
  for (const o of todas) if (o !== n && o.medio !== n.medio) { let c = 0; for (const x of palabras(o.titulo)) if (w.has(x)) c++; if (c >= 3) cob++; }
  p += Math.min(4, cob * 2);
  p -= Math.max(0, (Date.now() - n.fecha) / 3600e3 - 6) / 6; // pierde un punto cada 6 h después de las primeras 6
  return +p.toFixed(2);
}
const vale = (n) => n.titulo.length >= 25 && n.titulo.length <= 150 && !ANUNCIO.test(n.titulo) && !SENSIBLE.test(`${n.titulo} ${n.resumen}`);

// Ordenadas de mejor a peor y alternando categorías (una de cada una arriba), sin repetir enlace ni la misma historia
export function ordenar(todas, { horas = 36, vistos = new Set(), max = 24 } = {}) {
  const limite = Date.now() - horas * 3600e3, links = new Set();
  const frescas = todas.filter((n) => n.fecha >= limite && !vistos.has(n.link) && vale(n) && !links.has(n.link) && links.add(n.link));
  for (const n of frescas) n.puntaje = puntaje(n, frescas);
  frescas.sort((a, b) => b.puntaje - a.puntaje || b.fecha - a.fecha);
  // Fuera las que cuentan la misma historia que una mejor
  const unicas = [];
  for (const n of frescas) { const w = palabras(n.titulo); if (!unicas.some((u) => { let c = 0; for (const x of palabras(u.titulo)) if (w.has(x)) c++; return c >= 3; })) unicas.push(n); }
  // Por rondas: la mejor de cada categoría, luego la segunda de cada una…
  const porCat = Object.fromEntries(CATS.map((c) => [c, unicas.filter((n) => n.cat === c)])), out = [];
  for (let r = 0; out.length < Math.min(max, unicas.length) && r < 50; r++) for (const c of CATS) if (porCat[c][r] && out.length < max) out.push(porCat[c][r]);
  return out;
}

export async function leerTodas() { return (await Promise.all(FUENTES.map((f) => leerFuente(f).catch(() => [])))).flat(); }
export async function juntarNoticias({ horas = 36, max = 24 } = {}) { return ordenar(await leerTodas(), { horas, max }); }

// La mejor noticia (de las últimas «horas») que no esté en «vistos», preferentemente de la categoría «preferir»
export async function ultimaNoticia({ vistos = new Set(), horas = 36, preferir } = {}) {
  const lista = ordenar(await leerTodas(), { horas, vistos });
  return lista.find((n) => n.cat === preferir) || lista[0] || null;
}

// Una noticia a partir de un enlace que mandas por Telegram: título, entradilla y medio de las etiquetas Open Graph
export async function noticiaDeEnlace(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Potter Play noticias)' }, signal: AbortSignal.timeout(8000), redirect: 'follow' });
  const html = (await texto(res)).slice(0, 300000);
  const meta = (p) => limpiar((html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']*)["']`, 'i')) || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${p}["']`, 'i')) || [])[1] || '');
  const titulo = meta('og:title') || tag(html, 'title');
  if (!titulo) throw new Error('No encontré el título en esa página');
  const host = new URL(res.url || url).hostname.replace(/^www\./, '');
  const medio = meta('og:site_name') || host;
  const cat = /juego|gaming|gamer|3djuegos|vandal|vidaextra|eurogamer|ign|levelup/i.test(host + titulo) ? 'videojuegos' : /futbol|deport|marca|\bas\.com|sport|espn|diez/i.test(host + titulo) ? 'futbol' : /ciencia|science|nasa|natgeo|nationalgeographic|muyinteresante/i.test(host + titulo) ? 'ciencia' : /xataka|tecno|tech|hipertextual|genbeta/i.test(host + titulo) ? 'tecnologia' : 'general';
  return { titulo: titulo.slice(0, 150), resumen: resumir(meta('og:description') || meta('description'), titulo), link: url, fecha: Date.now(), medio, cat, icono: ICONO[cat], propia: true };
}
