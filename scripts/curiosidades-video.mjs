#!/usr/bin/env node
// Reels de curiosidades y quiz (sin IA), de 50 a 59 s, para Facebook (Reel + historia):
//   top10     «10 cosas que no sabías hace 1 minuto» (10 datos reales, de un tema o mezclados)
//   quiz      «5 preguntas: ¿cuántas aciertas?» (verdadero o falso, un reto y un cálculo mental, con cuenta atrás)
//   banderas  «Adivina las 10 banderas» (de fácil a difícil, tres opciones del mismo continente)
//   node scripts/curiosidades-video.mjs --dry-run --formato quiz        (solo el video, en out/)
//   node scripts/curiosidades-video.mjs --dry-run --formato top10 --still 5   (un cuadro en PNG)
//   node scripts/curiosidades-video.mjs --facebook si --historia        (elige el formato que toca y publica)
// Datos: data/curiosidades/*.json. Historial (no repetir): data/curiosidades-video-historial.json (estado de Actions).
import fs from 'node:fs';
import path from 'node:path';
import { parseCli } from './lib/cli.mjs';
import { setupNode, ROOT } from './lib/node-env.mjs';
import { TEMAS } from './lib/tarjetas.mjs';
import { renderQuiz } from './lib/quiz-video.mjs';
import { publicarEnlace } from './lib/video-link.mjs';
import { publishReel, publishStory, facebookReady } from './facebook.mjs';
import { publishInstagramSeguro, instagramReady } from './instagram.mjs';
import { MELODIA_IDS } from '../src/melodias.js';

const DIR = path.join(ROOT, 'data', 'curiosidades');
const HIST = path.join(ROOT, 'data', 'curiosidades-video-historial.json'), HIST_IMG = path.join(ROOT, 'data', 'curiosidades-historial.json');
const leer = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const azar = (a) => a[Math.floor(Math.random() * a.length)];
const mezclar = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const OCULTAR = '\n\n.\n.\n.\n\n'; // lo que sigue queda debajo de «Ver más»
// Orden de los formatos (se repite): las banderas fueron lo que más vistas tuvo en Facebook e Instagram (informe del
// 2026-11-01), así que salen la mitad de las veces
const ROTACION = ['banderas', 'quiz', 'banderas', 'top10'];
const TEMAS_DATOS = ['animales', 'cuerpo', 'ciencia', 'geografia', 'historia', 'comida', 'deportes', 'tecnologia', 'inventos'];

// ---------- banderas ----------
// Países por continente (código ISO; el emoji y el nombre en español salen del código)
const CONTINENTES = {
  america: 'AR BO BR CL CO CR CU DO EC SV GT HN MX NI PA PY PE PR UY VE US CA JM HT TT BS BB BZ GY SR AG DM GD KN LC VC',
  europa: 'ES FR DE IT PT GB IE NL BE CH AT SE NO DK FI PL CZ SK HU RO BG GR HR RS SI BA ME AL MK UA LT LV EE IS LU MT CY MD RU BY AM GE AZ AD LI MC SM VA',
  asia: 'JP CN KR IN PK BD ID PH VN TH MY SG KH LA MM NP LK MN KZ UZ TR IR SA AE QA KW JO LB IQ OM YE BH BT MV BN TL TJ KG TM',
  africa: 'MA DZ TN EG NG GH CI SN CM KE ET TZ UG ZA ZW ZM AO MZ MG CD CG RW ML NE BF SO SD ER DJ LY MR GM GN GW SL LR TG BJ GA GQ CF TD BI MW LS SZ BW NA CV ST KM SC MU',
  oceania: 'AU NZ FJ PG WS TO SB VU KI TV NR PW FM MH'
};
const FACILES = 'MX AR BR ES US CA JP FR IT DE CO GB PT CN KR CL PE HN'.split(' ');
const MEDIOS = 'BO CR CU DO EC SV GT NI PA PY UY VE IE NL BE CH SE NO GR TR IN AU EG MA ZA RU'.split(' ');
const NOMBRE_FIJO = { CI: 'Costa de Marfil', CD: 'R. D. del Congo', CG: 'Congo', US: 'Estados Unidos', GB: 'Reino Unido' };
const nombres = new Intl.DisplayNames(['es'], { type: 'region' });
const nombrePais = (c) => NOMBRE_FIJO[c] || nombres.of(c);
const bandera = (c) => String.fromCodePoint(...[...c].map((l) => 0x1f1e6 + l.charCodeAt(0) - 65));
const continente = (c) => Object.keys(CONTINENTES).find((k) => CONTINENTES[k].split(' ').includes(c));
const TODOS = Object.values(CONTINENTES).join(' ').split(' ');

// ---------- elegir contenido ----------
export function cargarDatos() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).flatMap((f) => leer(path.join(DIR, f), []));
}
// Datos que no salieron hace poco (en videos ni en imágenes), preferidos los cortos (se leen en 5 s)
function disponibles(base, hist, filtro) {
  const usados = new Set([...hist.ids.slice(-Math.min(350, base.length - 60)), ...leer(HIST_IMG, { ids: [] }).ids.slice(-60)]);
  return mezclar(base.filter((x) => x.dato && !usados.has(x.id) && filtro(x)));
}
function tomar(lista, n, corto) {
  const cortos = lista.filter((x) => x.dato.length <= corto), largos = lista.filter((x) => x.dato.length > corto);
  return [...cortos, ...largos].slice(0, n);
}

// Cálculo mental generado (infinito): tres plantillas con una opción trampa
function calculo() {
  const tipo = entre(0, 2);
  let texto, ok, trampa, explicacion;
  if (tipo === 0) {
    const a = entre(3, 9), b = entre(3, 9), c = entre(4, 20);
    texto = `¿Cuánto es ${c} + ${a} × ${b}?`; ok = c + a * b; trampa = (c + a) * b;
    explicacion = `Primero la multiplicación: ${a} × ${b} = ${a * b}. Después ${c} + ${a * b} = ${ok}.`;
  } else if (tipo === 1) {
    const p = azar([10, 20, 25, 50, 75]), base = azar([40, 60, 80, 120, 160, 200, 240, 300, 400].filter((x) => x * p % 100 === 0));
    texto = `¿Cuánto es el ${p} % de ${base}?`; ok = base * p / 100; trampa = base - ok === ok ? ok + 10 : base - ok;
    explicacion = `${p} % es ${p}/100: ${base} × ${p} ÷ 100 = ${ok}.`;
  } else {
    const u = entre(2, 9), n1 = entre(2, 5), n2 = entre(6, 12);
    texto = `Si ${n1} lápices cuestan ${n1 * u}, ¿cuánto cuestan ${n2}?`; ok = u * n2; trampa = n1 * u + n2;
    explicacion = `Cada lápiz cuesta ${n1 * u} ÷ ${n1} = ${u}. Entonces ${n2} × ${u} = ${ok}.`;
  }
  const ops = new Set([ok, trampa]);
  while (ops.size < 3) { const d = ok + azar([-10, -6, -4, -2, 2, 4, 6, 10]); if (d > 0) ops.add(d); }
  const opciones = mezclar([...ops]);
  return { texto, opciones: opciones.map(String), respuesta: opciones.indexOf(ok), explicacion };
}

// ---------- escenas por formato ----------
const DATO = 5.2, INTRO = 2.6, CIERRE = 3.2;
const introSonidos = [[0, 'whoosh'], [0.05, 'pop'], [0.23, 'pop'], [0.41, 'pop'], [0.59, 'pop']];
// Tic-tac en cada segundo de la cuenta atrás y el sonido de la respuesta
const cuenta = (piensa, fin) => [[0, 'whoosh'], [0.05, 'pop'], ...Array.from({ length: Math.floor(piensa) - 1 }, (_, k) => [piensa - (k + 1), k < 2 ? 'tock' : 'tick']), [piensa, fin]];

function top10(base, hist, temaPedido) {
  // Uno de cada dos va mezclado; los demás, de un tema que rota
  const n = hist.formatos.filter((f) => f === 'top10').length;
  const tema = temaPedido || (n % 2 === 0 ? null : TEMAS_DATOS[Math.floor(n / 2) % TEMAS_DATOS.length]);
  let datos = tomar(disponibles(base, hist, (x) => !tema || x.tema === tema), 10, 115);
  if (datos.length < 10) datos = [...datos, ...tomar(disponibles(base, hist, (x) => !datos.includes(x)), 10 - datos.length, 115)];
  const T = tema ? TEMAS[tema] : null, temaFondo = tema || 'ciencia';
  const escenas = [
    { tipo: 'intro', dur: INTRO, tema: temaFondo, portada: true, sonidos: introSonidos, iconos: datos.slice(0, 5).map((d) => d.icono),
      lineas: [{ texto: '10 COSAS', size: 150, color: (T || TEMAS.ciencia).acento }, { texto: 'QUE NO SABÍAS', size: 96 }, { texto: 'HACE 1 MINUTO', size: 96 }, ...(T ? [{ texto: T.nombre.toUpperCase(), size: 50, color: 'rgba(255,255,255,0.8)' }] : [])] },
    ...datos.map((d, i) => ({ tipo: 'dato', dur: DATO, tema: d.tema, idx: i, total: 10, n: i + 1, icono: d.icono, texto: d.dato, sonidos: [[0, 'whoosh'], [0.05, 'pop']] })),
    { tipo: 'cierre', dur: CIERRE, tema: temaFondo, sonidos: [[0, 'final']],
      lineas: [{ texto: '¿CUÁNTAS SABÍAS?', size: 110, color: (T || TEMAS.ciencia).acento }, { texto: '¿Cuántas de las 10 ya sabías?', size: 64 }, { texto: 'Sigue a Potter Play para más', size: 50, color: 'rgba(255,255,255,0.8)' }] }
  ];
  const tags = ['curiosidades', 'sabiasque', 'datoscuriosos', 'aprende', ...(T ? T.tags : ['cultura']), 'reels', 'potterplay'];
  const texto = `🤯 10 cosas que no sabías hace 1 minuto${T ? ` · ${T.nombre}` : ''}\n\n¿Cuántas de las 10 ya sabías? Seguro hay una que te sorprendió.${OCULTAR}Las 10 de hoy:\n${datos.map((d, i) => `${i + 1}. ${d.dato}`).join('\n')}\n\n${[...new Set(tags)].map((t) => `#${t}`).join(' ')}`;
  return { formato: 'top10', titulo: `10 cosas que no sabías${T ? ` · ${T.nombre}` : ''}`, escenas, texto, ids: datos.map((d) => d.id) };
}

function quiz(base, hist) {
  const vf = tomar(disponibles(base, hist, (x) => x.falso), 3, 125);
  const usados = new Set(hist.retos.slice(-30));
  const reto = azar(base.filter((x) => x.tipo === 'reto' && !usados.has(x.id))) || azar(base.filter((x) => x.tipo === 'reto'));
  const calc = calculo();
  const preguntas = [
    ...vf.slice(0, 2).map((d) => ({ tipo: 'vf', d })), { tipo: 'reto', d: reto }, { tipo: 'vf', d: vf[2] }, { tipo: 'calc', d: calc }
  ];
  const respuestas = [];
  const escenas = [
    { tipo: 'intro', dur: INTRO, tema: 'inventos', portada: true, sonidos: introSonidos, iconos: ['🧠', '✅', '❌', '⏱️'],
      lineas: [{ texto: '5 PREGUNTAS', size: 140, color: TEMAS.inventos.acento }, { texto: '¿CUÁNTAS', size: 110 }, { texto: 'ACIERTAS?', size: 110 }, { texto: 'Cuenta tus puntos ✍️', size: 54, color: 'rgba(255,255,255,0.8)' }] },
    ...preguntas.map((p, i) => {
      const comun = { idx: i, total: 5 };
      if (p.tipo === 'vf') {
        const verdadero = Math.random() < 0.5, piensa = 6;
        respuestas.push(`${i + 1}. ${verdadero ? 'Verdadero' : 'Falso'}: ${p.d.dato}`);
        return { ...comun, tipo: 'vf', dur: piensa + 3.4, piensa, tema: p.d.tema, icono: p.d.icono, texto: verdadero ? p.d.dato : p.d.falso, real: p.d.dato, verdadero, sonidos: cuenta(piensa, verdadero ? 'bien' : 'mal') };
      }
      if (p.tipo === 'reto') {
        const piensa = 7;
        respuestas.push(`${i + 1}. ${'ABC'[p.d.respuesta]}) ${p.d.opciones[p.d.respuesta]}. ${p.d.explicacion}`);
        return { ...comun, tipo: 'opciones', dur: piensa + 3.6, piensa, tema: 'matematicas', etiqueta: 'RETO MENTAL 🧠', texto: p.d.pregunta, opciones: p.d.opciones, respuesta: p.d.respuesta, explicacion: p.d.explicacion, sonidos: cuenta(piensa, 'bien') };
      }
      const piensa = 5;
      respuestas.push(`${i + 1}. ${'ABC'[p.d.respuesta]}) ${p.d.opciones[p.d.respuesta]}. ${p.d.explicacion}`);
      return { ...comun, tipo: 'opciones', dur: piensa + 3.2, piensa, tema: 'matematicas', etiqueta: 'CÁLCULO MENTAL ⚡', texto: p.d.texto, opciones: p.d.opciones, respuesta: p.d.respuesta, explicacion: p.d.explicacion, sonidos: cuenta(piensa, 'bien') };
    }),
    { tipo: 'cierre', dur: CIERRE, tema: 'inventos', sonidos: [[0, 'final']],
      lineas: [{ texto: '¿CUÁNTAS ACERTASTE?', size: 104, color: TEMAS.inventos.acento }, { texto: '¿Cuántas de las 5 acertaste?', size: 64 }, { texto: 'Sigue a Potter Play para más', size: 50, color: 'rgba(255,255,255,0.8)' }] }
  ];
  const texto = `🧠 5 preguntas: ¿cuántas aciertas?\n\nVerdadero o falso, un reto y cálculo mental, con 5 segundos para pensar. ¿Cuántas de las 5 acertaste?${OCULTAR}Respuestas:\n${respuestas.join('\n')}\n\n#quiz #trivia #preguntas #curiosidades #retomental #sabiasque #reels #potterplay`;
  return { formato: 'quiz', titulo: '5 preguntas: ¿cuántas aciertas?', escenas, texto, ids: vf.map((d) => d.id), retos: [reto.id] };
}

function banderas(hist) {
  const recientes = new Set(hist.banderas.slice(-80));
  const elegir = (lista, n, ya) => mezclar(lista.filter((c) => !ya.has(c) && !recientes.has(c))).concat(mezclar(lista.filter((c) => !ya.has(c)))).filter((c, i, a) => a.indexOf(c) === i).slice(0, n);
  const ya = new Set();
  const paises = [];
  for (const [lista, n] of [[FACILES, 3], [MEDIOS.filter((c) => TODOS.includes(c)), 4], [TODOS.filter((c) => !FACILES.includes(c) && !MEDIOS.includes(c)), 3]]) {
    for (const c of elegir(lista, n, ya)) { ya.add(c); paises.push(c); }
  }
  const escenas = [
    { tipo: 'intro', dur: INTRO, tema: 'historia', portada: true, sonidos: introSonidos, iconos: mezclar(FACILES).slice(0, 5).map(bandera),
      lineas: [{ texto: 'ADIVINA', size: 120 }, { texto: 'LAS 10', size: 160, color: TEMAS.historia.acento }, { texto: 'BANDERAS', size: 120 }, { texto: 'De fácil a imposible 🔥', size: 54, color: 'rgba(255,255,255,0.8)' }] },
    ...paises.map((c, i) => {
      // Dos opciones falsas del mismo continente (más difícil que al azar)
      const otros = mezclar(CONTINENTES[continente(c)].split(' ').filter((x) => x !== c)).slice(0, 2);
      const ops = mezclar([c, ...otros]), piensa = 3;
      return { tipo: 'opciones', dur: piensa + 1.6, piensa, idx: i, total: 10, tema: 'historia', etiqueta: i < 3 ? 'FÁCIL 🟢' : i < 7 ? 'MEDIO 🟡' : 'DIFÍCIL 🔴',
        bandera: bandera(c), opciones: ops.map(nombrePais), respuesta: ops.indexOf(c), sonidos: cuenta(piensa, 'bien') };
    }),
    { tipo: 'cierre', dur: CIERRE, tema: 'historia', sonidos: [[0, 'final']],
      lineas: [{ texto: '¿CUÁNTAS ADIVINASTE?', size: 100, color: TEMAS.historia.acento }, { texto: '¿Cuántas de las 10 sacaste?', size: 64 }, { texto: 'Sigue a Potter Play para más', size: 50, color: 'rgba(255,255,255,0.8)' }] }
  ];
  const texto = `🌎 Adivina las 10 banderas: de fácil a imposible\n\nTienes 3 segundos por bandera. ¿Cuántas sacaste de 10? La última es la más difícil.${OCULTAR}Respuestas:\n${paises.map((c, i) => `${i + 1}. ${bandera(c)} ${nombrePais(c)}`).join('\n')}\n\n#banderas #geografia #quiz #trivia #paises #curiosidades #reels #potterplay`;
  return { formato: 'banderas', titulo: 'Adivina las 10 banderas', escenas, texto, banderas: paises };
}

// ---------- principal ----------
async function main() {
  const o = parseCli({
    formato: { type: 'string', default: 'auto' }, tema: { type: 'string' }, facebook: { type: 'string', default: 'si' },
    historia: { type: 'boolean', default: false }, instagram: { type: 'string', default: 'si' }, 'dry-run': { type: 'boolean', default: false }, still: { type: 'string' }
  });
  const fx = setupNode(), emojiFont = fx.emoji ? `"${fx.emoji}"` : '';
  const hist = { ids: [], retos: [], banderas: [], formatos: [], total: 0, ...leer(HIST, {}) };
  // Nunca dos formatos iguales seguidos (por ejemplo, después de una prueba a mano)
  let paso = hist.total;
  if (ROTACION[paso % ROTACION.length] === hist.formatos.at(-1)) paso++;
  const formato = o.formato !== 'auto' ? o.formato : ROTACION[paso % ROTACION.length];
  const base = cargarDatos();
  const pieza = formato === 'top10' ? top10(base, hist, o.tema) : formato === 'quiz' ? quiz(base, hist) : formato === 'banderas' ? banderas(hist) : null;
  if (!pieza) throw new Error('--formato debe ser top10, quiz, banderas o auto');
  console.error(`Formato: ${pieza.titulo}`);

  const outDir = path.join(ROOT, 'out'); fs.mkdirSync(outDir, { recursive: true });
  const nombre = `quiz-${pieza.formato}-${new Date().toISOString().slice(0, 10)}-${(hist.total + 1)}`;
  const melodia = MELODIA_IDS[hist.total % MELODIA_IDS.length];
  if (o.still != null) {
    const png = path.join(outDir, `${nombre}-${o.still}s.png`);
    await renderQuiz({ escenas: pieza.escenas, out: png, emojiFont, still: o.still, melodia });
    console.log(png); return;
  }
  const video = path.join(outDir, `${nombre}.mp4`);
  const r = await renderQuiz({ escenas: pieza.escenas, out: video, emojiFont, melodia });
  console.error(`${pieza.titulo} · ${r.duration.toFixed(1)} s · ${video}`);
  const meta = { kind: 'quiz', formato: pieza.formato, title: pieza.titulo, file: path.basename(video), duration: r.duration, post: { text: pieza.texto }, createdAt: new Date().toISOString() };
  const sidecar = video.replace(/\.mp4$/, '.json');

  if (!o['dry-run']) {
    const link = await publicarEnlace(video).catch((e) => { console.error(`No se pudo subir el video al almacén: ${e.message}`); return null; });
    if (link) { meta.videoUrl = link.url; meta.videoDownload = link.downloadUrl; }
    if (o.facebook !== 'no' && facebookReady()) {
      try { meta.facebook = await publishReel({ video, description: pieza.texto, draft: o.facebook === 'borrador' }); }
      catch (e) { meta.facebook = { status: 'error', error: e.message }; console.error(`Aviso: Facebook no publicó el Reel: ${e.message}`); }
      if (o.historia && o.facebook === 'si') {
        if (r.duration > 60) meta.facebookStory = { status: 'omitida', error: `dura ${Math.round(r.duration)} s y las historias admiten hasta 60 s` };
        else try { meta.facebookStory = await publishStory({ video }); }
        catch (e) { meta.facebookStory = { status: 'error', error: e.message }; console.error(`Aviso: Facebook no publicó la historia: ${e.message}`); }
      }
    }
    // Instagram (cuenta vinculada a la página): el mismo video desde el almacén, como Reel y como historia
    if (o.instagram !== 'no' && meta.videoUrl && await instagramReady()) {
      meta.instagram = await publishInstagramSeguro({ tipo: 'reel', url: meta.videoUrl, caption: pieza.texto });
      if (o.historia && r.duration <= 60) meta.instagramStory = await publishInstagramSeguro({ tipo: 'historia', url: meta.videoUrl });
    }
    hist.ids.push(...(pieza.ids || [])); hist.retos.push(...(pieza.retos || [])); hist.banderas.push(...(pieza.banderas || []));
    hist.formatos.push(pieza.formato); hist.total++;
    hist.ids = hist.ids.slice(-500); hist.retos = hist.retos.slice(-60); hist.banderas = hist.banderas.slice(-150); hist.formatos = hist.formatos.slice(-100);
    fs.writeFileSync(HIST, JSON.stringify(hist, null, 2) + '\n');
  }
  fs.writeFileSync(sidecar, JSON.stringify(meta, null, 2) + '\n');
  console.log(JSON.stringify({ video, duration: r.duration, facebook: meta.facebook, historia: meta.facebookStory }, null, 2));
}

main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
