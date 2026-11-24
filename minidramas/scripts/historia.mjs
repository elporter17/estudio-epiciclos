#!/usr/bin/env node
// Generador de historias 2D animadas (estilo «historia narrada»: personajes que entran y se mueven, fondos que cambian,
// subtítulos grandes palabra por palabra y, si hace falta, el filtro de «cómo lo ve…»). Parte de UN archivo de historia
// (historias/<slug>.json, ver historias/README.md) y lo compila a series/<slug>/series.json, que usa el resto del pipeline:
//
//   node scripts/historia.mjs historias/mateo-daltonico.json                → valida, calcula duración y costo, escribe series.json
//   node scripts/historia.mjs historias/mateo-daltonico.json --hacer        → además genera retratos, recursos, voz y video (GASTA API)
//   node scripts/historia.mjs historias/mateo-daltonico.json --hacer --hasta voz   (para en: retratos | recursos | voz | video)
//
// Antes de --hacer se muestra el costo estimado; según CLAUDE.md hay que confirmarlo con el usuario.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCli } from './lib/cli.mjs';
import { ROOT, ENV_FILE, log } from './lib/env.mjs';
import { saveSeries, seriesFile, wordsOf } from './lib/series.mjs';
import { ESTILOS } from './lib/estilos.mjs';
import { TIPOS_POV } from './lib/pov.mjs';
import { vistaPrevia } from './lib/prueba-gratis.mjs';

const VOCES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse', 'marin', 'cedar'];
const HUD = ['sello', 'texto', 'comentario', 'etiqueta'];
const SEG_PALABRA = 0.46, SEG_ESCENA = 0.42, COLA = 1.6; // ritmo medido de la voz (CLAUDE.md) y pausas del montaje
// Costo aproximado por recurso (imágenes de calidad media; con retratos de referencia salen más caras) y voz + transcripción
const COSTO = { retrato: 0.03, pose: 0.045, prop: 0.025, fondo: 0.035, voz_min: 0.02 };

const falta = (c, m) => { if (!c) throw new Error(m); };

export function compilar(h) {
  const errores = [];
  const e = (m) => errores.push(m);
  falta(h.slug && /^[a-z0-9-]+$/.test(h.slug), 'La historia necesita «slug» (minúsculas, números y guiones).');
  const estilo = ESTILOS[h.estilo || 'cartoon3d']; if (!estilo) e(`estilo «${h.estilo}» no existe (${Object.keys(ESTILOS).join(', ')})`);
  const personajes = h.personajes || [], poses = h.poses || {}, fondos = h.fondos || {}, props = h.props || {};
  const ids = new Set(personajes.map((p) => p.id));
  for (const p of personajes) { if (!p.visual) e(`personaje ${p.id}: falta «visual» (descripción fija en inglés)`); if (!VOCES.includes(p.voz || 'ash')) e(`personaje ${p.id}: voz «${p.voz}» no existe`); }
  for (const [id, [pj, texto]] of Object.entries(poses)) { if (!ids.has(pj)) e(`pose ${id}: el personaje «${pj}» no está en «personajes»`); if (!texto) e(`pose ${id}: falta la descripción de la pose`); }
  const escenas = h.escenas || []; if (!escenas.length) e('no hay «escenas»');
  const idsEscena = new Set();
  let palabras = 0;
  for (const s of escenas) {
    if (!s.id) { e('una escena no tiene «id»'); continue; }
    if (idsEscena.has(s.id)) e(`escena ${s.id}: id repetido`); idsEscena.add(s.id);
    const lineas = s.lineas || (s.texto ? [{ hablante: 'narrador', texto: s.texto }] : []);
    if (!lineas.length) e(`escena ${s.id}: sin texto`);
    for (const l of lineas) { palabras += wordsOf(l.texto || '').length; if (l.hablante && l.hablante !== 'narrador' && !ids.has(l.hablante)) e(`escena ${s.id}: habla «${l.hablante}», que no está en «personajes»`); }
    if (s.fondo && !fondos[s.fondo]) e(`escena ${s.id}: el fondo «${s.fondo}» no está en «fondos»`);
    for (const p of s.personajes || []) if (!poses[p.pose]) e(`escena ${s.id}: la pose «${p.pose}» no está en «poses»`);
    for (const o of s.objetos || []) if (!props[o.id]) e(`escena ${s.id}: el objeto «${o.id}» no está en «props»`);
    for (const x of s.hud || []) if (!HUD.includes(x.tipo)) e(`escena ${s.id}: hud «${x.tipo}» no existe (${HUD.join(', ')})`);
    for (const p of s.pov || []) if (!TIPOS_POV.includes(p.tipo)) e(`escena ${s.id}: pov «${p.tipo}» no existe (${TIPOS_POV.join(', ')})`);
  }
  if (errores.length) return { errores };

  const narr = h.narrador || {};
  const serie = {
    title: h.titulo, slug: h.slug, logline: h.sinopsis || h.titulo, premise: h.premisa || h.sinopsis || h.titulo,
    setting: h.ambiente || 'Escenas cotidianas', tone: h.tono || 'Cálido, claro y curioso', visual_style: estilo.visual_style + (h.estilo_extra ? ` ${h.estilo_extra}` : ''),
    genre: h.genero || 'historia', language: h.idioma || 'es',
    narrator: { character_id: narr.personaje || null, voice: narr.voz || 'ash', voice_instructions: narr.instrucciones || 'Narrador cálido y cercano, ritmo ágil, español claro; hace una pausa corta antes del dato importante.' },
    characters: personajes.map((p) => ({ id: p.id, name: p.nombre || p.id, role: p.rol || 'personaje', age: p.edad || 30, visual: p.visual, personality: p.personalidad || '', voice: p.voz || 'ash', voice_instructions: p.instrucciones || 'Habla natural, expresivo, español claro.' })),
    outline: [], standalone: true, framing: estilo.framing, portrait_framing: estilo.portrait_framing,
    episodes: [{
      number: 1, title: h.titulo, hook_text: h.gancho, post_description: h.descripcion || h.titulo, hashtags: h.hashtags || [],
      scenes: escenas.map((s) => ({
        id: s.id, beat: s.beat || 'desarrollo', characters: [...new Set((s.personajes || []).map((p) => poses[p.pose][0]))], shot: 'medium', motion: 'push_in', image_prompt: `Scene ${s.id}`,
        lines: (s.lineas || [{ hablante: 'narrador', texto: s.texto }]).map((l) => ({ speaker: l.hablante || 'narrador', text: l.texto, delivery: l.entrega || (l.hablante && l.hablante !== 'narrador' ? 'natural, con emoción' : 'claro y ágil') }))
      }))
    }],
    anim: {
      sprites: poses, props, bgs: fondos, boca: h.boca || {}, subs: { ...(estilo.subs || {}), ...(h.subtitulos || {}) },
      escenas: Object.fromEntries(escenas.map((s) => {
        const { id, texto, lineas, beat, ...resto } = s;
        return [id, { ...resto, personajes: (s.personajes || []).map(({ pose, ...p }) => ({ id: pose, ...p })) }];
      }))
    }
  };
  const seg = palabras * SEG_PALABRA + escenas.length * SEG_ESCENA + COLA;
  const costo = {
    retratos: personajes.length * COSTO.retrato, poses: Object.keys(poses).length * COSTO.pose, props: Object.keys(props).length * COSTO.prop, fondos: Object.keys(fondos).length * COSTO.fondo,
    voz: (seg / 60) * COSTO.voz_min + 0.02
  };
  costo.total = Object.values(costo).reduce((a, b) => a + b, 0);
  return { serie, palabras, seg, costo, recursos: personajes.length + Object.keys(poses).length + Object.keys(props).length + Object.keys(fondos).length };
}

function paso(cmd, args) {
  log(`\n▶ node ${cmd} ${args.join(' ')}\n`);
  const r = spawnSync(process.execPath, [`--env-file=${ENV_FILE}`, path.join('scripts', cmd), ...args], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} falló (${r.status})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // El archivo puede ir suelto (historias/x.json) o con --spec: se saca de argv porque parseCli no admite argumentos sueltos
  const suelto = process.argv.findIndex((a, i) => i > 1 && a.endsWith('.json') && !process.argv[i - 1].startsWith('--spec')); const sueltoArchivo = suelto > 0 ? process.argv.splice(suelto, 1)[0] : null;
  const o = parseCli({ spec: { type: 'string' }, hacer: { type: 'boolean', default: false }, prueba: { type: 'boolean', default: false }, cuadros: { type: 'string' }, hasta: { type: 'string', default: 'video' }, force: { type: 'boolean', default: false } });
  const archivo = o.spec || sueltoArchivo;
  falta(archivo, 'Uso: node scripts/historia.mjs historias/<slug>.json [--hacer]');
  const h = JSON.parse(fs.readFileSync(path.resolve(archivo), 'utf8'));
  const r = compilar(h);
  if (r.errores) { for (const m of r.errores) log(`✗ ${m}\n`); process.exit(1); }
  saveSeries(r.serie);
  const c = r.costo, usd = (n) => `$${n.toFixed(2)}`;
  log(`✓ ${r.serie.title}\n  ${r.palabras} palabras · ≈ ${r.seg.toFixed(0)} s${r.seg > 120 ? '  ⚠ pasa de 120 s' : r.seg < 45 ? '  ⚠ muy corto' : ''} · ${r.serie.episodes[0].scenes.length} escenas · ${r.recursos} imágenes\n`);
  log(`  Costo aproximado: retratos ${usd(c.retratos)} + poses ${usd(c.poses)} + props ${usd(c.props)} + fondos ${usd(c.fondos)} + voz ${usd(c.voz)} = ${usd(c.total)} (rango ${usd(c.total * 0.6)} a ${usd(c.total * 1.5)})\n`);
  log(`  Escrito: ${path.relative(ROOT, seriesFile(r.serie.slug))}\n`);
  if (o.prueba) {
    // Vista previa gratis: figuras de relleno y voz en silencio; --cuadros 4.5,20,31 elige los segundos a pintar
    const v = vistaPrevia(r.serie, { stills: o.cuadros ? o.cuadros.split(',').map(Number) : [] });
    log(`
Prueba sin gasto (${v.dur.toFixed(0)} s): cuadros en ${path.relative(ROOT, v.dir)} (${v.hits.join(', ')} s)
`); process.exit(v.ok ? 0 : 1);
  }
  if (!o.hacer) { log('\nPara generarla (gasta API; pide el OK del usuario antes): agrega --hacer\n'); process.exit(0); }
  const s = ['--series', r.serie.slug], f = o.force ? ['--force'] : [], orden = ['retratos', 'recursos', 'voz', 'video'], tope = orden.indexOf(o.hasta);
  falta(tope >= 0, '--hasta debe ser retratos, recursos, voz o video');
  if (tope >= 0) paso('images.mjs', [...s, '--portraits', ...f]);
  if (tope >= 1) paso('animate-assets.mjs', [...s, ...f]);
  if (tope >= 2) paso('voice.mjs', [...s, '--ep', '1', ...f]);
  if (tope >= 3) paso('animate.mjs', [...s, '--ep', '1']);
}
