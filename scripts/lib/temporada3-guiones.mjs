// Genera los 30 guiones 3D de la Temporada 3 en video3d/guiones/cola/5NN-id.json: 10 de Honduras (los que van primero a Facebook),
// 12 mitos y 8 de escala. Temas que NO están en las temporadas 1 y 2 ni en los 2D. Mismo formato y fuentes que la Temporada 2.
//   node scripts/lib/temporada3-guiones.mjs
import fs from 'node:fs';
import path from 'node:path';
import { DIR_COLA } from './video3d-cola.mjs';
import { variarEscenas } from './variar-escenas.mjs';

const P = (texto, objeto) => ({ tipo: 'portada', texto, objeto });
const C = (objeto) => ({ tipo: 'cierre', texto: '¿Lo sabías? Cuéntanos en los comentarios y síguenos para uno nuevo cada día.', objeto });
const F = (texto, objeto, cantidad = 1) => ({ tipo: 'foco', texto, objeto, cantidad });
const G = (texto, cantidad = 24, contador) => ({ tipo: 'gente', texto, cantidad, ...(contador ? { contador } : {}) });
const GL = (texto) => ({ tipo: 'globo', texto, modo: 'luces' });
const PI = (texto, objeto, cantidad = 200, contador) => ({ tipo: 'pila', texto, objeto, cantidad, ...(contador ? { contador } : {}) });
const LL = (texto, objeto, cantidad = 140, contador) => ({ tipo: 'lluvia', texto, objeto, cantidad, ...(contador ? { contador } : {}) });
const CU = (texto, objeto, lado = 18) => ({ tipo: 'cuadricula', texto, objeto, lado });
const CO = (texto, barras) => ({ tipo: 'comparacion', texto, barras });
const LI = (texto, hitos) => ({ tipo: 'linea', texto, hitos });
const B = (etiqueta, valor, texto, objeto) => ({ etiqueta, valor, texto, ...(objeto ? { objeto } : {}) });
const H = (anio, texto, extra = {}) => ({ anio, texto, ...extra });

// [id, categoría, título (≤ 32 caracteres), palabras clave, escenas, fuentes, nota?]
const EP = [
  // ---------- Honduras (10) ----------
  ['bandera-h', 'honduras', 'La bandera y sus cinco estrellas', ['bandera', 'estrellas'], [
    P('La bandera de Honduras tiene cinco estrellas por una razón.', 'naturaleza/sign'),
    F('Representan a los cinco países de la antigua Federación Centroamericana: Guatemala, El Salvador, Honduras, Nicaragua y Costa Rica.', 'naturaleza/sign'),
    LI('Sus franjas azules y blancas vienen de esa unión.', [H(1823, 'Nacen las Provincias Unidas de Centroamérica', { objeto: 'naturaleza/sign' }), H(1866, 'Honduras adopta su bandera')]),
    G('Según la tradición, el azul recuerda a los dos océanos y al cielo, y el blanco, a la paz.', 24),
    F('Honduras es de los pocos países con costa en el mar Caribe y en el océano Pacífico.', 'naturaleza/tree_palm'),
    C('naturaleza/sign')], [
    { dato: 'Las cinco estrellas simbolizan a los países de la Federación Centroamericana; la bandera actual se adoptó en 1866', fuente: 'Encyclopaedia Britannica, «Flag of Honduras»' },
    { dato: 'Significado tradicional de los colores', fuente: 'Secretaría de Cultura, Artes y Deportes de Honduras' }],
    'El significado de los colores es tradicional y varía un poco según la fuente.'],
  ['lempira-nombre', 'honduras', 'Lempira, el nombre de tu dinero', ['Lempira', 'dinero'], [
    P('El dinero de Honduras lleva el nombre de un guerrero.', 'moneda'),
    F('Lempira fue un líder lenca que organizó la resistencia contra los españoles en la década de 1530.', 'moneda'),
    F('Según la tradición, su nombre significa «señor de la sierra».', 'naturaleza/tree_pineTallA'),
    G('Hoy su nombre está en la moneda del país, en un departamento y en incontables calles y escuelas.', 24),
    PI('Y cada vez que pagas, lo recuerdas.', 'moneda', 180),
    C('moneda')], [
    { dato: 'Lempira, líder lenca de la resistencia contra la conquista española (década de 1530)', fuente: 'Encyclopaedia Britannica, «Lempira»' },
    { dato: 'La moneda nacional se llama lempira', fuente: 'Banco Central de Honduras' }],
    'El significado del nombre «Lempira» se transmite por tradición y se discute.'],
  ['tegucigalpa-capital', 'honduras', 'Tegucigalpa, capital desde 1880', ['Tegucigalpa', '1880'], [
    P('Tegucigalpa no siempre fue la capital de Honduras.', 'ciudad/building-type-a'),
    LI('Su historia empieza en una mina de plata.', [H(1578, 'Se funda el real de minas', { objeto: 'ciudad/building-type-a' }), H(1880, 'Pasa a ser la capital'), H(1937, 'Se une con Comayagüela')]),
    F('Antes de 1880, la capital era Comayagua.', 'ciudad/building-type-c'),
    F('Según una explicación, su nombre viene del náhuatl y significa «cerro de plata».', 'naturaleza/rock_largeA'),
    G('Hoy el Distrito Central, con Comayagüela, es la ciudad más poblada del país junto con San Pedro Sula.', 28),
    C('ciudad/building-type-a')], [
    { dato: 'Fundada en 1578 como real de minas; capital desde 1880; unida a Comayagüela como Distrito Central en 1937', fuente: 'Alcaldía Municipal del Distrito Central y Encyclopaedia Britannica, «Tegucigalpa»' }],
    'El origen del nombre «Tegucigalpa» tiene varias explicaciones.'],
  ['comayagua-reloj', 'honduras', 'El reloj más viejo de América', ['reloj', 'Comayagua'], [
    P('En Honduras hay uno de los relojes más antiguos de América que todavía funciona.', 'ciudad/building-type-c'),
    F('Está en la torre de la catedral de Comayagua, una ciudad colonial del centro del país.', 'ciudad/building-type-c'),
    F('Se cree que lo hicieron en España hace muchos siglos y que llegó a Honduras en la época colonial.', 'naturaleza/statue_column'),
    G('Comayagua fue la capital de Honduras hasta 1880.', 22),
    F('Hoy sus campanadas siguen marcando las horas para quienes pasean por el centro histórico.', 'ciudad/building-type-h'),
    C('ciudad/building-type-c')], [
    { dato: 'Reloj de la catedral de Comayagua, considerado el más antiguo en funcionamiento del continente', fuente: 'Instituto Hondureño de Antropología e Historia y Instituto Hondureño de Turismo' }],
    'Su origen exacto y su fecha se discuten; la fuente es la tradición y las guías oficiales.'],
  ['yojoa-aves', 'honduras', 'El lago de las 400 aves', ['lago', 'aves'], [
    P('Alrededor del lago de Yojoa viven más de 400 especies de aves.', 'naturaleza/tree_palm'),
    F('Es el lago natural más grande de Honduras, entre Cortés, Comayagua y Santa Bárbara.', 'naturaleza/canoe'),
    CU('Su zona tiene bosques, ríos y montañas, y por eso atrae a tantas especies.', 'naturaleza/tree_default', 16),
    F('Por eso es un destino conocido entre las personas que observan aves.', 'naturaleza/tree_palm'),
    G('Y muy cerca está la catarata de Pulhapanzak, otro lugar para visitar el mismo día.', 22),
    C('naturaleza/tree_palm')], [
    { dato: 'Lago de Yojoa: el mayor lago natural de Honduras; más de 400 especies de aves en su zona', fuente: 'Instituto Hondureño de Turismo; Audubon / eBird (Lago de Yojoa)' }]],
  ['ciudad-blanca', 'honduras', 'La Ciudad Blanca de la Mosquitia', ['Ciudad', 'Blanca'], [
    P('Una leyenda hondureña dice que hay una ciudad perdida en la selva.', 'naturaleza/statue_column'),
    LI('La llamaban Ciudad Blanca, o Ciudad del Dios Mono.', [H(1940, 'Un explorador dice que la encontró', { objeto: 'naturaleza/statue_column' }), H(2012, 'Un láser revela ruinas bajo la selva'), H(2015, 'Una expedición lo confirma')]),
    F('El LiDAR mide el terreno con láser desde un avión y «ve» el suelo entre los árboles.', 'naturaleza/tree_palmTall'),
    F('Así aparecieron plazas, montículos y estructuras de una cultura antigua en La Mosquitia.', 'naturaleza/rock_largeA'),
    G('La zona es muy difícil de recorrer: casi no hay caminos y gran parte es selva protegida.', 24),
    C('naturaleza/statue_column')], [
    { dato: 'Estudio LiDAR de 2012 y expedición de 2015 en La Mosquitia', fuente: 'National Geographic (2015), «Lost City Found in the Honduran Rain Forest»; Preston, D. (2017), «The Lost City of the Monkey God»' }],
    'Los arqueólogos hablan de varias ciudades antiguas; «Ciudad Blanca» es el nombre de la leyenda.'],
  ['la-tigra', 'honduras', 'El primer parque nacional', ['parque', 'La Tigra'], [
    P('Cerca de Tegucigalpa hay un bosque de nubes protegido desde 1980.', 'naturaleza/tree_pineTallA'),
    F('El Parque Nacional La Tigra fue el primer parque nacional que declaró Honduras.', 'naturaleza/tree_pineTallA'),
    CU('Es un bosque nublado: las nubes bajas dejan gotas de agua en las hojas todo el año.', 'naturaleza/tree_pineTallA', 16),
    F('Esa agua alimenta quebradas que abastecen en parte a la capital.', 'botella'),
    G('Y hay senderos para recorrerlo en una excursión de un día desde la ciudad.', 22),
    C('naturaleza/tree_pineTallA')], [
    { dato: 'Parque Nacional La Tigra: declarado en 1980, el primero del país; bosque nublado', fuente: 'Instituto de Conservación Forestal (ICF), Honduras' },
    { dato: 'Sus quebradas abastecen en parte a Tegucigalpa', fuente: 'Fundación Amitigra' }]],
  ['lluvia-peces', 'honduras', 'La lluvia de peces de Yoro', ['lluvia', 'peces'], [
    P('En Yoro, según cuenta la tradición, a veces llueven peces.', 'comida/fish'),
    F('Cada año, después de una tormenta fuerte, aparecen cientos de pececitos vivos en el suelo.', 'comida/fish'),
    LL('La gente dice que pasa desde hace más de un siglo, y hay un festival que lo celebra.', 'comida/fish', 120),
    F('Algunos científicos creen que es una manga de agua que levanta peces; otros, que salen de aguas subterráneas con las crecidas.', 'naturaleza/cliff_waterfall_rock'),
    G('Nadie ha demostrado qué ocurre exactamente, y eso lo hace todavía más famoso.', 24),
    C('comida/fish')], [
    { dato: 'Fenómeno anual de «lluvia de peces» en Yoro y festival local', fuente: 'Instituto Hondureño de Turismo; reportes de National Geographic y la BBC' }],
    'La causa no está confirmada; hay varias hipótesis.'],
  ['baleada', 'honduras', 'La baleada, orgullo de la costa', ['baleada', 'costa'], [
    P('La baleada es la comida más famosa de la costa hondureña.', 'comida/taco'),
    F('Es una tortilla de harina doblada, con frijoles refritos, queso y crema.', 'comida/taco'),
    CU('A la «sencilla» se le puede agregar huevo, aguacate, carne o pollo, y pasa a ser «especial».', 'comida/taco', 8),
    F('Nació en la costa norte, y hoy se vende en todo el país y entre la gente hondureña que vive fuera.', 'comida/taco'),
    G('Es barata, rápida y sabrosa: por eso se come a cualquier hora del día.', 24),
    C('comida/taco')], [
    { dato: 'Descripción de la baleada y su origen en la costa norte', fuente: 'Instituto Hondureño de Turismo y Secretaría de Cultura, Artes y Deportes' }],
    'Qué ciudad la inventó primero se discute.'],
  ['nombre-honduras', 'honduras', 'De dónde viene «Honduras»', ['Honduras', 'nombre'], [
    P('¿Por qué el país se llama Honduras? Hay una leyenda famosa.', 'naturaleza/canoe'),
    LI('Cuenta la tradición que todo empezó en 1502.', [H(1502, 'Colón llega a la costa de Honduras', { objeto: 'naturaleza/canoe' }), H(1821, 'Independencia de España')]),
    F('Según se cuenta, Colón dijo: «Gracias a Dios que hemos salido de esas honduras».', 'naturaleza/canoe'),
    F('«Honduras» significaba «profundidades»: las aguas hondas de la costa, no el país entero.', 'comida/fish'),
    G('De esa misma travesía viene el nombre del Cabo Gracias a Dios, en la frontera con Nicaragua.', 24),
    C('naturaleza/canoe')], [
    { dato: 'Colón llegó a la costa de Honduras en 1502; el Cabo Gracias a Dios lleva ese nombre', fuente: 'Encyclopaedia Britannica, «Honduras: History»' }],
    'La frase atribuida a Colón es tradición y no está documentada.'],
  // ---------- Mitos (12) ----------
  ['calor-cabeza', 'mito', 'No pierdes el 40 % por la cabeza', ['cabeza', 'calor'], [
    P('Mito: pierdes la mayor parte del calor del cuerpo por la cabeza.', 'naturaleza/campfire_logs'),
    F('La cifra del 40 % sale de una prueba antigua del ejército de EE. UU.: todos llevaban abrigo, menos la cabeza.', 'naturaleza/campfire_logs'),
    CO('La cabeza es cerca del 10 % de la superficie del cuerpo, y pierde un calor parecido a eso.', [B('Superficie de la cabeza', 10, '≈ 10 %', 'naturaleza/campfire_logs'), B('Calor que pierde', 10, '7 a 10 %')]),
    G('Se pierde calor por cualquier parte que esté descubierta.', 22),
    F('Eso sí: taparte la cabeza ayuda, como taparte cualquier otra parte.', 'naturaleza/plant_bush'),
    C('naturaleza/campfire_logs')], [
    { dato: 'El mito del 40-45 % viene de un experimento de las Fuerzas Armadas de EE. UU. (1950) donde solo la cabeza estaba descubierta', fuente: 'Vreeman y Carroll (2008), British Medical Journal' },
    { dato: 'La cabeza pierde ≈ 7-10 % del calor', fuente: 'Pretorius et al. (2006), Journal of Applied Physiology' }]],
  ['unas-despues', 'mito', 'Las uñas no crecen tras morir', ['uñas', 'pelo'], [
    P('Mito: después de morir, las uñas y el pelo siguen creciendo.', 'libro'),
    F('Para crecer, las células necesitan oxígeno y glucosa, y después de morir ya no las reciben.', 'libro'),
    F('Lo que pasa es que la piel se deshidrata y se encoge, y deja ver más de la uña y del pelo.', 'naturaleza/grass_large'),
    G('Por eso parece que crecieron, pero en realidad solo quedaron más a la vista.', 22),
    C('libro')], [
    { dato: 'Las uñas y el pelo no crecen después de la muerte; la piel se retrae', fuente: 'Vreeman y Carroll (2007), British Medical Journal, «Medical myths»' }]],
  ['ocho-vasos', 'mito', 'Los ocho vasos de agua', ['ocho', 'vasos'], [
    P('Mito: todos necesitamos tomar ocho vasos de agua al día.', 'botella'),
    F('Esa regla no tiene una base científica clara: la necesidad de agua cambia con el calor, el ejercicio y el cuerpo.', 'botella'),
    CO('Las recomendaciones de agua total, contando la de los alimentos, son estas.', [B('Hombres', 3.7, '≈ 3,7 L', 'botella'), B('Mujeres', 2.7, '≈ 2,7 L')]),
    F('Cerca del 20 % del agua que tomamos viene de la comida: frutas, verduras y sopas.', 'comida/apple'),
    G('Una buena señal es la sed, y que la orina salga clara o amarillo pálido.', 22),
    C('botella')], [
    { dato: 'Ingesta adecuada de agua total: ≈ 3,7 L (hombres) y 2,7 L (mujeres), incluida la de los alimentos', fuente: 'National Academies (2004), «Dietary Reference Intakes for Water»' },
    { dato: 'No hay evidencia sólida de la regla de 8 vasos', fuente: 'Valtin (2002), American Journal of Physiology' }],
    'Las necesidades individuales varían; ante dudas, consulta a un profesional de salud.'],
  ['azucar-hiperactivo', 'mito', 'El azúcar no da hiperactividad', ['azúcar', 'niños'], [
    P('Mito: el azúcar vuelve hiperactivos a los niños.', 'comida/candy-bar'),
    F('Un análisis de 23 estudios, publicado en 1995, no encontró ese efecto.', 'comida/candy-bar'),
    F('En otro experimento, los padres a los que dijeron que su hijo había tomado azúcar lo vieron más inquieto… aunque no la había tomado.', 'comida/cookie'),
    G('Las fiestas, los amigos y la emoción pueden explicar mucho de esa energía.', 24),
    C('comida/candy-bar')], [
    { dato: 'Metaanálisis de 23 estudios: el azúcar no afecta la conducta ni la cognición de los niños', fuente: 'Wolraich, Wilson y White (1995), JAMA' },
    { dato: 'Expectativa de los padres y percepción de hiperactividad', fuente: 'Hoover y Milich (1994), Journal of Abnormal Child Psychology' }],
    'Esto no significa que el azúcar sea saludable en exceso.'],
  ['afeitar-grueso', 'mito', 'Afeitarse no engrosa el vello', ['afeitar', 'vello'], [
    P('Mito: si te afeitas, el vello vuelve más grueso y más oscuro.', 'naturaleza/grass_large'),
    F('Al afeitar, la punta del vello queda cortada en seco, sin la punta fina, y se siente más áspera.', 'naturaleza/grass_large'),
    F('Pero la raíz, que es lo que decide el grosor, no cambia.', 'naturaleza/tree_default'),
    G('Varios estudios midieron el vello antes y después de afeitar y no encontraron diferencias.', 22),
    C('naturaleza/grass_large')], [
    { dato: 'Afeitar no cambia el grosor, el color ni la velocidad de crecimiento del vello', fuente: 'Lynfield y MacWilliams (1970), Journal of Investigative Dermatology; Mayo Clinic' }]],
  ['vidrio-fluye', 'mito', 'El vidrio no fluye', ['vidrio', 'fluye'], [
    P('Mito: los vitrales antiguos son más gruesos abajo porque el vidrio fluye.', 'comida/glass'),
    F('En realidad, el vidrio de esa época se hacía girando un disco, y quedaba desigual desde el principio.', 'comida/glass'),
    F('Los vidrieros lo colocaban con la parte más gruesa hacia abajo, porque era más estable.', 'comida/glass'),
    G('Y los cálculos dicen que el vidrio tardaría muchísimo más que la edad del universo en deformarse.', 22),
    C('comida/glass')], [
    { dato: 'El vidrio de ventanas medievales (corona) era desigual de origen; no fluye de forma perceptible a temperatura ambiente', fuente: 'Zanotto (1998), American Journal of Physics' }]],
  ['sangre-azul', 'mito', 'La sangre nunca es azul', ['sangre', 'azul'], [
    P('Mito: la sangre sin oxígeno es azul y se pone roja al tocar el aire.', 'corazon'),
    F('La sangre siempre es roja: más brillante con oxígeno y rojo oscuro sin él.', 'corazon'),
    F('Las venas se ven azules por cómo la piel absorbe y refleja la luz, no por el color de la sangre.', 'comida/grapes'),
    G('Cuando te sacan sangre, sale roja oscura, nunca azul.', 22),
    C('corazon')], [
    { dato: 'La sangre desoxigenada es rojo oscuro; el tono azul de las venas es un efecto óptico', fuente: 'Kienle et al. (1996), Applied Optics; Cleveland Clinic' }]],
  ['aranas-dormido', 'mito', 'Ocho arañas al año: falso', ['arañas', 'dormido'], [
    P('Mito: cada año te tragas ocho arañas mientras duermes.', 'naturaleza/plant_bush'),
    F('Las arañas detectan las vibraciones y el calor de una persona dormida, y se alejan.', 'naturaleza/plant_bush'),
    F('Tu respiración y tus ronquidos son como una alarma que las espanta.', 'naturaleza/rock_smallA'),
    G('No hay ningún estudio que muestre que alguien se trague arañas dormido de forma habitual.', 22),
    C('naturaleza/plant_bush')], [
    { dato: 'No hay evidencia de que las personas se traguen arañas al dormir de forma habitual', fuente: 'Burke Museum of Natural History (Universidad de Washington); Snopes' }],
    'Es una afirmación difícil de probar con un estudio, pero no hay casos documentados.'],
  ['camaleon-colores', 'mito', 'El camaleón y sus colores', ['camaleón', 'colores'], [
    P('Mito: los camaleones cambian de color para camuflarse.', 'naturaleza/tree_default'),
    F('Cambian sobre todo para comunicarse con otros camaleones: el miedo, el enojo o el cortejo.', 'naturaleza/tree_default'),
    F('También cambian para regular su temperatura: más oscuros absorben más calor.', 'naturaleza/campfire_logs'),
    F('El truco está en su piel: unos cristales diminutos que cambian de espacio y reflejan otros colores.', 'naturaleza/rock_smallA'),
    G('Su color de reposo, verde o marrón, ya los esconde bastante bien.', 22),
    C('naturaleza/tree_default')], [
    { dato: 'El cambio de color sirve para comunicación y termorregulación; se produce con nanocristales de guanina', fuente: 'Teyssier et al. (2015), Nature Communications' }]],
  ['agua-coriolis', 'mito', 'El agua y el hemisferio sur', ['agua', 'hemisferio'], [
    P('Mito: en el hemisferio sur el agua del lavabo gira al revés.', 'botella'),
    F('El efecto de la rotación de la Tierra, llamado Coriolis, es demasiado débil en algo tan pequeño como un lavabo.', 'botella'),
    F('Lo que decide hacia dónde gira el agua es la forma del recipiente y cómo se movía antes de abrir el desagüe.', 'comida/bowl'),
    G('El efecto sí importa en cosas enormes: los huracanes giran en un sentido en el norte y en otro en el sur.', 22),
    C('botella')], [
    { dato: 'El efecto Coriolis es despreciable en un lavabo; sí gobierna el giro de los huracanes', fuente: 'NASA y Shapiro (1962), Nature' }]],
  ['estrellas-fugaces', 'mito', 'Estrellas fugaces, ¿estrellas?', ['estrellas', 'fugaces'], [
    P('Mito: las estrellas fugaces son estrellas que caen.', 'naturaleza/rock_smallA'),
    F('Son meteoroides, pedacitos de roca o hielo, muchos del tamaño de un grano de arena.', 'naturaleza/rock_smallA'),
    F('Brillan al entrar a la atmósfera a decenas de kilómetros por segundo y se calientan hasta brillar.', 'naturaleza/campfire_logs'),
    G('En agosto es la temporada de las Perseidas, cuando se pueden ver decenas por hora.', 22),
    C('naturaleza/rock_smallA')], [
    { dato: 'Los meteoros son meteoroides que se queman en la atmósfera, a ≈ 70-100 km de altura', fuente: 'NASA, «Meteors and Meteorites»' }]],
  ['chicle-siete', 'mito', 'El chicle no dura siete años', ['chicle', 'siete'], [
    P('Mito: si te tragas un chicle, tarda siete años en digerirse.', 'comida/candy-bar'),
    F('El chicle no se digiere del todo, pero tampoco se queda: avanza por el intestino como otros restos.', 'comida/candy-bar'),
    F('Normalmente sale en pocos días.', 'comida/candy-bar'),
    G('Lo que sí conviene es no tragarlo a propósito, sobre todo en niños pequeños.', 22),
    C('comida/candy-bar')], [
    { dato: 'El chicle tragado pasa por el aparato digestivo y se elimina en días; casos de obstrucción son raros', fuente: 'Academia Estadounidense de Pediatría y Mayo Clinic' }]],
  // ---------- Escala (8) ----------
  ['iss-orbitas', 'ciencia', 'La Estación da 16 vueltas al día', ['Estación', '16'], [
    P('La Estación Espacial da dieciséis vueltas a la Tierra cada día.', 'ladrillo'),
    LL('Viaja a unos 28.000 kilómetros por hora.', 'ladrillo', 100, { desde: 0, hasta: 28000, unidad: 'km/h' }),
    F('Da una vuelta completa en unos 90 minutos, a unos 400 kilómetros de altura.', 'ladrillo'),
    G('Por eso las personas a bordo ven unos 16 amaneceres y 16 atardeceres cada día.', 22),
    F('Y no se cae: está en caída libre constante, y la Tierra se curva debajo.', 'balon'),
    C('ladrillo')], [
    { dato: 'ISS: ≈ 28.000 km/h, una órbita cada ≈ 90 minutos, ≈ 400 km de altura', fuente: 'NASA, «International Space Station Facts and Figures»' }]],
  ['tierra-velocidad', 'ciencia', 'Vas a 107.000 km/h sin notarlo', ['107.000', 'Tierra'], [
    P('Ahora mismo viajas a 107.000 kilómetros por hora y no lo sientes.', 'balon'),
    CO('La Tierra gira sobre sí misma, da vueltas al Sol y viaja con todo el sistema solar por la galaxia.', [B('Giro de la Tierra', 1.67, '1.670 km/h', 'balon'), B('Vuelta al Sol', 107, '107.000 km/h'), B('Por la galaxia', 790, '≈ 790.000 km/h')]),
    F('No lo notamos porque la velocidad es casi constante, y todo se mueve con nosotros.', 'balon'),
    G('Solo sentimos los cambios de velocidad: las frenadas, los baches y las curvas.', 22),
    C('balon')], [
    { dato: 'Velocidad orbital de la Tierra ≈ 29,8 km/s ≈ 107.000 km/h; giro en el ecuador ≈ 1.670 km/h', fuente: 'NASA, «Earth Fact Sheet»' },
    { dato: 'El Sol se mueve en la galaxia a ≈ 220 km/s', fuente: 'NASA y Reid et al. (2014), Astrophysical Journal' }]],
  ['galaxias-cantidad', 'ciencia', 'Cientos de miles de millones', ['galaxias', 'estrellas'], [
    P('En el universo que podemos ver hay cientos de miles de millones de galaxias.', 'moneda'),
    GL('Se calcula que son entre 200.000 millones y más de un billón, según el estudio.'),
    PI('Y solo la Vía Láctea tiene entre 100.000 y 400.000 millones de estrellas.', 'moneda', 260, { desde: 0, hasta: 400, unidad: 'mil millones de estrellas' }),
    F('Más estrellas que granos de arena en todas las playas, según un cálculo muy repetido.', 'moneda'),
    C('moneda')], [
    { dato: 'Entre 100 y 400 mil millones de estrellas en la Vía Láctea', fuente: 'NASA, «Milky Way»' },
    { dato: 'Estimaciones del número de galaxias del universo observable', fuente: 'Conselice et al. (2016), The Astrophysical Journal; NASA' }],
    'Las cifras de galaxias cambian con cada telescopio; son estimaciones.'],
  ['marte-azul', 'ciencia', 'Atardeceres azules en Marte', ['Marte', 'azules'], [
    P('En Marte, los atardeceres son azules.', 'comida/orange'),
    F('Lo vio por primera vez la sonda Curiosity en 2015, cuando fotografió el Sol poniéndose.', 'comida/orange'),
    F('El polvo fino del cielo marciano deja pasar la luz azul mejor cerca del Sol, al revés que en la Tierra.', 'naturaleza/rock_largeA'),
    CO('Un día en Marte dura casi lo mismo que uno en la Tierra.', [B('Día en la Tierra', 24, '24 h', 'balon'), B('Día en Marte', 24.66, '24 h 40 min', 'comida/orange')]),
    G('Y la gravedad allá es solo el 38 % de la nuestra: saltarías más del doble de alto.', 22),
    C('comida/orange')], [
    { dato: 'Atardeceres azules fotografiados por Curiosity (2015)', fuente: 'NASA/JPL, «Curiosity Mars Rover: A Martian sunset»' },
    { dato: 'Día marciano (sol) ≈ 24 h 40 min; gravedad ≈ 38 % de la terrestre', fuente: 'NASA, «Mars Fact Sheet»' }]],
  ['pluton-ano', 'ciencia', 'Plutón no ha dado una vuelta', ['Plutón', '248'], [
    P('Desde que se descubrió Plutón, no ha completado ni una vuelta al Sol.', 'moneda'),
    LI('Plutón tarda 248 años en dar una vuelta alrededor del Sol.', [H(1930, 'Se descubre Plutón', { objeto: 'moneda' }), H(2006, 'Pasa a ser planeta enano'), H(2015, 'La sonda New Horizons lo visita'), H(2178, 'Completará su primera vuelta')]),
    F('Cada estación en Plutón dura unas seis décadas terrestres.', 'moneda'),
    G('Lo vimos de cerca por primera vez en 2015, y descubrimos montañas de hielo y un corazón gigante.', 22),
    C('moneda')], [
    { dato: 'Descubierto en 1930 por Clyde Tombaugh; periodo orbital ≈ 248 años; planeta enano desde 2006; sobrevuelo de New Horizons en 2015', fuente: 'NASA, «Pluto Facts»' }]],
  ['placas-unas', 'ciencia', 'Los continentes crecen como uñas', ['continentes', 'uñas'], [
    P('Los continentes se mueven más o menos a la velocidad a la que crecen tus uñas.', 'naturaleza/rock_largeB'),
    CO('Las placas se desplazan entre 2 y 10 centímetros al año.', [B('Tus uñas', 4, '≈ 4 cm/año', 'libro'), B('Placa del Pacífico', 7, '≈ 7 cm/año', 'naturaleza/rock_largeB'), B('Atlántico (se abre)', 2.5, '≈ 2,5 cm/año')]),
    F('Es lento, pero en millones de años mueve continentes enteros.', 'naturaleza/rock_largeB'),
    G('Hace 200 millones de años, casi todos los continentes estaban juntos.', 22),
    C('naturaleza/rock_largeB')], [
    { dato: 'Las placas tectónicas se mueven ≈ 2-10 cm al año', fuente: 'USGS, «Plate tectonics»' },
    { dato: 'Las uñas de las manos crecen ≈ 3,5 mm al mes', fuente: 'Yaemsiri et al. (2010), Journal of the American Academy of Dermatology' }]],
  ['terremotos-cifras', 'ciencia', 'Medio millón de terremotos', ['terremotos', 'millón'], [
    P('Cada año hay unos 500.000 terremotos detectables.', 'ladrillo'),
    PI('Se calcula que son unos 500.000 los que registran los instrumentos.', 'ladrillo', 240, { desde: 0, hasta: 500000, unidad: 'terremotos al año' }),
    CO('Pero solo una parte se siente, y muy pocos hacen daño.', [B('Se detectan', 500, '≈ 500.000', 'ladrillo'), B('Se sienten', 100, '≈ 100.000'), B('Causan daños', 0.1, '≈ 100')]),
    G('Honduras, Guatemala y El Salvador están en una zona sísmica activa, por eso conviene conocer el plan de emergencia de tu familia.', 24),
    C('ladrillo')], [
    { dato: '≈ 500.000 terremotos detectables al año, ≈ 100.000 se sienten y ≈ 100 causan daños', fuente: 'USGS, «How many earthquakes occur each year?»' }]],
  ['rusia-pluton', 'ciencia', 'Rusia es más grande que Plutón', ['Rusia', 'Plutón'], [
    P('Rusia tiene más superficie que Plutón.', 'balon'),
    CO('Rusia mide unos 17,1 millones de kilómetros cuadrados; Plutón, unos 16,7.', [B('Rusia', 17.1, '17,1 M km²', 'balon'), B('Plutón', 16.7, '16,7 M km²'), B('Honduras', 0.11, '0,11 M km²')]),
    F('Plutón es un mundo pequeño: menos de la mitad de ancho que la Tierra.', 'moneda'),
    G('Y Honduras cabría más de 150 veces dentro de Rusia.', 22),
    C('balon')], [
    { dato: 'Superficie de Rusia ≈ 17,1 M km²; de Honduras ≈ 112.492 km²', fuente: 'CIA World Factbook' },
    { dato: 'Superficie de Plutón ≈ 16,65 M km²', fuente: 'NASA, «Pluto Fact Sheet»' }]]
];

let n = 0;
for (const [id, categoria, titulo, destacar, escenas, fuentes, nota] of EP) {
  n++;
  const g = { id, temporada: 3, episodio: n, titulo, categoria, destacar, escenas: variarEscenas(escenas), fuentes, ...(nota ? { nota } : {}) };
  fs.writeFileSync(path.join(DIR_COLA, `5${String(n).padStart(2, '0')}-${id}.json`), JSON.stringify(g, null, 2) + '\n');
}
console.log(`${n} guiones 3D de la Temporada 3 escritos en ${DIR_COLA}`);
