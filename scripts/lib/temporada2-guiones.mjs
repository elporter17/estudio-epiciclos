// Genera los 30 guiones de la Temporada 2 de los videos 3D en video3d/guiones/cola/1NN-id.json.
//   node scripts/lib/temporada2-guiones.mjs
// Temporada 2 = «Mitos, Honduras y escala»: 15 mitos desmentidos (categoría «mito»), 8 de orgullo hondureño
// (categoría «honduras») y 7 de curiosidades a escala (categoría «curiosidad»). Cada guion lleva «temporada: 2» y
// «episodio» (la portada muestra «TEMPORADA 2 · EP n»). Las fuentes son por institución; hay que revisar las cifras
// antes de insistir si alguien las discute.
import fs from 'node:fs';
import path from 'node:path';
import { DIR_COLA } from './video3d-cola.mjs';

// ---- escenas ----
const P = (texto, objeto) => ({ tipo: 'portada', texto, objeto });
const F = (texto, objeto, cantidad = 1) => ({ tipo: 'foco', texto, objeto, cantidad });
const G = (texto, cantidad = 24, contador) => ({ tipo: 'gente', texto, cantidad, ...(contador ? { contador } : {}) });
const GL = (texto) => ({ tipo: 'globo', texto, modo: 'luces' });
const PI = (texto, objeto, cantidad = 200, contador) => ({ tipo: 'pila', texto, objeto, cantidad, ...(contador ? { contador } : {}) });
const LL = (texto, objeto, cantidad = 140, contador) => ({ tipo: 'lluvia', texto, objeto, cantidad, ...(contador ? { contador } : {}) });
const CU = (texto, objeto, lado = 18) => ({ tipo: 'cuadricula', texto, objeto, lado });
const CO = (texto, barras) => ({ tipo: 'comparacion', texto, barras });
const LI = (texto, hitos) => ({ tipo: 'linea', texto, hitos });
const CAL = (texto, contador) => ({ tipo: 'calendario', texto, contador });
const CA = (texto, objeto, cantidad = 8) => ({ tipo: 'calle', texto, objeto, cantidad });
const C = (objeto) => ({ tipo: 'cierre', texto: '¿Lo sabías? Cuéntanos en los comentarios y síguenos para uno nuevo cada día.', objeto });
const B = (etiqueta, valor, texto, objeto) => ({ etiqueta, valor, texto, ...(objeto ? { objeto } : {}) });
const H = (anio, texto, extra = {}) => ({ anio, texto, ...extra });

// ---- los 30 episodios, en el orden en que saldrán ----
const EP = [
  // 1
  ['muralla', 'mito', 'La Muralla no se ve del espacio', ['Muralla', 'espacio'], [
    P('Mito: la Gran Muralla china se ve desde el espacio. La verdad es que a simple vista, no.', 'ladrillo'),
    PI('La muralla mide más de 21.000 kilómetros, según la medición oficial china de 2012.', 'ladrillo', 260, { desde: 0, hasta: 21196, unidad: 'kilómetros' }),
    F('Pero es angosta: en casi todo su recorrido tiene apenas unos metros de ancho.', 'ladrillo', 2),
    G('En 2003, Yang Liwei, el primer astronauta chino, dijo que no pudo verla desde su nave.'),
    LL('Además, se hizo con ladrillo, piedra y tierra, y es del mismo color que el paisaje.', 'ladrillo', 150),
    GL('Lo que sí se ve de noche desde el espacio son las ciudades iluminadas.'),
    C('ladrillo')], [
    { dato: 'Más de 21.000 km de muralla (21.196 km)', fuente: 'Administración Estatal de Patrimonio Cultural de China (2012), reportado por la BBC' },
    { dato: 'No se ve a simple vista desde la órbita baja', fuente: 'NASA, «Great Wall of China» y «Great Wall: Not Visible from Space»' },
    { dato: 'Yang Liwei, 2003, dijo que no la vio', fuente: 'Entrevistas a Yang Liwei tras la misión Shenzhou 5 (2003), reportadas por prensa internacional' }]],
  // 2
  ['copan', 'honduras', 'La escalera de 2.200 glifos', ['Copán', '2.200'], [
    P('En Honduras está la escritura maya más larga que se conoce: la Escalera de los Jeroglíficos de Copán.', 'naturaleza/statue_obelisk'),
    LI('Copán fue una gran ciudad maya durante siglos y hoy es Patrimonio de la Humanidad.', [H(426, 'Se funda la dinastía', { etiqueta_anio: 'Año 426', objeto: 'naturaleza/statue_obelisk' }), H(755, 'Escalera de los Jeroglíficos', { etiqueta_anio: 'Hacia 755' }), H(1980, 'Patrimonio de la UNESCO')]),
    CU('La escalera tiene 63 gradas y unos 2.200 glifos tallados, una historia entera escrita en piedra.', 'ladrillo', 20),
    F('Cada glifo es un bloque tallado con nombres, fechas y hazañas de los reyes de Copán.', 'naturaleza/statue_obelisk', 1),
    G('Hoy, miles de visitantes de todo el mundo viajan a Honduras solo para verla.', 26),
    GL('Y todo está en Copán Ruinas, en el occidente de Honduras, cerca de la frontera con Guatemala.'),
    C('naturaleza/statue_obelisk')], [
    { dato: 'Copán, Patrimonio Mundial desde 1980', fuente: 'UNESCO, «Maya Site of Copan»', url: 'https://whc.unesco.org/en/list/129' },
    { dato: 'Escalera de los Jeroglíficos: unos 2.200 glifos, la inscripción maya más larga conocida', fuente: 'UNESCO, «Maya Site of Copan» e Instituto Hondureño de Antropología e Historia' },
    { dato: 'Dinastía fundada en el año 426', fuente: 'Instituto Hondureño de Antropología e Historia (según las inscripciones del sitio)' }]],
  // 3
  ['toros', 'mito', 'El toro no ve el rojo', ['toros', 'rojo'], [
    P('Mito: al toro lo enfurece el color rojo. Pero para ellos, el rojo ni se distingue.', 'naturaleza/flower_redA'),
    F('Los toros no distinguen bien el rojo del verde: tienen una visión de dos colores.', 'naturaleza/flower_redA', 2),
    G('Lo que los provoca es el movimiento del capote, no su color.'),
    CU('En una prueba del programa MythBusters, los toros embistieron banderas rojas, azules y blancas por igual.', 'naturaleza/flower_redA', 18),
    LL('Si el capote está quieto, el toro casi ni se interesa.', 'naturaleza/flower_redA', 110),
    GL('Y el rojo del capote es tradición de la corrida, no una necesidad del toro.'),
    C('naturaleza/flower_redA')], [
    { dato: 'El ganado bovino tiene visión de color dicromática (no distingue bien el rojo)', fuente: 'Estudios de visión de color en ganado bovino (visión dicromática)' },
    { dato: 'Embisten banderas de cualquier color si se mueven', fuente: 'MythBusters (Discovery Channel), episodio sobre el toro y el color rojo' }]],
  // 4
  ['pulpo', 'curiosidad', 'El pulpo tiene tres corazones', ['pulpo', 'tres', 'corazones'], [
    P('El pulpo tiene tres corazones, sangre azul y brazos que casi piensan por su cuenta.', 'corazon'),
    F('Dos corazones mandan la sangre a las branquias y el tercero la reparte por el cuerpo.', 'corazon', 3),
    LL('Su sangre es azul porque usa cobre, no hierro, para llevar el oxígeno.', 'comida/mussel', 130),
    G('Tiene unos 500 millones de neuronas, y casi dos tercios están en los brazos.', 22, { desde: 0, hasta: 500, unidad: 'millones' }),
    CU('Por eso cada brazo puede probar y decidir con cierta autonomía.', 'corazon', 14),
    GL('Y viven en todos los océanos del planeta.'),
    C('corazon')], [
    { dato: 'Tres corazones: dos branquiales y uno sistémico', fuente: 'Smithsonian Ocean / Acuario de la Bahía de Monterrey' },
    { dato: 'Sangre azul por la hemocianina (cobre)', fuente: 'Smithsonian Ocean' },
    { dato: 'Unos 500 millones de neuronas, dos tercios en los brazos', fuente: 'Hochner (2012), «An embodied view of octopus neurobiology», Current Biology' }]],
  // 5
  ['cerebro', 'mito', 'No usas solo el 10 % del cerebro', ['10', 'cerebro'], [
    P('Mito: usamos solo el diez por ciento del cerebro. Falso: lo usas casi todo, incluso dormido.', 'libro'),
    LL('Tu cerebro tiene unos 86.000 millones de neuronas, y casi todas se usan.', 'moneda', 150, { desde: 0, hasta: 86000, unidad: 'millones' }),
    CO('Pesa apenas el 2 % del cuerpo, pero gasta cerca del 20 % de tu energía.', [B('Peso del cuerpo', 2, '2 %'), B('Energía que gasta', 20, '≈ 20 %', 'moneda')]),
    F('Si el 90 % no sirviera, un golpe en cualquier zona no tendría consecuencias. Y sí las tiene.', 'libro', 1),
    G('Los escáneres muestran actividad en todo el cerebro durante el día, y también mientras duermes.'),
    GL('El mito se repite desde hace más de un siglo, pero no tiene base científica.'),
    C('libro')], [
    { dato: 'Unos 86.000 millones de neuronas', fuente: 'Azevedo et al. (2009), Journal of Comparative Neurology' },
    { dato: 'El cerebro usa cerca del 20 % de la energía del cuerpo', fuente: 'Raichle y Gusnard (2002), PNAS' },
    { dato: 'El mito del 10 %', fuente: 'Scientific American, «Do People Use Only 10 Percent of Their Brains?»' }]],
  // 6
  ['tiburonballena', 'honduras', 'El pez más grande, en Honduras', ['pez', 'Honduras'], [
    P('El pez más grande del mundo, el tiburón ballena, se deja ver en las aguas de Utila, en Honduras.', 'comida/fish'),
    F('El tiburón ballena puede medir unos 12 metros: más largo que un autobús.', 'comida/fish', 1),
    CO('Un autobús urbano mide unos 12 metros. Un tiburón ballena adulto llega a lo mismo.', [B('Tiburón ballena', 12, '≈ 12 m', 'comida/fish'), B('Autobús', 12, '≈ 12 m', 'autos/van')]),
    LL('Y no come personas: se alimenta filtrando plancton y peces diminutos.', 'comida/fish', 90),
    G('Cada uno tiene un patrón de manchas distinto, como una huella digital.'),
    GL('Utila, en las Islas de la Bahía, es famosa entre buzos por poder verlos con cierta frecuencia.'),
    C('comida/fish')], [
    { dato: 'El tiburón ballena es el pez más grande, de unos 12 m', fuente: 'WWF y Acuario de Georgia' },
    { dato: 'Se alimenta por filtración de plancton', fuente: 'NOAA Fisheries, «Whale Shark»' },
    { dato: 'Patrón de manchas único en cada individuo', fuente: 'Wildbook for Whale Sharks / Ecocean' },
    { dato: 'Avistamientos frecuentes en Utila (Islas de la Bahía)', fuente: 'Whale Shark and Oceanic Research Center, Utila (WSORC)' }]],
  // 7
  ['vikingos', 'mito', 'Vikingos sin cuernos', ['vikingos', 'cuernos'], [
    P('Mito: los vikingos llevaban cascos con cuernos. No hay pruebas de que los usaran.', 'naturaleza/canoe'),
    LI('La imagen se hizo famosa mucho después de la era vikinga.', [H(800, 'Era vikinga', { etiqueta_anio: 'Siglos IX-XI', objeto: 'naturaleza/canoe' }), H(1876, 'Vestuario de ópera con cuernos'), H(2000, 'Hoy, en pelis y caricaturas')]),
    F('El único casco vikingo casi completo que se ha encontrado, el de Gjermundbu, en Noruega, no tiene cuernos.', 'naturaleza/canoe', 1),
    G('Los cuernos aparecieron en 1876 en el vestuario de una ópera de Richard Wagner, en Alemania.'),
    LL('En una batalla, los cuernos habrían sido un estorbo: un enemigo los podía agarrar.', 'naturaleza/canoe', 90),
    GL('Y así se quedó la imagen en el imaginario popular.'),
    C('naturaleza/canoe')], [
    { dato: 'No hay evidencia arqueológica de cascos con cuernos', fuente: 'Museo Nacional de Dinamarca y Museo Británico' },
    { dato: 'Casco de Gjermundbu (Noruega), el más completo, sin cuernos', fuente: 'Museo de Historia Cultural, Universidad de Oslo' },
    { dato: 'Los cuernos se popularizaron con el vestuario de «El anillo del nibelungo» (1876)', fuente: 'Enciclopedia Británica y museos escandinavos' }]],
  // 8
  ['segundos', 'curiosidad', 'Un millón de segundos', ['millón', 'segundos'], [
    P('Un millón de segundos son once días. Mil millones de segundos, ¡treinta y dos años!', 'moneda'),
    CAL('Un millón de segundos son unos 11 días y medio.', { desde: 0, hasta: 11, unidad: 'días' }),
    PI('Si ganaras un dólar por segundo, tendrías un millón en menos de dos semanas.', 'moneda', 260, { desde: 0, hasta: 1000000, unidad: 'dólares' }),
    CAL('Mil millones de segundos son casi 32 años: más que lo que llevas viviendo, tal vez.', { desde: 0, hasta: 32, unidad: 'años' }),
    G('Pero para llegar a mil millones tendrías que esperar casi 32 años sin parar, sin dormir y sin comer.', 26),
    GL('Por eso los números enormes nos engañan: no los sentimos, solo los leemos.'),
    C('moneda')], [
    { dato: '1.000.000 de segundos ≈ 11,6 días; 1.000.000.000 de segundos ≈ 31,7 años', fuente: 'Cálculo directo: 1.000.000 ÷ 86.400 y 1.000.000.000 ÷ 31.557.600' }]],
  // 9
  ['rayos2', 'mito', 'El rayo sí cae dos veces', ['rayo', 'dos', 'veces'], [
    P('Mito: un rayo nunca cae dos veces en el mismo sitio. Hay un edificio que recibe más de veinte al año.', 'naturaleza/statue_obelisk'),
    F('El Empire State, en Nueva York, recibe en promedio unos 20 a 25 rayos al año.', 'naturaleza/statue_obelisk', 1),
    G('Un guardabosques de EE. UU., Roy Sullivan, fue alcanzado por siete rayos y sobrevivió a todos.', 20),
    LI('Sus siete rayos, entre 1942 y 1977, le dieron récord Guinness.', [H(1942, 'Primer rayo', { objeto: 'naturaleza/statue_obelisk' }), H(1970, 'Tercer rayo'), H(1976, 'Sexto rayo'), H(1977, 'Séptimo rayo')]),
    LL('Los rayos buscan lo más alto y lo que mejor conduce: por eso se repiten en los mismos sitios.', 'naturaleza/tree_pineTallA', 90),
    GL('Un rayo calienta el aire cerca de cinco veces más que la superficie del Sol.'),
    C('naturaleza/statue_obelisk')], [
    { dato: 'El Empire State recibe unos 20-25 rayos al año', fuente: 'Servicio Meteorológico Nacional de EE. UU. (NOAA)' },
    { dato: 'Roy Sullivan, alcanzado por siete rayos (1942-1977)', fuente: 'Guinness World Records, «Most lightning strike survivals»' },
    { dato: 'El aire de un rayo llega a unos 30.000 K, cinco veces la superficie del Sol', fuente: 'NOAA / Servicio Meteorológico Nacional (EE. UU.)' }]],
  // 10
  ['brasil2001', 'honduras', 'Honduras le ganó a Brasil', ['Honduras', 'Brasil'], [
    P('En 2001, Honduras le ganó 2 a 0 a Brasil en la Copa América. Sí, en serio.', 'balon'),
    CO('En los cuartos de final, Honduras 2, Brasil 0.', [B('Honduras', 2, '2', 'balon'), B('Brasil', 0.05, '0')]),
    G('Honduras era invitada a esa Copa América, en Colombia, y llegó hasta las semifinales.', 28),
    LI('Honduras tiene tres Mundiales y una Copa América que sorprendió.', [H(1982, 'Mundial de España', { objeto: 'balon' }), H(2001, 'Le gana a Brasil'), H(2010, 'Mundial de Sudáfrica'), H(2014, 'Mundial de Brasil')]),
    F('En la semifinal cayó ante Colombia, que terminó ganando el torneo.', 'balon', 1),
    GL('Una de las mayores sorpresas de la historia de la Copa América.'),
    C('balon')], [
    { dato: 'Honduras 2-0 Brasil, cuartos de final de la Copa América 2001', fuente: 'CONMEBOL y FIFA (historial de la Copa América 2001)' },
    { dato: 'Honduras en los Mundiales de 1982, 2010 y 2014', fuente: 'FIFA, historial de participación de Honduras' }]],
  // 11
  ['einstein', 'mito', 'Einstein no reprobó matemáticas', ['Einstein', 'matemáticas'], [
    P('Mito: Einstein reprobó matemáticas. Falso: a los 15 años ya dominaba el cálculo.', 'libro'),
    F('Él mismo lo desmintió: dijo que nunca reprobó matemáticas.', 'libro', 2),
    LI('Su vida, en cuatro paradas.', [H(1879, 'Nace en Ulm', { objeto: 'libro' }), H(1895, 'Suspende el examen de ingreso en letras'), H(1905, 'Su año milagroso'), H(1921, 'Premio Nobel')]),
    G('Lo que falló a los 16 años fue el examen de ingreso a una universidad suiza, en áreas como francés y letras, no en matemáticas.', 22),
    GL('En matemáticas y física, en cambio, sacó notas excelentes.'),
    LL('En 1905 publicó cuatro artículos que cambiaron la física para siempre.', 'libro', 70),
    C('libro')], [
    { dato: 'Einstein desmintió haber reprobado matemáticas', fuente: 'Archivos Einstein, Universidad Hebrea de Jerusalén / Princeton' },
    { dato: 'Examen de ingreso al Politécnico de Zúrich (1895), con excelentes notas en matemáticas y física', fuente: 'The Einstein Papers Project, Caltech' },
    { dato: 'Premio Nobel de Física 1921', fuente: 'NobelPrize.org', url: 'https://www.nobelprize.org/prizes/physics/1921/summary/' }]],
  // 12
  ['venus', 'curiosidad', 'En Venus, un día dura más', ['Venus', 'día', 'año'], [
    P('En Venus un día dura más que un año. Sí, en serio.', 'comida/orange'),
    CO('Venus gira tan despacio que su día dura 243 días terrestres, y su año, solo 225.', [B('Un día en Venus', 243, '243 días', 'comida/orange'), B('Un año en Venus', 225, '225 días')]),
    F('Además gira al revés: allá el Sol sale por el oeste.', 'comida/orange', 1),
    GL('Es el planeta más caliente del sistema solar: unos 465 grados, más que cualquier horno.'),
    LL('Su atmósfera de dióxido de carbono atrapa el calor como una olla tapada.', 'comida/orange', 100),
    G('Y la presión en su superficie equivale a estar casi un kilómetro bajo el mar.', 18),
    C('comida/orange')], [
    { dato: 'Día en Venus: unos 243 días terrestres; año: unos 225', fuente: 'NASA, «Venus Facts»', url: 'https://science.nasa.gov/venus/venus-facts/' },
    { dato: 'Rotación retrógrada', fuente: 'NASA, «Venus Facts»' },
    { dato: 'Temperatura de unos 465 °C y 90 veces la presión de la Tierra', fuente: 'NASA, «Venus Facts»' }]],
  // 13
  ['avestruz', 'mito', 'El avestruz y la arena', ['avestruz', 'cabeza'], [
    P('Mito: el avestruz esconde la cabeza bajo la tierra cuando tiene miedo. Nunca lo hace.', 'comida/egg'),
    F('Lo que hace es agacharse junto al suelo, y de lejos parece que la mete en la arena.', 'comida/egg', 1),
    G('También cava huecos en la tierra para poner sus huevos, y con la cabeza los voltea.'),
    CO('Y pone el huevo más grande de todas las aves: como 24 huevos de gallina.', [B('Huevo de gallina', 1, '1'), B('Huevo de avestruz', 24, '≈ 24', 'comida/egg')]),
    LL('Cuando de verdad hay peligro, corre: puede llegar a 70 kilómetros por hora.', 'comida/egg', 90),
    GL('Es la mayor ave del mundo y no puede volar.'),
    C('comida/egg')], [
    { dato: 'No entierra la cabeza; pone la cabeza al ras del suelo y voltea sus huevos', fuente: 'Zoológico de San Diego, «Ostrich»' },
    { dato: 'Corre hasta unos 70 km/h; huevo de unos 1,4 kg', fuente: 'Zoológico de San Diego y Enciclopedia Británica' }]],
  // 14
  ['guara', 'honduras', 'La guara roja de Honduras', ['guara', 'Honduras'], [
    P('La guara roja es el ave nacional de Honduras, y puede vivir hasta 50 años.', 'naturaleza/flower_redC'),
    F('Es un tipo de guacamaya con plumas rojas, amarillas y azules.', 'naturaleza/flower_redC', 1),
    CU('Los grandes grupos vuelan juntos y se reconocen por su voz.', 'naturaleza/flower_redC', 18),
    G('En Copán se protegen y se reintroducen guaras, y tienen un lugar especial en la cultura maya.', 22),
    LL('En cautiverio pueden vivir 40 o 50 años, casi una vida entera.', 'naturaleza/flower_redC', 100, { desde: 0, hasta: 50, unidad: 'años' }),
    GL('Por eso cuidar sus bosques es cuidar un símbolo hondureño.'),
    C('naturaleza/flower_redC')], [
    { dato: 'La guara roja (Ara macao) es el ave nacional de Honduras', fuente: 'Instituto de Conservación Forestal (ICF), Honduras' },
    { dato: 'Vive 40-50 años', fuente: 'Zoológico de San Diego, «Scarlet Macaw»' }]],
  // 15
  ['murcielagos', 'mito', 'Los murciélagos no son ciegos', ['murciélagos', 'ciegos'], [
    P('Mito: los murciélagos son ciegos. Falso: todos pueden ver.', 'naturaleza/cliff_cave_rock'),
    F('Todas las especies tienen ojos que funcionan, y algunas ven muy bien con poca luz.', 'naturaleza/cliff_cave_rock', 1),
    G('Existen más de 1.400 especies: casi uno de cada cinco mamíferos del planeta es un murciélago.', 24, { desde: 0, hasta: 1400, unidad: 'especies' }),
    GL('Muchas, además de ver, usan el eco: emiten sonidos y escuchan cómo rebotan para cazar de noche.'),
    LL('Los murciélagos que comen insectos se comen toneladas de plagas cada noche.', 'naturaleza/cliff_cave_rock', 80),
    CU('Y otros polinizan flores y dispersan semillas: sin ellos habría menos bosque.', 'naturaleza/tree_palm', 16),
    C('naturaleza/cliff_cave_rock')], [
    { dato: 'Más de 1.400 especies (aprox. el 20 % de los mamíferos)', fuente: 'Bat Conservation International' },
    { dato: 'Todos los murciélagos ven; algunos usan ecolocalización', fuente: 'Bat Conservation International, «Bats are not blind»' }]],
  // 16
  ['hormigas', 'curiosidad', 'Hay 20 mil billones de hormigas', ['hormigas', 'mil', 'billones'], [
    P('En la Tierra hay unos veinte mil billones de hormigas.', 'comida/cookie'),
    LL('Son 20.000.000.000.000.000: unos 2,5 millones de hormigas por cada persona.', 'comida/cookie', 160, { desde: 0, hasta: 2500000, unidad: 'por persona' }),
    G('Entre todas pesan más que todas las aves silvestres y los mamíferos silvestres juntos.', 24),
    F('Y hay más de 15.000 especies de hormigas en el mundo.', 'comida/cookie', 3),
    CU('Viven en todos los continentes menos en la Antártida.', 'comida/cookie', 16),
    GL('Una colonia puede tener desde unas decenas hasta millones de hormigas, y cada una tiene su trabajo.'),
    C('comida/cookie')], [
    { dato: 'Unos 20 cuatrillones (2×10^16) de hormigas', fuente: 'Schultheiss et al. (2022), PNAS' },
    { dato: 'Su biomasa supera la de las aves y los mamíferos silvestres juntos', fuente: 'Schultheiss et al. (2022), PNAS; Bar-On et al. (2018), PNAS' },
    { dato: 'Más de 15.000 especies descritas', fuente: 'AntWeb / Museo Americano de Historia Natural' }],
    'Cifra estimada: el estudio da un rango, y 20 mil billones es el valor central.'],
  // 17
  ['napoleon', 'mito', 'Napoleón no era tan bajito', ['Napoleón', 'bajito'], [
    P('Mito: Napoleón era muy bajito. En realidad medía unos 1,69 metros, y era normal para su época.', 'moneda'),
    CO('El francés promedio de su época medía unos 1,65 metros, así que Napoleón era un poquito más alto.', [B('Napoleón', 169, '≈ 1,69 m', 'moneda'), B('Hombre francés de su época', 165, '≈ 1,65 m')]),
    F('Su autopsia dice 5 pies 2 pulgadas… pero en medidas francesas, que eran más largas.', 'moneda', 2),
    G('Sus soldados lo llamaban «el pequeño cabo», un apodo cariñoso, no una burla.', 20),
    GL('Y los dibujos británicos de la época lo exageraban, para burlarse de él.'),
    LL('Así nació la imagen del Napoleón enano que aún repetimos.', 'moneda', 70),
    C('moneda')], [
    { dato: 'Napoleón medía unos 1,69 m (5 pies 2 pulgadas francesas)', fuente: 'Enciclopedia Británica y Fondation Napoléon' },
    { dato: 'Estatura media francesa de la época: unos 1,65 m', fuente: 'Enciclopedia Británica' },
    { dato: 'Apodo «le petit caporal»', fuente: 'Fondation Napoléon' }]],
  // 18
  ['garifuna', 'honduras', 'Garífunas: llegaron en 1797', ['garífunas', '1797'], [
    P('En 1797, los garífunas llegaron a Roatán, en Honduras. Hoy su cultura es patrimonio de la humanidad.', 'comida/bread'),
    LI('Su historia llega hasta hoy.', [H(1797, 'Llegan a Roatán', { objeto: 'comida/bread' }), H(2001, 'La UNESCO proclama su cultura'), H(2008, 'Patrimonio Inmaterial')]),
    F('Su música, su danza y su idioma se reconocieron como Patrimonio Inmaterial de la Humanidad.', 'comida/bread', 1),
    G('Sus raíces son africanas, arahuacas y caribes, y hoy viven en Honduras, Belice, Guatemala y Nicaragua.', 28),
    LL('El casabe y el hudutu, con pescado y plátano, son parte de su comida más conocida.', 'comida/bread', 90),
    GL('Los garífunas son uno de los orgullos culturales de Honduras.'),
    C('comida/bread')], [
    { dato: 'Llegada a Roatán en 1797 tras su deportación de San Vicente', fuente: 'UNESCO, «Language, dance and music of the Garifuna»' },
    { dato: 'Proclamada en 2001 e inscrita en 2008 como Patrimonio Cultural Inmaterial', fuente: 'UNESCO', url: 'https://ich.unesco.org/en/RL/language-dance-and-music-of-the-garifuna-00001' }]],
  // 19
  ['colon', 'mito', 'Colón y la Tierra redonda', ['Colón', 'redonda'], [
    P('Mito: Colón demostró que la Tierra era redonda. Eso ya se sabía hacía casi dos mil años.', 'libro'),
    LI('Los griegos ya lo habían calculado mucho antes de 1492.', [H(-350, 'Aristóteles da pruebas', { etiqueta_anio: '350 a. C.', objeto: 'libro' }), H(-240, 'Eratóstenes mide la Tierra', { etiqueta_anio: '240 a. C.' }), H(1492, 'Colón sale al mar'), H(1522, 'Elcano da la vuelta al mundo')]),
    F('Eratóstenes calculó el tamaño de la Tierra midiendo sombras, con muy poco error.', 'libro', 1),
    G('Los marinos y sabios de la época de Colón también sabían que la Tierra era redonda.', 22),
    GL('La discusión era otra: qué tan grande era, y si se podía llegar a Asia por el oeste.'),
    LL('Colón subestimó la distancia, y por suerte se encontró con un continente en el camino.', 'libro', 70),
    C('libro')], [
    { dato: 'Aristóteles argumentó la esfericidad de la Tierra (siglo IV a. C.)', fuente: 'Enciclopedia Británica, «Aristotle»' },
    { dato: 'Eratóstenes midió la circunferencia terrestre hacia el 240 a. C.', fuente: 'Enciclopedia Británica, «Eratosthenes»' },
    { dato: 'Elcano completó la primera vuelta al mundo en 1522', fuente: 'Enciclopedia Británica' }]],
  // 20
  ['tardigrado', 'curiosidad', 'El animal que vive en el espacio', ['tardígrado', 'espacio'], [
    P('Este animal de medio milímetro sobrevivió desnudo en el espacio.', 'comida/mussel'),
    F('El tardígrado, o «oso de agua», mide menos de un milímetro y vive en el musgo.', 'comida/mussel', 1),
    G('En 2007, la Agencia Espacial Europea los llevó al espacio, y algunos sobrevivieron al vacío y a la radiación.', 22),
    CO('Resisten desde casi el cero absoluto hasta unos 150 grados.', [B('Frío extremo', 1, '−272 °C', 'comida/mussel'), B('Calor extremo', 150, '+150 °C')]),
    LL('Cuando se seca, se encoge y entra en un letargo que puede durar años.', 'comida/mussel', 90),
    GL('Existen en casi todo el planeta, de las montañas al fondo del mar.'),
    C('comida/mussel')], [
    { dato: 'Sobrevivieron al vacío y la radiación en el experimento FOTON-M3 (2007)', fuente: 'Jönsson et al. (2008), Current Biology; Agencia Espacial Europea (ESA)' },
    { dato: 'Resisten temperaturas de hasta unos 150 °C y cerca del cero absoluto', fuente: 'Enciclopedia Británica, «Tardigrade»' }]],
  // 21
  ['pezdorado', 'mito', 'El pez dorado sí recuerda', ['pez', 'dorado', 'memoria'], [
    P('Mito: el pez dorado olvida todo en tres segundos. Falso: recuerda por meses.', 'comida/fish'),
    F('Un pez dorado puede aprender a reconocer a quien lo alimenta.', 'comida/fish', 1),
    CAL('Se han hecho pruebas donde recuerdan rutinas y horarios por meses.', { desde: 0, hasta: 3, unidad: 'meses' }),
    G('Pueden aprender a empujar una palanca para recibir comida, a una hora fija del día.', 18),
    LL('Y en buenas condiciones pueden vivir más de diez años.', 'comida/fish', 100),
    GL('El récord Guinness es de 43 años, el de un pez dorado llamado Tish, en Inglaterra.'),
    C('comida/fish')], [
    { dato: 'Entrenamiento con palanca y horario (memoria de meses)', fuente: 'Universidad de Plymouth (Reino Unido), estudio de 2003' },
    { dato: 'Pez dorado más longevo: 43 años (Tish)', fuente: 'Guinness World Records, «Oldest goldfish ever»' }]],
  // 22
  ['rioplatano', 'honduras', 'Río Plátano, la selva de Honduras', ['Río', 'Plátano'], [
    P('En Honduras hay una selva tropical protegida por la UNESCO: la Reserva del Río Plátano.', 'naturaleza/tree_palmTall'),
    F('Es una de las mayores zonas de selva tropical húmeda que quedan en Centroamérica.', 'naturaleza/tree_palmTall', 3),
    CU('Cubre más de 5.000 kilómetros cuadrados, una selva que sigue casi intacta.', 'naturaleza/tree_palmTall', 20),
    G('Allí viven pueblos indígenas misquitos, pech y tawahka, junto a jaguares, tapires y monos.', 24),
    LL('Es Patrimonio Mundial de la UNESCO y Reserva de la Biosfera.', 'naturaleza/tree_palmTall', 110),
    GL('Está en la Mosquitia hondureña, en el oriente del país.'),
    C('naturaleza/tree_palmTall')], [
    { dato: 'Reserva del Río Plátano, Patrimonio Mundial de la UNESCO', fuente: 'UNESCO, «Río Plátano Biosphere Reserve»', url: 'https://whc.unesco.org/en/list/196' },
    { dato: 'Más de 5.000 km² de superficie', fuente: 'UNESCO y Instituto de Conservación Forestal (ICF), Honduras' }]],
  // 23
  ['solblanco', 'mito', 'El Sol no es amarillo', ['Sol', 'amarillo'], [
    P('Mito: el Sol es amarillo. Visto desde el espacio, es blanco.', 'comida/lemon'),
    F('El Sol emite luz de todos los colores a la vez, y todos juntos forman luz blanca.', 'comida/lemon', 1),
    GL('Lo vemos amarillo porque la atmósfera de la Tierra dispersa el azul y deja pasar el resto.'),
    G('Por eso en el atardecer se ve rojizo: la luz atraviesa más aire.', 20),
    CO('Y está caliente: su superficie ronda los 5.500 grados.', [B('Superficie del Sol', 5500, '≈ 5.500 °C', 'comida/lemon'), B('Un horno de pizza', 450, '≈ 450 °C')]),
    LL('Los astronautas lo ven blanco, sin amarillo, desde la órbita.', 'comida/lemon', 90),
    C('comida/lemon')], [
    { dato: 'El Sol es blanco visto desde el espacio; la atmósfera lo hace parecer amarillo', fuente: 'NASA, «Why is the Sun Yellow? (It isn’t)» y Universidad de Cornell, Curiosidades de astronomía' },
    { dato: 'Temperatura de la superficie solar: unos 5.500 °C', fuente: 'NASA, «Sun Fact Sheet»' }]],
  // 24
  ['nube', 'curiosidad', 'Una nube pesa 100 elefantes', ['nube', 'elefantes'], [
    P('Una nube blanca y esponjosa puede pesar lo mismo que cien elefantes.', 'botella'),
    F('Una nube cúmulo típica pesa unas 500 toneladas.', 'botella', 1),
    PI('Son unas 500.000 kilos de agua flotando sobre tu cabeza.', 'botella', 220, { desde: 0, hasta: 500, unidad: 'toneladas' }),
    G('Un elefante africano pesa unas cinco toneladas, así que son como cien elefantes en el aire.', 22),
    GL('No se cae porque el agua está en gotitas diminutas, sostenidas por el aire que sube.'),
    LL('Cuando las gotas se juntan y pesan demasiado, caen como lluvia.', 'naturaleza/rock_smallA', 100),
    C('botella')], [
    { dato: 'Una nube cúmulo de tamaño típico pesa unas 500 toneladas (1,1 millones de libras)', fuente: 'Peggy LeMone, científica del NCAR, citada por el Servicio Geológico de EE. UU. (USGS)' },
    { dato: 'Un elefante africano pesa unas 5 toneladas', fuente: 'WWF y Zoológico de San Diego' }]],
  // 25
  ['camello', 'mito', 'La joroba del camello', ['camello', 'joroba'], [
    P('Mito: los camellos guardan agua en la joroba. Lo que guardan ahí es grasa.', 'naturaleza/cactus_tall'),
    F('Una joroba llena puede guardar hasta unos 36 kilos de grasa.', 'naturaleza/cactus_tall', 1),
    G('Esa grasa es una reserva de energía: cuando no hay comida, el camello la va gastando.', 20),
    LL('Para aguantar sin agua, sus glóbulos rojos son ovalados y soportan mucha deshidratación.', 'naturaleza/cactus_tall', 90),
    CU('Y cuando por fin encuentran agua, pueden beber decenas de litros de una vez.', 'naturaleza/cactus_tall', 14),
    GL('Un camello puede perder una cuarta parte de su peso en agua y seguir caminando.'),
    C('naturaleza/cactus_tall')], [
    { dato: 'La joroba guarda grasa, hasta unos 36 kg', fuente: 'Enciclopedia Británica, «Camel» y Zoológico de San Diego' },
    { dato: 'Pueden perder hasta un 25 % de su peso en agua; glóbulos rojos ovalados', fuente: 'Enciclopedia Británica, «Camel»' }],
    'La cifra de 36 kilos es la que más se repite en las fuentes; varía según el animal.'],
  // 26
  ['pulhapanzak', 'honduras', 'Pulhapanzak: 43 metros', ['Pulhapanzak', '43'], [
    P('En Honduras hay una catarata de 43 metros: Pulhapanzak.', 'naturaleza/cliff_waterfall_rock'),
    F('Tiene unos 43 metros de altura, más que un edificio de 12 pisos.', 'naturaleza/cliff_waterfall_rock', 1),
    G('Cae del río Amapa y está cerca del Lago de Yojoa.', 18),
    LL('Dicen que su nombre viene del náhuatl y significa «agua que cae con fuerza».', 'naturaleza/cliff_waterfall_rock', 90),
    CU('Se puede caminar por un sendero que pasa por detrás de la cascada.', 'naturaleza/tree_palm', 16),
    GL('Está en San Buenaventura, Cortés, y es uno de los destinos naturales más visitados del país.'),
    C('naturaleza/cliff_waterfall_rock')], [
    { dato: 'Catarata de unos 43 m de altura, en el río Amapa (cerca de Yojoa)', fuente: 'Instituto Hondureño de Turismo (IHT)' }],
    'La altura y el significado del nombre salen de guías turísticas; puede variar un poco según la fuente.'],
  // 27
  ['diamantes', 'mito', 'Los diamantes no vienen del carbón', ['diamantes', 'carbón'], [
    P('Mito: los diamantes se hacen del carbón. Casi todos son mucho más antiguos que el carbón.', 'naturaleza/rock_tallA'),
    CO('El carbón tiene unos 300 millones de años; los diamantes, entre 1.000 y 3.500 millones.', [B('Carbón', 300, '≈ 300 M años', 'naturaleza/rock_tallA'), B('Diamantes', 1000, '1.000 a 3.500 M')]),
    F('El carbón se formó con plantas enterradas, cerca de la superficie.', 'naturaleza/tree_oak', 1),
    G('Los diamantes se forman a unos 150 kilómetros bajo tierra, con un calor y una presión enormes.', 20),
    LL('Los trae a la superficie un tipo de erupción volcánica muy rápida, que forma tubos llamados kimberlitas.', 'naturaleza/rock_tallA', 80),
    GL('Y los primeros diamantes se formaron mucho antes de que existieran las plantas terrestres.'),
    C('naturaleza/rock_tallA')], [
    { dato: 'Los diamantes naturales tienen entre 1.000 y 3.500 millones de años; se forman a unos 150-200 km de profundidad', fuente: 'Instituto Gemológico de América (GIA), «How Diamonds Form»' },
    { dato: 'El carbón se formó hace unos 300 millones de años, a partir de plantas', fuente: 'Servicio Geológico de EE. UU. (USGS)' }]],
  // 28
  ['marmuerto', 'curiosidad', 'En el Mar Muerto no te hundes', ['Mar', 'Muerto'], [
    P('En el Mar Muerto flotas sin hacer nada, y está a 430 metros bajo el nivel del mar.', 'comida/shaker-salt'),
    F('Es el punto más bajo de la superficie terrestre, a unos 430 metros bajo el nivel del mar.', 'comida/shaker-salt', 1),
    CO('Tiene casi diez veces más sal que el océano.', [B('Océano', 3.5, '3,5 %'), B('Mar Muerto', 34, '≈ 34 %', 'comida/shaker-salt')]),
    G('Por esa sal el agua es tan densa que cualquiera flota, incluso sin saber nadar.', 20),
    LL('Pero se está encogiendo: baja cerca de un metro cada año.', 'comida/shaker-salt', 100),
    GL('Está entre Israel, Jordania y Cisjordania, y casi ningún pez puede vivir allí.'),
    C('comida/shaker-salt')], [
    { dato: 'Punto más bajo de la superficie terrestre, unos 430 m bajo el nivel del mar', fuente: 'Enciclopedia Británica, «Dead Sea»' },
    { dato: 'Salinidad cercana al 34 %, frente a 3,5 % del océano', fuente: 'Enciclopedia Británica, «Dead Sea»' },
    { dato: 'El nivel baja alrededor de 1 m al año', fuente: 'Servicio Geológico de Israel y reportes de la ONU' }],
    'La cifra exacta de descenso del nivel varía por año; 1 metro es un promedio reciente.'],
  // 29
  ['lengua', 'mito', 'El mapa de sabores es falso', ['lengua', 'sabores'], [
    P('Mito: cada parte de la lengua detecta un sabor distinto. No, todas detectan todos.', 'comida/lollypop'),
    F('El «mapa de la lengua» nació de un estudio alemán de 1901, mal interpretado.', 'comida/lollypop', 1),
    G('Hoy se sabe que todas las zonas de la lengua detectan dulce, salado, ácido, amargo y umami.', 22),
    LL('Tienes miles de papilas gustativas, y cada una puede sentir los cinco sabores.', 'comida/lollypop', 100),
    GL('El quinto sabor, el umami, lo describió en 1908 el científico japonés Kikunae Ikeda.'),
    CU('Y la mayor parte de lo que llamamos «sabor» viene del olfato, no de la lengua.', 'comida/lemon', 14),
    C('comida/lollypop')], [
    { dato: 'El mapa de la lengua viene de una mala lectura del estudio de Hänig (1901)', fuente: 'Smithsonian Magazine, «The Tongue Map: Tasteless Myth Debunked»' },
    { dato: 'Todas las zonas detectan todos los sabores básicos', fuente: 'Instituto Nacional de Sordera y otros Trastornos de la Comunicación (NIDCD, EE. UU.)' },
    { dato: 'Umami descrito por Kikunae Ikeda en 1908', fuente: 'Enciclopedia Británica, «Umami»' }]],
  // 30
  ['bananarepublic', 'honduras', 'La «república bananera»', ['Honduras', 'república', 'bananera'], [
    P('La expresión «república bananera» nació hablando de Honduras. La inventó un escritor estadounidense.', 'comida/banana'),
    LI('Una frase que dio la vuelta al mundo.', [H(1896, 'O. Henry llega a Honduras', { objeto: 'comida/banana' }), H(1904, 'Publica «Cabbages and Kings»'), H(1950, 'Honduras, gran exportador de banano')]),
    F('El escritor O. Henry usó «banana republic» en un libro de 1904, inspirado en su estadía en Honduras.', 'comida/banana', 1),
    G('Lo usó para burlarse de países dominados por las compañías fruteras.', 22),
    LL('Honduras fue durante décadas uno de los mayores exportadores de banano del mundo.', 'comida/banana', 140),
    GL('Hoy la frase se usa en todo el mundo, casi siempre con un tono de crítica.'),
    C('comida/banana')], [
    { dato: 'O. Henry acuñó «banana republic» en «Cabbages and Kings» (1904), tras vivir en Honduras (1896)', fuente: 'Enciclopedia Británica, «Banana republic» y Biblioteca del Congreso de EE. UU.' },
    { dato: 'Honduras, gran exportador de banano en el siglo XX', fuente: 'Enciclopedia Británica, «Honduras: Economy»' }]]
];

let n = 0;
for (const [id, categoria, titulo, destacar, escenas, fuentes, nota] of EP) {
  n++;
  const g = { id, temporada: 2, episodio: n, titulo, categoria, destacar, escenas, fuentes, ...(nota ? { nota } : {}) };
  fs.writeFileSync(path.join(DIR_COLA, `1${String(n).padStart(2, '0')}-${id}.json`), JSON.stringify(g, null, 2) + '\n');
}
console.log(`${n} guiones escritos en ${DIR_COLA}`);
