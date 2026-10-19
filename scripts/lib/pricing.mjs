// Precios de la API de OpenAI en USD, tomados de developers.openai.com/api/docs/pricing el 2026-10-19.
// Revísalos de vez en cuando: si cambian, actualiza esta tabla.
export const PRICES = {
  text: { // por 1M tokens
    'gpt-6-sol': { in: 2.0, out: 10.0 }, 'gpt-6.1-sol': { in: 2.0, out: 10.0 },
    'gpt-6-luna': { in: 0.1, out: 0.5 }, 'gpt-6-astra': { in: 10.0, out: 50.0 }
  },
  image: { // por 1M tokens
    'gpt-image-2.5-flare': { textIn: 5.0, imageIn: 8.0, out: 30.0 }, 'gpt-image-2.5-sunburst': { textIn: 5.0, imageIn: 8.0, out: 30.0 },
    'gpt-image-2': { textIn: 5.0, imageIn: 8.0, out: 30.0 }, 'gpt-image-1-mini': { textIn: 2.0, imageIn: 2.5, out: 8.0 }
  },
  ttsPerMinute: 0.015,        // gpt-4o-mini-tts: $12/1M tokens de audio ≈ $0.015 por minuto (estimación de OpenAI)
  transcribePerMinute: 0.006  // whisper-1
};

// Costo real de una imagen a partir del `usage` que devuelve la API
export function imageCost(usage, model = process.env.MINIDRAMAS_IMAGE_MODEL || 'gpt-image-2.5-flare') {
  const p = PRICES.image[model] || PRICES.image['gpt-image-2.5-flare'];
  if (!usage) return 0;
  const d = usage.input_tokens_details || {};
  const textIn = d.text_tokens ?? usage.input_tokens ?? 0, imageIn = d.image_tokens ?? 0;
  return (textIn * p.textIn + imageIn * p.imageIn + (usage.output_tokens || 0) * p.out) / 1e6;
}
