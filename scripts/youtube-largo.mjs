#!/usr/bin/env node
// Video largo para YouTube (horizontal, 8 a 10 min, sin IA): «Cómo se hacen N cosas que usas todos los días».
// Toma N productos de data/como-se-hace.json (sin repetir los últimos) y arma: gancho → por cada producto, capítulo,
// fábrica paso a paso con narrador y «¿Sabías que…?» → una intriga antes del siguiente → cierre. Sube el video PRIVADO a
// YouTube con capítulos en la descripción y su miniatura (3 palabras que no repiten el título).
//   node --env-file=.env scripts/youtube-largo.mjs --dry-run            → solo el video y la miniatura, en out/
//   node --env-file=.env scripts/youtube-largo.mjs --dry-run --still 40 → un cuadro en PNG
//   node --env-file=.env scripts/youtube-largo.mjs --productos 4 --ids chocolate,lapiz,...
import fs from 'node:fs';
import path from 'node:path';
import { parseCli } from './lib/cli.mjs';
import { planearLargo, publicarProximos } from './lib/proximos.mjs';
import { setupNode, ROOT } from './lib/node-env.mjs';
import { renderLargo, renderMiniatura } from './lib/largo-video.mjs';
import { subirYouTube, youtubeReady, ponerMiniatura } from './lib/youtube.mjs';
import { mandarVideoATelegram } from './lib/tg-video.mjs';

const o = parseCli({ 'dry-run': { type: 'boolean', default: false }, still: { type: 'string' }, productos: { type: 'string', default: '6' }, ids: { type: 'string' } });
const fx = setupNode(), emojiFont = fx.emoji ? `"${fx.emoji}"` : '';
const leer = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const HIST = path.join(ROOT, 'data', 'youtube-largo.json'), hist = { usados: [], total: 0, ...leer(HIST, {}) };
const base = leer(path.join(ROOT, 'data', 'como-se-hace.json'), []);
const mezclar = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const azar = (a) => a[Math.floor(Math.random() * a.length)];

const N = Math.max(3, Math.min(8, +o.productos || 6));
let elegidos = o.ids ? o.ids.split(',').map((id) => base.find((p) => p.id === id.trim())).filter(Boolean) : [];
// Los que ya estaban elegidos para este video (el bot los muestra de antemano: scripts/lib/proximos.mjs)
if (!elegidos.length) elegidos = planearLargo(N);
if (!elegidos.length) { const usados = new Set(hist.usados.slice(-Math.max(0, base.length - N))); elegidos = mezclar(base.filter((p) => !usados.has(p.id))).slice(0, N); }
if (elegidos.length < 3) throw new Error('No hay suficientes productos');
const n = elegidos.length, hace = (p) => (/^(los|las) /.test(p.titulo) ? 'hacen' : 'hace');
const mayus = (s) => s[0].toUpperCase() + s.slice(1);
const NUM = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho'];

// Intrigas entre productos (retención): nunca la misma dos veces en un video
const INTRIGAS = mezclar([
  'Y el siguiente… casi nadie sabe cómo se hace.',
  'Lo que viene ahora usa una máquina que no te imaginas.',
  '¿Adivinas qué fabricamos ahora? Aquí va una pista…',
  'Este siguiente lo usas todos los días, seguro.',
  'Quédate: el que sigue tiene el proceso más raro de todos.',
  'Y ahora, uno que parece fácil… pero no lo es.',
  'El siguiente pasa por más máquinas de las que crees.'
]);
const escenas = [{
  tipo: 'gancho', dur: 6, tema: elegidos[0].tema, iconos: elegidos.map((p) => p.icono), capitulo: 'Intro',
  titulo: `${n} cosas que usas todos los días… y no sabes cómo se hacen`, sub: `Quédate hasta el final: la número ${n} es la más sorprendente`,
  voz: `Usas estas ${NUM[n - 1]} cosas todos los días, pero seguro no sabes cómo se fabrican. Quédate hasta el final, porque la número ${NUM[n - 1]} es la más sorprendente.`
}];
elegidos.forEach((p, k) => {
  const T = p.tema;
  if (k > 0) { const t = INTRIGAS[(k - 1) % INTRIGAS.length]; escenas.push({ tipo: 'intriga', dur: 3.5, tema: T, texto: t, pista: p.icono, voz: t }); }
  escenas.push({ tipo: 'capitulo', dur: 3.6, tema: T, num: k + 1, total: n, titulo: p.titulo, icono: p.icono, hace: hace(p), capitulo: mayus(p.titulo), voz: `Número ${NUM[k]}: ${p.titulo}.` });
  escenas.push({ tipo: 'linea', dur: 7.8 * p.pasos.length, tema: T, etiqueta: `CÓMO SE ${hace(p).toUpperCase()} ${p.titulo.toUpperCase()}`, pasos: p.pasos, voz: p.pasos.map((x) => x.texto) });
  escenas.push({ tipo: 'dato', dur: 6.5, tema: T, texto: p.dato, icono: p.icono, voz: `¿Sabías que…? ${p.dato}` });
});
escenas.push({ tipo: 'cierre', dur: 6, tema: elegidos.at(-1).tema, titulo: '¿Cuál te sorprendió más?', sub: 'Escríbelo en los comentarios · Suscríbete a Potter Play',
  voz: '¿Cuál te sorprendió más? Escríbelo en los comentarios, y suscríbete para ver cómo se hacen muchas cosas más.' });

// Título corto (menos de 6 palabras, curiosidad) y miniatura de 3 palabras que no repite ninguna palabra del título
const TITULOS = [`Así se fabrica lo que usas`, `Cómo se hacen estas ${n} cosas`, `${n} fábricas que nunca viste`, `Lo que nadie te muestra`, `Dentro de ${n} fábricas reales`];
const MINIS = ['¡NO LO SABÍAS!', 'MIRA EL ÚLTIMO', '¿ADIVINAS CUÁL?', 'DE PRINCIPIO A FIN', 'TODO PASO A PASO', 'MÁQUINAS INCREÍBLES'];
const palabras = (s) => new Set(s.toLowerCase().normalize('NFD').replace(/[^\p{L}\d ]/gu, '').split(/\s+/));
const titulo = azar(TITULOS), mini = azar(MINIS.filter((m) => ![...palabras(m)].some((w) => w.length > 2 && palabras(titulo).has(w))).filter((m) => m.split(' ').length <= 3)) || 'MIRA EL ÚLTIMO';

const outDir = path.join(ROOT, 'out'); fs.mkdirSync(outDir, { recursive: true });
const nombre = `largo-${new Date().toISOString().slice(0, 10)}-${hist.total + 1}`;
console.error(`Video largo: ${titulo} · ${elegidos.map((p) => p.id).join(', ')}`);
if (o.still != null) { const png = path.join(outDir, `${nombre}-${o.still}s.png`); await renderLargo({ escenas, out: png, emojiFont, still: o.still }); console.log(png); process.exit(0); }

const video = path.join(outDir, `${nombre}.mp4`), miniatura = path.join(outDir, `${nombre}-miniatura.jpg`);
const r = await renderLargo({ escenas, out: video, emojiFont, estilo: azar(['lofi', 'electro', 'synthwave']), semilla: hist.total * 7907 + Date.now() % 1000 });
await renderMiniatura({ out: miniatura, palabras: mini, iconos: elegidos.map((p) => p.icono).slice(0, 5), tema: elegidos[0].tema, emojiFont });
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const capitulos = r.capitulos.map((c) => `${mmss(c.t)} ${c.titulo}`).join('\n');
const descripcion = `🏭 Así se fabrican ${elegidos.map((p) => p.titulo).join(', ').replace(/, ([^,]*)$/, ' y $1')}: cada fábrica paso a paso, de la materia prima hasta la tienda.\n\nCapítulos:\n${capitulos}\n\n🔔 Suscríbete a Potter Play: videos nuevos todos los días.\n💬 ¿Qué quieres que fabriquemos la próxima vez? Déjalo en los comentarios.\n\n#comosehace #fabricas #curiosidades`;
const meta = { kind: 'youtube-largo', title: titulo, miniatura: mini, file: path.basename(video), duration: r.duration, productos: elegidos.map((p) => p.id), post: { text: descripcion }, createdAt: new Date().toISOString() };
console.error(`${titulo} · ${(r.duration / 60).toFixed(1)} min · miniatura «${mini}»\n${capitulos}`);

if (!o['dry-run'] && youtubeReady()) {
  try {
    meta.youtube = await subirYouTube({ file: video, titulo, descripcion, categoria: '27', etiquetas: ['cómo se hace', 'cómo se fabrica', 'fábricas', 'procesos industriales', 'curiosidades', 'documental', 'potter play', ...elegidos.map((p) => p.titulo.replace(/^(el|la|los|las) /, ''))] });
    console.error(`YouTube: subido como privado (borrador) · ${meta.youtube.studio}`);
    // Miniatura propia: YouTube la acepta solo si el canal está verificado con teléfono
    try { await ponerMiniatura(meta.youtube.id, miniatura); meta.youtube.miniatura = 'ok'; }
    catch (e) { meta.youtube.miniatura = e.message; console.error(`Aviso: miniatura: ${e.message} (verifica el canal en youtube.com/verify)`); }
  } catch (e) { meta.youtube = { status: 'error', error: e.message }; console.error(`Aviso: YouTube: ${e.message}`); }
  hist.usados = [...hist.usados, ...elegidos.map((p) => p.id)].slice(-60); hist.total++; hist.siguiente = null;
  fs.writeFileSync(HIST, JSON.stringify(hist, null, 2) + '\n');
  // Y se eligen ya los del siguiente video, para que el bot los muestre
  planearLargo(N, { nuevo: true }); await publicarProximos();
}
const aviso = `📺 <b>${titulo}</b> · ${(r.duration / 60).toFixed(1)} min` + (meta.youtube?.studio ? `\nSubido como privado: ${meta.youtube.studio}` : o['dry-run'] ? '\n(prueba: no se subió a YouTube)' : '');
console.error(`Telegram: ${(await mandarVideoATelegram(video, aviso, { duracion: r.duration })) ? 'enviado' : 'no se pudo enviar'}`);
fs.writeFileSync(video.replace(/\.mp4$/, '.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(JSON.stringify({ video, miniatura, duration: r.duration, youtube: meta.youtube }, null, 2));
