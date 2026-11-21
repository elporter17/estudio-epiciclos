#!/usr/bin/env node
// Pasa el plan de scripts/lib/horario.mjs (HORARIO) a la tabla «programacion» de Supabase: desactiva todos los renglones
// activos de ahora (no borra nada, quedan como historial con activo = false) y agrega los nuevos.
//   node --env-file=.env scripts/aplicar-plan.mjs            (solo muestra lo que cambiaría)
//   node --env-file=.env scripts/aplicar-plan.mjs --aplicar  (lo escribe en Supabase)
import './lib/env-file.mjs';
import { db } from './lib/db.mjs';
import { filasDeHorario, redesDeFila } from './lib/programacion.mjs';
import { HORARIO } from './lib/horario.mjs';

const aplicar = process.argv.includes('--aplicar');
const nuevas = filasDeHorario().map((f) => ({ ...f, nota: 'plan 2026-11-21 (un enfoque por red)' }));
// Los reenvíos (bot: 🎬 Videos → 🔁) los programas tú a mano: no se tocan
const actuales = (await db('prog-lista')).filter((f) => f.activo && f.pieza !== 'reenvio');
const clave = (f) => `${f.hora}|${f.pieza}|${redesDeFila(f).join(',')}|${(f.dias || []).join('')}|${f.fecha || ''}`;
const ahora = new Set(actuales.map(clave)), despues = new Set(nuevas.map(clave));
const quitan = actuales.filter((f) => !despues.has(clave(f))), ponen = nuevas.filter((f) => !ahora.has(clave(f))), igual = nuevas.filter((f) => ahora.has(clave(f)));
console.log(`Renglones activos: ${actuales.length} · en el plan nuevo: ${nuevas.length} (HORARIO: ${HORARIO.length})`);
console.log(`Se quedan igual: ${igual.length} · se apagan: ${quitan.length} · se agregan: ${ponen.length}`);
for (const f of quitan.filter((x) => !/comentarios/.test(x.pieza))) console.log(`  − ${f.hora} ${f.pieza} [${redesDeFila(f).join(' ')}]`);
for (const f of ponen.filter((x) => !/comentarios/.test(x.pieza))) console.log(`  + ${f.hora} ${f.pieza} [${redesDeFila(f).join(' ')}]`);
if (!aplicar) { console.log('\n(Solo vista previa; con --aplicar se escribe.)'); process.exit(0); }
// Primero lo nuevo y después apagar lo viejo, para que nunca falte algo si se corta a la mitad
if (ponen.length) await db('prog-insertar', { filas: ponen });
for (const f of quitan) await db('prog-cambiar', { id: f.id, cambios: { activo: false, nota: `${f.nota || ''} · apagado 2026-11-21 (plan por red)`.trim() } });
console.log(`Listo: ${ponen.length} agregados, ${quitan.length} apagados.`);
