/* CirculArte · punto de entrada común de los videos de física: las pelotas en el círculo (src/bounce.js) y los
   juegos (src/arcade.js), con melodías de dominio público (src/melodias.js). La web, scripts/bounce.mjs y la
   publicación automática usan solo esto. */
import { simulate as simulateBounce, drawBounce, bounceHook, synthAudio, BOUNCE_MODES, BOUNCE_NAMES } from './bounce.js';
import { simulateArcade, drawArcade, arcadeHook, ARCADE_MODES, ARCADE_NAMES, COUNTRIES } from './arcade.js';
import { applyMelody, melodyFor, MELODIAS, MELODIA_IDS } from './melodias.js';

export { synthAudio, MELODIAS, MELODIA_IDS };
// Banderas de la carrera de países (la web carga solo estos caracteres de Noto Color Emoji)
export const FLAGS = COUNTRIES.map((c) => c[3]).join('');
export const FISICA_MODES = [...BOUNCE_MODES, ...ARCADE_MODES];
export const FISICA_NAMES = { ...BOUNCE_NAMES, ...ARCADE_NAMES };
export const isArcade = (mode) => ARCADE_MODES.includes(mode);
// Categoría de la publicación automática y de las descripciones: pelotas-<modo> o juegos-<modo>
export const fisicaGroup = (mode) => (isArcade(mode) ? 'juegos' : 'pelotas');
export const fisicaCat = (mode) => `${fisicaGroup(mode)}-${mode}`;

// melody: id de MELODIAS, 'none' (notas sueltas) o sin dar (la semilla decide: 7 de cada 10 llevan melodía)
export function simulateFisica({ mode, seed = 1, melody }) {
  if (!FISICA_MODES.includes(mode)) throw new Error(`Variante desconocida «${mode}». Usa ${FISICA_MODES.join(', ')}`);
  const run = isArcade(mode) ? simulateArcade({ mode, seed }) : simulateBounce({ mode, seed });
  const mel = melody === 'none' ? null : melody || melodyFor(seed);
  return mel ? applyMelody(run, mel) : run;
}
const SONG_HOOK = { es: '¿Reconoces la canción? 🎵', en: 'Do you recognize the song? 🎵' };
export function fisicaHook(run, lang) {
  // Con melodía, una de cada tres corridas pregunta por la canción (menos las que piden elegir país o peleador)
  if (run.melody && (run.seed >>> 0) % 3 === 0 && run.mode !== 'batalla' && run.mode !== 'paises') return SONG_HOOK[lang === 'en' ? 'en' : 'es'];
  return isArcade(run.mode) ? arcadeHook(run, lang) : bounceHook(run.mode, lang, run.seed);
}
// opts: { caption, prompt, lang, fallback, emojiFont }; sin caption usa el gancho de la corrida
export function drawFisica(ctx, run, t, view, opts = {}) {
  const o = { ...opts, caption: opts.caption ?? fisicaHook(run, opts.lang) };
  return isArcade(run.mode) ? drawArcade(ctx, run, t, view, o) : drawBounce(ctx, run, t, view, o);
}
