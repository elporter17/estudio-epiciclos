// «Dato»: video vertical de un dato curioso en 3D. Arriba, los subtítulos palabra por palabra (la palabra clave en un
// recuadro amarillo); en medio, la escena 3D; sobre ella, el contador. Narrador por escena y música de fondo.
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { clamp, ease } from './escenas3d.jsx';
import { ESCENAS, MODELOS_CIUDAD, TEMAS, modelosDelGuion } from './escenas.js';
import { useModelos, NATURALEZA, PERSONAJES } from './modelos.jsx';
const BASE = [...NATURALEZA, ...PERSONAJES, ...MODELOS_CIUDAD];
// El lienzo de Remotion solo se dibuja al cambiar de cuadro: cuando llegan los modelos hay que redibujarlo a mano
function Redibujar({ dep }) { const advance = useThree((s) => s.advance); useLayoutEffect(() => { advance(performance.now()); }, [dep, advance]); return null; }

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
  const clave = new Set((escena.resaltar || []).map(sinSignos)), esClave = (w) => clave.has(sinSignos(w)) || /\d/.test(w);
  return (
    <div style={{ position: 'absolute', top: 250, left: 70, right: 70, textAlign: 'center', fontFamily: 'Archivo Black', fontSize: 78, lineHeight: 1.18, color: '#fff', WebkitTextStroke: '3px rgba(10,20,40,0.85)', paintOrder: 'stroke fill', textShadow: '0 6px 0 rgba(10,20,40,0.45), 0 0 30px rgba(10,20,40,0.45)' }}>
      {g.map((p, i) => {
        const a = clamp((t - p.t) / 0.12), es = esClave(p.w);
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
        {c.hasta % 1 ? v.toFixed(1).replace('.', ',') : formato(v)}<span style={{ fontFamily: 'Plex', fontWeight: 700, fontSize: 48, color: AMARILLO, marginLeft: 16 }}>{Math.round(v) === 1 ? c.unidad.replace(/s$/, '') : c.unidad}</span>
      </div>
    </div>
  );
}

// Portada: categoría, el título enorme (se lee completo desde el primer cuadro: es la miniatura) y la marca
function Portada({ g, t }) {
  const T = TEMAS[g.categoria] || TEMAS.datos, palabras = g.titulo.split(' '), destacar = new Set((g.destacar || []).map(sinSignos));
  return (<AbsoluteFill>
    <div style={{ position: 'absolute', top: 210, width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div style={{ background: T.acento, color: '#111', fontFamily: 'Archivo Black', fontSize: 44, padding: '10px 34px', borderRadius: 40, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>{T.nombre}</div>
    </div>
    <div style={{ position: 'absolute', top: 330, left: 60, right: 60, textAlign: 'center', fontFamily: 'Archivo Black', fontSize: 104, lineHeight: 1.08, color: '#fff', WebkitTextStroke: '5px rgba(10,20,40,0.9)', paintOrder: 'stroke fill', textShadow: '0 10px 0 rgba(10,20,40,0.45), 0 0 40px rgba(10,20,40,0.4)', transform: `scale(${1 + 0.03 * Math.sin(t * 2)})` }}>
      {palabras.map((w, i) => (<span key={i} style={{ display: 'inline-block', margin: '0 14px', color: destacar.has(sinSignos(w)) || /\d/.test(w) ? AMARILLO : '#fff' }}>{w}</span>))}
    </div>
    <div style={{ position: 'absolute', bottom: 150, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18 }}>
      <Logo size={86} /><div style={{ fontFamily: 'Archivo Black', fontSize: 46, color: '#fff', textShadow: '0 3px 10px rgba(0,0,0,0.5)' }}>Potter Play</div>
    </div>
  </AbsoluteFill>);
}
function Logo({ size }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', backgroundImage: `url(${staticFile('marca/logo.jpg')})`, backgroundSize: `${size * 1.92}px`, backgroundPosition: `${-size * 0.46}px ${-size * 0.31}px`, boxShadow: '0 6px 20px rgba(0,0,0,0.4)', border: '4px solid #fff' }} />;
}
// Cierre: el logo grande, «Síguenos» y la promesa del canal
function Cierre({ t }) {
  const a = ease(t / 0.5);
  return (<AbsoluteFill>
    <div style={{ position: 'absolute', top: 230, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, opacity: a, transform: `translateY(${(1 - a) * 40}px)` }}>
      <Logo size={230} />
      <div style={{ fontFamily: 'Archivo Black', fontSize: 92, color: '#fff', WebkitTextStroke: '4px rgba(10,20,40,0.9)', paintOrder: 'stroke fill' }}>¡SÍGUENOS!</div>
      <div style={{ background: AMARILLO, color: '#111', fontFamily: 'Archivo Black', fontSize: 48, padding: '10px 34px', borderRadius: 40 }}>Un dato nuevo cada día</div>
    </div>
  </AbsoluteFill>);
}

export const Dato = ({ render }) => {
  const lista = useMemo(() => [...BASE, ...modelosDelGuion(render).filter((x) => !BASE.includes(x))], [render]);
  const frame = useCurrentFrame(), { fps, width, height } = useVideoConfig(), m = useModelos(lista);
  if (!render) return null;
  const T = frame / fps, escenas = render.escenas;
  const e = escenas.find((x) => T < x.inicio + x.dur) || escenas.at(-1), t = T - e.inicio, Escena = ESCENAS[e.tipo];
  // Transición entre escenas: la imagen se acerca y se desenfoca como un barrido rápido de cámara (sale y entra)
  const ultima = e === escenas.at(-1), primera = e === escenas[0];
  const sale = ultima ? 0 : 1 - clamp((e.dur - t) / 0.28), entra = primera ? 0 : 1 - clamp(t / 0.28), k = Math.max(sale, entra);
  const zoom = 1 + 0.12 * ease(sale) - 0.08 * ease(entra);
  return (
    <AbsoluteFill style={{ background: '#a9e1ff' }}>
      <AbsoluteFill style={{ filter: k > 0.01 ? `blur(${(k * 18).toFixed(1)}px) brightness(${(1 + 0.12 * k).toFixed(2)})` : 'none', transform: `scale(${zoom.toFixed(4)})` }}>
        <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 40, position: [0, 2, 6] }}>
          {Escena && <Escena t={t} dur={e.dur} cantidad={e.cantidad} m={m} e={e} g={render} />}
          <Redibujar dep={m} />
        </ThreeCanvas>
      </AbsoluteFill>
      {e.contador && <Contador c={e.contador} t={t} dur={e.dur} />}
      {e.tipo === 'portada' ? <Portada g={render} t={t} /> : e.tipo === 'cierre' && render.categoria ? <Cierre t={t} /> : <Subtitulos escena={e} t={t} />}
      {e.tipo !== 'portada' && e.tipo !== 'cierre' && <div style={{ position: 'absolute', bottom: 120, left: 70, display: 'flex', alignItems: 'center', gap: 12 }}><Logo size={54} /><span style={{ fontFamily: 'Archivo Black', fontSize: 32, color: 'rgba(255,255,255,0.85)', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>Potter Play</span></div>}
      {escenas.map((x, i) => (<Sequence key={i} from={Math.round((x.inicio + 0.25) * fps)} durationInFrames={Math.ceil((x.voz + 0.2) * fps)}><Audio src={staticFile(x.audio)} /></Sequence>))}
      {(render.sfx || []).map((s, i) => (<Sequence key={`s${i}`} from={Math.max(0, Math.round(s.t * fps))} durationInFrames={Math.round(3 * fps)}><Audio src={staticFile(`sfx/${s.s}.wav`)} volume={s.v} /></Sequence>))}
      <Audio src={staticFile('musica.wav')} volume={0.14} />
    </AbsoluteFill>
  );
};
