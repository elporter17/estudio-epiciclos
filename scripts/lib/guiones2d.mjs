// Genera los 30 guiones del motor 2D (SIN IA) en video3d/guiones/cola/4NN-id.json con «motor: 2d». Mismo formato que los del 3D
// (portada, escenas genéricas y cierre), pero con temas que NO están en las temporadas 1 y 2 del 3D, y con emojis como objetos
// (el motor 2D acepta un emoji directo en «objeto»). Cada guion lleva fuentes y, si algo se puede malentender, una nota.
//   node scripts/lib/guiones2d.mjs
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
  ['ballena-azul', 'ciencia', 'El corazón de la ballena azul', ['ballena', 'corazón'], [
    P('El corazón de la ballena azul es del tamaño de un auto pequeño.', '🐋'),
    F('La ballena azul es el animal más grande que ha existido: llega a medir unos 30 metros.', '🐋'),
    CO('Es más larga que dos autobuses juntos y mide casi veinte veces lo que una persona.', [B('Ballena azul', 30, '30 m', '🐋'), B('Autobús', 12, '12 m', '🚌'), B('Persona', 1.7, '1,7 m', '🧍')]),
    F('Su corazón pesa cerca de 180 kilos: como dos o tres adultos juntos.', '🫀'),
    LL('Late muy despacio: cuando bucea puede bajar a unos dos latidos por minuto.', '❤️', 90),
    PI('Y un ballenato toma unos doscientos litros de leche al día.', '🥛', 110, { desde: 0, hasta: 200, unidad: 'litros' }),
    C()], [
    { dato: 'Hasta ≈ 30 m de largo y unas 150 toneladas', fuente: 'NOAA Fisheries, «Blue whale»' },
    { dato: 'Corazón de ≈ 180 kg y hasta 2 latidos por minuto al bucear', fuente: 'Goldbogen et al. (2019), PNAS; Royal Ontario Museum (2014)' }]],
  ['tiburones-arboles', 'historia', 'Los tiburones son más viejos', ['tiburones', 'árboles'], [
    P('Los tiburones existían antes que los árboles.', '🦈'),
    LI('Los primeros tiburones nadaban hace unos 450 millones de años, mucho antes que los primeros bosques.', [H(-450, 'Primeros tiburones', { etiqueta_anio: 'Hace 450 M', objeto: '🦈' }), H(-385, 'Primeros árboles', { etiqueta_anio: 'Hace 385 M' }), H(-230, 'Primeros dinosaurios', { etiqueta_anio: 'Hace 230 M' }), H(-66, 'Se extinguen los dinosaurios', { etiqueta_anio: 'Hace 66 M' })]),
    F('Han sobrevivido a varias extinciones masivas, incluida la de los dinosaurios.', '🦖'),
    CU('Hoy hay más de 500 especies de tiburones, desde unos de 20 centímetros hasta el tiburón ballena.', '🦈', 7),
    PI('Y casi ninguna ataca a las personas: cada año hay menos de diez muertes por mordidas en todo el mundo.', '🏊', 90),
    C()], [
    { dato: 'Escamas de tiburón de hace ≈ 450 M de años; primeros árboles hace ≈ 385 M', fuente: 'Smithsonian Ocean, «Sharks»; Stein et al. (2007), Nature (Gilboa)' },
    { dato: 'Menos de 10 muertes al año por mordidas', fuente: 'International Shark Attack File, Museo de Historia Natural de Florida' }],
    'Las fechas de los fósiles más antiguos se revisan con cada hallazgo; son aproximadas.'],
  ['amazonas-agua', 'datos', 'El río que aporta el 20 %', ['Amazonas', '20'], [
    P('El Amazonas lleva más agua que cualquier otro río del planeta.', '🌊'),
    GL('Aporta cerca del 20 % de toda el agua dulce que los ríos llevan al mar.'),
    LL('Descarga unos 209.000 metros cúbicos de agua por segundo.', '💧', 140, { desde: 0, hasta: 209000, unidad: 'm³ por segundo' }),
    CO('Su caudal supera al de los siguientes siete ríos juntos.', [B('Amazonas', 209, '209.000', '🌊'), B('Congo', 41, '41.000'), B('Misisipi', 17, '16.800')]),
    F('En época de lluvias puede medir hasta 40 kilómetros de orilla a orilla.', '🛶'),
    C()], [
    { dato: 'Descarga ≈ 209.000 m³/s, ≈ 20 % del agua dulce que llega al océano', fuente: 'NASA Earth Observatory y USGS' },
    { dato: 'Caudal mayor que el de los siguientes ríos juntos', fuente: 'Encyclopaedia Britannica, «Amazon River»' }],
    'Las cifras de caudal cambian por temporada y por el método de medición.'],
  ['neptuno-ano', 'ciencia', 'Un año en Neptuno dura 165', ['Neptuno', '165'], [
    P('Un año en Neptuno dura 165 años de los nuestros.', '🪐'),
    LI('Neptuno se descubrió con matemáticas antes de verlo, y recién en 2011 completó su primera vuelta al Sol desde entonces.', [H(1846, 'Se descubre Neptuno', { objeto: '🪐' }), H(1989, 'Pasa la sonda Voyager 2'), H(2011, 'Primera vuelta completa')]),
    F('Tarda unos 165 años terrestres en dar una vuelta alrededor del Sol.', '☀️'),
    LL('Allí soplan los vientos más rápidos del sistema solar: más de 2.000 kilómetros por hora.', '🌬️', 100, { desde: 0, hasta: 2100, unidad: 'km/h' }),
    G('Es tan lejano que desde allí el Sol se vería como una estrella muy brillante.', 20),
    C()], [
    { dato: 'Año de ≈ 165 años terrestres; vientos de ≈ 2.100 km/h', fuente: 'NASA, «Neptune Facts»', url: 'https://science.nasa.gov/neptune/neptune-facts/' },
    { dato: 'Descubierto en 1846 por cálculos de Le Verrier y Adams; Voyager 2 pasó en 1989', fuente: 'NASA, «Neptune»' }]],
  ['jupiter-mancha', 'ciencia', 'La mancha más grande de todas', ['mancha', 'Júpiter'], [
    P('En Júpiter hay una tormenta más grande que la Tierra.', '🪐'),
    CO('La Gran Mancha Roja mide unos 16.000 kilómetros de ancho: cabe la Tierra entera.', [B('Gran Mancha Roja', 16, '≈ 16.000 km', '🌀'), B('La Tierra', 12.7, '12.742 km', '🌍')]),
    F('Es una tormenta que se observa desde hace más de 150 años.', '🌀'),
    LL('Sus vientos superan los 400 kilómetros por hora.', '🌪️', 100, { desde: 0, hasta: 430, unidad: 'km/h' }),
    CU('Y el planeta entero es tan grande que cabrían más de mil Tierras dentro.', '🌍', 10),
    C()], [
    { dato: 'Gran Mancha Roja de ≈ 16.000 km (2017); vientos de hasta ≈ 430 km/h', fuente: 'NASA, misión Juno y «Jupiter Facts»' },
    { dato: 'Volumen de Júpiter ≈ 1.300 veces el de la Tierra', fuente: 'NASA, «Jupiter Fact Sheet»' }],
    'La mancha se está encogiendo: su tamaño exacto depende del año de la medición.'],
  ['saturno-flota', 'ciencia', 'Saturno flotaría en el agua', ['Saturno', 'flotaría'], [
    P('Saturno flotaría en el agua si hubiera una piscina lo bastante grande.', '🪐'),
    CO('Su densidad es menor que la del agua, y la Tierra es el planeta más denso.', [B('Saturno', 0.69, '0,69 g/cm³', '🪐'), B('Agua', 1, '1 g/cm³', '💧'), B('Tierra', 5.5, '5,5 g/cm³', '🌍')]),
    F('Es un gigante de gas: casi todo hidrógeno y helio, los dos elementos más livianos.', '🎈'),
    LI('Sus anillos se vieron por primera vez con telescopio hace más de 400 años.', [H(1610, 'Galileo ve «orejas»', { objeto: '🔭' }), H(1655, 'Huygens ve un anillo')]),
    F('Los anillos miden más de 280.000 kilómetros de ancho, pero en algunos tramos tienen apenas unos diez metros de grosor.', '💍'),
    C()], [
    { dato: 'Densidad media de Saturno ≈ 0,69 g/cm³ (menor que la del agua)', fuente: 'NASA, «Saturn Fact Sheet»' },
    { dato: 'Anillos: > 280.000 km de ancho y tan finos como ≈ 10 m en algunas zonas', fuente: 'NASA/JPL, «Saturn’s Rings»' }]],
  ['estrella-neutrones', 'ciencia', 'Una estrella como una ciudad', ['neutrones', 'ciudad'], [
    P('Una estrella de neutrones mide como una ciudad, pero pesa más que el Sol.', '⭐'),
    F('Mide unos 20 kilómetros de ancho, y tiene más masa que el Sol.', '🏙️'),
    PI('Un cubito de su materia pesaría unos mil millones de toneladas.', '🧊', 130, { desde: 0, hasta: 1, unidad: 'mil millones de toneladas' }),
    LL('Algunas giran hasta 716 veces por segundo.', '🌀', 110, { desde: 0, hasta: 716, unidad: 'vueltas por segundo' }),
    G('Nacen cuando una estrella enorme explota y su centro se aplasta sobre sí mismo.', 22),
    C()], [
    { dato: 'Ancho ≈ 20 km y más masa que el Sol; un cubito de azúcar pesaría ≈ mil millones de toneladas', fuente: 'NASA Goddard, «Neutron stars»' },
    { dato: 'Pulsar que gira ≈ 716 veces por segundo', fuente: 'Hessels et al. (2006), Science' }],
    'La masa de un «cubito» depende de la densidad que se tome: es un orden de magnitud.'],
  ['celulas-cuerpo', 'ciencia', 'Tu cuerpo tiene 30 billones', ['células', '30'], [
    P('Tu cuerpo tiene unos 30 billones de células.', '🧬'),
    G('Son casi cuatro mil veces las personas que viven en el planeta.', 30),
    CO('Y 84 de cada 100 son glóbulos rojos.', [B('Glóbulos rojos', 84, '84 %', '🩸'), B('Todas las demás', 16, '16 %', '🧫')]),
    LL('Cada día se renuevan unos 330 mil millones de células.', '🔄', 110, { desde: 0, hasta: 330, unidad: 'mil millones' }),
    F('Y hay más o menos tantas bacterias en tu cuerpo como células propias.', '🦠'),
    C()], [
    { dato: '≈ 30 billones de células humanas; 84 % glóbulos rojos', fuente: 'Sender, Fuchs y Milo (2016), PLoS Biology; Sender y Milo (2021), Nature Medicine' },
    { dato: 'Se renuevan ≈ 330 mil millones al día; bacterias ≈ igual que células humanas', fuente: 'Sender y Milo (2021), Nature Medicine' }],
    'Son estimaciones para un adulto promedio: cada persona es distinta.'],
  ['adn-dos-metros', 'ciencia', 'El ADN de una célula: 2 metros', ['ADN', 'metros'], [
    P('Si estiraras el ADN de una sola célula, mediría casi dos metros.', '🧬'),
    F('Cabe dentro del núcleo, que es miles de veces más pequeño, porque está enrollado muy apretado.', '🧵'),
    LL('Tiene unos 3.200 millones de «letras» químicas.', '🔤', 120, { desde: 0, hasta: 3200, unidad: 'millones de letras' }),
    G('Entre dos personas cualesquiera, el 99,9 % del ADN es igual.', 30),
    F('Con el chimpancé compartimos cerca del 98,8 %.', '🐒'),
    C()], [
    { dato: 'ADN humano de ≈ 2 m por célula y ≈ 3.200 millones de pares de bases', fuente: 'National Human Genome Research Institute (NIH)' },
    { dato: '99,9 % igual entre personas; ≈ 98,8 % con el chimpancé', fuente: 'NHGRI; Chimpanzee Sequencing and Analysis Consortium (2005), Nature' }]],
  ['cleopatra-iphone', 'historia', 'Cleopatra y el iPhone', ['Cleopatra', 'iPhone'], [
    P('Cleopatra vivió más cerca del iPhone que de la construcción de la Gran Pirámide.', '👑'),
    LI('La Gran Pirámide ya tenía unos 2.500 años cuando nació Cleopatra.', [H(-2560, 'Gran Pirámide de Guiza', { etiqueta_anio: '≈ 2560 a. C.', objeto: '🔺' }), H(-30, 'Muere Cleopatra', { etiqueta_anio: '30 a. C.' }), H(2007, 'Primer iPhone', { etiqueta_anio: '2007' })]),
    F('Entre la muerte de Cleopatra y el primer iPhone pasaron unos 2.000 años.', '📱'),
    G('La historia es más larga de lo que parece: los egipcios de su época ya miraban las pirámides como ruinas.', 24),
    C()], [
    { dato: 'Gran Pirámide ≈ 2560 a. C.; Cleopatra VII murió en el 30 a. C.; primer iPhone en 2007', fuente: 'Encyclopaedia Britannica, «Cleopatra» y «Pyramids of Giza»; Apple (2007)' }],
    'La fecha de construcción de la pirámide es aproximada (±100 años).'],
  ['primer-mensaje-lo', 'historia', 'El primer mensaje fue «LO»', ['mensaje', 'LO'], [
    P('El primer mensaje enviado por Internet fue «LO».', '💻'),
    F('En 1969, desde una universidad de California, querían escribir «LOGIN».', '⌨️'),
    F('Pero el sistema falló después de la segunda letra, y solo llegó «LO».', '💥'),
    LI('Desde entonces, internet creció por etapas.', [H(1969, 'Primer mensaje: «LO»', { objeto: '💻' }), H(1971, 'Primer correo electrónico'), H(1983, 'Nace el internet moderno'), H(1991, 'La web se abre al público')]),
    GL('Hoy casi siete de cada diez personas del mundo usan internet.'),
    C()], [
    { dato: 'Primer mensaje ARPANET: 29 de octubre de 1969, UCLA → SRI; falló tras «LO»', fuente: 'UCLA Samueli, «The first message sent over the ARPANET»' },
    { dato: 'Correo (1971), TCP/IP (1983), web pública (1991)', fuente: 'Encyclopaedia Britannica, «Internet»' },
    { dato: '≈ 68 % de la población mundial usa internet (2024)', fuente: 'ITU, «Facts and Figures 2024»' }]],
  ['codigo-qr', 'datos', 'El código QR nació en fábrica', ['QR', 'fábrica'], [
    P('El código QR se inventó para seguir piezas de autos en una fábrica.', '📱'),
    F('Lo creó Denso Wave, una empresa japonesa, en 1994.', '🏭'),
    CU('Parece un cuadro de puntos, pero cada punto es un dato que el celular lee.', '⬛', 12),
    PI('Puede guardar hasta unos 7.000 dígitos.', '🔢', 110, { desde: 0, hasta: 7000, unidad: 'dígitos' }),
    F('Y todavía se lee aunque esté roto o manchado hasta en un 30 %.', '🩹'),
    C()], [
    { dato: 'Inventado en 1994 por Denso Wave (Masahiro Hara) para rastrear piezas', fuente: 'Denso Wave, «History of QR Code»' },
    { dato: 'Hasta 7.089 dígitos; corrección de errores de hasta ≈ 30 %', fuente: 'ISO/IEC 18004 y Denso Wave' }]],
  ['bluetooth-rey', 'historia', 'Bluetooth se llama como un rey', ['Bluetooth', 'rey'], [
    P('Bluetooth se llama así por un rey vikingo.', '🦷'),
    F('Harald «Diente Azul» fue un rey de Dinamarca que unió a varias tribus hace más de mil años.', '👑'),
    LI('Su nombre llegó a la tecnología mil años después.', [H(958, 'Reina Harald (≈ 958)', { objeto: '👑' }), H(1997, 'Proponen el nombre'), H(1998, 'Nace el grupo Bluetooth SIG')]),
    F('La idea era unir dispositivos de distintas marcas, como él unió pueblos.', '🔗'),
    F('Y el logo mezcla las dos runas de sus iniciales, H y B.', 'ᚼ'),
    C()], [
    { dato: 'Harald I «Bluetooth» Gormsson, rey de Dinamarca (c. 958-986)', fuente: 'Encyclopaedia Britannica, «Harald I Bluetooth»' },
    { dato: 'Nombre propuesto en 1997 por Jim Kardach; logo con las runas ᚼ y ᛒ', fuente: 'Bluetooth SIG, «Our history»' }],
    'Por qué lo llamaban «Diente Azul» no está claro; se cree que tenía un diente oscuro.'],
  ['sonido-agua', 'ciencia', 'El sonido corre más en el agua', ['sonido', 'agua'], [
    P('El sonido viaja más de cuatro veces más rápido bajo el agua.', '🔊'),
    CO('En el aire va a unos 343 metros por segundo; en el agua, a unos 1.480.', [B('Aire', 343, '343 m/s', '💨'), B('Agua', 1480, '1.480 m/s', '🌊'), B('Acero', 5960, '≈ 5.960 m/s', '🔩')]),
    F('Por eso bajo el agua cuesta saber de dónde viene un sonido: llega casi al mismo tiempo a los dos oídos.', '🤿'),
    LL('Las ballenas aprovechan que el sonido llega muy lejos en el mar para llamarse entre ellas.', '🐋', 80),
    C()], [
    { dato: 'Sonido ≈ 343 m/s en el aire (20 °C), ≈ 1.480 m/s en el agua y ≈ 5.960 m/s en el acero', fuente: 'Encyclopaedia Britannica, «Speed of sound» y Discovery of Sound in the Sea (DOSITS)' }],
    'La velocidad depende de la temperatura y la salinidad.'],
  ['colibri-alas', 'ciencia', 'El colibrí y sus alas', ['colibrí', 'alas'], [
    P('El colibrí bate las alas hasta 80 veces por segundo.', '🐦'),
    LL('Según la especie, aletea entre 50 y 80 veces cada segundo.', '🪽', 120, { desde: 0, hasta: 80, unidad: 'aleteos por segundo' }),
    F('Es la única ave que puede volar hacia atrás y quedarse quieta en el aire.', '🌸'),
    CO('El más pequeño pesa menos que una moneda.', [B('Colibrí abeja', 2, '≈ 2 g', '🐦'), B('Moneda', 7, '≈ 7 g', '🪙')]),
    F('Come muchas veces al día: su cuerpo gasta energía muy rápido.', '🍯'),
    C()], [
    { dato: 'Aletea entre ≈ 50 y 80 veces por segundo y puede volar hacia atrás', fuente: 'Smithsonian National Zoo, «Hummingbirds»' },
    { dato: 'El colibrí abeja pesa ≈ 2 g', fuente: 'Audubon Society y Encyclopaedia Britannica' }],
    'Muchas aves pueden cernirse un momento; el colibrí es el único que lo mantiene de forma sostenida.'],
  ['guepardo-velocidad', 'ciencia', 'El guepardo, el más veloz', ['guepardo', 'veloz'], [
    P('El guepardo pasa de cero a cien kilómetros por hora en unos tres segundos.', '🐆'),
    CO('Es el animal terrestre más veloz: gana hasta a la persona más rápida.', [B('Guepardo', 100, '≈ 100 km/h', '🐆'), B('Usain Bolt', 44.7, '44,7 km/h', '🏃'), B('Persona trotando', 12, '≈ 12 km/h', '🚶')]),
    CA('Pero solo mantiene esa carrera unos cientos de metros, y después tiene que descansar.', '🐆', 6),
    F('Y aunque es un felino grande, no ruge: ronronea.', '😺'),
    C()], [
    { dato: 'Aceleración 0-100 km/h en ≈ 3 s; velocidad máxima registrada ≈ 93-100 km/h', fuente: 'Wilson et al. (2013), Nature; San Diego Zoo' },
    { dato: 'Usain Bolt: 44,72 km/h (2009)', fuente: 'World Athletics' }]],
  ['koala-huellas', 'curiosidad', 'El koala y sus huellas', ['koala', 'huellas'], [
    P('Los koalas tienen huellas dactilares casi iguales a las humanas.', '🐨'),
    F('Tanto, que bajo el microscopio es difícil distinguirlas de las de una persona.', '🔍'),
    CAL('Duerme unas 20 horas al día, porque comer hojas de eucalipto da muy poca energía.', { desde: 0, hasta: 20, unidad: 'horas' }),
    F('Esas hojas son tóxicas para la mayoría de los animales, y el koala las digiere con ayuda de microbios.', '🌿'),
    G('Un bebé de koala nace del tamaño de una gominola y vive meses en la bolsa de su mamá.', 18),
    C()], [
    { dato: 'Huellas dactilares casi indistinguibles de las humanas', fuente: 'Henneberg et al. (1997), Nature; Australian Koala Foundation' },
    { dato: 'Duerme ≈ 18-22 horas al día', fuente: 'Australian Koala Foundation y San Diego Zoo' }]],
  ['jirafa-cuello', 'curiosidad', 'La jirafa y sus siete huesos', ['jirafa', 'siete'], [
    P('La jirafa tiene los mismos huesos del cuello que tú: siete.', '🦒'),
    CO('Casi todos los mamíferos tienen siete vértebras en el cuello, desde un ratón hasta una jirafa.', [B('Persona', 7, '7', '🧍'), B('Jirafa', 7, '7', '🦒'), B('Ratón', 7, '7', '🐭')]),
    F('Lo que cambia es el tamaño: cada hueso de una jirafa puede medir unos 25 centímetros.', '📏'),
    F('Su corazón pesa unos 11 kilos para subir la sangre hasta la cabeza.', '🫀'),
    F('Y su lengua mide hasta unos 45 centímetros, es oscura y agarra las hojas.', '👅'),
    C()], [
    { dato: 'Siete vértebras cervicales, como casi todos los mamíferos', fuente: 'Smithsonian National Zoo, «Giraffe»' },
    { dato: 'Corazón de ≈ 11 kg; lengua de hasta ≈ 45-50 cm', fuente: 'San Diego Zoo, «Giraffe»' }],
    'Los perezosos y los manatíes son excepciones, con menos o más de siete.'],
  ['cocodrilo-lengua', 'ciencia', 'El cocodrilo no saca la lengua', ['cocodrilo', 'mordida'], [
    P('Los cocodrilos no pueden sacar la lengua.', '🐊'),
    F('Una membrana la mantiene pegada al paladar, así que no se mueve como la nuestra.', '👅'),
    CO('Pero su mordida es la más fuerte que se ha medido en un animal vivo.', [B('Cocodrilo marino', 16.4, '≈ 16.400 N', '🐊'), B('León', 4.2, '≈ 4.200 N', '🦁'), B('Persona', 0.9, '≈ 900 N', '🧍')]),
    F('Pueden pasar meses sin comer, porque guardan energía en la cola.', '🕰️'),
    G('Y su linaje es muy antiguo: sus parientes ya vivían junto a los dinosaurios.', 20),
    C()], [
    { dato: 'Mordida de ≈ 16.400 newtons en el cocodrilo marino; ≈ 900 N en humanos', fuente: 'Erickson et al. (2012), PLoS ONE' },
    { dato: 'La lengua está unida al paladar por una membrana', fuente: 'San Diego Zoo, «Crocodile»' }]],
  ['caracol-dientes', 'curiosidad', 'Un caracol con 14.000 dientes', ['caracol', 'dientes'], [
    P('Un caracol de jardín puede tener miles de dientes.', '🐌'),
    PI('Se calcula que tiene hasta unos 14.000 dientes diminutos.', '🦷', 140, { desde: 0, hasta: 14000, unidad: 'dientes' }),
    F('No están en la boca como los nuestros, sino en una lengua rasposa llamada rádula.', '👅'),
    F('La usa como una lima para raspar hojas y otros alimentos.', '🥬'),
    CAL('Y cuando hace mucho calor o se seca todo, algunos caracoles duermen por meses, y hasta años.', { desde: 0, hasta: 3, unidad: 'años' }),
    C()], [
    { dato: 'La rádula de algunos caracoles tiene miles de dientes (hasta ≈ 14.000)', fuente: 'Encyclopaedia Britannica, «Radula»; Smithsonian' },
    { dato: 'Estivación o hibernación prolongada, en casos de hasta ≈ 3 años', fuente: 'Natural History Museum (Londres)' }],
    'El número de dientes varía según la especie y el estudio.'],
  ['tortuga-jonathan', 'historia', 'Jonathan, la tortuga de 190 años', ['Jonathan', 'tortuga'], [
    P('Jonathan, una tortuga gigante, tiene casi 200 años.', '🐢'),
    LI('Nació hacia 1832 y llegó a la isla de Santa Elena en 1882.', [H(1832, 'Nace Jonathan', { etiqueta_anio: '≈ 1832', objeto: '🐢' }), H(1882, 'Llega a Santa Elena'), H(2022, 'Cumple 190 años')]),
    F('Es el animal terrestre más viejo que se conoce.', '🏝️'),
    G('Ha vivido más que cualquier persona y ha visto pasar más de seis reyes y reinas del Reino Unido.', 20),
    F('Sigue comiendo hierba y zanahorias, aunque ya no ve y ha perdido el olfato.', '🥕'),
    C()], [
    { dato: 'Jonathan, tortuga gigante de las Seychelles, nacida hacia 1832', fuente: 'Guinness World Records, «Oldest chelonian»' },
    { dato: 'Vive en Santa Elena desde 1882', fuente: 'Gobierno de Santa Elena' }],
    'La fecha de nacimiento es una estimación.'],
  ['pinguino-rodillas', 'curiosidad', 'Los pingüinos sí tienen rodillas', ['pingüinos', 'rodillas'], [
    P('Los pingüinos tienen rodillas, pero las llevan escondidas.', '🐧'),
    F('Sus piernas son largas, pero quedan dentro del cuerpo, cubiertas por plumas.', '🦵'),
    PI('Por eso caminan balanceándose y, para abrigarse, se amontonan por miles.', '🐧', 90),
    F('El pingüino emperador puede bucear a más de 500 metros de profundidad.', '🌊'),
    G('Y puede aguantar la respiración por más de veinte minutos.', 18),
    C()], [
    { dato: 'Rodillas y fémur dentro del cuerpo', fuente: 'Smithsonian National Zoo, «Penguins»' },
    { dato: 'Emperador: hasta ≈ 564 m de profundidad y > 20 minutos de inmersión', fuente: 'Wienecke et al. (2007); Ponganis (2015)' }]],
  ['cacahuate-legumbre', 'curiosidad', 'El cacahuate no es una nuez', ['cacahuate', 'legumbre'], [
    P('El cacahuate no es una nuez: es una legumbre.', '🥜'),
    F('Es pariente de los frijoles y las lentejas, no de las almendras ni las nueces.', '🫘'),
    F('Además, crece bajo la tierra: la flor se dobla y entierra su fruto.', '🌱'),
    LL('Cada planta produce decenas de vainas, y cada vaina trae dos o tres semillas.', '🥜', 110),
    G('Es una de las alergias alimentarias más comunes, así que siempre hay que leer las etiquetas.', 20),
    C()], [
    { dato: 'El cacahuate (Arachis hypogaea) es una leguminosa; sus frutos maduran bajo tierra', fuente: 'Encyclopaedia Britannica, «Peanut»' },
    { dato: 'Alergia al cacahuate: una de las más comunes', fuente: 'Food Allergy Research & Education (FARE)' }]],
  ['tomate-fruta', 'historia', 'El tomate que fue a juicio', ['tomate', 'juicio'], [
    P('El tomate es una fruta, pero una corte dijo que es verdura.', '🍅'),
    F('Para la botánica es una fruta, porque nace de la flor y guarda semillas.', '🌼'),
    LI('Pero en 1893 la Corte Suprema de Estados Unidos decidió otra cosa, por una cuestión de impuestos.', [H(1887, 'Se cobran aranceles a las verduras', { objeto: '🍅' }), H(1893, 'La Corte decide: es verdura')]),
    F('El argumento fue que se come en la cena, con el plato principal, y no de postre.', '🍽️'),
    G('Las dos cosas son ciertas: botánicamente es fruta, y en la cocina se usa como verdura.', 22),
    C()], [
    { dato: 'Nix contra Hedden (1893): la Corte Suprema de EE. UU. lo clasificó como verdura para efectos de aranceles', fuente: 'Corte Suprema de EE. UU., Nix v. Hedden, 149 U.S. 304 (1893)' }]],
  ['zanahoria-morada', 'historia', 'Las zanahorias eran moradas', ['zanahorias', 'moradas'], [
    P('Las primeras zanahorias que se cultivaron no eran naranjas.', '🥕'),
    F('Se domesticaron hace más de mil años en Asia Central, y eran moradas y amarillas.', '🟣'),
    LI('Las naranjas se volvieron comunes mucho después.', [H(900, 'Zanahorias moradas y amarillas', { etiqueta_anio: '≈ siglo X', objeto: '🥕' }), H(1600, 'Aparecen las naranjas', { etiqueta_anio: '≈ siglo XVI-XVII' })]),
    F('El color morado viene de unos pigmentos, las antocianinas, que también tienen los arándanos.', '🫐'),
    LL('Hoy se venden zanahorias moradas, blancas, rojas y amarillas en muchos mercados.', '🥕', 90),
    C()], [
    { dato: 'Zanahorias domesticadas en Asia Central (≈ siglo X), moradas y amarillas', fuente: 'Banga (1957); Iorizzo et al. (2016), BMC Genomics' },
    { dato: 'El color morado viene de antocianinas', fuente: 'Encyclopaedia Britannica, «Carrot»' }],
    'La fecha de las primeras naranjas es aproximada y se discute.'],
  ['chile-picante', 'ciencia', 'Las aves no sienten el picante', ['picante', 'aves'], [
    P('Las aves comen chile sin sentir que pica.', '🌶️'),
    F('Lo que nos arde, la capsaicina, es una defensa de la planta contra los mamíferos.', '🔥'),
    F('Las aves no la sienten, y así llevan las semillas lejos sin dañarlas.', '🐦'),
    CO('El picante se mide en unidades Scoville: de un jalapeño al chile más picante del mundo.', [B('Jalapeño', 8, 'hasta 8.000', '🫑'), B('Habanero', 350, '≈ 350.000', '🌶️'), B('Pepper X', 2693, '2,69 millones', '🔥')]),
    F('Lo que sientes no es un sabor: es una señal de dolor que le manda tu boca al cerebro.', '🧠'),
    C()], [
    { dato: 'Las aves son insensibles a la capsaicina y dispersan las semillas', fuente: 'Tewksbury y Nabhan (2001), Nature' },
    { dato: 'Pepper X: 2.693.000 unidades Scoville (récord 2023)', fuente: 'Guinness World Records, «Hottest chili pepper»' }]],
  ['husos-horarios', 'datos', 'El país con más husos horarios', ['husos', 'horarios'], [
    P('El país con más husos horarios no es Rusia.', '🕐'),
    CO('Francia tiene 12 por sus territorios en todo el mundo; Rusia, 11; y Estados Unidos, 11.', [B('Francia', 12, '12', '🇫🇷'), B('Rusia', 11, '11', '🇷🇺'), B('EE. UU.', 11, '11', '🇺🇸')]),
    GL('Un huso horario es una franja de la Tierra donde se usa la misma hora oficial.'),
    F('En cambio China, tan grande como Estados Unidos, usa una sola hora para todo el país.', '🇨🇳'),
    C()], [
    { dato: 'Francia: 12 husos con sus territorios de ultramar (13 con la Antártida); Rusia: 11; EE. UU.: 11', fuente: 'Encyclopaedia Britannica, «Time zone»; Time and Date' },
    { dato: 'China usa una sola hora oficial (UTC+8)', fuente: 'Encyclopaedia Britannica' }],
    'El número cambia según se cuenten los territorios de ultramar y la Antártida.'],
  ['vaticano-pequeno', 'datos', 'El país más pequeño del mundo', ['Vaticano', 'país'], [
    P('El Vaticano es el país más pequeño del mundo.', '🇻🇦'),
    CO('Mide unos 0,44 kilómetros cuadrados: cabe varias veces en Central Park.', [B('Vaticano', 0.44, '0,44 km²', '🇻🇦'), B('Mónaco', 2, '2,02 km²', '🇲🇨'), B('Central Park', 3.4, '3,4 km²', '🌳')]),
    G('Tiene menos de mil habitantes.', 14),
    F('Aun así tiene su propia estación de tren, su emisora de radio y su oficina de correos.', '🚂'),
    C()], [
    { dato: 'Superficie ≈ 0,44 km²; menos de 1.000 habitantes', fuente: 'CIA World Factbook, «Holy See (Vatican City)»' },
    { dato: 'Central Park: ≈ 3,41 km² (843 acres)', fuente: 'Central Park Conservancy' }]],
  ['sahara-verde', 'historia', 'El Sahara fue verde', ['Sahara', 'verde'], [
    P('Hace unos 6.000 años el Sahara era verde.', '🏜️'),
    LI('Durante miles de años el norte de África tuvo lagos, ríos y animales de sabana.', [H(-12000, 'Sahara húmedo', { etiqueta_anio: 'Hace 12.000 años', objeto: '🌿' }), H(-5000, 'Empieza a secarse', { etiqueta_anio: 'Hace 5.000 años' }), H(-3000, 'Desierto', { etiqueta_anio: 'Hace 3.000 años', objeto: '🏜️' })]),
    F('Hay pinturas en las rocas del Sahara con jirafas, hipopótamos y gente nadando.', '🦒'),
    F('Cambió por pequeños movimientos de la inclinación de la Tierra, que alteraron las lluvias.', '🌍'),
    C()], [
    { dato: 'El «Sahara verde» o Periodo Húmedo Africano, hace ≈ 14.500-5.000 años', fuente: 'NASA Earth Observatory, «The Green Sahara»; deMenocal et al. (2000), Quaternary Science Reviews' }],
    'Las fechas del cambio varían por región.'],
  ['antartida-hielo', 'ciencia', 'El 70 % del agua dulce es hielo', ['hielo', 'agua'], [
    P('Casi el 70 % del agua dulce del planeta está congelada.', '🧊'),
    GL('La mayor parte está en la Antártida, el continente más frío, más seco y más ventoso.'),
    CO('Del agua dulce del mundo, la mayoría es hielo y apenas una pequeña parte está en ríos y lagos.', [B('Congelada', 69, '≈ 69 %', '🧊'), B('Subterránea', 30, '≈ 30 %', '💧'), B('Ríos y lagos', 1, '≈ 1 %', '🏞️')]),
    F('El hielo de la Antártida llega a medir casi cinco kilómetros de grosor.', '🏔️'),
    F('Si se derritiera todo, el nivel del mar subiría decenas de metros.', '🌊'),
    C()], [
    { dato: '≈ 69 % del agua dulce está en glaciares y casquetes de hielo', fuente: 'USGS Water Science School, «Where is Earth’s water?»' },
    { dato: 'Hielo antártico de hasta ≈ 4.800 m; subida del nivel del mar de decenas de metros', fuente: 'NASA, «Antarctic ice sheet»' }],
    'Los porcentajes cambian un poco entre estudios; lo importante es el orden de magnitud.']
];

let n = 0;
for (const [id, categoria, titulo, destacar, escenas, fuentes, nota] of EP) {
  n++;
  const g = { id: `d2-${id}`, motor: '2d', episodio: n, titulo, categoria, destacar, escenas: variarEscenas(escenas), fuentes, ...(nota ? { nota } : {}) };
  fs.writeFileSync(path.join(DIR_COLA, `4${String(n).padStart(2, '0')}-2d-${id}.json`), JSON.stringify(g, null, 2) + '\n');
}
console.log(`${n} guiones 2D escritos en ${DIR_COLA}`);
