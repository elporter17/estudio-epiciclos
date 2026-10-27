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
// Juegos de física (src/arcade.js)
MYSTERY_CAT['juegos-embudos'] = {
  es: ['Cada pelota que sale suelta varias más… ¿cuántas llegan abajo? 🤯', '¿Cuántas crees que escapan? Comenta antes del final 👇', 'Sube el volumen: cada rebote es una nota 🎶', 'Esto se llena más rápido de lo que crees 😳', 'Elige una y síguela hasta la salida 👀'],
  en: ['Every ball that gets out drops a few more… how many reach the bottom? 🤯', 'How many do you think escape? Comment before the end 👇', 'Turn the sound on: every bounce is a note 🎶', 'This fills up faster than you think 😳', 'Pick one and follow it to the exit 👀']
};
MYSTERY_CAT['juegos-anillos'] = {
  es: ['¿Logra escapar de todos los anillos? 👀', 'Cada anillo gira con un hueco… ¿sale o se queda? Comenta 👇', 'Sube el volumen: cada rebote es una nota 🎶', 'El último anillo es el más difícil 😳', 'Apuesta: ¿en qué anillo se queda? 🎯'],
  en: ['Can it escape every ring? 👀', 'Every ring spins with a gap… does it get out? Comment 👇', 'Turn the sound on: every bounce is a note 🎶', 'The last ring is the hardest 😳', 'Bet: which ring does it get stuck in? 🎯']
};
MYSTERY_CAT['juegos-plinko'] = {
  es: ['¿En qué casilla caen más? Elige la tuya 👇', 'Mira la forma que aparece al final 😳', 'Sube el volumen: cada choque es una nota 🎶', 'Elige una casilla antes de que empiece 🎯', '¿Izquierda, centro o derecha? Comenta 👇'],
  en: ['Which slot gets the most? Pick yours 👇', 'Watch the shape that appears at the end 😳', 'Turn the sound on: every hit is a note 🎶', 'Pick a slot before it starts 🎯', 'Left, center or right? Comment 👇']
};
MYSTERY_CAT['juegos-carrera'] = {
  es: ['¿Qué color gana? Elige uno antes de que empiece 👇', 'Carrera de colores: comenta tu favorito 🏁', 'Sube el volumen y elige un color 🎶', 'El último lugar te va a sorprender 😳', '¿Tu color gana o pierde? 🤔'],
  en: ['Which color wins? Pick one before it starts 👇', 'Color race: comment your favorite 🏁', 'Turn the sound on and pick a color 🎶', 'Last place is going to surprise you 😳', 'Does your color win or lose? 🤔']
};
MYSTERY_CAT['juegos-paises'] = {
  es: ['¿Qué país gana? Comenta el tuyo antes de que empiece 👇', 'Carrera de banderas: ¿llega primero tu país? 🏁', 'Sube el volumen y elige un país 🎶', 'El último lugar te va a sorprender 😳', 'Si gana tu país, comenta su bandera 👇'],
  en: ['Which country wins? Comment yours before it starts 👇', 'Flag race: does your country finish first? 🏁', 'Turn the sound on and pick a country 🎶', 'Last place is going to surprise you 😳', 'If your country wins, comment its flag 👇']
};
MYSTERY_CAT['juegos-muros'] = {
  es: ['Cada choque rompe un poco el muro. ¿Logra salir? 🧱', '¿Cuántos rebotes para romper todos los muros? Comenta tu número 👇', 'Sube el volumen: cada choque es una nota 🎶', 'El último muro es el más duro 😳', 'Mira hasta el final: ¿escapa o no? 👀'],
  en: ['Every hit cracks the wall a little. Does it get out? 🧱', 'How many bounces to break every wall? Comment your number 👇', 'Turn the sound on: every hit is a note 🎶', 'The last wall is the toughest 😳', 'Watch to the end: does it escape? 👀']
};
MYSTERY_CAT['juegos-batalla'] = {
  es: ['¿Quién gana esta pelea? Elige tu color antes de que empiece ⚔️', 'Batalla de pelotas: comenta tu apuesta 👇', 'Sube el volumen: cada golpe es una nota 🎶', 'El final está más reñido de lo que crees 😳', '¿Izquierda o derecha? Comenta quién gana 👇'],
  en: ['Who wins this fight? Pick your color before it starts ⚔️', 'Ball battle: comment your bet 👇', 'Turn the sound on: every hit is a note 🎶', 'The ending is closer than you think 😳', 'Left or right? Comment who wins 👇']
};
MYSTERY_CAT['pelotas-lineas'] = {
  es: ['Cada rebote deja una línea… mira el dibujo que sale 😳', 'Sube el volumen: cada rebote es una nota 🎶', '¿Qué forma ves al final? Comenta 👇', 'No es magia, es física. Espera el final ✨', 'Si te relajó, comenta «otra» 👇'],
  en: ['Every bounce leaves a line… watch the drawing it makes 😳', 'Turn the sound on: every bounce is a note 🎶', 'What shape do you see at the end? Comment 👇', 'It is not magic, it is physics. Wait for the end ✨', 'If it relaxed you, comment «another» 👇']
};
// Nombres y parejas con otros estilos (src/nombres-arte.js): <cat>-<estilo>
MYSTERY_CAT['nombres-espejo'] = {
  es: ['Escribí un nombre y lo reflejé… ¿qué criatura salió? 👀', 'Tu nombre en espejo también forma una figura. Comenta el tuyo 👇', '¿Adivinaste el nombre antes de que apareciera abajo? 🤔', 'Etiqueta a alguien con este nombre 👇', 'Solo círculos girando dibujando un nombre en espejo ✨'],
  en: ['I wrote a name and mirrored it… what creature came out? 👀', 'Your name in a mirror makes a figure too. Comment yours 👇', 'Did you guess the name before it showed up below? 🤔', 'Tag someone with this name 👇', 'Just spinning circles drawing a mirrored name ✨']
};
MYSTERY_CAT['nombres-mandala'] = {
  es: ['Un nombre convertido en mandala, solo con círculos 🌀', '¿Lo leíste antes de que se completara? 👀', 'Etiqueta a alguien con este nombre 👇', 'Si es tu nombre, comenta ✨', 'Espera el mandala completo 😳'],
  en: ['A name turned into a mandala, only with circles 🌀', 'Did you read it before it was complete? 👀', 'Tag someone with this name 👇', 'If it is your name, comment ✨', 'Wait for the full mandala 😳']
};
MYSTERY_CAT['nombres-hilos'] = {
  es: ['Un hilo, cientos de clavos y un nombre 🧵', '¿En qué segundo leíste el nombre? Comenta 👇', 'Sube el volumen: cada hilo es una nota 🎶', 'Etiqueta a alguien con este nombre 👇', 'Si es tu nombre, comenta 🧵'],
  en: ['One thread, hundreds of pins and a name 🧵', 'At what second did you read the name? Comment 👇', 'Turn the sound on: every thread is a note 🎶', 'Tag someone with this name 👇', 'If it is your name, comment 🧵']
};
MYSTERY_CAT['nombres-anillos'] = {
  es: ['Los anillos giran hasta que aparece un nombre 🔒', '¿Lo adivinaste antes del último anillo? Comenta 👇', 'Sube el volumen: cada clic es una nota 🎶', 'Etiqueta a alguien con este nombre 👇', 'Si es tu nombre, comenta 🔐'],
  en: ['The rings spin until a name appears 🔒', 'Did you guess it before the last ring? Comment 👇', 'Turn the sound on: every click is a note 🎶', 'Tag someone with this name 👇', 'If it is your name, comment 🔐']
};
MYSTERY_CAT['combinaciones-anillos'] = {
  es: ['Los anillos giran hasta que aparece una pareja 💞', '¿Adivinaste la pareja antes del último anillo? 👀', 'Etiqueta a tu pareja 👇', 'Si son ustedes, comenten 💘', 'Sube el volumen: cada clic es una nota 🎶'],
  en: ['The rings spin until a couple appears 💞', 'Did you guess the couple before the last ring? 👀', 'Tag your partner 👇', 'If it is you two, comment 💘', 'Turn the sound on: every click is a note 🎶']
};
MYSTERY_CAT['nombres-costura'] = {
  es: ['Bordado a mano, puntada por puntada 🪡', '¿En qué puntada leíste el nombre? Comenta 👇', 'Sube el volumen: cada puntada es una nota 🎶', 'Etiqueta a alguien con este nombre 👇', 'Si es tu nombre, comenta 🧵'],
  en: ['Stitched by hand, one stitch at a time 🪡', 'At which stitch did you read the name? Comment 👇', 'Turn the sound on: every stitch is a note 🎶', 'Tag someone with this name 👇', 'If it is your name, comment 🧵']
};
MYSTERY_CAT['combinaciones-costura'] = {
  es: ['Una pareja bordada a mano, puntada por puntada 🪡💞', '¿Adivinaste la pareja antes de la última puntada? 👀', 'Etiqueta a tu pareja 👇', 'Si son ustedes, comenten 💘', 'Sube el volumen: cada puntada es una nota 🎶'],
  en: ['A couple stitched by hand, one stitch at a time 🪡💞', 'Did you guess the couple before the last stitch? 👀', 'Tag your partner 👇', 'If it is you two, comment 💘', 'Turn the sound on: every stitch is a note 🎶']
};
const STYLE_TAGS = { espejo: { es: 'espejo', en: 'mirror' }, mandala: { es: 'mandala', en: 'mandala' }, hilos: { es: 'stringart', en: 'stringart' }, anillos: { es: 'acertijo', en: 'puzzle' }, costura: { es: 'bordado', en: 'embroidery' } };
// Futbolistas (data/famosos.json): famosos-<tipo>; no dicen quién es (el nombre sale al final del video)
MYSTERY_CAT['famosos-cara'] = {
  es: ['¿Quién es? Comenta antes de que aparezca el nombre ⚽👇', 'Solo círculos girando… ¿lo reconociste? 👀', 'Si lo adivinaste antes del final, comenta «lo sabía» ⚽', 'Etiqueta a un fan de este jugador 👇', '¿Cuál jugador quieres que dibuje ahora? Comenta 👇'],
  en: ['Who is it? Comment before the name shows up ⚽👇', 'Just spinning circles… did you recognize him? 👀', 'If you guessed before the end, comment «I knew it» ⚽', 'Tag a fan of this player 👇', 'Which player should I draw next? Comment 👇']
};
MYSTERY_CAT['famosos-pose'] = {
  es: ['¿Quién celebraba así? Comenta antes del final ⚽👇', 'Una celebración que todos conocen… ¿de quién es? 👀', 'Si la reconociste en el primer segundo, comenta 🔥', 'Etiqueta a alguien que celebra así sus goles 👇', '¿Qué celebración dibujo ahora? Comenta 👇'],
  en: ['Who celebrated like this? Comment before the end ⚽👇', 'A celebration everyone knows… whose is it? 👀', 'If you recognized it in the first second, comment 🔥', 'Tag someone who celebrates goals like this 👇', 'Which celebration should I draw next? Comment 👇']
};
MYSTERY_CAT['famosos-gol'] = {
  es: ['¿Reconoces este momento histórico del fútbol? ⚽👀', '¿De quién es esta jugada? Comenta antes del final 👇', 'Un gol que nadie olvida, solo con círculos ⚽', 'Etiqueta a alguien que vio esto en vivo 👇', '¿Qué gol icónico dibujo ahora? Comenta 👇'],
  en: ['Do you recognize this historic football moment? ⚽👀', 'Whose play is this? Comment before the end 👇', 'A goal nobody forgets, only with circles ⚽', 'Tag someone who watched this live 👇', 'Which iconic goal should I draw next? Comment 👇']
};
MYSTERY_CAT['famosos-logo'] = {
  es: ['¿De qué equipo es este escudo? Comenta antes del final ⚽👇', 'Solo círculos girando… ¿lo reconociste? 👀', 'Si es tu equipo, comenta 🔥', 'Etiqueta a un hincha de este equipo 👇', '¿Qué escudo dibujo ahora? Comenta 👇'],
  en: ['Which team is this crest? Comment before the end ⚽👇', 'Just spinning circles… did you recognize it? 👀', 'If it is your team, comment 🔥', 'Tag a fan of this team 👇', 'Which crest should I draw next? Comment 👇']
};
// Texto de arriba del video
const FAMOSO_HOOKS = {
  logo: { es: ['¿De qué equipo es este escudo? ⚽', '¿Lo reconoces antes del final? 👀', 'Solo círculos girando… ¿qué equipo es? 🤔', 'Comenta el equipo antes de que termine 👇'], en: ['Which team is this crest? ⚽', 'Can you recognize it before the end? 👀', 'Just spinning circles… which team is it? 🤔', 'Comment the team before it ends 👇'] },
  cara: { es: ['¿Quién es este jugador? ⚽👀', '¿Lo reconoces antes del final? ⚽', 'Solo círculos girando… ¿quién es? 🤔', 'Comenta quién es antes de que termine 👇'], en: ['Who is this player? ⚽👀', 'Can you recognize him before the end? ⚽', 'Just spinning circles… who is it? 🤔', 'Comment who it is before it ends 👇'] },
  pose: { es: ['¿Quién celebraba así? ⚽', '¿Reconoces esta celebración? 👀', 'Si sabes quién es, comenta 👇', 'Solo círculos… ¿de quién es esta celebración? 🤔'], en: ['Who celebrated like this? ⚽', 'Do you recognize this celebration? 👀', 'If you know who it is, comment 👇', 'Just circles… whose celebration is this? 🤔'] },
  gol: { es: ['¿Reconoces este gol histórico? ⚽', '¿Quién hizo esta jugada? 👀', 'Un momento icónico del fútbol, solo con círculos ⚽', 'Comenta de quién es antes del final 👇'], en: ['Do you recognize this historic goal? ⚽', 'Who made this play? 👀', 'An iconic football moment, only with circles ⚽', 'Comment whose it is before the end 👇'] }
};
// Texto grande de la portada (primer cuadro del video, el que TikTok muestra en el perfil). cat: nombres,
// combinaciones, famosos…; tipo: el de los famosos (cara, pose, gol, logo)
const COVERS = {
  nombres: { es: '¿QUÉ NOMBRE ES? 👀', en: 'WHAT NAME IS IT? 👀' },
  combinaciones: { es: '¿QUÉ PAREJA ES? 💞', en: 'WHICH COUPLE? 💞' },
  cara: { es: '¿QUIÉN ES? ⚽', en: 'WHO IS IT? ⚽' },
  pose: { es: '¿QUIÉN CELEBRA ASÍ? ⚽', en: 'WHO CELEBRATES LIKE THIS? ⚽' },
  gol: { es: '¿DE QUIÉN ES ESTE GOL? ⚽', en: 'WHOSE GOAL IS THIS? ⚽' },
  logo: { es: '¿QUÉ EQUIPO ES? ⚽', en: 'WHICH TEAM IS IT? ⚽' }
};
export const coverText = (cat, tipo, lang) => (COVERS[cat === 'famosos' ? tipo : cat] || COVERS.nombres)[lang === 'en' ? 'en' : 'es'];
export const famosoHook = (tipo, lang, seed) => { const l = (FAMOSO_HOOKS[tipo] || FAMOSO_HOOKS.cara)[lang === 'en' ? 'en' : 'es']; return l[(seed >>> 0) % l.length]; };
const ARTE_TAGS = { hilos: 1, anillos: 1, costura: 1 }, ARTE_BASE = { es: ['satisfactorio', 'arte', 'nombres'], en: ['satisfying', 'art', 'names'] };
const CAT_TAGS = { nombres: { es: 'tunombre', en: 'yourname' }, combinaciones: { es: 'parejas', en: 'couples' } };
// Las pelotas y los juegos no son matemáticas de Fourier: llevan sus propios hashtags base
const BASE_TAGS = {
  pelotas: { es: ['satisfactorio', 'fisica', 'pelotas'], en: ['satisfying', 'physics', 'balls'] },
  famosos: { es: ['futbol', 'satisfactorio', 'arte', 'adivina'], en: ['football', 'soccer', 'satisfying', 'art'] },
  juegos: { es: ['satisfactorio', 'fisica', 'asmr'], en: ['satisfying', 'physics', 'asmr'] }
};
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
  const [catBase, style] = String(info.cat || '').split('-'), { extra } = TAGS[lang];
  const catTag = (CAT_TAGS[info.cat] || CAT_TAGS[catBase])?.[lang], styleTag = STYLE_TAGS[style]?.[lang];
  // Hilos, anillos y costura no son epiciclos: no llevan #fourier ni #epiciclos
  const base = BASE_TAGS[catBase]?.[lang] || (ARTE_TAGS[style] ? ARTE_BASE[lang] : TAGS[lang].base);
  const hashtags = [...base, ...(catTag ? [catTag] : []), ...(styleTag ? [styleTag] : []), ...[0, 1, 2].map((i) => extra[(h >>> (i * 5)) % extra.length])].filter((t, i, a) => a.indexOf(t) === i);
  return { description, hashtags, source: 'template' };
}

// Texto final del post: descripción + hashtags (TikTok admite hasta 2200 caracteres)
export const postText = (c) => `${c.description}\n\n${c.hashtags.map((h) => '#' + h).join(' ')}`.slice(0, 2200);
