// Genera las mini historias 3D (formato «Idea» con la escena «historia», SIN IA: personajes y modelos CC0 de Kenney, lugares
// armados con código y voz local) en video3d/guiones/cola/3NN-historia-<id>.json. Cada una lleva «fecha» y «turno: noche»
// (15:30, TikTok + YouTube): sale ese día exacto y los datos de la cola siguen en orden.
//   node scripts/lib/historias3d-guiones.mjs
// Ver escenasHistoria.jsx para los campos de cada escena. Los temas de salud llevan fuentes y un tono respetuoso.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './node-env.mjs';
const DIR_COLA = path.join(ROOT, 'video3d', 'guiones', 'historias3d-guardadas'); // guardadas, SIN programar (no están en la cola)

const P = (texto, objeto) => ({ tipo: 'portada', texto, objeto });
const C = (texto, objeto) => ({ tipo: 'cierre', texto, objeto });
const H = (texto, lugar, personajes, extra = {}) => ({ tipo: 'historia', texto, lugar, personajes, ...extra });
const A = (modelo, x, z = 0, extra = {}) => ({ modelo, x, z, ...extra });
const ROJO = '#dc2626', VERDE = '#16a34a', AZUL = '#2563eb', AMARILLO = '#facc15';

const HISTORIAS = [
  // ---------- 1. Daltonismo ----------
  { id: 'mateo-daltonico', fecha: '2026-11-24', titulo: 'Rojo contra verde: Mateo', destacar: ['Mateo', 'daltonismo'], escenas: [
    P('Mateo no distinguía a su equipo del rival. ¿Sabes por qué?', 'balon'),
    H('Mateo amaba el fútbol, pero tenía un problema: nunca sabía a quién pasarle el balón.', 'cancha', [A('male-a', 0, 1.4, { escala: 1.4, accion: 'holding-right' })], { props: [{ objeto: 'balon', x: 0.9, z: 1.8, escala: 0.5 }], camara: 'cerca', foco: [0, 1, 1.4] }),
    H('En su equipo todos llevaban rojo, y los rivales, verde. Para Mateo, los dos colores se veían casi igual.', 'cancha', [
      A('male-a', 0, 2.2, { escala: 1.4, marca: ROJO, accion: 'emote-no' }), A('male-b', -2.4, 0, { marca: ROJO }), A('male-c', -1.2, -1, { marca: ROJO }),
      A('female-a', 2.4, 0, { marca: VERDE }), A('female-b', 1.2, -1, { marca: VERDE })], { camara: 'alta', foco: [0, 0.6, 0.6], vision: { tipo: 'deutan', desde: 0.55, hasta: 0.72 } }),
    H('Se pasó el partido regalando balones al otro equipo, y sus amigos se reían. Mateo quería desaparecer.', 'cancha', [A('male-a', 0, 1.4, { escala: 1.5, accion: 'emote-no' }), A('female-a', -2.2, 0.2, { marca: VERDE }), A('male-b', 2.2, 0.2, { marca: ROJO })], { camara: 'cerca', foco: [0, 1, 1] }),
    H('Esa tarde, lo llevaron con una doctora de los ojos.', 'consultorio', [A('female-c', -1.5, 0, { accion: 'interact-right' }), A('male-a', 1.3, 0.4, { escala: 1.4 })], { camara: 'frente' }),
    { tipo: 'ishihara', texto: 'Ella le mostró un círculo de puntos de colores y le preguntó qué número veía. Mateo no veía ninguno.', numero: 74, revelar: 0.8 },
    H('Tenía daltonismo. No ve menos: ve algunos colores de otra manera, sobre todo el rojo y el verde.', 'consultorio', [A('female-c', -1.5, 0, { accion: 'emote-yes' }), A('male-a', 1.3, 0.4, { escala: 1.4 })], { camara: 'cerca', foco: [0, 1.1, 0.2] }),
    { tipo: 'gente', texto: 'Le pasa a uno de cada doce hombres, y a una de cada doscientas mujeres.', cantidad: 24 },
    H('Su papá le contó que a él le pasaba igual: es hereditario y viaja en el cromosoma equis.', 'interior', [A('male-d', -1.4, 0.4, { accion: 'emote-yes' }), A('male-a', 1.2, 0.8, { escala: 1.4 })], { camara: 'frente' }),
    H('Cambiaron los colores del equipo: azul contra amarillo. Y Mateo volvió a pasar el balón sin dudar.', 'cancha', [
      A('male-a', 0, 1.6, { escala: 1.4, marca: AZUL, accion: [[0, 'idle'], [2.6, 'jump']] }), A('male-b', -2.4, 0, { marca: AZUL }), A('female-a', 2.4, 0, { marca: AMARILLO }), A('female-b', 1.2, -1, { marca: AMARILLO })], { camara: 'orbita', foco: [0, 1, 0.6] }),
    C('¿Conocías el daltonismo? Cuéntanos en los comentarios y compártelo con alguien que quiera saber cómo se ve el mundo así.', 'balon')
  ], fuentes: [
    { dato: 'Daltonismo: afecta a 1 de cada 12 hombres y a 1 de cada 200 mujeres', fuente: 'National Eye Institute (EE. UU.), «Color blindness»', url: 'https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/color-blindness' },
    { dato: 'Es hereditario y los genes están en el cromosoma X', fuente: 'MedlinePlus (NIH), «Color vision deficiency»' }],
    nota: 'Los colores de la escena de los equipos se simulan con el modelo de Machado et al. (2009), una aproximación: cada persona ve distinto.' },

  // ---------- 2. Miopía ----------
  { id: 'ana-miopia', fecha: '2026-11-27', titulo: 'Ana y la pizarra borrosa', destacar: ['Ana', 'miopía'], escenas: [
    P('Ana no veía la pizarra y creía que a todos les pasaba igual.', 'libro'),
    H('Ana se sentaba al fondo del salón y copiaba lo que podía de la pizarra, aunque casi nunca entendía lo que decía.', 'aula', [A('female-d', 1.4, 1.2, { escala: 1.4 }), A('male-c', -1.8, -0.4, { accion: 'interact-right' })], { pizarra: 'LA LUNA', camara: 'frente' }),
    H('Para ella las letras se veían borrosas, como si estuvieran bajo el agua. Pensaba que todos veían así.', 'aula', [A('female-d', 1.4, 1.2, { escala: 1.4 }), A('male-c', -1.8, -0.4)], { pizarra: 'LA LUNA', camara: 'cerca', foco: [0, 1.6, -1], vision: { tipo: 'miopia', desde: 0.3, hasta: 0.5 } }),
    H('Hasta que su maestro notó que entrecerraba los ojos, y habló con su mamá.', 'aula', [A('female-d', 1.4, 1.2, { escala: 1.4, accion: 'emote-no' }), A('male-c', -0.4, 0.2, { accion: 'walk', camina: { a: [0.6, 1.2], t0: 0.4, t1: 2.2 } })], { pizarra: 'LA LUNA', camara: 'frente' }),
    H('En el consultorio, el optometrista le puso unas lentes de prueba y le preguntó: ¿ahora qué ves?', 'consultorio', [A('male-a', -1.5, 0, { accion: 'interact-right' }), A('female-d', 1.3, 0.4, { escala: 1.4 })], { props: [{ objeto: 'personajes/aid-glasses', x: 0, y: 1.6, z: 1.6, escala: 3, flota: true, gira: 0.6, t0: 1.2 }], camara: 'cerca', foco: [0, 1.2, 0.4] }),
    H('Con los lentes, la pizarra apareció nítida. Ana sonrió: tenía miopía, y tenía solución.', 'aula', [A('female-d', 0.8, 1.4, { escala: 1.4, accion: [[0, 'idle'], [1.8, 'jump']] }), A('male-c', -1.8, -0.4, { accion: 'emote-yes' })], { pizarra: 'LA LUNA', camara: 'frente' }),
    { tipo: 'globo', texto: 'Se calcula que para el año 2050 la mitad de las personas del mundo tendrá miopía.', modo: 'luces' },
    H('Y los estudios sugieren que jugar al aire libre ayuda a que los niños desarrollen menos miopía.', 'parque', [A('female-d', -1, 1, { escala: 1.4, accion: 'sprint', camina: { a: [2.4, 0.4], t0: 0.2, t1: 3.6 } }), A('male-e', 2.2, -0.4, { escala: 1.4, accion: 'jump' })], { camara: 'orbita', foco: [0, 1, 0.4] }),
    C('Si ves borroso de lejos, pide un examen de la vista: es rápido y no duele. Cuéntanos en los comentarios si usas lentes.', 'personajes/aid-glasses')
  ], fuentes: [
    { dato: 'Para 2050 se proyecta que cerca de la mitad de la población mundial tendrá miopía (≈ 49,8 %)', fuente: 'Holden et al. (2016), Ophthalmology, «Global prevalence of myopia and high myopia and temporal trends from 2000 through 2050»' },
    { dato: 'El tiempo al aire libre se asocia con menos miopía en niños', fuente: 'Xiong et al. (2017), Acta Ophthalmologica (metaanálisis)' },
    { dato: 'La miopía se corrige con lentes (anteojos o de contacto)', fuente: 'American Academy of Ophthalmology, «What is myopia?»' }],
    nota: 'Los estudios muestran asociación, no una garantía individual; ante molestias en la vista, consultar con un profesional.' },

  // ---------- 3. El primer semáforo ----------
  { id: 'primer-semaforo', fecha: '2026-11-30', titulo: 'El semáforo que explotó', destacar: ['semáforo', '1868'], escenas: [
    P('El primer semáforo del mundo explotó. Esta es su historia.', 'autos/taxi'),
    H('En 1868, Londres tenía un problema: carruajes y peatones se cruzaban sin ningún orden frente al Parlamento.', 'calle', [A('male-b', -2, 0, { accion: 'walk', camina: { a: [2, 0], t0: 0.2, t1: 3 } }), A('female-e', 2, 0.6, { accion: 'walk', camina: { a: [-2, 0.6], t0: 0.2, t1: 3 } })], { camara: 'frente', foco: [0, 1.2, 0] }),
    { tipo: 'linea', texto: 'Lo diseñó un ingeniero de ferrocarriles: brazos mecánicos de día y lámparas de gas rojas y verdes de noche.', hitos: [{ anio: 1868, texto: 'Primer semáforo, en Londres' }, { anio: 1914, texto: 'Primero eléctrico, en Cleveland' }, { anio: 1920, texto: 'Tres luces, en Detroit' }] },
    H('Pero una fuga de gas lo hizo explotar en 1869 y hirió al policía que lo manejaba.', 'calle', [A('male-b', -1.4, 0.4, { accion: 'emote-no' }), A('female-e', 1.4, 0.4, { accion: 'emote-no' })], { camara: 'cerca', foco: [0, 1.3, 0] }),
    H('Casi medio siglo después, en 1914, Cleveland instaló el primer semáforo eléctrico.', 'calle', [A('female-e', -2, 0.6, { accion: 'walk', camina: { a: [2, 0.6], t0: 0.3, t1: 3 } }), A('male-d', 1.6, -0.2, { accion: 'idle' })], { camara: 'orbita', foco: [0, 1.2, 0] }),
    H('El rojo significa alto porque los ferrocarriles ya usaban ese color para el peligro. Y siempre va arriba, para que quien no distingue bien el rojo del verde se guíe por la posición.', 'calle', [A('male-d', -1.6, 1, { escala: 1.5 })], { camara: 'cerca', foco: [3.2, 1.9, -0.9], fov: 36, vision: { tipo: 'deutan', desde: 0.55, hasta: 0.7 } }),
    C('¿Te habías fijado que el rojo siempre va arriba? Cuéntanos en los comentarios y compártelo.', 'autos/taxi')
  ], fuentes: [
    { dato: 'Primer semáforo, Londres, 1868 (ingeniero ferroviario John Peake Knight); explotó en 1869', fuente: 'Enciclopedia Británica, «Traffic light»' },
    { dato: 'Primer semáforo eléctrico: Cleveland (Ohio), 1914', fuente: 'Enciclopedia Británica y Biblioteca del Congreso de EE. UU.' },
    { dato: 'Semáforo de tres colores en Detroit, 1920', fuente: 'History.com, «The history of the traffic light»' }],
    nota: 'La fecha del semáforo de tres colores (Detroit, 1920) es la que más cambia entre fuentes.' },

  // ---------- 4. La cebolla ----------
  { id: 'cebolla-lagrimas', fecha: '2026-12-03', titulo: 'Por qué lloras con la cebolla', destacar: ['cebolla', 'lágrimas'], escenas: [
    P('¿Por qué lloras cuando cortas una cebolla?', 'comida/onion'),
    H('Cortar una cebolla parece fácil, pero casi siempre termina con lágrimas.', 'cocina', [A('female-e', 0, -2.4, { accion: 'interact-right' })], { props: [{ objeto: 'comida/onion', x: -0.5, y: 1.06, z: -1.6, escala: 0.6 }], camara: 'frente', foco: [0, 1.2, -1.6] }),
    H('Al cortarla, se rompen sus células y se mezclan sustancias que estaban separadas.', 'cocina', [A('female-e', 0, -2.4, { accion: 'interact-right' })], { props: [{ objeto: 'comida/onion-half', x: -0.5, y: 1.06, z: -1.6, escala: 0.6 }, { objeto: 'comida/onion-half', x: 0.3, y: 1.06, z: -1.6, escala: 0.6, giro: 3 }], camara: 'cerca', foco: [0, 1.2, -1.6] }),
    H('Eso produce un gas que sube hasta tus ojos, y tu cuerpo responde con lágrimas para protegerlos.', 'cocina', [A('female-e', 0, -2.4, { accion: 'emote-no' })], { props: [{ objeto: 'comida/onion-half', x: -0.5, y: 1.06, z: -1.6, escala: 0.6 }], camara: 'cerca', foco: [0, 1.5, -2], vision: { tipo: 'miopia', desde: 0.5, hasta: 0.7 } }),
    H('En 2002, un equipo japonés descubrió la enzima que fabrica ese gas.', 'cocina', [A('female-e', 0, -2.4, { accion: 'emote-yes' })], { props: [{ objeto: 'comida/onion', x: -0.5, y: 1.06, z: -1.6, escala: 0.6, gira: 1 }], camara: 'orbita', foco: [0, 1.2, -1.6] }),
    H('Un truco que puede ayudar: enfriar la cebolla antes de cortarla y usar un cuchillo bien afilado.', 'cocina', [A('female-e', 0, -2.4, { accion: 'interact-right' })], { props: [{ objeto: 'comida/onion', x: -0.5, y: 1.06, z: -1.6, escala: 0.6 }, { objeto: 'comida/cooking-knife-chopping', x: 0.5, y: 1.06, z: -1.6, escala: 0.8 }], camara: 'frente', foco: [0, 1.2, -1.6] }),
    C('¿Cuál es tu truco para no llorar con la cebolla? Cuéntanos en los comentarios.', 'comida/onion')
  ], fuentes: [
    { dato: 'Una enzima («lachrymatory-factor synthase») fabrica el gas que irrita los ojos al cortar cebolla', fuente: 'Imai et al. (2002), Nature, «An onion enzyme that makes the eyes water»' },
    { dato: 'Enfriar la cebolla y usar un cuchillo afilado reducen el gas (consejo habitual)', fuente: 'Scientific American, «Why do onions make you cry?»' }],
    nota: 'Los trucos para llorar menos son consejos comunes; no hay una solución garantizada.' },

  // ---------- 5. El bostezo contagioso ----------
  { id: 'bostezo-contagioso', fecha: '2026-12-06', titulo: 'El bostezo que se contagia', destacar: ['bostezo', 'contagia'], escenas: [
    P('¿Por qué bostezas cuando ves bostezar a otro?', 'comida/cup-coffee'),
    H('En una sala, una persona bosteza… y de pronto otra, y otra más.', 'interior', [
      A('male-a', -2.4, 0, { accion: [[0, 'idle'], [1.0, 'emote-yes']] }), A('female-b', -0.8, 0.4, { accion: [[0, 'idle'], [2.0, 'emote-yes']] }), A('male-d', 0.8, 0, { accion: [[0, 'idle'], [3.0, 'emote-yes']] }), A('female-f', 2.4, 0.4, { accion: [[0, 'idle'], [4.0, 'emote-yes']] })], { camara: 'frente' }),
    H('Se llama bostezo contagioso, y no solo pasa viéndolo: a veces basta con leer sobre él. ¿Ya sientes ganas?', 'interior', [A('female-c', 0, 0.6, { escala: 1.9, accion: [[0, 'idle'], [2.6, 'emote-yes']] })], { camara: 'cerca', foco: [0, 1.5, 0.6] }),
    { tipo: 'gente', texto: 'Los estudios dicen que cerca de la mitad de las personas lo contagia.', cantidad: 24 },
    H('Hasta los perros se contagian: en un estudio de 2008, la mayoría bostezó al ver bostezar a una persona.', 'parque', [A('male-e', -1, 1, { accion: [[0, 'idle'], [1.5, 'emote-yes']] }), A('female-a', 1.2, 0.4, { accion: 'idle' })], { camara: 'orbita', foco: [0, 1, 0.6] }),
    H('Nadie sabe con certeza por qué pasa. Una idea es que tiene que ver con la empatía; otra, con enfriar el cerebro.', 'interior', [A('female-c', -1.2, 0.6, { accion: 'idle' }), A('male-b', 1.2, 0.6, { accion: 'emote-no' })], { camara: 'frente' }),
    C('¿Ya bostezaste? Cuéntanos en los comentarios y compártelo con alguien que tenga sueño.', 'comida/cup-coffee')
  ], fuentes: [
    { dato: 'Bostezo contagioso: también se dispara al leer o pensar en bostezar', fuente: 'Provine (1986), Ethology, «Yawning as a stereotyped action pattern and releasing stimulus»' },
    { dato: 'Perros que bostezan al ver bostezar a una persona (21 de 29)', fuente: 'Joly-Mascheroni, Senju y Shepherd (2008), Biology Letters' },
    { dato: 'Hipótesis: empatía y enfriamiento del cerebro; no hay consenso', fuente: 'Gallup y Gallup (2007), Evolutionary Psychology' }],
    nota: 'La proporción de personas que se contagian varía según el estudio (entre ~40 % y ~60 %).' }
];

let n = 0;
for (const h of HISTORIAS) {
  n++;
  const g = { id: h.id, formato: 'idea', ambiente: h.ambiente || 'pradera', fecha: h.fecha, turno: 'noche', titulo: h.titulo, categoria: 'minihistoria', destacar: h.destacar, escenas: h.escenas, fuentes: h.fuentes, ...(h.nota ? { nota: h.nota } : {}) };
  fs.writeFileSync(path.join(DIR_COLA, `3${String(n).padStart(2, '0')}-historia-${h.id}.json`), JSON.stringify(g, null, 2) + '\n');
}
console.log(`${n} historias escritas en ${DIR_COLA}`);
