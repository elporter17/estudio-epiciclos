// Filtros de «cómo lo ve…» (punto de vista) sobre un cuadro ya dibujado en un canvas 2D. Sirven para historias como
// «Así ve el mundo un niño daltónico»: la misma escena se transforma con un fundido de ~0,35 s y vuelve a la normalidad.
//   tipos: deutan, protan, tritan (daltonismos reales, matrices de Machado et al. 2009, severidad 1,0),
//          verde-azul (estilizado: los verdes se vuelven azules y lo demás casi no cambia, como en los TikToks de «viendo el pasto»),
//          grises (acromatopsia), miopia (desenfoque), tunel (visión de túnel: se oscurecen los bordes)
// aplicarPOV(ctx, W, H, tipo, k): k = 0 (nada) … 1 (completo)
import { createCanvas } from '@napi-rs/canvas';

const MATRICES = {
  protan: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deutan: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritan: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039]
};
export const TIPOS_POV = ['deutan', 'protan', 'tritan', 'verde-azul', 'grises', 'miopia', 'tunel'];
export const NOMBRE_POV = { deutan: 'deuteranopia', protan: 'protanopia', tritan: 'tritanopia', 'verde-azul': 'daltonismo', grises: 'acromatopsia', miopia: 'miopía', tunel: 'visión de túnel' };
const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

export function aplicarPOV(ctx, W, H, tipo, k = 1) {
  if (k <= 0.004 || !TIPOS_POV.includes(tipo)) return;
  k = Math.min(1, k);
  if (tipo === 'miopia') {
    // Desenfoque: el cuadro se copia a otro canvas y se vuelve a dibujar con blur (más fuerte según k)
    const c2 = createCanvas(W, H); c2.getContext('2d').putImageData(ctx.getImageData(0, 0, W, H), 0, 0);
    ctx.save(); ctx.filter = `blur(${(14 * k).toFixed(1)}px)`; ctx.drawImage(c2, 0, 0); ctx.restore();
    return;
  }
  if (tipo === 'tunel') {
    const g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * (0.62 - 0.25 * k), W / 2, H * 0.45, Math.max(W, H) * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.97 * k})`);
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    return;
  }
  const img = ctx.getImageData(0, 0, W, H), d = img.data, n = d.length, m = MATRICES[tipo], ik = 1 - k;
  for (let i = 0; i < n; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let R, G, B;
    if (m) { R = m[0] * r + m[1] * g + m[2] * b; G = m[3] * r + m[4] * g + m[5] * b; B = m[6] * r + m[7] * g + m[8] * b; }
    else if (tipo === 'grises') { R = G = B = 0.299 * r + 0.587 * g + 0.114 * b; }
    else { // verde-azul: solo donde manda el verde
      if (g > r * 1.08 && g > b * 1.08) { R = r * 0.88; G = g * 0.42 + b * 0.4; B = g * 1.15 + b * 0.3; } else { R = r; G = g; B = b; }
    }
    d[i] = cl(ik * r + k * R); d[i + 1] = cl(ik * g + k * G); d[i + 2] = cl(ik * b + k * B);
  }
  ctx.putImageData(img, 0, 0);
}
