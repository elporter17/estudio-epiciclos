#!/usr/bin/env node
// Prueba lo que entiende el bot de Telegram sin mandar nada: aplica cada frase sobre el plan de una fecha.
//   node scripts/bot-prueba.mjs "quita las 2:30" "mueve retos a las 5 pm" …   [--fecha AAAA-MM-DD]
import { interpretar } from './lib/bot.mjs';
import { delDia, tablaPlan } from './lib/horario.mjs';
import { resolver } from './lib/control.mjs';

const args = process.argv.slice(2), i = args.indexOf('--fecha');
const fecha = i >= 0 ? args.splice(i, 2)[1] : new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
const ops = [];
for (const frase of args) {
  const r = interpretar(frase, { slots: delDia(fecha, resolver(ops)) });
  console.log(`\n» ${frase}\n  ${JSON.stringify(r.op || r)}${r.resumen ? `\n  ${r.resumen}` : ''}`);
  if (r.tipo === 'op' && !r.op.t.startsWith('noticia')) ops.push(r.op);
}
console.log(`\nPlan de ${fecha} con los cambios:\n${tablaPlan(delDia(fecha, resolver(ops)))}`);
