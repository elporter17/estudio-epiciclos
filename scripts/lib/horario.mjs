// Horario de publicación, hora de Honduras (UTC-6). Desde el 2026-11-09 la fuente de la verdad es la tabla
// «programacion» de Supabase (scripts/lib/programacion.mjs, supabase/programacion.sql): HORARIO de aquí abajo es el
// respaldo (si Supabase no responde) y lo que llenó la tabla la primera vez. El relojero (/api/relojero, llamado cada
// 10 min por cron-job.org) lanza en GitHub Actions lo que toca, el panel (/panel.html) lo muestra y el tablero local
// lo resume. GitHub ya no programa nada por su cuenta (sus «schedule» se perdían o llegaban con horas de atraso).
//   { hora: 'HH:MM', workflow, que, inputs?, fecha?, dias? }   fecha: solo ese día (AAAA-MM-DD); dias: solo esos días
//   de la semana (0 = domingo … 6 = sábado)
const R = 'curiosidades-reels.yml';

// ---------- Plan por red (2026-11-06, con las estadísticas de Meta Business Suite de los últimos 90 días) ----------
// Instagram: Banderas y Retos rinden ~1.250 vistas de mediana (Emojis ~825); Quiz, Noticias, GTA, Datos y «Cómo se hace»
// se quedan en ~130 → Instagram solo recibe las estrellas y lo de más esfuerzo, unas 6 al día.
// Facebook: los Reels rinden parejo (~250) y las imágenes muy poco (~15-25) → estrellas en las mejores horas y relleno en
// los huecos.
// TikTok (TikTok Studio, 88 publicaciones del 16-oct al 6-nov): todo formato saca ~500 vistas de mediana (nombres ~410,
// futbolistas ~530, GTA ~550, retos ~500) y la hora casi no cambia nada → cuantas más piezas, más vistas en total, hasta
// ~7 al día (el 17-oct, con 12, la mediana cayó a 183). 6 al día, con 2 h entre una y otra. El límite es de 5 borradores
// SIN PUBLICAR por cuenta: si publicas cada borrador cuando llega el aviso de Telegram, caben las 6.
// YouTube: ~6 subidas al día de cuota → 5 Shorts (+ el video largo martes, jueves y sábado).
// Regla de espacio: después de una estrella (video 3D, «Cómo se hace») no sale nada en esa red durante ~2 horas.
// Cada pieza: { hora, workflow, que, inputs, redes: { fb, ig, tt, yt } }. Si varias redes comparten pieza y hora, se
// genera una vez y sale en todas; el resto va por su cuenta.
const PIEZAS = {
  noticias: { workflow: R, que: 'Reel: noticias de hoy', inputs: { formato: 'noticias' } },
  banderas: { workflow: R, que: 'Reel estrella: banderas', inputs: { formato: 'banderas' } },
  retos: { workflow: R, que: 'Reel estrella: retos visuales', inputs: { formato: 'retos' } },
  estrella: { workflow: R, que: 'Reel estrella: banderas o retos (un día cada uno)', inputs: { formato: 'estrella' } },
  prefieres: { workflow: R, que: 'Reel de relleno: ¿qué prefieres?', inputs: { formato: 'prefieres' } },
  emojis: { workflow: R, que: 'Reel: adivina con emojis', inputs: { formato: 'emojis' } },
  quiz: { workflow: R, que: 'Reel de relleno: quiz o top 10', inputs: { formato: 'auto' } },
  comosehace: { workflow: 'como-se-hace.yml', que: 'Cómo se hace: la fábrica en 2D (más de 1 min)' },
  video3d1: { workflow: 'video3d.yml', que: 'Video 3D de datos (mediodía)', inputs: { modo: 'publicar', turno: 'mediodia' } },
  video3d2: { workflow: 'video3d.yml', que: 'Video 3D de datos (tarde, la hora de más vistas)', inputs: { modo: 'publicar', turno: 'tarde' } },
  imagen: { workflow: 'curiosidades-facebook.yml', que: 'Imagen de relleno: reto visual o curiosidad' },
  debate: { workflow: R, que: 'Reel de debate: 5 retos que dividen a internet', inputs: { formato: 'debate' } },
  debateimg: { workflow: 'curiosidades-facebook.yml', que: 'Imagen de debate: error a propósito, «el 90 % falla» o «¿cuántos ves?»', inputs: { tipo: 'debate' } },
  noticiasimg: { workflow: 'curiosidades-facebook.yml', que: 'Noticias en imágenes: carrusel con titular y resumen', inputs: { tipo: 'noticias' } },
  gta: { workflow: 'gta6.yml', que: 'Reel GTA VI «Faltan N días»' },
  nombres: { workflow: 'nombres.yml', que: 'Nombre o pareja con círculos' },
  famosos: { workflow: 'famosos.yml', que: 'Futbolista dibujado con círculos' },
  // Reenvío de un video ya generado (bot: «🎬 Videos» → 🔁): lleva en inputs el video, su corrida y su archivo
  reenvio: { workflow: 'republicar.yml', que: 'Reenvío de un video ya publicado' }
};
// Solo de TikTok: no usan «redes»
const SOLO_TT = new Set(['nombres', 'famosos']);
// 2026-11-06: retos de debate (scripts/lib/debate.mjs) en lugar de «¿Qué prefieres?» (14:30) y el quiz de la noche (22:30)
// 2026-11-07: noticias en FB, IG y TikTok (no YouTube); GTA VI a las 13:45 en las 4 redes. YouTube: como mucho 6
// subidas al día por la cuota (los retos de las 15:45 ya no van a YouTube)
// 2026-11-07: Facebook solo da alcance a los primeros ~6 Reels del día (del 7.º en adelante, 0 a 15 vistas: 2 al 7 de
// noviembre). Facebook queda en 6 Reels (más las imágenes, que no cuentan); noticias, Cómo se hace y los retos de las
// 15:45 siguen en Instagram, TikTok y YouTube
const PLAN = {
  fb: { '09:00': 'banderas', '12:17': 'video3d1', '13:45': 'gta', '14:30': 'debate', '16:45': 'imagen', '18:30': 'video3d2', '20:30': 'estrella', '22:30': 'debateimg' },
  ig: { '07:30': 'noticias', '09:00': 'banderas', '10:30': 'comosehace', '12:17': 'video3d1', '13:45': 'gta', '15:45': 'retos', '18:30': 'video3d2', '20:30': 'estrella', '22:30': 'debateimg' },
  tt: { '07:30': 'noticias', '08:15': 'nombres', '10:30': 'comosehace', '12:17': 'video3d1', '13:45': 'gta', '15:00': 'famosos', '18:30': 'video3d2', '20:30': 'estrella' },
  yt: { '09:00': 'banderas', '10:30': 'comosehace', '12:17': 'video3d1', '13:45': 'gta', '18:30': 'video3d2' }
};
// Junta los planes: una corrida por hora y pieza, con las redes que la piden
function juntarPlanes() {
  const slots = new Map();
  for (const [red, plan] of Object.entries(PLAN)) for (const [hora, pieza] of Object.entries(plan)) {
    const k = `${hora}|${pieza}`; if (!slots.has(k)) slots.set(k, { hora, pieza, redes: [] }); slots.get(k).redes.push(red);
  }
  return [...slots.values()].map(({ hora, pieza, redes }) => armarSlot(pieza, hora, redes));
}
const RED_NOMBRE = { fb: 'FB', ig: 'IG', tt: 'TikTok', yt: 'YouTube' };
// Redes de siempre de una pieza: donde la pone el plan (o solo TikTok / solo Facebook)
export const redesDePieza = (pieza) => SOLO_TT.has(pieza) ? ['tt'] : (() => { const r = Object.keys(PLAN).filter((red) => Object.values(PLAN[red]).includes(pieza)); return r.length ? r : (POSIBLES[pieza] || ['fb']); })();
// Una corrida de una pieza a una hora, para esas redes
// Dónde puede salir cada pieza (lo que su workflow sabe publicar); los Reels, en las 4
const POSIBLES = { imagen: ['fb', 'ig'], noticiasimg: ['fb', 'ig'], debateimg: ['fb', 'ig'], nombres: ['tt'], famosos: ['tt'], largo: ['yt'] };
export const redesPosibles = (pieza) => POSIBLES[pieza] || ['fb', 'ig', 'tt', 'yt'];
export function armarSlot(pieza, hora, redes = redesDePieza(pieza)) {
  const p = PIEZAS[pieza], orden = SOLO_TT.has(pieza) ? ['tt'] : ['fb', 'ig', 'tt', 'yt'].filter((r) => redes.includes(r) && redesPosibles(pieza).includes(r));
  const inputs = SOLO_TT.has(pieza) ? p.inputs : { ...(p.inputs || {}), redes: orden.join(',') };
  return { hora, pieza, workflow: p.workflow, que: `${p.que} → ${orden.map((r) => RED_NOMBRE[r]).join(', ')}`, ...(inputs ? { inputs } : {}) };
}

// Lo que no es una pieza del plan de cada red (renders, juntar noticias, metas, comentarios, video largo). «conPieza»:
// el slot lleva «pieza» (así se ve y se edita en el bot)
export const EXTRAS = {
  render3d1: { workflow: 'video3d.yml', que: 'Video 3D: render del de mediodía', inputs: { modo: 'render', turno: 'mediodia' } },
  render3d2: { workflow: 'video3d.yml', que: 'Video 3D: render del de la tarde', inputs: { modo: 'render', turno: 'tarde' } },
  juntarnoticias: { workflow: 'noticias.yml', que: 'Juntar noticias del día' },
  comentarios: { workflow: 'comentarios.yml', que: 'Responder comentarios' },
  metas: { workflow: 'metas.yml', que: 'Metas semanales: fotos e historias que falten → FB', conPieza: true },
  largo: { workflow: 'youtube-largo.yml', que: 'Video largo de YouTube: cómo se hacen 6 cosas', conPieza: true },
  vistas: { workflow: 'vistas.yml', que: 'Vistas de lo publicado → Supabase (para reenviar lo que tuvo pocas)' }
};
// La clave (pieza o extra) de un slot del horario
export const claveDe = (s) => s.pieza || (s.workflow === 'video3d.yml' && s.inputs?.modo === 'render' ? (s.inputs.turno === 'tarde' ? 'render3d2' : 'render3d1') : Object.keys(EXTRAS).find((k) => EXTRAS[k].workflow === s.workflow));

export const HORARIO = [
  // Los dos videos 3D del día se renderizan de madrugada (~40-55 min cada uno en GitHub)
  { hora: '00:37', workflow: 'video3d.yml', que: 'Video 3D: render del de mediodía', inputs: { modo: 'render', turno: 'mediodia' } },
  { hora: '01:47', workflow: 'video3d.yml', que: 'Video 3D: render del de la tarde', inputs: { modo: 'render', turno: 'tarde' } },
  // Respaldo: si el render falló (p. ej. npm ci con 504), se intenta otra vez; si ya hay uno listo, sale en 3-5 min
  { hora: '03:27', workflow: 'video3d.yml', que: 'Video 3D: respaldo del render de mediodía', inputs: { modo: 'render', turno: 'mediodia' } },
  { hora: '04:37', workflow: 'video3d.yml', que: 'Video 3D: respaldo del render de la tarde', inputs: { modo: 'render', turno: 'tarde' } },
  { hora: '06:23', workflow: 'noticias.yml', que: 'Juntar noticias del día' },
  { hora: '23:25', workflow: 'vistas.yml', que: 'Vistas de lo publicado → Supabase (para reenviar lo que tuvo pocas)' },
  ...juntarPlanes(),
  // Lanzamiento de GTA VI: un Reel especial a media mañana (el especial 3D sale a las 18:30)
  { hora: '11:15', pieza: 'gta', workflow: 'gta6.yml', que: 'Especial de lanzamiento de GTA VI → FB, IG, TikTok, YouTube', inputs: { lanzamiento: 'true', redes: 'fb,ig,tt,yt' }, fecha: '2026-11-19' },
  // Video largo horizontal para YouTube (8 a 10 min; tarda unos 15 min en hacerse): martes, jueves y sábado
  { hora: '14:07', pieza: 'largo', workflow: 'youtube-largo.yml', que: 'Video largo de YouTube: cómo se hacen 6 cosas', dias: [2, 4, 6] }
];
// Metas semanales de Facebook (fotos e historias que pide el panel): lejos de las estrellas (scripts/metas.mjs)
for (const hora of ['11:07']) HORARIO.push({ hora, pieza: 'metas', workflow: 'metas.yml', que: 'Metas semanales: fotos e historias que falten → FB' });
// Respuestas a comentarios: cada hora de 7:47 a 23:47 (cuanto antes se contesta, más conversación)
for (let h = 7; h <= 23; h++) HORARIO.push({ hora: `${String(h).padStart(2, '0')}:47`, workflow: 'comentarios.yml', que: 'Responder comentarios' });
HORARIO.sort((a, b) => a.hora.localeCompare(b.hora));

// Hasta cuándo sigue cada cosa (después no se lanza): GTA VI termina con el lanzamiento
export const HASTA = { 'gta6.yml': '2026-11-19' };

export const NOMBRES = {
  [R]: 'Reels de quiz y curiosidades', 'curiosidades-facebook.yml': 'Imágenes a Facebook e Instagram', 'curiosidades-tiktok.yml': 'Carruseles a TikTok',
  'nombres.yml': 'Nombres a TikTok', 'famosos.yml': 'Futbolistas a TikTok', 'gta6.yml': 'Especial GTA VI', 'noticias.yml': 'Noticias del día',
  'comentarios.yml': 'Respuestas a comentarios', 'metas.yml': 'Metas semanales de Facebook', 'como-se-hace.yml': 'Cómo se hace', 'youtube-largo.yml': 'Video largo de YouTube', 'video3d.yml': 'Video 3D de datos', 'estadisticas.yml': 'Estadísticas', 'republicar.yml': 'Reenvío de un video', 'vistas.yml': 'Vistas de lo publicado'
};

// Dónde sale cada cosa (fb = Facebook, ig = Instagram, tt = TikTok). Los Reels con «tiktok: si» también van a TikTok.
const REDES_WF = {
  [R]: ['fb', 'ig', 'yt'], 'youtube-largo.yml': ['yt'], 'video3d.yml': ['fb', 'ig', 'tt', 'yt'], 'curiosidades-facebook.yml': ['fb', 'ig'], 'curiosidades-tiktok.yml': ['tt'], 'nombres.yml': ['tt'], 'famosos.yml': ['tt'],
  'gta6.yml': ['fb', 'ig', 'tt'], 'comentarios.yml': ['fb', 'ig'], 'metas.yml': ['fb'], 'como-se-hace.yml': ['fb', 'ig', 'yt'], 'noticias.yml': [], 'estadisticas.yml': [], 'vistas.yml': [], 'republicar.yml': ['fb', 'ig']
};
// Con «redes» (el plan de cada red) manda eso; si no, lo de siempre del workflow
export const redesDe = (workflow, inputs = {}) => inputs.modo === 'render' ? [] : inputs.redes ? inputs.redes.split(',').filter(Boolean) : [...(REDES_WF[workflow] || []), ...(inputs.tiktok === 'si' ? ['tt'] : [])];
export { PLAN, PIEZAS };

export const OFFSET_HN = -6;
// Fecha y minuto del día en Honduras
export function ahoraHN(d = new Date()) {
  const h = new Date(d.getTime() + OFFSET_HN * 3600e3);
  return { fecha: h.toISOString().slice(0, 10), min: h.getUTCHours() * 60 + h.getUTCMinutes() };
}
export const minutos = (hora) => { const [h, m] = hora.split(':').map(Number); return h * 60 + m; };
// Instante UTC de una hora de Honduras en una fecha
export const instante = (fecha, hora) => new Date(Date.parse(`${fecha}T${hora}:00Z`) - OFFSET_HN * 3600e3);
// Lo programado para una fecha (sin lo que tiene otra fecha o ya terminó), con los cambios que mandaste por Telegram
// (scripts/lib/control.mjs: ops ya resueltas)
// La base: los renglones activos de la tabla «programacion» si ya se cargaron (cargarProgramacion en
// scripts/lib/programacion.mjs), si no HORARIO
let BASE = HORARIO;
export const usarBase = (slots) => { BASE = slots?.length ? slots : HORARIO; };
export const baseActual = () => BASE;
export const vaElDia = (s, fecha) => (!s.fecha || s.fecha === fecha) && (!s.dias?.length || s.dias.includes(new Date(`${fecha}T12:00:00Z`).getUTCDay())) && !(s.desde && fecha < s.desde) && !(s.hasta && fecha > s.hasta) && !(HASTA[s.workflow] && fecha > HASTA[s.workflow]);
export const delDia = (fecha, ops = []) => aplicarCambios(BASE.filter((s) => vaElDia(s, fecha)), ops, fecha);

// ---------- cambios por Telegram ----------
// Lo que no se toca con «quitar/mover»: las respuestas a comentarios (cada hora) y lo que no publica nada
const FIJO = new Set(['comentarios.yml', 'noticias.yml', 'estadisticas.yml', 'vistas.yml']);
export const editable = (s) => !FIJO.has(s.workflow) && s.inputs?.modo !== 'render';
// Las corridas de una hora (o de la pieza) que se pueden cambiar
export const slotsEn = (slots, hora) => slots.filter((s) => s.hora === hora && editable(s));
const conInputs = (s, inputs) => inputs ? { ...s, inputs: { ...(s.inputs || {}), ...inputs } } : s;
export function aplicarCambios(base, ops = [], fecha) {
  const dia = fecha ? new Date(`${fecha}T12:00:00Z`).getUTCDay() : null;
  let slots = base.map((s) => ({ ...s }));
  for (const op of ops) {
    if (op.dias && dia != null && !op.dias.includes(dia)) continue; // programación fija de otros días de la semana
    if (op.desde && fecha && fecha < op.desde) continue; // programación fija que empieza otro día
    if (op.t === 'quitar') slots = slots.filter((s) => !(s.hora === op.hora && editable(s) && (!op.pieza || s.pieza === op.pieza)));
    else if (op.t === 'mover') slots = slots.map((s) => s.hora === op.hora && editable(s) && (!op.pieza || s.pieza === op.pieza) ? { ...s, hora: op.a, cambio: `movido de las ${op.hora}` } : s);
    else if (op.t === 'cambiar') slots = slots.map((s) => {
      if (s.hora !== op.hora || !editable(s) || !PIEZAS[op.pieza]) return s;
      const redes = op.redes || (s.inputs?.redes ? s.inputs.redes.split(',') : redesDePieza(op.pieza));
      return { ...armarSlot(op.pieza, s.hora, redes), cambio: `antes: ${s.pieza || s.workflow}` };
    });
    else if (op.t === 'agregar' && PIEZAS[op.pieza]) slots.push({ ...conInputs(armarSlot(op.pieza, op.hora, op.redes || redesDePieza(op.pieza)), op.inputs), cambio: op.ya ? 'publicado ya' : op.id ? 'fijo' : 'agregado', ...(op.id ? { fijo: true } : {}), ...(op.ya ? { ya: true } : {}) });
    else if (op.t === 'pausa') slots = slots.filter((s) => !editable(s) || s.workflow === 'video3d.yml' && s.inputs?.modo === 'render');
  }
  return slots.sort((a, b) => a.hora.localeCompare(b.hora));
}

// Nombres con que puedes llamar a cada pieza por Telegram (sin tildes, en minúsculas). Los más largos primero.
export const ALIAS = Object.entries({
  comosehace: ['como se hace', 'como se hacen', 'comosehace', 'fabrica', 'fabricas'],
  banderas: ['banderas', 'bandera'],
  retos: ['retos visuales', 'retos', 'reto'],
  estrella: ['estrella'],
  prefieres: ['que prefieres', 'prefieres'],
  emojis: ['emojis', 'emoji'],
  quiz: ['quiz', 'top 10', 'top10', 'trivia'],
  debateimg: ['debate en imagen', 'imagen de debate', 'debate imagen', 'error a proposito', 'cuantos ves'],
  debate: ['retos que dividen', 'reel de debate', 'debate', 'dividen'],
  noticiasimg: ['noticias en imagenes', 'noticias en imagen', 'noticias imagenes', 'noticias imagen', 'noticias en fotos', 'noticias en carrusel', 'carrusel de noticias'],
  noticias: ['noticias en video', 'noticias video', 'reel de noticias', 'noticias de hoy', 'noticiero', 'noticias'],
  video3d1: ['3d de mediodia', '3d del mediodia', 'video 3d de mediodia', '3d 1'],
  video3d2: ['3d de la tarde', 'video 3d de la tarde', '3d 2'],
  imagen: ['imagen', 'foto', 'curiosidad'],
  gta: ['gta 6', 'gta vi', 'gta'],
  nombres: ['nombres', 'nombre', 'parejas', 'pareja'],
  famosos: ['futbolistas', 'futbolista', 'jugadores', 'jugador', 'famosos', 'futbol'],
  largo: ['video largo', 'largo de youtube']
}).flatMap(([p, xs]) => xs.map((x) => [x, p])).sort((a, b) => b[0].length - a[0].length);
export const NOMBRE_PIEZA = { comosehace: 'Cómo se hace', banderas: 'Banderas', retos: 'Retos', estrella: 'Banderas/Retos', prefieres: '¿Qué prefieres?', emojis: 'Emojis', quiz: 'Quiz', noticias: 'Noticias (video)', noticiasimg: 'Noticias (imagen)', debate: 'Debate (video)', debateimg: 'Debate (imagen)', video3d1: '3D mediodía', video3d2: '3D tarde', imagen: 'Imagen', gta: 'GTA VI', nombres: 'Nombres', famosos: 'Futbolista', largo: 'Video largo YT', metas: 'Metas FB', reenvio: 'Reenvío' };
export const nombreSlot = (s) => NOMBRE_PIEZA[s.pieza] || (s.workflow === 'metas.yml' ? 'Metas FB' : NOMBRES[s.workflow] || s.workflow);

// Tabla para Telegram (va dentro de <pre>): hora, pieza y redes; con estado si viene de diaConEstado
const ICONO_ESTADO = { hecho: '✅', 'en-curso': '⏳', pendiente: '⏰', perdido: '❌', proximo: '·' };
export function tablaPlan(slots, { estado = false } = {}) {
  const filas = slots.filter((s) => editable(s) && s.workflow !== 'metas.yml').map((s) => {
    const redes = redesDe(s.workflow, s.inputs).map((r) => RED_NOMBRE[r] === 'TikTok' ? 'TT' : RED_NOMBRE[r] === 'YouTube' ? 'YT' : RED_NOMBRE[r]).join(' ');
    return `${estado ? `${ICONO_ESTADO[s.estado] || '·'} ` : ''}${s.hora} ${nombreSlot(s).slice(0, 17).padEnd(17)} ${redes}${s.ya ? ' 🚀' : s.fijo ? ' 🔁' : s.cambio ? ' *' : ''}`;
  });
  return filas.join('\n');
}
