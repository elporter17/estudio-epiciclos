// Constructor de videos desde una idea (formato «Idea», video3d/src/Idea.jsx), sin IA: busca el tema en Wikipedia en
// español, saca los datos que enganchan (cifras, récords, años, «el primero») y arma un guion con reglas:
//   porcentaje o «1 de cada N»       → gente (personas)
//   millones de personas/habitantes  → globo con luces y contador
//   años                             → línea del tiempo
//   alturas, distancias              → torre
//   una cantidad grande              → lluvia de objetos con contador
//   lo demás                         → foco (el objeto que más tiene que ver)
// y plantillas por tema (color, vista: la escena de visión y la lámina de puntos). El objeto 3D sale de un diccionario
// de sinónimos. Cada dato guarda su fuente (el artículo). Funciona en Vercel (bot) y en GitHub Actions (render).
const UA = { 'User-Agent': 'PotterPlay/1.0 (videos educativos; github.com/elporter17)', 'Api-User-Agent': 'PotterPlay/1.0' };
const WIKI = 'https://es.wikipedia.org/w/api.php';
const sin = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ---------- objetos 3D por palabra (modelos de Kenney y objetos hechos en código) ----------
const OBJETOS = [
  [/manzana/, 'comida/apple'], [/platano|banan/, 'comida/banana'], [/fresa/, 'comida/strawberry'], [/naranja|citric/, 'comida/orange'], [/limon/, 'comida/lemon'],
  [/tomate/, 'comida/tomato'], [/uva|vino/, 'comida/grapes'], [/sandia/, 'comida/watermelon'], [/pina/, 'comida/pineapple'], [/zanahoria/, 'comida/carrot'],
  [/brocoli|verdura|vegetal/, 'comida/broccoli'], [/maiz|elote/, 'comida/corn'], [/aguacate/, 'comida/avocado'], [/cereza/, 'comida/cherries'], [/calabaza/, 'comida/pumpkin'],
  [/pan\b|trigo|harina/, 'comida/bread'], [/queso|leche|lacteo/, 'comida/cheese'], [/pizza/, 'comida/pizza'], [/hamburguesa/, 'comida/burger'], [/pastel|torta/, 'comida/cake'],
  [/chocolate|cacao/, 'comida/chocolate'], [/galleta/, 'comida/cookie'], [/cafe/, 'comida/cup-coffee'], [/coco/, 'comida/coconut'], [/huevo|gallina/, 'comida/egg'],
  [/corazon|sangre|cardi/, 'corazon'], [/dinero|moneda|dolar|precio|econom/, 'moneda'], [/celular|telefono|movil|smartphone|internet|app/, 'celular'],
  [/futbol|balon|deporte|mundial|gol/, 'balon'], [/libro|escrit|literatura|lectura|historia|universidad/, 'libro'], [/agua|botella|beber|rio|oceano|mar\b/, 'botella'],
  [/edificio|ciudad|construc|ladrillo/, 'ladrillo'], [/ojo|vista|vision|gafas|lentes|anteojo|color/, 'personajes/aid-glasses'], [/ciego|ceguera/, 'personajes/aid-cane-blind'],
  [/auto|coche|carro|vehicul/, 'autos/sedan'], [/camion|transporte/, 'autos/truck'], [/policia/, 'autos/police'], [/ambulancia|hospital|medic/, 'autos/ambulance'],
  [/bombero|incendio|fuego/, 'autos/firetruck'], [/arbol|bosque|selva|planta/, 'naturaleza/tree_default'], [/cactus|desierto/, 'naturaleza/cactus_tall']
];
export function objetoDe(texto, porDefecto = 'libro') {
  const t = sin(texto);
  return OBJETOS.find(([re]) => re.test(t))?.[1] || porDefecto;
}

// ---------- Wikipedia ----------
async function api(params) {
  const r = await fetch(`${WIKI}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`Wikipedia ${r.status}`);
  return r.json();
}
// El artículo que mejor corresponde a la idea (búsqueda de Wikipedia) con su texto plano
export async function buscarArticulo(idea) {
  const b = await api({ action: 'query', list: 'search', srsearch: idea, srlimit: '5', srnamespace: '0' });
  const titulos = (b.query?.search || []).map((x) => x.title);
  if (!titulos.length) throw new Error(`No encontré «${idea}» en Wikipedia`);
  const p = await api({ action: 'query', prop: 'extracts|info', inprop: 'url', explaintext: '1', exsectionformat: 'wiki', redirects: '1', titles: titulos[0] });
  const pag = Object.values(p.query?.pages || {})[0];
  if (!pag?.extract) throw new Error(`El artículo «${titulos[0]}» no tiene texto`);
  return { titulo: pag.title, url: pag.fullurl || `https://es.wikipedia.org/wiki/${encodeURIComponent(pag.title)}`, texto: pag.extract, otros: titulos.slice(1) };
}

// ---------- datos ----------
const FUERA = /^(referencias|notas|vease tambien|bibliografia|enlaces externos|fuentes|galeria|filmografia|discografia)$/;
const SUPER = /\b(mas grande|mayor|menor|mas alto|mas largo|mas rapid|mas antigu|mas comun|record|unico|unica|primer|primera vez|el primero|la primera|descubr|invent|mas de la mitad|el doble|el triple)\b/;
export function extraerDatos(texto) {
  // Secciones útiles (fuera referencias, bibliografía…)
  const partes = texto.split(/\n(==+)\s*(.+?)\s*\1\n/);
  let util = partes[0];
  for (let i = 1; i < partes.length; i += 3) if (!FUERA.test(sin(partes[i + 1]))) util += `\n${partes[i + 2] || ''}`;
  const frases = util.replace(/[\u200b\u200e\u00ad]/g, '').replace(/\s*\([^()]*\)/g, '').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/).map((f) => f.trim()).filter((f) => f.length >= 50 && f.length <= 260 && !/:$|^\W/.test(f));
  return frases.map((f, i) => {
    const t = sin(f);
    let p = 0;
    if (/\d/.test(f)) p += 3;
    if (/%|por ciento|de cada \d+/.test(t)) p += 2;
    if (SUPER.test(t)) p += 2;
    if (/\b(1[0-9]{3}|20[0-2][0-9])\b/.test(f)) p += 1;
    if (i < 8) p += 1;
    if (/^(este|esta|estos|estas|ese|esa|ella|el|ellos|ellas|dicha|dicho|tal|sin embargo|ademas|tambien|por ello|por eso|asi|aunque|pero|en cambio|por otro lado|poco despues|representa|consiste|se presenta|se supone|se cree|se trata|hasta)\b/.test(t)) p -= 3; // depende de la frase anterior
    if (f.length > 180) p -= 3; // habría que cortarla
    return { i, texto: f, puntaje: p };
  });
}
// Más corta para narrar (hasta ~170 caracteres, cortando en una coma o punto y coma)
export function acortar(f, max = 170) {
  let s = f.replace(/\s+/g, ' ').trim();
  if (s.length > max) {
    // En un punto y coma, o en una coma que no deje la frase colgando («…de la.», «…en su superficie.»)
    const cortes = [...s.slice(0, max).matchAll(/;|, (?=(?:y|pero|aunque|mientras|lo que|que|donde|cuando)\b)/g)].map((m) => m.index).filter((c) => c > 70);
    s = cortes.length ? s.slice(0, cortes.at(-1)).trim() : s.slice(0, max).replace(/\s+\S*$/, '').replace(/\s+(de|del|la|las|el|los|en|y|o|con|a|al|para|por|que|un|una|su|sus|se)$/i, '').trim();
  }
  return s.replace(/[,;:]$/, '') + (/[.!?…]$/.test(s) ? '' : '.');
}
// «300 millones» → 300000000; «2,5 millones» → 2500000; «1.440» → 1440
function numeroDe(f) {
  const m = f.toLowerCase().match(/(\d{1,3}(?:[.\s]\d{3})+|\d+(?:,\d+)?)\s*(mil millones|millones|millón|mil)?\s+(?:de\s+)?([a-zñáéíóúü]+)/);
  if (!m) return null;
  let n = Number(m[1].replace(/[.\s]/g, '').replace(',', '.'));
  n *= { 'mil millones': 1e9, millones: 1e6, millón: 1e6, mil: 1e3 }[m[2]] || 1;
  return Number.isFinite(n) && n > 0 ? { n, unidad: m[3] } : null;
}

// ---------- la escena de cada dato ----------
export const ESCENAS_POSIBLES = ['foco', 'gente', 'globo', 'linea', 'torre', 'lluvia', 'pila', 'vision', 'ishihara'];
export const NOMBRE_ESCENA = { foco: 'Objeto en foco', gente: 'Personas', globo: 'Planeta', linea: 'Línea del tiempo', torre: 'Torre', lluvia: 'Lluvia de objetos', pila: 'Montaña de objetos', vision: 'Así lo ve (daltonismo)', ishihara: 'Prueba de puntos' };
export function escenaDe(texto, { tema = '' } = {}) {
  // Un año: después de «en», «de», «desde», «hacia», «año» o «década de», y no antes de una unidad («2000 metros»)
  const t = sin(texto), num = numeroDe(texto), anios = [...sin(texto).matchAll(/\b(?:en|de|desde|hacia|ano|decada de|siglo)\s+(1[0-9]{3}|20[0-2][0-9])\b(?!\s*(?:metros|m\b|km|kilometros|kilos|kg|millones|mil\b|personas|anos luz|grados|°))/g)].map((m) => +m[1]);
  // «de 1300 a 2000 metros»: un rango con unidad no son años
  if (/\b\d+\s*(?:a|y|-)\s*\d+\s*(?:metros|m\b|km|kilometros|kg|grados|°|cm)/.test(t)) anios.length = 0;
  const base = { texto: acortar(texto) }, objeto = objetoDe(`${texto} ${tema}`);
  const gente = /persona|habitante|gente|humano|poblacion|hombre|mujer|nino|nina|adulto|paciente|usuario|varon|varones|estudiante|trabajador/.test(t);
  if (/%|por ciento|de cada \d+|uno de cada/.test(t) && gente) return { ...base, tipo: 'gente', cantidad: 24 };
  const pct = t.match(/(\d+(?:,\d+)?)\s*(%|por ciento)/);
  if (pct) return { ...base, tipo: 'foco', objeto, cantidad: 1, contador: { desde: 0, hasta: Number(pct[1].replace(',', '.')), unidad: '%' } };
  if (num && num.n >= 1e6 && /persona|habitante|gente|humano|poblacion|usuario|seguidor|paciente|nino|hombre|mujer/.test(t)) return { ...base, tipo: 'globo', modo: 'luces', contador: { desde: 0, hasta: num.n, unidad: num.unidad } };
  if (anios.length) return { ...base, tipo: 'linea', hitos: [...new Set(anios)].slice(0, 3).map((a) => ({ anio: a, texto: acortar(texto, 40).replace(/\.$/, '').split(' ').slice(0, 4).join(' ') })) };
  if (/\b(metros|kilometros|km|altura|alto|alta|profundidad|kilometro)\b/.test(t)) return { ...base, tipo: 'torre', objeto, referencia: 'everest' };
  if (num && num.n >= 1000) return { ...base, tipo: 'lluvia', objeto, cantidad: 120, contador: { desde: 0, hasta: num.n, unidad: num.unidad } };
  return { ...base, tipo: 'foco', objeto, cantidad: 1 };
}
// Plantillas por tema: escenas que se agregan solas cuando la idea es de ese tema
const PLANTILLAS = [
  { re: /dalton|color|vision|ojo|vista|ceguera/, escenas: [
    { pos: 1, tipo: 'vision', texto: 'Así ves tú esta mesa llena de colores… y así la ve una persona con daltonismo.', vision: { tipo: 'deutan', desde: 0.38, hasta: 0.58 } },
    { pos: -1, tipo: 'ishihara', texto: 'Haz la prueba: ¿qué número ves en estos puntos?', numero: 74, revelar: 0.8 }
  ] }
];

// ---------- el guion ----------
// opciones: { n: datos (5), elegidos: índices de los datos a usar (si el bot ya eligió) }
export async function construir(idea, { n = 5 } = {}) {
  const art = await buscarArticulo(idea), tema = art.titulo;
  const datos = extraerDatos(art.texto);
  // Los mejores, sin repetirse (misma frase con otras palabras) y en el orden del artículo
  const vistos = [], candidatos = datos.slice().sort((a, b) => b.puntaje - a.puntaje).filter((d) => {
    const w = new Set(sin(d.texto).split(/\W+/).filter((x) => x.length > 5));
    if (vistos.some((v) => [...w].filter((x) => v.has(x)).length >= 4)) return false;
    vistos.push(w); return true;
  }).slice(0, 12);
  const opciones = candidatos.map((d) => ({ ...escenaDe(d.texto, { tema }), orden: d.i, puntaje: d.puntaje, usar: false }));
  // Se eligen de a uno: el mejor puntaje, restando 2 por cada escena del mismo tipo ya elegida
  const usados = {};
  for (let k = 0; k < Math.min(n, opciones.length); k++) {
    const o = opciones.filter((x) => !x.usar).sort((a, b) => (b.puntaje - 2 * (usados[b.tipo] || 0)) - (a.puntaje - 2 * (usados[a.tipo] || 0)))[0];
    o.usar = true; usados[o.tipo] = (usados[o.tipo] || 0) + 1;
  }
  return { idea, tema, url: art.url, opciones: opciones.sort((a, b) => a.orden - b.orden), otros: art.otros };
}
// Del borrador (lo que el bot muestra y se puede cambiar) al guion final para el render
export function aGuion(b) {
  const usados = b.opciones.filter((o) => o.usar), tema = b.tema, t = sin(`${b.idea} ${tema}`);
  const escenas = usados.map(({ orden, puntaje, usar, ...e }) => e);
  for (const p of PLANTILLAS.filter((x) => x.re.test(t))) for (const e of p.escenas) {
    if (escenas.some((x) => x.tipo === e.tipo && x.modo === e.modo)) continue;
    const { pos, ...esc } = e; escenas.splice(pos < 0 ? escenas.length + pos + 1 : Math.min(pos, escenas.length), 0, esc);
  }
  const objeto = objetoDe(`${b.idea} ${tema}`, 'libro');
  return {
    id: `idea-${sin(b.idea).replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${Date.now().toString(36).slice(-4)}`,
    formato: 'idea', titulo: b.titulo || `${tema}: lo que no sabías`, categoria: 'curiosidad',
    destacar: [...new Set(sin(tema).split(/\W+/).filter((w) => w.length > 3))].slice(0, 3),
    escenas: [
      { tipo: 'portada', texto: b.gancho || `¿Qué tanto sabes de ${tema.toLowerCase()}?`, objeto },
      ...escenas,
      { tipo: 'cierre', texto: '¿Cuál dato te sorprendió más? Escríbelo en los comentarios y síguenos para más.', objeto }
    ],
    fuentes: usados.map((o) => ({ dato: o.texto.slice(0, 110), fuente: `Wikipedia: «${tema}»`, url: b.url })),
    origen: { idea: b.idea, articulo: tema, url: b.url }
  };
}
