/* CirculArte · punto de entrada común de los videos de física: las pelotas en el círculo (src/bounce.js) y los
   juegos (src/arcade.js). La web, scripts/bounce.mjs y la publicación automática usan solo esto. */
import { simulate as simulateBounce, drawBounce, bounceHook, synthAudio, BOUNCE_MODES, BOUNCE_NAMES } from './bounce.js';
import { simulateArcade, drawArcade, arcadeHook, ARCADE_MODES, ARCADE_NAMES } from './arcade.js';

export { synthAudio };
export const FISICA_MODES = [...BOUNCE_MODES, ...ARCADE_MODES];
export const FISICA_NAMES = { ...BOUNCE_NAMES, ...ARCADE_NAMES };
export const isArcade = (mode) => ARCADE_MODES.includes(mode);
// Categoría de la publicación automática y de las descripciones: pelotas-<modo> o juegos-<modo>
export const fisicaGroup = (mode) => (isArcade(mode) ? 'juegos' : 'pelotas');
export const fisicaCat = (mode) => `${fisicaGroup(mode)}-${mode}`;

export function simulateFisica({ mode, seed = 1 }) {
  if (!FISICA_MODES.includes(mode)) throw new Error(`Variante desconocida «${mode}». Usa ${FISICA_MODES.join(', ')}`);
  return isArcade(mode) ? simulateArcade({ mode, seed }) : simulateBounce({ mode, seed });
}
export function fisicaHook(run, lang) {
  return isArcade(run.mode) ? arcadeHook(run, lang) : bounceHook(run.mode, lang, run.seed);
}
// opts: { caption, prompt, lang, fallback }; sin caption usa el gancho de la corrida
export function drawFisica(ctx, run, t, view, opts = {}) {
  const o = { ...opts, caption: opts.caption ?? fisicaHook(run, opts.lang) };
  return isArcade(run.mode) ? drawArcade(ctx, run, t, view, o) : drawBounce(ctx, run, t, view, o);
}
