// Tono de Potter Play: más de compa y menos de maestro. TODO video lleva al menos una expresión jocosa; cada uno
// recibe un nivel (siempre el mismo para la misma clave, así el render y la publicación coinciden):
//   1 coloquial (2 de cada 3)  ·  2 picante (1 de cada 3: una grosería suave en el gancho)
// En los 3D: la voz del gancho (portada), una frase a media escena y el cierre. En los demás formatos: la primera
// línea de la descripción. Reglas: nada sexual explícito («prostis» y parecidas no; desde 2026-11-22 sí hay doble sentido ligero, ver scripts/lib/picardia.mjs), nada contra grupos de personas, nunca en
// el título del video ni en el de YouTube. Los 3D «explicados» (categoría noticia) van solo coloquiales y el Reel de
// noticias reales va limpio (puede hablar de muertes o tragedias). En YouTube, decir groserías en los primeros 7 s
// puede limitar los anuncios (solo importa si el canal tiene monetización).
const COLOQUIAL = [
  'No manches', 'Neta, esto casi nadie lo sabe', 'Maje, ¿sabías esto?', 'A la gran…', 'Esto está bien loco',
  'Ni de chiste lo adivinas', '¿Cómo que nadie habla de esto?', 'Dato random que nadie pidió', 'Qué macizo dato',
  'Te va a volar la cabeza', 'Espérate, que esto se pone bueno', '¿Y esto quién lo sabía?', 'Puchica, qué dato',
  'Ve qué chiva esto', 'Agárrate, que esto no te lo enseñaron en la escuela', 'Nombre, esto sí no me lo esperaba',
  'Esto es para ganar discusiones en la familia', 'Tu profe nunca te contó esto', 'Pon atención, que aquí viene lo bueno',
  'Esto suena inventado, pero es real', 'Quédate hasta el final, que se pone peor', 'Dato para presumir en el grupo',
  'Dime que no sabías esto', 'Esto me dejó con la boca abierta', '¿Listo para sentirte ignorante 30 segundos?'
];
const PICANTE = [
  '¿Qué mierda acabo de aprender?', 'Carajo, esto no lo sabía nadie', 'No jodas, ¿en serio?', 'Mierda, esto sí está loco',
  'Te mintieron toda la vida… bueno, casi', 'Esto está de locos, carajo', 'Qué cagada no haberlo sabido antes',
  '¿Cómo carajos nadie habla de esto?', 'Mierda… ¿y esto desde cuándo?', 'No me jodas, esto es real',
  'Ok, esto está cabrón', 'Me cayó como balde de agua fría, carajo'
];
// A media escena (voz y subtítulo): una muletilla corta antes del dato
const MEDIO = [
  'Y ojo:', 'Agárrate:', 'Ahora sí, lo bueno:', 'Y aquí viene lo loco:', 'Neta:', 'Escucha esto:', 'Y no es broma:',
  'Prepárate:', 'Y lo más chiva:', 'Pero espera:', 'Y para rematar:', 'Ahí te va otro:'
];
const MEDIO_PICANTE = ['Y lo más cabrón:', 'Y aquí viene lo heavy:', 'Y para colmo, carajo:', 'Ahora, lo que me voló la cabeza:'];
// El cierre (en pantalla va «¡SÍGUENOS!»): siempre pide comentar y seguir
const CIERRES = [
  'Mañana te cuento otro que casi nadie sabe. Síguenos para no perdértelo y comenta si ya lo sabías.',
  '¿Lo sabías o te agarró en curva? Comenta, y síguenos: mañana viene uno todavía más loco.',
  'Mándaselo al que dice que sabe de todo. Y síguenos: mañana hay otro para ganarle.',
  'Dime si esto te voló la cabeza. Mañana, otro dato; síguenos para no perderlo.',
  'Ya puedes presumir en el grupo de la familia. Síguenos: mañana hay otro dato nuevo.',
  'Comenta «ya lo sabía» si eres de los pocos. Síguenos, que mañana viene el siguiente.',
  '¿Cuál fue el más loco de hoy? Comenta, y síguenos para el de mañana.'
];
// A media escena del final de la segunda mitad: la petición va con un motivo concreto (pedir sin motivo no convence)
const PEDIDOS = [
  'Y si te está gustando, síguenos: mañana viene otro dato.',
  'Si vas aprendiendo, síguenos, que mañana hay otro.',
  'Síguenos para no perderte el de mañana, que está mejor.',
  'Si te sirve, síguenos: cada día sale un dato nuevo.'
];
const CIERRES_PICANTE = [
  'Si ya lo sabías, qué crack. Si no, no pasa nada, carajo: ahora ya. Comenta y síguenos.',
  '¿Qué mierda, verdad? Cuéntame en los comentarios y síguenos para otro mañana.',
  'Mándaselo al que se cree sabelotodo, a ver si sabía esta mierda. Y síguenos.'
];
const EMOJI = ['🤯', '😳', '👀', '😱', '🔥', '🫢', '💀'];
const hash = (t) => [...String(t)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11);
const de = (lista, h) => lista[h % lista.length];

// suave: solo coloquial (los 3D «explicados» de temas de actualidad: celulares, satélites, fútbol…)
export function tonoDe(clave, { suave = false } = {}) {
  const h = hash(clave), nivel = !suave && h % 3 === 0 ? 2 : 1;
  return {
    nivel,
    frase: de(nivel === 2 ? PICANTE : COLOQUIAL, h >>> 3),
    medio: de(nivel === 2 && (h >>> 5) % 2 ? MEDIO_PICANTE : MEDIO, h >>> 9),
    cierre: de(nivel === 2 ? CIERRES_PICANTE : CIERRES, h >>> 11),
    emoji: de(EMOJI, h >>> 7)
  };
}
// La voz del gancho (portada de los 3D): «No manches. <gancho>» (en pantalla sigue el título, sin la frase)
export function vozConTono(texto, clave, op) {
  const f = tonoDe(clave, op).frase.replace(/…$/, '');
  return `${f}${/[?!.]$/.test(f) ? '' : '.'} ${texto}`;
}
// La descripción de una publicación: la frase va como primera línea (el resto igual)
export function textoConTono(texto, clave, op) {
  const t = tonoDe(clave, op);
  return `${t.frase} ${t.emoji}\n${texto}`;
}
// Un guion 3D completo con su tono: gancho, una muletilla en una escena del medio (voz y subtítulo) y el cierre
export function guionConTono(g) {
  const op = { suave: g.categoria === 'noticia' || g.categoria === 'minihistoria' }, t = tonoDe(g.id, op), escenas = g.escenas.map((e) => ({ ...e }));
  for (const e of escenas) if (e.tipo === 'portada') e.voz = vozConTono(e.voz || e.texto, g.id, op);
  const contenido = escenas.map((e, i) => [e, i]).filter(([e]) => e.tipo !== 'portada' && e.tipo !== 'cierre' && e.texto);
  if (contenido.length >= 2 && g.categoria !== 'minihistoria') { // en una historia la muletilla a media escena corta el relato
    const [e] = contenido[Math.min(contenido.length - 1, Math.floor(contenido.length / 2))];
    // Sin el conector del principio («Y …», «Además, …»): la muletilla ya hace de puente
    const base = e.texto.replace(/^(Y además,|Además,|Pero|Y|E)\s+/, ''), sin = base.charAt(0).toLowerCase() + base.slice(1);
    // Siglas o nombres propios conocidos se quedan con su mayúscula
    e.texto = `${t.medio} ${/^[A-ZÁÉÍÓÚ]{2}|^\d|^(Honduras|Brasil|México|Italia|China|Estados|Europa|África|América|Asia|La Luna|El Sol|Tierra)/.test(base) ? base : sin}`;
    if (e.voz) e.voz = `${t.medio} ${e.voz}`;
  }
  // Petición de seguir a mitad del video (voz + subtítulo + botón en pantalla), después de dar valor y lejos del gancho y del cierre
  if (contenido.length >= 4) {
    const [e] = contenido[Math.min(contenido.length - 1, Math.floor(contenido.length * 0.7))], p = de(PEDIDOS, hash(g.id) >>> 4);
    e.pedir = true; e.texto = `${e.texto} ${p}`; if (e.voz) e.voz = `${e.voz} ${p}`; else e.voz = e.texto;
  }
  for (const e of escenas) if (e.tipo === 'cierre') { e.voz = t.cierre; if (!e.texto) e.texto = t.cierre; }
  return { ...g, escenas };
}
