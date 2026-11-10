// Retos de geografía difíciles (2026-11-10, porque «las banderas están muy fáciles»): banderas gemelas, capitales
// trampa, continente, bandera pixelada o con zoom, «¿cuál es la real?» (espejo, al revés, colores cambiados), silueta
// del país y modo GOD con países que casi nadie conoce. Aquí van los datos y el dibujo de banderas y siluetas; los
// videos los arma scripts/curiosidades-video.mjs y los dibuja scripts/lib/quiz-video.mjs.
// Banderas: el emoji de Noto Color Emoji dibujado aparte (todas las de la ISO 3166) y recortado; así se puede
// pixelar, voltear o cambiar de colores. Siluetas: assets/geo/siluetas.json (Natural Earth, scripts/siluetas-paises.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { ROOT } from './node-env.mjs';

export const bandera = (c) => String.fromCodePoint(...[...c].map((l) => 0x1f1e6 + l.charCodeAt(0) - 65));
const FIJOS = { CI: 'Costa de Marfil', CD: 'R. D. del Congo', CG: 'República del Congo', US: 'Estados Unidos', GB: 'Reino Unido', KP: 'Corea del Norte', KR: 'Corea del Sur', CF: 'R. Centroafricana', DO: 'R. Dominicana', VA: 'Ciudad del Vaticano', MK: 'Macedonia del Norte', SZ: 'Esuatini', CZ: 'Chequia', TL: 'Timor Oriental', FM: 'Micronesia', PS: 'Palestina' };
const nombres = new Intl.DisplayNames(['es'], { type: 'region' });
export const nombre = (c) => FIJOS[c] || nombres.of(c);

// ---------- datos ----------
// Grupos de banderas casi iguales (de las más confundidas)
export const GEMELAS = [
  ['TD', 'RO', 'AD', 'MD'], ['HT', 'LI'], ['IE', 'CI'], ['NL', 'LU'], ['AU', 'NZ'], ['SN', 'ML'], ['NO', 'IS'],
  ['HN', 'NI', 'SV'], ['CO', 'EC', 'VE'], ['SI', 'SK', 'RU'], ['GN', 'ML'], ['QA', 'BH'], ['KW', 'AE'], ['EG', 'IQ', 'YE'],
  ['CU', 'PR'], ['IT', 'MX', 'IE'], ['HR', 'SK', 'RS'], ['AT', 'LV'], ['AR', 'GT'], ['MY', 'LR', 'US'], ['NE', 'IN'],
  ['GR', 'UY'], ['BO', 'GH', 'LT'], ['PL', 'ID', 'MC'], ['JO', 'PS'], ['SE', 'FI'], ['DK', 'CH'], ['DZ', 'PK'],
  ['VN', 'CN'], ['CM', 'SN', 'GN'], ['FR', 'NL', 'RU'], ['BE', 'DE'], ['PY', 'NL'], ['SY', 'EG'], ['GA', 'SL'],
  ['JP', 'BD', 'PW'], ['MX', 'IT'], ['DO', 'PA']
];
// Capitales con trampa: la respuesta y las ciudades que la gente suele decir (más famosas, pero no son la capital)
export const CAPITALES = [
  ['AU', 'Canberra', 'Sídney', 'Melbourne'], ['CA', 'Ottawa', 'Toronto', 'Montreal'], ['TR', 'Ankara', 'Estambul', 'Esmirna'],
  ['BR', 'Brasilia', 'Río de Janeiro', 'São Paulo'], ['CH', 'Berna', 'Zúrich', 'Ginebra'], ['US', 'Washington D. C.', 'Nueva York', 'Los Ángeles'],
  ['MA', 'Rabat', 'Casablanca', 'Marrakech'], ['NG', 'Abuya', 'Lagos', 'Kano'], ['NZ', 'Wellington', 'Auckland', 'Christchurch'],
  ['IN', 'Nueva Delhi', 'Bombay', 'Calcuta'], ['PK', 'Islamabad', 'Karachi', 'Lahore'], ['VN', 'Hanói', 'Ciudad Ho Chi Minh', 'Da Nang'],
  ['CN', 'Pekín', 'Shanghái', 'Hong Kong'], ['EC', 'Quito', 'Guayaquil', 'Cuenca'], ['KZ', 'Astaná', 'Almatý', 'Taskent'],
  ['TZ', 'Dodoma', 'Dar es-Salam', 'Zanzíbar'], ['CI', 'Yamusukro', 'Abiyán', 'Bouaké'], ['MM', 'Naipyidó', 'Rangún', 'Mandalay'],
  ['CM', 'Yaundé', 'Duala', 'Garoua'], ['BJ', 'Porto Novo', 'Cotonú', 'Parakú'], ['AE', 'Abu Dabi', 'Dubái', 'Sharjah'],
  ['SA', 'Riad', 'Yeda', 'La Meca'], ['BZ', 'Belmopán', 'Ciudad de Belice', 'San Ignacio'], ['GT', 'Ciudad de Guatemala', 'Antigua Guatemala', 'Quetzaltenango'],
  ['CR', 'San José', 'Cartago', 'Limón'], ['CL', 'Santiago', 'Valparaíso', 'Viña del Mar'], ['DE', 'Berlín', 'Bonn', 'Múnich'],
  ['JP', 'Tokio', 'Kioto', 'Osaka'], ['NL', 'Ámsterdam', 'La Haya', 'Róterdam'], ['RU', 'Moscú', 'San Petersburgo', 'Kazán'],
  ['KR', 'Seúl', 'Busan', 'Incheon'], ['EG', 'El Cairo', 'Alejandría', 'Giza'], ['KE', 'Nairobi', 'Mombasa', 'Kisumu'],
  ['JM', 'Kingston', 'Montego Bay', 'Ocho Ríos'], ['DO', 'Santo Domingo', 'Santiago de los Caballeros', 'Punta Cana'], ['NI', 'Managua', 'León', 'Granada'],
  ['PE', 'Lima', 'Cusco', 'Arequipa'], ['UY', 'Montevideo', 'Punta del Este', 'Colonia'], ['IT', 'Roma', 'Milán', 'Venecia'],
  ['ES', 'Madrid', 'Barcelona', 'Sevilla'], ['MN', 'Ulán Bator', 'Darján', 'Erdenet'], ['NP', 'Katmandú', 'Pokhara', 'Lalitpur'],
  ['IS', 'Reikiavik', 'Akureyri', 'Keflavík'], ['GE', 'Tiflis', 'Batumi', 'Kutaisi'], ['ET', 'Adís Abeba', 'Dire Dawa', 'Gondar'],
  ['MT', 'La Valeta', 'Sliema', 'Mdina'], ['SI', 'Liubliana', 'Maribor', 'Bled'], ['ME', 'Podgorica', 'Budva', 'Kotor'],
  ['LA', 'Vientián', 'Luang Prabang', 'Pakse'], ['PH', 'Manila', 'Cebú', 'Dávao'], ['AR', 'Buenos Aires', 'Córdoba', 'Rosario'],
  ['MX', 'Ciudad de México', 'Guadalajara', 'Monterrey'], ['HN', 'Tegucigalpa', 'San Pedro Sula', 'La Ceiba'], ['PY', 'Asunción', 'Ciudad del Este', 'Encarnación']
];
// Donde casi nadie sabe el continente (sin los dudosos: Turquía, Rusia, Chipre, el Cáucaso, Kazajistán, Egipto)
export const CONTINENTE_DIFICIL = {
  'América': 'SR GY BZ TT BB BS AG DM GD KN LC VC JM HT', 'África': 'MG MU SC CV KM ST GQ GA DJ ER LS SZ BW NA MW BI',
  'Asia': 'MV BT BN TL MN LK KH LA NP BH QA OM YE KG TJ TM', 'Europa': 'IS MT AD LI SM MC MD LU EE LV LT MK ME AL',
  'Oceanía': 'FJ PG KI TV NR PW FM MH WS TO SB VU'
};
export const continenteDe = (c) => Object.keys(CONTINENTE_DIFICIL).find((k) => CONTINENTE_DIFICIL[k].split(' ').includes(c));
// Fáciles, medios y los que casi nadie conoce (para el modo GOD)
export const FACILES = 'MX AR BR ES US CA JP FR IT DE CO GB PT CN KR CL PE HN'.split(' ');
export const MEDIOS = 'BO CR CU DO EC SV GT NI PA PY UY VE IE NL BE CH SE NO GR TR IN AU EG MA ZA RU PL UA NG KE SA IL PH VN TH'.split(' ');
export const DIFICILES = 'MN KZ UZ AZ GE AM BY MD LT LV EE SK SI HR BA RS ME AL MK BG RO HU CZ AT DK FI IS LU MT CY TN DZ LY SD ET SO GH CI SN ML NE TD CM GA CG CD AO ZM ZW MZ MG TZ UG RW BD LK NP MM KH LA MY ID SG BN JO LB SY IQ IR AF PK OM YE AE QA KW BH JM HT BS TT BB GY SR FJ PG NZ'.split(' ');
export const GOD = 'BT KI BN SZ TV KM SR TL VU MV SC ST LS ER DJ BI CF GQ PW FM MH NR TO WS SB KN LC VC DM GD AG BB CV GW GM SL LR TG BJ BF MR MU KG TJ TM'.split(' ');

// ---------- siluetas ----------
let SIL = null;
export const siluetas = () => (SIL ||= JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'geo', 'siluetas.json'), 'utf8')));
export const tieneSilueta = (c) => !!siluetas()[c];
// Dibuja la silueta de un país dentro de un cuadrado (cx, cy, lado); los islotes muy chicos se agrandan un poco
export function dibujarSilueta(ctx, c, cx, cy, lado, { relleno = '#ffffff', borde = null, ancho = 6 } = {}) {
  const s = siluetas()[c]; if (!s) return false;
  const k = lado / 1000, x0 = cx - lado / 2, y0 = cy - lado / 2;
  ctx.beginPath();
  for (const r of s.r) { r.forEach(([x, y], i) => (i ? ctx.lineTo(x0 + x * k, y0 + y * k) : ctx.moveTo(x0 + x * k, y0 + y * k))); ctx.closePath(); }
  ctx.fillStyle = relleno; ctx.fill('nonzero');
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = ancho; ctx.lineJoin = 'round'; ctx.stroke(); }
  return true;
}

// ---------- banderas como imagen ----------
const cache = new Map();
// El emoji de la bandera en su propio lienzo, recortado al rectángulo de la bandera
export function banderaCanvas(c, fam) {
  const k = `${c}|${fam}`; if (cache.has(k)) return cache.get(k);
  const T = 560, cv = createCanvas(T * 1.5, T * 1.5), g = cv.getContext('2d');
  g.font = `${T}px ${fam || 'sans-serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(bandera(c), cv.width / 2, cv.height / 2);
  const d = g.getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 <= x0) { cache.set(k, null); return null; }
  const out = createCanvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  cache.set(k, out);
  return out;
}
// Es una bandera de verdad (no las dos letras sueltas cuando la fuente no la tiene)
export function banderaValida(c, fam) {
  const b = banderaCanvas(c, fam); if (!b) return false;
  return b.width > 200 && b.height > 150;
}

// Variantes para «¿cuál es la real?»: espejo, al revés y con los colores cambiados. Los colores se cambian
// intercambiando los canales (rojo ↔ azul, o rotándolos): se conservan las sombras y la ondulación del emoji, el
// blanco sigue blanco y el negro, negro
function colores(img, modo) {
  const out = createCanvas(img.width, img.height), g = out.getContext('2d'); g.drawImage(img, 0, 0);
  const im = g.getImageData(0, 0, img.width, img.height), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], gg = d[i + 1], bb = d[i + 2];
    if (modo === 1) { d[i] = bb; d[i + 2] = r; } else { d[i] = gg; d[i + 1] = bb; d[i + 2] = r; }
  }
  g.putImageData(im, 0, 0);
  return out;
}
export function variante(img, v) {
  if (!img || v === 'real') return img;
  if (v === 'colores' || v === 'colores2') return colores(img, v === 'colores' ? 1 : 2);
  const out = createCanvas(img.width, img.height), g = out.getContext('2d');
  g.translate(v === 'espejo' || v === 'giro' ? img.width : 0, v === 'volteada' || v === 'giro' ? img.height : 0);
  g.scale(v === 'espejo' || v === 'giro' ? -1 : 1, v === 'volteada' || v === 'giro' ? -1 : 1);
  g.drawImage(img, 0, 0);
  return out;
}
// Qué tan distinta es una variante de la real (0 = igual): para no poner dos opciones que se ven iguales
export function diferencia(a, b) {
  if (!a || !b) return 0;
  const n = 24, m = 16, ca = createCanvas(n, m), cb = createCanvas(n, m);
  ca.getContext('2d').drawImage(a, 0, 0, n, m); cb.getContext('2d').drawImage(b, 0, 0, n, m);
  const da = ca.getContext('2d').getImageData(0, 0, n, m).data, db = cb.getContext('2d').getImageData(0, 0, n, m).data;
  let s = 0; for (let i = 0; i < da.length; i += 4) s += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
  return s / (n * m * 3 * 255);
}
// Las 3 variantes falsas que más se distinguen de la real (o null si la bandera es demasiado simétrica)
export function falsas(c, fam) {
  const img = banderaCanvas(c, fam); if (!img) return null;
  const ops = ['espejo', 'volteada', 'giro', 'colores', 'colores2'].map((v) => ({ v, d: diferencia(img, variante(img, v)) })).filter((x) => x.d > 0.06);
  const elegidas = [];
  for (const x of ops.sort(() => Math.random() - 0.5)) if (!elegidas.some((y) => diferencia(variante(img, y.v), variante(img, x.v)) < 0.05)) elegidas.push(x);
  return elegidas.length >= 3 ? elegidas.slice(0, 3).map((x) => x.v) : null;
}
