// El formato de los guiones del formato «Idea» para que los escriba otra herramienta (ChatGPT u otra IA) y los mandes al
// bot: textoFormato() es el texto para copiar (escenas, campos, objetos 3D y reglas) y validar() revisa lo que llega
// (escenas que existen, campos obligatorios, objetos del catálogo, largo de los textos) y lo deja listo para el render.
import CATALOGO from './catalogo3d.mjs';

// Objetos 3D que existen: «codigo» (hechos en código, sin carpeta) y «carpeta/nombre» (modelos de Kenney)
export const OBJETOS = new Set([...CATALOGO.codigo, ...Object.entries(CATALOGO).filter(([k]) => k !== 'codigo').flatMap(([k, v]) => v.map((x) => `${k}/${x}`))]);
const UTILES = {
  codigo: CATALOGO.codigo.filter((x) => !['banera', 'piscina'].includes(x)),
  comida: CATALOGO.comida.filter((x) => !/half|slice|cut|wrapper|plate|tray|pan|pot|knife|fork|spoon|spatula|chopstic|mug|glass|bottle-|shaker|mill|slicer|cooking|utensil|whisk|rolling|grater|cutting|frying|skewer|bowl|bag|barrel|crate|box|can-|carton-small/.test(x)),
  autos: CATALOGO.autos.filter((x) => !/debris|wheel|kart|cone/.test(x)),
  personajes: CATALOGO.personajes.filter((x) => !/^character/.test(x)),
  naturaleza: CATALOGO.naturaleza.filter((x) => /^(tree_default|tree_oak|tree_pineDefaultA|tree_palm|tree_cone|cactus_tall|cactus_short|flower_redA|flower_yellowA|flower_purpleA|mushroom_red|rock_largeA|stone_largeA|plant_bush|crop_pumpkin|crop_melon|campfire_logs|tent_detailedOpen|canoe|log_large)$/.test(x))
};

// Escenas: qué muestran, sus campos (* = obligatorio) y un ejemplo
export const ESPEC = {
  portada: { que: 'Primera escena: la pregunta o gancho, con un objeto grande', campos: { 'texto*': 'gancho de 6 a 12 palabras', objeto: 'objeto 3D' }, ej: { tipo: 'portada', texto: '¿Y si no vieras los colores como los demás?', objeto: 'comida/apple' } },
  foco: { que: 'Uno a cuatro objetos bajo un reflector (sirve para casi todo)', campos: { 'texto*': 'el dato', 'objeto*': 'objeto 3D', cantidad: '1 a 4', contador: 'número que sube en pantalla' }, ej: { tipo: 'foco', texto: 'Un pulpo tiene tres corazones.', objeto: 'corazon', cantidad: 3 } },
  pila: { que: 'Una montaña de muchos objetos', campos: { 'texto*': 'el dato', 'objeto*': 'objeto 3D', cantidad: '50 a 400', contador: '' }, ej: { tipo: 'pila', texto: 'En un año comes unas 400 manzanas.', objeto: 'comida/apple', cantidad: 300 } },
  lluvia: { que: 'Objetos que caen del cielo (cantidades grandes)', campos: { 'texto*': 'el dato', 'objeto*': 'objeto 3D', cantidad: '60 a 200', contador: '' }, ej: { tipo: 'lluvia', texto: 'Cada segundo se venden 100 hamburguesas.', objeto: 'comida/burger', cantidad: 150, contador: { desde: 0, hasta: 100, unidad: 'hamburguesas' } } },
  torre: { que: 'Objetos apilados que suben junto a una referencia', campos: { 'texto*': 'el dato', 'objeto*': 'objeto 3D', cantidad: '20 a 80 objetos', referencia: 'everest | piramide | edificio', proporcion: 'alto de la torre ÷ alto de la referencia (1 = igual)' }, ej: { tipo: 'torre', texto: 'Apiladas, llegarían más alto que el Everest.', objeto: 'moneda', cantidad: 60, referencia: 'everest', proporcion: 1.2 } },
  globo: { que: 'El planeta Tierra', campos: { 'texto*': 'el dato', modo: 'luces (ciudades que se encienden) | satelites | rayos | luna | orbita (alrededor del Sol)', contador: '' }, ej: { tipo: 'globo', texto: 'En el mundo hay más de 300 millones de personas daltónicas.', modo: 'luces', contador: { desde: 0, hasta: 300000000, unidad: 'personas' } } },
  cuadricula: { que: 'Una cuadrícula de objetos que se llena (lado × lado)', campos: { 'texto*': 'el dato', 'objeto*': 'objeto 3D', lado: '5 a 30' }, ej: { tipo: 'cuadricula', texto: 'Llenarían 400 campos de fútbol.', objeto: 'balon', lado: 20 } },
  comparacion: { que: 'Barras hechas de objetos para comparar de 2 a 4 cosas', campos: { 'texto*': 'el dato', 'barras*': '[{ etiqueta, valor (número), texto (lo que se lee arriba), objeto? }]' }, ej: { tipo: 'comparacion', texto: 'Brasil produce el doble que Vietnam.', barras: [{ etiqueta: 'Brasil', valor: 65, texto: '65 M' }, { etiqueta: 'Vietnam', valor: 31, texto: '31 M' }] } },
  linea: { que: 'Línea del tiempo que se recorre caminando', campos: { 'texto*': 'el dato', 'hitos*': '[{ anio (número), texto (2 a 4 palabras), etiqueta_anio? (ej. «Siglo XVIII»), objeto? }] de 2 a 5' }, ej: { tipo: 'linea', texto: 'Dalton lo describió en 1794 y su ADN lo confirmó en 1995.', hitos: [{ anio: 1794, texto: 'Dalton lo describe' }, { anio: 1995, texto: 'Su ADN lo confirma' }] } },
  calle: { que: 'Una calle con autos que pasan', campos: { 'texto*': 'el dato', objeto: 'un auto (autos/…)', cantidad: '6 a 20' }, ej: { tipo: 'calle', texto: 'En Tegucigalpa circulan más de 400 mil autos.', objeto: 'autos/taxi', cantidad: 14 } },
  gente: { que: 'Un grupo de personas (porcentajes, «1 de cada N»)', campos: { 'texto*': 'el dato', cantidad: '6 a 36 personas' }, ej: { tipo: 'gente', texto: 'Le pasa a 1 de cada 12 hombres.', cantidad: 24 } },
  vision: { que: 'Una mesa de frutas (o un semáforo) que cambia a como la ve alguien con daltonismo', campos: { 'texto*': 'el dato', modo: 'mesa | semaforo', 'vision*': '{ tipo: deutan | protan | tritan, desde: 0.35, hasta: 0.55 } (parte de la escena en que cambia)', objetos: 'lista de objetos de comida para la mesa' }, ej: { tipo: 'vision', texto: 'Así ves tú esta mesa… y así la ve una persona daltónica.', vision: { tipo: 'deutan', desde: 0.38, hasta: 0.58 } } },
  ishihara: { que: 'Lámina de puntos de colores con un número escondido', campos: { 'texto*': 'la pregunta', 'numero*': 'de 2 dígitos', revelar: '0.8 (parte de la escena en que se marca)' }, ej: { tipo: 'ishihara', texto: 'Haz la prueba: ¿qué número ves?', numero: 74 } },
  cierre: { que: 'Última escena: pregunta para comentar', campos: { 'texto*': 'la pregunta', objeto: 'objeto 3D' }, ej: { tipo: 'cierre', texto: '¿Qué número viste? Escríbelo en los comentarios.', objeto: 'comida/apple' } }
};
const CATEGORIAS = ['ciencia', 'historia', 'datos', 'curiosidad', 'noticia', 'especial'];

// El texto para pegarle a otra IA junto con tu tema
export function textoFormato() {
  const escenas = Object.entries(ESPEC).map(([k, e]) => `• ${k}: ${e.que}. Campos: ${Object.entries(e.campos).map(([c, d]) => `${c}${d ? ` (${d})` : ''}`).join('; ')}.`).join('\n');
  const ejemplo = { titulo: 'Así ve el mundo una persona daltónica', categoria: 'ciencia', destacar: ['daltonismo'], escenas: [ESPEC.portada.ej, ESPEC.vision.ej, ESPEC.gente.ej, ESPEC.globo.ej, ESPEC.ishihara.ej, ESPEC.linea.ej, ESPEC.cierre.ej], fuentes: [{ dato: '1 de cada 12 hombres', fuente: 'News-Medical, Color Blindness Prevalence', url: 'https://www.news-medical.net/health/Color-Blindness-Prevalence.aspx' }] };
  return `Escribe el guion de un video vertical de 1 minuto en 3D para redes sociales (Potter Play, audiencia de Honduras y Latinoamérica) sobre el tema que te doy al final. Devuélvelo SOLO como JSON válido, sin texto antes ni después.

FORMATO
{ "titulo": "título corto y llamativo", "categoria": "${CATEGORIAS.join(' | ')}", "destacar": ["palabras clave que se resaltan en los subtítulos"], "escenas": [ ... ], "fuentes": [{ "dato": "…", "fuente": "…", "url": "…" }], "nota": "opcional: algo del video que se pueda malentender" }

REGLAS
1. Entre 7 y 9 escenas: la primera es "portada" y la última "cierre". El video dura ~55-60 s.
2. Cada "texto" lo lee un narrador: frases cortas en español neutro, de 60 a 170 caracteres; los números con cifras.
3. Un dato por escena, verificable y con su fuente en "fuentes" (con url real; nada inventado). Nada de salud riesgosa, política ni tragedias.
4. Usa solo estas escenas y solo objetos de la lista. "contador" (opcional en casi todas): { "desde": 0, "hasta": número, "unidad": "palabra" }.
5. Que las escenas varíen (no repitas la misma más de 2 veces).

ESCENAS
${escenas}

OBJETOS 3D (usa el nombre exacto)
• Hechos en código: ${UTILES.codigo.join(', ')}
• Comida: ${UTILES.comida.map((x) => `comida/${x}`).join(', ')}
• Vehículos: ${UTILES.autos.map((x) => `autos/${x}`).join(', ')}
• Personas y ayudas: ${UTILES.personajes.map((x) => `personajes/${x}`).join(', ')}
• Naturaleza: ${UTILES.naturaleza.map((x) => `naturaleza/${x}`).join(', ')}

EJEMPLO
${JSON.stringify(ejemplo, null, 1)}

TEMA: `;
}

// Revisa un guion que llega de afuera. Devuelve { ok, errores, avisos, guion } (el guion, limpio y con id y formato)
export function validar(entrada) {
  const errores = [], avisos = [];
  let g = entrada;
  if (typeof g === 'string') {
    const t = g.replace(/^```(?:json)?\s*|\s*```$/g, '').trim(), ini = t.indexOf('{'), fin = t.lastIndexOf('}');
    try { g = JSON.parse(t.slice(ini, fin + 1)); } catch (e) { return { ok: false, errores: [`No es un JSON válido (${e.message.slice(0, 80)}). Si es largo, mándalo como archivo .json o .txt.`], avisos }; }
  }
  if (!g || typeof g !== 'object') return { ok: false, errores: ['No encontré el guion'], avisos };
  if (!g.titulo) errores.push('Falta "titulo"');
  if (!Array.isArray(g.escenas) || g.escenas.length < 3) errores.push('Hacen falta al menos 3 escenas en "escenas"');
  const escenas = (g.escenas || []).map((e, i) => {
    const n = `Escena ${i + 1} (${e?.tipo || '¿?'})`, esp = ESPEC[e?.tipo];
    if (!esp) { errores.push(`${n}: no existe esa escena. Usa: ${Object.keys(ESPEC).join(', ')}`); return e; }
    for (const c of Object.keys(esp.campos).filter((x) => x.endsWith('*')).map((x) => x.slice(0, -1))) if (e[c] == null || e[c] === '') errores.push(`${n}: falta "${c}"`);
    const texto = String(e.texto || '').trim();
    if (texto.length > 200) avisos.push(`${n}: el texto es largo (${texto.length} caracteres); el narrador tardará más`);
    const obj = (o) => { if (o && !OBJETOS.has(o)) { avisos.push(`${n}: el objeto «${o}» no existe; puse «libro»`); return 'libro'; } return o; };
    const limpio = { ...e, texto, ...(e.objeto ? { objeto: obj(e.objeto) } : {}) };
    if (Array.isArray(e.objetos)) limpio.objetos = e.objetos.map(obj);
    if (Array.isArray(e.barras)) limpio.barras = e.barras.map((b) => ({ ...b, valor: Number(b.valor) || 1, ...(b.objeto ? { objeto: obj(b.objeto) } : {}) }));
    if (Array.isArray(e.hitos)) limpio.hitos = e.hitos.map((h) => ({ ...h, anio: Number(h.anio) || 2000, ...(h.objeto ? { objeto: obj(h.objeto) } : {}) }));
    if (e.tipo === 'vision' && e.vision && !['deutan', 'protan', 'tritan'].includes(e.vision.tipo)) { avisos.push(`${n}: vision.tipo debe ser deutan, protan o tritan; puse deutan`); limpio.vision = { ...e.vision, tipo: 'deutan' }; }
    if (e.contador && !(Number(e.contador.hasta) > 0)) { avisos.push(`${n}: el contador no tiene «hasta»; lo quité`); delete limpio.contador; }
    return limpio;
  });
  if (escenas[0]?.tipo !== 'portada') avisos.push('La primera escena no es «portada»: el video empieza sin gancho');
  if (escenas.at(-1)?.tipo !== 'cierre') avisos.push('La última escena no es «cierre»: el video termina sin pregunta');
  if (!g.fuentes?.length) avisos.push('No trae «fuentes»: si alguien pregunta, no tendrás de dónde sacar la respuesta');
  const slug = String(g.titulo || 'guion').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const guion = { id: `idea-${slug}-${Date.now().toString(36).slice(-4)}`, formato: 'idea', titulo: g.titulo, categoria: CATEGORIAS.includes(g.categoria) ? g.categoria : 'curiosidad', destacar: Array.isArray(g.destacar) ? g.destacar.slice(0, 5) : [], escenas, fuentes: Array.isArray(g.fuentes) ? g.fuentes : [], ...(g.nota ? { nota: g.nota } : {}) };
  return { ok: !errores.length, errores, avisos, guion };
}
