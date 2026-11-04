// Narración de los videos con una voz local: un modelo de voz que corre en esta máquina, gratis y sin internet.
// Si el motor o la voz no están instalados, devuelve null y el video sale sin narración (nunca falla por esto).
// Voz: $VOZ = «motor:voz». Por defecto kokoro:em_alex (2026-11-04, elegida por Erick); también p. ej. kokoro:ef_dora o
// piper:es_MX-claude-high. Para cambiarla basta con la variable VOZ (en .env o en el workflow).
// Instalar en local:  py -m venv .tools/voz && .tools/voz/Scripts/python -m pip install kokoro-onnx piper-tts
//   Kokoro: bajar kokoro-v1.0.onnx y voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx, releases model-files-v1.0) a .tools/kokoro
//   Piper:  .tools/voz/Scripts/python -m piper.download_voices --download-dir .tools/voces es_MX-claude-high
// En GitHub Actions lo instala daily.yml (con caché). Carpetas: $VOZ_KOKORO y $VOZ_PIPER.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './node-env.mjs';

export const VOZ_DEFECTO = 'kokoro:em_alex';

function motor(voz) {
  const [m, v] = voz.includes(':') ? voz.split(':') : ['piper', voz];
  if (m === 'kokoro') {
    const d = process.env.VOZ_KOKORO || path.join(ROOT, '.tools', 'kokoro');
    return { pedido: { motor: m, voz: v, modelo: path.join(d, 'kokoro-v1.0.onnx'), voces: path.join(d, 'voices-v1.0.bin') }, archivo: path.join(d, 'kokoro-v1.0.onnx') };
  }
  const archivo = path.join(process.env.VOZ_PIPER || path.join(ROOT, '.tools', 'voces'), `${v}.onnx`);
  return { pedido: { motor: 'piper', modelo: archivo }, archivo };
}

function python() {
  if (process.env.VOZ_PYTHON) return process.env.VOZ_PYTHON;
  for (const p of [path.join(ROOT, '.tools', 'voz', 'Scripts', 'python.exe'), path.join(ROOT, '.tools', 'voz', 'bin', 'python')]) if (fs.existsSync(p)) return p;
  return null;
}

// Lo que la voz no debe leer tal cual: emojis, comillas angulares, palabras en MAYÚSCULAS (las deletrearía) y unidades
export function paraLeer(t) {
  return String(t)
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/[«»"“”]/g, '')
    .replace(/(\d)\s*°\s*C\b/g, '$1 grados').replace(/°/g, ' grados')
    .replace(/(\d)\s*km\/h\b/g, '$1 kilómetros por hora').replace(/(\d)\s*km\b/g, '$1 kilómetros')
    .replace(/(\d)\s*kg\b/g, '$1 kilos').replace(/(\d)\s*cm\b/g, '$1 centímetros').replace(/(\d)\s*mm\b/g, '$1 milímetros')
    .replace(/(\d)\s*m\b/g, '$1 metros').replace(/(\d)\s*g\b/g, '$1 gramos').replace(/(\d)\s*%/g, '$1 por ciento')
    .replace(/\b(\p{Lu}{2,})\b/gu, (w) => w.toLowerCase())
    .replace(/\s+/g, ' ').trim();
}

// WAV PCM de 16 bits (lo que escribe Piper) → Float32Array a SR Hz, mono (interpolación lineal)
function leerWav(file, SR) {
  const b = fs.readFileSync(file); let p = 12, fmt = null, datos = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), n = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { canales: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12) };
    if (id === 'data') { datos = b.subarray(p + 8, p + 8 + n); break; }
    p += 8 + n + (n % 2);
  }
  if (!fmt || !datos) return new Float32Array(0);
  const muestras = datos.length / 2 / fmt.canales, src = new Float32Array(muestras);
  for (let i = 0; i < muestras; i++) src[i] = datos.readInt16LE(i * 2 * fmt.canales) / 32768;
  const r = fmt.sr / SR, out = new Float32Array(Math.floor(muestras / r));
  for (let i = 0; i < out.length; i++) { const x = i * r, k = Math.floor(x), f = x - k; out[i] = src[k] * (1 - f) + (src[k + 1] ?? 0) * f; }
  // Pico a 0.85 para que todas las frases suenen parejas
  let pico = 0; for (const v of out) pico = Math.max(pico, Math.abs(v));
  if (pico > 0) for (let i = 0; i < out.length; i++) out[i] *= 0.85 / pico;
  return out;
}

// textos → [Float32Array] en el mismo orden, o null si no hay Piper/voz
export function narrar(textos, { SR = 44100, voz = process.env.VOZ || VOZ_DEFECTO, velocidad = 1.0, log = (m) => process.stderr.write(m) } = {}) {
  const py = python(), { pedido, archivo } = motor(voz);
  if (!py || !fs.existsSync(archivo)) { log(`Sin narración: falta ${py ? `la voz ${voz}` : 'Piper'} (ver scripts/lib/voz.mjs)\n`); return null; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voz-'));
  try {
    const r = spawnSync(py, [path.join(ROOT, 'scripts', 'voz.py')], { input: JSON.stringify({ ...pedido, dir, textos: textos.map(paraLeer), velocidad }), encoding: 'utf8', maxBuffer: 16 << 20,
      // Sin modo UTF-8, Python en Windows lee «á» como «Ã¡» y la voz «lee las tildes»
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' } });
    if (r.status !== 0) { log(`Sin narración: Piper falló (${String(r.stderr).trim().slice(-300)})\n`); return null; }
    return textos.map((_, i) => leerWav(path.join(dir, `${String(i).padStart(3, '0')}.wav`), SR));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
