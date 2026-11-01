// Panel de Potter Play (panel.html). Habla solo con /api/panel.
const $ = (id) => document.getElementById(id);
const FORMATOS = ['auto', 'banderas', 'retos', 'quiz', 'prefieres', 'emojis', 'top10', 'noticias'];
const ESTADO = { hecho: 'Hecho', 'en-curso': 'En curso', pendiente: 'Pendiente', perdido: 'Perdido', proximo: 'Próximo' };
let ocupado = false;

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
const hora = (iso) => new Date(iso).toLocaleTimeString('es-HN', { timeZone: 'America/Tegucigalpa', hour: '2-digit', minute: '2-digit' });

async function correr(workflow, inputs, boton) {
  if (boton) boton.disabled = true;
  try { const d = await api({ accion: 'correr', workflow, inputs }); aviso(d.mensaje); setTimeout(cargar, 4000); }
  catch (e) { aviso(e.message); } finally { if (boton) setTimeout(() => (boton.disabled = false), 4000); }
}

function pintar(d) {
  $('login').hidden = true; $('app').hidden = false; $('salir').hidden = $('refrescar').hidden = false;
  // Sin 2FA el panel se ve pero no lanza nada: primero hay que configurarlo
  $('config2fa').hidden = d.dosPasos; $('manualCard').hidden = !d.dosPasos;
  const f = new Date(`${d.fecha}T12:00:00Z`).toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  $('fecha').textContent = `${f} · ${String(Math.floor(d.min / 60)).padStart(2, '0')}:${String(d.min % 60).padStart(2, '0')} en Honduras`;
  const c = (e) => d.horario.filter((s) => s.estado === e).length;
  $('nHechas').textContent = c('hecho') + c('en-curso'); $('nPend').textContent = c('pendiente'); $('nProx').textContent = c('proximo'); $('nPerd').textContent = c('perdido');
  const activas = d.corridas.filter((r) => r.estado !== 'completed');
  $('cola').textContent = activas.length ? `${activas.length} corriendo o en cola` : 'Nada corriendo ahora';
  $('dia').replaceChildren(...d.horario.map((s) => {
    const r = s.corrida, fallo = r && r.resultado && r.resultado !== 'success';
    const chip = el('span', { class: `chip ${fallo ? 'fallo' : s.estado}`, textContent: fallo ? `Falló (${r.resultado})` : ESTADO[s.estado] });
    const b = el('button', { textContent: s.estado === 'proximo' ? 'Adelantar' : 'Correr ahora', title: `Lanzar ${s.nombre}` });
    b.onclick = () => correr(s.workflow, s.inputs || {}, b);
    const acc = el('span', { class: 'acciones' }, chip);
    if (r) acc.append(el('a', { href: r.url, target: '_blank', rel: 'noopener', textContent: 'ver' }));
    if (d.dosPasos && (!r || fallo || s.estado === 'proximo')) acc.append(b);
    return el('li', { class: 'slot' }, el('span', { class: 'hora', textContent: s.hora }), el('div', {}, el('div', { textContent: s.que }), el('div', { class: 'sub', textContent: s.nombre })), acc);
  }));
  $('corridas').replaceChildren(...d.corridas.map((r) => {
    const est = r.estado !== 'completed' ? ['en-curso', 'En curso'] : r.resultado === 'success' ? ['hecho', 'Bien'] : ['fallo', r.resultado || 'Falló'];
    return el('li', { class: 'slot' }, el('span', { class: 'hora', textContent: hora(r.creada) }),
      el('div', {}, el('div', { textContent: d.workflows[r.workflow] || r.nombre }), el('div', { class: 'sub', textContent: r.evento === 'workflow_dispatch' ? 'Lanzada por el relojero o a mano' : r.evento })),
      el('span', { class: 'acciones' }, el('span', { class: `chip ${est[0]}`, textContent: est[1] }), el('a', { href: r.url, target: '_blank', rel: 'noopener', textContent: 'ver' })));
  }));
  if (!$('manual').childElementCount) {
    for (const [wf, nombre] of Object.entries(d.workflows)) {
      const fila = el('div', { class: 'fila' }, el('span', { textContent: nombre }));
      let sel = null;
      if (wf === 'curiosidades-reels.yml') { sel = el('select', { 'aria-label': 'Formato del Reel' }); sel.id = 'formatoManual'; for (const f of FORMATOS) sel.append(new Option(f === 'auto' ? 'el que toca' : f, f)); fila.append(sel); }
      const b = el('button', { textContent: 'Correr' });
      b.onclick = () => correr(wf, sel ? { formato: sel.value } : {}, b);
      fila.append(b); $('manual').append(fila);
    }
  }
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
