// Escribe docs/guiones-programados.md: los guiones 3D que siguen en la cola, en el orden y con las redes en que van a salir
// (simula los 3 turnos de cada día con la misma regla que usa el render: el de la tarde toma primero los de Honduras).
//   node scripts/lib/guiones-a-markdown.mjs [AAAA-MM-DD de inicio]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './node-env.mjs';
import { guiones, elegir } from './video3d-cola.mjs';

const inicio = process.argv[2] || '2026-11-22';
const REDES = { mediodia: 'Instagram + YouTube', noche: 'TikTok + YouTube', tarde: 'Facebook + YouTube' };
const HORA = { mediodia: '12:17', noche: '15:30', tarde: '18:30' };
const estado = { publicados: [], listos: { mediodia: null, tarde: null, noche: null } };
const hechosS1 = new Set(guiones().filter((g) => !g.temporada && g.motor !== '2d').map((g) => g.id)); // la temporada 1 ya salió completa
estado.publicados = [...hechosS1].map((id) => ({ id }));
const orden = [];
for (let d = 0; d < 40; d++) {
  const fecha = new Date(Date.parse(`${inicio}T12:00:00Z`) + d * 86400e3).toISOString().slice(0, 10);
  let alguno = false;
  for (const turno of ['mediodia', 'tarde', 'noche']) {
    const g = elegir(fecha, estado, turno); if (!g) continue;
    estado.publicados.push({ id: g.id }); alguno = true;
    orden.push({ fecha, turno, g });
  }
  if (!alguno) break;
}
const por = { mediodia: 0, tarde: 1, noche: 2 };
orden.sort((a, b) => a.fecha.localeCompare(b.fecha) || ['mediodia', 'noche', 'tarde'].indexOf(a.turno) - ['mediodia', 'noche', 'tarde'].indexOf(b.turno));
const out = [`# Videos programados (desde el ${inicio})\n`,
  `${orden.length} guiones, 3 al día. 12:17 y 18:30: videos 3D (Instagram y Facebook, más YouTube); 15:30: video 2D sin IA (TikTok y YouTube). Los de Honduras 3D van primero a Facebook. La voz dice cada línea tal cual; el tono (muletillas del principio, a mitad y el cierre) lo agrega el sistema al renderizar.\n`,
  '| # | Fecha | Hora | Redes | Guion |', '|---|---|---|---|---|',
  ...orden.map((o, i) => `| ${i + 1} | ${o.fecha} | ${HORA[o.turno]} | ${REDES[o.turno]} | ${o.g.titulo} (${o.g.categoria}${o.g.motor === '2d' ? ', 2D' : ''}) |`), ''];
orden.forEach((o, i) => {
  const g = o.g;
  out.push(`## ${i + 1}. ${g.titulo}`, `*${o.fecha} · ${HORA[o.turno]} · ${REDES[o.turno]} · categoría: ${g.categoria}${g.episodio ? ` · episodio ${g.episodio}` : ''}*\n`);
  g.escenas.filter((e) => e.texto).forEach((e) => out.push(`- **${e.tipo}:** ${e.texto}`));
  out.push('', '**Fuentes:**', ...(g.fuentes || []).map((f) => `- ${f.dato} — ${f.fuente}${f.url ? ` (${f.url})` : ''}`));
  if (g.nota) out.push('', `> Nota: ${g.nota}`);
  out.push('');
});
const dir = path.join(ROOT, 'docs'); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'guiones-programados.md'), out.join('\n'));
console.log(`${orden.length} guiones → docs/guiones-programados.md`);
