#!/usr/bin/env node
// Metas semanales del Panel para creadores de Facebook («Crea 30 publicaciones con fotos», «Crea 44 historias»).
// Cuenta lo que la página ya publicó esta semana (domingo a sábado, hora del Pacífico, como Meta) y, si va atrasada
// respecto al ritmo, publica las fotos e historias que faltan, repartidas en las corridas del día (metas.yml, 3 al día).
// Las metas cambian cada semana y la API no las da: se ponen en el panel («Metas semanales», campos fotos e
// historias) y se guardan en data/metas-semana.json (estado cifrado); sin eso valen las de data/metas.json.
//   node --env-file=.env scripts/metas.mjs [--fotos 30 --historias 44] [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';
import { graph, facebookReady } from './facebook.mjs';

const o = parseCli({ fotos: { type: 'string' }, historias: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } });
const leer = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const BASE = path.join(ROOT, 'data', 'metas.json'), SEMANA = path.join(ROOT, 'data', 'metas-semana.json');
// Corridas por día de metas.yml (scripts/lib/horario.mjs): lo que falta se reparte entre las que quedan
const CORRIDAS = [11 * 60 + 37, 15 * 60 + 37, 21 * 60 + 37];
const TOPE = { fotos: 3, historias: 4 }; // por corrida, para no publicar en ráfaga

// Inicio de la semana de Meta: el domingo a las 00:00 en Los Ángeles
function inicioSemana(ahora = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(ahora).map((x) => [x.type, x.value]));
  const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute), desfase = local - ahora.getTime();
  const domingo = Date.UTC(+p.year, +p.month - 1, +p.day - dia) - desfase;
  return { inicio: new Date(domingo), dia, semana: new Date(Date.UTC(+p.year, +p.month - 1, +p.day - dia)).toISOString().slice(0, 10) };
}

// Todo lo de la página desde un instante, siguiendo las páginas de resultados
async function desde(ruta, params, inicio) {
  const lista = []; let after;
  for (let i = 0; i < 10; i++) {
    const d = await graph('GET', ruta, { ...params, limit: 100, ...(after ? { after } : {}) });
    // Las publicaciones traen created_time (fecha ISO); las historias, creation_time en segundos Unix
    const cuando = (x) => { const t = x.created_time || x.creation_time; return /^\d+$/.test(String(t)) ? +t * 1000 : Date.parse(t); };
    const nuevos = (d.data || []).filter((x) => cuando(x) >= inicio.getTime());
    lista.push(...nuevos);
    after = d.paging?.cursors?.after;
    if (!after || nuevos.length < (d.data || []).length || !(d.data || []).length) break;
  }
  return lista;
}

async function main() {
  if (!facebookReady()) { console.log('Faltan FB_PAGE_ID o FB_PAGE_TOKEN'); return; }
  const { inicio, dia, semana } = inicioSemana();
  // Metas: las del panel (si se pusieron) se guardan para el resto de corridas; las de la semana anterior siguen valiendo
  const guardadas = leer(SEMANA, {}), base = leer(BASE, { fotos: 30, historias: 44 });
  const metas = { fotos: +(o.fotos || guardadas.fotos || base.fotos), historias: +(o.historias || guardadas.historias || base.historias) };
  if ((o.fotos || o.historias) && !o['dry-run']) fs.writeFileSync(SEMANA, JSON.stringify({ ...metas, semana, puesto: new Date().toISOString() }, null, 2) + '\n');

  const page = process.env.FB_PAGE_ID;
  const posts = await desde(`/${page}/published_posts`, { fields: 'created_time,attachments{media_type}' }, inicio)
    .catch(async () => (await desde(`/${page}/photos`, { type: 'uploaded', fields: 'created_time' }, inicio)).map((x) => ({ ...x, foto: true })));
  const fotos = posts.filter((p) => p.foto || (p.attachments?.data || []).some((a) => a.media_type === 'photo' || a.media_type === 'album')).length;
  const historias = (await desde(`/${page}/stories`, { fields: 'creation_time,status' }, inicio).catch(() => [])).length;
  const hechas = { fotos, historias };

  // Ritmo: al terminar el día de hoy debería ir (día + 1) / 7 de cada meta. Lo que falta se reparte entre las corridas
  // que quedan hoy, con un tope por corrida
  const min = (() => { const h = new Date(Date.now() - 6 * 3600e3); return h.getUTCHours() * 60 + h.getUTCMinutes(); })();
  const quedan = Math.max(1, CORRIDAS.filter((m) => m >= min - 30).length);
  const plan = {};
  for (const k of ['fotos', 'historias']) {
    const debe = Math.min(metas[k], Math.ceil((metas[k] * (dia + 1)) / 7)), falta = Math.max(0, debe - hechas[k]);
    plan[k] = Math.min(TOPE[k], Math.ceil(falta / quedan));
    console.log(`${k}: ${hechas[k]}/${metas[k]} esta semana · al final de hoy debería ir ${debe} · ahora publico ${plan[k]}`);
  }
  if (o['dry-run']) return;
  const correr = (args) => {
    const r = spawnSync(process.execPath, ['scripts/curiosidades.mjs', '--red', 'facebook', '--instagram', 'no', ...args], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
    return r.status === 0;
  };
  let ok = { fotos: 0, historias: 0 };
  for (let i = 0; i < plan.fotos; i++) { if (correr([])) ok.fotos++; await new Promise((r) => setTimeout(r, 20000)); }
  for (let i = 0; i < plan.historias; i++) { if (correr(['--historia'])) ok.historias++; await new Promise((r) => setTimeout(r, 15000)); }
  console.log(`Publicadas ahora: ${ok.fotos} foto(s) y ${ok.historias} historia(s)`);
}

main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
