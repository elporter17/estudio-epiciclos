// Panel de Potter Play (panel.html). Habla solo con /api/panel.
const $ = (id) => document.getElementById(id);
const FORMATOS = ['auto', 'banderas', 'retos', 'quiz', 'prefieres', 'emojis', 'top10', 'noticias'];
const ESTADO = { hecho: 'Hecho', 'en-curso': 'En curso', pendiente: 'Pendiente', perdido: 'Perdido', proximo: 'Próximo' };
const RED = { fb: 'Facebook', ig: 'Instagram', tt: 'TikTok', yt: 'YouTube' };
let ocupado = false, ultimo = null;
// El filtro por red y si «Ya ejecutado» está abierto se recuerdan en este navegador (si se puede)
const guardado = (k, def) => { try { return localStorage.getItem(k) ?? def; } catch { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
let filtro = guardado('panel-red', 'todas');

function aviso(txt) { const a = $('aviso'); a.textContent = txt; a.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => (a.hidden = true), 5000); }
async function api(body) {
  // «x-panel» en cada POST: el servidor rechaza los que no la traen (otra página no puede ponerla)
  const r = await fetch('/api/panel', body ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-panel': '1' }, body: JSON.stringify(body) } : {});
  const d = await r.json().catch(() => ({ error: 'Respuesta inválida.' }));
  if (r.status === 401 && !body?.accion?.startsWith('entrar')) { mostrarLogin(); throw new Error(d.error); }
  if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
  return d;
}
function mostrarLogin() { $('login').hidden = false; $('app').hidden = true; $('salir').hidden = $('refrescar').hidden = true; }
function el(tag, attrs = {}, ...hijos) { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) k === 'class' ? (e.className = v) : k.includes('-') ? e.setAttribute(k, v) : (e[k] = v); e.append(...hijos); return e; }
const hora = (iso) => new Date(iso).toLocaleTimeString('es-HN', { timeZone: 'America/Tegucigalpa', hour: '2-digit', minute: '2-digit', hour12: false });
const mins = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const falta = (m) => (m < 60 ? `en ${m} min` : `en ${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim());
// Etiquetas de red: «sin publicar» para lo interno (noticias, estadísticas)
const etiquetas = (redes = []) => el('span', { class: 'redes' }, ...(redes.length ? redes.map((r) => el('span', { class: `red ${r}`, title: RED[r], textContent: RED[r] })) : [el('span', { class: 'red interno', textContent: 'interno' })]));
const pasa = (redes = []) => filtro === 'todas' || redes.includes(filtro);

async function correr(workflow, inputs, boton) {
  if (boton) boton.disabled = true;
  try { const d = await api({ accion: 'correr', workflow, inputs }); aviso(d.mensaje); setTimeout(cargar, 4000); }
  catch (e) { aviso(e.message); } finally { if (boton) setTimeout(() => (boton.disabled = false), 4000); }
}

function filaHorario(s, d, siguiente) {
  const r = s.corrida, fallo = r && r.resultado && r.resultado !== 'success';
  const chip = el('span', { class: `chip ${fallo ? 'fallo' : s.estado}`, textContent: fallo ? `Falló (${r.resultado})` : siguiente ? `Siguiente · ${falta(mins(s.hora) - d.min)}` : ESTADO[s.estado] });
  const acc = el('span', { class: 'acciones' }, chip);
  if (r) acc.append(el('a', { href: r.url, target: '_blank', rel: 'noopener', textContent: 'ver' }));
  if (d.dosPasos && (!r || fallo || s.estado === 'proximo')) {
    const b = el('button', { textContent: s.estado === 'proximo' ? 'Adelantar' : 'Correr ahora', title: `Lanzar ${s.nombre}` });
    b.onclick = () => correr(s.workflow, s.inputs || {}, b);
    acc.append(b);
  }
  return el('li', { class: `slot${siguiente ? ' siguiente' : ''}` }, el('span', { class: 'hora', textContent: s.hora }),
    el('div', { class: 'que' }, el('div', { textContent: s.que }), el('div', { class: 'sub' }, etiquetas(s.redes), ` ${s.nombre}`)), acc);
}

function pintar(d) {
  ultimo = d;
  $('login').hidden = true; $('app').hidden = false; $('salir').hidden = $('refrescar').hidden = false;
  // Sin 2FA el panel se ve pero no lanza nada: primero hay que configurarlo
  $('config2fa').hidden = d.dosPasos; $('manualCard').hidden = !d.dosPasos;
  const f = new Date(`${d.fecha}T12:00:00Z`).toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  $('fecha').textContent = `${f} · ${String(Math.floor(d.min / 60)).padStart(2, '0')}:${String(d.min % 60).padStart(2, '0')} en Honduras`;

  // Filtro por red, con lo hecho y lo programado de hoy en cada una
  $('filtros').replaceChildren(...['todas', 'fb', 'ig', 'tt', 'yt'].map((k) => {
    const de = d.horario.filter((s) => k === 'todas' || s.redes.includes(k)), hechas = de.filter((s) => s.estado === 'hecho' || s.estado === 'en-curso').length;
    const b = el('button', { class: `filtro ${k}`, 'aria-pressed': String(filtro === k) }, el('span', { textContent: k === 'todas' ? 'Todas' : RED[k] }), el('small', { textContent: `${hechas}/${de.length}` }));
    b.onclick = () => { filtro = k; guardar('panel-red', k); pintar(ultimo); };
    return b;
  }));

  const visibles = d.horario.filter((s) => pasa(s.redes));
  const c = (e) => visibles.filter((s) => s.estado === e).length;
  $('nHechas').textContent = c('hecho') + c('en-curso'); $('nPend').textContent = c('pendiente'); $('nProx').textContent = c('proximo'); $('nPerd').textContent = c('perdido');
  const activas = d.corridas.filter((r) => r.estado !== 'completed');
  $('cola').textContent = activas.length ? `${activas.length} corriendo o en cola` : 'Nada corriendo ahora';

  // Arriba lo que falta (pendiente, en curso y lo próximo, de la hora más cercana a la más lejana); abajo lo ya ejecutado,
  // lo más reciente primero
  const fallo = (s) => s.corrida?.resultado && s.corrida.resultado !== 'success';
  const ahora = visibles.filter((s) => s.estado === 'pendiente' || s.estado === 'en-curso');
  const proximos = visibles.filter((s) => s.estado === 'proximo');
  const hechos = visibles.filter((s) => s.estado === 'hecho' || s.estado === 'perdido').reverse();
  const fallidos = hechos.filter(fallo);
  $('ahora').replaceChildren(...ahora.map((s) => filaHorario(s, d)));
  $('ahoraVacio').hidden = ahora.length > 0;
  $('proximos').replaceChildren(...proximos.map((s, i) => filaHorario(s, d, i === 0)));
  $('proximosVacio').hidden = proximos.length > 0;
  $('hechos').replaceChildren(...hechos.map((s) => filaHorario(s, d)));
  $('nHechos').textContent = `${hechos.length}${fallidos.length ? ` · ${fallidos.length} con error` : ''}`;

  const corr = d.corridas.filter((r) => pasa(d.redes[r.workflow]));
  $('corridas').replaceChildren(...corr.map((r) => {
    const est = r.estado !== 'completed' ? ['en-curso', 'En curso'] : r.resultado === 'success' ? ['hecho', 'Bien'] : ['fallo', r.resultado || 'Falló'];
    return el('li', { class: 'slot' }, el('span', { class: 'hora', textContent: hora(r.creada) }),
      el('div', { class: 'que' }, el('div', { textContent: d.workflows[r.workflow] || r.nombre }), el('div', { class: 'sub' }, etiquetas(d.redes[r.workflow]), r.evento === 'workflow_dispatch' ? ' relojero o a mano' : ` ${r.evento}`)),
      el('span', { class: 'acciones' }, el('span', { class: `chip ${est[0]}`, textContent: est[1] }), el('a', { href: r.url, target: '_blank', rel: 'noopener', textContent: 'ver' })));
  }));
  $('corridasVacio').hidden = corr.length > 0;

  if (!$('manual').childElementCount) {
    for (const [wf, nombre] of Object.entries(d.workflows)) {
      const fila = el('div', { class: 'fila' }, el('div', {}, el('div', { textContent: nombre }), etiquetas(d.redes[wf])));
      fila.dataset.wf = wf;
      const ctl = el('span', { class: 'acciones' });
      let sel = null;
      if (wf === 'curiosidades-reels.yml') { sel = el('select', { 'aria-label': 'Formato del Reel' }); sel.id = 'formatoManual'; for (const f of FORMATOS) sel.append(new Option(f === 'auto' ? 'el que toca' : f, f)); ctl.append(sel); }
      // Metas semanales: las que muestra el Panel para creadores esta semana (vacías = las que ya se pusieron)
      let metas = null;
      if (wf === 'metas.yml') {
        metas = ['fotos', 'historias'].map((k) => el('input', { type: 'number', min: '0', max: '200', inputMode: 'numeric', placeholder: k, 'aria-label': `Meta de ${k} de la semana`, class: 'meta' }));
        ctl.append(...metas);
      }
      const b = el('button', { textContent: 'Correr' });
      b.onclick = () => correr(wf, sel ? { formato: sel.value } : metas ? Object.fromEntries(metas.map((m, i) => [['fotos', 'historias'][i], m.value.trim()]).filter(([, v]) => /^\d{1,3}$/.test(v))) : {}, b);
      ctl.append(b); fila.append(ctl); $('manual').append(fila);
    }
  }
  for (const fila of $('manual').children) fila.hidden = !pasa(d.redes[fila.dataset.wf]);
}

async function cargar() {
  if (ocupado) return; ocupado = true;
  try { pintar(await api()); } catch (e) { if (!$('login').hidden) return; aviso(e.message); } finally { ocupado = false; }
}
$('formLogin').onsubmit = async (ev) => {
  ev.preventDefault(); $('errLogin').textContent = '';
  try { await api({ accion: 'entrar', clave: $('clave').value, codigo: $('codigo').value }); $('clave').value = $('codigo').value = ''; cargar(); }
  catch (e) { $('errLogin').textContent = e.message; }
};
$('salir').onclick = async () => { await api({ accion: 'salir' }).catch(() => {}); mostrarLogin(); };
$('refrescar').onclick = cargar;
$('ejecutado').open = guardado('panel-ejecutado', '0') === '1';
$('ejecutado').ontoggle = () => guardar('panel-ejecutado', $('ejecutado').open ? '1' : '0');

// Configurar el 2FA: el servidor da un secreto nuevo (no lo guarda); se escanea, se prueba un código y se copia a Vercel
let secreto = null;
$('nuevo2fa').onclick = async () => {
  try {
    const d = await api({ accion: 'nuevo-2fa' }); secreto = d.secreto;
    $('qr').replaceChildren(); new QRCode($('qr'), { text: d.uri, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M });
    $('secretoTxt').textContent = d.secreto.match(/.{4}/g).join(' '); $('paso2fa').hidden = false; $('listo2fa').hidden = true;
  } catch (e) { aviso(e.message); }
};
$('probar2fa').onclick = async () => {
  try {
    const d = await api({ accion: 'probar-2fa', secreto, codigo: $('codigo2fa').value });
    if (!d.ok) return aviso('Ese código no coincide. Revisa la hora del teléfono y prueba con el siguiente.');
    $('valorTotp').textContent = secreto; $('listo2fa').hidden = false;
  } catch (e) { aviso(e.message); }
};
$('copiarTotp').onclick = () => navigator.clipboard.writeText(secreto).then(() => aviso('Copiado.'), () => aviso('Selecciona el texto y cópialo a mano.'));
cargar(); setInterval(() => { if (!document.hidden && !$('app').hidden) cargar(); }, 60000);
