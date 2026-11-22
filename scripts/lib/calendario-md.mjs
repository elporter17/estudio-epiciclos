// Escribe docs/calendario.md: el plan diario de cada red y el calendario día por día de los 6 videos de datos (3D y 2D), con la
// misma regla de la cola que usa el render (simula los turnos desde la fecha de inicio, con la Temporada 1 ya publicada).
//   node scripts/lib/calendario-md.mjs [AAAA-MM-DD de inicio]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './node-env.mjs';
import { guiones, elegir } from './video3d-cola.mjs';
import { PLAN, PIEZAS } from './horario.mjs';

const inicio = process.argv[2] || '2026-11-22';
const TURNOS = ['dos1', 'mediodia', 'noche', 'dos3', 'tarde', 'dos2'];
const HORA = { dos1: '10:20', mediodia: '12:17', noche: '15:30', dos3: '18:00', tarde: '18:30', dos2: '21:10' };
const REDES = { dos1: 'FB + YT', mediodia: 'IG + YT', noche: 'TT + YT', dos3: 'TT', tarde: 'FB + YT', dos2: 'IG + YT' };
const estado = { publicados: guiones().filter((g) => !g.temporada && g.motor !== '2d').map((g) => ({ id: g.id })), listos: {} };
const dias = [];
for (let d = 0; d < 60; d++) {
  const fecha = new Date(Date.parse(`${inicio}T12:00:00Z`) + d * 86400e3).toISOString().slice(0, 10), fila = {};
  // El orden de render es mediodía, tarde, noche y después los 2D (dos1, dos2, dos3)
  for (const t of ['mediodia', 'tarde', 'noche', 'dos1', 'dos2', 'dos3']) { const g = elegir(fecha, estado, t); if (g) { estado.publicados.push({ id: g.id }); fila[t] = g; } }
  if (!Object.keys(fila).length) break;
  dias.push({ fecha, fila });
}
const DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const bonito = (f) => { const d = new Date(`${f}T12:00:00Z`); return `${DIA[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
const corto = (g) => g ? `${g.titulo}${g.categoria === 'honduras' ? ' 🇭🇳' : ''}` : '—';
const nombrePieza = (p) => (PIEZAS[p]?.que || p).replace(/ → .*/, '').replace(/^Reel( estrella)?: /, '').replace(/^Video /, 'Video ');

const out = [`# Calendario y planning (desde el ${bonito(inicio)} de 2026)\n`];
out.push('## Plan diario por red (hora de Honduras)\n', 'Cada red publica un video 3D y uno 2D al día; el resto son quizzes y noticias que se generan al momento, sin guion fijo.\n');
const NOMBRES = { fb: 'Facebook (máx. 6 Reels al día)', ig: 'Instagram (solo Reels)', tt: 'TikTok', yt: 'YouTube (solo Shorts)' };
for (const red of ['fb', 'ig', 'tt', 'yt']) {
  out.push(`### ${NOMBRES[red]}`, '| Hora | Qué sale |', '|---|---|', ...Object.entries(PLAN[red]).sort().map(([h, p]) => `| ${h} | ${/^video(3d|2d)/.test(p) ? `**${nombrePieza(p)}**` : nombrePieza(p)} |`), '');
}
out.push('## Calendario de videos de datos, día por día\n', `| Día | ${TURNOS.map((t) => `${HORA[t]} ${REDES[t]} (${/^dos/.test(t) ? '2D' : '3D'})`).join(' | ')} |`, `|---|${TURNOS.map(() => '---').join('|')}|`,
  ...dias.map(({ fecha, fila }) => `| ${bonito(fecha)} | ${TURNOS.map((t) => corto(fila[t])).join(' | ')} |`), '');
const n3 = dias.flatMap((d) => Object.entries(d.fila)).filter(([t]) => !/^dos/.test(t)).length, n2 = dias.flatMap((d) => Object.entries(d.fila)).filter(([t]) => /^dos/.test(t)).length;
const fin = dias.at(-1).fecha, aviso = dias[Math.max(0, dias.length - 3)].fecha;
out.push('## Resumen\n', `- **${n3} videos 3D** y **${n2} videos 2D** programados: ${dias.length} días con 6 videos al día, del ${bonito(inicio)} al ${bonito(fin)}.`,
  `- Se acaban el **${bonito(fin)}**. El bot avisa cuando quedan 6 guiones de un tipo (hacia el ${bonito(aviso)}), así que las próximas tandas conviene tenerlas listas antes del ${bonito(dias[Math.max(0, dias.length - 6)].fecha)}.`,
  `- 3D: temporadas 2, 3 y 4 (mitos, Honduras y escala). 2D: tres tandas de 30 (ciencia, historia, inventos, animales, cuerpo humano, comida y geografía).`,
  '- Los 3D de Honduras 🇭🇳 salen a las 18:30 en Facebook (prueba de contenido local) y se compararán con el resto.');
fs.writeFileSync(path.join(ROOT, 'docs', 'calendario.md'), out.join('\n') + '\n');
console.log(`${dias.length} días, ${n3} 3D + ${n2} 2D → docs/calendario.md`);
