// Estilos retro para los videos de fondo (semana de GTA VI, 2026-11-11): «8 bits» (pocos píxeles y pocos colores, con
// tramado) y «PS2» (baja resolución, bordes dentados y colores saturados, como un juego de 2002). Se aplican solo al
// clip de fondo con ffmpeg: el texto del Reel se dibuja encima y queda nítido. Sin IA: es un filtro sobre el video.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const FILTRO = {
  '8bits': '[0:v]fps=24,scale=108:192:force_original_aspect_ratio=increase:flags=neighbor,crop=108:192,eq=saturation=1.45:contrast=1.1,split[a][b];[a]palettegen=max_colors=16:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=2,scale=1080:1920:flags=neighbor,format=yuv420p[v]',
  ps2: '[0:v]fps=30,scale=270:480:force_original_aspect_ratio=increase:flags=bilinear,crop=270:480,eq=saturation=1.3:contrast=1.08:gamma=0.95,scale=1080:1920:flags=neighbor,format=yuv420p[v]'
};
export const ESTILOS_RETRO = Object.keys(FILTRO);
export const NOMBRE_RETRO = { '8bits': 'EN 8 BITS 👾', ps2: 'ESTILO PS2 🎮' };

// Devuelve la ruta del clip con el estilo (en caché junto al original); si ffmpeg falla, el original
export function clipRetro(archivo, estilo) {
  if (!FILTRO[estilo] || !archivo || !fs.existsSync(archivo)) return archivo;
  const out = archivo.replace(/(\.[^.]+)$/, `-${estilo}.mp4`);
  if (fs.existsSync(out)) return out;
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', archivo, '-filter_complex', FILTRO[estilo], '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', out], { stdio: ['ignore', 'ignore', 'pipe'] });
  if (r.status !== 0) { console.error(`Aviso: estilo ${estilo} no se pudo aplicar a ${path.basename(archivo)}: ${String(r.stderr).slice(0, 200)}`); return archivo; }
  return out;
}
// Todas las escenas con video de fondo (e.fondo, de scripts/lib/stock.mjs)
export function aplicarRetro(escenas, estilo) {
  let n = 0;
  for (const e of escenas) if (e.fondo) { const v = clipRetro(e.fondo, estilo); if (v !== e.fondo) { e.fondo = v; n++; } }
  return n;
}
