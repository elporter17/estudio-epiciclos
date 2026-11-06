// Horario de publicación, hora de Honduras (UTC-6). Es la única fuente: el relojero (/api/relojero, llamado cada
// 10 min por cron-job.org) lanza en GitHub Actions lo que toca, el panel (/panel.html) lo muestra y el tablero local
// lo resume. GitHub ya no programa nada por su cuenta (sus «schedule» se perdían o llegaban con horas de atraso).
//   { hora: 'HH:MM', workflow, que, inputs?, fecha?, dias? }   fecha: solo ese día (AAAA-MM-DD); dias: solo esos días
//   de la semana (0 = domingo … 6 = sábado)
const R = 'curiosidades-reels.yml';

// ---------- Plan por red (2026-11-06, con las estadísticas de Meta Business Suite de los últimos 90 días) ----------
// Instagram: Banderas y Retos rinden ~1.250 vistas de mediana (Emojis ~825); Quiz, Noticias, GTA, Datos y «Cómo se hace»
// se quedan en ~130 → Instagram solo recibe las estrellas y lo de más esfuerzo, unas 6 al día.
// Facebook: los Reels rinden parejo (~250) y las imágenes muy poco (~15-25) → estrellas en las mejores horas y relleno en
// los huecos. TikTok: 5 borradores pendientes como máximo (compartido con CirculArte) → 4 al día, los mejores.
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
  gta: { workflow: 'gta6.yml', que: 'Reel GTA VI «Faltan N días»' },
  nombres: { workflow: 'nombres.yml', que: 'Nombre o pareja con círculos' }
};
const PLAN = {
  fb: { '07:30': 'noticias', '09:00': 'banderas', '10:30': 'comosehace', '12:17': 'video3d1', '14:30': 'prefieres', '15:45': 'retos', '16:45': 'imagen', '18:30': 'video3d2', '20:30': 'estrella', '21:30': 'gta', '22:30': 'quiz' },
  ig: { '09:00': 'banderas', '10:30': 'comosehace', '12:17': 'video3d1', '15:45': 'retos', '18:30': 'video3d2', '20:30': 'estrella' },
  tt: { '12:17': 'video3d1', '15:00': 'nombres', '18:30': 'video3d2', '20:30': 'estrella' },
  yt: { '09:00': 'banderas', '10:30': 'comosehace', '12:17': 'video3d1', '15:45': 'retos', '18:30': 'video3d2' }
};
// Junta los planes: una corrida por hora y pieza, con las redes que la piden
function juntarPlanes() {
  const slots = new Map();
  for (const [red, plan] of Object.entries(PLAN)) for (const [hora, pieza] of Object.entries(plan)) {
    const k = `${hora}|${pieza}`; if (!slots.has(k)) slots.set(k, { hora, pieza, redes: [] }); slots.get(k).redes.push(red);
  }
  return [...slots.values()].map(({ hora, pieza, redes }) => {
    const p = PIEZAS[pieza], orden = ['fb', 'ig', 'tt', 'yt'].filter((r) => redes.includes(r));
    // nombres.yml es solo de TikTok y no usa «redes»
    const inputs = pieza === 'nombres' ? p.inputs : { ...(p.inputs || {}), redes: orden.join(',') };
    return { hora, workflow: p.workflow, que: `${p.que} → ${orden.map((r) => ({ fb: 'FB', ig: 'IG', tt: 'TikTok', yt: 'YouTube' })[r]).join(', ')}`, ...(inputs ? { inputs } : {}) };
  });
}

export const HORARIO = [
  // Los dos videos 3D del día se renderizan de madrugada (~40-55 min cada uno en GitHub)
  { hora: '00:37', workflow: 'video3d.yml', que: 'Video 3D: render del de mediodía', inputs: { modo: 'render', turno: 'mediodia' } },
  { hora: '01:47', workflow: 'video3d.yml', que: 'Video 3D: render del de la tarde', inputs: { modo: 'render', turno: 'tarde' } },
  { hora: '06:23', workflow: 'noticias.yml', que: 'Juntar noticias del día' },
  ...juntarPlanes(),
  // Lanzamiento de GTA VI: un Reel especial a media mañana (el especial 3D sale a las 18:30)
  { hora: '11:15', workflow: 'gta6.yml', que: 'Especial de lanzamiento de GTA VI → FB, IG, TikTok', inputs: { lanzamiento: 'true', redes: 'fb,ig,tt' }, fecha: '2026-11-19' },
  // Video largo horizontal para YouTube (8 a 10 min; tarda unos 15 min en hacerse): martes, jueves y sábado
  { hora: '14:07', workflow: 'youtube-largo.yml', que: 'Video largo de YouTube: cómo se hacen 6 cosas', dias: [2, 4, 6] }
];
// Metas semanales de Facebook (fotos e historias que pide el panel): lejos de las estrellas (scripts/metas.mjs)
for (const hora of ['07:15', '16:15', '22:45']) HORARIO.push({ hora, workflow: 'metas.yml', que: 'Metas semanales: fotos e historias que falten → FB' });
// Respuestas a comentarios: cada hora de 7:47 a 23:47 (cuanto antes se contesta, más conversación)
for (let h = 7; h <= 23; h++) HORARIO.push({ hora: `${String(h).padStart(2, '0')}:47`, workflow: 'comentarios.yml', que: 'Responder comentarios' });
HORARIO.sort((a, b) => a.hora.localeCompare(b.hora));

// Hasta cuándo sigue cada cosa (después no se lanza): GTA VI termina con el lanzamiento
export const HASTA = { 'gta6.yml': '2026-11-19' };

export const NOMBRES = {
  [R]: 'Reels de quiz y curiosidades', 'curiosidades-facebook.yml': 'Imágenes a Facebook e Instagram', 'curiosidades-tiktok.yml': 'Carruseles a TikTok',
  'nombres.yml': 'Nombres a TikTok', 'famosos.yml': 'Futbolistas a TikTok', 'gta6.yml': 'Especial GTA VI', 'noticias.yml': 'Noticias del día',
  'comentarios.yml': 'Respuestas a comentarios', 'metas.yml': 'Metas semanales de Facebook', 'como-se-hace.yml': 'Cómo se hace', 'youtube-largo.yml': 'Video largo de YouTube', 'video3d.yml': 'Video 3D de datos', 'estadisticas.yml': 'Estadísticas'
};

// Dónde sale cada cosa (fb = Facebook, ig = Instagram, tt = TikTok). Los Reels con «tiktok: si» también van a TikTok.
const REDES_WF = {
  [R]: ['fb', 'ig', 'yt'], 'youtube-largo.yml': ['yt'], 'video3d.yml': ['fb', 'ig', 'tt', 'yt'], 'curiosidades-facebook.yml': ['fb', 'ig'], 'curiosidades-tiktok.yml': ['tt'], 'nombres.yml': ['tt'], 'famosos.yml': ['tt'],
  'gta6.yml': ['fb', 'ig', 'tt'], 'comentarios.yml': ['fb', 'ig'], 'metas.yml': ['fb'], 'como-se-hace.yml': ['fb', 'ig', 'yt'], 'noticias.yml': [], 'estadisticas.yml': []
};
// Con «redes» (el plan de cada red) manda eso; si no, lo de siempre del workflow
export const redesDe = (workflow, inputs = {}) => inputs.modo === 'render' ? [] : inputs.redes ? inputs.redes.split(',').filter(Boolean) : [...(REDES_WF[workflow] || []), ...(inputs.tiktok === 'si' ? ['tt'] : [])];
export { PLAN };

export const OFFSET_HN = -6;
// Fecha y minuto del día en Honduras
export function ahoraHN(d = new Date()) {
  const h = new Date(d.getTime() + OFFSET_HN * 3600e3);
  return { fecha: h.toISOString().slice(0, 10), min: h.getUTCHours() * 60 + h.getUTCMinutes() };
}
export const minutos = (hora) => { const [h, m] = hora.split(':').map(Number); return h * 60 + m; };
// Instante UTC de una hora de Honduras en una fecha
export const instante = (fecha, hora) => new Date(Date.parse(`${fecha}T${hora}:00Z`) - OFFSET_HN * 3600e3);
// Lo programado para una fecha (sin lo que tiene otra fecha o ya terminó)
export const delDia = (fecha) => HORARIO.filter((s) => (!s.fecha || s.fecha === fecha) && (!s.dias || s.dias.includes(new Date(`${fecha}T12:00:00Z`).getUTCDay())) && !(HASTA[s.workflow] && fecha > HASTA[s.workflow]));
