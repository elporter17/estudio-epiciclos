// Genera los 30 guiones 3D de la Temporada 4 en video3d/guiones/cola/7NN-id.json: 10 de Honduras (los que van primero a Facebook),
// 12 mitos y 8 de escala. Temas nuevos: no están en las temporadas 1 a 3 ni en los 2D. Mismo formato y fuentes que la Temporada 3.
//   node scripts/lib/temporada4-guiones.mjs
import fs from 'node:fs';
import path from 'node:path';
import { DIR_COLA } from './video3d-cola.mjs';
import { variarEscenas } from './variar-escenas.mjs';

const P = (texto, objeto) => ({ tipo: 'portada', texto, objeto });
const C = (objeto) => ({ tipo: 'cierre', texto: '¿Lo sabías? Cuéntanos en los comentarios y síguenos para uno nuevo cada día.', objeto });
const F = (texto, objeto, cantidad = 1) => ({ tipo: 'foco', texto, objeto, cantidad });
const G = (texto, cantidad = 24) => ({ tipo: 'gente', texto, cantidad });
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
  ['himno-nacional', 'honduras', 'El himno nacional de Honduras', ['himno', 'Honduras'], [
    P('El himno nacional de Honduras tiene una historia de más de cien años.', 'libro'),
    F('La letra es de Augusto Constancio Coello y la música, del compositor alemán Carlos Hartling.', 'libro'),
    LI('Se hizo oficial a principios del siglo XX.', [H(1915, 'El Congreso lo declara himno nacional', { objeto: 'libro' })]),
    F('El himno tiene siete estrofas, pero en los actos oficiales casi siempre se canta el coro y una o dos estrofas.', 'libro'),
    G('Cada año, millones de estudiantes lo cantan en los actos cívicos de septiembre.', 28),
    C('libro')], [
    { dato: 'Letra de Augusto C. Coello, música de Carlos Hartling; declarado himno nacional en 1915', fuente: 'Secretaría de Cultura, Artes y Deportes de Honduras' }],
    'El número de estrofas que se cantan varía según el acto.'],
  ['roatan-piratas', 'honduras', 'Roatán, refugio de piratas', ['Roatán', 'piratas'], [
    P('Las islas de Honduras fueron un escondite de piratas.', 'naturaleza/canoe'),
    F('Roatán y las otras Islas de la Bahía, en el Caribe, tenían puertos naturales donde los barcos podían esconderse.', 'naturaleza/canoe'),
    F('Piratas como Henry Morgan las usaron como base en el siglo XVII para atacar a los barcos españoles.', 'naturaleza/tree_palm'),
    CU('Hoy esas aguas son famosas por sus arrecifes de coral y por el buceo.', 'naturaleza/tree_palm', 14),
    G('Roatán recibe cada año miles de turistas, entre ellos visitantes de los cruceros.', 24),
    C('naturaleza/canoe')], [
    { dato: 'Las Islas de la Bahía fueron refugio y base de piratas y corsarios en los siglos XVII y XVIII', fuente: 'Encyclopaedia Britannica, «Bay Islands»' }],
    'Qué pirata usó qué isla, y cuándo, varía según las fuentes.'],
  ['cerro-las-minas', 'honduras', 'El punto más alto de Honduras', ['Cerro', 'Minas'], [
    P('El punto más alto de Honduras es el Cerro Las Minas.', 'naturaleza/rock_tallA'),
    F('Mide unos 2.870 metros sobre el nivel del mar y está en el departamento de Lempira, en el parque nacional Celaque.', 'naturaleza/rock_tallA'),
    CO('Es mucho más bajo que el Everest, pero alto para Centroamérica.', [B('Cerro Las Minas', 2.87, '≈ 2.870 m', 'naturaleza/rock_tallA'), B('Monte Everest', 8.85, '8.849 m')]),
    F('El bosque nublado de Celaque guarda quebradas que dan agua a muchas comunidades.', 'naturaleza/tree_pineTallA'),
    G('Es un destino para quienes disfrutan de las caminatas largas.', 22),
    C('naturaleza/rock_tallA')], [
    { dato: 'Cerro Las Minas: ≈ 2.870 m, el punto más alto de Honduras (parque nacional Celaque)', fuente: 'Instituto de Conservación Forestal (ICF), Honduras; Encyclopaedia Britannica, «Honduras»' }]],
  ['golfo-fonseca', 'honduras', 'El golfo de tres países', ['golfo', 'Fonseca'], [
    P('Honduras tiene una costa en el Pacífico, y la comparte con dos países.', 'naturaleza/canoe'),
    F('El golfo de Fonseca lo comparten Honduras, El Salvador y Nicaragua.', 'naturaleza/canoe'),
    CO('Honduras tiene mucha más costa en el Caribe que en el Pacífico.', [B('Costa del Caribe', 670, '≈ 670 km', 'naturaleza/tree_palm'), B('Costa del Pacífico', 150, '≈ 150 km', 'naturaleza/canoe')]),
    F('Allí está Amapala, un puerto en la isla del Tigre, un antiguo volcán dentro del golfo.', 'naturaleza/rock_largeA'),
    G('Esa pequeña costa es la salida de Honduras al océano Pacífico.', 22),
    C('naturaleza/canoe')], [
    { dato: 'El golfo de Fonseca lo comparten Honduras, El Salvador y Nicaragua; Amapala está en la isla del Tigre', fuente: 'Encyclopaedia Britannica, «Gulf of Fonseca»' },
    { dato: 'Costas de Honduras: ≈ 670 km en el Caribe y ≈ 150 km en el Pacífico', fuente: 'CIA World Factbook, «Honduras»' }],
    'Las longitudes de costa cambian según cómo se mida.'],
  ['nueve-pueblos', 'honduras', 'Los nueve pueblos de Honduras', ['pueblos', 'Honduras'], [
    P('Honduras reconoce nueve pueblos indígenas y afrohondureños.', 'moneda'),
    F('Son los lenca, miskito, tolupán, pech, tawahka, maya chortí, garífuna, nahua y los negros de habla inglesa de las Islas de la Bahía.', 'moneda'),
    G('Cada pueblo tiene su lengua, su música, su comida y su forma de ver el mundo.', 26),
    F('Los maya chortí viven en el occidente, cerca de Copán, y los miskito, en La Mosquitia.', 'naturaleza/tree_palm'),
    F('Muchas de esas lenguas están en peligro, y varias comunidades trabajan para conservarlas.', 'libro'),
    C('moneda')], [
    { dato: 'Honduras reconoce nueve pueblos indígenas y afrohondureños', fuente: 'Secretaría de Desarrollo e Inclusión Social y Secretaría de Cultura de Honduras' }]],
  ['cafe-marcala', 'honduras', 'Café Marcala, el primero', ['café', 'Marcala'], [
    P('El café de Marcala fue el primero de Centroamérica con denominación de origen.', 'comida/cup-coffee'),
    LI('Marcala es un municipio de La Paz, en las montañas del occidente de Honduras.', [H(2005, 'Café Marcala recibe la denominación de origen', { objeto: 'comida/cup-coffee' })]),
    F('Una denominación de origen certifica que un producto viene de una zona específica y cumple ciertas reglas de calidad.', 'comida/cup-coffee'),
    CU('Allí se cultiva a gran altura, y sus cafés se conocen por ser dulces y de buen cuerpo.', 'naturaleza/plant_bush', 16),
    G('Honduras es el mayor productor de café de Centroamérica.', 24),
    C('comida/cup-coffee')], [
    { dato: 'Café Marcala: primera denominación de origen para el café en Honduras y en Centroamérica (2005)', fuente: 'Instituto Hondureño del Café (IHCAFE) y Secretaría de Agricultura' },
    { dato: 'Honduras: mayor productor de café de Centroamérica', fuente: 'Organización Internacional del Café (ICO)' }],
    'La posición como mayor productor puede cambiar de un año a otro.'],
  ['manati-cuero-salado', 'honduras', 'El manatí de Cuero y Salado', ['manatí', 'Cuero'], [
    P('En Honduras viven manatíes, los «vacas marinas» del Caribe.', 'comida/fish'),
    F('Uno de los lugares donde se pueden ver es el refugio Cuero y Salado, cerca de La Ceiba.', 'comida/fish'),
    F('Un manatí adulto puede medir unos tres metros y pesar cerca de 500 kilos, y se alimenta de plantas acuáticas.', 'comida/fish'),
    G('Están en peligro, y la principal amenaza son los choques con lanchas y la pérdida de su hábitat.', 22),
    CU('Los recorridos en bote por los canales del refugio permiten ver monos, aves y, con suerte, un manatí.', 'naturaleza/tree_palm', 14),
    C('comida/fish')], [
    { dato: 'Refugio de Vida Silvestre Cuero y Salado, hábitat del manatí antillano', fuente: 'Instituto de Conservación Forestal (ICF) y Fundación Cuero y Salado (FUCSA)' },
    { dato: 'El manatí antillano: ≈ 3 m y ≈ 500 kg; está en peligro', fuente: 'NOAA Fisheries y UICN' }]],
  ['mundial-1982', 'honduras', 'Honduras en el Mundial de 1982', ['Honduras', '1982'], [
    P('Honduras jugó su primer Mundial en 1982 y empató con la anfitriona.', 'balon'),
    LI('Fue la primera vez que la selección llegó a una Copa del Mundo.', [H(1982, 'Mundial de España', { objeto: 'balon' }), H(2010, 'Mundial de Sudáfrica'), H(2014, 'Mundial de Brasil')]),
    F('En su debut empató 1 a 1 con España, que jugaba en casa.', 'balon'),
    F('Honduras logró otros dos empates en esa fase, y volvió a un Mundial recién en 2010.', 'balon'),
    G('Aquella selección es recordada con cariño por los aficionados hondureños.', 24),
    C('balon')], [
    { dato: 'Mundial de 1982: Honduras empató 1-1 con España; participó también en 2010 y 2014', fuente: 'FIFA, historial de participación de Honduras' }],
    'Conviene revisar los resultados completos en la web de la FIFA.'],
  ['alfombras-comayagua', 'honduras', 'Las alfombras de Comayagua', ['alfombras', 'Comayagua'], [
    P('Cada Semana Santa, las calles de Comayagua se llenan de alfombras de aserrín.', 'naturaleza/flower_redA'),
    F('Se hacen con aserrín teñido, flores y semillas, y forman dibujos de colores sobre el pavimento.', 'naturaleza/flower_redA'),
    F('La procesión del Viernes Santo pasa por encima de ellas, y en unas horas desaparecen.', 'naturaleza/flower_redA'),
    G('Cientos de familias y jóvenes trabajan durante la noche para terminarlas a tiempo.', 24),
    F('Es una de las tradiciones religiosas más conocidas de Honduras.', 'naturaleza/flower_yellowA'),
    C('naturaleza/flower_redA')], [
    { dato: 'Alfombras de aserrín de la Semana Santa en Comayagua', fuente: 'Instituto Hondureño de Turismo (IHT) y alcaldía de Comayagua' }]],
  ['carnaval-ceiba', 'honduras', 'El carnaval de La Ceiba', ['carnaval', 'Ceiba'], [
    P('El carnaval de La Ceiba es la fiesta más grande de la costa hondureña.', 'naturaleza/tree_palm'),
    F('Se celebra cada mayo, en honor a San Isidro Labrador, patrono de la ciudad.', 'naturaleza/tree_palm'),
    G('El gran desfile reúne comparsas, carrozas y bailarines en la avenida San Isidro.', 28),
    F('Atrae a miles de visitantes de Honduras y de otros países.', 'naturaleza/tree_palm'),
    F('Y la ciudad es la puerta de entrada a Pico Bonito, las playas y las Islas de la Bahía.', 'naturaleza/tree_default'),
    C('naturaleza/tree_palm')], [
    { dato: 'Feria y Gran Carnaval de La Ceiba en mayo, en honor a San Isidro Labrador', fuente: 'Instituto Hondureño de Turismo y municipalidad de La Ceiba' }]],
  // ---------- Mitos (12) ----------
  ['lado-oscuro-luna', 'mito', 'La Luna no tiene lado oscuro', ['Luna', 'lado'], [
    P('Mito: la Luna tiene un lado oscuro que nunca recibe luz.', 'moneda'),
    F('Siempre vemos la misma cara de la Luna, porque tarda lo mismo en girar sobre sí misma que en dar una vuelta a la Tierra.', 'moneda'),
    F('Pero la otra cara sí recibe luz del Sol: se llama lado lejano, no lado oscuro.', 'moneda'),
    G('Durante la luna nueva, el lado que no vemos está completamente iluminado.', 22),
    C('moneda')], [
    { dato: 'La Luna tiene rotación sincrónica; su cara oculta recibe luz solar', fuente: 'NASA, «Moon Facts» y «Far Side of the Moon»' }]],
  ['fases-sombra', 'mito', 'Las fases no son sombra', ['fases', 'Luna'], [
    P('Mito: las fases de la Luna son la sombra de la Tierra.', 'moneda'),
    F('Esa sombra solo aparece en los eclipses de Luna, que son raros.', 'moneda'),
    F('Las fases dependen de cuánta parte de la cara iluminada de la Luna vemos desde la Tierra, mientras da la vuelta.', 'moneda'),
    G('Por eso la Luna completa sus fases en unos 29 días y medio.', 22),
    C('moneda')], [
    { dato: 'Las fases se deben a la posición relativa Sol-Tierra-Luna; ciclo de ≈ 29,5 días', fuente: 'NASA, «Moon Phases»' }]],
  ['crujir-dedos', 'mito', 'Crujir los dedos no da artritis', ['dedos', 'artritis'], [
    P('Mito: crujirte los dedos te da artritis.', 'ladrillo'),
    F('El sonido viene de burbujas de gas en el líquido de la articulación, no de que se desgaste el hueso.', 'ladrillo'),
    F('Un médico se crujió los nudillos de una sola mano por más de 60 años y no desarrolló artritis, ni en esa mano ni en la otra.', 'ladrillo'),
    G('Varios estudios no encontraron relación entre el hábito y la artritis.', 22),
    C('ladrillo')], [
    { dato: 'Experimento de Donald Unger durante más de 60 años; estudios sin relación con artritis', fuente: 'Unger (1998), Arthritis & Rheumatism; Deweber et al. (2011), Journal of the American Board of Family Medicine' }],
    'Si crujir te duele o se hincha la articulación, conviene consultar a un médico.'],
  ['nadar-tras-comer', 'mito', 'Esperar dos horas para nadar', ['nadar', 'comer'], [
    P('Mito: si nadas justo después de comer, te da un corte de digestión.', 'comida/sandwich'),
    F('No hay evidencia de que comer y nadar provoque ahogamientos por la digestión.', 'comida/sandwich'),
    F('Lo que sí puede pasar es un malestar o un calambre leve si comes mucho y haces un esfuerzo fuerte.', 'comida/sandwich'),
    G('Los riesgos más serios en el agua son el alcohol, el cansancio y nadar sin vigilancia.', 22),
    C('comida/sandwich')], [
    { dato: 'No hay evidencia de que nadar tras comer cause calambres peligrosos', fuente: 'Cruz Roja Estadounidense y Mayo Clinic' }]],
  ['leer-poca-luz', 'mito', 'Leer con poca luz no daña', ['leer', 'luz'], [
    P('Mito: leer con poca luz daña los ojos para siempre.', 'libro'),
    F('Cansa la vista y puede dar dolor de cabeza, pero no causa un daño permanente.', 'libro'),
    F('Con poca luz, parpadeamos menos y forzamos los músculos del ojo, y por eso se cansan.', 'libro'),
    G('Una buena luz ayuda a leer más cómodo, aunque no cambia la salud de tus ojos a largo plazo.', 22),
    C('libro')], [
    { dato: 'Leer con poca luz no causa daño permanente a los ojos; produce fatiga visual', fuente: 'American Academy of Ophthalmology' }]],
  ['perros-blanco-negro', 'mito', 'Los perros sí ven colores', ['perros', 'colores'], [
    P('Mito: los perros ven todo en blanco y negro.', 'comida/hot-dog'),
    F('Ven menos colores que nosotros: distinguen sobre todo azules y amarillos.', 'comida/hot-dog'),
    F('El rojo y el verde se ven para ellos como tonos de gris o de amarillo apagado.', 'comida/hot-dog'),
    G('Por eso una pelota roja sobre el pasto verde puede ser difícil de ver para un perro.', 22),
    C('comida/hot-dog')], [
    { dato: 'Los perros tienen visión dicromática (azul y amarillo)', fuente: 'Neitz, Geist y Jacobs (1989), Visual Neuroscience; American Kennel Club' }]],
  ['astronautas-gravedad', 'mito', 'En la Estación sí hay gravedad', ['gravedad', 'astronautas'], [
    P('Mito: los astronautas flotan porque no hay gravedad.', 'balon'),
    F('A la altura de la Estación Espacial, la gravedad todavía es cerca del 90 % de la que sentimos en el suelo.', 'balon'),
    F('Flotan porque están en caída libre: la Estación cae sin parar alrededor de la Tierra, y ellos con ella.', 'balon'),
    G('Se llama microgravedad: es como un ascensor que cae, pero nunca llega al suelo.', 22),
    C('balon')], [
    { dato: 'A ≈ 400 km de altura la gravedad es ≈ 90 % de la de la superficie; la sensación de ingravidez es caída libre', fuente: 'NASA, «What is microgravity?»' }]],
  ['cerebro-dolor', 'mito', 'El cerebro no siente dolor', ['cerebro', 'dolor'], [
    P('Mito: el cerebro siente dolor cuando te duele la cabeza.', 'libro'),
    F('El tejido del cerebro no tiene receptores de dolor, y por eso no siente nada si lo tocan.', 'libro'),
    F('El dolor de cabeza viene de los vasos sanguíneos, los músculos y las membranas que lo rodean.', 'libro'),
    G('Por eso se puede operar el cerebro con el paciente despierto, y sin que le duela.', 22),
    C('libro')], [
    { dato: 'El tejido cerebral no tiene nociceptores; el dolor de cabeza se origina en estructuras vecinas', fuente: 'American Migraine Foundation y Mayo Clinic' }]],
  ['inuit-nieve', 'mito', 'Cien palabras para la nieve', ['palabras', 'nieve'], [
    P('Mito: los inuit tienen cien palabras para decir nieve.', 'naturaleza/tree_pineTallA'),
    F('Las lenguas inuit arman palabras largas pegando partes, así que cuentan las palabras de otra forma.', 'naturaleza/tree_pineTallA'),
    F('Tienen varios términos para nieve, y también el español, el inglés y otras lenguas: «nevada», «ventisca», «aguanieve».', 'naturaleza/tree_pineTallA'),
    G('La cifra de cien se fue inflando con el tiempo, sin base en un estudio.', 22),
    C('naturaleza/tree_pineTallA')], [
    { dato: 'El mito de las «cien palabras» para nieve no tiene respaldo lingüístico', fuente: 'Pullum (1991), «The Great Eskimo Vocabulary Hoax»; Martin (1986), American Anthropologist' }],
    'El debate lingüístico sigue: depende de qué se considere una «palabra».'],
  ['perezoso-sueno', 'mito', 'El perezoso no duerme tanto', ['perezoso', 'sueño'], [
    P('Mito: los perezosos duermen 20 horas al día.', 'naturaleza/bed'),
    F('Eso se midió en perezosos en cautiverio, donde se mueven poco.', 'naturaleza/bed'),
    F('En la selva, los perezosos duermen cerca de 9 o 10 horas.', 'naturaleza/bed'),
    G('Son lentos porque comen hojas, que dan poca energía, y no porque duerman todo el día.', 22),
    C('naturaleza/bed')], [
    { dato: 'Perezosos silvestres: ≈ 9,6 h de sueño al día frente a ≈ 16 h en cautiverio', fuente: 'Rattenborg et al. (2008), Biology Letters' }]],
  ['elefante-raton', 'mito', 'Elefantes y ratones', ['elefantes', 'ratones'], [
    P('Mito: los elefantes se asustan con los ratones.', 'comida/cheese'),
    F('No hay ninguna prueba de que lo hagan: es un cuento popular que se repite desde hace siglos.', 'comida/cheese'),
    F('Cuando un experimento puso ratones en el camino de los elefantes, ellos casi no reaccionaron.', 'comida/cheese'),
    G('Lo que sí les molesta son animales más grandes que pueden amenazar a las crías, y las abejas.', 22),
    C('comida/cheese')], [
    { dato: 'No hay evidencia de que los elefantes teman a los ratones; sí reaccionan a las abejas', fuente: 'King, Douglas-Hamilton y Vollrath (2007), Current Biology; Smithsonian National Zoo' }]],
  ['cafe-crecimiento', 'mito', 'El café no frena el crecimiento', ['café', 'crecimiento'], [
    P('Mito: tomar café de niño te hace crecer menos.', 'comida/cup-coffee'),
    F('No hay estudios que muestren que el café reduzca la estatura final.', 'comida/cup-coffee'),
    F('Lo que sí puede hacer en niños y adolescentes es quitarles el sueño y ponerlos nerviosos.', 'comida/cup-coffee'),
    G('Por eso se recomienda que no tomen mucha cafeína, aunque no afecte los huesos.', 22),
    C('comida/cup-coffee')], [
    { dato: 'No hay evidencia de que el café afecte la estatura; sí puede alterar el sueño', fuente: 'Academia Estadounidense de Pediatría y Mayo Clinic' }]],
  // ---------- Escala (8) ----------
  ['avion-al-sol', 'ciencia', 'Un avión tardaría 19 años', ['avión', '19'], [
    P('Si un avión volara hasta el Sol, tardaría unos 19 años.', 'autos/suv'),
    CO('El Sol está a unos 150 millones de kilómetros de la Tierra.', [B('Tierra al Sol', 150, '≈ 150 M km', 'moneda'), B('Tierra a la Luna', 0.384, '384.000 km')]),
    LL('A 900 kilómetros por hora, el viaje duraría casi 19 años seguidos, sin parar.', 'autos/suv', 90, { desde: 0, hasta: 19, unidad: 'años' }),
    G('La luz, en cambio, llega en poco más de 8 minutos.', 22),
    C('moneda')], [
    { dato: 'Distancia media Tierra-Sol ≈ 149,6 millones de km; a 900 km/h son ≈ 19 años', fuente: 'NASA, «Sun Fact Sheet»; cálculo directo' }]],
  ['sol-vuelta-galaxia', 'ciencia', 'Un año galáctico dura 230 M', ['galaxia', 'millones'], [
    P('El Sol tarda unos 230 millones de años en dar una vuelta a la galaxia.', 'moneda'),
    F('Viaja a más de 700.000 kilómetros por hora alrededor del centro de la Vía Láctea.', 'moneda'),
    LI('La última vez que estuvo en este punto de la galaxia, había dinosaurios.', [H(-230, 'Aparecen los primeros dinosaurios', { etiqueta_anio: 'Hace 230 M', objeto: 'moneda' }), H(-66, 'Se extinguen los dinosaurios', { etiqueta_anio: 'Hace 66 M' }), H(2026, 'Hoy', { etiqueta_anio: 'Hoy' })]),
    G('Desde que nació, el Sol ha dado unas 20 vueltas a la galaxia.', 22),
    C('moneda')], [
    { dato: 'El Sol da una vuelta a la Vía Láctea en ≈ 225-250 millones de años', fuente: 'NASA, «Milky Way Galaxy»; Reid et al. (2014), The Astrophysical Journal' }],
    'El valor exacto varía según el estudio.'],
  ['eiffel-crece', 'ciencia', 'La Torre Eiffel crece en verano', ['Eiffel', 'verano'], [
    P('La Torre Eiffel crece unos 15 centímetros en verano.', 'ciudad/building-type-m'),
    F('Es de hierro, y el hierro se dilata con el calor: en un día muy caliente, la torre se alarga.', 'ciudad/building-type-m'),
    F('En invierno vuelve a encogerse, y el sol también la inclina unos centímetros hacia el lado opuesto.', 'ciudad/building-type-m'),
    CO('Mide unos 330 metros de alto, casi como un edificio de 80 pisos.', [B('Torre Eiffel', 330, '≈ 330 m', 'ciudad/building-type-m'), B('Edificio de 10 pisos', 35, '≈ 35 m')]),
    C('ciudad/building-type-m')], [
    { dato: 'La torre puede crecer hasta ≈ 15 cm por la dilatación térmica; mide ≈ 330 m', fuente: 'Sociedad de Explotación de la Torre Eiffel (SETE)' }]],
  ['canal-panama', 'ciencia', 'El Canal que sube barcos', ['Canal', 'Panamá'], [
    P('En el Canal de Panamá, los barcos suben una montaña de agua.', 'naturaleza/canoe'),
    LI('El canal une el Atlántico y el Pacífico desde hace más de cien años.', [H(1914, 'Se inaugura el Canal de Panamá', { objeto: 'naturaleza/canoe' }), H(2016, 'Abre la ampliación')]),
    F('Cada barco sube unos 26 metros por esclusas hasta el lago Gatún, y luego baja del otro lado.', 'naturaleza/canoe'),
    F('Mide unos 80 kilómetros y cruzarlo toma entre 8 y 10 horas.', 'naturaleza/canoe'),
    G('Cada año cruzan por allí miles de barcos de todo el mundo.', 22),
    C('naturaleza/canoe')], [
    { dato: 'Canal inaugurado en 1914; los barcos suben ≈ 26 m hasta el lago Gatún; ≈ 80 km', fuente: 'Autoridad del Canal de Panamá (ACP)' }]],
  ['polvo-sahara-amazonas', 'ciencia', 'El polvo que abona el Amazonas', ['polvo', 'Sahara'], [
    P('El polvo del Sahara viaja por el aire hasta el Amazonas.', 'naturaleza/rock_smallA'),
    LL('Cada año, unos 180 millones de toneladas de polvo salen del Sahara sobre el Atlántico.', 'naturaleza/rock_smallA', 130, { desde: 0, hasta: 180, unidad: 'millones de toneladas' }),
    F('Unos 28 millones de toneladas caen sobre el Amazonas, y llevan fósforo, un nutriente que la selva necesita.', 'naturaleza/tree_default'),
    G('El polvo viene de un lago seco, la depresión de Bodélé, y cruza el océano en una semana.', 22),
    C('naturaleza/rock_smallA')], [
    { dato: '≈ 182 Mt de polvo salen del Sahara y ≈ 27,7 Mt caen en el Amazonas; fertilizan con fósforo', fuente: 'NASA, estudio CALIPSO (Yu et al., 2015), Geophysical Research Letters' }]],
  ['shinkansen-puntual', 'ciencia', 'El tren bala más puntual', ['tren', 'puntual'], [
    P('El tren bala japonés se atrasa, en promedio, menos de un minuto.', 'autos/race-future'),
    LI('El Shinkansen empezó a funcionar en 1964, justo antes de los Juegos Olímpicos de Tokio.', [H(1964, 'Primer Shinkansen', { objeto: 'autos/race-future' })]),
    F('Hoy algunos trenes superan los 300 kilómetros por hora.', 'autos/race-future'),
    G('Sale cada pocos minutos y casi siempre llega a su hora exacta.', 22),
    C('autos/race-future')], [
    { dato: 'Shinkansen desde 1964; retraso medio < 1 minuto en la línea Tokaido; velocidad > 300 km/h', fuente: 'JR Central, «Shinkansen» y Encyclopaedia Britannica' }]],
  ['pacifico-gigante', 'ciencia', 'El Pacífico y toda la tierra', ['Pacífico', 'tierra'], [
    P('El océano Pacífico es más grande que toda la tierra firme.', 'botella'),
    CO('Cubre unos 165 millones de kilómetros cuadrados; todos los continentes juntos, unos 149.', [B('Océano Pacífico', 165, '≈ 165 M km²', 'botella'), B('Todos los continentes', 149, '≈ 149 M km²', 'naturaleza/tree_default')]),
    F('Es tan grande que ocupa casi un tercio de la superficie de la Tierra.', 'botella'),
    G('Y tiene el punto más profundo del planeta: la fosa de las Marianas.', 22),
    C('botella')], [
    { dato: 'Pacífico ≈ 165 M km²; superficie terrestre ≈ 149 M km²', fuente: 'NOAA, «How big is the Pacific Ocean?»' }]],
  ['dias-se-alargan', 'ciencia', 'Los días se alargan', ['días', 'alargan'], [
    P('Los días se alargan un poquito cada siglo.', 'moneda'),
    F('La Luna frena la rotación de la Tierra con las mareas, y cada siglo el día dura unos 2 milisegundos más.', 'moneda'),
    LI('Hace mucho, los días eran más cortos.', [H(-400, 'Hace 400 millones de años, el día duraba ≈ 22 horas', { etiqueta_anio: 'Hace 400 M', objeto: 'moneda' }), H(2026, 'Hoy, 24 horas', { etiqueta_anio: 'Hoy' })]),
    G('Pero es tan lento que ni siquiera lo notamos en toda una vida.', 22),
    C('moneda')], [
    { dato: 'El día se alarga ≈ 1,7-2 ms por siglo por la fricción de las mareas', fuente: 'NASA y Observatorio Real de Bélgica; Stephenson, Morrison y Hohenkerk (2016)' },
    { dato: 'Hace ≈ 400 M de años el día duraba ≈ 22 h (corales fósiles)', fuente: 'Wells (1963), Nature' }]]
];

let n = 0;
for (const [id, categoria, titulo, destacar, escenas, fuentes, nota] of EP) {
  n++;
  const g = { id, temporada: 4, episodio: n, titulo, categoria, destacar, escenas: variarEscenas(escenas), fuentes, ...(nota ? { nota } : {}) };
  fs.writeFileSync(path.join(DIR_COLA, `7${String(n).padStart(2, '0')}-${id}.json`), JSON.stringify(g, null, 2) + '\n');
}
console.log(`${n} guiones 3D de la Temporada 4 escritos en ${DIR_COLA}`);
