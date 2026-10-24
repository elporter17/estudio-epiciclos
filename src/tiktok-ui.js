/* CirculArte · «Publicar en TikTok» desde la web (Content Posting API, Direct Post).
   La pantalla sigue las Content Sharing Guidelines de TikTok: muestra la cuenta, vista previa, título editable,
   privacidad elegida a mano y sin valor por defecto, interacciones apagadas por defecto (y bloqueadas si la cuenta
   las desactivó), divulgación de contenido comercial, declaración de consentimiento y aviso de procesamiento.
   El video va del navegador a Vercel Blob y TikTok lo descarga desde el dominio verificado (PULL_FROM_URL). */

import { lang, tr, onLang } from './i18n.js';

const PRIVACY = {
  PUBLIC_TO_EVERYONE: ['Todos', 'Everyone'],
  MUTUAL_FOLLOW_FRIENDS: ['Amigos (seguidores mutuos)', 'Friends (mutual followers)'],
  FOLLOWER_OF_CREATOR: ['Seguidores', 'Followers'],
  SELF_ONLY: ['Solo yo', 'Only me']
};
const MUSIC = 'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en';
const BRANDED = 'https://www.tiktok.com/legal/page/global/bc-policy/en';
const BLOB_CLIENT = 'https://esm.sh/@vercel/blob@2.8.2/client';
const STATUS_TEXT = {
  PROCESSING_DOWNLOAD: ['TikTok está descargando el video…', 'TikTok is downloading the video…'],
  PROCESSING_UPLOAD: ['TikTok está recibiendo el video…', 'TikTok is receiving the video…'],
  SEND_TO_USER_INBOX: ['El video llegó a tu bandeja de TikTok.', 'The video reached your TikTok inbox.'],
  PUBLISH_COMPLETE: ['Publicado.', 'Posted.'],
  FAILED: ['TikTok no pudo publicar el video.', 'TikTok could not post the video.']
};
const FAIL_TEXT = {
  file_format_check_failed: ['el formato del video no es compatible', 'the video format is not supported'],
  duration_check_failed: ['la duración no está permitida', 'the duration is not allowed'],
  frame_rate_check_failed: ['la cantidad de cuadros por segundo no es compatible', 'the frame rate is not supported'],
  picture_size_check_failed: ['el tamaño de imagen no es compatible', 'the picture size is not supported'],
  spam_risk_too_many_posts: ['se alcanzó el límite diario de publicaciones', 'the daily post limit was reached'],
  spam_risk_text: ['TikTok marcó la descripción como riesgosa', 'TikTok flagged the caption as risky'],
  video_pull_failed: ['TikTok no pudo descargar el video', 'TikTok could not download the video'],
  internal: ['falla temporal de TikTok; intenta de nuevo', 'temporary TikTok failure; try again']
};
const pair = (p) => (p ? tr(p[0], p[1]) : null);

const api = async (path, body) => {
  // x-lang: el servidor responde los errores en el idioma de la interfaz
  const r = await fetch(path, body === undefined ? { headers: { 'x-lang': lang } } : { method: 'POST', headers: { 'content-type': 'application/json', 'x-lang': lang }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || `Error ${r.status}`); e.code = d.code; throw e; }
  return d;
};

export async function initTikTok({ toast }) {
  let cfg;
  try { cfg = await api('/api/tiktok-config'); } catch { return null; } // sitio estático sin funciones: sin botón
  if (!cfg.enabled) return null;

  const $ = (s) => document.querySelector(s);
  const dlg = $('#tt'), form = $('#ttForm');
  let video = null, creator = null, busy = false, mode = 'direct';
  // Publicar ahora (video.publish) o enviar a la bandeja de TikTok como borrador (video.upload)
  const setMode = (m) => { mode = m; document.querySelectorAll('#ttMode button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === m))); sync(); };
  document.querySelector('#ttMode').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && !busy) setMode(b.dataset.v); });

  /* ---------- Cuenta ---------- */
  async function loadCreator() {
    $('#ttAccount').hidden = true; $('#ttConnect').hidden = true; $('#ttBody').hidden = true; $('#ttLoading').hidden = false;
    try {
      creator = await api('/api/tiktok-creator');
      $('#ttAvatar').src = creator.avatar || ''; $('#ttAvatar').hidden = !creator.avatar;
      $('#ttNick').textContent = creator.nickname || creator.username;
      $('#ttUser').textContent = creator.username ? '@' + creator.username : '';
      $('#ttAccount').hidden = false; $('#ttBody').hidden = false;
      fillForm();
    } catch (e) {
      creator = null;
      if (e.code === 'not_connected' || e.code === 'access_token_invalid') { $('#ttConnect').hidden = false; }
      else { $('#ttConnect').hidden = false; $('#ttConnectMsg').textContent = e.message; }
    } finally { $('#ttLoading').hidden = true; }
  }

  async function connect() {
    // La ventana se abre en el mismo clic (si se abriera después del fetch, el navegador la bloquearía)
    const w = window.open('about:blank', 'circularte-tiktok', 'width=520,height=760');
    if (!w) { toast(tr('Permite las ventanas emergentes para conectar tu cuenta de TikTok.', 'Allow pop-ups to connect your TikTok account.')); return; }
    try {
      const { url, state } = await api('/api/tiktok-login', {});
      try { localStorage.setItem('circularte.tiktokLogin', JSON.stringify({ state, t: Date.now() })); } catch { /* sin almacenamiento */ }
      w.location.href = url;
    } catch (e) { w.close(); toast(e.message); }
  }
  try {
    const bc = new BroadcastChannel('circularte-tiktok');
    bc.onmessage = (ev) => { if (ev.data?.connected && dlg.open) loadCreator(); };
  } catch { /* sin BroadcastChannel: el usuario puede reabrir el diálogo */ }
  // Respaldo para navegadores sin BroadcastChannel: al volver a la pestaña, revisa si ya hay sesión
  window.addEventListener('focus', () => { if (dlg.open && !creator && !busy) loadCreator(); });

  async function disconnect() {
    try { await api('/api/tiktok-logout', {}); } catch { /* igual se limpia la vista */ }
    creator = null; loadCreator();
  }

  /* ---------- Formulario ---------- */
  function fillForm() {
    const sel = $('#ttPrivacy');
    sel.textContent = '';
    const ph = new Option(tr('Elige quién puede verlo', 'Choose who can view it'), '', true, true); ph.disabled = true; sel.add(ph);
    for (const k of creator.privacy_level_options) sel.add(new Option(pair(PRIVACY[k]) || k, k));
    for (const [id, off] of [['Comment', creator.comment_disabled], ['Duet', creator.duet_disabled], ['Stitch', creator.stitch_disabled]]) {
      const c = $('#tt' + id); c.checked = false; c.disabled = off;
      c.closest('label').classList.toggle('off', off);
      c.closest('label').title = off ? tr('Desactivado en la configuración de privacidad de tu cuenta de TikTok', 'Turned off in your TikTok account privacy settings') : '';
    }
    $('#ttDisclose').checked = false; $('#ttYours').checked = false; $('#ttBrand').checked = false;
    const tooLong = creator.max_video_post_duration_sec && video.dur > creator.max_video_post_duration_sec;
    $('#ttDur').hidden = !tooLong;
    if (tooLong) $('#ttDur').textContent = tr(`Este video dura ${Math.round(video.dur)} s y tu cuenta permite hasta ${creator.max_video_post_duration_sec} s.`, `This video is ${Math.round(video.dur)} s long and your account allows up to ${creator.max_video_post_duration_sec} s.`);
    sync();
  }

  function sync() {
    const disclose = $('#ttDisclose').checked, yours = $('#ttYours').checked, brand = $('#ttBrand').checked;
    $('#ttCommercial').hidden = !disclose;
    // El contenido de marca no puede ser privado: se bloquea «Solo yo» y, si estaba elegido, se pide elegir otra vez
    const self = [...$('#ttPrivacy').options].find((o) => o.value === 'SELF_ONLY');
    if (self) {
      self.disabled = disclose && brand;
      self.title = self.disabled ? tr('La visibilidad del contenido de marca no puede ser privada.', 'Branded content visibility cannot be set to private.') : '';
      if (self.disabled && $('#ttPrivacy').value === 'SELF_ONLY') $('#ttPrivacy').selectedIndex = 0;
    }
    $('#ttBrandNote').hidden = !(disclose && brand);
    const label = disclose && brand ? tr('Colaboración pagada', 'Paid partnership') : disclose && yours ? tr('Contenido promocional', 'Promotional content') : '';
    $('#ttLabel').hidden = !label; $('#ttLabel').textContent = label ? tr(`Tu video se etiquetará como «${label}».`, `Your video will be labeled “${label}”.`) : '';
    // Declaración: con contenido de marca se agrega la política de contenido de marca
    const music = `<a href="${MUSIC}" target="_blank" rel="noopener">${tr('Confirmación de uso de música', 'Music Usage Confirmation')}</a>`;
    const branded = `<a href="${BRANDED}" target="_blank" rel="noopener">${tr('Política de contenido de marca', 'Branded Content Policy')}</a>`;
    $('#ttConsent').innerHTML = disclose && brand
      ? tr(`Al publicar, aceptas la ${branded} y la ${music} de TikTok.`, `By posting, you agree to TikTok's ${branded} and ${music}.`)
      : tr(`Al publicar, aceptas la ${music} de TikTok.`, `By posting, you agree to TikTok's ${music}.`);
    const draft = mode === 'draft';
    $('#ttDirect').hidden = draft; $('#ttDraftNote').hidden = !draft;
    $('#ttGo').textContent = draft ? tr('Enviar a TikTok', 'Send to TikTok') : tr('Publicar', 'Post');
    let why = '';
    if (!creator) why = tr('Conecta tu cuenta de TikTok.', 'Connect your TikTok account.');
    else if (draft) why = $('#ttDur').hidden ? '' : $('#ttDur').textContent;
    else if (!$('#ttPrivacy').value) why = tr('Elige quién puede ver el video.', 'Choose who can view the video.');
    else if (disclose && !yours && !brand) why = tr('Debes indicar si tu contenido te promociona a ti, a un tercero o a ambos.', 'You need to indicate if your content promotes yourself, a third party, or both.');
    else if (!$('#ttDur').hidden) why = $('#ttDur').textContent;
    $('#ttGo').disabled = !!why || busy;
    $('#ttGoWrap').title = why;
    $('#ttWhy').textContent = busy ? '' : why;
    $('#ttCount').textContent = `${$('#ttTitle').value.length}/2200`;
  }
  form.addEventListener('input', sync);
  form.addEventListener('change', sync);

  /* ---------- Publicar ---------- */
  const setStatus = (msg, kind = '') => { const el = $('#ttStatus'); el.textContent = msg; el.className = 'tt-status ' + kind; el.hidden = !msg; };

  async function publish(ev) {
    ev.preventDefault();
    if (busy || $('#ttGo').disabled) return;
    busy = true; sync(); form.querySelectorAll('input,select,textarea,button').forEach((x) => { x.dataset.was = x.disabled ? '1' : ''; x.disabled = true; });
    try {
      setStatus(tr('Subiendo el video…', 'Uploading the video…'));
      const { upload } = await import(BLOB_CLIENT);
      const ext = video.ext === 'mp4' ? 'mp4' : 'webm';
      const blob = await upload(`media/circularte.${ext}`, video.blob, {
        access: 'public', handleUploadUrl: '/api/tiktok-upload', contentType: ext === 'mp4' ? 'video/mp4' : 'video/webm',
        multipart: video.blob.size > 40e6,
        onUploadProgress: (p) => setStatus(`${tr('Subiendo el video…', 'Uploading the video…')} ${Math.round(p.percentage)}%`)
      });
      setStatus(tr('Enviando a TikTok…', 'Sending to TikTok…'));
      const { ticket } = await api('/api/tiktok-publish', {
        mode, blobUrl: blob.url, title: $('#ttTitle').value, privacy_level: $('#ttPrivacy').value, duration: video.dur,
        allow_comment: $('#ttComment').checked, allow_duet: $('#ttDuet').checked, allow_stitch: $('#ttStitch').checked,
        disclose: $('#ttDisclose').checked, brand_organic_toggle: $('#ttDisclose').checked && $('#ttYours').checked,
        brand_content_toggle: $('#ttDisclose').checked && $('#ttBrand').checked,
        cover_ms: video.coverMs // modo suspenso: portada a mitad del dibujo
      });
      const later = tr('Puede tardar unos minutos en aparecer en tu perfil.', 'It may take a few minutes to show up on your profile.');
      setStatus(tr('TikTok está procesando el video. ', 'TikTok is processing the video. ') + later);
      const t0 = Date.now();
      for (;;) {
        await new Promise((r) => setTimeout(r, 5000));
        const s = await api('/api/tiktok-status', { ticket });
        if (s.status === 'FAILED') throw new Error(`${pair(STATUS_TEXT.FAILED)} ${tr('Motivo', 'Reason')}: ${pair(FAIL_TEXT[s.fail_reason]) || s.fail_reason || tr('desconocido', 'unknown')}.`);
        if (s.done) { setStatus(s.status === 'SEND_TO_USER_INBOX' ? tr('Listo: abre TikTok y toca la notificación para terminar la publicación.', 'Done: open TikTok and tap the notification to finish the post.') : `${pair(STATUS_TEXT[s.status]) || s.status} ${later}`, 'ok'); toast(tr('Video enviado a TikTok', 'Video sent to TikTok')); break; }
        if (Date.now() - t0 > 4 * 60e3) { setStatus(tr('TikTok sigue procesando el video. Revisa tu perfil en unos minutos.', 'TikTok is still processing the video. Check your profile in a few minutes.'), 'ok'); break; }
        setStatus(`${pair(STATUS_TEXT[s.status]) || tr('Procesando…', 'Processing…')} ${later}`);
      }
      // Todo el formulario quedó desactivado durante el envío; «Listo» y la ✕ tienen que poder cerrar
      $('#ttDone').hidden = false; $('#ttGoWrap').hidden = true; $('#ttDone').disabled = false; $('#ttClose').disabled = false;
    } catch (e) {
      setStatus(e.message, 'err');
      form.querySelectorAll('input,select,textarea,button').forEach((x) => { x.disabled = x.dataset.was === '1'; });
    } finally { busy = false; sync(); }
  }
  form.addEventListener('submit', publish);

  const connectMsg = () => tr('Para publicar, conecta la cuenta de TikTok donde quieres que aparezca el video.', 'To post, connect the TikTok account where you want the video to appear.');
  // Cambio de idioma con el diálogo abierto: se traducen las opciones sin perder lo elegido
  onLang(() => {
    const sel = $('#ttPrivacy');
    for (const o of sel.options) o.text = o.value ? pair(PRIVACY[o.value]) || o.value : tr('Elige quién puede verlo', 'Choose who can view it');
    if (!$('#ttConnectMsg').textContent || !creator) $('#ttConnectMsg').textContent = connectMsg();
    if (creator && video) { const d = $('#ttDur'); if (!d.hidden) d.textContent = tr(`Este video dura ${Math.round(video.dur)} s y tu cuenta permite hasta ${creator.max_video_post_duration_sec} s.`, `This video is ${Math.round(video.dur)} s long and your account allows up to ${creator.max_video_post_duration_sec} s.`); }
    sync();
  });

  /* ---------- Abrir / cerrar ---------- */
  function open(v, suggestedTitle) {
    if (busy) { dlg.showModal(); return; }
    video = v;
    $('#ttPreview').src = v.url; if (v.thumb) $('#ttPreview').poster = v.thumb;
    $('#ttTitle').value = suggestedTitle; setMode('direct');
    $('#ttDone').hidden = true; $('#ttGoWrap').hidden = false; setStatus('');
    form.querySelectorAll('input,select,textarea,button').forEach((x) => { x.disabled = false; });
    $('#ttConnectMsg').textContent = connectMsg();
    dlg.showModal();
    loadCreator();
  }
  $('#ttClose').addEventListener('click', () => { if (!busy) dlg.close(); else toast(tr('Espera a que termine el envío.', 'Wait for the upload to finish.')); });
  dlg.addEventListener('cancel', (e) => { if (busy) e.preventDefault(); });
  dlg.addEventListener('close', () => { $('#ttPreview').pause(); });
  $('#ttConnectBtn').addEventListener('click', connect);
  $('#ttSwitch').addEventListener('click', disconnect);
  $('#ttDone').addEventListener('click', () => dlg.close());

  return { open };
}
