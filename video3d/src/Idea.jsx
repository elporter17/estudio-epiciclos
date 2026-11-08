// «Idea»: el formato de los videos que se arman desde una idea (scripts/idea.mjs y el bot de Telegram). Por fuera es
// igual que «Dato» (subtítulos, contador, portada, cierre, narrador y música) y reutiliza sus escenas genéricas, pero
// tiene escenas propias (escenasIdea.jsx) y un filtro de visión: e.vision = { tipo: 'deutan'|'protan'|'tritan',
// desde, hasta } pasa la escena, poco a poco, de los colores normales a como la ve alguien con ese daltonismo.
// El 3D de datos de la cola («Dato») no se toca.
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { clamp, ease, lerp } from './escenas3d.jsx';
import { ESCENAS, modelosDelGuion } from './escenas.js';
import { ESCENAS_IDEA, FRUTAS } from './escenasIdea.jsx';
import { useModelos } from './modelos.jsx';
import { Subtitulos, Contador, Portada, Logo, Cierre, Redibujar, BASE } from './Dato.jsx';

const TODAS = { ...ESCENAS, ...ESCENAS_IDEA };
// Simulación de daltonismo (Machado, Oliveira y Fernandes, 2009; severidad completa), en filas RGB
const VISION = {
  protan: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deutan: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritan: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039]
};
export const NOMBRE_VISION = { protan: 'protanopia', deutan: 'deuteranopia', tritan: 'tritanopia' };
const ID = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const valores = (tipo, p) => { const v = ID.map((x, i) => lerp(x, VISION[tipo][i], p)); return `${v[0]} ${v[1]} ${v[2]} 0 0 ${v[3]} ${v[4]} ${v[5]} 0 0 ${v[6]} ${v[7]} ${v[8]} 0 0 0 0 0 1 0`; };

// La etiqueta que dice qué estás viendo («Así lo ves tú» → «Así lo ve alguien con deuteranopia»)
function Etiqueta({ texto, alfa }) {
  return (<div style={{ position: 'absolute', top: 470, width: '100%', display: 'flex', justifyContent: 'center', opacity: alfa }}>
    <div style={{ fontFamily: 'Archivo Black', fontSize: 46, color: '#111827', background: '#ffd23c', padding: '14px 34px', borderRadius: 999, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>{texto}</div>
  </div>);
}

export const Idea = ({ render }) => {
  const lista = useMemo(() => [...BASE, ...modelosDelGuion(render).filter((x) => !BASE.includes(x)), ...(render?.escenas || []).flatMap((e) => e.objetos || (e.tipo === 'vision' && e.modo !== 'semaforo' ? FRUTAS : []))], [render]);
  const frame = useCurrentFrame(), { fps, width, height } = useVideoConfig(), m = useModelos(lista);
  if (!render) return null;
  const T = frame / fps, escenas = render.escenas;
  const e = escenas.find((x) => T < x.inicio + x.dur) || escenas.at(-1), t = T - e.inicio, Escena = TODAS[e.tipo];
  const ultima = e === escenas.at(-1), primera = e === escenas[0];
  const sale = ultima ? 0 : 1 - clamp((e.dur - t) / 0.28), entra = primera ? 0 : 1 - clamp(t / 0.28), k = Math.max(sale, entra);
  const zoom = 1 + 0.12 * ease(sale) - 0.08 * ease(entra);
  // Cuánto del filtro de visión va (0 = colores normales, 1 = como lo ve alguien con ese daltonismo)
  const v = e.vision && VISION[e.vision.tipo] ? e.vision : null, pv = v ? clamp((t / e.dur - (v.desde ?? 0.35)) / Math.max(0.01, (v.hasta ?? 0.55) - (v.desde ?? 0.35))) : 0;
  const filtros = [k > 0.01 ? `blur(${(k * 18).toFixed(1)}px) brightness(${(1 + 0.12 * k).toFixed(2)})` : '', pv > 0 ? 'url(#vision)' : ''].filter(Boolean).join(' ') || 'none';
  return (
    <AbsoluteFill style={{ background: '#a9e1ff' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}><filter id="vision" colorInterpolationFilters="linearRGB"><feColorMatrix type="matrix" values={v ? valores(v.tipo, pv) : valores('deutan', 0)} /></filter></svg>
      <AbsoluteFill style={{ filter: filtros, transform: `scale(${zoom.toFixed(4)})` }}>
        <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 40, position: [0, 2, 6] }}>
          {Escena && <Escena t={t} dur={e.dur} cantidad={e.cantidad} m={m} e={e} g={render} />}
          <Redibujar dep={m} />
        </ThreeCanvas>
      </AbsoluteFill>
      {v && <Etiqueta texto={pv < 0.5 ? '👁️ Así lo ves tú' : `Así lo ve alguien con ${NOMBRE_VISION[v.tipo]}`} alfa={clamp(t / 0.4) * clamp((e.dur - t) / 0.3)} />}
      {e.contador && <Contador c={e.contador} t={t} dur={e.dur} />}
      {e.tipo === 'portada' ? <Portada g={render} t={t} /> : e.tipo === 'cierre' && render.categoria ? <Cierre t={t} /> : <Subtitulos escena={e} t={t} />}
      {e.tipo !== 'portada' && e.tipo !== 'cierre' && <div style={{ position: 'absolute', bottom: 120, left: 70, display: 'flex', alignItems: 'center', gap: 12 }}><Logo size={54} /><span style={{ fontFamily: 'Archivo Black', fontSize: 32, color: 'rgba(255,255,255,0.85)', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>Potter Play</span></div>}
      {escenas.map((x, i) => (<Sequence key={i} from={Math.round((x.inicio + 0.25) * fps)} durationInFrames={Math.ceil((x.voz + 0.2) * fps)}><Audio src={staticFile(x.audio)} /></Sequence>))}
      {(render.sfx || []).map((s, i) => (<Sequence key={`s${i}`} from={Math.max(0, Math.round(s.t * fps))} durationInFrames={Math.round(3 * fps)}><Audio src={staticFile(`sfx/${s.s}.wav`)} volume={s.v} /></Sequence>))}
      <Audio src={staticFile('musica.wav')} volume={0.14} />
    </AbsoluteFill>
  );
};
