// Horario de publicación, hora de Honduras (UTC-6). Es la única fuente: el relojero (/api/relojero, llamado cada
// 10 min por cron-job.org) lanza en GitHub Actions lo que toca, el panel (/panel.html) lo muestra y el tablero local
// lo resume. GitHub ya no programa nada por su cuenta (sus «schedule» se perdían o llegaban con horas de atraso).
//   { hora: 'HH:MM', workflow, que, inputs?, fecha? }   fecha: solo ese día (AAAA-MM-DD)
const R = 'curiosidades-reels.yml';
export const HORARIO = [
  { hora: '06:23', workflow: 'noticias.yml', que: 'Juntar noticias del día' },
  { hora: '07:17', workflow: 'nombres.yml', que: 'Nombre o pareja con círculos → TikTok' },
  { hora: '07:57', workflow: R, que: 'Reel: noticias de hoy', inputs: { formato: 'noticias' } },
  { hora: '08:07', workflow: 'curiosidades-facebook.yml', que: 'Imagen: reto visual o curiosidad' },
  { hora: '09:27', workflow: 'gta6.yml', que: 'Especial de lanzamiento de GTA VI', inputs: { lanzamiento: 'true' }, fecha: '2026-11-19' },
  { hora: '09:57', workflow: R, que: 'Reel de quiz y curiosidades' },
  { hora: '10:47', workflow: 'famosos.yml', que: 'Futbolista con círculos → TikTok' },
  { hora: '11:57', workflow: R, que: 'Reel de quiz y curiosidades' },
  { hora: '12:07', workflow: 'curiosidades-facebook.yml', que: 'Imagen: reto visual o curiosidad' },
  { hora: '12:37', workflow: 'curiosidades-tiktok.yml', que: 'Carrusel de 5 imágenes → TikTok' },
  { hora: '12:57', workflow: R, que: 'Reel de quiz y curiosidades → también TikTok', inputs: { tiktok: 'si' } },
  { hora: '13:17', workflow: 'nombres.yml', que: 'Nombre o pareja con círculos → TikTok' },
  { hora: '13:57', workflow: R, que: 'Reel de quiz y curiosidades' },
  { hora: '15:57', workflow: R, que: 'Reel de quiz y curiosidades' },
  { hora: '16:47', workflow: 'famosos.yml', que: 'Futbolista con círculos → TikTok' },
  { hora: '17:07', workflow: 'curiosidades-facebook.yml', que: 'Imagen: reto visual o curiosidad' },
  { hora: '17:23', workflow: 'noticias.yml', que: 'Juntar noticias del día' },
  { hora: '17:57', workflow: R, que: 'Reel de quiz y curiosidades' },
  { hora: '18:57', workflow: R, que: 'Reel: noticias de hoy', inputs: { formato: 'noticias' } },
  { hora: '19:27', workflow: 'gta6.yml', que: 'Reel GTA VI «Faltan N días» → FB, IG y TikTok' },
  { hora: '19:57', workflow: R, que: 'Reel de quiz y curiosidades' },
  { hora: '20:07', workflow: 'curiosidades-facebook.yml', que: 'Imagen: reto visual o curiosidad' },
  { hora: '20:37', workflow: 'curiosidades-tiktok.yml', que: 'Carrusel de 5 imágenes → TikTok' },
  { hora: '20:57', workflow: R, que: 'Reel de quiz y curiosidades → también TikTok', inputs: { tiktok: 'si' } },
  { hora: '21:57', workflow: R, que: 'Reel de quiz y curiosidades' },
  { hora: '22:57', workflow: R, que: 'Reel de quiz y curiosidades' }
];
// Respuestas a comentarios: cada hora de 7:47 a 23:47 (cuanto antes se contesta, más conversación)
for (let h = 7; h <= 23; h++) HORARIO.push({ hora: `${String(h).padStart(2, '0')}:47`, workflow: 'comentarios.yml', que: 'Responder comentarios' });
HORARIO.sort((a, b) => a.hora.localeCompare(b.hora));

// Hasta cuándo sigue cada cosa (después no se lanza): GTA VI termina con el lanzamiento
export const HASTA = { 'gta6.yml': '2026-11-19' };

export const NOMBRES = {
  [R]: 'Reels de quiz y curiosidades', 'curiosidades-facebook.yml': 'Imágenes a Facebook e Instagram', 'curiosidades-tiktok.yml': 'Carruseles a TikTok',
  'nombres.yml': 'Nombres a TikTok', 'famosos.yml': 'Futbolistas a TikTok', 'gta6.yml': 'Especial GTA VI', 'noticias.yml': 'Noticias del día',
  'comentarios.yml': 'Respuestas a comentarios', 'estadisticas.yml': 'Estadísticas'
};

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
export const delDia = (fecha) => HORARIO.filter((s) => (!s.fecha || s.fecha === fecha) && !(HASTA[s.workflow] && fecha > HASTA[s.workflow]));
