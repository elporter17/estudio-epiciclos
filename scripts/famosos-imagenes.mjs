#!/usr/bin/env node
// Genera con la API de imágenes de OpenAI las figuras de data/famosos.json que todavía no tienen imagen:
// caras en stencil de dos tonos y siluetas negras de poses y goles. Cuesta ≈ $0.035 por imagen.
// El original queda en out/famosos-originales/ (no se sube) y la versión limpia en assets/famosos/<id>.png.
//
//   node --env-file=../minidramas/.env scripts/famosos-imagenes.mjs            (todas las que falten)
//   node --env-file=../minidramas/.env scripts/famosos-imagenes.mjs --id siuuu (solo una; --force la rehace)
// La clave se lee de OPENAI_API_KEY (o OPEN_AI) y nunca se imprime.
import fs from 'node:fs';
import path from 'node:path';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';
import { limpiarSilueta, FAMOSOS, guardarFamosos } from './lib/famosos.mjs';

const MODEL = process.env.CIRCULARTE_IMAGE_MODEL || 'gpt-image-2.5-flare';
const PRICE = { textIn: 5.0, out: 30.0 }; // USD por 1M tokens (gpt-image-2.5-flare, revisado el 2026-10-19)

const PROMPTS = {
  cara: (p) => `Bold two-tone street-art stencil portrait of ${p}. Head and shoulders, front three-quarter view. Pure black shapes on a pure white background: no gray, no gradients, no text, no frame, no scenery. Simple, thick, clean shapes that keep the person recognizable, suitable for tracing as a silhouette.`,
  pose: (p) => `Solid pure black silhouette on a plain pure white background of ${p}. Full body, from the angle that makes the pose instantly recognizable. One solid black shape (the ball also solid black if it appears), crisp clean edges, no inner details, no ground line, no shadow, no text, nothing else.`
};
PROMPTS.gol = PROMPTS.pose;

async function generar(f, key) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: PROMPTS[f.tipo](f.prompt), size: '1024x1024', quality: 'medium', output_format: 'png' })
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(j.error?.message || `HTTP ${res.status}`), { code: j.error?.code });
  const u = j.usage || {}, cost = ((u.input_tokens || 0) * PRICE.textIn + (u.output_tokens || 0) * PRICE.out) / 1e6;
  return { png: Buffer.from(j.data[0].b64_json, 'base64'), cost };
}

async function main() {
  const o = parseCli({ id: { type: 'string' }, force: { type: 'boolean', default: false }, concurrency: { type: 'string', default: '3' } });
  const key = process.env.OPENAI_API_KEY || process.env.OPEN_AI;
  if (!key) throw new Error('Falta OPENAI_API_KEY (o OPEN_AI). Pásala con --env-file=../minidramas/.env');
  const dirOrig = path.join(ROOT, 'out', 'famosos-originales'), dirOut = path.join(ROOT, 'assets', 'famosos');
  fs.mkdirSync(dirOrig, { recursive: true }); fs.mkdirSync(dirOut, { recursive: true });
  const todo = FAMOSOS.figuras.filter((f) => (!o.id || f.id === o.id) && (o.force || !fs.existsSync(path.join(dirOut, `${f.id}.png`))));
  console.error(`${todo.length} imagen(es) por generar con ${MODEL} (≈ $${(todo.length * 0.035).toFixed(2)})`);
  let total = 0, ok = 0; const fallas = [];
  const queue = [...todo];
  await Promise.all(Array.from({ length: Math.max(1, +o.concurrency) }, async () => {
    while (queue.length) {
      const f = queue.shift();
      try {
        // El filtro de contenido a veces rechaza; un segundo intento a veces pasa
        let r; try { r = await generar(f, key); } catch (e) { if (e.code !== 'moderation_blocked') throw e; r = await generar(f, key); }
        total += r.cost; ok++;
        fs.writeFileSync(path.join(dirOrig, `${f.id}.png`), r.png);
        const limpio = await limpiarSilueta(r.png);
        fs.writeFileSync(path.join(dirOut, `${f.id}.png`), limpio.png);
        f.imagen = `assets/famosos/${f.id}.png`; f.origen = MODEL; delete f.error;
        console.error(`  ✓ ${f.id} ($${r.cost.toFixed(3)}, ${limpio.w}x${limpio.h})`);
      } catch (e) {
        f.error = e.code || e.message; fallas.push(`${f.id}: ${e.message}`);
        console.error(`  ✗ ${f.id}: ${e.message}`);
      }
    }
  }));
  guardarFamosos();
  console.error(`Listo: ${ok} generadas, ${fallas.length} con error · costo ≈ $${total.toFixed(2)}`);
}

main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
