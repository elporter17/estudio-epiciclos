#!/usr/bin/env node
// Corre cada mañana (noticias.yml, 6:23): junta las noticias del día (videojuegos, fútbol, ciencia y tecnología, de los
// RSS de scripts/lib/noticias.mjs, ordenadas por importancia y alternando temas) y:
//   · las guarda en data/noticias-hoy.json (estado cifrado de Actions) para el Reel «Noticias de hoy»
//   · las deja numeradas en el almacén (scripts/lib/control.mjs) para que el bot de Telegram pueda quitarlas o fijarlas
//   · te manda por Telegram el plan del día y las noticias candidatas
//   node scripts/noticias.mjs [--horas 36] [--sin-aviso] [--prueba]   (--prueba: muestra el mensaje y no guarda ni envía)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import './lib/env-file.mjs';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';
import { juntarNoticias } from './lib/noticias.mjs';
import { delDia, ahoraHN } from './lib/horario.mjs';
import { cambiosDe, guardarNoticias, noticiasConCambios, limpiarViejos, telegram, controlListo, ultimoError } from './lib/control.mjs';
import { mensajePlan, mensajeNoticias, diaBonito } from './lib/bot.mjs';
import { publicarProximos } from './lib/proximos.mjs';

export const ARCHIVO = path.join(ROOT, 'data', 'noticias-hoy.json');
export { juntarNoticias };

async function main() {
  const o = parseCli({ horas: { type: 'string', default: '36' }, 'sin-aviso': { type: 'boolean', default: false }, prueba: { type: 'boolean', default: false } });
  const items = await juntarNoticias({ horas: +o.horas });
  const porCat = items.reduce((a, n) => ({ ...a, [n.cat]: (a[n.cat] || 0) + 1 }), {});
  console.log(`Noticias: ${items.length} ${JSON.stringify(porCat)}`);
  for (const n of items.slice(0, 8)) console.log(`· [${n.cat} ${n.puntaje}] ${n.titulo} (${n.medio})\n    ${n.resumen}`);

  const { fecha } = ahoraHN(), ops = await cambiosDe(fecha), slots = delDia(fecha, ops);
  const msg = `☀️ <b>Buenos días</b> · ${diaBonito(fecha)}\n\n${mensajePlan(fecha, slots, { ops, titulo: 'Lo que sale hoy' })}\n\n${mensajeNoticias(noticiasConCambios(items, ops), { horaReel: slots.find((s) => s.pieza === 'noticias')?.hora, max: 8 })}\n\n✍️ ¿Cambio algo? Toca los botones de abajo o escríbeme normal («quita 14:30», «mueve retos a las 5 pm»…).`;
  if (o.prueba) { console.log(`\n${msg.replace(/<[^>]+>/g, '')}`); return; }

  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, JSON.stringify({ fecha: new Date().toISOString(), items }, null, 2) + '\n');
  if (controlListo()) {
    await guardarNoticias(fecha, items);
    await publicarProximos(); // qué videos 3D y largo vienen (para el bot)
    await limpiarViejos().catch((e) => console.error(`No se pudo limpiar el almacén: ${e.message}`));
  } else console.error('Sin TELEGRAM_BOT_TOKEN o sin almacén: el bot no podrá cambiar las noticias de hoy');
  // Botones para cambiar sin escribir (los atiende api/telegram.js)
  const teclado = { inline_keyboard: [[{ text: '✏️ Cambiar el plan', callback_data: `p|${fecha}` }, { text: '📰 Quitar o fijar noticias', callback_data: 'n' }]] };
  if (!o['sin-aviso']) console.log(`Telegram (plan y noticias): ${await telegram(msg, { teclado }) ? 'enviado' : `no se pudo enviar (${ultimoError})`}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
}
