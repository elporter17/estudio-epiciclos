// «Dato»: video vertical de un dato curioso en 3D. Arriba, los subtítulos palabra por palabra (la palabra clave en un
// recuadro amarillo); en medio, la escena 3D; sobre ella, el contador. Narrador por escena y música de fondo.
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { ESCENAS, clamp, ease } from './escenas3d.jsx';

const AMARILLO = '#ffd23c';
const sinSignos = (w) => w.replace(/[¿?¡!.,:;«»"]/g, '').toLowerCase();

// Tiempo de cada palabra: el audio de la escena se reparte según lo largo de cada palabra (los números se leen más
// largos) y las pausas de la puntuación
function tiempos(texto, inicio, voz) {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const peso = palabras.map((w) => { const s = sinSignos(w); return (/\d/.test(s) ? s.replace(/\D/g, '').length * 3.2 : s.length) + 1.5 + (/[.,:;?!]$/.test(w) ? 3 : 0); });
  const total = peso.reduce((a, b) => a + b, 0); let acc = 0;
  return palabras.map((w, i) => { const t = inicio + (acc / total) * voz; acc += peso[i]; return { w, t }; });
}
// Grupos de hasta 4 palabras (cortando en la puntuación) que se muestran juntos
function grupos(ps) {
  const out = []; let cur = [];
  for (const p of ps) { cur.push(p); if (cur.length >= 4 || /[.,:;?!]$/.test(p.w)) { out.push(cur); cur = []; } }
  if (cur.length) out.push(cur); return out;
}
const formato = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function Subtitulos({ escena, t }) {
  const ps = tiempos(escena.texto, 0.25, escena.voz), gs = grupos(ps);
  const g = [...gs].reverse().find((x) => t >= x[0].t - 0.05) || gs[0];
  const clave = new Set((escena.resaltar || []).map(sinSignos));
  return (
    <div style={{ position: 'absolute', top: 250, left: 70, right: 70, textAlign: 'center', fontFamily: 'Archivo Black', fontSize: 78, lineHeight: 1.18, color: '#fff', WebkitTextStroke: '3px rgba(10,20,40,0.85)', paintOrder: 'stroke fill', textShadow: '0 6px 0 rgba(10,20,40,0.45), 0 0 30px rgba(10,20,40,0.45)' }}>
      {g.map((p, i) => {
        const a = clamp((t - p.t) / 0.12), es = clave.has(sinSignos(p.w));
        return (<span key={i} style={{ display: 'inline-block', margin: '0 12px', opacity: 0.25 + 0.75 * a, transform: `translateY(${(1 - ease(a)) * 18}px) scale(${0.9 + 0.1 * ease(a)})`,
          ...(es && a > 0.5 ? { background: AMARILLO, color: '#111', padding: '0 16px', borderRadius: 18, textShadow: 'none' } : {}) }}>{p.w}</span>);
      })}
    </div>
  );
}
function Contador({ c, t, dur }) {
  const v = c.desde + (c.hasta - c.desde) * ease(t / (dur * 0.7)), a = ease(t / 0.4);
  return (
    <div style={{ position: 'absolute', top: 640, width: '100%', display: 'flex', justifyContent: 'center', opacity: a, transform: `scale(${0.7 + 0.3 * a})` }}>
      <div style={{ background: 'rgba(17,24,39,0.82)', color: '#fff', borderRadius: 36, padding: '14px 42px', fontFamily: 'Archivo Black', fontSize: 96, boxShadow: '0 12px 40px rgba(0,0,0,0.3)', border: '4px solid rgba(255,255,255,0.15)' }}>
        {formato(v)}<span style={{ fontFamily: 'Plex', fontWeight: 700, fontSize: 48, color: AMARILLO, marginLeft: 16 }}>{c.unidad}</span>
      </div>
    </div>
  );
}

export const Dato = ({ render }) => {
  const frame = useCurrentFrame(), { fps, width, height } = useVideoConfig();
  if (!render) return null;
  const T = frame / fps, escenas = render.escenas;
  const e = escenas.find((x) => T < x.inicio + x.dur) || escenas.at(-1), t = T - e.inicio, Escena = ESCENAS[e.tipo];
  // Fundido rápido a blanco entre escenas
  const corte = Math.min(t, e === escenas.at(-1) ? 9 : e.dur - t), destello = 1 - clamp(corte / 0.18);
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #5cc3ff 0%, #a9e1ff 45%, #e9f7ff 100%)' }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} camera={{ fov: 40, position: [0, 2, 6] }}>
        {Escena && <Escena t={t} dur={e.dur} cantidad={e.cantidad} />}
      </ThreeCanvas>
      {e.contador && <Contador c={e.contador} t={t} dur={e.dur} />}
      <Subtitulos escena={e} t={t} />
      <div style={{ position: 'absolute', bottom: 120, left: 70, fontFamily: 'Archivo Black', fontSize: 34, color: 'rgba(17,24,39,0.55)' }}>Potter Play</div>
      <AbsoluteFill style={{ background: '#fff', opacity: 0.85 * destello }} />
      {escenas.map((x, i) => (<Sequence key={i} from={Math.round((x.inicio + 0.25) * fps)} durationInFrames={Math.ceil((x.voz + 0.2) * fps)}><Audio src={staticFile(x.audio)} /></Sequence>))}
      <Audio src={staticFile('musica.wav')} volume={0.16} />
    </AbsoluteFill>
  );
};
