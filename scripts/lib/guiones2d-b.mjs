// Segunda tanda de guiones del motor 2D (SIN IA): 30 más en video3d/guiones/cola/6NN-2d-id.json con «motor: 2d». Temas nuevos:
// ni los de las temporadas 1, 2 y 3 del 3D ni los de la primera tanda 2D. Objetos = emojis escritos directo.
//   node scripts/lib/guiones2d-b.mjs
import fs from 'node:fs';
import path from 'node:path';
import { DIR_COLA } from './video3d-cola.mjs';
import { variarEscenas } from './variar-escenas.mjs';

const P = (texto, objeto) => ({ tipo: 'portada', texto, objeto });
const C = (texto, objeto) => ({ tipo: 'cierre', texto: texto || '¿Lo sabías? Cuéntanos en los comentarios y síguenos para uno nuevo cada día.', objeto });
const F = (texto, objeto, cantidad = 1) => ({ tipo: 'foco', texto, objeto, cantidad });
const G = (texto, cantidad = 24) => ({ tipo: 'gente', texto, cantidad });
const GL = (texto) => ({ tipo: 'globo', texto, modo: 'luces' });
const PI = (texto, objeto, cantidad = 160, contador) => ({ tipo: 'pila', texto, objeto, cantidad, ...(contador ? { contador } : {}) });
const LL = (texto, objeto, cantidad = 120, contador) => ({ tipo: 'lluvia', texto, objeto, cantidad, ...(contador ? { contador } : {}) });
const CU = (texto, objeto, lado = 12) => ({ tipo: 'cuadricula', texto, objeto, lado });
const CO = (texto, barras) => ({ tipo: 'comparacion', texto, barras });
const LI = (texto, hitos) => ({ tipo: 'linea', texto, hitos });
const CAL = (texto, contador) => ({ tipo: 'calendario', texto, contador });
const TO = (texto, objeto, cantidad = 36) => ({ tipo: 'torre', texto, objeto, cantidad });
const CA = (texto, objeto, cantidad = 7) => ({ tipo: 'calle', texto, objeto, cantidad });
const B = (etiqueta, valor, texto, objeto) => ({ etiqueta, valor, texto, ...(objeto ? { objeto } : {}) });
const H = (anio, texto, extra = {}) => ({ anio, texto, ...extra });

// [id, categoría, título (≤ 32 caracteres), palabras clave, escenas, fuentes, nota?]
const EP = [
  ['oro-cubo', 'datos', 'Todo el oro cabe en un cubo', ['oro', 'cubo'], [
    P('Todo el oro que se ha extraído en la historia cabría en un cubo de unos 22 metros.', '🪙'),
    TO('Se calcula que se han sacado unas 216.000 toneladas de oro desde siempre.', '🪙', 40),
    CO('Si fuera un cubo, mediría lo que un edificio de siete pisos por lado.', [B('Cubo de oro', 22, '≈ 22 m', '🪙'), B('Edificio de 7 pisos', 21, '≈ 21 m', '🏢'), B('Persona', 1.7, '1,7 m', '🧍')]),
    F('Casi la mitad está en joyas y la otra parte, en barras guardadas por bancos centrales y por inversionistas.', '💍'),
    G('Cada año se extraen unas 3.000 toneladas más.', 22),
    C()], [
    { dato: '≈ 216.000 toneladas de oro extraídas hasta 2023 (un cubo de ≈ 22 m de lado)', fuente: 'World Gold Council, «How much gold has been mined?»' }],
    'La cifra se actualiza cada año; el tamaño del cubo es una aproximación.'],
  ['quipus-incas', 'historia', 'Los incas contaban con nudos', ['incas', 'quipus'], [
    P('Los incas llevaban sus cuentas con cuerdas y nudos.', '🧶'),
    F('Se llaman quipus: cuerdas de colores con nudos, cuya posición y tipo guardaban números.', '🧶'),
    F('El imperio no tenía escritura como la nuestra, ni usaba la rueda para transportar cargas.', '🛞'),
    CO('Aun así construyó una red de caminos de más de 30.000 kilómetros.', [B('Caminos incas', 30, '≈ 30.000 km', '🛣️'), B('Autopista Panamericana', 30, '≈ 30.000 km'), B('Vuelta a la Tierra', 40, '40.075 km', '🌍')]),
    G('Los mensajeros corrían por esos caminos, relevándose, para llevar noticias muy rápido.', 22),
    C()], [
    { dato: 'Los quipus registraban números con nudos; el imperio no usaba rueda para transporte', fuente: 'Museo Larco y Encyclopaedia Britannica, «Quipu»' },
    { dato: 'Qhapaq Ñan: más de 30.000 km de caminos', fuente: 'UNESCO, «Qhapaq Ñan, Andean Road System»' }],
    'Todavía no se ha descifrado por completo qué más podían guardar los quipus.'],
  ['tenochtitlan-lago', 'historia', 'La ciudad sobre un lago', ['Tenochtitlan', 'lago'], [
    P('Tenochtitlan, la capital azteca, estaba construida sobre un lago.', '🏛️'),
    LI('Los mexicas la fundaron en una isla del lago de Texcoco, y llegó a ser enorme.', [H(1325, 'Se funda Tenochtitlan', { objeto: '🏛️' }), H(1519, 'Llegan los españoles'), H(1521, 'Cae la ciudad')]),
    F('Se llegaba por calzadas y había canales, como una ciudad con calles de agua.', '🛶'),
    CU('Cultivaban en chinampas: islas artificiales de cañas, barro y tierra donde crecían maíz y flores.', '🌽', 10),
    G('Cuando llegaron los españoles, era una de las ciudades más grandes del mundo, con unos 200.000 habitantes.', 28),
    C()], [
    { dato: 'Fundada en 1325 en una isla del lago de Texcoco; ≈ 200.000 habitantes hacia 1519; cae en 1521', fuente: 'Instituto Nacional de Antropología e Historia (México) y Encyclopaedia Britannica, «Tenochtitlán»' }],
    'La población de Tenochtitlan es una estimación; las cifras van de 140.000 a 300.000.'],
  ['eniac-27-toneladas', 'historia', 'La primera computadora pesaba 27', ['computadora', '27'], [
    P('La primera computadora electrónica pesaba 27 toneladas.', '💾'),
    F('Se llamaba ENIAC, se terminó en 1945 en Estados Unidos y ocupaba una sala entera.', '🏢'),
    PI('Tenía casi 17.500 tubos de vacío, que se calentaban y a veces se fundían.', '💡', 150, { desde: 0, hasta: 17468, unidad: 'tubos' }),
    CO('Hoy, un celular es millones de veces más potente y cabe en un bolsillo.', [B('ENIAC', 27, '27 toneladas', '⚖️'), B('Celular', 0.0002, '≈ 200 gramos', '📱')]),
    G('Hacía unas 5.000 sumas por segundo; un celular actual hace miles de millones.', 22),
    C()], [
    { dato: 'ENIAC (1945): ≈ 27 toneladas, 17.468 tubos de vacío, ≈ 5.000 sumas por segundo', fuente: 'Smithsonian Institution y Universidad de Pensilvania, «ENIAC»' }]],
  ['disco-duro-1956', 'historia', 'Un disco duro de una tonelada', ['disco', 'duro'], [
    P('El primer disco duro pesaba más de una tonelada y guardaba 5 megas.', '💽'),
    F('IBM lo presentó en 1956, y se parecía a un refrigerador de gran tamaño.', '🧊'),
    CO('Guardaba unos 5 millones de caracteres, menos que una sola foto de celular.', [B('Disco de 1956', 5, '≈ 5 MB', '💽'), B('Foto de celular', 4, '≈ 4 MB', '📷'), B('Canción en MP3', 3, '≈ 3 MB', '🎵')]),
    F('Las empresas no lo vendían: lo alquilaban por unos 3.200 dólares al mes.', '💵'),
    G('Hoy un disco de bolsillo guarda millones de veces más.', 22),
    C()], [
    { dato: 'IBM 305 RAMAC (1956): 50 discos de 24 pulgadas, ≈ 5 MB, alquiler de ≈ 3.200 USD/mes', fuente: 'IBM Archives, «IBM 350 disk storage unit»' }]],
  ['gps-relatividad', 'ciencia', 'El GPS usa la relatividad', ['GPS', 'relatividad'], [
    P('Tu GPS necesita la teoría de la relatividad de Einstein para funcionar.', '🛰️'),
    F('Los satélites llevan relojes atómicos, y el tiempo corre un poco distinto allá arriba que en la Tierra.', '🛰️'),
    CO('Por su velocidad atrasan un poco y por la menor gravedad adelantan más: el resultado final es una diferencia diaria.', [B('Por la velocidad', 7, '−7 µs/día', '🚀'), B('Por la gravedad', 45, '+45 µs/día', '🌍'), B('Diferencia neta', 38, '+38 µs/día', '⏱️')]),
    LL('Sin corregirla, el GPS fallaría unos 10 kilómetros cada día.', '📍', 100, { desde: 0, hasta: 10, unidad: 'km de error por día' }),
    C()], [
    { dato: 'Diferencia neta ≈ +38 microsegundos por día en los relojes de los satélites GPS; sin corrección el error crecería ≈ 10 km al día', fuente: 'Ashby (2003), Living Reviews in Relativity; GPS.gov' }]],
  ['ok-origen', 'historia', 'De dónde viene «OK»', ['OK', 'Boston'], [
    P('La palabra «OK» empezó como una broma en un periódico de Boston.', '👌'),
    F('En 1839, un periódico de Boston la usó como abreviatura graciosa de «oll korrect», una forma mal escrita de «all correct».', '📰'),
    LI('Esa moda de abreviar con faltas de ortografía duró poco, pero «OK» sobrevivió.', [H(1839, 'Aparece «OK» en Boston', { objeto: '📰' }), H(1840, 'La campaña de Van Buren la populariza')]),
    F('Un candidato a presidente, de apodo «Old Kinderhook», la usó como lema, y se volvió famosa.', '🗳️'),
    G('Hoy se entiende en casi todos los idiomas del mundo.', 24),
    C()], [
    { dato: '«OK» aparece en el Boston Morning Post (1839) como abreviatura de «oll korrect»; se populariza en 1840', fuente: 'Read, A. W. (1963), American Speech; Merriam-Webster, «The history of OK»' }]],
  ['espanol-hablantes', 'datos', 'El español en el mundo', ['español', 'hablantes'], [
    P('El español es la segunda lengua con más hablantes nativos del mundo.', '🗣️'),
    GL('Lo hablan casi 500 millones de personas como lengua materna, en más de veinte países.'),
    CO('Solo el chino mandarín tiene más hablantes nativos.', [B('Chino mandarín', 940, '≈ 940 M', '🇨🇳'), B('Español', 500, '≈ 500 M', '🇪🇸'), B('Inglés', 380, '≈ 380 M', '🇬🇧')]),
    F('Con quienes lo hablan como segunda lengua, pasa de 600 millones de personas.', '🌎'),
    G('Y en Estados Unidos hay más hispanohablantes que en España.', 24),
    C()], [
    { dato: '≈ 500 millones de hablantes nativos y > 600 millones en total', fuente: 'Instituto Cervantes, «El español: una lengua viva» (2023)' },
    { dato: 'Chino mandarín ≈ 940 M y español ≈ 485 M de hablantes nativos', fuente: 'Ethnologue (2024)' }],
    'Las cifras de Ethnologue y del Instituto Cervantes difieren un poco.'],
  ['letra-enie', 'historia', 'La ñ nació de una abreviatura', ['ñ', 'abreviatura'], [
    P('La letra ñ nació como una abreviatura de los copistas medievales.', '🔤'),
    F('Los copistas escribían la doble «nn» con una «n» y una rayita encima, para ahorrar tinta y pergamino.', '✍️'),
    F('Esa rayita se volvió la tilde que hoy ponemos sobre la n.', '〰️'),
    G('Con el tiempo, la «ñ» se convirtió en una letra con su propio sonido.', 22),
    F('Es tan importante para el español que se convirtió en un símbolo de la lengua.', '🇪🇸'),
    C()], [
    { dato: 'La ñ proviene de la abreviatura medieval de «nn» con una tilde', fuente: 'Real Academia Española, «Ñ»' }]],
  ['ada-lovelace', 'historia', 'Ada y el primer programa', ['Ada', 'programa'], [
    P('El primer programa de computadora lo escribió una mujer en 1843.', '👩‍💻'),
    LI('Ada Lovelace imaginó que una máquina podía hacer mucho más que calcular.', [H(1815, 'Nace Ada Lovelace', { objeto: '👩‍💻' }), H(1843, 'Publica su algoritmo'), H(1852, 'Muere a los 36 años')]),
    F('Escribió un algoritmo para la máquina analítica, un diseño de computadora que nunca llegó a construirse.', '⚙️'),
    F('También pensó que algún día las máquinas podrían componer música.', '🎵'),
    G('Hoy se le considera la primera programadora de la historia.', 22),
    C()], [
    { dato: 'Notas de Ada Lovelace (1843) con un algoritmo para la máquina analítica de Charles Babbage', fuente: 'Science Museum (Londres) y Encyclopaedia Britannica, «Ada Lovelace»' }],
    'Que sea «el primer programa» es una interpretación que algunos historiadores discuten.'],
  ['marie-curie', 'historia', 'Dos Nobel en dos ciencias', ['Curie', 'Nobel'], [
    P('Marie Curie ganó dos premios Nobel en dos ciencias distintas.', '🔬'),
    LI('Fue la primera mujer en ganar un Nobel, y la única en ganarlo en dos ciencias.', [H(1903, 'Nobel de Física', { objeto: '🔬' }), H(1911, 'Nobel de Química')]),
    F('Descubrió dos elementos, el polonio y el radio, y estudió la radiactividad.', '☢️'),
    G('Durante la Primera Guerra Mundial, organizó unidades móviles de rayos X para ayudar a los heridos.', 24),
    C()], [
    { dato: 'Nobel de Física 1903 (compartido) y Nobel de Química 1911', fuente: 'NobelPrize.org, «Marie Curie – Facts»', url: 'https://www.nobelprize.org/prizes/physics/1903/marie-curie/facts/' }]],
  ['hermanos-wright', 'historia', 'El primer vuelo duró 12 segundos', ['vuelo', 'segundos'], [
    P('El primer vuelo con motor de la historia duró apenas 12 segundos.', '✈️'),
    F('Fue el 17 de diciembre de 1903 en Kitty Hawk, Carolina del Norte, con los hermanos Wright.', '✈️'),
    CO('Voló unos 37 metros: menos que el largo de un avión grande.', [B('Primer vuelo', 37, '≈ 37 m', '✈️'), B('Boeing 747', 70, '≈ 70 m', '🛫'), B('Cancha de fútbol', 105, '≈ 105 m', '⚽')]),
    F('Ese mismo día hicieron cuatro vuelos, y el más largo duró 59 segundos.', '⏱️'),
    G('Menos de 70 años después, personas caminaban sobre la Luna.', 22),
    C()], [
    { dato: 'Primer vuelo: 17 de diciembre de 1903, 12 segundos y ≈ 37 m; el cuarto, 59 s y ≈ 260 m', fuente: 'Smithsonian National Air and Space Museum; Biblioteca del Congreso de EE. UU.' }]],
  ['gagarin-108', 'historia', 'Gagarin dio la vuelta en 108', ['Gagarin', '108'], [
    P('Yuri Gagarin dio una vuelta a la Tierra en solo 108 minutos.', '🚀'),
    F('Fue el 12 de abril de 1961: el primer ser humano en viajar al espacio.', '🚀'),
    LL('Su vuelo completo duró 108 minutos y dio una sola vuelta a la Tierra.', '⏱️', 100, { desde: 0, hasta: 108, unidad: 'minutos' }),
    F('Dicen que, al verla desde arriba, dijo que la Tierra era azul.', '🌍'),
    G('Ocho años después, el Apolo 11 llevó personas a la Luna.', 22),
    C()], [
    { dato: 'Vostok 1: 12 de abril de 1961, 108 minutos, una órbita', fuente: 'NASA History, «Yuri Gagarin»; Agencia Espacial Europea (ESA)' }]],
  ['apolo-computadora', 'ciencia', 'La computadora de la Luna', ['Apolo', 'computadora'], [
    P('La computadora que llevó a la Luna tenía menos memoria que una foto de tu celular.', '🌙'),
    F('Se llamaba Apollo Guidance Computer y guiaba la nave del Apolo 11, en 1969.', '🌙'),
    CO('Tenía unos 4 kilobytes de memoria de trabajo y unos 72 de almacenamiento fijo.', [B('Computadora del Apolo', 4, '≈ 4 KB', '🌙'), B('Foto de celular', 4000, '≈ 4.000 KB', '📷')]),
    F('Los astronautas la manejaban con un teclado de números muy sencillo.', '🔢'),
    G('Con tan poco, hizo falta muchísimo ingenio y mucho trabajo de equipo.', 22),
    C()], [
    { dato: 'AGC: ≈ 2.048 palabras de memoria borrable y ≈ 36.864 de memoria fija', fuente: 'NASA y MIT Instrumentation Laboratory, «Apollo Guidance Computer»' }]],
  ['arroz-mundo', 'datos', 'El arroz alimenta a la mitad', ['arroz', 'mitad'], [
    P('El arroz es el alimento básico de más de la mitad del mundo.', '🍚'),
    CU('Se cultiva en todos los continentes menos la Antártida, y hay más de 40.000 variedades.', '🌾', 12),
    CO('Asia produce más del 90 % del arroz del mundo.', [B('Asia', 90, '≈ 90 %', '🌏'), B('Resto del mundo', 10, '≈ 10 %', '🌍')]),
    F('Los campos inundados, llamados arrozales, cambian el paisaje donde se cultiva.', '🌾'),
    G('En Honduras, el arroz con frijoles acompaña casi cualquier comida.', 24),
    C()], [
    { dato: 'El arroz es alimento básico de más de la mitad de la población mundial; Asia produce ≈ 90 %', fuente: 'FAO, «Rice market monitor»; Instituto Internacional de Investigación del Arroz (IRRI)' }]],
  ['papas-andes', 'historia', 'La papa nació en los Andes', ['papa', 'Andes'], [
    P('La papa nació en los Andes, y allí hay más de 4.000 variedades.', '🥔'),
    F('Se domesticó hace unos 8.000 años cerca del lago Titicaca, entre Perú y Bolivia.', '🥔'),
    PI('Solo en los Andes se conservan más de 4.000 variedades nativas, de todos los colores.', '🥔', 180, { desde: 0, hasta: 4000, unidad: 'variedades' }),
    LI('Llegó a Europa en el siglo XVI, y cambió la alimentación del mundo.', [H(-6000, 'Se domestica en los Andes', { etiqueta_anio: 'Hace 8.000 años', objeto: '🥔' }), H(1570, 'Llega a España')]),
    G('Hoy es el tercer alimento más consumido del planeta, después del arroz y el trigo.', 24),
    C()], [
    { dato: 'Domesticada hace ≈ 8.000 años en los Andes; > 4.000 variedades nativas', fuente: 'Centro Internacional de la Papa (CIP)' },
    { dato: 'Tercer cultivo alimenticio más importante del mundo', fuente: 'FAO, «International Year of the Potato 2008»' }]],
  ['maiz-teosinte', 'historia', 'El maíz nació en México', ['maíz', 'México'], [
    P('El maíz nació hace unos 9.000 años de una hierba silvestre de México.', '🌽'),
    F('Esa hierba se llama teosinte, y sus granos eran pocos y muy duros.', '🌾'),
    LI('Los pueblos de Mesoamérica lo fueron mejorando generación tras generación.', [H(-7000, 'Se domestica en México', { etiqueta_anio: 'Hace 9.000 años', objeto: '🌽' }), H(1500, 'Llega a Europa')]),
    F('Hoy es uno de los tres cereales más cultivados del mundo, junto al trigo y el arroz.', '🌽'),
    G('En Honduras, las tortillas, los tamales y las baleadas lo tienen de base… o de acompañante.', 24),
    C()], [
    { dato: 'Maíz domesticado a partir del teosinte en el sur de México hace ≈ 9.000 años', fuente: 'Matsuoka et al. (2002), PNAS' },
    { dato: 'Maíz, trigo y arroz: los tres cereales de mayor producción', fuente: 'FAO, FAOSTAT' }]],
  ['eclipse-coincidencia', 'ciencia', 'El Sol es 400 veces más grande', ['eclipse', '400'], [
    P('Por una coincidencia, la Luna tapa justo al Sol en los eclipses.', '🌘'),
    F('El Sol es unas 400 veces más ancho que la Luna.', '☀️'),
    F('Pero también está unas 400 veces más lejos, así que en el cielo se ven casi del mismo tamaño.', '🌙'),
    CO('Esa proporción hace posible los eclipses totales.', [B('Sol (ancho)', 400, '≈ 400 veces', '☀️'), B('Sol (distancia)', 400, '≈ 400 veces', '🛰️'), B('Luna', 1, '1', '🌙')]),
    G('La Luna se aleja de la Tierra unos 3,8 centímetros cada año, y dentro de millones de años ya no podrá tapar el Sol por completo.', 24),
    C()], [
    { dato: 'Sol ≈ 400 veces más ancho y ≈ 400 veces más lejos que la Luna; la Luna se aleja ≈ 3,8 cm al año', fuente: 'NASA, «Eclipses» y «Moon Facts»' }]],
  ['auroras-origen', 'ciencia', 'Cómo nace una aurora', ['aurora', 'viento'], [
    P('Las auroras nacen cuando partículas del Sol chocan con el aire.', '🌌'),
    F('El Sol lanza sin parar un viento de partículas cargadas que viaja hasta la Tierra.', '☀️'),
    F('El campo magnético las guía hacia los polos, donde chocan con los gases a unos 100 kilómetros de altura.', '🧲'),
    CO('El color depende del gas: el oxígeno da verde y rojo, y el nitrógeno, azul y violeta.', [B('Oxígeno', 5, 'verde y rojo', '🟢'), B('Nitrógeno', 3, 'azul y violeta', '🟣')]),
    G('También hay auroras en Júpiter y Saturno.', 22),
    C()], [
    { dato: 'Las auroras surgen por la colisión de partículas del viento solar con la atmósfera, a ≈ 100 km de altura', fuente: 'NASA, «What causes the northern lights?»; NOAA SWPC' }]],
  ['trueno-segundos', 'ciencia', 'Cuenta los segundos del trueno', ['trueno', 'segundos'], [
    P('Puedes calcular a qué distancia cayó un rayo contando los segundos.', '⛈️'),
    F('La luz llega casi al instante, pero el sonido tarda: viaja a unos 343 metros por segundo.', '⚡'),
    CO('Cada tres segundos entre el rayo y el trueno son aproximadamente un kilómetro.', [B('3 segundos', 1, '≈ 1 km', '⛈️'), B('9 segundos', 3, '≈ 3 km'), B('15 segundos', 5, '≈ 5 km')]),
    F('Si el trueno llega en menos de 30 segundos, la tormenta está cerca y conviene buscar refugio.', '🏠'),
    C()], [
    { dato: 'El sonido avanza ≈ 343 m/s: ≈ 3 s por km entre el relámpago y el trueno; regla de los 30 segundos', fuente: 'Servicio Meteorológico Nacional de EE. UU. (NOAA), «Lightning safety»' }]],
  ['agua-hielo-expande', 'ciencia', 'El hielo flota por una rareza', ['hielo', 'flota'], [
    P('El agua es de las pocas sustancias que se expande al congelarse.', '🧊'),
    F('Al congelarse, el agua ocupa cerca de un 9 % más de espacio.', '🧊'),
    F('Por eso el hielo es menos denso que el agua líquida y flota.', '🌊'),
    LL('Si el hielo se hundiera, lagos y mares se congelarían de abajo hacia arriba, y la vida sería muy distinta.', '❄️', 110),
    G('Es también la razón por la que una botella llena se rompe en el congelador.', 22),
    C()], [
    { dato: 'El agua se expande ≈ 9 % al congelarse; el hielo flota', fuente: 'USGS Water Science School, «Water density» y Encyclopaedia Britannica' }]],
  ['sonido-espacio', 'ciencia', 'En el espacio no se oye nada', ['sonido', 'espacio'], [
    P('En el espacio no se oye nada, porque el sonido necesita aire.', '🔇'),
    F('El sonido viaja por vibraciones de un medio, como el aire o el agua.', '🔊'),
    F('En el vacío del espacio casi no hay materia que vibre, así que el sonido no se propaga.', '🌌'),
    G('Los astronautas hablan por radio, que usa ondas que sí viajan por el vacío.', 22),
    F('Las explosiones espaciales de las películas son un efecto: en realidad serían silenciosas.', '🎬'),
    C()], [
    { dato: 'El sonido no se propaga en el vacío; las ondas de radio sí', fuente: 'NASA, «Is there sound in space?»' }]],
  ['mariposa-patas', 'curiosidad', 'Mariposas con sabor en las patas', ['mariposa', 'patas'], [
    P('Las mariposas saborean con las patas.', '🦋'),
    F('Tienen receptores del gusto en los pies, y así saben si una hoja sirve para poner sus huevos.', '🍃'),
    F('Cuando aterrizan sobre una flor, ya están «probando» el néctar.', '🌸'),
    F('Beben con una trompa larga, enrollada como un resorte, llamada probóscide.', '🌀'),
    G('Y pueden detectar olores a muchos metros con sus antenas.', 22),
    C()], [
    { dato: 'Las mariposas tienen receptores de gusto en los tarsos (patas)', fuente: 'Smithsonian Institution y Encyclopaedia Britannica, «Lepidoptera»' }]],
  ['camaron-corazon', 'curiosidad', 'El corazón del camarón', ['camarón', 'corazón'], [
    P('El corazón del camarón está en la cabeza.', '🦐'),
    F('En realidad está en la parte delantera del cuerpo, justo detrás de la cabeza, que se llama cefalotórax.', '🫀'),
    F('Su sangre no es roja: es azulada y se llama hemolinfa.', '🩵'),
    F('Eso sí, no tiene tantas venas como nosotros: la sangre baña los órganos directamente.', '🫧'),
    G('Cuando comas camarones, ya sabes dónde está su corazón.', 22),
    C()], [
    { dato: 'El corazón del camarón se ubica en el cefalotórax y su hemolinfa es azulada', fuente: 'Encyclopaedia Britannica, «Shrimp» y Museo Americano de Historia Natural' }]],
  ['estrella-mar-cerebro', 'curiosidad', 'Estrella de mar sin cerebro', ['estrella', 'cerebro'], [
    P('La estrella de mar no tiene cerebro ni sangre.', '⭐'),
    F('Tiene un sistema nervioso repartido por todo el cuerpo, sin un cerebro central.', '⭐'),
    F('En lugar de sangre, bombea agua de mar por unos canales para moverse y respirar.', '🌊'),
    F('Si pierde un brazo, puede regenerarlo, y algunas especies hasta regeneran el cuerpo entero.', '🦾'),
    G('Hay unas 2.000 especies de estrellas de mar en el mundo.', 22),
    C()], [
    { dato: 'Las estrellas de mar no tienen cerebro ni sangre; usan un sistema vascular acuífero y pueden regenerar brazos', fuente: 'Smithsonian National Museum of Natural History, «Sea stars»' }]],
  ['delfin-medio-cerebro', 'curiosidad', 'El delfín duerme a medias', ['delfín', 'cerebro'], [
    P('Los delfines duermen con la mitad del cerebro despierta.', '🐬'),
    F('Necesitan subir a respirar, así que no pueden desconectarse del todo.', '🌊'),
    F('Cada mitad del cerebro duerme por turnos, y el ojo del lado dormido se mantiene cerrado.', '👁️'),
    G('Así vigilan a los depredadores, nadan despacio y siguen respirando.', 22),
    F('Y los recién nacidos y sus mamás casi no duermen durante las primeras semanas.', '🍼'),
    C()], [
    { dato: 'Los delfines tienen sueño unihemisférico: duermen con una mitad del cerebro a la vez', fuente: 'Lyamin et al. (2005), Neuroscience & Biobehavioral Reviews; Smithsonian' }]],
  ['elefante-gestacion', 'curiosidad', 'El elefante tarda 22 meses', ['elefante', 'meses'], [
    P('La mamá elefante tarda 22 meses en tener a su cría.', '🐘'),
    CAL('Es el embarazo más largo de todos los mamíferos terrestres.', { desde: 0, hasta: 22, unidad: 'meses' }),
    CO('Y el elefantito nace pesando unos 100 kilos.', [B('Elefantito', 100, '≈ 100 kg', '🐘'), B('Bebé humano', 3.4, '≈ 3,4 kg', '👶')]),
    F('Se pone de pie a los pocos minutos y camina con la manada al poco tiempo.', '🦶'),
    G('Toda la manada, sobre todo las tías, ayuda a cuidarlo.', 22),
    C()], [
    { dato: 'Gestación de ≈ 22 meses; cría de ≈ 90-110 kg', fuente: 'WWF y San Diego Zoo, «Elephant»' }]],
  ['ornitorrinco-veneno', 'curiosidad', 'El ornitorrinco pone huevos', ['ornitorrinco', 'huevos'], [
    P('El ornitorrinco es un mamífero que pone huevos.', '🦫'),
    F('Es uno de los pocos mamíferos que lo hacen, junto con los equidnas.', '🥚'),
    F('Los machos tienen un espolón en las patas traseras que suelta veneno.', '⚡'),
    F('Y su pico detecta los campos eléctricos que producen sus presas bajo el agua.', '🦆'),
    G('Vive solo en Australia, y los científicos que lo vieron por primera vez pensaron que era un engaño.', 24),
    C()], [
    { dato: 'Monotrema que pone huevos; machos con espolón venenoso; pico electrorreceptor', fuente: 'Australian Museum, «Platypus» y Smithsonian' }]],
  ['gato-maulla', 'curiosidad', 'Los gatos maúllan para ti', ['gatos', 'maullar'], [
    P('Los gatos adultos maúllan casi solo para hablar con las personas.', '🐱'),
    F('Entre ellos usan el olfato, el lenguaje corporal, los bufidos y el ronroneo.', '😺'),
    F('Los gatitos maúllan para llamar a su mamá, pero de grandes mantienen el maullido solo con nosotros.', '🍼'),
    F('Cada gato aprende qué maullido le funciona con su persona.', '🥫'),
    G('Es una especie de dialecto entre tú y tu gato.', 22),
    C()], [
    { dato: 'Los gatos adultos maúllan principalmente a las personas', fuente: 'Nicastro (2004), Journal of the Acoustical Society of America; Bradshaw (2013), «Cat Sense»' }],
    'Hay excepciones: algunos gatos sí se maúllan entre sí.'],
  ['perro-olfato', 'ciencia', 'El olfato del perro es gigante', ['perro', 'olfato'], [
    P('El olfato de un perro es miles de veces mejor que el nuestro.', '🐕'),
    CO('Un perro tiene unos 300 millones de receptores del olfato; una persona, unos 6 millones.', [B('Perro', 300, '≈ 300 M', '🐕'), B('Persona', 6, '≈ 6 M', '🧍')]),
    F('Una parte de su cerebro dedicada a oler es, proporcionalmente, unas 40 veces mayor que la nuestra.', '🧠'),
    F('Por eso detectan enfermedades, buscan personas perdidas y encuentran objetos escondidos.', '🔍'),
    G('Cada vez que olfatea en un paseo, tu perro lee un periódico de olores.', 22),
    C()], [
    { dato: '≈ 300 millones de receptores olfativos en el perro frente a ≈ 6 millones en las personas', fuente: 'Horowitz (2016), «Being a Dog»; Universidad de Auburn y Scientific American' }],
    'La ventaja exacta depende de la raza y del olor.']
];

let n = 0;
for (const [id, categoria, titulo, destacar, escenas, fuentes, nota] of EP) {
  n++;
  const g = { id: `d2b-${id}`, motor: '2d', episodio: 30 + n, titulo, categoria, destacar, escenas: variarEscenas(escenas), fuentes, ...(nota ? { nota } : {}) };
  fs.writeFileSync(path.join(DIR_COLA, `6${String(n).padStart(2, '0')}-2d-${id}.json`), JSON.stringify(g, null, 2) + '\n');
}
console.log(`${n} guiones 2D (tanda 2) escritos en ${DIR_COLA}`);
