/* CirculArte · idioma de la interfaz (es | en).
   Los textos fijos del HTML llevan su versión en inglés al lado: data-en (texto), data-en-html (con enlaces)
   y data-en-<atributo> (aria-label, placeholder, title, content). El español es el que ya está en el HTML.
   Los textos que arma el código usan tr('español', 'english'). */

const KEY = 'circularte.lang', ATTRS = ['aria-label', 'placeholder', 'title', 'content'];

function detect() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'es' || q === 'en') return q;
    const s = localStorage.getItem(KEY);
    if (s === 'es' || s === 'en') return s;
  } catch { /* sin almacenamiento */ }
  return /^es\b/i.test(navigator.language || '') ? 'es' : 'en';
}

export let lang = detect();
export const tr = (es, en) => (lang === 'en' ? en : es);

const listeners = [];
export const onLang = (fn) => { listeners.push(fn); };

export function setLang(l) {
  if (l !== 'es' && l !== 'en') return;
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* sin almacenamiento */ }
  applyStatic();
  listeners.forEach((fn) => fn(l));
}

export function applyStatic(root = document) {
  const en = lang === 'en';
  document.documentElement.lang = lang;
  for (const el of root.querySelectorAll('[data-en]')) {
    if (el.dataset.es === undefined) el.dataset.es = el.textContent;
    el.textContent = en ? el.dataset.en : el.dataset.es;
  }
  for (const el of root.querySelectorAll('[data-en-html]')) {
    if (el.dataset.esHtml === undefined) el.dataset.esHtml = el.innerHTML;
    el.innerHTML = en ? el.dataset.enHtml : el.dataset.esHtml;
  }
  for (const a of ATTRS) {
    for (const el of root.querySelectorAll(`[data-en-${a}]`)) {
      if (!el.hasAttribute(`data-es-${a}`)) el.setAttribute(`data-es-${a}`, el.getAttribute(a) || '');
      el.setAttribute(a, el.getAttribute(en ? `data-en-${a}` : `data-es-${a}`));
    }
  }
  // Bloques largos escritos en los dos idiomas (páginas legales): <div data-lang="es"> y <div data-lang="en">
  for (const el of root.querySelectorAll('[data-lang]')) el.hidden = el.dataset.lang !== lang;
  for (const b of root.querySelectorAll('.lang button')) b.setAttribute('aria-pressed', String(b.dataset.l === lang));
}

// Selector «ES · EN»: cualquier .lang con botones data-l
export function initLangSwitch(root = document) {
  for (const box of root.querySelectorAll('.lang')) {
    box.addEventListener('click', (e) => { const b = e.target.closest('button[data-l]'); if (b) setLang(b.dataset.l); });
  }
  applyStatic(root);
}
