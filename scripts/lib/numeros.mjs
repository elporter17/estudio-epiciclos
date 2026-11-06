// Números a palabras en español, para que la voz los lea bien: «27.375» → «veintisiete mil trescientos setenta y
// cinco», «3,8» → «tres coma ocho», «1 millón» → «un millón». El punto separa miles y la coma, decimales.
const U = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function menorMil(n) {
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100), r = n % 100, partes = [];
  if (c) partes.push(C[c]);
  if (r) partes.push(r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ` y ${U[r % 10]}` : ''));
  return partes.join(' ');
}
// «uno» delante de un sustantivo o de «mil»/«millones» se dice «un» (veintiún, un millón)
const apocope = (s) => s.replace(/veintiuno$/, 'veintiún').replace(/(^| )uno$/, '$1un');
export function enteroEnPalabras(n) {
  if (n === 0) return 'cero';
  if (n < 0) return `menos ${enteroEnPalabras(-n)}`;
  const partes = [], billones = Math.floor(n / 1e12), millones = Math.floor((n % 1e12) / 1e6), miles = Math.floor((n % 1e6) / 1000), resto = n % 1000;
  if (billones) partes.push(billones === 1 ? 'un billón' : `${apocope(enteroEnPalabras(billones))} billones`);
  if (millones) partes.push(millones === 1 ? 'un millón' : `${apocope(enteroEnPalabras(millones))} millones`);
  if (miles) partes.push(miles === 1 ? 'mil' : `${apocope(menorMil(miles))} mil`);
  if (resto) partes.push(menorMil(resto));
  return partes.join(' ');
}
// Reemplaza los números de un texto por palabras
export function numerosEnPalabras(texto) {
  return String(texto).replace(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(\s*%)?(\s+(?=[\p{L}]))?/gu, (_, entero, dec, pct, esp) => {
    let s = enteroEnPalabras(Number(entero.replace(/\./g, '')));
    if (dec) s += ` coma ${dec.length > 2 ? dec.split('').map((d) => U[+d]).join(' ') : enteroEnPalabras(Number(dec))}`;
    else if (esp && !pct) s = apocope(s);
    return s + (pct ? ' por ciento' : '') + (esp || '');
  });
}
