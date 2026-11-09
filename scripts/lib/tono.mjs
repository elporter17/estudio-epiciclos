// Tono de Potter Play: más de compa y menos de maestro. Cada video recibe un nivel (siempre el mismo para la misma
// clave, así el render y la publicación coinciden):
//   0 limpio (1 de cada 4)  ·  1 coloquial (la mayoría)  ·  2 picante (1 de cada 4: una grosería suave en el gancho)
// Reglas: nada sexual («prostis» y parecidas no), nada contra grupos de personas, nunca en el título del video ni en el
// título de YouTube; las groserías van en la voz del gancho y en la primera línea de la descripción. En YouTube decir
// groserías en los primeros 7 s puede limitar los anuncios (solo importa si el canal tiene monetización).
const COLOQUIAL = [
  'No manches', 'Neta, esto casi nadie lo sabe', 'Maje, ¿sabías esto?', 'A la gran…', 'Esto está bien loco',
  'Ni de chiste lo adivinas', '¿Cómo que nadie habla de esto?', 'Dato random que nadie pidió', 'Qué macizo dato',
  'Te va a volar la cabeza', 'Espérate, que esto se pone bueno', '¿Y esto quién lo sabía?'
];
const PICANTE = [
  '¿Qué mierda acabo de aprender?', 'Carajo, esto no lo sabía nadie', 'No jodas, ¿en serio?', 'Mierda, esto sí está loco',
  'Te mintieron toda la vida… bueno, casi', 'Esto está de locos, carajo'
];
const EMOJI = ['🤯', '😳', '👀', '😱', '🔥'];
const hash = (t) => [...String(t)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11);

export function tonoDe(clave) {
  const h = hash(clave), n = h % 4;
  const nivel = n === 0 ? 0 : n === 1 ? 2 : 1;
  const lista = nivel === 2 ? PICANTE : COLOQUIAL, frase = nivel ? lista[(h >>> 3) % lista.length] : null;
  return { nivel, frase, emoji: EMOJI[(h >>> 7) % EMOJI.length] };
}
// La voz del gancho (portada de los 3D): «No manches. <gancho>» (en pantalla sigue el título, sin la frase)
export function vozConTono(texto, clave) {
  const t = tonoDe(clave);
  if (!t.frase) return texto;
  const f = t.frase.replace(/[…]$/, '');
  return `${f}${/[?!.…]$/.test(f) ? '' : '.'} ${texto}`;
}
// La descripción de una publicación: la frase va como primera línea (el resto igual)
export function textoConTono(texto, clave) {
  const t = tonoDe(clave);
  return t.frase ? `${t.frase} ${t.emoji}\n${texto}` : texto;
}
