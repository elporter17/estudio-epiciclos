#!/usr/bin/env node
// Imágenes del canal de YouTube de Potter Play, hechas aquí con canvas (sin IA): banner (2048×1152, con todo lo
// importante dentro de la zona segura de 1235×338 del centro) y foto de perfil (800×800, el logo de la página de Facebook).
//   node scripts/youtube-marca.mjs   → out/youtube/banner.png y out/youtube/perfil.png
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ROOT, setupNode } from './lib/node-env.mjs';

setupNode();
const OUT = path.join(ROOT, 'out', 'youtube'); fs.mkdirSync(OUT, { recursive: true });
const logo = await loadImage(fs.readFileSync(path.join(ROOT, 'assets', 'marca', 'potter-play-logo.jpg')));
const C = { fondo: '#12161d', magenta: '#ff2fa0', cian: '#2ee6f0', amarillo: '#ffd23c', morado: '#8a4dff' };
// El emblema del logo (círculo de radio ≈ 240 alrededor de (482, 405) en el original de 960 px), recortado en círculo
const S = logo.width / 960;
function emblema(c, x, y, r) {
  c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
  c.drawImage(logo, (482 - 250) * S, (405 - 250) * S, 500 * S, 500 * S, x - r * 250 / 240, y - r * 250 / 240, r * 500 / 240, r * 500 / 240);
  c.restore();
}
const BLACK = '"Archivo Black", Impact, sans-serif', SANS = '"IBM Plex Sans", system-ui, sans-serif';
let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);

// Perfil: el emblema del logo (sin el texto de abajo), centrado
{
  const cv = createCanvas(800, 800), c = cv.getContext('2d');
  c.fillStyle = C.fondo; c.fillRect(0, 0, 800, 800);
  emblema(c, 400, 400, 370);
  fs.writeFileSync(path.join(OUT, 'perfil.png'), cv.toBuffer('image/png'));
}

// Banner
{
  const W = 2048, H = 1152, cv = createCanvas(W, H), c = cv.getContext('2d');
  c.fillStyle = C.fondo; c.fillRect(0, 0, W, H);
  // Brillos de color y estrellitas en píxeles (el estilo del logo)
  for (const [x, y, r, col] of [[420, 420, 700, 'rgba(255,47,160,0.28)'], [1650, 760, 760, 'rgba(46,230,240,0.22)'], [1050, 580, 520, 'rgba(138,77,255,0.25)']]) {
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  for (let k = 0; k < 220; k++) { const col = [C.magenta, C.cian, C.amarillo, '#ffffff'][k % 4], t = 4 + Math.floor(rnd() * 3) * 4; c.globalAlpha = 0.25 + rnd() * 0.6; c.fillStyle = col; c.fillRect(Math.floor(rnd() * W / 4) * 4, Math.floor(rnd() * H / 4) * 4, t, t); }
  c.globalAlpha = 1;
  // Zona segura: 1235×338 centrada (406..1641, 407..745)
  const zx = (W - 1235) / 2, zy = (H - 338) / 2;
  emblema(c, zx + 175, zy + 169, 172);
  const tx = zx + 400;
  c.textBaseline = 'alphabetic'; c.fillStyle = '#ffffff'; c.font = `120px ${BLACK}`;
  c.shadowColor = C.magenta; c.shadowOffsetX = 6; c.shadowOffsetY = 6; c.fillText('POTTER PLAY', tx, zy + 130); c.shadowColor = 'transparent';
  c.font = `600 44px ${SANS}`; c.fillStyle = C.cian; c.fillText('Cómo se hace · Quizzes · Retos · Curiosidades', tx, zy + 205);
  // Píldora: frecuencia
  const p = 'VIDEOS NUEVOS CADA DÍA'; c.font = `38px ${BLACK}`; const pw = c.measureText(p).width + 60;
  c.fillStyle = C.amarillo; c.beginPath(); c.roundRect(tx, zy + 245, pw, 70, 35); c.fill();
  c.fillStyle = '#111'; c.fillText(p, tx + 30, zy + 295);
  fs.writeFileSync(path.join(OUT, 'banner.png'), cv.toBuffer('image/png'));
}
console.log(OUT);
