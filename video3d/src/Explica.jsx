// «Explica»: explicador animado 2D vectorial (motor: "explica"), al estilo de los videos virales de «cómo funciona / por qué
// es así»: un objeto dibujado (SVG) que se corta, se señala y se mueve, fondos que cambian, cámara con zoom y paneo, y
// subtítulos que aparecen palabra por palabra con la palabra clave resaltada. Lee public/render.json (lo escribe
// scripts/explica-preparar.mjs). Sin WebGL: renderiza rápido en la PC y también con la CPU de GitHub.
//
// Escena: { texto, voz?, fondo: cocina|plano|fabrica|cielo|mar|oscuro|liso, camara?: { de:[x,y,zoom], a:[x,y,zoom] },
//           clave?: "palabra(s) que se resaltan", nota?: "etiqueta bajo la palabra clave", tipo?: "cierre",
//           capas: [ ...capa ] }
// Capa (x, y en fracción del lienzo 1080x1920; «en»: palabra de la narración o segundos):
//   { svg: "nombre en dibujos", x, y, ancho, anim: pop|fade|slideIn|crecer|caer|ninguna, desde: abajo|arriba|izquierda|derecha,
//     idle: flotar|balanceo|latido|sacudir, rot, en }
//   { etiqueta: "Texto", x, y, a: [x2, y2], color, en }        píldora con línea punteada que se dibuja hasta el punto
//   { presion: true, x, y, radio, n, en }                      flechas que empujan hacia afuera
//   { burbujas: true, x, y, ancho, alto, n, en }               burbujas que suben
//   { marca: true, x, y, radio, en }                           círculo que se dibuja alrededor de algo
//   { numero: "1971", x, y, color, en }                        globo con un número o dato corto
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';

const W = 1080, H = 1920, INICIO_VOZ = 0.2, CRUCE = 6;
const suave = Easing.bezier(0.45, 0, 0.25, 1);
const salida = Easing.out(Easing.cubic);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const svgUrl = (s) => `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ%]+/g, '');
const azar = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const proporcion = (svg) => { const m = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/.exec(svg || ''); return m ? +m[2] / +m[1] : 1; };

// ---------- fondos ----------
function Fondo({ tipo, pal }) {
  const s = { position: 'absolute', left: 0, top: 0 };
  if (tipo === 'plano') return (
    <svg width={W} height={H} style={s}>
      <defs>
        <pattern id="pl-m" width="54" height="54" patternUnits="userSpaceOnUse"><path d="M54 0V54H0" fill="none" stroke="#ffffff16" strokeWidth="2" /></pattern>
        <pattern id="pl-M" width="270" height="270" patternUnits="userSpaceOnUse"><path d="M270 0V270H0" fill="none" stroke="#ffffff30" strokeWidth="3" /></pattern>
        <radialGradient id="pl-v" cx="50%" cy="45%" r="75%"><stop offset="0" stopColor="#2a62ad" /><stop offset="1" stopColor="#173a6e" /></radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#pl-v)" /><rect width={W} height={H} fill="url(#pl-m)" /><rect width={W} height={H} fill="url(#pl-M)" />
    </svg>);
  if (tipo === 'fabrica') return (
    <svg width={W} height={H} style={s}>
      <defs><pattern id="fa-z" width="80" height="40" patternUnits="userSpaceOnUse"><rect width="80" height="40" fill="#1d1d1d" /><path d="M0 40L40 0H80L40 40Z" fill="#f2c230" /></pattern></defs>
      <rect width={W} height={H} fill="#28394b" />
      {[0, 1, 2, 3].map((i) => (<g key={i}><rect x={60 + i * 250} y={120} width={200} height={460} rx={8} fill="#3d5672" /><path d={`M${160 + i * 250} 120V580M${60 + i * 250} 350H${260 + i * 250}`} stroke="#28394b" strokeWidth="10" /></g>))}
      <rect y={820} width={W} height={18} fill="#e9b52c" /><rect y={872} width={W} height={12} fill="#c4473a" />
      <rect y={1380} width={W} height={40} fill="url(#fa-z)" />
      <rect y={1440} width={W} height={56} rx={6} fill="#1a2430" />
      {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={45 + i * 90} cy={1468} r={14} fill="#3a4a5c" />)}
      <rect y={1496} width={W} height={424} fill="#202b37" />
      {[160, 540, 920].map((x) => <rect key={x} x={x - 14} y={1496} width={28} height={424} fill="#16202a" />)}
    </svg>);
  if (tipo === 'cielo') return (
    <svg width={W} height={H} style={s}>
      <defs><linearGradient id="ci-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4aa8ef" /><stop offset="1" stopColor="#c8ecff" /></linearGradient></defs>
      <rect width={W} height={H} fill="url(#ci-g)" />
      {[[220, 560, 1], [800, 680, 0.8], [420, 1000, 1.2], [880, 1300, 0.9]].map(([x, y, k], i) => (<g key={i} fill="#ffffffd8"><ellipse cx={x} cy={y} rx={130 * k} ry={46 * k} /><ellipse cx={x - 60 * k} cy={y - 26 * k} rx={70 * k} ry={52 * k} /><ellipse cx={x + 50 * k} cy={y - 34 * k} rx={84 * k} ry={60 * k} /></g>))}
    </svg>);
  if (tipo === 'mar') return (
    <svg width={W} height={H} style={s}>
      <defs><linearGradient id="ma-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fd3f7" /><stop offset="0.28" stopColor="#bfeaff" /><stop offset="0.3" stopColor="#1f8fc4" /><stop offset="1" stopColor="#08304d" /></linearGradient></defs>
      <rect width={W} height={H} fill="url(#ma-g)" />
      {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M0 ${640 + i * 150} Q 270 ${610 + i * 150} 540 ${640 + i * 150} T 1080 ${640 + i * 150}`} stroke="#ffffff22" strokeWidth="6" fill="none" />)}
    </svg>);
  if (tipo === 'oscuro') return (
    <svg width={W} height={H} style={s}>
      <defs><radialGradient id="os-g" cx="50%" cy="42%" r="70%"><stop offset="0" stopColor="#2b2163" /><stop offset="1" stopColor="#0b0820" /></radialGradient></defs>
      <rect width={W} height={H} fill="url(#os-g)" />
    </svg>);
  if (tipo === 'liso') return (
    <svg width={W} height={H} style={s}>
      <defs><linearGradient id="li-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={pal.a || '#ffcf6b'} /><stop offset="1" stopColor={pal.b || '#ff8f5a'} /></linearGradient></defs>
      <rect width={W} height={H} fill="url(#li-g)" />
    </svg>);
  // cocina (por defecto): pared de azulejos, repisa con frascos y mesón de madera
  return (
    <svg width={W} height={H} style={s}>
      <defs>
        <pattern id="co-a" width="90" height="90" patternUnits="userSpaceOnUse"><rect width="90" height="90" fill="#3f6688" /><path d="M90 0V90H0" fill="none" stroke="#335876" strokeWidth="5" /></pattern>
        <linearGradient id="co-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b47645" /><stop offset="1" stopColor="#8d5a33" /></linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#co-a)" />
      <rect x={600} y={600} width={430} height={20} rx={6} fill="#7a4a2c" />
      {[[660, 70, '#e0a73a'], [760, 90, '#c9553f'], [880, 60, '#e8d7b0'], [960, 80, '#5b8a5a']].map(([x, h, c], i) => (<g key={i}><rect x={x} y={600 - h} width={64} height={h} rx={10} fill={c} /><rect x={x + 6} y={600 - h - 14} width={52} height={16} rx={4} fill="#5a3a24" /></g>))}
      <rect y={1450} width={W} height={46} fill="#c98a55" />
      <rect y={1496} width={W} height={424} fill="url(#co-m)" />
      {[1560, 1650, 1760, 1860].map((y) => <path key={y} d={`M0 ${y} H${W}`} stroke="#7a4a2a55" strokeWidth="4" />)}
    </svg>);
}

// ---------- capas ----------
function Capa({ c, f, fps, t, dibujos }) {
  const fr = Math.round(c.t * fps), d = f - fr;
  if (c.anim !== 'ninguna' && d < 0) return null;
  const sp = spring({ frame: Math.max(0, d), fps, config: { damping: 11, stiffness: 150, mass: 0.7 } });
  const lin = interpolate(d, [0, 12], [0, 1], { ...clamp, easing: salida });
  const x = (c.x ?? 0.5) * W, y = (c.y ?? 0.5) * H;

  if (c.etiqueta) return <Etiqueta c={c} x={x} y={y} d={d} fps={fps} lin={lin} sp={sp} />;
  if (c.presion) return <Presion c={c} x={x} y={y} t={t} lin={lin} />;
  if (c.burbujas) return <Burbujas c={c} x={x} y={y} t={t} lin={lin} />;
  if (c.marca) return <Marca c={c} x={x} y={y} d={d} />;
  if (c.numero) return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${sp})`, background: c.color || '#1d1d2b', color: '#fff', fontFamily: 'Archivo Black', fontSize: c.tam || 64, padding: '10px 30px', borderRadius: 999, whiteSpace: 'nowrap', boxShadow: '0 8px 0 #00000040' }}>{c.numero}</div>);

  const svg = dibujos[c.svg]; if (!svg) return null;
  const ancho = c.ancho || 500, alto = c.alto || ancho * proporcion(svg);
  const fase = azar(fr, 3) * 6.28;
  let tr = '', op = 1, origen = '50% 50%';
  const anim = c.anim || 'pop';
  if (anim === 'pop') tr += ` scale(${sp})`;
  else if (anim === 'fade') op = lin;
  else if (anim === 'slideIn') { const k = (1 - lin) * 1400, de = c.desde || 'abajo'; tr += de === 'abajo' ? ` translateY(${k}px)` : de === 'arriba' ? ` translateY(${-k}px)` : de === 'izquierda' ? ` translateX(${-k}px)` : ` translateX(${k}px)`; }
  else if (anim === 'crecer') { tr += ` scaleY(${sp})`; origen = '50% 100%'; }
  else if (anim === 'caer') { const k = spring({ frame: Math.max(0, d), fps, config: { damping: 9, stiffness: 120 } }); tr += ` translateY(${(1 - k) * -1300}px)`; }
  const idle = c.idle;
  if (idle === 'flotar') tr += ` translateY(${Math.sin(t * 2.2 + fase) * 14}px)`;
  else if (idle === 'balanceo') { tr += ` rotate(${Math.sin(t * 3.2 + fase) * 5}deg)`; origen = '50% 100%'; }
  else if (idle === 'latido') tr += ` scale(${1 + Math.sin(t * 6 + fase) * 0.035})`;
  else if (idle === 'sacudir') tr += ` translateX(${Math.sin(t * 38) * 7}px) rotate(${Math.sin(t * 29) * 2.5}deg)`;
  if (c.rot) tr += ` rotate(${c.rot}deg)`;
  return (
    <div style={{ position: 'absolute', left: x - ancho / 2, top: y - alto / 2, width: ancho, height: alto, opacity: op, transform: tr, transformOrigin: origen, filter: c.sombra === false ? undefined : 'drop-shadow(0 18px 14px rgba(0,0,0,0.28))' }}>
      <Img src={svgUrl(svg)} style={{ width: ancho, height: alto }} />
    </div>);
}

function Etiqueta({ c, x, y, d, lin, sp }) {
  const a = c.a ? [c.a[0] * W, c.a[1] * H] : null, color = c.color || '#1d1d2b';
  const L = a ? Math.hypot(a[0] - x, a[1] - y) : 0, dib = interpolate(d, [4, 18], [0, 1], { ...clamp, easing: salida });
  return (<>
    {a && (<svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <line x1={x} y1={y} x2={x + (a[0] - x) * dib} y2={y + (a[1] - y) * dib} stroke="#fff" strokeWidth="6" strokeDasharray="16 12" strokeLinecap="round" />
      <circle cx={a[0]} cy={a[1]} r={14 * interpolate(d, [16, 22], [0, 1], clamp)} fill="#fff" stroke={color} strokeWidth="5" />
    </svg>)}
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${sp})`, background: color, color: '#fff', fontFamily: 'Plex', fontWeight: 700, fontSize: c.tam || 40, padding: '8px 26px', borderRadius: 999, whiteSpace: 'nowrap', boxShadow: '0 6px 0 #00000035', opacity: lin }}>{c.etiqueta}</div>
  </>);
}

function Presion({ c, x, y, t, lin }) {
  const n = c.n || 10, r = c.radio || 220, rx = c.radioX || r, ry = c.radioY || r;
  return (<svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, opacity: lin }}>
    {Array.from({ length: n }, (_, i) => {
      const ang = (i / n) * Math.PI * 2, pulso = 0.5 + 0.5 * Math.sin(t * 7 - i * 0.6), len = 70 + 40 * pulso;
      const x1 = x + Math.cos(ang) * rx, y1 = y + Math.sin(ang) * ry, x2 = x + Math.cos(ang) * (rx + len), y2 = y + Math.sin(ang) * (ry + len);
      const hx = Math.cos(ang), hy = Math.sin(ang), px = -hy, py = hx;
      return (<g key={i} stroke="#ff4d3d" strokeWidth="12" strokeLinecap="round" fill="#ff4d3d">
        <line x1={x1} y1={y1} x2={x2 - hx * 18} y2={y2 - hy * 18} />
        <path d={`M${x2} ${y2} L${x2 - hx * 34 + px * 22} ${y2 - hy * 34 + py * 22} L${x2 - hx * 34 - px * 22} ${y2 - hy * 34 - py * 22} Z`} stroke="none" />
      </g>);
    })}
  </svg>);
}

function Burbujas({ c, x, y, t, lin }) {
  const n = c.n || 18, w = (c.ancho || 0.2) * W, h = (c.alto || 0.3) * H;
  return (<svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, opacity: lin }}>
    {Array.from({ length: n }, (_, i) => {
      const vel = 90 + azar(i, 2) * 160, yy = y + h / 2 - ((t * vel + azar(i, 5) * h) % h), xx = x - w / 2 + azar(i, 9) * w + Math.sin(t * 3 + i) * 6;
      return <circle key={i} cx={xx} cy={yy} r={5 + azar(i, 4) * 10} fill="#ffffff55" stroke="#ffffffcc" strokeWidth="3" />;
    })}
  </svg>);
}

function Marca({ c, x, y, d }) {
  const r = c.radio || 90, L = 2 * Math.PI * r, p = interpolate(d, [0, 14], [0, 1], { ...clamp, easing: salida });
  return (<svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
    <circle cx={x} cy={y} r={r} fill="none" stroke="#ffffff" strokeWidth="7" strokeDasharray={L} strokeDashoffset={L * (1 - p)} transform={`rotate(-90 ${x} ${y})`} />
  </svg>);
}

// ---------- subtítulos palabra por palabra ----------
function paginas(palabras) {
  const out = []; let cur = [];
  for (const p of palabras) { cur.push(p); if (cur.length >= 4 || /[.,;:?!…]$/.test(p.w)) { out.push(cur); cur = []; } }
  if (cur.length) out.push(cur);
  return out;
}
function Subtitulos({ e, t }) {
  const tv = t - INICIO_VOZ, pags = paginas(e.palabras || []);
  if (!pags.length || tv < 0) return null;
  let pag = pags[0]; for (const p of pags) if (p[0].t0 <= tv) pag = p;
  const vistas = pag.filter((p) => p.t0 <= tv), actual = vistas[vistas.length - 1];
  const clave = new Set(String(e.clave || '').split(/\s+/).map(norm).filter(Boolean));
  let notaPuesta = false;
  return (
    <div style={{ position: 'absolute', top: 210, left: 70, right: 70, textAlign: 'center', fontFamily: 'Plex', fontSize: 70, lineHeight: 1.25, textShadow: '0 4px 12px rgba(0,0,0,0.45)' }}>
      {vistas.map((p, i) => {
        const esClave = clave.has(norm(p.w)), esActual = p === actual;
        const nota = esClave && e.nota && !notaPuesta; if (nota) notaPuesta = true;
        const estilo = { display: 'inline-block', margin: '0 10px', fontWeight: esActual || esClave ? 700 : 600, color: esActual || esClave ? '#ffffff' : 'rgba(255,255,255,0.55)', position: 'relative' };
        if (esClave) return (
          <span key={i} style={{ ...estilo, background: '#6b4fe0', padding: '0 14px', borderRadius: 8, outline: '3px solid #a99bff', textShadow: 'none' }}>
            {p.w}
            {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], k) => <span key={k} style={{ position: 'absolute', width: 14, height: 14, borderRadius: 7, background: '#a99bff', left: sx < 0 ? -9 : undefined, right: sx > 0 ? -9 : undefined, top: sy < 0 ? -9 : undefined, bottom: sy > 0 ? -9 : undefined }} />)}
            {nota && <span style={{ position: 'absolute', left: '50%', top: '108%', transform: 'translateX(-50%)', background: '#3d8bff', color: '#fff', fontSize: 34, fontWeight: 700, padding: '2px 16px', borderRadius: 10, whiteSpace: 'nowrap' }}>{e.nota}</span>}
          </span>);
        return <span key={i} style={estilo}>{p.w}</span>;
      })}
    </div>);
}

// ---------- tarjeta final ----------
function Cierre({ f, fps }) {
  const sp = spring({ frame: f - 4, fps, config: { damping: 12, stiffness: 140 } });
  const toque = interpolate(f, [30, 40, 48], [0, 1, 0], clamp), boton = 1 - toque * 0.08;
  return (
    <div style={{ position: 'absolute', left: 130, top: 640, width: 820, height: 680, transform: `scale(${sp})`, borderRadius: 48, background: 'linear-gradient(160deg,#5a45a8,#2c2266)', boxShadow: '0 30px 60px #0008', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 70 }}>
      <div style={{ width: 230, height: 230, borderRadius: '50%', overflow: 'hidden', border: '8px solid #fff' }}><Img src={staticFile('marca/logo.jpg')} style={{ width: 230, height: 230, objectFit: 'cover' }} /></div>
      <div style={{ fontFamily: 'Archivo Black', fontSize: 66, color: '#fff', marginTop: 26 }}>Potter Play</div>
      <div style={{ fontFamily: 'Plex', fontWeight: 600, fontSize: 36, color: '#d9d2ff', marginTop: 6 }}>lo que nadie te explicó</div>
      <div style={{ display: 'flex', gap: 30, marginTop: 50 }}>
        <div style={{ fontFamily: 'Plex', fontWeight: 700, fontSize: 40, background: '#fff', color: '#2c2266', padding: '18px 44px', borderRadius: 999 }}>👍 Me gusta</div>
        <div style={{ fontFamily: 'Plex', fontWeight: 700, fontSize: 40, background: '#ff3b3b', color: '#fff', padding: '18px 44px', borderRadius: 999, transform: `scale(${boton})`, boxShadow: `0 0 0 ${toque * 26}px #ff3b3b33` }}>Suscribirme</div>
      </div>
    </div>);
}

// ---------- una escena ----------
function Escena({ e, dibujos, pal, primera }) {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), t = f / fps;
  const cam = e.camara || {}, de = cam.de || [0.5, 0.5, 1], a = cam.a || de;
  const p = interpolate(t, [0, e.dur], [0, 1], { ...clamp, easing: suave });
  // Zoom máximo 1,15: más cerca, los dibujos grandes se salen del cuadro (revisión del 2026-11-28)
  const z = Math.min(1.15, de[2] + (a[2] - de[2]) * p), cx = de[0] + (a[0] - de[0]) * p, cy = de[1] + (a[1] - de[1]) * p;
  const tx = Math.min(0, Math.max(W - W * z, W / 2 - cx * W * z)), ty = Math.min(0, Math.max(H - H * z, H / 2 - cy * H * z));
  const golpe = interpolate(f, [0, 10], [1.05, 1], { ...clamp, easing: salida });
  const op = primera ? 1 : interpolate(f, [0, CRUCE], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', opacity: op }}>
      <AbsoluteFill style={{ transform: `scale(${golpe})` }}>
        <div style={{ position: 'absolute', width: W, height: H, transformOrigin: '0 0', transform: `translate(${tx}px,${ty}px) scale(${z})` }}>
          <Fondo tipo={e.tipo === 'cierre' ? 'oscuro' : e.fondo} pal={pal} />
          {(e.capas || []).map((c, i) => <Capa key={i} c={c} f={f} fps={fps} t={t} dibujos={dibujos} />)}
        </div>
        {e.tipo === 'cierre' && <Cierre f={f} fps={fps} />}
      </AbsoluteFill>
      <Subtitulos e={e} t={t} />
    </AbsoluteFill>);
}

export const Explica = ({ render }) => {
  const { fps } = useVideoConfig();
  if (!render) return null;
  const { escenas, dibujos = {}, paleta = {} } = render;
  return (
    <AbsoluteFill style={{ background: '#0b0820' }}>
      {escenas.map((e, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(e.inicio * fps) - (i ? CRUCE : 0))} durationInFrames={Math.ceil(e.dur * fps) + (i ? CRUCE : 0) + 1}>
          <Escena e={e} dibujos={dibujos} pal={paleta} primera={i === 0} />
        </Sequence>))}
      <div style={{ position: 'absolute', left: 40, bottom: 120, fontFamily: 'Plex', fontWeight: 700, fontSize: 30, color: '#ffffffaa' }}>{render.marca}</div>
      {escenas.map((x, i) => (<Sequence key={`v${i}`} from={Math.round((x.inicio + INICIO_VOZ) * fps)} durationInFrames={Math.ceil((x.voz + 0.2) * fps)}><Audio src={staticFile(x.audio)} /></Sequence>))}
      {(render.sfx || []).map((s, i) => (<Sequence key={`s${i}`} from={Math.max(0, Math.round(s.t * fps))} durationInFrames={Math.round(2 * fps)}><Audio src={staticFile(`sfx/${s.s}.wav`)} volume={s.v ?? 0.4} /></Sequence>))}
      <Audio src={staticFile('musica.wav')} volume={0.12} />
    </AbsoluteFill>);
};
