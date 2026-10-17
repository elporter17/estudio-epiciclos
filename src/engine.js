/* CirculArte · motor compartido entre la web (index.html) y Node (scripts/render.mjs).
   Matemática pura + dibujo en un contexto 2D. Lo que depende del entorno (crear lienzos,
   Path2D, DOMMatrix, cargar fuentes) pasa por `env`, que en el navegador usa el DOM y en
   Node se reemplaza con setEnv(). */
export const TAU = Math.PI * 2, M = 2048, P = 1024, KMAX = 500;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const COS = new Float64Array(M), SIN = new Float64Array(M);
for (let n = 0; n < M; n++) { COS[n] = Math.cos(TAU * n / M); SIN[n] = Math.sin(TAU * n / M); }

const env = {
  createCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; },
  Path2D: globalThis.Path2D,
  DOMMatrix: globalThis.DOMMatrix,
  loadFont: (font, text) => document.fonts.load(font, text),
  fonts: {},
  fallback: '' // familias extra al final del texto gancho (en Node: la fuente de emoji)
};
export function setEnv(e) { Object.assign(env, e); }

export const DEFAULT_SETTINGS = {
  style: 'xy', nseq: '1, 3, 6, 12, 25, 50, 100, 200', rev: 3, guide: 18, reveal: true, formulas: true,
  accent: '#ff7a52', caption: '', format: '9:16', quality: 720, record: true, signature: true, labels: 'full'
};

// Tamaño del lienzo según formato y calidad, igual que en la web
export function canvasSize(format, quality) {
  const q = +quality; let W, H;
  if (format === '9:16') { W = q === 1080 ? 1080 : 720; H = Math.round(W * 16 / 9); }
  else if (format === '1:1') { W = H = q === 1080 ? 1080 : 720; }
  else { H = q === 1080 ? 1080 : 720; W = Math.round(H * 16 / 9); }
  return { W, H, U: Math.min(W, H) / 720 };
}

/* ---------------- Expresiones matemáticas ---------------- */
const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  exp: Math.exp, log: Math.log, ln: Math.log, log10: Math.log10, floor: Math.floor, ceil: Math.ceil,
  round: Math.round, sign: Math.sign, frac: (x) => x - Math.floor(x), sec: (x) => 1 / Math.cos(x),
  csc: (x) => 1 / Math.sin(x), cot: (x) => 1 / Math.tan(x), sen: Math.sin,
  min: Math.min, max: Math.max, pow: Math.pow, atan2: Math.atan2, hypot: Math.hypot,
  mod: (a, b) => ((a % b) + b) % b
};
const CONSTS = { pi: Math.PI, 'π': Math.PI, tau: TAU, 'τ': TAU, e: Math.E };

function tokenize(s) {
  const out = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
      if (!m) throw new Error(`Número mal escrito cerca de «${s.slice(i, i + 6)}»`);
      out.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue;
    }
    if (/[a-zA-Zπτθ_]/.test(c)) {
      const m = /^([πτθ]|[a-zA-Z_][a-zA-Z0-9_]*)/.exec(s.slice(i));
      out.push({ t: 'id', v: m[0].toLowerCase() }); i += m[0].length; continue;
    }
    if ('+-*/^(),'.includes(c)) { out.push({ t: c }); i++; continue; }
    if (c === '·' || c === '×') { out.push({ t: '*' }); i++; continue; }
    if (c === '−') { out.push({ t: '-' }); i++; continue; }
    if (c === '²' || c === '³') { out.push({ t: '^' }, { t: 'num', v: c === '²' ? 2 : 3 }); i++; continue; }
    throw new Error(`No entiendo el símbolo «${c}»`);
  }
  return out;
}

export function compileExpr(src) {
  if (!String(src).trim()) throw new Error('Falta escribir la función.');
  const T = tokenize(String(src)); let p = 0;
  const eat = (t) => (T[p] && T[p].t === t) ? (p++, true) : false;
  const need = (t) => { if (!eat(t)) throw new Error(t === ')' ? 'Falta cerrar un paréntesis.' : `Esperaba «${t}».`); };
  function expr() {
    let a = term();
    for (;;) {
      if (eat('+')) { const l = a, r = term(); a = (t) => l(t) + r(t); }
      else if (eat('-')) { const l = a, r = term(); a = (t) => l(t) - r(t); }
      else return a;
    }
  }
  function term() {
    let a = unary();
    for (;;) {
      const k = T[p]; if (!k) return a;
      if (k.t === '*') { p++; const l = a, r = unary(); a = (t) => l(t) * r(t); }
      else if (k.t === '/') { p++; const l = a, r = unary(); a = (t) => l(t) / r(t); }
      else if (k.t === 'num' || k.t === 'id' || k.t === '(') { const l = a, r = power(); a = (t) => l(t) * r(t); }
      else return a;
    }
  }
  function unary() {
    if (eat('-')) { const a = unary(); return (t) => -a(t); }
    if (eat('+')) return unary();
    return power();
  }
  function power() {
    const b = atom();
    if (eat('^')) { const e = unary(); return (t) => Math.pow(b(t), e(t)); }
    return b;
  }
  function atom() {
    const k = T[p++];
    if (!k) throw new Error('La expresión termina antes de tiempo.');
    if (k.t === 'num') { const v = k.v; return () => v; }
    if (k.t === '(') { const a = expr(); need(')'); return a; }
    if (k.t === 'id') {
      const n = k.v;
      if (FUNCS[n]) {
        if (!eat('(')) throw new Error(`Escribe ${n}(...) con paréntesis.`);
        const args = [expr()]; while (eat(',')) args.push(expr()); need(')');
        const f = FUNCS[n];
        if (args.length === 1) { const a = args[0]; return (t) => f(a(t)); }
        if (args.length === 2) { const a = args[0], b = args[1]; return (t) => f(a(t), b(t)); }
        throw new Error(`${n} recibe demasiados valores.`);
      }
      if (n === 't' || n === 'θ' || n === 'x') return (t) => t;
      if (CONSTS[n] !== undefined) { const v = CONSTS[n]; return () => v; }
      throw new Error(`No conozco «${n}». Usa t, pi, e y funciones como sin, cos, abs, sqrt, exp.`);
    }
    throw new Error(`Sobra «${k.t}».`);
  }
  const f = expr();
  if (p < T.length) throw new Error(`Sobra «${T[p].v ?? T[p].t}» al final.`);
  return f;
}

/* ---------------- Figuras: imagen → contornos ---------------- */
const analysisCache = new WeakMap();
export function analyze(img, mode, maxDim) {
  let per = analysisCache.get(img); if (!per) { per = {}; analysisCache.set(img, per); }
  const key = mode + '|' + maxDim; if (per[key]) return per[key];
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const sc = Math.min(1, maxDim / Math.max(iw, ih));
  const W = Math.max(8, Math.round(iw * sc)), H = Math.max(8, Math.round(ih * sc));
  const c = env.createCanvas(W, H);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data, N = W * H, val = new Float32Array(N);
  let transparent = 0;
  for (let i = 0; i < N; i++) if (d[i * 4 + 3] < 200) transparent++;
  const hasAlpha = transparent > N * 0.02;
  if (mode === 'bordes') {
    const lum = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = d[i * 4 + 3] / 255, l = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      lum[i] = l * a + 255 * (1 - a);
    }
    const blur = (src) => {
      const o = new Float32Array(N);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let s = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; s += src[yy * W + xx]; n++;
        }
        o[y * W + x] = s / n;
      }
      return o;
    };
    const L = blur(blur(lum)); const mag = new Float32Array(N); const sorted = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = -L[i - W - 1] - 2 * L[i - 1] - L[i + W - 1] + L[i - W + 1] + 2 * L[i + 1] + L[i + W + 1];
      const gy = -L[i - W - 1] - 2 * L[i - W] - L[i - W + 1] + L[i + W - 1] + 2 * L[i + W] + L[i + W + 1];
      mag[i] = Math.hypot(gx, gy); if ((i & 7) === 0) sorted.push(mag[i]);
    }
    sorted.sort((a, b) => a - b);
    const ref = Math.max(1e-6, sorted[Math.floor(sorted.length * 0.995)] || 1);
    for (let i = 0; i < N; i++) val[i] = Math.min(100, mag[i] / ref * 100);
  } else if (hasAlpha) {
    for (let i = 0; i < N; i++) val[i] = d[i * 4 + 3] / 2.55;
  } else {
    const rs = [], gs = [], bs = [];
    const take = (x, y) => { const i = (y * W + x) * 4; rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]); };
    for (let x = 0; x < W; x++) { take(x, 0); take(x, H - 1); }
    for (let y = 0; y < H; y++) { take(0, y); take(W - 1, y); }
    const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
    const br = med(rs), bgc = med(gs), bb = med(bs);
    for (let i = 0; i < N; i++) {
      const dr = d[i * 4] - br, dg = d[i * 4 + 1] - bgc, db = d[i * 4 + 2] - bb;
      val[i] = Math.min(100, Math.sqrt(dr * dr + dg * dg + db * db) / 4.41 * 1.6);
    }
  }
  const hist = new Float64Array(101); for (let i = 0; i < N; i++) hist[Math.round(val[i])]++;
  let sum = 0; for (let i = 0; i <= 100; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, otsu = 50;
  for (let i = 0; i <= 100; i++) {
    wB += hist[i]; if (!wB) continue; const wF = N - wB; if (!wF) break;
    sumB += i * hist[i]; const mB = sumB / wB, mF = (sum - sumB) / wF, v = wB * wF * (mB - mF) ** 2;
    if (v > best) { best = v; otsu = i; }
  }
  const res = { W, H, val, hasAlpha, otsu: clamp(otsu, 3, 95) };
  per[key] = res; return res;
}

export function marching(mask, W, H) {
  const GW = W + 2, GH = H + 2, nIds = GW * GH * 2;
  const adj = new Int32Array(nIds * 2).fill(-1);
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : mask[y * W + x];
  const hId = (x, y) => (((y + 1) * GW + (x + 1)) << 1);
  const vId = (x, y) => ((((y + 1) * GW + (x + 1)) << 1) | 1);
  const link = (a, b) => {
    if (adj[a * 2] < 0) adj[a * 2] = b; else adj[a * 2 + 1] = b;
    if (adj[b * 2] < 0) adj[b * 2] = a; else adj[b * 2 + 1] = a;
  };
  for (let y = -1; y < H; y++) for (let x = -1; x < W; x++) {
    const c = at(x, y) << 3 | at(x + 1, y) << 2 | at(x + 1, y + 1) << 1 | at(x, y + 1);
    if (c === 0 || c === 15) continue;
    const Tp = hId(x, y), Rt = vId(x + 1, y), Bt = hId(x, y + 1), Lf = vId(x, y);
    switch (c) {
      case 1: case 14: link(Lf, Bt); break;
      case 2: case 13: link(Bt, Rt); break;
      case 3: case 12: link(Lf, Rt); break;
      case 4: case 11: link(Tp, Rt); break;
      case 6: case 9: link(Tp, Bt); break;
      case 7: case 8: link(Tp, Lf); break;
      case 5: link(Tp, Rt); link(Lf, Bt); break;
      case 10: link(Tp, Lf); link(Bt, Rt); break;
    }
  }
  const vis = new Uint8Array(nIds), loops = [];
  for (let id = 0; id < nIds; id++) {
    if (adj[id * 2] < 0 || vis[id]) continue;
    const pts = []; let prev = -1, cur = id;
    for (;;) {
      vis[cur] = 1;
      const cell = cur >> 1, gx = cell % GW - 1, gy = ((cell / GW) | 0) - 1;
      if (cur & 1) pts.push(gx, gy + 0.5); else pts.push(gx + 0.5, gy);
      const n0 = adj[cur * 2], n1 = adj[cur * 2 + 1];
      const nx = n0 !== prev ? n0 : n1;
      prev = cur; cur = nx;
      if (cur === id || cur < 0 || vis[cur]) break;
    }
    if (pts.length >= 12) loops.push(pts);
  }
  return loops;
}

export function smoothLoop(p, passes) {
  let a = Float64Array.from(p); const n = a.length / 2;
  for (let s = 0; s < passes; s++) {
    const b = new Float64Array(a.length);
    for (let i = 0; i < n; i++) {
      const pi = ((i - 1 + n) % n) * 2, ni = ((i + 1) % n) * 2, ci = i * 2;
      b[ci] = .25 * a[pi] + .5 * a[ci] + .25 * a[ni];
      b[ci + 1] = .25 * a[pi + 1] + .5 * a[ci + 1] + .25 * a[ni + 1];
    }
    a = b;
  }
  return a;
}
// Todas las curvas en el mismo sentido: el lápiz gira siempre igual y el primer término captura más forma
export function orient(p) {
  const n = p.length / 2; let area = 0;
  for (let i = 0; i < n; i++) { const j = ((i + 1) % n) * 2; area += p[i * 2] * p[j + 1] - p[j] * p[i * 2 + 1]; }
  if (area >= 0) return p;
  const r = new Float64Array(p.length);
  for (let i = 0; i < n; i++) { r[i * 2] = p[(n - 1 - i) * 2]; r[i * 2 + 1] = p[(n - 1 - i) * 2 + 1]; }
  return r;
}
export const loopLen = (p) => { let L = 0; const n = p.length / 2; for (let i = 0; i < n; i++) { const j = ((i + 1) % n) * 2; L += Math.hypot(p[j] - p[i * 2], p[j + 1] - p[i * 2 + 1]); } return L; };

export function bitmapShape(img, o) {
  const A = analyze(img, o.mode, o.maxDim);
  const mask = new Uint8Array(A.W * A.H);
  for (let i = 0; i < mask.length; i++) mask[i] = ((A.val[i] > o.thr) ? 1 : 0) ^ (o.invert ? 1 : 0);
  let loops = marching(mask, A.W, A.H).map((p) => { const s = orient(smoothLoop(p, 3)); return { pts: s, len: loopLen(s), closed: true }; });
  loops.sort((a, b) => b.len - a.len);
  if (!loops.length) throw new Error('No encontré contornos. Mueve el umbral o activa «Invertir».');
  const minLen = Math.max(10, loops[0].len * 0.3 * Math.pow(0.02, o.detail / 100));
  loops = loops.filter((l) => l.len >= minLen).slice(0, 90);
  let image = img;
  if (o.cutout && !A.hasAlpha) {
    const mc = env.createCanvas(A.W, A.H);
    const mg = mc.getContext('2d'); const id = mg.createImageData(A.W, A.H);
    for (let i = 0; i < mask.length; i++) { id.data[i * 4 + 3] = mask[i] ? 255 : 0; }
    mg.putImageData(id, 0, 0);
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const k = Math.min(1, 1600 / Math.max(iw, ih));
    const oc = env.createCanvas(Math.round(iw * k), Math.round(ih * k));
    const og = oc.getContext('2d'); og.drawImage(img, 0, 0, oc.width, oc.height);
    og.globalCompositeOperation = 'destination-in'; og.imageSmoothingQuality = 'high';
    og.drawImage(mc, 0, 0, oc.width, oc.height);
    image = oc;
  }
  return { contours: loops, image, imgRect: { x: 0, y: 0, w: A.W, h: A.H }, analysis: A };
}

export function exprShape(def) {
  const per = clamp(+def.periods || 1, 0.05, 48), tmax = TAU * per;
  const n = Math.round(clamp(3000 * per, 3000, 30000));
  let fx, fy, fr;
  if (def.mode === 'polar') fr = compileExpr(def.r); else { fx = compileExpr(def.x); fy = compileExpr(def.y); }
  const pts = [];
  for (let j = 0; j < n; j++) {
    const t = tmax * j / n; let x, y;
    if (fr) { const r = fr(t); x = r * Math.cos(t); y = r * Math.sin(t); } else { x = fx(t); y = fy(t); }
    if (Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) < 1e7 && Math.abs(y) < 1e7) pts.push(x, -y);
  }
  if (pts.length < 40) throw new Error('La función casi no da valores válidos. Revisa divisiones entre cero o raíces de negativos.');
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); }
  if (Math.max(x1 - x0, y1 - y0) < 1e-9) throw new Error('La curva se queda en un solo punto.');
  return { contours: [{ pts: Float64Array.from(pts), len: 1, closed: false }], image: null };
}

export const FONTS = {
  cursiva: { family: '"Pacifico", "Segoe Script", cursive', weight: 400, style: 'normal' },
  elegante: { family: '"Playfair Display", Georgia, serif', weight: 700, style: 'normal' },
  bloque: { family: '"Archivo Black", Impact, sans-serif', weight: 400, style: 'normal' },
  clasica: { family: '"STIX Two Text", "Times New Roman", serif', weight: 400, style: 'italic' },
  emoji: { family: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif', weight: 400, style: 'normal' }
};
export const EMOJI = /\p{Extended_Pictographic}/u;
export async function textCanvas(text, fk, accent) {
  const F = FONTS[fk] || FONTS.cursiva, size = 240;
  const font = `${F.style} ${F.weight} ${size}px ${env.fonts[fk] || F.family}`;
  try { await env.loadFont(font, text); } catch { /* usa respaldo */ }
  const mg = env.createCanvas(16, 16).getContext('2d');
  mg.font = font; const m = mg.measureText(text);
  const asc = m.actualBoundingBoxAscent || size * .8, desc = m.actualBoundingBoxDescent || size * .25;
  const left = m.actualBoundingBoxLeft || 0, right = m.actualBoundingBoxRight || m.width, pad = size * .12;
  const c = env.createCanvas(Math.max(16, Math.ceil(left + right + pad * 2)), Math.max(16, Math.ceil(asc + desc + pad * 2))), g = c.getContext('2d');
  g.font = font; g.fillStyle = accent; g.fillText(text, pad + left, pad + asc);
  // Los emoji se vuelven silueta plana del color del trazo, como en los videos virales
  if (EMOJI.test(text)) { g.globalCompositeOperation = 'source-in'; g.fillRect(0, 0, c.width, c.height); }
  return c;
}

export function kochPts(level) {
  let pts = [0, 1, 2].map((i) => { const a = -Math.PI / 2 + i * TAU / 3; return [Math.cos(a), Math.sin(a)]; });
  const c = Math.cos(-Math.PI / 3), s = Math.sin(-Math.PI / 3);
  for (let l = 0; l < level; l++) {
    const next = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], dx = (bx - ax) / 3, dy = (by - ay) / 3;
      next.push([ax, ay], [ax + dx, ay + dy], [ax + dx + dx * c - dy * s, ay + dy + dx * s + dy * c], [ax + 2 * dx, ay + 2 * dy]);
    }
    pts = next;
  }
  return Float64Array.from(pts.flat());
}

/* ---------------- Unir, remuestrear, Fourier ---------------- */
export function joinContours(cs) {
  const xs = [], ys = [], fl = [];
  const push = (x, y, flag) => { if (xs.length) fl.push(flag); xs.push(x); ys.push(y); };
  const addLoop = (c, start) => {
    const p = c.pts, n = p.length / 2;
    for (let q = 0; q < n; q++) { const i = ((start + q) % n) * 2; push(p[i], p[i + 1], q === 0 ? 1 : 0); }
    if (c.closed) push(p[start * 2], p[start * 2 + 1], 0);
  };
  const used = new Uint8Array(cs.length);
  addLoop(cs[0], 0); used[0] = 1;
  for (let r = 1; r < cs.length; r++) {
    const ex = xs[xs.length - 1], ey = ys[ys.length - 1];
    let best = -1, bj = 0, bd = Infinity;
    for (let ci = 0; ci < cs.length; ci++) {
      if (used[ci]) continue; const p = cs[ci].pts, n = p.length / 2;
      for (let j = 0; j < n; j++) { const dx = p[2 * j] - ex, dy = p[2 * j + 1] - ey, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = ci; bj = j; } }
    }
    used[best] = 1; addLoop(cs[best], bj);
  }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < xs.length; i++) { x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i]); y0 = Math.min(y0, ys[i]); y1 = Math.max(y1, ys[i]); }
  const n = xs.length, gap = Math.hypot(xs[n - 1] - xs[0], ys[n - 1] - ys[0]);
  fl.push(gap > 0.02 * Math.hypot(x1 - x0, y1 - y0) ? 1 : 0);
  return { x: xs, y: ys, f: fl, box: { x0, x1, y0, y1 } };
}

export function resample(J) {
  const n = J.x.length, segL = new Float64Array(n); let L = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; segL[i] = Math.hypot(J.x[j] - J.x[i], J.y[j] - J.y[i]); L += segL[i]; }
  if (!(L > 0)) throw new Error('La figura no tiene largo.');
  const x = new Float64Array(M), y = new Float64Array(M), conn = new Uint8Array(M);
  let i = 0, acc = 0;
  for (let m = 0; m < M; m++) {
    const target = L * m / M;
    while (i < n - 1 && acc + segL[i] < target) { acc += segL[i]; i++; }
    const t = segL[i] > 0 ? clamp((target - acc) / segL[i]) : 0, j = (i + 1) % n;
    x[m] = lerp(J.x[i], J.x[j], t); y[m] = lerp(J.y[i], J.y[j], t); conn[m] = J.f[i];
  }
  return { x, y, conn };
}

export function computeSeries(x, y) {
  let a0 = 0, c0 = 0; for (let n = 0; n < M; n++) { a0 += x[n]; c0 += y[n]; } a0 /= M; c0 /= M;
  const A = new Float64Array(KMAX + 1), B = new Float64Array(KMAX + 1), C = new Float64Array(KMAX + 1), D = new Float64Array(KMAX + 1);
  for (let k = 1; k <= KMAX; k++) {
    let sa = 0, sb = 0, sc = 0, sd = 0, idx = 0;
    for (let n = 0; n < M; n++) {
      const co = COS[idx], si = SIN[idx], xv = x[n], yv = y[n];
      sa += xv * co; sb += xv * si; sc += yv * co; sd += yv * si;
      idx += k; if (idx >= M) idx -= M;
    }
    A[k] = sa * 2 / M; B[k] = sb * 2 / M; C[k] = sc * 2 / M; D[k] = sd * 2 / M;
  }
  let E = 0; for (let n = 0; n < M; n++) E += (x[n] - a0) ** 2 + (y[n] - c0) ** 2; E /= M;
  const Rx = new Float64Array(KMAX + 1), Px = new Float64Array(KMAX + 1), Ry = new Float64Array(KMAX + 1), Py = new Float64Array(KMAX + 1);
  const capXY = new Float64Array(KMAX + 1);
  const terms = [];
  for (let k = 1; k <= KMAX; k++) {
    Rx[k] = Math.hypot(A[k], B[k]); Px[k] = Math.atan2(B[k], A[k]);
    Ry[k] = Math.hypot(C[k], D[k]); Py[k] = Math.atan2(D[k], C[k]);
    capXY[k] = capXY[k - 1] + (A[k] ** 2 + B[k] ** 2 + C[k] ** 2 + D[k] ** 2) / 2;
    const p = { k, re: (A[k] + D[k]) / 2, im: (C[k] - B[k]) / 2 }, q = { k: -k, re: (A[k] - D[k]) / 2, im: (C[k] + B[k]) / 2 };
    p.mag = Math.hypot(p.re, p.im); q.mag = Math.hypot(q.re, q.im); terms.push(p, q);
  }
  terms.sort((a, b) => b.mag - a.mag);
  const capZ = new Float64Array(terms.length + 1);
  for (let i = 0; i < terms.length; i++) capZ[i + 1] = capZ[i] + terms[i].mag ** 2;
  // Decaimiento de los brazos: ajuste log-log de la amplitud contra k
  const amps = []; let amax = 0;
  for (let k = 1; k <= 120; k++) { const a = Math.sqrt(A[k] ** 2 + B[k] ** 2 + C[k] ** 2 + D[k] ** 2); amps.push(a); amax = Math.max(amax, a); }
  let sx = 0, sy = 0, sxx = 0, sxy = 0, cnt = 0;
  amps.forEach((a, i) => { if (a > amax * 1e-5) { const lx = Math.log(i + 1), ly = Math.log(a); sx += lx; sy += ly; sxx += lx * lx; sxy += lx * ly; cnt++; } });
  const decay = cnt >= 8 ? -(cnt * sxy - sx * sy) / (cnt * sxx - sx * sx) : null;
  return { a0, c0, A, B, C, D, E, Rx, Px, Ry, Py, capXY, terms, capZ, decay };
}

/* ---------------- Escena ---------------- */
// Devuelve la escena S. Después hay que llamar refreshStages(S, settings) y relayout(S, settings, view).
export function buildScene(shape, meta) {
  const J = joinContours(shape.contours);
  const bcx = (J.box.x0 + J.box.x1) / 2, bcy = (J.box.y0 + J.box.y1) / 2;
  const half = Math.max(J.box.x1 - J.box.x0, J.box.y1 - J.box.y0) / 2 || 1;
  const R = resample(J);
  for (let m = 0; m < M; m++) { R.x[m] = (R.x[m] - bcx) / half; R.y[m] = (R.y[m] - bcy) / half; }
  const ser = computeSeries(R.x, R.y);
  const connP = new Uint8Array(P); for (let j = 0; j < P; j++) connP[j] = R.conn[j * (M / P)];
  const fillPath = new env.Path2D(), linePath = new env.Path2D();
  let inRun = false;
  for (let m = 0; m < M; m++) {
    const x = R.x[m], y = R.y[m];
    if (m === 0) fillPath.moveTo(x, y); else fillPath.lineTo(x, y);
    if (!R.conn[m]) { if (!inRun) { linePath.moveTo(x, y); inRun = true; } const nx = R.x[(m + 1) % M], ny = R.y[(m + 1) % M]; linePath.lineTo(nx, ny); }
    else inRun = false;
  }
  fillPath.closePath();
  const ir = shape.imgRect;
  return {
    name: meta.name, fill: meta.fill || 'soft', exprLines: meta.exprLines || null,
    image: shape.image, imgRect: ir ? { x: (ir.x - bcx) / half, y: (ir.y - bcy) / half, w: ir.w / half, h: ir.h / half } : null,
    samples: R, ser, connP, fillPath, linePath, curves: new Map(), parts: shape.contours.length,
    hx: (J.box.x1 - J.box.x0) / 2 / half, hy: (J.box.y1 - J.box.y0) / 2 / half
  };
}

export function parseStages(nseq) {
  const v = String(nseq).split(/[^0-9]+/).map(Number).filter((n) => n >= 1).map((n) => Math.min(KMAX, Math.round(n)));
  const u = [...new Set(v)].sort((a, b) => a - b);
  return u.length ? u : [1, 3, 6, 12, 25, 50, 100, 200];
}

export function refreshStages(S, settings) {
  S.stages = parseStages(settings.nseq);
  const N = S.stages[S.stages.length - 1], ser = S.ser;
  let rx = 0, ry = 0;
  for (let j = 0; j < 256; j++) {
    const t = TAU * j / 256; let px = 0, py = 0;
    for (let k = 1; k <= N; k++) {
      const sn = Math.sin(k * t), cs = Math.cos(k * t);
      rx = Math.max(rx, Math.abs(px) + ser.Rx[k]); px += ser.A[k] * sn - ser.B[k] * cs;
      ry = Math.max(ry, Math.abs(py) + ser.Ry[k]); py += ser.C[k] * sn - ser.D[k] * cs;
    }
  }
  S.rhoX = clamp(rx, 0.3, 1.6); S.rhoY = clamp(ry, 0.3, 1.6);
}

export function relayout(S, settings, view) {
  const { W, H } = view, f = settings.format, cap = settings.caption.trim() ? 1 : 0, hx = S.hx, hy = S.hy, L = {};
  if (settings.style === 'xy') {
    const g = 0.32, rx = S.rhoX, ry = S.rhoY, Wc = 2 * ry + g + 2 * hx, Hc = 2 * rx + g + 2 * hy;
    let left, top;
    if (f === '16:9') {
      L.s = Math.min(W * 0.58 / Wc, H * (cap ? 0.76 : 0.86) / Hc);
      left = W * 0.06; top = (H - Hc * L.s) / 2 + (cap ? H * 0.05 : 0);
      L.tx = (left + Wc * L.s + W) / 2; L.ty = H * 0.47;
    } else {
      const tall = f === '9:16';
      L.s = Math.min(W * 0.9 / Wc, H * (tall ? (cap ? 0.5 : 0.55) : (cap ? 0.6 : 0.66)) / Hc);
      left = (W - Wc * L.s) / 2; top = H * (tall ? (cap ? 0.11 : 0.07) : (cap ? 0.1 : 0.05));
      L.tx = W / 2; L.ty = top + Hc * L.s + H * (tall ? 0.085 : 0.1);
    }
    L.cx = left + (2 * ry + g + hx) * L.s; L.cy = top + (2 * rx + g + hy) * L.s;
    L.xChainY = L.cy - (hy + g + rx) * L.s; L.yChainX = L.cx - (hx + g + ry) * L.s;
  } else {
    if (f === '9:16') { L.s = W * 0.33; L.cx = W / 2; L.cy = H * (cap ? 0.38 : 0.36); L.tx = W / 2; L.ty = H * 0.74; }
    else if (f === '1:1') { L.s = W * 0.28; L.cx = W / 2; L.cy = H * (cap ? 0.44 : 0.41); L.tx = W / 2; L.ty = H * 0.85; }
    else { L.s = H * 0.33; L.cx = W * 0.36; L.cy = H * (cap ? 0.54 : 0.5); L.tx = W * 0.77; L.ty = H * 0.47; }
  }
  if (f === '9:16') { L.rcx = W / 2; L.rcy = H * (cap ? 0.34 : 0.31); L.rs = W * 0.34; L.fx = W / 2; L.fy = H * 0.6; L.falign = 'center'; }
  else if (f === '1:1') { L.rcx = W / 2; L.rcy = H * (cap ? 0.37 : 0.34); L.rs = W * 0.24; L.fx = W / 2; L.fy = H * 0.7; L.falign = 'center'; }
  else { L.rcx = W * 0.29; L.rcy = H * (cap ? 0.54 : 0.5); L.rs = H * 0.34; L.fx = W * 0.68; L.fy = H * 0.36; L.falign = 'center'; }
  S.L = L;
}

export function curveFor(S, style, N) {
  const key = style + N; if (S.curves.has(key)) return S.curves.get(key);
  const ser = S.ser, x = new Float64Array(P), y = new Float64Array(P), st = M / P;
  x.fill(ser.a0); y.fill(ser.c0);
  if (style === 'xy') {
    for (let k = 1; k <= N; k++) {
      const a = ser.A[k], b = ser.B[k], c = ser.C[k], d = ser.D[k];
      if (ser.Rx[k] + ser.Ry[k] < 1e-10) continue;
      let idx = 0; const inc = (k * st) % M;
      for (let j = 0; j < P; j++) { const co = COS[idx], si = SIN[idx]; x[j] += a * co + b * si; y[j] += c * co + d * si; idx += inc; if (idx >= M) idx -= M; }
    }
  } else {
    for (let i = 0; i < N; i++) {
      const T = ser.terms[i]; let idx = 0; const inc = (((T.k * st) % M) + M) % M;
      for (let j = 0; j < P; j++) { const co = COS[idx], si = SIN[idx]; x[j] += T.re * co - T.im * si; y[j] += T.re * si + T.im * co; idx += inc; if (idx >= M) idx -= M; }
    }
  }
  const c = { x, y }; S.curves.set(key, c); return c;
}
export const errFor = (S, style, N) => {
  const ser = S.ser; const cap = style === 'xy' ? ser.capXY[N] : ser.capZ[Math.min(N, ser.terms.length)];
  return 100 * Math.sqrt(Math.max(0, ser.E - cap) / ser.E);
};

/* ---------------- Dibujo ---------------- */
const FG = '#f3eeea', GOLD = '#ffd98a', BG = '#141112';
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
const mathFont = (sz, it) => `${it ? 'italic ' : ''}400 ${sz}px "STIX Two Text", "Cambria Math", "Times New Roman", serif`;

function mathLine(R, parts, x, y, size, align, maxW) {
  const { ctx, settings } = R;
  const measure = (sz) => {
    let w = 0;
    for (const [k, s] of parts) {
      const fs = k === 'S' ? sz * 1.25 : (k === '_' || k === '^') ? sz * .62 : sz;
      ctx.font = mathFont(fs, k === 'i' || k === '_'); w += ctx.measureText(s).width;
    }
    return w;
  };
  let w = measure(size);
  if (maxW && w > maxW) { size *= maxW / w; w = measure(size); }
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const base = ctx.fillStyle;
  for (const [k, s] of parts) {
    const fs = k === 'S' ? size * 1.25 : (k === '_' || k === '^') ? size * .62 : size;
    const dy = k === '_' ? size * .28 : k === '^' ? -size * .42 : k === 'S' ? size * .08 : 0;
    ctx.font = mathFont(fs, k === 'i' || k === '_');
    ctx.fillStyle = k === 'c' ? settings.accent : base;
    ctx.fillText(s, cx, y + dy); cx += ctx.measureText(s).width;
  }
  ctx.fillStyle = base;
}

function drawShapeImage(R, cx, cy, s, alpha) {
  const { ctx, S, settings, view } = R;
  if (alpha <= 0.004) return;
  ctx.save(); ctx.globalAlpha = alpha;
  if (S.image) {
    const r = S.imgRect; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(S.image, cx + s * r.x, cy + s * r.y, s * r.w, s * r.h);
  } else {
    const m = new env.DOMMatrix([s, 0, 0, s, cx, cy]);
    const fp = new env.Path2D(); fp.addPath(S.fillPath, m);
    const lp = new env.Path2D(); lp.addPath(S.linePath, m);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (S.fill === 'solid') { ctx.fillStyle = settings.accent; ctx.fill(fp, 'evenodd'); }
    else {
      if (S.fill === 'soft') { ctx.fillStyle = hexA(settings.accent, .22); ctx.fill(fp, 'evenodd'); }
      ctx.strokeStyle = settings.accent; ctx.lineWidth = Math.max(2, s * 0.03); ctx.stroke(lp);
    }
  }
  ctx.restore();
}

function drawCurve(R, c, cx, cy, s, alpha, u, pen) {
  const { ctx, S, settings, view } = R;
  if (alpha <= 0.004) return;
  const pS = new env.Path2D(), pC = new env.Path2D(), cp = S.connP;
  const full = u >= 1, m = full ? P : Math.floor(u * P);
  let cur = -1;
  const X = (j) => cx + s * c.x[j], Y = (j) => cy + s * c.y[j];
  for (let j = 0; j < m; j++) {
    const f = cp[j], path = f ? pC : pS, jn = (j + 1) % P;
    if (f !== cur) { path.moveTo(X(j), Y(j)); cur = f; }
    path.lineTo(X(jn), Y(jn));
  }
  if (!full && pen) {
    const f = cp[Math.min(m, P - 1)], path = f ? pC : pS;
    if (f !== cur) path.moveTo(X(m), Y(m));
    path.lineTo(pen[0], pen[1]);
  }
  const U = view.U;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.globalAlpha = alpha * .22; ctx.strokeStyle = settings.accent; ctx.lineWidth = 8 * U; ctx.stroke(pS);
  ctx.globalAlpha = alpha; ctx.lineWidth = 2.6 * U; ctx.stroke(pS);
  ctx.globalAlpha = alpha * .22; ctx.lineWidth = 1.4 * U; ctx.stroke(pC);
  ctx.restore();
}

export function penAt(S, style, N, t) {
  const ser = S.ser, L = S.L; let x = ser.a0, y = ser.c0;
  if (style === 'xy') {
    for (let k = 1; k <= N; k++) { const co = Math.cos(k * t), si = Math.sin(k * t); x += ser.A[k] * co + ser.B[k] * si; y += ser.C[k] * co + ser.D[k] * si; }
  } else {
    for (let i = 0; i < N; i++) { const T = ser.terms[i], co = Math.cos(T.k * t), si = Math.sin(T.k * t); x += T.re * co - T.im * si; y += T.re * si + T.im * co; }
  }
  return [L.cx + L.s * x, L.cy + L.s * y];
}

function drawChain(ctx, origin, vecs, color, U) {
  const circles = new env.Path2D(), arms = new env.Path2D(), dots = new env.Path2D();
  let [X, Y] = origin; arms.moveTo(X, Y);
  for (const [R, vx, vy] of vecs) {
    if (R > 0.7) { circles.moveTo(X + R, Y); circles.arc(X, Y, R, 0, TAU); }
    X += vx; Y += vy; arms.lineTo(X, Y);
    if (R > 2.5) { dots.moveTo(X + 1.8 * U, Y); dots.arc(X, Y, 1.8 * U, 0, TAU); }
  }
  ctx.strokeStyle = hexA(color, .3); ctx.lineWidth = 1.1 * U; ctx.stroke(circles);
  ctx.strokeStyle = hexA(color, .8); ctx.lineWidth = 1.4 * U; ctx.stroke(arms);
  ctx.fillStyle = hexA(color, .9); ctx.fill(dots);
  return [X, Y];
}

function drawMachinery(R, N, t, alpha) {
  const { ctx, S, settings, view } = R;
  if (alpha <= 0.004) return;
  const ser = S.ser, L = S.L, s = L.s, U = view.U;
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineJoin = 'round';
  let pen;
  if (settings.style === 'xy') {
    const vx = [], vy = [];
    for (let k = 1; k <= N; k++) {
      const R = ser.Rx[k] * s, a = k * t - ser.Px[k]; if (R > 0.02) vx.push([R, R * Math.cos(a), R * Math.sin(a)]);
      const R2 = ser.Ry[k] * s, b = k * t - ser.Py[k]; if (R2 > 0.02) vy.push([R2, R2 * Math.sin(b), R2 * Math.cos(b)]);
    }
    const tx = drawChain(ctx, [L.cx + s * ser.a0, L.xChainY], vx, FG, U);
    const ty = drawChain(ctx, [L.yChainX, L.cy + s * ser.c0], vy, GOLD, U);
    pen = [tx[0], ty[1]];
    ctx.setLineDash([6 * U, 6 * U]); ctx.lineWidth = 1.2 * U;
    ctx.strokeStyle = hexA(FG, .45); ctx.beginPath(); ctx.moveTo(tx[0], tx[1]); ctx.lineTo(pen[0], pen[1]); ctx.stroke();
    ctx.strokeStyle = hexA(GOLD, .45); ctx.beginPath(); ctx.moveTo(ty[0], ty[1]); ctx.lineTo(pen[0], pen[1]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = FG; ctx.beginPath(); ctx.arc(tx[0], tx[1], 3 * U, 0, TAU); ctx.fill();
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(ty[0], ty[1], 3 * U, 0, TAU); ctx.fill();
  } else {
    const v = [];
    for (let i = 0; i < N; i++) {
      const T = ser.terms[i], R = T.mag * s; if (R < 0.02) continue;
      const co = Math.cos(T.k * t), si = Math.sin(T.k * t);
      v.push([R, s * (T.re * co - T.im * si), s * (T.re * si + T.im * co)]);
    }
    pen = drawChain(ctx, [L.cx + s * ser.a0, L.cy + s * ser.c0], v, FG, U);
  }
  ctx.shadowColor = settings.accent; ctx.shadowBlur = 14 * U; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(pen[0], pen[1], 4 * U, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawLabels(R, N, a) {
  const { ctx, S, settings, view } = R;
  if (a <= 0.004) return;
  const L = S.L, U = view.U;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = FG;
  if (settings.labels === 'full') {
    mathLine(R, [['i', 'N'], ['r', ' = '], ['c', String(N)]], L.tx, L.ty, 64 * U, 'center');
    mathLine(R, [['r', 'error = ' + errFor(S, settings.style, N).toFixed(2) + '%']], L.tx, L.ty + 56 * U, 42 * U, 'center');
  } else {
    mathLine(R, [['c', String(N)]], L.tx, L.ty + 20 * U, 60 * U, 'center');
  }
  if (settings.labels === 'top') drawTopFormulas(R);
  ctx.restore();
}

// Fórmulas pequeñas en la esquina superior, como en los videos virales
function drawTopFormulas(R) {
  const { ctx, settings, view } = R;
  const U = view.U, x = 28 * U, size = 21 * U, maxW = view.W * 0.62;
  let y = (settings.caption.trim() ? view.H * (settings.format === '9:16' ? 0.1 : 0.14) : 0) + 46 * U;
  if (settings.style === 'xy') {
    ctx.fillStyle = FG;
    mathLine(R, [['i', 'x'], ['r', '('], ['i', 't'], ['r', ') = '], ['S', 'Σ'], ['_', 'k'], ['r', ' ('], ['i', 'a'], ['_', 'k'], ['r', ' cos '], ['i', 'kt'], ['r', ' + '], ['i', 'b'], ['_', 'k'], ['r', ' sin '], ['i', 'kt'], ['r', ')']], x, y, size, 'left', maxW);
    ctx.fillStyle = GOLD;
    mathLine(R, [['i', 'y'], ['r', '('], ['i', 't'], ['r', ') = '], ['S', 'Σ'], ['_', 'k'], ['r', ' ('], ['i', 'c'], ['_', 'k'], ['r', ' cos '], ['i', 'kt'], ['r', ' + '], ['i', 'd'], ['_', 'k'], ['r', ' sin '], ['i', 'kt'], ['r', ')']], x, y + 34 * U, size, 'left', maxW);
  } else {
    ctx.fillStyle = FG;
    mathLine(R, [['i', 'z'], ['r', '('], ['i', 't'], ['r', ') = '], ['S', 'Σ'], ['_', 'k'], ['r', ' '], ['i', 'c'], ['_', 'k'], ['r', ' '], ['i', 'e'], ['^', 'ikt']], x, y, size * 1.1, 'left', maxW);
  }
  ctx.fillStyle = FG;
}

function drawSignature(R) {
  const { ctx, settings, view } = R;
  if (!settings.signature) return;
  const U = view.U, parts = [
    ['Circul', `italic 400 ${24 * U}px "STIX Two Text", "Times New Roman", serif`, hexA(FG, .8)],
    ['Arte', `italic 400 ${24 * U}px "STIX Two Text", "Times New Roman", serif`, settings.accent],
    ['   edav-tech.com', `500 ${17 * U}px "IBM Plex Sans", system-ui, sans-serif`, hexA(FG, .5)]
  ];
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  let w = 0; for (const [t, f] of parts) { ctx.font = f; w += ctx.measureText(t).width; }
  let x = settings.format === '16:9' ? view.W - 30 * U - w : (view.W - w) / 2;
  const y = view.H - 28 * U;
  for (const [t, f, col] of parts) { ctx.font = f; ctx.fillStyle = col; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
  ctx.restore();
}

function drawFormulas(R, a, N) {
  const { ctx, S, settings, view } = R;
  if (a <= 0.004 || !settings.formulas) return;
  const L = S.L, U = view.U, ser = S.ser, maxW = settings.format === '16:9' ? view.W * 0.56 : view.W * 0.9;
  let y = L.fy; const size = 44 * U, gapY = 62 * U;
  ctx.save(); ctx.globalAlpha = a;
  const decay = ser.decay;
  const pw = decay == null ? null : Math.abs(decay - 2) < 0.15 ? '2' : Math.abs(decay - 1) < 0.15 ? '' : decay.toFixed(1);
  if (settings.style === 'xy') {
    ctx.fillStyle = FG;
    mathLine(R, [['i', 'x'], ['r', '('], ['i', 't'], ['r', ') = '], ['S', 'Σ'], ['_', 'k'], ['r', ' ('], ['i', 'a'], ['_', 'k'], ['r', ' cos '], ['i', 'kt'], ['r', ' + '], ['i', 'b'], ['_', 'k'], ['r', ' sin '], ['i', 'kt'], ['r', ')']], L.fx, y, size, L.falign, maxW);
    y += gapY; ctx.fillStyle = GOLD;
    mathLine(R, [['i', 'y'], ['r', '('], ['i', 't'], ['r', ') = '], ['S', 'Σ'], ['_', 'k'], ['r', ' ('], ['i', 'c'], ['_', 'k'], ['r', ' cos '], ['i', 'kt'], ['r', ' + '], ['i', 'd'], ['_', 'k'], ['r', ' sin '], ['i', 'kt'], ['r', ')']], L.fx, y, size, L.falign, maxW);
    if (pw !== null) { y += gapY; ctx.fillStyle = FG; mathLine(R, [['r', 'arm'], ['_', 'k'], ['r', '  ∼  1/'], ['i', 'k'], ['^', pw]], L.fx, y, size * .95, L.falign, maxW); }
  } else {
    ctx.fillStyle = FG;
    mathLine(R, [['i', 'z'], ['r', '('], ['i', 't'], ['r', ') = '], ['S', 'Σ'], ['_', 'k'], ['r', ' '], ['i', 'c'], ['_', 'k'], ['r', ' '], ['i', 'e'], ['^', 'ikt']], L.fx, y, size * 1.1, L.falign, maxW);
    if (pw !== null) { y += gapY; mathLine(R, [['r', '|'], ['i', 'c'], ['_', 'k'], ['r', '|  ∼  1/|'], ['i', 'k'], ['r', '|'], ['^', pw]], L.fx, y, size * .95, L.falign, maxW); }
  }
  y += gapY * .95; ctx.fillStyle = hexA(FG, .55);
  mathLine(R, [['i', 'N'], ['r', ' = ' + N + '     error = ' + errFor(S, settings.style, N).toFixed(2) + '%']], L.fx, y, 30 * U, L.falign, maxW);
  if (S.exprLines) {
    y += gapY * .9; ctx.font = `400 ${22 * U}px "IBM Plex Mono", Consolas, monospace`; ctx.textAlign = L.falign; ctx.fillStyle = hexA(FG, .5);
    for (const line of S.exprLines) {
      let t = line; while (ctx.measureText(t).width > maxW && t.length > 8) t = t.slice(0, -2);
      if (t !== line) t = t.slice(0, -1) + '…';
      ctx.fillText(t, L.fx, y); y += 32 * U;
    }
  }
  ctx.restore();
}

function drawCaption(R) {
  const { ctx, settings, view } = R;
  const c = settings.caption.trim(); if (!c) return;
  const U = view.U; ctx.save(); ctx.fillStyle = FG; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let size = 34 * U; ctx.font = `600 ${size}px "IBM Plex Sans", system-ui, sans-serif${env.fallback}`;
  const y = view.H * (settings.format === '9:16' ? 0.055 : 0.07), maxW = view.W * .9;
  const w = ctx.measureText(c).width;
  // captionWrap (opcional, apagado por defecto): si no cabe, dos líneas a tamaño completo en vez de encoger
  const words = c.split(/\s+/);
  if (settings.captionWrap && w > maxW && words.length > 1) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const wid = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
      if (!best || wid < best.wid) best = { a, b, wid };
    }
    if (best.wid > maxW) { size *= maxW / best.wid; ctx.font = `600 ${size}px "IBM Plex Sans", system-ui, sans-serif${env.fallback}`; }
    const gap = size * 0.62;
    ctx.fillText(best.a, view.W / 2, y - gap); ctx.fillText(best.b, view.W / 2, y + gap);
    ctx.restore();
    return;
  }
  if (w > maxW) { size *= maxW / w; ctx.font = `600 ${size}px "IBM Plex Sans", system-ui, sans-serif${env.fallback}`; }
  ctx.fillText(c, view.W / 2, y);
  ctx.restore();
}

// R = { ctx, S, settings, view }; st = estado de stateAt()
export function render(R, st) {
  const { ctx, S, settings, view } = R;
  const { W, H } = view;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  if (!S || !S.L) return;
  const L = S.L, stages = S.stages, N = stages[st.stage], e = ease(clamp(st.reveal || 0));
  const cx = lerp(L.cx, L.rcx, e), cy = lerp(L.cy, L.rcy, e), s = lerp(L.s, L.rs, e);
  const guide = settings.guide / 100;
  drawShapeImage(R, cx, cy, s, lerp(guide, 1, e));
  const trailA = 1 - smooth(0.25, 0.95, e);
  const t = TAU * clamp(st.u);
  if (st.stage > 0 && st.prevA > 0) drawCurve(R, curveFor(S, settings.style, stages[st.stage - 1]), cx, cy, s, st.prevA * .4 * trailA, 1, null);
  const pen = st.u < 1 ? penAt(S, settings.style, N, t) : null;
  drawCurve(R, curveFor(S, settings.style, N), cx, cy, s, trailA, st.u, pen);
  const machA = 1 - clamp(e * 2.4);
  drawMachinery(R, N, t, machA);
  drawLabels(R, N, machA);
  drawFormulas(R, clamp((e - 0.3) / 0.6), N);
  drawCaption(R);
  drawSignature(R);
}

/* ---------------- Línea de tiempo ---------------- */
export function timeline(S, settings) {
  const n = S.stages.length, dur = S.stages.map((_, i) => settings.rev * (n > 1 ? 0.75 + 0.75 * i / (n - 1) : 1.2));
  const draw = dur.reduce((a, b) => a + b, 0), hold = 0.8;
  const rv = settings.reveal ? 1.8 : 0, rh = settings.reveal ? 3.2 : 0.6;
  return { dur, draw, hold, rv, rh, total: draw + hold + rv + rh };
}
export function stateAt(T, el) {
  let acc = 0;
  for (let i = 0; i < T.dur.length; i++) {
    if (el < acc + T.dur[i]) { const u = (el - acc) / T.dur[i]; return { stage: i, u, prevA: 1 - smooth(0, 0.45, u), reveal: 0 }; }
    acc += T.dur[i];
  }
  const last = T.dur.length - 1, r = el - T.draw - T.hold;
  return { stage: last, u: 1, prevA: 0, reveal: r <= 0 || !T.rv ? 0 : clamp(r / T.rv) };
}

/* ---------------- Fuentes de figura ---------------- */
export const PRESETS = [
  { group: 'Amor', name: 'Corazón', en: 'Heart', expr: { mode: 'xy', x: '16 sin(t)^3', y: '13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)', periods: 1 }, fill: 'solid' },
  { group: 'Amor', name: 'LOVE', text: 'LOVE', font: 'elegante' },
  { group: 'Amor', name: 'amor', text: 'amor', font: 'cursiva' },
  { group: 'Amor', name: 'te amo', text: 'te amo', font: 'cursiva' },
  { group: 'Amor', name: 'Mamá', en: 'Mom', text: 'Mamá', font: 'cursiva' },
  { group: 'Amor', name: 'Rosa', en: 'Rose', text: '🌹', font: 'emoji' },
  { group: 'Animales', name: 'Elefante', en: 'Elephant', text: '🐘', font: 'emoji' },
  { group: 'Animales', name: 'Pulpo', en: 'Octopus', text: '🐙', font: 'emoji' },
  { group: 'Animales', name: 'Gato', en: 'Cat', text: '🐈', font: 'emoji' },
  { group: 'Animales', name: 'Delfín', en: 'Dolphin', text: '🐬', font: 'emoji' },
  { group: 'Animales', name: 'T-Rex', text: '🦖', font: 'emoji' },
  { group: 'Animales', name: 'Flamenco', en: 'Flamingo', text: '🦩', font: 'emoji' },
  { group: 'Animales', name: 'Caballo', en: 'Horse', text: '🐎', font: 'emoji' },
  { group: 'Animales', name: 'Paloma', en: 'Dove', text: '🕊️', font: 'emoji' },
  { group: 'Animales', name: 'Mariposa', en: 'Butterfly', text: '🦋', font: 'emoji' },
  { group: 'Cosas', name: 'Guitarra', en: 'Guitar', text: '🎸', font: 'emoji' },
  { group: 'Cosas', name: 'Violín', en: 'Violin', text: '🎻', font: 'emoji' },
  { group: 'Cosas', name: 'Cohete', en: 'Rocket', text: '🚀', font: 'emoji' },
  { group: 'Cosas', name: 'Manzana', en: 'Apple', text: '🍎', font: 'emoji' },
  { group: 'Cosas', name: 'Corona', en: 'Crown', text: '👑', font: 'emoji' },
  { group: 'Cosas', name: 'Nota', en: 'Music note', text: '♪', font: 'clasica' },
  { group: 'Matemáticas', name: 'Copo de Koch', en: 'Koch snowflake', poly: () => kochPts(4), fill: 'solid' },
  { group: 'Matemáticas', name: 'π', en: 'Pi', text: 'π', font: 'clasica' },
  { group: 'Matemáticas', name: 'Infinito', en: 'Infinity', expr: { mode: 'xy', x: 'cos(t) / (1 + sin(t)^2)', y: 'sin(t) cos(t) / (1 + sin(t)^2)', periods: 1 }, fill: 'line' },
  { group: 'Matemáticas', name: 'Flor', en: 'Flower', expr: { mode: 'polar', r: 'cos(4t)', periods: 1 }, fill: 'soft' },
  { group: 'Matemáticas', name: 'Mariposa polar', en: 'Butterfly curve', expr: { mode: 'polar', r: 'exp(sin(t)) - 2 cos(4t) + sin((2t - pi)/24)^5', periods: 6 }, fill: 'line' },
  { group: 'Matemáticas', name: 'Nudo trébol', en: 'Trefoil knot', expr: { mode: 'xy', x: 'sin(t) + 2 sin(2t)', y: 'cos(t) - 2 cos(2t)', periods: 1 }, fill: 'line' },
  { group: 'Matemáticas', name: 'Espirógrafo', en: 'Spirograph', expr: { mode: 'xy', x: '2 cos(t) + 5 cos((2/3)t)', y: '2 sin(t) - 5 sin((2/3)t)', periods: 3 }, fill: 'line' },
  { group: 'Matemáticas', name: 'Epiciclo', en: 'Epicycle', expr: { mode: 'xy', x: '5 cos(t) - 3 cos((5/2)t)', y: '5 sin(t) - 3 sin((5/2)t)', periods: 2 }, fill: 'soft' },
  { group: 'Matemáticas', name: 'Lissajous', expr: { mode: 'xy', x: 'sin(3t + pi/2)', y: 'sin(2t)', periods: 1 }, fill: 'line' },
  { group: 'Matemáticas', name: 'Cardioide', en: 'Cardioid', expr: { mode: 'polar', r: '1 - sin(t)', periods: 1 }, fill: 'solid' },
  { group: 'Matemáticas', name: 'Rosa 7/4', en: 'Rose 7/4', expr: { mode: 'polar', r: 'cos((7/4)t)', periods: 4 }, fill: 'soft' },
  { group: 'Matemáticas', name: 'Estrella', en: 'Star', text: '★', font: 'bloque' }
];

export const exprLinesOf = (d) => d.mode === 'polar' ? [`r(t) = ${d.r}`] : [`x(t) = ${d.x}`, `y(t) = ${d.y}`];

export async function shapeFor(src, accent) {
  if (src.kind === 'expr') return { shape: exprShape(src.def), meta: { name: src.name, fill: src.fill || 'soft', exprLines: exprLinesOf(src.def) } };
  if (src.kind === 'poly') return { shape: { contours: [{ pts: src.pts(), len: 1, closed: true }], image: null }, meta: { name: src.name, fill: src.fill || 'solid' } };
  if (src.kind === 'text') {
    const c = await textCanvas(src.text, src.font, accent);
    const maxDim = clamp(Math.max(640, 170 * c.width / c.height), 640, 1600);
    return { shape: bitmapShape(c, { mode: 'silueta', thr: 50, detail: 88, invert: false, cutout: false, maxDim }), meta: { name: src.name || src.text } };
  }
  const o = src.opts;
  return { shape: bitmapShape(src.img, { mode: o.mode, thr: o.thr, detail: o.detail, invert: o.invert, cutout: o.cutout && o.mode === 'silueta', maxDim: 420 }), meta: { name: src.name } };
}

/* ---------------- Funciones inventadas ---------------- */
// Azar intercambiable: la web usa Math.random; el render en Node puede pasar uno con semilla
let random = Math.random;
const withRng = (rng, fn) => { const prev = random; random = rng || Math.random; try { return fn(); } finally { random = prev; } };
export function makeRng(seed) {
  let a = (Number(seed) >>> 0) || 0x9e3779b9;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = (a, b) => a + random() * (b - a), rint = (a, b) => Math.floor(rnd(a, b + 1)), pick = (a) => a[rint(0, a.length - 1)];
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
export const num = (v) => String(Math.round(v * 100) / 100);
export const kt = (k) => k === 1 ? 't' : `${k}t`;
function sumStr(terms) {
  let s = '';
  terms.forEach(([amp, body], i) => {
    const a = Math.abs(amp), sign = amp < 0 ? '-' : '+', coef = Math.abs(a - 1) < 0.005 ? '' : num(a) + ' ';
    s += i === 0 ? (amp < 0 ? '-' : '') + coef + body : ` ${sign} ${coef}${body}`;
  });
  return s;
}
const NOUNS = ['Flor', 'Órbita', 'Galaxia', 'Medusa', 'Estrella', 'Nebulosa', 'Mariposa', 'Corona', 'Concha', 'Llama', 'Ola', 'Rosa', 'Brújula', 'Telaraña', 'Pluma', 'Danza'];
const ADJS = ['Cuántica', 'Dorada', 'Salvaje', 'Tímida', 'Eléctrica', 'Lunar', 'Hipnótica', 'Rebelde', 'Infinita', 'Secreta', 'Nocturna', 'Caótica', 'Tropical', 'Fractal', 'Mareada', 'Sonámbula'];
export const funName = (rng) => withRng(rng, () => `${pick(NOUNS)} ${pick(ADJS)} #${rint(100, 999)}`);

export const inventFn = (type, rng) => withRng(rng, () => invent(type));
export const INVENT_TYPES = ['fourier', 'polar', 'rosa', 'spiro', 'lissa', 'super'];
function invent(type) {
  if (type === 'any') type = pick(['fourier', 'fourier', 'polar', 'rosa', 'spiro', 'spiro', 'lissa', 'super']);
  if (type === 'fourier') {
    const ks = [2, 3, 4, 5, 6, 7, 8, 9].sort(() => random() - .5);
    const mk = (first, off) => {
      const terms = [[rnd(.7, 1.1), first]]; const n = rint(2, 4);
      for (let i = 0; i < n; i++) { const k = ks[(i + off) % ks.length]; const ph = random() < .35 ? ` + ${num(rnd(.2, 2.8))}` : ''; terms.push([(random() < .5 ? -1 : 1) * rnd(.15, .7) / Math.sqrt(k), `${pick(['cos', 'sin'])}(${kt(k)}${ph})`]); }
      return sumStr(terms);
    };
    return { mode: 'xy', x: mk('cos(t)', 0), y: mk('sin(t)', 3), periods: 1, fill: 'line' };
  }
  if (type === 'polar') {
    const p = rint(2, 9), q = rint(2, 12), b = rnd(.2, .6), c = rnd(0, .35);
    const terms = [[1, '1'], [b, `cos(${kt(p)})`]]; if (c > .05) terms.push([(random() < .5 ? -1 : 1) * c, `sin(${kt(q)})`]);
    return { mode: 'polar', r: sumStr(terms), periods: 1, fill: 'soft' };
  }
  if (type === 'rosa') {
    let p, q; do { p = rint(1, 9); q = rint(1, 7); } while (p === q || gcd(p, q) !== 1);
    return { mode: 'polar', r: q === 1 ? `cos(${kt(p)})` : `cos((${p}/${q})t)`, periods: (p * q) % 2 ? q / 2 : q, fill: 'soft' };
  }
  if (type === 'spiro') {
    const R = rint(3, 10); let r; do { r = rint(1, R - 1); } while (r * 2 === R);
    const epi = random() < .4, d = rnd(.4, 1.3) * r, A = epi ? R + r : R - r, g = gcd(A, r), nn = A / g, dd = r / g;
    const f = dd === 1 ? kt(nn) : `(${nn}/${dd})t`;
    return epi
      ? { mode: 'xy', x: `${A} cos(t) - ${num(d)} cos(${f})`, y: `${A} sin(t) - ${num(d)} sin(${f})`, periods: dd, fill: 'line' }
      : { mode: 'xy', x: `${A} cos(t) + ${num(d)} cos(${f})`, y: `${A} sin(t) - ${num(d)} sin(${f})`, periods: dd, fill: 'line' };
  }
  if (type === 'lissa') {
    let a, b; do { a = rint(1, 7); b = rint(1, 7); } while (a === b || gcd(a, b) !== 1);
    const delta = pick(['pi/2', 'pi/4', num(rnd(.2, 1.4))]);
    return { mode: 'xy', x: `sin(${kt(a)} + ${delta})`, y: `sin(${kt(b)})`, periods: 1, fill: 'line' };
  }
  const m = 2 * rint(1, 7), n1 = rnd(.4, 5), n2 = rnd(.4, 5), n3 = rnd(.4, 5), q = num(m / 4);
  return { mode: 'polar', r: `(abs(cos(${q}t))^${num(n2)} + abs(sin(${q}t))^${num(n3)})^(-1/${num(n1)})`, periods: 1, fill: 'soft' };
}

export const mutateStr = (s, rng) => withRng(rng, () => mutate(s));
function mutate(s) {
  return s.replace(/\d+\.\d+|\d+/g, (m, off) => {
    const before = s.slice(0, off).replace(/\s+$/, ''), after = s.slice(off + m.length);
    if (!m.includes('.')) {
      if (/^\s*\*?\s*t/.test(after) || /^\s*\//.test(after) || /[\/^]$/.test(before) || /^\s*\)\s*t/.test(after)) return m;
    }
    return num(Math.max(0.01, parseFloat(m) * (1 + rnd(-.18, .18))));
  });
}

export function presetSrc(p) {
  if (p.expr) return { kind: 'expr', name: p.name, def: p.expr, fill: p.fill };
  if (p.poly) return { kind: 'poly', name: p.name, pts: p.poly, fill: p.fill };
  return { kind: 'text', name: p.name, text: p.text, font: p.font };
}

// Textos gancho para la parte superior del video; {x} es el nombre de la figura
export const CAPTIONS = ['¿Pueden unos círculos dibujar esto?', 'Espera el final 😳', 'Solo círculos girando', 'Solo círculos dibujando: {x}', 'Matemáticas que parecen magia ✨', 'Nadie me creyó que era solo matemática'];
export const CAPTIONS_EN = ['Can spinning circles draw this?', 'Wait for the end 😳', 'Just circles spinning', 'Only circles drawing: {x}', 'Math that looks like magic ✨', 'Nobody believed it was just math'];
