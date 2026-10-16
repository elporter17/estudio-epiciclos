// Carga .env de la raíz del repo si existe (claves de Anthropic/TikTok). No pisa variables ya definidas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..', '.env');
if (fs.existsSync(file) && typeof process.loadEnvFile === 'function') process.loadEnvFile(file);
