#!/usr/bin/env node
// Publicación de imágenes de curiosidades («¿Sabías que…?», «¿Verdadero o falso?», «¿Cuál es falso?», retos) y de
// noticias (titulares recientes de medios en español), sin IA: texto, ícono y colores por tema.
//   node scripts/curiosidades.mjs --red facebook            (carrusel en Facebook e Instagram: portada gancho + 5 + cierre)
//   node scripts/curiosidades.mjs --red facebook --tipo retos|datos|noticias   (un carrusel de ese tipo)
//   node scripts/curiosidades.mjs --red tiktok              (TikTok, foto en borrador)
//   node scripts/curiosidades.mjs --historia                (historia de Facebook con la imagen vertical; metas.mjs)
//   node scripts/curiosidades.mjs --dry-run --formato vf    (solo la imagen y el texto, sin publicar)
// Base: data/curiosidades/*.json. Historial (para no repetir): data/curiosidades-historial.json (estado de Actions).
import fs from 'node:fs';
import path from 'node:path';
import { put, list, del } from '@vercel/blob';
import { parseCli } from './lib/cli.mjs';
import { setupNode, ROOT } from './lib/node-env.mjs';
import { dibujarTarjeta, dibujarPortada, dibujarCierre, TEMAS } from './lib/tarjetas.mjs';
import { ultimaNoticia, CAT_NOMBRE } from './lib/noticias.mjs';
import { blobToken } from './lib/video-link.mjs';
import { publishPhoto, publishPhotoStory, publishCarrusel, facebookReady } from './facebook.mjs';
import { publishPhotoDraft } from './publish.mjs';
import { publishInstagramSeguro, instagramReady } from './instagram.mjs';
import { crearVisual, dibujarVisual, VISUALES, NIVELES } from './lib/retos-visuales.mjs';
import { registrarRespuesta } from './lib/respuestas.mjs';

const DIR = path.join(ROOT, 'data', 'curiosidades'), HIST = path.join(ROOT, 'data', 'curiosidades-historial.json');
const SITE_MEDIA = 'https://circularte.edav-tech.com/media/'; // dominio verificado en TikTok (redirige al almacén)
const leer = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const azar = (a) => a[Math.floor(Math.random() * a.length)];
const mezclar = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const OCULTAR = '\n\n.\n.\n.\n\n'; // la respuesta queda debajo de «Ver más»

export function cargarBase() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).flatMap((f) => leer(path.join(DIR, f), []));
}

// Elige una curiosidad que no salió en las últimas «evitar» publicaciones, rotando el tema
function elegirCuriosidad(base, hist, { formato, id } = {}) {
  if (id) return base.find((x) => x.id === id);
  const recientes = new Set(hist.ids.slice(-Math.min(400, base.length - 20)));
  const ultimoTema = hist.temas.at(-1);
  let pool = base.filter((x) => !recientes.has(x.id) && x.tema !== ultimoTema);
  if (formato === 'reto') pool = pool.filter((x) => x.tipo === 'reto');
  else if (formato) pool = pool.filter((x) => x.tipo !== 'reto');
  return azar(pool.length ? pool : base);
}

// Arma la tarjeta y el texto según el formato; la respuesta siempre va en la descripción
function armar(x, base, formatoPedido) {
  const tema = TEMAS[x.tema], tags = ['curiosidades', 'sabiasque', 'datoscuriosos', ...tema.tags, 'potterplay'];
  const ht = (extra = []) => '\n\n' + [...tags, ...extra].map((t) => `#${t}`).join(' ');
  if (x.tipo === 'reto') {
    const ok = x.opciones[x.respuesta];
    return {
      formato: 'reto', clave: { modo: 'letra', letra: 'ABC'[x.respuesta], texto: ok }, tarjeta: { formato: 'reto', tema: x.tema, icono: x.icono, texto: x.pregunta, opciones: x.opciones },
      texto: `🧠 ${x.pregunta}\n\nA) ${x.opciones[0]}\nB) ${x.opciones[1]}\nC) ${x.opciones[2]}\n\n¿Cuál elegirías? Piénsalo antes de ver la solución.${OCULTAR}✅ Respuesta: ${'ABC'[x.respuesta]}) ${ok}\n${x.explicacion}${ht(['reto', 'acertijo'])}`
    };
  }
  const formato = formatoPedido || azar(['sabias', 'sabias', 'sabias', 'vf', 'vf', 'vf', 'error', 'error']);
  if (formato === 'vf') {
    const verdadero = Math.random() < 0.5, afirm = verdadero ? x.dato : x.falso;
    return {
      formato, verdadero, clave: { modo: 'vf', verdadero }, tarjeta: { formato, tema: x.tema, icono: x.icono, texto: afirm },
      texto: `¿Verdadero o falso? 🤔\n\n«${afirm}»\n\n¿Tú qué dices? Piénsalo antes de ver la respuesta.${OCULTAR}${verdadero ? `✅ VERDADERO.\n${x.dato}` : `❌ FALSO.\n${x.explicacion}`}${ht(['verdaderoofalso'])}`
    };
  }
  if (formato === 'error') {
    // El falso de esta curiosidad y dos datos verdaderos del mismo tema
    const otros = mezclar(base.filter((y) => y.tema === x.tema && y.id !== x.id && y.dato)).slice(0, 2);
    const items = mezclar([{ t: x.falso, f: true }, ...otros.map((o) => ({ t: o.dato, f: false }))]), letra = 'ABC'[items.findIndex((i) => i.f)];
    return {
      formato, clave: { modo: 'letra', letra }, tarjeta: { formato, tema: x.tema, icono: x.icono, items: items.map((i) => i.t) },
      texto: `Dos son verdad y uno es FALSO. ¿Cuál es? 🧐\n\n${items.map((i, k) => `${'ABC'[k]}) ${i.t}`).join('\n')}\n\n¿Cuál crees que es el falso?${OCULTAR}❌ El falso es la ${letra}.\n${x.explicacion}${ht(['adivina'])}`
    };
  }
  return {
    formato: 'sabias', tarjeta: { formato: 'sabias', tema: x.tema, icono: x.icono, texto: x.dato },
    texto: `¿Sabías que…? 🤯\n\n${x.dato}\n\n¿Lo sabías?${ht()}`
  };
}

function armarNoticia(n) {
  const fecha = new Date(n.fecha).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Tegucigalpa' });
  const cat = CAT_NOMBRE[n.cat];
  return {
    formato: 'noticia', tarjeta: { formato: 'noticia', tema: 'noticias', icono: n.icono, texto: n.titulo, pie: `Fuente: ${n.medio} · ${fecha}` },
    texto: `📰 ${cat}: ${n.titulo}\n\n¿Qué opinas?\n\nFuente: ${n.medio}\n${n.link}\n\n#noticias #${n.cat} #ultimahora #potterplay`
  };
}

// Sube la imagen al almacén (prefijo media/: también se ve en circularte.edav-tech.com/media/…) y borra las de +7 días
async function subirImagen(file) {
  const token = blobToken(); if (!token) return null;
  const contentType = /\.jpe?g$/i.test(file) ? 'image/jpeg' : 'image/png';
  const { url, pathname } = await put(`media/curiosidades/${path.basename(file)}`, fs.readFileSync(file), { access: 'public', token, addRandomSuffix: true, contentType });
  try {
    const viejos = (await list({ prefix: 'media/curiosidades/', token })).blobs.filter((b) => Date.parse(b.uploadedAt) < Date.now() - 7 * 864e5).map((b) => b.url);
    if (viejos.length) await del(viejos, { token });
  } catch { /* la limpieza no es crítica */ }
  return { url, sitio: SITE_MEDIA + pathname.replace(/^media\//, '') };
}

// ---------- carruseles: portada gancho + 5 (retos de fácil a GOD, datos de un tema o noticias) + cierre ----------
// Los carruseles son lo que más se desliza (y Facebook e Instagram los vuelven a mostrar desde la segunda): la portada
// tiene que dar una razón para deslizar, sin contar la respuesta. Ganchos que rotan, sin cifras inventadas.
const GANCHOS = {
  retos: [
    [['¿Hasta qué', false], ['nivel', true], ['llegas?', false]],
    [['El último es', false], ['nivel GOD', true]],
    [['Casi nadie', false], ['pasa el 4', true]],
    [['Del 1 al 5:', false], ['¿cuál te gana?', true]],
    [['Si pasas el 3,', false], ['eres de otro nivel', true]],
    [['El 1 es fácil.', false], ['¿Y el 5?', true]]
  ],
  datos: [
    [['5 cosas de', false], ['{tema}', true], ['que nadie te contó', false]],
    [['La número 4', false], ['parece mentira', true]],
    [['Seguro no sabías', false], ['la última', true]],
    [['Esto no te lo', false], ['enseñaron', true], ['en la escuela', false]],
    [['5 datos de', false], ['{tema}', true], ['que te van a volar la cabeza', false]]
  ],
  noticias: [
    [['Lo que pasó', false], ['hoy', true], ['en 1 minuto', false]],
    [['{n} noticias', true], ['que tienes que saber hoy', false]],
    [['Videojuegos, fútbol y ciencia:', false], ['lo de hoy', true]]
  ]
};
const TEMA_CORTO = { animales: 'los animales', ciencia: 'el espacio', historia: 'la historia', deportes: 'el fútbol', inventos: 'los inventos', matematicas: 'los números', cuerpo: 'tu cuerpo', geografia: 'el mundo', comida: 'la comida', tecnologia: 'la tecnología' };
const contraer = (t) => t.replace(/\bde el\b/g, 'del');
const ganchoDe = (tipo, k, datos) => GANCHOS[tipo][k % GANCHOS[tipo].length].map(([t, r]) => [t.replace('{tema}', datos.tema || '').replace('{n}', datos.n || ''), r]);

// Cuál toca: en Facebook, 1 de cada 6 son noticias (si hay frescas) y del resto 2 de cada 3 son retos; en TikTok, día
// por medio retos o datos (como antes)
function tipoCarrusel(o, hist) {
  if (o.tipo && o.tipo !== 'auto' && GANCHOS[o.tipo]) return o.tipo;
  const k = o.red === 'tiktok' ? hist.carruseles || 0 : hist.carruselesFb || 0;
  if (o.red === 'tiktok') return k % 2 === 0 ? 'retos' : 'datos';
  return k % 6 === 5 ? 'noticias' : k % 3 === 2 ? 'datos' : 'retos';
}

async function carrusel(o, hist, base, emojiFont) {
  const n = Math.min(8, Math.max(3, +(o.carrusel || 5))), H = o.red === 'tiktok' ? 1920 : 1350;
  let tipo = tipoCarrusel(o, hist);
  const k = (hist.ganchos || 0), slides = [], lineas = [], ids = [], noticias = [];
  let tema = 'matematicas', clave = { modo: 'charla' }, portada, cierreT;
  if (tipo === 'noticias') {
    const cats = ['videojuegos', 'futbol', 'ciencia'], vistos = new Set(hist.noticias);
    for (let i = 0; i < 4; i++) { const x = await ultimaNoticia({ vistos, preferir: cats[i % 3] }).catch(() => null); if (!x) break; vistos.add(x.link); noticias.push(x); }
    if (noticias.length < 3) tipo = 'retos';
  }
  if (tipo === 'retos') {
    // Un tipo de reto distinto en cada nivel, de fácil a GOD
    const tipos = mezclar(VISUALES);
    for (let i = 0; i < 5; i++) { const v = crearVisual(tipos[i], i); slides.push(dibujarVisual(v, { H, emojiFont })); lineas.push(`Nivel ${i + 1} (${NIVELES[i].nombre}): ${v.corta.replace(/[¡!]/g, '')}`); }
    clave = { modo: 'puntaje', max: 5 };
    portada = { gancho: ganchoDe('retos', k, {}), etiqueta: '5 RETOS · DE FÁCIL A GOD', tema: 'matematicas', chips: NIVELES.map((x, i) => ({ texto: i === 4 ? 'GOD' : String(i + 1), color: x.color })), sub: 'Respuestas al final de la descripción' };
    cierreT = { titulo: '¿Hasta qué nivel llegaste?', sub: 'Del 1 (fácil) al 5 (GOD)', nota: 'Las respuestas están en la descripción', tema: 'matematicas' };
  } else if (tipo === 'datos') {
    // 5 datos de un mismo tema (el que más datos sin usar tenga entre unos al azar)
    const recientes = new Set(hist.ids.slice(-Math.min(400, base.length - 20)));
    const libres = base.filter((x) => x.dato && x.tipo !== 'reto' && !recientes.has(x.id));
    const porTema = Object.entries(libres.reduce((a, x) => ((a[x.tema] = (a[x.tema] || 0) + 1), a), {})).filter(([t, c]) => c >= n && TEMA_CORTO[t] && t !== hist.temas.at(-1));
    tema = porTema.length ? azar(porTema)[0] : azar(Object.keys(TEMA_CORTO));
    const elegidos = mezclar(libres.filter((x) => x.tema === tema)).concat(mezclar(base.filter((x) => x.tema === tema && x.dato))).filter((x, i, a) => a.indexOf(x) === i).slice(0, n);
    elegidos.forEach((x, i) => { ids.push(x.id); slides.push(dibujarTarjeta({ formato: 'sabias', tema: x.tema, icono: x.icono, texto: x.dato }, { H, emojiFont })); lineas.push(`${i + 1}. ${x.dato}`); });
    portada = { gancho: ganchoDe('datos', k, { tema: TEMA_CORTO[tema] }), etiqueta: `${elegidos.length} DATOS · ${TEMAS[tema].nombre.toUpperCase()}`, tema, iconos: elegidos.map((x) => x.icono).slice(0, 5), sub: '¿Cuántas ya sabías?' };
    cierreT = { titulo: '¿Cuál te sorprendió más?', sub: `¿Cuántas de las ${elegidos.length} ya sabías?`, nota: 'Mañana hay más', tema };
  } else {
    tema = 'noticias';
    const fecha = (x) => new Date(x.fecha).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', timeZone: 'America/Tegucigalpa' });
    noticias.forEach((x, i) => { slides.push(dibujarTarjeta({ formato: 'noticia', tema: 'noticias', icono: x.icono, texto: x.titulo, pie: `Fuente: ${x.medio} · ${fecha(x)}` }, { H, emojiFont })); lineas.push(`${i + 1}. ${x.titulo} (${x.medio})\n${x.link}`); });
    portada = { gancho: ganchoDe('noticias', k, { n: noticias.length }), etiqueta: 'NOTICIAS DE HOY', tema, iconos: noticias.map((x) => x.icono), sub: 'Videojuegos · Fútbol · Ciencia' };
    cierreT = { titulo: '¿Cuál te sorprendió más?', sub: 'Las fuentes están en la descripción', tema };
  }
  // «de» + «el fútbol» → «del» + «fútbol» (en la portada cada parte se dibuja por separado)
  portada.gancho = portada.gancho.map(([t, r], i, a) => [a[i + 1] && /\bde$/.test(t) && /^el /.test(a[i + 1][0]) ? t.replace(/de$/, 'del') : i && /\bde$/.test(a[i - 1][0]) && /^el /.test(t) ? t.slice(3) : t, r]);
  const todas = [dibujarPortada(portada, { H, emojiFont }), ...slides, dibujarCierre(cierreT, { H, emojiFont })];
  const outDir = path.join(ROOT, 'out'); fs.mkdirSync(outDir, { recursive: true });
  const marca = Date.now().toString(36), archivos = todas.map((cv, i) => {
    // JPEG para todos: TikTok e Instagram no aceptan PNG
    const file = path.join(outDir, `carrusel-${tipo}-${marca}-${i + 1}.jpg`); fs.writeFileSync(file, cv.toBuffer('image/jpeg', 92)); return file;
  });
  const titulo = contraer(tipo === 'retos' ? '5 retos: de fácil a GOD' : tipo === 'datos' ? `${slides.length} datos de ${TEMA_CORTO[tema]}` : 'Noticias de hoy');
  const gancho = contraer(portada.gancho.map(([t]) => t).join(' '));
  const texto = tipo === 'retos'
    ? `👀 ${gancho}. 5 retos visuales que suben de nivel: fácil, medio, difícil, imposible y GOD 💀. Desliza y resuelve cada uno antes de ver la respuesta.${OCULTAR}Respuestas:\n${lineas.join('\n')}\n\n#retos #acertijos #retovisual #juegosmentales #agilidadmental #potterplay`
    : tipo === 'datos'
      ? `🤯 ${gancho}. Desliza 👉 ¿Cuántas ya sabías?\n\n${lineas.join('\n')}\n\n#curiosidades #sabiasque #datoscuriosos #aprende ${TEMAS[tema].tags.map((t) => `#${t}`).join(' ')} #potterplay`
      : `📰 ${gancho}. Desliza 👉\n\n${lineas.join('\n\n')}\n\n¿Cuál te sorprendió más?\n\n#noticias #ultimahora #videojuegos #futbol #ciencia #potterplay`;
  console.error(`Carrusel (${o.red}): ${titulo} · portada «${gancho}» · ${archivos.length} imágenes`);
  const meta = { kind: 'imagen', title: titulo, id: `carrusel-${marca}`, formato: `carrusel-${tipo}`, post: { text: texto }, createdAt: new Date().toISOString() };
  if (!o['dry-run']) {
    const subidas = [];
    for (const file of archivos) { const img = await subirImagen(file).catch((e) => { console.error(`No se pudo subir la imagen: ${e.message}`); return null; }); if (img) subidas.push(img); }
    if (subidas.length >= 2) {
      meta.imageUrl = subidas[0].url;
      if (o.red === 'tiktok') {
        try { meta.tiktok = [await publishPhotoDraft({ url: subidas.map((x) => x.sitio), title: titulo, description: texto })]; }
        catch (e) { meta.tiktok = [{ mode: 'draft', status: /spam_risk|pending/i.test(e.message) ? 'LIMIT' : 'error', fail_reason: e.message }]; console.error(`Aviso: TikTok: ${e.message}`); }
      } else {
        if (facebookReady()) {
          try { meta.facebook = await publishCarrusel({ urls: subidas.map((x) => x.url), caption: texto }); }
          catch (e) { meta.facebook = { status: 'error', error: e.message }; console.error(`Aviso: Facebook: ${e.message}`); process.exitCode = 1; }
          registrarRespuesta({ red: 'facebook', id: meta.facebook?.post_id, clave, titulo });
        }
        if (o.instagram !== 'no' && await instagramReady()) {
          meta.instagram = await publishInstagramSeguro({ tipo: 'carrusel', urls: subidas.map((x) => x.url), caption: texto });
          registrarRespuesta({ red: 'instagram', id: meta.instagram.media_id, clave, titulo });
        }
      }
    }
    hist.ids.push(...ids); hist.noticias.push(...noticias.map((x) => x.link)); if (tipo === 'datos') hist.temas.push(tema);
    hist.ganchos = k + 1;
    if (o.red === 'tiktok') hist.carruseles = (hist.carruseles || 0) + 1; else hist.carruselesFb = (hist.carruselesFb || 0) + 1;
    hist.total++; hist.ids = hist.ids.slice(-600); hist.temas = hist.temas.slice(-50); hist.noticias = hist.noticias.slice(-300);
    fs.mkdirSync(path.dirname(HIST), { recursive: true }); fs.writeFileSync(HIST, JSON.stringify(hist, null, 2) + '\n');
  }
  fs.writeFileSync(path.join(outDir, `carrusel-${marca}.json`), JSON.stringify(meta, null, 2) + '\n');
  console.log(JSON.stringify({ imagenes: archivos, texto, facebook: meta.facebook, instagram: meta.instagram, tiktok: meta.tiktok }, null, 2));
}

async function main() {
  const o = parseCli({
    red: { type: 'string', default: 'facebook' }, tipo: { type: 'string', default: 'auto' }, 'noticia-cada': { type: 'string', default: '6' },
    formato: { type: 'string' }, id: { type: 'string' }, 'dry-run': { type: 'boolean', default: false }, instagram: { type: 'string', default: 'si' },
    // Un reto visual concreto: duplicado | nombre | diferente | fraccion | operacion
    visual: { type: 'string' },
    // TikTok: un carrusel de N imágenes en lugar de una sola
    carrusel: { type: 'string' },
    // Historia de Facebook (imagen vertical) en lugar de publicación; con --instagram si, también historia de Instagram
    historia: { type: 'boolean', default: false }
  });
  const fx = setupNode(), emojiFont = fx.emoji ? `"${fx.emoji}"` : '';
  const hist = { ids: [], temas: [], noticias: [], total: 0, ...leer(HIST, {}) };
  const base = cargarBase();
  const aMano = o.id || o.formato || o.visual || (o.tipo !== 'auto' && !GANCHOS[o.tipo]);
  if ((o.red === 'tiktok' && +o.carrusel > 1) || (o.red === 'facebook' && !o.historia && !aMano)) return carrusel(o, hist, base, emojiFont);
  // Cada «noticia-cada» publicaciones va una noticia (si hay una fresca); si no, una curiosidad
  const tocaNoticia = o.tipo === 'noticia' || (o.tipo === 'auto' && (hist.total + 1) % Math.max(1, +o['noticia-cada']) === 0);
  let pieza = null, x = null, noticia = null;
  if (tocaNoticia && !o.id) {
    const cats = ['videojuegos', 'futbol', 'ciencia'], preferir = cats[Math.floor(hist.total / Math.max(1, +o['noticia-cada'])) % cats.length];
    noticia = await ultimaNoticia({ vistos: new Set(hist.noticias), preferir }).catch(() => null);
    if (noticia) pieza = armarNoticia(noticia);
  }
  // Retos visuales (duplicado, nombre, letra escondida, fracción, operación): 2 de cada 3 publicaciones que no son
  // noticia, porque son el tipo de imagen que más comentarios junta. Rotan en orden.
  let visual = null;
  if (!pieza && !o.id && (o.tipo === 'visual' || o.visual || (o.tipo === 'auto' && !o.formato && hist.total % 3 !== 2))) {
    const tipo = o.visual || VISUALES[(hist.visuales || []).length % VISUALES.length];
    visual = crearVisual(tipo);
    pieza = { formato: `visual-${tipo}`, texto: visual.texto, clave: visual.clave };
  }
  if (!pieza) { x = elegirCuriosidad(base, hist, { formato: o.formato, id: o.id }); pieza = armar(x, base, o.formato); }
  const nombre = noticia ? `noticia-${noticia.cat}` : visual ? `${pieza.formato}-${Date.now().toString(36)}` : `${x.id}-${pieza.formato}`;
  console.error(`Elegido: ${nombre}`);

  const outDir = path.join(ROOT, 'out'); fs.mkdirSync(outDir, { recursive: true });
  const redes = o.red === 'ambas' ? ['facebook', 'tiktok'] : [o.red];
  const archivos = {};
  for (const red of redes) {
    const H = red === 'tiktok' || o.historia ? 1920 : 1350, cv = visual ? dibujarVisual(visual, { H, emojiFont }) : dibujarTarjeta(pieza.tarjeta, { H, emojiFont });
    // TikTok solo acepta JPG o WEBP; Facebook va en PNG
    archivos[red] = path.join(outDir, `curiosidad-${nombre}-${red}.${red === 'tiktok' ? 'jpg' : 'png'}`); fs.writeFileSync(archivos[red], red === 'tiktok' ? cv.toBuffer('image/jpeg', 92) : cv.toBuffer('image/png'));
    // Instagram solo acepta JPEG: la misma tarjeta 4:5 de Facebook
    if (red === 'facebook') { archivos.instagram = path.join(outDir, `curiosidad-${nombre}-instagram.jpg`); fs.writeFileSync(archivos.instagram, cv.toBuffer('image/jpeg', 92)); }
  }
  const sidecar = path.join(outDir, `curiosidad-${nombre}.json`);
  const meta = { kind: 'imagen', title: noticia ? noticia.titulo.slice(0, 80) : visual ? `Reto visual · ${visual.tipo}` : `${TEMAS[x.tema].nombre} · ${pieza.formato}`, id: x?.id || noticia?.link || nombre, formato: pieza.formato, post: { text: pieza.texto }, createdAt: new Date().toISOString() };
  if (!o['dry-run']) {
    for (const red of redes) {
      const img = await subirImagen(archivos[red]).catch((e) => { console.error(`No se pudo subir la imagen: ${e.message}`); return null; });
      if (!img) { console.error('Sin almacén Blob no se puede publicar la imagen'); continue; }
      meta.imageUrl = img.url;
      if (red === 'facebook' && o.historia && facebookReady()) {
        try { meta.facebook = await publishPhotoStory({ url: img.url }); }
        catch (e) { meta.facebook = { status: 'error', error: e.message }; console.error(`Aviso: Facebook: ${e.message}`); process.exitCode = 1; }
        if (o.instagram !== 'no' && await instagramReady()) {
          const jpg = await subirImagen(archivos.instagram).catch(() => null);
          if (jpg) meta.instagram = await publishInstagramSeguro({ tipo: 'historia-imagen', url: jpg.url });
        }
      } else if (red === 'facebook' && facebookReady()) {
        try { meta.facebook = await publishPhoto({ url: img.url, caption: pieza.texto }); }
        catch (e) { meta.facebook = { status: 'error', error: e.message }; console.error(`Aviso: Facebook: ${e.message}`); }
        // Respuesta correcta guardada para contestar los comentarios (scripts/comentarios.mjs)
        registrarRespuesta({ red: 'facebook', id: meta.facebook.post_id, clave: pieza.clave, titulo: meta.title });
        // Instagram (cuenta vinculada a la página): la misma imagen en JPEG
        if (o.instagram !== 'no' && await instagramReady()) {
          const jpg = await subirImagen(archivos.instagram).catch(() => null);
          meta.instagram = jpg ? await publishInstagramSeguro({ tipo: 'imagen', url: jpg.url, caption: pieza.texto }) : { status: 'error', error: 'no se pudo subir el JPEG' };
          registrarRespuesta({ red: 'instagram', id: meta.instagram.media_id, clave: pieza.clave, titulo: meta.title });
        }
      }
      if (red === 'tiktok') {
        try { meta.tiktok = [await publishPhotoDraft({ url: img.sitio, title: noticia ? 'Noticia' : visual ? 'Reto visual' : '¿Sabías que…?', description: pieza.texto })]; }
        catch (e) {
          const limite = /spam_risk|pending/i.test(e.message);
          meta.tiktok = [{ mode: 'draft', status: limite ? 'LIMIT' : 'error', fail_reason: e.message }];
          console.error(`Aviso: TikTok: ${e.message}`);
        }
      }
    }
    // Historial: lo publicado no se repite
    if (x) { hist.ids.push(x.id); hist.temas.push(x.tema); }
    if (noticia) hist.noticias.push(noticia.link);
    if (visual) hist.visuales = [...(hist.visuales || []), visual.tipo].slice(-100);
    hist.total++; hist.ids = hist.ids.slice(-600); hist.temas = hist.temas.slice(-50); hist.noticias = hist.noticias.slice(-300);
    fs.mkdirSync(path.dirname(HIST), { recursive: true }); fs.writeFileSync(HIST, JSON.stringify(hist, null, 2) + '\n');
  }
  fs.writeFileSync(sidecar, JSON.stringify(meta, null, 2) + '\n');
  console.log(JSON.stringify({ imagenes: archivos, texto: pieza.texto, facebook: meta.facebook, tiktok: meta.tiktok }, null, 2));
}

main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
