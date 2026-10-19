import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

// En PowerShell 5.1, «npm run x -- --flag» pierde el «--» y los flags llegan como argumentos sueltos
export function parseCli(options) {
  const { values, positionals } = parseArgs({ options, allowNegative: true, allowPositionals: true });
  if (positionals.length) throw new Error(`Argumentos sin opción: ${positionals.join(' ')}. Si usas PowerShell, npm se come el «--»: ejecuta «npm.cmd run … -- --opción valor» o «node scripts/….mjs --opción valor».`);
  return values;
}

// --ep 1 | 1,3 | 2-4 | all → lista de números de episodio
export function parseEpisodes(spec, total) {
  if (!spec || spec === 'all') return Array.from({ length: total }, (_, i) => i + 1);
  const out = new Set();
  for (const part of String(spec).split(',')) {
    const [a, b] = part.split('-').map((x) => parseInt(x, 10));
    if (!Number.isInteger(a)) throw new Error(`--ep inválido: ${spec}`);
    for (let n = a; n <= (Number.isInteger(b) ? b : a); n++) {
      if (n < 1 || n > total) throw new Error(`La serie tiene ${total} episodios (pediste ${n}).`);
      out.add(n);
    }
  }
  return [...out].sort((x, y) => x - y);
}

// Corre una lista de tareas asíncronas con un máximo de N a la vez
export async function pool(items, limit, fn) {
  const results = new Array(items.length); let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// true si el módulo se ejecuta directo (y no importado desde all.mjs)
export const isMain = (url) => !!process.argv[1] && url === pathToFileURL(process.argv[1]).href;

export function run(url, main) {
  if (isMain(url)) main().catch((e) => { console.error(`\nError: ${e.message}`); process.exit(1); });
}
