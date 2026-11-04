// Hoja de muestra de las máquinas de «Cómo se hace» (para revisar el dibujo): out/maquinas-muestra.png
//   node scripts/muestra-maquinas.mjs [segundo]
import fs from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
const R = './';
const { setupNode } = await import(R + 'lib/node-env.mjs');
const { dibujarMaquina, TIPOS_MAQUINA } = await import(R + 'lib/maquinas.mjs');
const { cargarObjetos } = await import(R + 'lib/objetos3d.mjs');
const fx = setupNode(), EF = fx.emoji ? `"${fx.emoji}"` : 'sans-serif';
const emoji = (c, e, x, y, s) => { c.font = `${s}px ${EF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, x, y); };
const ejemplos = { cosecha: ['🍒', '🍒'], cinta: ['🧴', '🧴'], lavado: ['🥔', '🥔'], horno: ['🫓', '🍞'], tostar: ['🫘', '🟤'], prensa: ['🟡', '🪙'], corte: ['🍞', '🥪'], mezcla: ['🌾', '🫓', ['🌾', '💧', '🧂'], '#e9d7b0'], molde: ['🥣', '🍫', null, '#5a3520'], enfria: ['🍦', '🍦'], empaque: ['🍪', '📦'], molino: ['🌽', '🫓', null, '#e8c66a'], fundir: ['⚪', '🍾'], secado: ['🍝', '🍝'], fermenta: ['🧀', '🧀'], extruir: ['🟡', '🍝', null, '#f2d785'], inspeccion: ['🍾', '🍾'], camion: ['📦', '📦'] };
await cargarObjetos(Object.values(ejemplos).flatMap(([a, b, x]) => [a, b, ...(x || [])]).concat(['❄️', '✅', '🚚', '🏪', '📦']));
const t = +(process.argv[2] || 2.3), cols = 3, W = 980, H = 740, cv = createCanvas(cols * W, Math.ceil(TIPOS_MAQUINA.length / cols) * H), ctx = cv.getContext('2d');
TIPOS_MAQUINA.forEach((tipo, i) => { const [entrada, salida, extra, color] = ejemplos[tipo]; dibujarMaquina(ctx, tipo, { x: (i % cols) * W, y: Math.floor(i / cols) * H, w: W, h: H }, t, { entrada, salida, extra, color }, emoji, '#f2c230'); ctx.fillStyle = '#fff'; ctx.font = '700 40px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(tipo, (i % cols) * W + 20, Math.floor(i / cols) * H + H - 20); });
const out = createCanvas(cv.width / 2, cv.height / 2); out.getContext('2d').drawImage(cv, 0, 0, cv.width / 2, cv.height / 2);
fs.writeFileSync('out/maquinas-muestra.png', out.toBuffer('image/png'));
console.log('ok');
