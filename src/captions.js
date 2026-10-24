/* CirculArte · descripción y hashtags para TikTok con plantillas propias (sin IA ni APIs de pago).
   Compartido entre la web (diálogo «Publicar en TikTok») y Node (scripts/caption.mjs, la publicación automática).
   La elección es estable: la misma figura y semilla dan el mismo texto. */
export const SITE = 'circularte.edav-tech.com';

// Sin spoiler: no dicen qué figura es, para que se vea hasta el final
const MYSTERY = {
  es: [
    '¿Adivinas qué va a dibujar antes del final? 👀',
    'Solo círculos girando. Di en los comentarios qué crees que es 🤔',
    'Casi nadie adivina esta figura antes del final 🌀',
    'Cada círculo suma un detalle. ¿Qué sale al final? ✨',
    'Empieza como un garabato… espera a que se complete 😳',
    'Matemáticas puras: cientos de círculos y una sola figura. ¿Cuál? 🌀',
    'Si adivinas antes del final, eres un genio 🧠',
    'Una serie de Fourier dibujando algo. Tu apuesta en los comentarios 👇'
  ],
  en: [
    'Can you guess what it draws before the end? 👀',
    'Just spinning circles. Tell me in the comments what you think it is 🤔',
    'Almost nobody guesses this shape before the end 🌀',
    'Every circle adds a detail. What comes out at the end? ✨',
    'It starts like a scribble… wait until it is complete 😳',
    'Pure math: hundreds of circles and a single shape. Which one? 🌀',
    'If you guess before the end, you are a genius 🧠',
    'A Fourier series drawing something. Your guess in the comments 👇'
  ]
};
// Sin spoiler, para nombres y parejas de la biblioteca (info.cat)
const MYSTERY_CAT = {
  nombres: {
    es: [
      '¿Y si es tu nombre? Espera el final 👀',
      'Un nombre escrito solo con círculos que giran. ¿Cuál será? ✍️',
      '¿Adivinas qué nombre va a escribir? 🤔',
      'Si sale tu nombre, comenta 🙋',
      'Etiqueta a alguien que se llame así cuando lo descubras 👇'
    ],
    en: [
      'What if it is your name? Wait for the end 👀',
      'A name written only with spinning circles. Which one? ✍️',
      'Can you guess which name it will write? 🤔',
      'If it is your name, comment 🙋',
      'Tag someone with this name once you find out 👇'
    ]
  },
  combinaciones: {
    es: [
      '¿Qué pareja se escribe al final? 💞',
      'Dos nombres, cientos de círculos. ¿Quiénes son? 💘',
      'Etiqueta a la pareja que se llame así 👇',
      'Si son ustedes, comenten 👀'
    ],
    en: [
      'Which couple gets written at the end? 💞',
      'Two names, hundreds of circles. Who are they? 💘',
      'Tag the couple with these names 👇',
      'If it is you two, comment 👀'
    ]
  }
};
// Pelotas que rebotan (src/bounce.js): un cat por variante
MYSTERY_CAT['pelotas-crece'] = {
  es: ['Cada rebote la hace más grande. ¿Llenará el círculo? 👀', '¿Cuántos rebotes aguanta antes de llenarlo todo? Comenta tu apuesta 👇', 'Sube el volumen: cada rebote es una nota 🎶', '¿Lo llena o no? Mira hasta el último segundo 😳', 'Apuesto a que no adivinas cuántos rebotes da 🤔', 'Si llegaste al final, comenta «lo vi» 👇'],
  en: ['Every bounce makes it bigger. Will it fill the circle? 👀', 'How many bounces until it fills everything? Comment your bet 👇', 'Turn the sound on: every bounce is a note 🎶', 'Does it fill it or not? Watch to the very last second 😳', 'Bet you can\'t guess how many bounces it takes 🤔', 'If you made it to the end, comment «I saw it» 👇']
};
MYSTERY_CAT['pelotas-multiplica'] = {
  es: ['Cada rebote suelta otra pelota. Mira cómo termina 🤯', '¿Cuántas pelotas caben en un círculo? Comenta tu número 👇', 'Sube el volumen: cada rebote es una nota 🎶', 'Elige un color y no lo pierdas de vista 👀', '¿En qué segundo ya no cabe ninguna más? 🤔', 'Etiqueta a alguien que se quede viendo esto 👇'],
  en: ['Every bounce drops another ball. Watch how it ends 🤯', 'How many balls fit in a circle? Comment your number 👇', 'Turn the sound on: every bounce is a note 🎶', 'Pick a color and keep your eyes on it 👀', 'At what second does nothing else fit? 🤔', 'Tag someone who would stare at this 👇']
};
MYSTERY_CAT['pelotas-escape'] = {
  es: ['Cada pelota que escapa suelta dos más. ¿Cuántas salen? 🔴', 'El círculo gira con un hueco… esto se descontrola 🤯', 'Sube el volumen: cada rebote es una nota 🎶', '¿Cuántas crees que escapan? Comenta antes de que termine 👇', 'Elige una pelota: ¿logra escapar? 👀', 'Etiqueta a alguien que siempre encuentra la salida 👇'],
  en: ['Every ball that escapes releases two more. How many get out? 🔴', 'The circle spins with a gap… this gets out of hand 🤯', 'Turn the sound on: every bounce is a note 🎶', 'How many do you think escape? Comment before it ends 👇', 'Pick a ball: does it make it out? 👀', 'Tag someone who always finds the way out 👇']
};
const CAT_TAGS = { nombres: { es: 'tunombre', en: 'yourname' }, combinaciones: { es: 'parejas', en: 'couples' } };
// Las pelotas no son matemáticas de Fourier: llevan sus propios hashtags base
const BASE_TAGS = { pelotas: { es: ['satisfactorio', 'fisica', 'pelotas'], en: ['satisfying', 'physics', 'balls'] } };
// Con spoiler: nombran la figura
const NAMED = {
  es: ['¿Pueden unos círculos girando dibujar esto? {x}, mira cómo baja el error 👀', '{x}, dibujado solo con círculos que giran. Espera el final ✨', 'Una serie de Fourier dibujando: {x} 🌀'],
  en: ['Can spinning circles draw this? {x}, watch the error drop 👀', '{x}, drawn only with spinning circles. Wait for the end ✨', 'A Fourier series drawing: {x} 🌀']
};
const TAGS = {
  es: { base: ['matematicas', 'fourier', 'epiciclos'], extra: ['arte', 'parati', 'satisfactorio', 'mathart', 'ciencia', 'adivina', 'fyp', 'dibujo'] },
  en: { base: ['math', 'fourier', 'epicycles'], extra: ['mathart', 'fyp', 'satisfying', 'science', 'guess', 'art', 'drawing', 'foryou'] }
};

// Semilla estable a partir de un texto (FNV-1a)
export function hashSeed(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// info: { name, nameEn?, id?, seed?, createdAt?, cat? } (cat: nombres | combinaciones | figuras | inventadas)
export function makeCaption(info, { lang = info.lang || 'es', cta = true, spoiler = true } = {}) {
  const name = lang === 'en' ? info.nameEn || info.name : info.name;
  const h = hashSeed(`${info.id || name}|${info.seed ?? ''}|${info.createdAt ?? ''}`);
  const list = spoiler ? NAMED[lang] : MYSTERY_CAT[info.cat]?.[lang] || MYSTERY[lang];
  let description = list[h % list.length].replace('{x}', name);
  if (cta) description += lang === 'en' ? ` Make yours at ${SITE}` : ` Haz el tuyo en ${SITE}`;
  const { extra } = TAGS[lang], catTag = CAT_TAGS[info.cat]?.[lang];
  const base = BASE_TAGS[String(info.cat || '').split('-')[0]]?.[lang] || TAGS[lang].base;
  const hashtags = [...base, ...(catTag ? [catTag] : []), ...[0, 1, 2].map((i) => extra[(h >>> (i * 5)) % extra.length])].filter((t, i, a) => a.indexOf(t) === i);
  return { description, hashtags, source: 'template' };
}

// Texto final del post: descripción + hashtags (TikTok admite hasta 2200 caracteres)
export const postText = (c) => `${c.description}\n\n${c.hashtags.map((h) => '#' + h).join(' ')}`.slice(0, 2200);
