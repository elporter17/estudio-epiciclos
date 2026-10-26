/* CirculArte · melodías conocidas de dominio público para los videos de física: cada choque toca la siguiente nota.
   Son composiciones clásicas o populares tradicionales (sin derechos); solo se usan sus notas, sintetizadas aquí.
   Notas en MIDI (60 = Do central). */
export const MELODIAS = {
  elisa: {
    es: 'Para Elisa', en: 'Für Elise',
    notes: [76, 75, 76, 75, 76, 71, 74, 72, 69, 60, 64, 69, 71, 64, 68, 71, 72, 64, 76, 75, 76, 75, 76, 71, 74, 72, 69, 60, 64, 69, 71, 64, 72, 71, 69]
  },
  alegria: {
    es: 'Himno a la alegría', en: 'Ode to Joy',
    notes: [76, 76, 77, 79, 79, 77, 76, 74, 72, 72, 74, 76, 76, 74, 74, 76, 76, 77, 79, 79, 77, 76, 74, 72, 72, 74, 76, 74, 72, 72]
  },
  estrellita: {
    es: 'Estrellita', en: 'Twinkle Twinkle',
    notes: [72, 72, 79, 79, 81, 81, 79, 77, 77, 76, 76, 74, 74, 72, 79, 79, 77, 77, 76, 76, 74, 79, 79, 77, 77, 76, 76, 74, 72, 72, 79, 79, 81, 81, 79, 77, 77, 76, 76, 74, 74, 72]
  },
  canon: {
    es: 'Canon de Pachelbel', en: 'Pachelbel\'s Canon',
    notes: [78, 76, 74, 73, 71, 69, 71, 73, 74, 73, 71, 69, 67, 66, 67, 64]
  },
  brahms: {
    es: 'Canción de cuna de Brahms', en: 'Brahms\' Lullaby',
    notes: [76, 76, 79, 76, 76, 79, 76, 79, 84, 83, 81, 81, 79, 74, 76, 77, 74, 74, 76, 77, 74, 77, 83, 81, 79, 83, 84]
  },
  cucaracha: {
    es: 'La cucaracha', en: 'La Cucaracha',
    notes: [72, 72, 72, 77, 81, 72, 72, 72, 77, 81, 77, 77, 76, 76, 74, 74, 72]
  }
};
export const MELODIA_IDS = Object.keys(MELODIAS);
export const midiFreq = (m) => 440 * 2 ** ((m - 69) / 12);

// Cambia las notas de una corrida por las de una melodía, en orden (vuelve a empezar al terminar).
// Con muchos choques por segundo la melodía se volvería un zumbido: las notas quedan separadas al menos minGap s.
// Los escapes y llegadas (chord) siguen sonando como acorde, con la nota que toque.
export function applyMelody(run, id, minGap = 0.14) {
  const mel = MELODIAS[id]; if (!mel) return run;
  let last = -Infinity;
  run.events = run.events.filter((e) => { if (e.t - last < minGap) return false; last = e.t; return true; });
  run.events.forEach((e, i) => { e.f = midiFreq(mel.notes[i % mel.notes.length]); });
  run.melody = id;
  return run;
}
// Melodía estable para una semilla: siete de cada diez corridas llevan una; las demás, notas sueltas
export function melodyFor(seed) {
  const s = (Number(seed) >>> 0) % 10;
  return s < 7 ? MELODIA_IDS[Math.floor((Number(seed) >>> 0) / 10) % MELODIA_IDS.length] : null;
}
