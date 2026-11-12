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
import { registrarRespuesta } from './lib/respuestas.mjs';
import { publishVideo } from './publish.mjs';
import { logUpload } from './tiktok-status.mjs';
import { subirYouTube, youtubeReady } from './lib/youtube.mjs';
import { MELODIA_IDS } from '../src/melodias.js';
import { crearVisual, VISUALES } from './lib/retos-visuales.mjs';
import { crearDebate } from './lib/debate.mjs';
import { juntarNoticias, N_REEL, misma } from './lib/noticias.mjs';
import { yaSalieronDb, marcarPublicadas } from './lib/db.mjs';
import { cambiosDe, noticiasConCambios, noticiasGuardadas, guardarNoticias } from './lib/control.mjs';
import { hoyHN } from './lib/video3d-cola.mjs';
import { ponerFondos, guardarStock } from './lib/stock.mjs';
import { textoConTono, vozConTono, tonoDe } from './lib/tono.mjs';
import * as GEO from './lib/geo-retos.mjs';
import { hayArte, fondosVerticales, recortesAlAzar, CIERRE_GTA, CREDITO_GTA } from './lib/gta-arte.mjs';

const DIR = path.join(ROOT, 'data', 'curiosidades');
const HIST = path.join(ROOT, 'data', 'curiosidades-video-historial.json'), HIST_IMG = path.join(ROOT, 'data', 'curiosidades-historial.json');
const leer = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const azar = (a) => a[Math.floor(Math.random() * a.length)];
// Una línea que pide comentar (la gente casi no comentaba): se pone justo debajo de la primera línea de la descripción
const CTA = { banderas: 'Comenta cuántas sacaste 👇', geo: 'Comenta cuántas sacaste 👇', quiz: 'Comenta tu puntaje 👇', gtaquiz: 'Comenta cuántas sacaste 👇', retos: 'Comenta hasta qué nivel llegaste 👇', datos5: 'Comenta cuántas ya sabías 👇', top10: 'Comenta cuántas ya sabías 👇', prefieres: 'Comenta A o B 👇', emojis: 'Comenta cuántas adivinaste 👇', debate: 'Comenta tus 5 respuestas 👇', comosehace: 'Dime qué producto quieres ver 👇' };
const conCta = (texto, formato) => { const c = CTA[formato]; if (!c || texto.includes(c)) return texto; const i = texto.indexOf('\n'); return i < 0 ? `${texto}\n💬 ${c}` : `${texto.slice(0, i)}\n💬 ${c}${texto.slice(i)}`; };
const mezclar = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const OCULTAR = '\n\n.\n.\n.\n\n'; // lo que sigue queda debajo de «Ver más»
// Orden de los formatos (se repite cada 10; con 10 corridas al día que no son noticias, cada día cae en otro orden).
// Las banderas, lo que más vistas tuvo (informe del 2026-11-01), salen 2 de cada 10. Las noticias las pide el
// workflow en sus horarios (--formato noticias).
// Música propia (scripts/lib/musica.mjs) según el formato; dentro de cada lista, al azar
const ESTILO = { debate: ['lofi', 'pop'], comosehace: ['lofi', 'electro', 'pop'], banderas: ['pop', 'dembow', 'electro'], retos: ['electro', 'synthwave'], quiz: ['pop', 'electro'], prefieres: ['lofi', 'pop'], emojis: ['dembow', 'pop'], top10: ['lofi', 'pop', 'synthwave'], noticias: ['electro', 'synthwave'] };
// «Cómo se hace» tiene su propio workflow (como-se-hace.yml, 2 al día): no entra en la rotación de los Reels
const ROTACION = ['banderas', 'retos', 'quiz', 'prefieres', 'emojis', 'banderas', 'top10', 'retos', 'prefieres', 'quiz'];
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
    { tipo: 'intro', dur: INTRO, tema: temaFondo, portada: true, consulta: datos[0]?.foto, sonidos: introSonidos, iconos: datos.slice(0, 5).map((d) => d.icono),
      lineas: [{ texto: '10 COSAS', size: 150, color: (T || TEMAS.ciencia).acento }, { texto: 'QUE NO SABÍAS', size: 96 }, { texto: 'HACE 1 MINUTO', size: 96 }, ...(T ? [{ texto: T.nombre.toUpperCase(), size: 50, color: 'rgba(255,255,255,0.8)' }] : [])] },
    ...datos.map((d, i) => ({ tipo: 'dato', dur: DATO, tema: d.tema, idx: i, total: 10, n: i + 1, icono: d.icono, texto: d.dato, consulta: d.foto, sonidos: [[0, 'whoosh'], [0.05, 'pop']] })),
    { tipo: 'cierre', dur: CIERRE, tema: temaFondo, consulta: datos.at(-1)?.foto, sonidos: [[0, 'final']],
      lineas: [{ texto: '¿CUÁNTAS SABÍAS?', size: 110, color: (T || TEMAS.ciencia).acento }, { texto: '¿Cuántas de las 10 ya sabías?', size: 64 }, { texto: 'Sigue a Potter Play para más', size: 50, color: 'rgba(255,255,255,0.8)' }] }
  ];
  const tags = ['curiosidades', 'sabiasque', 'datoscuriosos', 'aprende', ...(T ? T.tags : ['cultura']), 'reels', 'potterplay'];
  const texto = `🤯 10 cosas que no sabías hace 1 minuto${T ? ` · ${T.nombre}` : ''}\n\n¿Cuántas de las 10 ya sabías? Seguro hay una que te sorprendió.${OCULTAR}Las 10 de hoy:\n${datos.map((d, i) => `${i + 1}. ${d.dato}`).join('\n')}\n\n${[...new Set(tags)].map((t) => `#${t}`).join(' ')}`;
  return { formato: 'top10', titulo: `10 cosas que no sabías${T ? ` · ${T.nombre}` : ''}`, escenas, texto, ids: datos.map((d) => d.id) };
}

// 5 cosas de un tema que nadie te contó (2026-11-09): lo mismo que el carrusel de datos de Facebook, pero en video con
// narrador y gancho (retiene más). Facebook sigue con las imágenes; este va a Instagram, TikTok y YouTube
const TEMA_CORTO = { animales: 'los animales', ciencia: 'el espacio', historia: 'la historia', deportes: 'el fútbol', inventos: 'los inventos', cuerpo: 'tu cuerpo', geografia: 'el mundo', comida: 'la comida', tecnologia: 'la tecnología' };
// «de» + «el espacio» → «del espacio»
const deTema = (t) => TEMA_CORTO[t].startsWith('el ') ? `del ${TEMA_CORTO[t].slice(3)}` : `de ${TEMA_CORTO[t]}`;
function datos5(base, hist, temaPedido) {
  const libres = (t) => disponibles(base, hist, (x) => x.tema === t && x.tipo !== 'reto');
  const ultimo = hist.temas5?.at(-1);
  const cand = Object.keys(TEMA_CORTO).map((t) => [t, libres(t).length]).filter(([t, n]) => n >= 5 && t !== ultimo).sort((a, b) => b[1] - a[1]);
  const tema = temaPedido && TEMA_CORTO[temaPedido] ? temaPedido : cand.length ? azar(cand.slice(0, 4))[0] : azar(Object.keys(TEMA_CORTO));
  const datos = tomar(libres(tema), 5, 120);
  if (datos.length < 5) return null;
  const T = TEMAS[tema] || TEMAS.ciencia, clave = `datos5|${new Date().toISOString().slice(0, 10)}|${tema}`;
  const escenas = [
    { tipo: 'intro', dur: INTRO + 0.6, tema, portada: true, consulta: datos[0].foto, sonidos: introSonidos, iconos: datos.map((d) => d.icono),
      lineas: [{ texto: '5 COSAS', size: 140, color: T.acento }, { texto: deTema(tema).toUpperCase(), size: 110 }, { texto: 'QUE NADIE TE CONTÓ', size: 84 }],
      voz: vozConTono(`Cinco cosas ${deTema(tema)} que nadie te contó.`, clave) },
    ...datos.map((d, i) => ({ tipo: 'dato', dur: DATO, tema, idx: i, total: datos.length, n: i + 1, icono: d.icono, texto: d.dato, consulta: d.foto, sonidos: [[0, 'whoosh'], [0.05, 'pop']],
      voz: `${i === 2 ? `${tonoDe(clave).medio} ` : ''}${d.dato}` })),
    { ...cierre(tema, '¿CUÁNTAS YA SABÍAS?', 'Comenta del 0 al 5'), voz: tonoDe(clave).cierre }
  ];
  const texto = `🤯 5 cosas ${deTema(tema)} que nadie te contó. ¿Cuántas ya sabías? Comenta del 0 al 5 👇${OCULTAR}Las 5:\n${datos.map((d, i) => `${i + 1}. ${d.dato}`).join('\n')}\n\n${tags('curiosidades', 'sabiasque', 'datoscuriosos', 'aprende', ...(T.tags || []))}`;
  return { formato: 'datos5', titulo: `5 cosas ${deTema(tema)} que nadie te contó`, escenas, texto, ids: datos.map((d) => d.id), tema5: tema };
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
        const verdadero = Math.random() < 0.5, piensa = 7;
        respuestas.push(`${i + 1}. ${verdadero ? 'Verdadero' : 'Falso'}: ${p.d.dato}`);
        return { ...comun, tipo: 'vf', dur: piensa + 3.4, piensa, tema: p.d.tema, consulta: p.d.foto, icono: p.d.icono, texto: verdadero ? p.d.dato : p.d.falso, real: p.d.dato, verdadero, sonidos: cuenta(piensa, verdadero ? 'bien' : 'mal') };
      }
      if (p.tipo === 'reto') {
        const piensa = 8;
        respuestas.push(`${i + 1}. ${'ABC'[p.d.respuesta]}) ${p.d.opciones[p.d.respuesta]}. ${p.d.explicacion}`);
        return { ...comun, tipo: 'opciones', dur: piensa + 3.6, piensa, tema: 'matematicas', etiqueta: 'RETO MENTAL 🧠', texto: p.d.pregunta, opciones: p.d.opciones, respuesta: p.d.respuesta, explicacion: p.d.explicacion, sonidos: cuenta(piensa, 'bien') };
      }
      const piensa = 6;
      respuestas.push(`${i + 1}. ${'ABC'[p.d.respuesta]}) ${p.d.opciones[p.d.respuesta]}. ${p.d.explicacion}`);
      return { ...comun, tipo: 'opciones', dur: piensa + 3.2, piensa, tema: 'matematicas', etiqueta: 'CÁLCULO MENTAL ⚡', texto: p.d.texto, opciones: p.d.opciones, respuesta: p.d.respuesta, explicacion: p.d.explicacion, sonidos: cuenta(piensa, 'bien') };
    }),
    { tipo: 'cierre', dur: CIERRE, tema: 'inventos', sonidos: [[0, 'final']],
      lineas: [{ texto: '¿CUÁNTAS ACERTASTE?', size: 104, color: TEMAS.inventos.acento }, { texto: '¿Cuántas de las 5 acertaste?', size: 64 }, { texto: 'Sigue a Potter Play para más', size: 50, color: 'rgba(255,255,255,0.8)' }] }
  ];
  const texto = `🧠 5 preguntas: ¿cuántas aciertas?\n\nVerdadero o falso, un reto y cálculo mental, con unos segundos para pensar cada una. ¿Cuántas de las 5 acertaste?${OCULTAR}Respuestas:\n${respuestas.join('\n')}\n\n#quiz #trivia #preguntas #curiosidades #retomental #sabiasque #reels #potterplay`;
  return { formato: 'quiz', titulo: '5 preguntas: ¿cuántas aciertas?', escenas, texto, ids: vf.map((d) => d.id), retos: [reto.id] };
}

function banderas(hist) {
  const recientes = new Set(hist.banderas.slice(-80));
  const elegir = (lista, n, ya) => mezclar(lista.filter((c) => !ya.has(c) && !recientes.has(c))).concat(mezclar(lista.filter((c) => !ya.has(c)))).filter((c, i, a) => a.indexOf(c) === i).slice(0, n);
  const ya = new Set();
  const paises = [];
  // 2026-11-10: «muy fáciles», decían en los comentarios → 2 fáciles, 3 medias, 3 difíciles y 2 GOD (de países que casi
  // nadie conoce), menos tiempo al final y la 9 pixelada
  for (const [lista, n] of [[FACILES, 2], [GEO.MEDIOS.filter((c) => TODOS.includes(c)), 3], [GEO.DIFICILES.filter((c) => TODOS.includes(c)), 3], [GEO.GOD.filter((c) => TODOS.includes(c)), 2]]) {
    for (const c of elegir(lista, n, ya)) { ya.add(c); paises.push(c); }
  }
  const escenas = [
    { tipo: 'intro', dur: INTRO, tema: 'historia', portada: true, sonidos: introSonidos, iconos: mezclar(FACILES).slice(0, 5).map(bandera),
      lineas: [{ texto: 'ADIVINA', size: 120 }, { texto: 'LAS 10', size: 160, color: TEMAS.historia.acento }, { texto: 'BANDERAS', size: 120 }, { texto: 'De fácil a GOD 💀', size: 54, color: 'rgba(255,255,255,0.8)' }] },
    ...paises.map((c, i) => {
      // Dos opciones falsas del mismo continente (más difícil que al azar)
      const otros = mezclar(CONTINENTES[continente(c)].split(' ').filter((x) => x !== c)).slice(0, 2);
      const ops = mezclar([c, ...otros]), piensa = [3.5, 3.5, 3.5, 3.5, 3.5, 3, 3, 3, 3.5, 2.5][i];
      return { tipo: 'opciones', dur: piensa + 1.6, piensa, idx: i, total: 10, tema: 'historia', etiqueta: i < 2 ? 'FÁCIL 🟢' : i < 5 ? 'MEDIO 🟡' : i < 8 ? 'DIFÍCIL 🟠' : i === 8 ? 'IMPOSIBLE 🔴 · PIXELADA' : 'GOD 💀 · 2 SEGUNDOS',
        geo: { c, modo: i === 8 ? 'pixel' : 'bandera' }, opciones: ops.map(nombrePais), respuesta: ops.indexOf(c), sonidos: cuenta(piensa, 'bien') };
    }),
    { tipo: 'cierre', dur: CIERRE, tema: 'historia', sonidos: [[0, 'final']],
      lineas: [{ texto: '¿CUÁNTAS ADIVINASTE?', size: 100, color: TEMAS.historia.acento }, { texto: '¿Cuántas de las 10 sacaste?', size: 64 }, { texto: 'Sigue a Potter Play para más', size: 50, color: 'rgba(255,255,255,0.8)' }] }
  ];
  const texto = `🌎 Adivina las 10 banderas: de fácil a GOD 💀\n\nMenos de 4 segundos por bandera, una pixelada y la última en 2 segundos. Si sacas 10 de 10, comenta «GOD» 👇${OCULTAR}Respuestas:\n${paises.map((c, i) => `${i + 1}. ${bandera(c)} ${nombrePais(c)}`).join('\n')}\n\n#banderas #geografia #quiz #trivia #paises #curiosidades #reels #potterplay`;
  return { formato: 'banderas', titulo: 'Adivina las 10 banderas', escenas, texto, banderas: paises };
}

// ---------- retos de geografía difíciles (2026-11-10; scripts/lib/geo-retos.mjs) ----------
// «geo» rota entre: mixto (10 retos distintos, de fácil a GOD), siluetas, gemelas y capitales trampa
const VARIANTES_GEO = ['mixto', 'siluetas', 'gemelas', 'mixto', 'capitales'];
const NIVEL = (i, n) => { const k = i / (n - 1); return k < 0.2 ? 'FÁCIL 🟢' : k < 0.5 ? 'MEDIO 🟡' : k < 0.8 ? 'DIFÍCIL 🟠' : i === n - 1 ? 'GOD 💀' : 'IMPOSIBLE 🔴'; };
const RED_GEO = (c) => continente(c) || GEO.continenteDe(c);
// Dos países falsos del mismo continente (si se puede, que también tengan silueta)
function otrosDe(c, { silueta = false } = {}) {
  const cont = continente(c), base = cont ? CONTINENTES[cont].split(' ') : TODOS;
  return mezclar(base.filter((x) => x !== c && (!silueta || GEO.tieneSilueta(x)))).slice(0, 2);
}
// Siluetas que se reconocen (con forma: no islitas de pocos puntos)
const conForma = (c) => {
  const x = GEO.siluetas()[c]; if (!x) return false;
  const pts = x.r.reduce((a, r) => a + r.length, 0), mayor = Math.max(...x.r.map((r) => r.length));
  // Archipiélagos de islitas sueltas (Islas Marshall, Kiribati…) no se reconocen: fuera
  return c !== 'KI' && pts >= 22 && mayor >= pts * 0.45 && x.r.length <= 8;
};
const SIL_FACILES = 'IT CL BR MX US AR JP IN AU ES GB FR CA RU CN EG'.split(' ').filter(conForma);
const SIL_MEDIOS = 'HN CU PE CO VE NO SE GR TR PH ID NZ MG PT DE UA KR VN TH ZA SA IR NG KE'.split(' ').filter(conForma);
const SIL_DIFICILES = GEO.DIFICILES.filter(conForma), SIL_GOD = GEO.GOD.filter(conForma);

function nuevoUso(hist, clave, lista, n, ya = new Set()) {
  const recientes = new Set((hist[clave] || []).slice(-Math.max(0, lista.length - n * 2)));
  return mezclar(lista.filter((x) => !ya.has(x) && !recientes.has(x))).concat(mezclar(lista.filter((x) => !ya.has(x)))).filter((x, i, a) => a.indexOf(x) === i).slice(0, n);
}
// Un reto suelto de cada tipo → { escena, respuesta (para la descripción) }
const RETO = {
  bandera(c, i, n, piensa = 3.5, modo = 'bandera', extra = '') {
    const ops = mezclar([c, ...otrosDe(c)]);
    return { escena: { tipo: 'opciones', dur: piensa + 1.6, piensa, idx: i, total: n, tema: 'geografia', etiqueta: `${NIVEL(i, n)}${extra}`, geo: { c, modo, foco: [0.2 + Math.random() * 0.6, 0.25 + Math.random() * 0.5] }, opciones: ops.map(nombrePais), respuesta: ops.indexOf(c), sonidos: cuenta(piensa, 'bien') }, respuesta: `${bandera(c)} ${nombrePais(c)}` };
  },
  silueta(c, i, n, piensa = 4.5) {
    const ops = mezclar([c, ...otrosDe(c, { silueta: true })]);
    return { escena: { tipo: 'opciones', dur: piensa + 1.8, piensa, idx: i, total: n, tema: 'geografia', etiqueta: `${NIVEL(i, n)} · SILUETA`, pregunta: '¿Qué país es?', geo: { c, modo: 'silueta' }, opciones: ops.map(nombrePais), respuesta: ops.indexOf(c), sonidos: cuenta(piensa, 'bien') }, respuesta: `Silueta: ${nombrePais(c)} ${bandera(c)}` };
  },
  capital([c, ok, ...trampas], i, n, piensa = 4.5) {
    const ops = mezclar([ok, ...trampas.slice(0, 2)]);
    return { escena: { tipo: 'opciones', dur: piensa + 2.2, piensa, idx: i, total: n, tema: 'geografia', etiqueta: `${NIVEL(i, n)} · CAPITAL`, texto: `¿Cuál es la capital de ${nombrePais(c)}? ${bandera(c)}`, opciones: ops, respuesta: ops.indexOf(ok), explicacion: `La capital de ${nombrePais(c)} es ${ok}, no ${trampas[0]}.`, sonidos: cuenta(piensa, 'bien') }, respuesta: `Capital de ${nombrePais(c)}: ${ok}` };
  },
  continente(c, i, n, piensa = 4) {
    const ok = GEO.continenteDe(c), ops = mezclar([ok, ...mezclar(Object.keys(GEO.CONTINENTE_DIFICIL).filter((x) => x !== ok)).slice(0, 2)]);
    return { escena: { tipo: 'opciones', dur: piensa + 1.8, piensa, idx: i, total: n, tema: 'geografia', etiqueta: `${NIVEL(i, n)} · CONTINENTE`, pregunta: '¿De qué continente es?', revela: `Es ${nombrePais(c)}`, geo: { c, modo: 'bandera' }, opciones: ops, respuesta: ops.indexOf(ok), sonidos: cuenta(piensa, 'bien') }, respuesta: `${bandera(c)} ${nombrePais(c)}: ${ok}` };
  },
  gemelas(grupo, i, n, piensa = 4.5) {
    const items = mezclar(grupo).map((c) => ({ c, nota: nombrePais(c) })), k = Math.floor(Math.random() * items.length);
    return { escena: { tipo: 'cuadros', dur: piensa + 2.2, piensa, idx: i, total: n, tema: 'geografia', etiqueta: `${NIVEL(i, n)} · GEMELAS`, pregunta: `¿Cuál es la bandera de ${nombrePais(items[k].c)}?`, items, respuesta: k, sonidos: cuenta(piensa, 'bien') }, respuesta: `Gemelas: ${items.map((x, j) => `${'ABCD'[j]}) ${x.nota}`).join(', ')}` };
  },
  real(c, falsas, i, n, piensa = 5) {
    const NOTA = { espejo: 'ESPEJO', volteada: 'AL REVÉS', giro: 'GIRADA', colores: 'COLORES', colores2: 'COLORES' };
    const items = mezclar([{ c, v: 'real', nota: '✅ REAL' }, ...falsas.map((v) => ({ c, v, nota: NOTA[v] }))]);
    return { escena: { tipo: 'cuadros', dur: piensa + 2.2, piensa, idx: i, total: n, tema: 'geografia', etiqueta: `${NIVEL(i, n)} · ¿CUÁL ES LA REAL?`, pregunta: `¿Cuál es la bandera REAL de ${nombrePais(c)}?`, items, respuesta: items.findIndex((x) => x.v === 'real'), sonidos: cuenta(piensa, 'bien') }, respuesta: `La real de ${nombrePais(c)}: la ${'ABCD'[items.findIndex((x) => x.v === 'real')]}` };
  }
};
function geoVideo(hist, emojiFam, pedida) {
  const variante = VARIANTES_GEO.includes(pedida) ? pedida : VARIANTES_GEO[(hist.geoN || 0) % VARIANTES_GEO.length];
  const ya = new Set(), retos = [], usados = { banderas: [], capitales: [], gemelas: [] };
  const uno = (clave, lista, n = 1) => { const r = nuevoUso(hist, clave, lista, n, ya); r.forEach((x) => { ya.add(x); usados[clave === 'capitales' ? 'capitales' : 'banderas'].push(x); }); return r; };
  const conBandera = (l) => l.filter((c) => GEO.banderaValida(c, emojiFam));
  let titulo, lineas, texto0, n;
  if (variante === 'siluetas') {
    n = 10; titulo = 'Adivina el país por su silueta';
    const lista = [...uno('banderas', SIL_FACILES, 2), ...uno('banderas', SIL_MEDIOS, 3), ...uno('banderas', SIL_DIFICILES, 3), ...uno('banderas', SIL_GOD, 2)];
    lista.forEach((c, i) => retos.push(RETO.silueta(c, i, n, [4.5, 4.5, 4.5, 4, 4, 4, 3.5, 3.5, 3.5, 3][i])));
    lineas = [{ texto: 'ADIVINA', size: 120 }, { texto: 'EL PAÍS', size: 150, color: TEMAS.geografia.acento }, { texto: 'POR SU SILUETA', size: 96 }];
    texto0 = '🗺️ Adivina el país solo por su silueta: de fácil a GOD 💀. ¿Cuántas sacas de 10? Comenta tu puntaje 👇';
  } else if (variante === 'gemelas') {
    n = 8; titulo = 'Banderas gemelas: ¿cuál es cuál?';
    const grupos = nuevoUso(hist, 'gemelas', GEO.GEMELAS.map((g) => g.join('-')), n).map((g) => g.split('-'));
    usados.gemelas = grupos.map((g) => g.join('-'));
    grupos.forEach((g, i) => retos.push(RETO.gemelas(g, i, n, i < 3 ? 4.5 : 4)));
    lineas = [{ texto: 'BANDERAS', size: 130 }, { texto: 'GEMELAS', size: 150, color: TEMAS.geografia.acento }, { texto: '¿CUÁL ES CUÁL?', size: 96 }];
    texto0 = '👯 Banderas gemelas: casi iguales, pero no. ¿Cuántas distingues de 8? El 90 % falla la última 👇';
  } else if (variante === 'capitales') {
    n = 10; titulo = 'Capitales trampa';
    const lista = nuevoUso(hist, 'capitales', GEO.CAPITALES.map((x) => x[0]), n);
    usados.capitales = lista;
    lista.forEach((c, i) => retos.push(RETO.capital(GEO.CAPITALES.find((x) => x[0] === c), i, n, [4.5, 4.5, 4, 4, 4, 4, 3.5, 3.5, 3.5, 3][i])));
    lineas = [{ texto: 'CAPITALES', size: 130, color: TEMAS.geografia.acento }, { texto: 'TRAMPA', size: 150 }, { texto: 'Casi todos dicen la ciudad famosa', size: 50, color: 'rgba(255,255,255,0.85)' }];
    texto0 = '🏛️ Capitales trampa: la respuesta NO es la ciudad más famosa. ¿Cuántas sacas de 10? Comenta tu puntaje 👇';
  } else {
    n = 10; titulo = '10 retos de geografía: de fácil a GOD';
    const realDe = mezclar(conBandera([...GEO.MEDIOS, ...FACILES])).map((c) => [c, GEO.falsas(c, emojiFam)]).find(([c, fs]) => fs && !ya.has(c));
    const gem = nuevoUso(hist, 'gemelas', GEO.GEMELAS.map((g) => g.join('-')), 1)[0].split('-'); usados.gemelas = [gem.join('-')];
    const cap = nuevoUso(hist, 'capitales', GEO.CAPITALES.map((x) => x[0]), 1)[0]; usados.capitales = [cap];
    const cont = uno('banderas', conBandera(Object.values(GEO.CONTINENTE_DIFICIL).join(' ').split(' ')))[0];
    retos.push(
      RETO.bandera(uno('banderas', conBandera(FACILES))[0], 0, n, 3),
      RETO.capital(GEO.CAPITALES.find((x) => x[0] === cap), 1, n, 4),
      RETO.gemelas(gem, 2, n, 4),
      RETO.silueta(uno('banderas', SIL_MEDIOS)[0], 3, n, 4),
      RETO.bandera(uno('banderas', conBandera(GEO.MEDIOS))[0], 4, n, 4, 'pixel', ' · PIXELADA'),
      realDe ? RETO.real(realDe[0], realDe[1], 5, n, 4.5) : RETO.bandera(uno('banderas', conBandera(GEO.DIFICILES))[0], 5, n, 3.5),
      RETO.continente(cont, 6, n, 3.5),
      RETO.bandera(uno('banderas', conBandera(GEO.DIFICILES))[0], 7, n, 4, 'zoom', ' · ZOOM'),
      RETO.silueta(uno('banderas', SIL_DIFICILES)[0], 8, n, 3.5),
      RETO.bandera(uno('banderas', conBandera(GEO.GOD))[0], 9, n, 2.5, 'bandera', ' · 2 SEGUNDOS')
    );
    lineas = [{ texto: '10 RETOS', size: 140, color: TEMAS.geografia.acento }, { texto: 'DE GEOGRAFÍA', size: 110 }, { texto: 'De fácil a GOD 💀', size: 60, color: 'rgba(255,255,255,0.85)' }];
    texto0 = '🌎 10 retos de geografía de fácil a GOD 💀: banderas, siluetas, capitales trampa, gemelas, pixelada y una falsa. ¿Hasta qué nivel llegas? Comenta tu puntaje 👇';
  }
  const iconos = mezclar(conBandera(FACILES)).slice(0, 5).map(bandera);
  const escenas = [
    { tipo: 'intro', dur: INTRO, tema: 'geografia', portada: true, sonidos: introSonidos, iconos, lineas },
    ...retos.map((r) => r.escena),
    cierre('geografia', '¿CUÁNTAS SACASTE?', `Comenta tu puntaje de ${n}`)
  ];
  const texto = `${texto0}${OCULTAR}Respuestas:\n${retos.map((r, i) => `${i + 1}. ${r.respuesta}`).join('\n')}\n\n${tags('geografia', 'banderas', 'paises', 'quiz', 'trivia', 'retos')}`;
  return { formato: 'geo', variante, titulo, escenas, texto, banderas: usados.banderas, geo: usados };
}

// ---------- «¿Cuánto sabes de GTA?» (semana del lanzamiento de GTA VI, 2026-11-11) ----------
// 8 preguntas de data/gta6.json (quiz: cada una sale de un dato con fuente), de fácil a GOD, sin repetir las últimas
function gtaQuiz(hist) {
  const D = leer(path.join(ROOT, 'data', 'gta6.json'), { quiz: [] }), n = 8;
  const usadas = new Set((hist.gtaquiz || []).slice(-Math.max(0, D.quiz.length - n)));
  const qs = mezclar(D.quiz.filter((q) => !usadas.has(q.id))).concat(mezclar(D.quiz)).filter((q, i, a) => a.indexOf(q) === i).slice(0, n);
  const respuestas = [];
  const escenas = [
    { tipo: 'intro', dur: INTRO, tema: 'gta', portada: true, consulta: 'miami ocean drive neon night', sonidos: introSonidos, iconos: ['🌴', '🎮', '🚗', '🌅', '💵'],
      lineas: [{ texto: '¿CUÁNTO SABES', size: 110 }, { texto: 'DE GTA?', size: 170, color: TEMAS.gta.acento }, { texto: '8 preguntas · de fácil a GOD 💀', size: 54, color: 'rgba(255,255,255,0.85)' }] },
    ...qs.map((q, i) => {
      const ops = mezclar([q.ok, ...q.malas]), piensa = i < 6 ? 4 : 3.5;
      respuestas.push(`${i + 1}. ${q.ok}`);
      return { tipo: 'opciones', dur: piensa + 1.9, piensa, idx: i, total: n, tema: 'gta', etiqueta: `${NIVEL(i, n)} · GTA`, texto: `${q.p} ${q.icono}`, opciones: ops, respuesta: ops.indexOf(q.ok), sonidos: cuenta(piensa, 'bien') };
    }),
    { ...cierre('gta', '¿CUÁNTAS SACASTE?', 'Sale el 19 de noviembre · comenta tu puntaje'), consulta: 'miami sunset palm trees' }
  ];
  // Arte oficial de GTA VI de fondo (con crédito): la portada con recortes del póster y el póster en el cierre
  if (hayArte()) {
    const fa = fondosVerticales(escenas.length);
    escenas.forEach((e, i) => { e.imagen = e.tipo === 'cierre' ? CIERRE_GTA : fa[i]; e.credito = CREDITO_GTA; delete e.consulta; });
    escenas[0].recortes = recortesAlAzar(4);
  }
  const texto = `🎮 ¿Cuánto sabes de GTA? 8 preguntas de fácil a GOD 💀 antes del lanzamiento de GTA VI (19 de noviembre). Comenta cuántas sacaste 👇${OCULTAR}Respuestas:\n${respuestas.join('\n')}\n\n${tags('gta6', 'gtavi', 'gta', 'videojuegos', 'quiz', 'gaming')}`;
  return { formato: 'gtaquiz', titulo: '¿Cuánto sabes de GTA?', escenas, texto, gtaquiz: qs.map((q) => q.id) };
}

// ---------- retos visuales, ¿qué prefieres?, emojis y noticias (2026-11-01) ----------
const cierre = (tema, l1, l2) => ({ tipo: 'cierre', dur: CIERRE, tema, sonidos: [[0, 'final']],
  lineas: [{ texto: l1, size: 100, color: TEMAS[tema].acento }, { texto: l2, size: 62 }, { texto: 'Sigue a Potter Play para más', size: 50, color: 'rgba(255,255,255,0.8)' }] });
const tags = (...t) => [...t, 'reels', 'potterplay'].map((x) => `#${x}`).join(' ');

function retosVideo() {
  // De fácil a GOD: un tipo distinto en cada nivel
  // 5 de los 6 tipos, cada uno en un nivel (el primero ya cuesta; el GOD de verdad)
  const vs = mezclar(VISUALES).slice(0, 5).map((t, i) => crearVisual(t, i));
  const NOMBRE_TIPO = { duplicado: 'número repetido', diferente: 'letra escondida', color: 'círculo de otro tono', fraccion: 'fracción', operacion: 'operación', nombre: 'nombre' };
  const escenas = [
    { tipo: 'intro', dur: INTRO, tema: 'matematicas', portada: true, sonidos: introSonidos, iconos: ['👀', '🔎', '🧮', '✍️', '🎨'],
      lineas: [{ texto: '5 RETOS', size: 150, color: TEMAS.matematicas.acento }, { texto: 'DE FÁCIL A GOD', size: 104 }, { texto: 'El 90 % no pasa del nivel 3', size: 58, color: 'rgba(255,255,255,0.85)' }] },
    // Los de buscar (número repetido, letra escondida, tono) tienen más tiempo
    ...vs.map((v, i) => { const piensa = ['duplicado', 'diferente', 'color'].includes(v.tipo) ? 9 : 7; return { tipo: 'visual', dur: piensa + 2.6, piensa, idx: i, total: vs.length, tema: 'matematicas', visual: v, sonidos: cuenta(piensa, 'bien') }; }),
    cierre('matematicas', '¿HASTA QUÉ NIVEL LLEGASTE?', 'Del 1 (fácil) al 5 (GOD)')
  ];
  const texto = `👀 5 retos visuales de fácil a GOD 💀: ${vs.map((v) => NOMBRE_TIPO[v.tipo]).join(', ').replace(/, ([^,]+)$/, ' y $1')}. ¿Hasta qué nivel llegas antes de que se acabe el tiempo?${OCULTAR}Respuestas:\n${vs.map((v, i) => `${i + 1}. ${v.corta.replace(/[¡!]/g, '')}`).join('\n')}\n\n${tags('retos', 'acertijos', 'retovisual', 'juegosmentales', 'agilidadmental')}`;
  return { formato: 'retos', titulo: '5 retos visuales: de fácil a GOD', escenas, texto, clave: { modo: 'puntaje', max: vs.length } };
}

// ---------- retos de debate (2026-11-06): «5 retos que dividen a internet» ----------
// Los tres tipos de scripts/lib/debate.mjs mezclados (error a propósito, «el 90 % falla», «¿cuántos ves?»). La
// respuesta no sale en el video: el bot la publica en los comentarios unas horas después (clave «debate»)
function debateVideo() {
  const tipos = mezclar(['error', 'divide', 'cuenta', 'error', azar(['divide', 'cuenta'])]), vistos = new Set(), ds = [];
  for (const t of tipos) { let d, k = 0; do { d = crearDebate(t); } while (vistos.has(d.pregunta) && ++k < 20); vistos.add(d.pregunta); ds.push(d); }
  const ESCRIBE = 2.6, PIENSA = 5;
  const sonidos = (escribe, piensa) => [[0, 'whoosh'], [0.05, 'pop'], ...Array.from({ length: piensa - 1 }, (_, k) => [escribe + piensa - (k + 1), k < 2 ? 'tock' : 'tick']), [escribe + piensa, 'pop']];
  const escenas = [
    { tipo: 'intro', dur: 2.6, tema: 'debate', portada: true, sonidos: introSonidos, iconos: ['🤯', '✏️', '🧮', '👀', '🔥'], voz: 'Cinco retos que dividen a internet.',
      lineas: [{ texto: '5 RETOS', size: 150, color: TEMAS.debate.acento }, { texto: 'QUE DIVIDEN', size: 110 }, { texto: 'A INTERNET', size: 110 }, { texto: 'Comenta tus 5 respuestas', size: 56, color: 'rgba(255,255,255,0.85)' }] },
    ...ds.map((d, i) => ({ tipo: 'debate', dur: ESCRIBE + PIENSA + 2.8, escribe: ESCRIBE, piensa: PIENSA, idx: i, total: ds.length, tema: 'debate', debate: d, voz: d.voz, sonidos: sonidos(ESCRIBE, PIENSA) })),
    { ...cierre('debate', 'COMENTA TUS 5 RESPUESTAS', 'En unas horas te digo quién acertó'), voz: 'Deja tus cinco respuestas en los comentarios. En unas horas te digo quién acertó.' }
  ];
  const texto = `🤯 5 retos que dividen a internet. Comenta así: 1) … 2) … 3) … 4) … 5) …\n¿Cuál te hizo dudar más? 👇${OCULTAR}Las respuestas, en los comentarios en unas horas 👀\n\n${tags('retos', 'debate', 'acertijos', 'matematicas', 'logica')}`;
  const revelar = `✅ Las respuestas:\n${ds.map((d, i) => `${i + 1}) ${d.correcta}. ${d.explica}`).join('\n')}\n¿Cuántas sacaste? 👀`;
  return { formato: 'debate', titulo: '5 retos que dividen a internet', escenas, texto, clave: { modo: 'debate', revelar } };
}

function prefieresVideo(hist) {
  const base = leer(path.join(ROOT, 'data', 'prefieres.json'), []), usados = new Set(hist.prefieres.slice(-120));
  const elegidos = mezclar(base.filter((x) => !usados.has(x.id))).concat(mezclar(base)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 8);
  if (elegidos.length < 8) return null;
  const escenas = [
    { tipo: 'intro', dur: INTRO, tema: 'prefieres', portada: true, sonidos: introSonidos, iconos: elegidos.slice(0, 3).flatMap((x) => [x.icono_a, x.icono_b]).slice(0, 5),
      lineas: [{ texto: '¿QUÉ', size: 150, color: TEMAS.prefieres.acento }, { texto: 'PREFIERES?', size: 130 }, { texto: '8 decisiones imposibles', size: 58, color: 'rgba(255,255,255,0.85)' }] },
    ...elegidos.map((x, i) => ({ tipo: 'prefieres', dur: 6.3, piensa: 4.5, idx: i, total: 8, tema: 'prefieres', a: x.a, b: x.b, icono_a: x.icono_a, icono_b: x.icono_b, consultaA: x.foto_a, consultaB: x.foto_b, sonidos: cuenta(4.5, 'bien') })),
    cierre('prefieres', '¿CUÁL FUE LA MÁS DIFÍCIL?', 'Seguro hubo una que te hizo dudar 🤔')
  ];
  const texto = `🤔 ¿Qué prefieres? 8 decisiones imposibles en menos de un minuto.\n\n${elegidos.map((x, i) => `${i + 1}. ${x.icono_a} ${x.a} o ${x.icono_b} ${x.b}`).join('\n')}\n\n¿Cuál fue la más difícil para ti?\n\n${tags('queprefieres', 'dilemas', 'preguntas', 'juegos')}`;
  return { formato: 'prefieres', titulo: '¿Qué prefieres?', escenas, texto, prefieres: elegidos.map((x) => x.id) };
}

const CATEGORIA_EMOJI = { pelicula: '🎬 PELÍCULA', serie: '📺 SERIE', cancion: '🎵 CANCIÓN', pais: '🌎 PAÍS', personaje: '🦸 PERSONAJE', refran: '💬 REFRÁN' };
function emojisVideo(hist) {
  const base = leer(path.join(ROOT, 'data', 'emojis.json'), []), usados = new Set(hist.emojis.slice(-130));
  // De más fácil a más difícil
  const elegidos = mezclar(base.filter((x) => !usados.has(x.id))).concat(mezclar(base)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 8).sort((a, b) => a.dificultad - b.dificultad);
  if (elegidos.length < 8) return null;
  const escenas = [
    { tipo: 'intro', dur: INTRO, tema: 'emojis', portada: true, sonidos: introSonidos, iconos: ['🎬', '🎵', '🌎', '🦸', '💬'],
      lineas: [{ texto: 'ADIVINA', size: 130 }, { texto: 'CON EMOJIS', size: 130, color: TEMAS.emojis.acento }, { texto: 'Películas, canciones, países…', size: 56, color: 'rgba(255,255,255,0.85)' }] },
    ...elegidos.map((x, i) => ({ tipo: 'emoji', dur: 6.6, piensa: 4, idx: i, total: 8, tema: 'emojis', etiqueta: CATEGORIA_EMOJI[x.categoria] || '🤔 ADIVINA', emojis: x.emojis, respuesta: x.respuesta, sonidos: cuenta(4, 'bien') })),
    cierre('emojis', '¿CUÁNTAS ADIVINASTE?', '¿Cuántas de las 8 sacaste?')
  ];
  const texto = `🤔 Adivina con emojis: películas, canciones, países y más. 4 segundos para cada una. ¿Cuántas sacas de 8?${OCULTAR}Respuestas:\n${elegidos.map((x, i) => `${i + 1}. ${x.emojis} → ${x.respuesta}`).join('\n')}\n\n${tags('adivina', 'emojis', 'retos', 'peliculas', 'juegos')}`;
  return { formato: 'emojis', titulo: 'Adivina con emojis', escenas, texto, emojis: elegidos.map((x) => x.id), clave: { modo: 'puntaje', max: 8 } };
}

const ETIQUETA_NOTICIA = { videojuegos: '🎮 VIDEOJUEGOS', futbol: '⚽ FÚTBOL', ciencia: '🔭 CIENCIA', tecnologia: '📱 TECNOLOGÍA', general: '📰 NOTICIA' };
const FONDO_NOTICIA = { videojuegos: ['video game controller', 'gamer neon room', 'arcade lights'], futbol: ['soccer stadium crowd', 'soccer ball grass', 'football fans stadium'], ciencia: ['galaxy stars space', 'science laboratory', 'earth from space'], tecnologia: ['smartphone technology', 'circuit board macro', 'data center lights'], general: ['newspaper printing', 'city news'] };
async function noticiasVideo(hist) {
  // Las del día las junta noticias.yml (scripts/noticias.mjs, ya ordenadas por importancia); si no están, se leen ahora.
  // Encima van tus cambios por Telegram: las que quitaste no salen, las fijadas y las tuyas van primero
  // La lista más nueva entre la del estado (6:23) y la del almacén (la que actualizas desde el bot); si tiene más de
  // 2 horas se vuelve a juntar (y se guarda, para que el bot muestre la misma numeración)
  const enDb = await yaSalieronDb(10); // lo publicado o descartado en la base de noticias (Supabase)
  const local = leer(path.join(ROOT, 'data', 'noticias-hoy.json'), {}), enBot = await noticiasGuardadas(hoyHN()).catch(() => ({ at: 0, items: [] }));
  let { at, items: lista } = enBot.at >= (Date.parse(local.fecha) || 0) && enBot.items.length ? enBot : { at: Date.parse(local.fecha) || 0, items: local.items || [] };
  if (lista.length < 4 || Date.now() - at > 2 * 3600e3) {
    const nuevas = await juntarNoticias({ yaSalieron: [...(hist.noticiasTitulos || []).slice(-150), ...enDb.titulos], vistos: new Set([...hist.noticias.slice(-300), ...enDb.links]) }).catch(() => []);
    if (nuevas.length >= 4) { lista = nuevas; console.error(`Noticias: actualizadas ahora (${nuevas.length})`); await guardarNoticias(hoyHN(), nuevas).catch(() => {}); }
  } else console.error(`Noticias: las de las ${new Date(at).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Tegucigalpa' })}`);
  const ops = await cambiosDe(hoyHN()).catch(() => []);
  // Ni el mismo enlace ni la misma historia de otro día (por el título: otro medio puede contar lo mismo)
  const vistas = new Set([...hist.noticias.slice(-300), ...enDb.links]), titulos = [...(hist.noticiasTitulos || []).slice(-150), ...enDb.titulos];
  const frescas = noticiasConCambios(lista, ops).filter((n) => n.propia || (!vistas.has(n.link) && !titulos.some((t) => misma(t, n.titulo))));
  const elegidas = frescas.slice(0, N_REEL);
  if (elegidas.length < 3) return null;
  // La narración alarga cada escena lo que haga falta (titular + resumen)
  const durNoticia = Math.min(13, Math.max(8.5, 51.5 / elegidas.length));
  const hoy = new Date(Date.now() - 6 * 3600e3).toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const corta = (f) => new Date(f).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', timeZone: 'America/Tegucigalpa' });
  const escenas = [
    { tipo: 'intro', dur: INTRO, tema: 'noticias', portada: true, consulta: 'city timelapse morning', sonidos: introSonidos, iconos: ['📰', '🎮', '⚽', '🔭'], voz: 'Las noticias de hoy, en un minuto.',
      lineas: [{ texto: 'NOTICIAS', size: 140, color: TEMAS.noticias.acento }, { texto: 'DE HOY', size: 120 }, { texto: hoy, size: 56, color: 'rgba(255,255,255,0.85)' }] },
    ...elegidas.map((n, i) => ({ tipo: 'noticia', dur: durNoticia, idx: i, total: elegidas.length, tema: 'noticias', etiqueta: ETIQUETA_NOTICIA[n.cat] || '📰 NOTICIA', consulta: azar(FONDO_NOTICIA[n.cat] || FONDO_NOTICIA.general), icono: n.icono || '📰', titular: n.titulo, resumen: n.resumen || '', pie: n.propia ? n.medio : `${n.medio} · ${corta(n.fecha)}`, voz: [n.titulo.replace(/["“”]/g, ''), n.resumen].filter(Boolean).join('. ').replace(/\.\./g, '.'), sonidos: [[0, 'whoosh'], [0.05, 'pop']] })),
    { ...cierre('noticias', '¿CUÁL TE SORPRENDIÓ MÁS?', 'Las noticias del día en menos de un minuto'), voz: '¿Cuál te sorprendió más? Cuéntanos en los comentarios.' }
  ];
  const texto = `📰 Las noticias de hoy en un minuto.\n\n${elegidas.map((n, i) => `${i + 1}. ${n.titulo}${n.resumen ? `\n${n.resumen}` : ''} (${n.medio})`).join('\n\n')}\n\n¿Cuál te sorprendió más?\n\n${tags('noticias', 'ultimahora', ...new Set(elegidas.map((n) => n.cat).filter((c) => c !== 'general')))}`;
  return { formato: 'noticias', titulo: 'Noticias de hoy', escenas, texto, noticias: elegidas.map((n) => n.link), noticiasTitulos: elegidas.map((n) => n.titulo), noticiasItems: elegidas };
}

// ---------- «Cómo se hace» (2026-11-03): la fábrica en 2D animada, recorrida en un solo plano, con fotos reales ----------
// Pasa del minuto (de 62 a 88 s): no va a las historias, que aceptan hasta 60. Datos: data/como-se-hace.json (60 productos)
// Lo publica como-se-hace.yml dos veces al día; no se repite un producto hasta que salieron casi todos los demás
function comoSeHace(hist) {
  const base = leer(path.join(ROOT, 'data', 'como-se-hace.json'), []), usados = new Set((hist.comosehace || []).slice(-Math.max(1, base.length - 5)));
  const p = azar(base.filter((x) => !usados.has(x.id))) || azar(base);
  if (!p) return null;
  const n = p.pasos.length, fotos = p.fotos || [], T = TEMAS[p.tema] ? p.tema : 'inventos', hace = /^(los|las) /.test(p.titulo) ? 'hacen' : 'hace';
  const escenas = [
    { tipo: 'intro', dur: 3.4, tema: T, portada: true, consulta: fotos[0], sonidos: introSonidos, iconos: [...new Set(p.pasos.map((x) => x.salida))].slice(0, 5),
      voz: `Así se ${hace} ${p.titulo}.`,
      lineas: [{ texto: `CÓMO SE ${hace.toUpperCase()}`, size: 104, color: TEMAS[T].acento }, { texto: p.titulo.toUpperCase(), size: 124 }, { texto: `${n} pasos: de la fábrica a tus manos`, size: 50, color: 'rgba(255,255,255,0.85)' }] },
    // Toda la fábrica en un solo plano: unos 7,8 s por máquina y un «whoosh» cada vez que la cámara viaja a la siguiente
    { tipo: 'linea', dur: 7.8 * n, tema: T, etiqueta: `ASÍ SE ${hace.toUpperCase()} ${p.titulo.toUpperCase()}`, pasos: p.pasos,
      voz: p.pasos.map((x) => x.texto), whoosh: true, sonidos: [[0, 'pop']] },
    { tipo: 'proceso', dur: 6.5, tema: T, etiqueta: '¿SABÍAS QUE…?', resultado: p.icono, texto: p.dato, voz: `¿Sabías que…? ${p.dato}`, consultaA: fotos[0], sonidos: [[0, 'pop'], [0.2, 'bien']] },
    { ...cierre(T, '¿QUÉ FABRICAMOS LA PRÓXIMA?', 'Dinos qué quieres ver en «Cómo se hace»'), voz: '¿Qué fabricamos la próxima vez? Escríbelo en los comentarios.' }
  ];
  const texto = `🏭 Así se ${hace} ${p.titulo} ${p.icono}, paso a paso: de la materia prima hasta la tienda.\n\n${p.pasos.map((x, i) => `${i + 1}. ${x.nombre[0] + x.nombre.slice(1).toLowerCase()}: ${x.texto}`).join('\n')}\n\n💡 ${p.dato}\n\n¿Qué quieres que mostremos la próxima vez?\n\n${tags('comosehace', 'asisehace', 'fabricas', 'procesos', 'curiosidades', 'aprende')}`;
  return { formato: 'comosehace', titulo: `Cómo se ${hace} ${p.titulo}`, escenas, texto, comosehace: p.id, duracion: { min: 62, max: 88 } };
}

// ---------- principal ----------
async function main() {
  const o = parseCli({
    formato: { type: 'string', default: 'auto' }, tema: { type: 'string' }, facebook: { type: 'string', default: 'si' },
    historia: { type: 'boolean', default: true }, instagram: { type: 'string', default: 'si' },
    // TikTok: draft = también como borrador (la copia con solo efectos: allí se le pone la canción del momento)
    tiktok: { type: 'string', default: 'no' }, youtube: { type: 'string', default: 'si' }, 'dry-run': { type: 'boolean', default: false }, still: { type: 'string' }
  });
  const fx = setupNode(), emojiFont = fx.emoji ? `"${fx.emoji}"` : '';
  const hist = { ids: [], retos: [], banderas: [], formatos: [], prefieres: [], emojis: [], noticias: [], total: 0, ...leer(HIST, {}) };
  // Nunca dos formatos iguales seguidos (por ejemplo, después de una prueba a mano)
  let paso = hist.total;
  if (ROTACION[paso % ROTACION.length] === hist.formatos.at(-1)) paso++;
  // «estrella»: los dos formatos que más vistas tienen en Instagram (Banderas y Retos, ~1.250 de mediana), un día cada uno
  const diaHN = Math.floor((Date.now() - 6 * 3600e3) / 86400e3);
  // «estrella»: retos un día y los retos de geografía (geo) el otro; las banderas (ya más difíciles) quedan a las 9:00
  const formato = o.formato === 'estrella' ? (diaHN % 2 ? 'retos' : 'geo') : o.formato !== 'auto' ? o.formato : ROTACION[paso % ROTACION.length];
  const base = cargarDatos();
  const hacer = { debate: debateVideo, comosehace: () => comoSeHace(hist), top10: () => top10(base, hist, o.tema), datos5: () => datos5(base, hist, o.tema), geo: () => geoVideo(hist, emojiFont, o.tema), gtaquiz: () => gtaQuiz(hist), quiz: () => quiz(base, hist), banderas: () => banderas(hist), retos: retosVideo, prefieres: () => prefieresVideo(hist), emojis: () => emojisVideo(hist), noticias: () => noticiasVideo(hist) };
  if (!hacer[formato]) throw new Error(`--formato debe ser ${Object.keys(hacer).join(', ')} o auto`);
  // Si un formato no tiene material (sin noticias frescas, por ejemplo), sale un quiz
  const pieza = (await hacer[formato]()) || quiz(base, hist);
  console.error(`Formato: ${pieza.titulo}`);
  const fondos = await ponerFondos(pieza.escenas);
  if (fondos) console.error(`Fotos y videos reales: ${fondos}`);
  guardarStock();

  const outDir = path.join(ROOT, 'out'); fs.mkdirSync(outDir, { recursive: true });
  const nombre = `quiz-${pieza.formato}-${new Date().toISOString().slice(0, 10)}-${(hist.total + 1)}`;
  const melodia = MELODIA_IDS[hist.total % MELODIA_IDS.length];
  if (o.still != null) {
    const png = path.join(outDir, `${nombre}-${o.still}s.png`);
    await renderQuiz({ escenas: pieza.escenas, out: png, emojiFont, still: o.still, melodia });
    console.log(png); return;
  }
  const video = path.join(outDir, `${nombre}.mp4`);
  const estilo = azar(ESTILO[pieza.formato] || ['pop']);
  const r = await renderQuiz({ escenas: pieza.escenas, out: video, emojiFont, estilo, semilla: hist.total * 7919 + Date.now() % 1000, outIG: video.replace(/\.mp4$/, '-ig.mp4'), duracion: pieza.duracion });
  console.error(`Música: ${estilo}`);
  console.error(`${pieza.titulo} · ${r.duration.toFixed(1)} s · ${video}`);
  // Tono (scripts/lib/tono.mjs): la primera línea de la descripción, coloquial o picante; las noticias, limpias
  if (pieza.formato !== 'noticias') pieza.texto = textoConTono(pieza.texto, `${new Date().toISOString().slice(0, 10)}|${pieza.titulo}|${pieza.formato}`);
  pieza.texto = conCta(pieza.texto, pieza.formato);
  const meta = { kind: 'quiz', formato: pieza.formato, title: pieza.titulo, file: path.basename(video), duration: r.duration, post: { text: pieza.texto }, createdAt: new Date().toISOString() };
  const sidecar = video.replace(/\.mp4$/, '.json');

  if (!o['dry-run']) {
    const link = await publicarEnlace(video).catch((e) => { console.error(`No se pudo subir el video al almacén: ${e.message}`); return null; });
    if (link) { meta.videoUrl = link.url; meta.videoDownload = link.downloadUrl; }
    if (o.facebook !== 'no' && facebookReady()) {
      try { meta.facebook = await publishReel({ video, description: pieza.texto, draft: o.facebook === 'borrador' }); }
      catch (e) { meta.facebook = { status: 'error', error: e.message }; console.error(`Aviso: Facebook no publicó el Reel: ${e.message}`); }
      if (o.historia && o.facebook === 'si' && r.duration <= 60) {
        if (r.duration > 60) meta.facebookStory = { status: 'omitida', error: `dura ${Math.round(r.duration)} s y las historias admiten hasta 60 s` };
        else try { meta.facebookStory = await publishStory({ video }); }
        catch (e) { meta.facebookStory = { status: 'error', error: e.message }; console.error(`Aviso: Facebook no publicó la historia: ${e.message}`); }
      }
    }
    // Puntaje máximo, para contestar los comentarios con su puntaje (scripts/comentarios.mjs)
    // «¿Qué prefieres?» y noticias no tienen respuesta correcta: se registran como charla (se agradece cada comentario)
    const clave = pieza.clave || ({ quiz: { modo: 'puntaje', max: 5 }, top10: { modo: 'puntaje', max: 10 }, banderas: { modo: 'puntaje', max: 10 } })[pieza.formato] || { modo: 'charla' };
    registrarRespuesta({ red: 'facebook', id: meta.facebook?.video_id, clave, titulo: pieza.titulo });
    // Instagram (cuenta vinculada a la página): el mismo video desde el almacén, como Reel y como historia
    if (o.instagram !== 'no' && meta.videoUrl && await instagramReady()) {
      // Instagram: el mismo video que Facebook, con nuestra música elegida para el formato (ESTILO) y bajo la voz. Las
      // canciones en tendencia de Meta salían al azar, no combinaban y tapaban la narración (2026-11-06)
      meta.instagram = await publishInstagramSeguro({ tipo: 'reel', url: meta.videoUrl, caption: pieza.texto });
      registrarRespuesta({ red: 'instagram', id: meta.instagram.media_id, clave, titulo: pieza.titulo });
      if (o.historia && r.duration <= 60) meta.instagramStory = await publishInstagramSeguro({ tipo: 'historia', url: meta.videoUrl });
    }
    if (o.tiktok === 'draft') {
      // Con narrador va la mezcla completa (música bajo la voz); sin narrador, la copia sin música para ponerle un sonido
      const tt = r.narrado ? video : (r.outIG || video);
      fs.writeFileSync(tt.replace(/\.mp4$/, '.json'), JSON.stringify({ ...meta, file: path.basename(tt) }, null, 2) + '\n');
      try { meta.tiktok = [await publishVideo({ video: tt, mode: 'draft', coverMs: 0 })]; }
      catch (e) { meta.tiktok = [{ mode: 'draft', status: /spam_risk|pending/i.test(e.message) ? 'LIMIT' : 'error', fail_reason: e.message }]; console.error(`Aviso: TikTok: ${e.message}`); }
      logUpload({ at: new Date().toISOString(), title: pieza.titulo, publish_id: meta.tiktok[0]?.publish_id || null, status: meta.tiktok[0]?.status, run: process.env.GITHUB_RUN_ID || null });
      fs.rmSync(tt.replace(/\.mp4$/, '.json'), { force: true });
    }
    // YouTube: el mismo video (nuestra música y el narrador) como Short PRIVADO, para publicarlo a mano desde Studio
    if (o.youtube !== 'no' && youtubeReady() && cupoYouTube(pieza.formato)) {
      try {
        meta.youtube = await subirYouTube({ file: video, titulo: `${pieza.titulo} #Shorts`, descripcion: `${pieza.texto}\n\n🔔 Suscríbete a Potter Play: videos nuevos todos los días.`, etiquetas: [...new Set([...(pieza.texto.match(/#[\p{L}\d_]+/gu) || []).map((x) => x.slice(1)), 'curiosidades', 'shorts', 'potter play'])] });
        usarCupoYouTube(pieza.formato); console.error(`YouTube: subido como privado (borrador) · ${meta.youtube.studio}`);
      } catch (e) { meta.youtube = { status: 'error', error: e.message }; console.error(`Aviso: YouTube: ${e.message}`); }
    }
    hist.ids.push(...(pieza.ids || [])); hist.retos.push(...(pieza.retos || [])); hist.banderas.push(...(pieza.banderas || []));
    if (pieza.comosehace) hist.comosehace = [...(hist.comosehace || []), pieza.comosehace].slice(-40);
    hist.prefieres.push(...(pieza.prefieres || [])); hist.emojis.push(...(pieza.emojis || [])); hist.noticias.push(...(pieza.noticias || [])); hist.noticiasTitulos = [...(hist.noticiasTitulos || []), ...(pieza.noticiasTitulos || [])].slice(-150);
    // En la base: salieron en un Reel, en estas redes
    if (pieza.noticiasItems?.length) await marcarPublicadas(pieza.noticiasItems, { formato: 'reel', redes: [o.facebook !== 'no' && 'fb', o.instagram !== 'no' && 'ig', o.tiktok === 'draft' && 'tt', o.youtube !== 'no' && 'yt'].filter(Boolean) });
    hist.prefieres = hist.prefieres.slice(-150); hist.emojis = hist.emojis.slice(-160); hist.noticias = hist.noticias.slice(-300);
    hist.formatos.push(pieza.formato); hist.total++;
    if (pieza.tema5) hist.temas5 = [...(hist.temas5 || []), pieza.tema5].slice(-10);
    if (pieza.gtaquiz) hist.gtaquiz = [...(hist.gtaquiz || []), ...pieza.gtaquiz].slice(-40);
    if (pieza.geo) { hist.geoN = (hist.geoN || 0) + 1; for (const k of ['capitales', 'gemelas']) hist[k] = [...(hist[k] || []), ...pieza.geo[k]].slice(-60); }
    hist.ids = hist.ids.slice(-500); hist.retos = hist.retos.slice(-60); hist.banderas = hist.banderas.slice(-150); hist.formatos = hist.formatos.slice(-100);
    fs.writeFileSync(HIST, JSON.stringify(hist, null, 2) + '\n');
  }
  fs.writeFileSync(sidecar, JSON.stringify(meta, null, 2) + '\n');
  console.log(JSON.stringify({ video, duration: r.duration, facebook: meta.facebook, historia: meta.facebookStory }, null, 2));
}

// Cuota de la API de YouTube: ≈ 6 subidas al día. Van los 2 «Cómo se hace», hasta 2 Reels más, el video 3D del día y
// (martes, jueves y sábado) el video largo (data/youtube-dia.json)
const CUPO_YT = path.join(ROOT, 'data', 'youtube-dia.json'), LIMITE_YT = { comosehace: 1, otros: Number(process.env.YOUTUBE_REELS_DIA || 2) };
function diaYT() { const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' }), d = leer(CUPO_YT, {}); return d.fecha === hoy ? d : { fecha: hoy, comosehace: 0, otros: 0 }; }
const grupoYT = (f) => (f === 'comosehace' ? 'comosehace' : 'otros');
function cupoYouTube(f) { const d = diaYT(), g = grupoYT(f); if (d[g] < LIMITE_YT[g]) return true; console.error(`YouTube: ya se subieron ${d[g]} hoy (${g}); este no`); return false; }
function usarCupoYouTube(f) { const d = diaYT(); d[grupoYT(f)]++; fs.writeFileSync(CUPO_YT, JSON.stringify(d) + '\n'); }

main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
