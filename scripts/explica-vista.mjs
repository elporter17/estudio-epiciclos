#!/usr/bin/env node
// Vista previa rápida de un guion «explica» sin renderizar el video: dibuja en un PNG
//   1) cada dibujo SVG del guion (con su nombre), y
//   2) cada escena como un cuadro fijo (fondo liso, capas SVG en su lugar y tamaño finales, etiquetas y números),
// para revisar proporciones, posiciones y que nada tape los subtítulos (franja superior, y de 200 a 430 px).
//   node scripts/explica-vista.mjs --guion video3d/guiones/explica/001-botella-cinco-puntas.json [--salida out/vista.png]
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';

const o = parseCli({ guion: { type: 'string' }, salida: { type: 'string' } });
const archivo = o.guion;
if (!archivo) throw new Error('Uso: node scripts/explica-vista.mjs --guion guion.json');
const g = JSON.parse(fs.readFileSync(path.resolve(ROOT, archivo), 'utf8'));
const salida = path.resolve(ROOT, o.salida || path.join('out', `vista-${g.id}.png`));
const dibujos = g.dibujos || {};
const proporcion = (svg) => { const m = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/.exec(svg || ''); return m ? +m[2] / +m[1] : 1; };
const img = async (svg, ancho) => loadImage(Buffer.from(svg.replace('<svg ', `<svg width="${ancho}" height="${Math.round(ancho * proporcion(svg))}" `)));
const FONDO = { cocina: '#3f6688', plano: '#21508f', fabrica: '#28394b', cielo: '#7cc4f2', mar: '#1f8fc4', oscuro: '#1c1645', liso: '#ff9f62' };

// Escenas a 1/4 de tamaño (270x480), en filas de 6; arriba, la tira de dibujos
const S = 0.25, EW = 1080 * S, EH = 1920 * S, COL = 6, nombres = Object.keys(dibujos);
const filasD = Math.ceil(nombres.length / COL), filasE = Math.ceil(g.escenas.length / COL);
const cv = createCanvas(COL * (EW + 10) + 10, 10 + filasD * (EW + 40) + filasE * (EH + 50) + 10), ctx = cv.getContext('2d');
ctx.fillStyle = '#111'; ctx.fillRect(0, 0, cv.width, cv.height);
ctx.font = 'bold 16px sans-serif';
let errores = 0;
for (const [i, n] of nombres.entries()) {
  const x = 10 + (i % COL) * (EW + 10), y = 10 + Math.floor(i / COL) * (EW + 40);
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x, y, EW, EW);
  try {
    const p = proporcion(dibujos[n]), ancho = p > 1 ? EW / p : EW, im = await img(dibujos[n], Math.round(ancho * 2));
    const w = ancho, h = ancho * p; ctx.drawImage(im, x + (EW - w) / 2, y + (EW - h) / 2, w, h);
  } catch (e) { errores++; ctx.fillStyle = '#f55'; ctx.fillText(`ERROR: ${e.message.slice(0, 30)}`, x + 6, y + 30); }
  ctx.fillStyle = '#ddd'; ctx.fillText(n, x + 4, y + EW + 22);
}
const y0 = 10 + filasD * (EW + 40);
for (const [i, e] of g.escenas.entries()) {
  const x = 10 + (i % COL) * (EW + 10), y = y0 + Math.floor(i / COL) * (EH + 50);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, EW, EH); ctx.clip();
  ctx.fillStyle = FONDO[e.tipo === 'cierre' ? 'oscuro' : e.fondo] || FONDO.cocina; ctx.fillRect(x, y, EW, EH);
  ctx.fillStyle = '#ffffff22'; ctx.fillRect(x, y + 200 * S, EW, 230 * S); // franja de subtítulos
  for (const c of e.capas || []) {
    const cx = x + (c.x ?? 0.5) * EW, cy = y + (c.y ?? 0.5) * EH;
    if (c.svg) {
      const svg = dibujos[c.svg]; if (!svg) { errores++; ctx.fillStyle = '#f55'; ctx.fillText(`falta ${c.svg}`, cx - 40, cy); continue; }
      const w = (c.ancho || 500) * S, h = (c.alto || (c.ancho || 500) * proporcion(svg)) * S;
      try { ctx.drawImage(await img(svg, Math.round(w * 2)), cx - w / 2, cy - h / 2, w, h); } catch (err) { errores++; }
    } else if (c.etiqueta || c.numero) {
      const t = c.etiqueta || c.numero; ctx.font = 'bold 12px sans-serif'; const tw = ctx.measureText(t).width + 16;
      if (c.a) { ctx.strokeStyle = '#fff'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x + c.a[0] * EW, y + c.a[1] * EH); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = c.color || '#1d1d2b'; ctx.fillRect(cx - tw / 2, cy - 10, tw, 20); ctx.fillStyle = '#fff'; ctx.fillText(t, cx - tw / 2 + 8, cy + 4);
    } else if (c.presion || c.marca || c.burbujas) {
      ctx.strokeStyle = c.presion ? '#ff4d3d' : '#fff'; ctx.lineWidth = 2; ctx.beginPath();
      if (c.burbujas) ctx.rect(cx - (c.ancho || 0.2) * EW / 2, cy - (c.alto || 0.3) * EH / 2, (c.ancho || 0.2) * EW, (c.alto || 0.3) * EH);
      else ctx.ellipse(cx, cy, (c.radioX || c.radio || 200) * S, (c.radioY || c.radio || 200) * S, 0, 0, 7);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.fillStyle = '#ddd'; ctx.font = '12px sans-serif';
  const txt = `${i + 1}. ${e.texto}`;
  ctx.fillText(txt.slice(0, 44), x, y + EH + 16); ctx.fillText(txt.slice(44, 88), x, y + EH + 32);
}
fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, cv.toBuffer('image/png'));
console.log(`${salida}${errores ? ` · ${errores} error(es)` : ''}`);
