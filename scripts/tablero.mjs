#!/usr/bin/env node
// Tablero local (solo en esta PC): qué se publica, cuánto, a qué hora y cómo le va a cada formato.
// El horario sale de scripts/lib/horario.mjs (el mismo que usa el relojero) y de qué workflows están activos en GitHub (gh).
// Las cifras: el último informe de estadisticas.yml (se descarga con gh) o, si no hay, data/rendimiento.json.
//   npm run tablero              (escribe out/tablero.html y lo abre)
//   npm run tablero -- --sin-gh  (sin consultar GitHub)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { parseCli } from './lib/cli.mjs';
import { ROOT } from './lib/node-env.mjs';
import { HORARIO, HASTA, ahoraHN, minutos } from './lib/horario.mjs';

const o = parseCli({ 'sin-gh': { type: 'boolean', default: false }, 'no-abrir': { type: 'boolean', default: false } });
const REPO = 'elporter17/estudio-epiciclos', DIR = path.join(ROOT, '.github', 'workflows');
const gh = (args) => { if (o['sin-gh']) return null; try { return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } };

// Qué hace cada workflow programado y adónde va (lo demás sale del archivo)
const WF = {
  'curiosidades-reels.yml': { que: 'Reel de quiz y curiosidades', detalle: 'Rota: banderas, retos de fácil a GOD, 5 preguntas, ¿qué prefieres?, emojis, top 10; noticias a las 7:57 y 18:57', fb: 'Reel + historia', ig: 'Reel + historia', reel: true },
  'gta6.yml': { que: 'Especial GTA VI', detalle: 'Cuenta atrás hasta el 19 de noviembre; ese día, especial a las 9:27', fb: 'Reel + historia', ig: 'Reel + historia', tt: 'Borrador', reel: true },
  'noticias.yml': { que: 'Juntar noticias del día', detalle: 'No publica: deja los titulares para los Reels de noticias', mantenimiento: true },
  'curiosidades-facebook.yml': { que: 'Imagen', detalle: 'Reto visual (2 de cada 3), curiosidad o noticia', fb: 'Imagen', ig: 'Imagen' },
  'curiosidades-tiktok.yml': { que: 'Carrusel de 5 imágenes', detalle: 'Retos visuales o datos, día por medio', tt: 'Borrador' },
  'nombres.yml': { que: 'Nombre o pareja con círculos', detalle: 'Espejo, mandala, hilos, anillos o costura', tt: 'Borrador' },
  'famosos.yml': { que: 'Futbolista con círculos', detalle: 'Caras, celebraciones, goles y escudos', tt: 'Borrador' },
  'como-se-hace.yml': { que: 'Cómo se hace', detalle: 'La fábrica en 2D en un solo plano, con fotos reales; 60 productos, más de 1 minuto', fb: 'Reel', ig: 'Reel', reel: true },
  'metas.yml': { que: 'Metas semanales', detalle: 'Completa las fotos e historias que pide el Panel para creadores', fb: 'Fotos + historias' },
  'comentarios.yml': { que: 'Respuestas a comentarios', detalle: 'Hasta 25 por corrida, en Facebook e Instagram', fb: 'Responde', ig: 'Responde', mantenimiento: true },
  'facebook-reels.yml': { que: 'Nombres y futbolistas', detalle: 'Desactivado: casi sin vistas en Facebook', fb: 'Reel + historia', ig: 'Reel + historia', reel: true },
  'fisica.yml': { que: 'Física (pelotas y juegos)', detalle: 'Desactivado', tt: 'Borrador' }
};

const estados = Object.fromEntries((gh(['workflow', 'list', '-R', REPO, '--all', '--json', 'path,state', '--jq', '.[]|"\\(.path) \\(.state)"']) || '')
  .trim().split('\n').filter(Boolean).map((l) => { const [p, s] = l.split(' '); return [path.basename(p), s]; }));

const { fecha } = ahoraHN(), workflows = [];
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.yml'))) {
  const nombre = (fs.readFileSync(path.join(DIR, f), 'utf8').match(/^name:\s*(.+)$/m) || [])[1]?.trim() || f;
  workflows.push({ f, nombre, activo: estados[f] ? estados[f] === 'active' : true, programado: HORARIO.some((x) => x.workflow === f), meta: WF[f] });
}
// Lo que tiene fecha (el especial de GTA VI) o ya terminó no cuenta en el día normal
const horario = HORARIO.map((x) => ({
  min: minutos(x.hora), hora: x.hora, f: x.workflow, activo: estados[x.workflow] ? estados[x.workflow] === 'active' : true,
  ocasional: !!x.fecha || (HASTA[x.workflow] && fecha > HASTA[x.workflow]), ...WF[x.workflow], ...(x.inputs?.tiktok === 'si' ? { tt: 'Borrador' } : {}), ...(x.fecha ? { detalle: `Solo el ${x.fecha}` } : {})
}));
horario.sort((a, b) => a.min - b.min);
const activos = horario.filter((x) => x.activo && !x.ocasional);
const cuenta = (fn) => activos.filter(fn).length;
const tot = {
  fbReels: cuenta((x) => x.fb?.startsWith('Reel')), fbImg: cuenta((x) => x.fb === 'Imagen'), fbHist: cuenta((x) => x.fb?.includes('historia')),
  igReels: cuenta((x) => x.ig?.startsWith('Reel')), igImg: cuenta((x) => x.ig === 'Imagen'), igHist: cuenta((x) => x.ig?.includes('historia')),
  tt: cuenta((x) => x.tt), resp: cuenta((x) => x.f === 'comentarios.yml')
};

// Cifras: el último informe de GitHub (artefacto «estadisticas») o la copia guardada de Business Suite
let rend = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'rendimiento.json'), 'utf8'));
const id = (gh(['run', 'list', '-R', REPO, '--workflow', 'estadisticas.yml', '--status', 'success', '-L', '1', '--json', 'databaseId', '--jq', '.[0].databaseId']) || '').trim();
if (id) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tablero-'));
  if (gh(['run', 'download', id, '-R', REPO, '-n', 'estadisticas', '-D', tmp]) !== null && fs.existsSync(path.join(tmp, 'estadisticas.json'))) {
    const nuevo = JSON.parse(fs.readFileSync(path.join(tmp, 'estadisticas.json'), 'utf8'));
    if (nuevo.filas?.some((r) => r.vistas_prom > 0)) rend = nuevo;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ---------- página ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = (v) => new Intl.NumberFormat('es-HN').format(v);
const chip = (txt, cls) => txt ? `<span class="chip ${cls}">${esc(txt)}</span>` : '<span class="nada">—</span>';
const formatos = [...new Set(rend.filas.map((r) => r.formato))];
const maxV = Math.max(1, ...rend.filas.map((r) => r.vistas_prom));
const barras = formatos.map((fm) => {
  const fila = (red) => rend.filas.find((r) => r.formato === fm && r.red === red);
  const barra = (red, cls) => { const r = fila(red); if (!r) return `<div class="b-fila"><span class="b-red">${red}</span><span class="nada">sin datos</span></div>`;
    return `<div class="b-fila"><span class="b-red">${red}</span><span class="b-pista"><span class="b ${cls}" style="width:${Math.max(0.6, 100 * r.vistas_prom / maxV).toFixed(1)}%"></span></span><span class="b-num">${n(r.vistas_prom)}</span></div>`; };
  return `<div class="b-grupo"><div class="b-tit">${esc(fm)}</div>${barra('Facebook', 'fb')}${barra('Instagram', 'ig')}</div>`;
}).join('');
const filasRend = [...rend.filas].sort((a, b) => b.vistas_prom - a.vistas_prom).map((r) => `<tr><td>${esc(r.formato)}</td><td>${chip(r.red, r.red === 'Facebook' ? 'fb' : 'ig')}</td><td class="num">${n(r.publicaciones)}</td><td class="num"><b>${n(r.vistas_prom)}</b></td><td class="num">${n(r.vistas_max)}</td><td class="num">${n(r.me_gusta)}</td><td class="num">${n(r.comentarios)}</td><td class="num">${n(r.compartidos)}</td></tr>`).join('');
// Línea del día de 6:00 a 24:00: un punto por publicación
const x = (min) => (100 * (min - 360) / (24 * 60 - 360)).toFixed(2);
const carril = (titulo, cls, fn) => `<div class="carril"><span class="c-tit">${titulo}</span><div class="c-pista">${[7, 9, 11, 13, 15, 17, 19, 21, 23].map((h) => `<span class="c-hora" style="left:${x(h * 60)}%">${h}</span>`).join('')}${activos.filter(fn).map((p) => `<span class="punto ${cls}${p.reel || p.tt ? ' grande' : ''}" style="left:${x(p.min)}%" title="${esc(`${p.hora} · ${p.que}`)}"></span>`).join('')}</div></div>`;
const filasHor = horario.filter((p) => !p.mantenimiento).map((p) => `<tr class="${p.activo ? '' : 'apagado'}"><td class="num"><b>${p.hora}</b></td><td><div>${esc(p.que)}</div><div class="sub">${esc(p.detalle)}</div></td><td>${chip(p.tt, 'tt')}</td><td>${chip(p.fb, 'fb')}</td><td>${chip(p.ig, 'ig')}</td><td class="sub">${esc(p.f)}${p.activo ? '' : ' · desactivado'}</td></tr>`).join('');
const resp = horario.filter((p) => p.f === 'comentarios.yml' && p.activo).map((p) => p.hora);
const listaWf = workflows.filter((w) => w.programado).map((w) => `<li class="${w.activo ? '' : 'apagado'}"><span class="estado ${w.activo ? 'on' : 'off'}">${w.activo ? 'Activo' : 'Desactivado'}</span> <b>${esc(w.nombre)}</b> <span class="sub">${esc(w.f)}</span></li>`).join('');
const generado = new Date().toLocaleString('es-HN', { timeZone: 'America/Tegucigalpa', dateStyle: 'full', timeStyle: 'short' });

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tablero Potter Play</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
/* Hoja de trabajo: un resumen arriba, el día como línea de tiempo, el horario y cómo rinde cada formato */
:root{--bg:#f6f3ec;--panel:#fffdf8;--tinta:#191714;--suave:#6c665c;--linea:#e3dccd;--rojo:#d7263d;--fb:#2f6fb5;--ig:#c2378a;--tt:#138a7a;
--disp:"Archivo Black",Impact,sans-serif;--txt:"IBM Plex Sans",system-ui,sans-serif;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#141311;--panel:#1d1b18;--tinta:#f1ece2;--suave:#a39c8f;--linea:#34302a;--rojo:#ff5a6e;--fb:#6ea6e8;--ig:#ec6fbd;--tt:#4cc7b4;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tinta);font:15px/1.45 var(--txt)}
.envoltura{max-width:1180px;margin:0 auto;padding:28px max(16px,env(safe-area-inset-right)) 60px max(16px,env(safe-area-inset-left));display:grid;gap:22px}
header h1{font:2rem/1.1 var(--disp);margin:0;letter-spacing:-.01em}header h1 span{color:var(--rojo)}header p{margin:6px 0 0;color:var(--suave)}
.tarjeta{background:var(--panel);border:1px solid var(--linea);border-radius:14px;padding:18px 20px;min-width:0}
h2{font:600 1.05rem var(--txt);margin:0 0 4px}.nota{color:var(--suave);margin:0 0 14px;font-size:.9rem}
.cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:12px}
.cifra{background:var(--panel);border:1px solid var(--linea);border-radius:14px;padding:14px 16px;border-top:4px solid var(--c)}
.cifra .v{font:2.2rem/1 var(--disp)}.cifra .e{color:var(--suave);font-size:.85rem;margin-top:6px}.cifra .t{font-weight:600;margin-bottom:6px}
.fb{--c:var(--fb)}.ig{--c:var(--ig)}.tt{--c:var(--tt)}.rj{--c:var(--rojo)}
.carril{display:grid;grid-template-columns:90px 1fr;align-items:center;gap:10px;margin:10px 0}.c-tit{font-weight:600;font-size:.9rem}
.c-pista{position:relative;height:34px;border-bottom:1px solid var(--linea)}.c-hora{position:absolute;bottom:-18px;transform:translateX(-50%);font-size:.72rem;color:var(--suave)}
.punto{position:absolute;top:50%;width:10px;height:10px;border-radius:50%;background:var(--c);transform:translate(-50%,-50%);opacity:.85}.punto.grande{width:16px;height:16px;opacity:1;box-shadow:0 0 0 3px var(--panel)}
.leyenda{display:flex;flex-wrap:wrap;gap:14px;font-size:.82rem;color:var(--suave);margin-top:24px}.leyenda i{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--suave);margin-right:6px;vertical-align:-1px}.leyenda i.g{width:14px;height:14px}
.tabla{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:.9rem}th{text-align:left;font-weight:600;color:var(--suave);font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;padding:8px 10px;border-bottom:1px solid var(--linea)}
td{padding:9px 10px;border-bottom:1px solid var(--linea);vertical-align:top}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}.sub{color:var(--suave);font-size:.8rem}
.chip{display:inline-block;padding:2px 9px;border-radius:999px;font-size:.78rem;font-weight:600;color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent);white-space:nowrap}.nada{color:var(--linea)}
tr.apagado td,li.apagado{opacity:.45}
.dos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:22px}
.b-grupo{margin-bottom:14px}.b-tit{font-weight:600;font-size:.9rem;margin-bottom:4px}.b-fila{display:grid;grid-template-columns:76px 1fr 56px;align-items:center;gap:8px;font-size:.8rem}
.b-red{color:var(--suave)}.b-pista{background:color-mix(in srgb,var(--linea) 60%,transparent);border-radius:5px;height:12px;overflow:hidden}.b{display:block;height:100%;border-radius:5px;background:var(--c)}.b-num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
ul.wf{list-style:none;margin:0;padding:0;display:grid;gap:8px}.estado{font-size:.72rem;font-weight:600;padding:2px 8px;border-radius:999px}.estado.on{background:color-mix(in srgb,var(--tt) 18%,transparent);color:var(--tt)}.estado.off{background:color-mix(in srgb,var(--suave) 18%,transparent);color:var(--suave)}
footer{color:var(--suave);font-size:.8rem}
</style></head><body><div class="envoltura">
<header><h1>Potter Play <span>·</span> tablero</h1><p>Qué se publica cada día, a qué hora (Honduras) y cómo le va a cada formato. Generado el ${esc(generado)}</p></header>

<section class="cifras">
<div class="cifra fb"><div class="t">Facebook</div><div class="v">${tot.fbReels + tot.fbImg}</div><div class="e">${tot.fbReels} Reels · ${tot.fbImg} imágenes · ${tot.fbHist} historias al día</div></div>
<div class="cifra ig"><div class="t">Instagram</div><div class="v">${tot.igReels + tot.igImg}</div><div class="e">${tot.igReels} Reels · ${tot.igImg} imágenes · ${tot.igHist} historias al día</div></div>
<div class="cifra tt"><div class="t">TikTok</div><div class="v">${tot.tt}</div><div class="e">borradores al día (límite: 5 pendientes)</div></div>
<div class="cifra rj"><div class="t">Comentarios</div><div class="v">${tot.resp}</div><div class="e">revisiones al día, hasta 25 respuestas cada una</div></div>
</section>

<section class="tarjeta"><h2>El día de un vistazo</h2><p class="nota">Cada punto es una publicación. Los grandes son Reels o borradores de TikTok; los chicos, imágenes.</p>
${carril('Facebook', 'fb', (p) => p.fb && !p.mantenimiento)}${carril('Instagram', 'ig', (p) => p.ig && !p.mantenimiento)}${carril('TikTok', 'tt', (p) => p.tt)}
<div class="leyenda"><span><i class="g"></i>Reel o borrador</span><span><i></i>Imagen</span><span>Respuestas a comentarios: ${esc(resp.join(', ') || 'ninguna')}</span></div></section>

<div class="dos">
<section class="tarjeta"><h2>Vistas promedio por formato</h2><p class="nota">${esc(rend.periodo)} · ${esc(rend.fuente)}</p>${barras}</section>
<section class="tarjeta"><h2>Detalle por formato</h2><p class="nota">Ordenado por vistas promedio.</p><div class="tabla"><table>
<thead><tr><th>Formato</th><th>Red</th><th class="num">Publ.</th><th class="num">Vistas prom.</th><th class="num">Máx.</th><th class="num">Me gusta</th><th class="num">Coment.</th><th class="num">Compart.</th></tr></thead><tbody>${filasRend}</tbody></table></div></section>
</div>

<section class="tarjeta"><h2>Horario</h2><p class="nota">Sale de los cron de cada workflow; lo atenuado está desactivado. GitHub puede atrasar una corrida unos minutos u horas.</p><div class="tabla"><table>
<thead><tr><th class="num">Hora</th><th>Qué se genera</th><th>TikTok</th><th>Facebook</th><th>Instagram</th><th>Workflow</th></tr></thead><tbody>${filasHor}</tbody></table></div></section>

<section class="tarjeta"><h2>Workflows programados</h2><p class="nota">Estado en GitHub${Object.keys(estados).length ? '' : ' (no se pudo consultar: se asumen activos)'}.</p><ul class="wf">${listaWf}</ul></section>
<footer>Para actualizarlo: <code>npm run tablero</code>. Para cifras nuevas, corre antes «Estadísticas de Facebook e Instagram» en GitHub Actions. Esta página solo existe en tu PC (out/ no se sube).</footer>
</div></body></html>`;

const out = path.join(ROOT, 'out', 'tablero.html');
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, html);
console.log(`Tablero: ${out}\nFacebook ${tot.fbReels} Reels + ${tot.fbImg} imágenes · Instagram ${tot.igReels} + ${tot.igImg} · TikTok ${tot.tt} · cifras: ${rend.periodo}`);
if (!o['no-abrir']) spawn(process.platform === 'win32' ? 'cmd' : 'xdg-open', process.platform === 'win32' ? ['/c', 'start', '', out] : [out], { detached: true, stdio: 'ignore' }).unref();
