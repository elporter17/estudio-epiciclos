// Raíz del repo, .env y modelos. El .env (ignorado por git) no pisa variables ya definidas en el entorno.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

export const openaiKey = () => process.env.OPENAI_API_KEY || process.env.OPEN_AI;

// Modelos (configurables desde .env)
export const MODELS = {
  script: process.env.MINIDRAMAS_SCRIPT_MODEL || 'gpt-6-sol',
  tts: process.env.MINIDRAMAS_TTS_MODEL || 'gpt-4o-mini-tts',
  transcribe: process.env.MINIDRAMAS_TRANSCRIBE_MODEL || 'whisper-1',
  image: process.env.MINIDRAMAS_IMAGE_MODEL || 'gpt-image-2.5-flare',
  rewrite: process.env.MINIDRAMAS_REWRITE_MODEL || 'gpt-6-luna' // reescritura de prompts rechazados por el filtro
};
export const IMAGE_SIZE = process.env.MINIDRAMAS_IMAGE_SIZE || '1088x1920';
export const IMAGE_QUALITY = process.env.MINIDRAMAS_IMAGE_QUALITY || 'medium';

export const log = (m) => process.stderr.write(m);
