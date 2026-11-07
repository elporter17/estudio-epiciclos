#!/usr/bin/env node
// Render nocturno de los videos 3D (video3d-noche en scripts/lib/horario.mjs): toma de la cola el guion que se
// publica hoy, lo narra, lo renderiza con Remotion (en GitHub, con la CPU: ~40-55 min), normaliza el volumen y lo deja
// en Vercel Blob para que scripts/video3d-publicar.mjs lo publique más tarde. Avisa si la cola se está quedando sin guiones.
//   node --env-file=.env scripts/video3d-render.mjs [--fecha AAAA-MM-DD] [--guion archivo.json] [--dry-run]
//   --dry-run: renderiza y deja el MP4 en out/, sin subirlo ni cambiar el estado
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import './lib/env-file.mjs';
import { parseCli } from './lib/cli.mjs';
import { publicarProximos } from './lib/proximos.mjs';
import { ROOT } from './lib/node-env.mjs';
import { publicarEnlace } from './lib/video-link.mjs';
import { leerEstado, guardarEstado, elegir, pendientes, avisoExtra, hoyHN, AVISO_COLA } from './lib/video3d-cola.mjs';

const o = parseCli({ fecha: { type: 'string' }, turno: { type: 'string', default: 'mediodia' }, guion: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } });
const fecha = o.fecha || hoyHN(), estado = leerEstado(), turno = o.turno === 'tarde' ? 'tarde' : 'mediodia';
if (!o.guion && estado.listos[turno]?.fecha === fecha) { console.log(`Ya hay un video listo para ${fecha} (${turno}): ${estado.listos[turno].titulo}`); process.exit(0); }
const g = o.guion ? { archivo: path.resolve(o.guion), ...JSON.parse(fs.readFileSync(path.resolve(o.guion), 'utf8')) } : elegir(fecha, estado, turno);
if (!g) { avisoExtra('📭 Videos 3D: la cola está vacía; hoy no hay video. Pídeme más guiones.'); console.log('Cola vacía'); process.exit(0); }
console.error(`Video 3D para ${fecha} (${turno}): ${g.titulo} (${path.basename(g.archivo)})`);

// npx en Windows es un .cmd y necesita el intérprete de comandos; node no (y su ruta tiene espacios)
const correr = (cmd, args, cwd = ROOT) => { const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && cmd === 'npx' }); if (r.status !== 0) throw new Error(`Falló: ${cmd} ${args.slice(0, 3).join(' ')}…`); };
const ti = Date.now();
correr(process.execPath, [path.join(ROOT, 'scripts', 'video3d-preparar.mjs'), '--guion', g.archivo]);
const crudo = path.join(ROOT, 'video3d', 'out', `${g.id}-crudo.mp4`), final = path.join(ROOT, 'out', `video3d-${g.id}.mp4`);
fs.mkdirSync(path.dirname(crudo), { recursive: true }); fs.mkdirSync(path.dirname(final), { recursive: true });
// En GitHub no hay tarjeta gráfica: «swangle» dibuja con la CPU; en una PC con GPU, VIDEO3D_GL=angle es mucho más rápido
const gl = process.env.VIDEO3D_GL || (process.env.GITHUB_ACTIONS ? 'swangle' : 'angle');
correr('npx', ['remotion', 'render', 'src/index.jsx', 'Dato', crudo, `--gl=${gl}`, `--concurrency=${process.env.VIDEO3D_HILOS || 4}`, '--codec=h264', '--crf=20', '--log=error'], path.join(ROOT, 'video3d'));
const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', crudo, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', final]);
if (r.status !== 0) throw new Error(`ffmpeg: ${String(r.stderr).slice(-300)}`);
const render = JSON.parse(fs.readFileSync(path.join(ROOT, 'video3d', 'public', 'render.json'), 'utf8'));
console.error(`Listo en ${Math.round((Date.now() - ti) / 60000)} min · ${render.duracion.toFixed(1)} s · ${final}`);
if (o['dry-run']) { console.log(final); process.exit(0); }

const enlace = await publicarEnlace(final, { days: 3 });
estado.listos[turno] = { id: g.id, fecha, turno, url: enlace.url, download: enlace.downloadUrl, titulo: g.titulo, duracion: render.duracion, archivo: path.basename(g.archivo) };
guardarEstado(estado); await publicarProximos(); // el bot muestra qué 3D vienen
const quedan = pendientes(estado) - Object.values(estado.listos).filter((x) => x && !x.fecha_fija).length;
if (quedan <= AVISO_COLA) avisoExtra(`📚 Videos 3D: quedan ${Math.max(0, quedan)} guiones en la cola (después de «${g.titulo}»). Pídeme otra tanda para no quedarnos sin videos.`);
console.log(JSON.stringify({ listo: estado.listos[turno], quedan }, null, 2));
