// Dónde vive cada cosa de una serie:
//   series/<slug>/series.json          biblia + 5 episodios (texto, se commitea)
//   out/<slug>/characters/<id>.jpg     retrato de referencia de cada personaje
//   out/<slug>/ep01/audio/*.wav        una pista por línea + episode.wav y timeline.json
//   out/<slug>/ep01/images/<scene>.jpg una imagen por escena
//   out/<slug>/<slug>-parte-1.mp4      video final (+ .json con la descripción para TikTok)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './env.mjs';

export const SERIES_DIR = path.join(ROOT, 'series');
export const OUT_DIR = path.join(ROOT, 'out');

export const readJson = (file, fallback = null) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };
export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

export const pad = (n) => String(n).padStart(2, '0');
export const seriesFile = (slug) => path.join(SERIES_DIR, slug, 'series.json');
export const charDir = (slug) => path.join(OUT_DIR, slug, 'characters');
export const epDir = (slug, n) => path.join(OUT_DIR, slug, `ep${pad(n)}`);
export const audioDir = (slug, n) => path.join(epDir(slug, n), 'audio');
export const imageDir = (slug, n) => path.join(epDir(slug, n), 'images');
export const timelineFile = (slug, n) => path.join(audioDir(slug, n), 'timeline.json');
export const videoFile = (slug, n) => path.join(OUT_DIR, slug, `${slug}-parte-${n}.mp4`);

// La serie pedida con --series, o la que se tocó por última vez
export function loadSeries(slug) {
  if (!slug) {
    const dirs = fs.existsSync(SERIES_DIR) ? fs.readdirSync(SERIES_DIR).filter((d) => fs.existsSync(seriesFile(d))) : [];
    if (!dirs.length) throw new Error('No hay ninguna serie todavía. Ejecuta primero «npm run script».');
    slug = dirs.sort((a, b) => fs.statSync(seriesFile(b)).mtimeMs - fs.statSync(seriesFile(a)).mtimeMs)[0];
  }
  const s = readJson(seriesFile(slug));
  if (!s) throw new Error(`No encuentro ${seriesFile(slug)}`);
  return s;
}

export const saveSeries = (s) => writeJson(seriesFile(s.slug), s);

export function episode(series, n) {
  const ep = series.episodes.find((e) => e.number === n);
  if (!ep) throw new Error(`La serie «${series.title}» no tiene el episodio ${n}.`);
  return ep;
}

// Voz e indicaciones de quien habla: «narrador» es la protagonista contando en primera persona
export function speakerOf(series, id) {
  if (id === 'narrador') {
    const who = series.characters.find((c) => c.id === series.narrator.character_id);
    return { id, name: who?.name || 'Narrador', voice: series.narrator.voice, instructions: series.narrator.voice_instructions };
  }
  const c = series.characters.find((x) => x.id === id);
  if (!c) throw new Error(`Hablante desconocido «${id}»`);
  return { id, name: c.name, voice: c.voice, instructions: c.voice_instructions };
}

export const wordsOf = (text) => text.trim().split(/\s+/).filter(Boolean);
export const episodeWords = (ep) => ep.scenes.reduce((a, s) => a + s.lines.reduce((b, l) => b + wordsOf(l.text).length, 0), 0);
export const closingLine = (n, lang = 'es') => (lang === 'en' ? `Part ${n + 1} on my profile.` : `Parte ${n + 1} en mi perfil.`);
