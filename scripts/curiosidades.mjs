#!/usr/bin/env node
// Publicación de imágenes de curiosidades («¿Sabías que…?», «¿Verdadero o falso?», «¿Cuál es falso?», retos) y de
// noticias (titulares recientes de medios en español), sin IA: texto, ícono y colores por tema.
//   node scripts/curiosidades.mjs --red facebook            (Facebook, publicada directo)
//   node scripts/curiosidades.mjs --red tiktok              (TikTok, foto en borrador)
//   node scripts/curiosidades.mjs --dry-run --formato vf    (solo la imagen y el texto, sin publicar)
// Base: data/curiosidades/*.json. Historial (para no repetir): data/curiosidades-historial.json (estado de Actions).
import fs from 'node:fs';
import path from 'node:path';
import { put, list, del } from '@vercel/blob';
import { parseCli } from './lib/cli.mjs';
import { setupNode, ROOT } from './lib/node-env.mjs';
import { dibujarTarjeta, TEMAS } from './lib/tarjetas.mjs';
import { ultimaNoticia, CAT_NOMBRE } from './lib/noticias.mjs';
import { blobToken } from './lib/video-link.mjs';
import { publishPhoto, facebookReady } from './facebook.mjs';
import { publishPhotoDraft } from './publish.mjs';
import { publishInstagramSeguro, instagramReady } from './instagram.mjs';
import { crearVisual, dibujarVisual, VISUALES } from './lib/retos-visuales.mjs';

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
      formato: 'reto', tarjeta: { formato: 'reto', tema: x.tema, icono: x.icono, texto: x.pregunta, opciones: x.opciones },
      texto: `🧠 ${x.pregunta}\n\nA) ${x.opciones[0]}\nB) ${x.opciones[1]}\nC) ${x.opciones[2]}\n\n¿Cuál elegirías? Piénsalo antes de ver la solución.${OCULTAR}✅ Respuesta: ${'ABC'[x.respuesta]}) ${ok}\n${x.explicacion}${ht(['reto', 'acertijo'])}`
    };
  }
  const formato = formatoPedido || azar(['sabias', 'sabias', 'sabias', 'vf', 'vf', 'vf', 'error', 'error']);
  if (formato === 'vf') {
    const verdadero = Math.random() < 0.5, afirm = verdadero ? x.dato : x.falso;
    return {
      formato, verdadero, tarjeta: { formato, tema: x.tema, icono: x.icono, texto: afirm },
      texto: `¿Verdadero o falso? 🤔\n\n«${afirm}»\n\n¿Tú qué dices? Piénsalo antes de ver la respuesta.${OCULTAR}${verdadero ? `✅ VERDADERO.\n${x.dato}` : `❌ FALSO.\n${x.explicacion}`}${ht(['verdaderoofalso'])}`
    };
  }
  if (formato === 'error') {
    // El falso de esta curiosidad y dos datos verdaderos del mismo tema
    const otros = mezclar(base.filter((y) => y.tema === x.tema && y.id !== x.id && y.dato)).slice(0, 2);
    const items = mezclar([{ t: x.falso, f: true }, ...otros.map((o) => ({ t: o.dato, f: false }))]), letra = 'ABC'[items.findIndex((i) => i.f)];
    return {
      formato, tarjeta: { formato, tema: x.tema, icono: x.icono, items: items.map((i) => i.t) },
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

async function main() {
  const o = parseCli({
    red: { type: 'string', default: 'facebook' }, tipo: { type: 'string', default: 'auto' }, 'noticia-cada': { type: 'string', default: '6' },
    formato: { type: 'string' }, id: { type: 'string' }, 'dry-run': { type: 'boolean', default: false }, instagram: { type: 'string', default: 'si' },
    // Un reto visual concreto: duplicado | nombre | diferente | fraccion | operacion
    visual: { type: 'string' }
  });
  const fx = setupNode(), emojiFont = fx.emoji ? `"${fx.emoji}"` : '';
  const hist = { ids: [], temas: [], noticias: [], total: 0, ...leer(HIST, {}) };
  const base = cargarBase();
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
    pieza = { formato: `visual-${tipo}`, texto: visual.texto };
  }
  if (!pieza) { x = elegirCuriosidad(base, hist, { formato: o.formato, id: o.id }); pieza = armar(x, base, o.formato); }
  const nombre = noticia ? `noticia-${noticia.cat}` : visual ? `${pieza.formato}-${Date.now().toString(36)}` : `${x.id}-${pieza.formato}`;
  console.error(`Elegido: ${nombre}`);

  const outDir = path.join(ROOT, 'out'); fs.mkdirSync(outDir, { recursive: true });
  const redes = o.red === 'ambas' ? ['facebook', 'tiktok'] : [o.red];
  const archivos = {};
  for (const red of redes) {
    const H = red === 'tiktok' ? 1920 : 1350, cv = visual ? dibujarVisual(visual, { H, emojiFont }) : dibujarTarjeta(pieza.tarjeta, { H, emojiFont });
    archivos[red] = path.join(outDir, `curiosidad-${nombre}-${red}.png`); fs.writeFileSync(archivos[red], cv.toBuffer('image/png'));
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
      if (red === 'facebook' && facebookReady()) {
        try { meta.facebook = await publishPhoto({ url: img.url, caption: pieza.texto }); }
        catch (e) { meta.facebook = { status: 'error', error: e.message }; console.error(`Aviso: Facebook: ${e.message}`); }
        // Instagram (cuenta vinculada a la página): la misma imagen en JPEG
        if (o.instagram !== 'no' && await instagramReady()) {
          const jpg = await subirImagen(archivos.instagram).catch(() => null);
          meta.instagram = jpg ? await publishInstagramSeguro({ tipo: 'imagen', url: jpg.url, caption: pieza.texto }) : { status: 'error', error: 'no se pudo subir el JPEG' };
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
