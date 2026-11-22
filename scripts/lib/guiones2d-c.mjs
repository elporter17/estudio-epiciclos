// Tercera tanda de guiones del motor 2D (SIN IA): 30 más en video3d/guiones/cola/8NN-2d-id.json con «motor: 2d». Temas nuevos:
// inventos, ciencia cotidiana, animales y geografía que no están en ninguna otra tanda. Objetos = emojis escritos directo.
//   node scripts/lib/guiones2d-c.mjs
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
const B = (etiqueta, valor, texto, objeto) => ({ etiqueta, valor, texto, ...(objeto ? { objeto } : {}) });
const H = (anio, texto, extra = {}) => ({ anio, texto, ...extra });

// [id, categoría, título (≤ 32 caracteres), palabras clave, escenas, fuentes, nota?]
const EP = [
  ['reloj-atomico', 'ciencia', 'Un reloj que casi no se atrasa', ['reloj', 'atómico'], [
    P('Los mejores relojes atómicos casi no se atrasan en cientos de millones de años.', '⏱️'),
    F('Un reloj atómico mide el tiempo con las vibraciones de los átomos, que son siempre iguales.', '⚛️'),
    CO('El reloj atómico del NIST, en Estados Unidos, se atrasaría solo un segundo cada 300 millones de años.', [B('Reloj atómico NIST-F2', 300, '1 s en 300 M años', '⏱️'), B('Reloj de cuarzo', 0.00003, '1 s en 30.000 años', '⌚')]),
    F('Desde 1967, el segundo se define con los átomos de cesio y no con el giro de la Tierra.', '🌍'),
    G('Gracias a ellos funcionan el GPS, los bancos y la hora de tu celular.', 22),
    C()], [
    { dato: 'NIST-F2: se atrasaría 1 s en ≈ 300 millones de años; el segundo se define desde 1967 con el cesio-133', fuente: 'NIST, «NIST-F2 Cesium Fountain Atomic Clock»; BIPM' }],
    'Los relojes ópticos más nuevos son todavía más precisos.'],
  ['cero-maya', 'historia', 'Los mayas y el cero', ['mayas', 'cero'], [
    P('Los mayas usaban el cero hace más de mil quinientos años.', '0️⃣'),
    F('Inventaron un símbolo, parecido a una concha, para marcar el lugar vacío en sus números.', '🐚'),
    F('Contaban en base 20 y combinaban puntos y rayas: un punto valía uno y una raya, cinco.', '🔢'),
    LI('El cero apareció en varios lugares del mundo por separado.', [H(-300, 'Babilonia usa un signo de lugar vacío', { etiqueta_anio: '≈ siglo IV a. C.', objeto: '0️⃣' }), H(350, 'Los mayas usan un cero en su calendario', { etiqueta_anio: '≈ siglo IV d. C.' }), H(628, 'India lo trata como un número', { etiqueta_anio: '628 d. C.' })]),
    G('Con ese sistema registraban fechas que alcanzaban millones de años.', 22),
    C()], [
    { dato: 'Los mayas usaban un signo para el cero en su sistema vigesimal, en inscripciones de hace más de 1.500 años', fuente: 'Smithsonian National Museum of the American Indian y Encyclopaedia Britannica, «Maya numerals»' }],
    'La fecha de la primera aparición del cero maya se discute.'],
  ['papel-cai-lun', 'historia', 'El papel nació en China', ['papel', 'China'], [
    P('El papel se inventó en China, según la tradición, en el año 105.', '📜'),
    F('Un funcionario de la corte, Cai Lun, presentó un papel hecho con corteza, trapos y redes de pescar.', '🎣'),
    LI('Antes se escribía en seda, bambú, piedra y pergamino, que eran pesados o muy caros.', [H(105, 'Cai Lun presenta el papel', { objeto: '📜' }), H(751, 'El papel llega al mundo árabe'), H(1150, 'Llega a Europa')]),
    F('Con el tiempo, el papel hizo posible la imprenta y la difusión de los libros.', '📚'),
    G('Hoy se producen más de 400 millones de toneladas de papel y cartón al año.', 24),
    C()], [
    { dato: 'Cai Lun presentó el papel al emperador en el año 105; llegó a Europa ≈ siglo XII', fuente: 'Encyclopaedia Britannica, «Paper»; Biblioteca Británica' },
    { dato: 'Producción mundial de papel y cartón ≈ 400 millones de toneladas al año', fuente: 'FAO, FAOSTAT (productos forestales)' }],
    'Hay hallazgos de papel más antiguos que Cai Lun, así que su fecha es la tradicional.'],
  ['gutenberg-imprenta', 'historia', 'La imprenta y 180 Biblias', ['imprenta', 'Gutenberg'], [
    P('Gutenberg imprimió la primera Biblia con tipos móviles hacia 1455.', '📖'),
    F('Su idea fue usar letras de metal que se podían reordenar y reutilizar.', '🔠'),
    PI('Se cree que imprimió unas 180 copias de su Biblia, y hoy sobreviven menos de cincuenta.', '📖', 120, { desde: 0, hasta: 180, unidad: 'copias' }),
    LI('En pocas décadas, la imprenta se extendió por toda Europa.', [H(1455, 'Biblia de Gutenberg', { objeto: '📖' }), H(1500, 'Más de 1.000 imprentas en Europa')]),
    G('Los libros se volvieron mucho más baratos, y las ideas viajaron más rápido.', 24),
    C()], [
    { dato: 'La Biblia de Gutenberg (≈ 1455): ≈ 180 copias, ≈ 49 sobreviven', fuente: 'Biblioteca Británica y Biblioteca del Congreso de EE. UU., «Gutenberg Bible»' }],
    'El número exacto de copias es una estimación.'],
  ['penicilina-moho', 'historia', 'La penicilina y un descuido', ['penicilina', 'moho'], [
    P('La penicilina se descubrió por un descuido en un laboratorio.', '🧫'),
    F('En 1928, Alexander Fleming volvió de vacaciones y vio que un moho había matado las bacterias de uno de sus cultivos.', '🧫'),
    F('Ese moho producía una sustancia que mata bacterias: la penicilina.', '🍄'),
    LI('Pasaron más de diez años antes de convertirla en medicina.', [H(1928, 'Fleming descubre la penicilina', { objeto: '🧫' }), H(1941, 'Primer paciente tratado con penicilina'), H(1945, 'Nobel de Medicina')]),
    G('Salvó millones de vidas, sobre todo después de la Segunda Guerra Mundial.', 22),
    C()], [
    { dato: 'Fleming descubrió la penicilina en 1928; Florey y Chain la desarrollaron; Nobel de Medicina 1945', fuente: 'NobelPrize.org, «The Nobel Prize in Physiology or Medicine 1945»', url: 'https://www.nobelprize.org/prizes/medicine/1945/summary/' }]],
  ['rayos-x-curie', 'historia', 'La primera radiografía', ['radiografía', 'Röntgen'], [
    P('La primera radiografía fue de la mano de la esposa de su inventor.', '🩻'),
    F('Wilhelm Röntgen descubrió los rayos X en noviembre de 1895, mientras investigaba otra cosa.', '🔬'),
    F('Pocas semanas después, tomó la imagen de la mano de su esposa, donde se veían los huesos y su anillo.', '💍'),
    LI('El descubrimiento se difundió por el mundo en meses.', [H(1895, 'Röntgen descubre los rayos X', { objeto: '🩻' }), H(1896, 'Se usan para ver fracturas'), H(1901, 'Primer Nobel de Física')]),
    G('Hoy se usan para ver huesos, dientes y también el interior de las maletas.', 22),
    C()], [
    { dato: 'Descubrimiento de los rayos X (1895); primer Nobel de Física (1901) para Röntgen', fuente: 'NobelPrize.org, «Wilhelm Conrad Röntgen – Facts»', url: 'https://www.nobelprize.org/prizes/physics/1901/rontgen/facts/' }]],
  ['leeuwenhoek-microbios', 'historia', 'El primero en ver bacterias', ['Leeuwenhoek', 'bacterias'], [
    P('Un comerciante de telas fue la primera persona en ver bacterias.', '🔬'),
    F('Antonie van Leeuwenhoek, en Holanda, pulía lentes pequeñísimas para ver mejor la tela.', '🧵'),
    F('Sus lentes ampliaban hasta unas 270 veces, mucho más que los microscopios de la época.', '🔍'),
    LI('Con ellas descubrió un mundo que nadie había visto.', [H(1674, 'Describe organismos diminutos en agua de lago', { objeto: '🔬' }), H(1676, 'Observa bacterias'), H(1683, 'Dibuja las bacterias de la boca')]),
    G('Los llamó «animalículos», y hoy sabemos que son microbios.', 22),
    C()], [
    { dato: 'Leeuwenhoek observó microorganismos con lentes de hasta ≈ 270 aumentos (1670-1680)', fuente: 'Museo Boerhaave y Encyclopaedia Britannica, «Antonie van Leeuwenhoek»' }]],
  ['primer-telefono', 'historia', 'La primera llamada de teléfono', ['teléfono', 'Bell'], [
    P('La primera llamada de teléfono fue una petición de ayuda.', '☎️'),
    F('Fue el 10 de marzo de 1876, y la hizo Alexander Graham Bell a su ayudante.', '☎️'),
    F('Según su cuaderno, le dijo: «Señor Watson, venga aquí, quiero verlo».', '🗣️'),
    LI('Bell había patentado el teléfono solo unas semanas antes.', [H(1876, 'Bell patenta el teléfono', { objeto: '☎️' }), H(1877, 'Nace la compañía Bell'), H(1927, 'Primera llamada transatlántica')]),
    G('Hoy hay más celulares que personas en el planeta.', 22),
    C()], [
    { dato: 'Primera llamada: 10 de marzo de 1876; patente de Bell: 7 de marzo de 1876', fuente: 'Biblioteca del Congreso de EE. UU., «Alexander Graham Bell Family Papers»' }]],
  ['arcoiris-siete', 'ciencia', 'El arcoíris y sus siete colores', ['arcoíris', 'siete'], [
    P('El arcoíris no tiene siete colores: tiene infinitos.', '🌈'),
    F('La luz blanca se separa en una banda continua, donde cada color se mezcla con el siguiente.', '🌈'),
    F('El número siete lo escogió Isaac Newton, quizá porque eran siete las notas musicales.', '🎵'),
    LI('Antes de él, se hablaba de menos colores.', [H(1666, 'Newton separa la luz con un prisma', { objeto: '🌈' }), H(1704, 'Publica su «Óptica» con siete colores')]),
    G('Cuántos colores ves en un arcoíris depende también de tu idioma y de tu cultura.', 22),
    C()], [
    { dato: 'El espectro es continuo; Newton propuso siete colores en su «Opticks» (1704)', fuente: 'Royal Society y Encyclopaedia Britannica, «Rainbow»' }]],
  ['cielo-azul', 'ciencia', 'Por qué el cielo es azul', ['cielo', 'azul'], [
    P('El cielo es azul porque el aire dispersa más la luz azul.', '🌤️'),
    F('La luz del Sol parece blanca, pero lleva todos los colores mezclados.', '☀️'),
    F('Al chocar con las moléculas del aire, la luz azul se dispersa mucho más que la roja, y llega a tus ojos desde todas partes.', '🔵'),
    F('Por eso los atardeceres son rojizos: la luz atraviesa más aire y el azul se dispersa por el camino.', '🌅'),
    G('En la Luna, sin aire, el cielo se ve negro aun de día.', 22),
    C()], [
    { dato: 'Dispersión de Rayleigh: la luz azul se dispersa mucho más que la roja en la atmósfera', fuente: 'NASA, «Why is the sky blue?»' }]],
  ['aluminio-oro', 'historia', 'El aluminio valió más que el oro', ['aluminio', 'oro'], [
    P('Hubo un tiempo en que el aluminio valía más que el oro.', '🥄'),
    F('Aunque hay mucho aluminio en la Tierra, estaba pegado a otros materiales, y separarlo era carísimo.', '🪨'),
    LI('En 1884 se coronó el Monumento a Washington con una pieza de aluminio, como un lujo.', [H(1884, 'Aluminio en el Monumento a Washington', { objeto: '🥄' }), H(1886, 'Un método barato lo abarata')]),
    F('Hoy se hacen latas, aviones y bicicletas con él, y es uno de los metales más reciclados.', '🥫'),
    G('Reciclar aluminio gasta alrededor de un 5 % de la energía de producirlo desde cero.', 24),
    C()], [
    { dato: 'En 1884 se colocó una punta de aluminio de ≈ 2,8 kg en el Monumento a Washington; en 1886 se inventó el proceso Hall-Héroult', fuente: 'Servicio de Parques Nacionales de EE. UU. y Encyclopaedia Britannica, «Aluminum»' },
    { dato: 'Reciclar aluminio ahorra ≈ 95 % de la energía', fuente: 'The Aluminum Association' }]],
  ['viruela-erradicada', 'historia', 'La enfermedad que se erradicó', ['viruela', 'vacuna'], [
    P('La viruela es la única enfermedad humana que se ha logrado erradicar.', '💉'),
    LI('Todo empezó con una observación y una vacuna.', [H(1796, 'Jenner prueba la primera vacuna', { objeto: '💉' }), H(1967, 'La OMS lanza una campaña mundial'), H(1980, 'Se declara erradicada')]),
    F('En 1980, la Organización Mundial de la Salud declaró que la viruela había desaparecido del mundo.', '🌍'),
    G('Antes mataba a millones de personas cada año.', 24),
    F('Hoy ya no hay casos, y solo se conservan muestras del virus en dos laboratorios.', '🧪'),
    C()], [
    { dato: 'Viruela erradicada: declaración de la OMS el 8 de mayo de 1980', fuente: 'Organización Mundial de la Salud (OMS), «Smallpox»' },
    { dato: 'Edward Jenner probó la primera vacuna en 1796', fuente: 'Encyclopaedia Britannica, «Edward Jenner»' }]],
  ['cuervo-herramientas', 'ciencia', 'El cuervo que hace herramientas', ['cuervo', 'herramientas'], [
    P('Algunos cuervos fabrican herramientas.', '🐦‍⬛'),
    F('Los cuervos de Nueva Caledonia doblan ramas y alambres para hacer ganchos y sacar insectos de los troncos.', '🪝'),
    F('Una cuerva llamada Betty, en un experimento en 2002, dobló un alambre recto para formar un gancho y alcanzar comida.', '🧪'),
    G('Los cuervos reconocen caras, resuelven rompecabezas y recuerdan a quien los trató mal.', 22),
    C()], [
    { dato: 'Cuervos de Nueva Caledonia fabrican herramientas; experimento con «Betty» (2002)', fuente: 'Weir, Chappell y Kacelnik (2002), Science, «Shaping of hooks in New Caledonian crows»' }]],
  ['aguila-vista', 'ciencia', 'La vista del águila', ['águila', 'vista'], [
    P('Un águila puede ver un conejo desde más de tres kilómetros.', '🦅'),
    F('Su vista es varias veces más aguda que la nuestra: ve detalles pequeños desde mucho más lejos.', '🔍'),
    CO('Ven mejor porque sus ojos son grandes y tienen muchas más células sensibles a la luz.', [B('Águila', 4, 'hasta 4 veces', '🦅'), B('Persona', 1, '1 vez', '🧍')]),
    F('Cada ojo es casi tan grande como el de una persona, aunque la cabeza es mucho más pequeña.', '👁️'),
    G('Cazan con la vista: ven la presa a gran distancia, y bajan en picada.', 22),
    C()], [
    { dato: 'La agudeza visual de algunas águilas es hasta ≈ 4 veces la humana', fuente: 'Reymond (1985), Vision Research; Audubon Society' }],
    'La ventaja depende de la especie y de cómo se mida.'],
  ['buho-cuello', 'ciencia', 'El búho gira el cuello 270°', ['búho', 'cuello'], [
    P('El búho puede girar la cabeza hasta unos 270 grados.', '🦉'),
    F('No puede mover los ojos, que están fijos en su cabeza, así que gira todo el cuello.', '👁️'),
    CO('Tiene 14 huesos en el cuello, el doble que una persona.', [B('Búho', 14, '14 vértebras', '🦉'), B('Persona', 7, '7 vértebras', '🧍')]),
    F('Además tiene vasos sanguíneos especiales que evitan que se corte el flujo de sangre al cerebro.', '🩸'),
    G('Así vigila en todas direcciones sin mover el cuerpo y sin hacer ruido.', 22),
    C()], [
    { dato: 'Los búhos giran el cuello ≈ 270°; tienen 14 vértebras cervicales y adaptaciones vasculares', fuente: 'Krings et al. (2017), Science; Smithsonian' }]],
  ['mosquito-hembras', 'ciencia', 'Solo las mosquitas pican', ['mosquitos', 'pican'], [
    P('Solo las hembras de los mosquitos pican.', '🦟'),
    F('Necesitan las proteínas de la sangre para producir sus huevos.', '🩸'),
    F('Los machos y las hembras, el resto del tiempo, se alimentan del néctar de las flores.', '🌸'),
    LL('Cada hembra puede poner cientos de huevos en un pequeño charco de agua.', '🥚', 100, { desde: 0, hasta: 300, unidad: 'huevos' }),
    G('Eliminar el agua estancada de macetas y llantas es la forma más sencilla de reducir los mosquitos.', 24),
    C()], [
    { dato: 'Solo las hembras se alimentan de sangre, para el desarrollo de los huevos', fuente: 'Organización Mundial de la Salud (OMS) y Centros para el Control de Enfermedades (CDC), «Mosquito life cycle»' }]],
  ['pulga-salto', 'ciencia', 'El salto de la pulga', ['pulga', 'salto'], [
    P('Una pulga puede saltar más de cien veces su tamaño.', '🪳'),
    F('Mide un par de milímetros, y puede saltar a más de 15 centímetros de altura.', '📏'),
    F('Lo logra con una proteína elástica, la resilina, que funciona como un resorte y suelta la energía de golpe.', '🧬'),
    CO('Si una persona saltara igual, llegaría a la altura de un edificio de 60 pisos.', [B('Pulga', 100, '≈ 100 veces su tamaño', '🪳'), B('Persona', 1, '≈ 1 vez', '🧍')]),
    G('Por eso es tan difícil atrapar a una.', 22),
    C()], [
    { dato: 'Las pulgas saltan ≈ 100 veces su longitud con ayuda de resilina', fuente: 'Sutton y Burrows (2011), Journal of Experimental Biology' }],
    'La proporción exacta depende de la especie.'],
  ['ciempies-patas', 'curiosidad', 'Ciempiés: nunca 100 patas', ['ciempiés', 'patas'], [
    P('Ningún ciempiés tiene exactamente cien patas.', '🐛'),
    F('Los ciempiés tienen un número impar de pares de patas, así que el total nunca es 100.', '🦶'),
    F('Hay especies con menos de treinta patas y otras con más de trescientas.', '🔢'),
    F('Los milpiés, que se parecen, tienen dos pares de patas por segmento y caminan más despacio.', '🐌'),
    G('El nombre es un poco exagerado, pero algunos tienen muchas más de cien.', 22),
    C()], [
    { dato: 'Los ciempiés (quilópodos) siempre tienen un número impar de pares de patas (de 15 a 191)', fuente: 'Museo de Historia Natural de Londres y Arkive' }]],
  ['tortuga-marina-regreso', 'ciencia', 'La tortuga regresa a su playa', ['tortuga', 'playa'], [
    P('Las tortugas marinas regresan a poner huevos a la playa donde nacieron.', '🐢'),
    F('Después de nacer, la tortuga recorre miles de kilómetros por el océano.', '🌊'),
    F('Cuando es adulta, vuelve a la misma zona, y hasta décadas después.', '📍'),
    F('Se orientan con el campo magnético de la Tierra y con el olor del agua.', '🧲'),
    G('Solo una de cada mil tortugas llega a adulta, por eso cuidar sus nidos es tan importante.', 24),
    C()], [
    { dato: 'Las tortugas marinas regresan a su playa natal; usan el campo magnético para navegar', fuente: 'Lohmann et al. (2008), Journal of Experimental Biology; NOAA Fisheries' },
    { dato: '≈ 1 de cada 1.000 tortugas llega a adulta (estimación)', fuente: 'NOAA Fisheries' }],
    'La proporción de supervivencia es una estimación que cambia entre especies.'],
  ['mono-aullador', 'ciencia', 'El mono más ruidoso de América', ['mono', 'aullador'], [
    P('El mono aullador se oye a varios kilómetros.', '🐒'),
    F('Su grito se escucha en la selva a unos cinco kilómetros de distancia.', '🔊'),
    F('Tiene un hueso en la garganta, el hioides, grande y hueco, que amplifica el sonido.', '🦴'),
    F('Vive en los bosques de Honduras, y grita al amanecer y antes de la lluvia.', '🌳'),
    G('Con esos gritos, cada grupo avisa a los vecinos que ese territorio ya está ocupado.', 22),
    C()], [
    { dato: 'El aullido del mono aullador se oye a ≈ 5 km; hioides agrandado', fuente: 'Smithsonian National Zoo, «Howler monkey»; Encyclopaedia Britannica' },
    { dato: 'El mono aullador de manto (Alouatta palliata) habita en Honduras', fuente: 'Instituto de Conservación Forestal (ICF), Honduras' }]],
  ['islandia-sin-mosquitos', 'curiosidad', 'Islandia no tiene mosquitos', ['Islandia', 'mosquitos'], [
    P('Islandia es uno de los pocos lugares del mundo sin mosquitos.', '🇮🇸'),
    F('Allí no viven mosquitos de forma estable, aunque sí hay moscas y otros insectos.', '🦟'),
    F('Una posible razón es el clima: los cambios bruscos entre helada y deshielo les cuesta mucho.', '🥶'),
    G('La Antártida tampoco los tiene, y casi todo el resto del planeta sí.', 22),
    C()], [
    { dato: 'Islandia no tiene mosquitos residentes', fuente: 'Instituto Islandés de Historia Natural y Encyclopaedia Britannica, «Iceland»' }],
    'Se han encontrado mosquitos aislados que llegaron por barcos o aviones.'],
  ['baikal-agua', 'datos', 'El lago más profundo del mundo', ['Baikal', 'lago'], [
    P('El lago Baikal guarda el 20 % del agua dulce líquida del mundo.', '🏞️'),
    F('Está en Siberia y es el lago más profundo de la Tierra: unos 1.640 metros.', '🌊'),
    CO('Tiene más agua que todos los Grandes Lagos de Norteamérica juntos.', [B('Baikal', 23600, '≈ 23.600 km³', '🏞️'), B('Grandes Lagos', 22700, '≈ 22.700 km³')]),
    F('Es también uno de los más antiguos: se calcula que tiene unos 25 millones de años.', '⏳'),
    G('Su agua es tan transparente que, en invierno, se puede ver el fondo a través del hielo.', 24),
    C()], [
    { dato: 'Baikal: ≈ 1.642 m de profundidad, ≈ 20 % del agua dulce líquida superficial, ≈ 25 millones de años', fuente: 'UNESCO, «Lake Baikal»', url: 'https://whc.unesco.org/en/list/754' }]],
  ['australia-luna', 'datos', 'Australia más ancha que la Luna', ['Australia', 'Luna'], [
    P('Australia es más ancha que la Luna.', '🇦🇺'),
    CO('De este a oeste, Australia mide unos 4.000 kilómetros; la Luna, unos 3.474 de diámetro.', [B('Australia', 4000, '≈ 4.000 km', '🇦🇺'), B('La Luna', 3474, '3.474 km', '🌙')]),
    F('Es un continente casi tan grande como Estados Unidos sin Alaska.', '🌏'),
    G('Aun así, vive allí una población parecida a la de Honduras y Guatemala juntas.', 22),
    C()], [
    { dato: 'Ancho de Australia ≈ 4.000 km; diámetro de la Luna ≈ 3.474 km', fuente: 'Geoscience Australia y NASA, «Moon Fact Sheet»' }],
    'La comparación de población es aproximada; conviene revisarla antes de usarla.'],
  ['atacama-seco', 'datos', 'El desierto sin lluvia', ['Atacama', 'lluvia'], [
    P('El desierto de Atacama es uno de los lugares más secos del mundo.', '🏜️'),
    F('En algunas zonas puede pasar años sin una sola gota de lluvia.', '☀️'),
    CO('En el pueblo de Arica llueven apenas 0,5 milímetros al año.', [B('Arica (Atacama)', 0.5, '≈ 0,5 mm/año', '🏜️'), B('San Pedro Sula', 1400, '≈ 1.400 mm/año', '🌧️')]),
    F('Es tan árido que los científicos lo usan para probar equipos de la NASA para Marte.', '🚀'),
    G('Y como casi no hay nubes, tiene uno de los cielos más claros para ver estrellas.', 22),
    C()], [
    { dato: 'Arica promedia ≈ 0,5 mm de lluvia al año; Atacama es el desierto no polar más seco', fuente: 'Servicio Meteorológico de Chile y NASA (Atacama como análogo de Marte)' },
    { dato: 'San Pedro Sula: ≈ 1.400 mm de lluvia al año', fuente: 'Servicio Meteorológico Nacional de Honduras (promedio histórico)' }],
    'La cifra de San Pedro Sula es un promedio aproximado.'],
  ['venecia-islas', 'datos', 'Venecia, una ciudad de islas', ['Venecia', 'islas'], [
    P('Venecia está construida sobre más de cien islas.', '🛶'),
    CU('Son unas 118 islitas unidas por unos 400 puentes y separadas por canales.', '🌉', 10),
    F('La ciudad se levantó sobre troncos clavados en el fondo de una laguna.', '🪵'),
    G('Cada año, la crecida del agua, llamada «acqua alta», inunda sus calles.', 22),
    C()], [
    { dato: 'Venecia: ≈ 118 islas y ≈ 400 puentes', fuente: 'UNESCO, «Venice and its Lagoon»', url: 'https://whc.unesco.org/en/list/394' }]],
  ['mercator-groenlandia', 'datos', 'Groenlandia no es tan grande', ['Groenlandia', 'mapa'], [
    P('En muchos mapas, Groenlandia parece tan grande como África. Pero es 14 veces más pequeña.', '🗺️'),
    CO('África tiene unos 30 millones de kilómetros cuadrados; Groenlandia, unos 2.', [B('África', 30.4, '≈ 30,4 M km²', '🌍'), B('Groenlandia', 2.2, '≈ 2,2 M km²', '🧊')]),
    F('El mapa más usado, llamado Mercator, estira las zonas cercanas a los polos.', '🗺️'),
    F('Se hizo en 1569 para ayudar a los marinos a navegar con rumbo recto, no para comparar tamaños.', '⛵'),
    G('Hoy hay mapas que respetan mejor las áreas, y otros que muestran el mundo con su verdadera proporción.', 22),
    C()], [
    { dato: 'África ≈ 30,4 M km²; Groenlandia ≈ 2,17 M km²; proyección de Mercator, 1569', fuente: 'Encyclopaedia Britannica, «Mercator projection»; CIA World Factbook' }]],
  ['punto-nemo', 'datos', 'El punto más lejos de la tierra', ['Nemo', 'océano'], [
    P('El lugar más lejos de cualquier tierra firme se llama Punto Nemo.', '🌊'),
    F('Está en el Pacífico Sur, y la tierra más cercana queda a unos 2.700 kilómetros.', '📍'),
    CO('Cuando la Estación Espacial pasa por encima, los astronautas están más cerca que cualquier persona en tierra.', [B('Tierra más cercana', 2700, '≈ 2.700 km', '🏝️'), B('Estación Espacial', 400, '≈ 400 km', '🛰️')]),
    F('Allí van a parar los restos de satélites y naves que ya no se usan.', '🗑️'),
    G('Se le puso el nombre del capitán Nemo, de las novelas de Julio Verne.', 22),
    C()], [
    { dato: 'Punto Nemo: ≈ 2.688 km de la tierra más cercana; cementerio de naves espaciales', fuente: 'NOAA y Agencia Espacial Europea (ESA), «Point Nemo»' }]],
  ['alveolos-pulmones', 'ciencia', 'Tus pulmones tienen 480 millones', ['pulmones', 'alvéolos'], [
    P('Tus pulmones tienen cerca de 480 millones de bolsitas de aire.', '🫁'),
    PI('Se llaman alvéolos, y es donde el oxígeno pasa a tu sangre.', '🫧', 140, { desde: 0, hasta: 480, unidad: 'millones' }),
    F('Si los estiraras, tendrían una superficie de unos 70 metros cuadrados, más que un departamento pequeño.', '📐'),
    G('Respiras unas 20.000 veces al día, sin pensar en ello.', 22),
    C()], [
    { dato: '≈ 480 millones de alvéolos y ≈ 70 m² de superficie', fuente: 'Ochs et al. (2004), The Anatomical Record; American Lung Association' }],
    'El número de alvéolos varía entre personas.'],
  ['estribo-hueso', 'ciencia', 'El hueso más pequeño del cuerpo', ['estribo', 'hueso'], [
    P('El hueso más pequeño del cuerpo está dentro de tu oído.', '👂'),
    F('Se llama estribo, mide unos tres milímetros, y pesa cerca de dos o tres miligramos.', '🦴'),
    F('Junto con el martillo y el yunque, pasa las vibraciones del sonido al oído interno.', '🔔'),
    CO('El hueso más largo, el fémur, mide unos 45 centímetros: casi 150 veces más.', [B('Fémur', 450, '≈ 450 mm', '🦴'), B('Estribo', 3, '≈ 3 mm', '👂')]),
    G('Tienes tres huesecillos en cada oído, y están completamente formados desde antes de nacer.', 22),
    C()], [
    { dato: 'El estribo mide ≈ 3 mm y pesa ≈ 2-4 mg; es el hueso más pequeño del cuerpo humano', fuente: 'Encyclopaedia Britannica, «Stapes» y Cleveland Clinic' }]],
  ['esmalte-dureza', 'ciencia', 'Lo más duro de tu cuerpo', ['esmalte', 'dientes'], [
    P('La parte más dura de tu cuerpo es el esmalte de tus dientes.', '🦷'),
    F('Es casi todo mineral, un 96 %, y es más duro que los huesos.', '🪨'),
    F('Pero no se repara solo: si se desgasta o se pica, el cuerpo no fabrica esmalte nuevo.', '🚫'),
    F('Por eso cuidarlo con cepillado, flúor y menos azúcar es tan importante.', '🪥'),
    G('El esmalte protege la parte blanda de adentro, donde están los nervios.', 22),
    C()], [
    { dato: 'El esmalte dental es la sustancia más dura del cuerpo humano, ≈ 96 % mineral', fuente: 'American Dental Association y Encyclopaedia Britannica, «Tooth enamel»' }]]
];

let n = 0;
for (const [id, categoria, titulo, destacar, escenas, fuentes, nota] of EP) {
  n++;
  const g = { id: `d2c-${id}`, motor: '2d', episodio: 60 + n, titulo, categoria, destacar, escenas: variarEscenas(escenas), fuentes, ...(nota ? { nota } : {}) };
  fs.writeFileSync(path.join(DIR_COLA, `8${String(n).padStart(2, '0')}-2d-${id}.json`), JSON.stringify(g, null, 2) + '\n');
}
console.log(`${n} guiones 2D (tanda 3) escritos en ${DIR_COLA}`);
