import { parseArgs } from 'node:util';

// En PowerShell 5.1, «npm run x -- --flag» pierde el «--» y los flags llegan como argumentos sueltos
export function parseCli(options) {
  const { values, positionals } = parseArgs({ options, allowNegative: true, allowPositionals: true });
  if (positionals.length) throw new Error(`Argumentos sin opción: ${positionals.join(' ')}. Si usas PowerShell, npm se come el «--»: ejecuta «npm.cmd run … -- --opción valor» o «node scripts/….mjs --opción valor».`);
  return values;
}
