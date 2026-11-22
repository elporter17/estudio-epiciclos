// Escena «historia» del formato «Idea» (sin IA: personajes y objetos CC0 de Kenney, lugares armados con código). Sirve para
// contar mini historias en tercera persona con una voz narradora: un lugar, uno o varios personajes con su acción, objetos y
// una cámara. Los filtros de «cómo lo ve…» (daltonismo, miopía) los pone Idea.jsx con e.vision.
//   e.lugar: 'cancha' | 'calle' | 'parque' | 'interior' | 'aula' (e.pizarra: texto) | 'consultorio' | 'cocina'   (+ e.paredes, e.piso: colores del interior)
//   e.personajes: [{ modelo: 'male-a', x, z, giro, escala, accion | [[seg, accion], …], camina: { a: [x, z], t0, t1 }, marca: '#hex' }]
//       acciones: idle, walk, sprint, jump, sit, crouch, pick-up, emote-yes, emote-no, holding-right, interact-right…
//       marca: un aro de color en el suelo y un cono sobre la cabeza (para equipos o papeles)
//   e.props: [{ objeto: 'comida/onion', x, y, z, escala, gira, flota, t0, de: [x, z], a: [x, z], dur }]
//   e.camara: 'frente' | 'orbita' | 'cerca' | 'lateral' | 'alta'  ·  e.foco: [x, y, z]  ·  e.fov
// Como todas las escenas, dependen solo del tiempo t: cada cuadro se puede dibujar suelto.
import { useMemo } from 'react';
import * as THREE from 'three';
import { Camara, Luces, Suelo, clamp, ease, easeInOut, lerp, lerp3 } from './escenas3d.jsx';
import { Personaje, Paisaje } from './modelos.jsx';
import { Objeto, texturaTexto } from './objetos.jsx';
import { Semaforo } from './escenasIdea.jsx';

// Los personajes de una historia no cambian de papel entre videos (a diferencia de PJ en escenas3d.jsx)
const PJH = (m, n) => m?.[`personajes/character-${n}`];
const accionEn = (a, t) => (Array.isArray(a) ? ([...a].reverse().find(([s]) => t >= s) || a[0])[1] : a || 'idle');

// ---------- lugares ----------
const Linea = ({ p, s, rot = 0, color = '#f4f1e6' }) => (<mesh rotation-x={-Math.PI / 2} rotation-z={rot} position={[p[0], 0.02, p[1]]}><planeGeometry args={s} /><meshStandardMaterial color={color} /></mesh>);
function Cancha({ m }) {
  const porteria = (x) => (<group position={[x, 0, -3.2]}>
    {[-1.4, 1.4].map((dx) => (<mesh key={dx} position={[dx, 0.9, 0]} castShadow><boxGeometry args={[0.12, 1.8, 0.12]} /><meshStandardMaterial color="#f4f1e6" /></mesh>))}
    <mesh position={[0, 1.8, 0]} castShadow><boxGeometry args={[2.92, 0.12, 0.12]} /><meshStandardMaterial color="#f4f1e6" /></mesh>
    <mesh position={[0, 0.9, -0.5]}><planeGeometry args={[2.8, 1.8]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.22} side={THREE.DoubleSide} /></mesh>
  </group>);
  return (<>
    <Suelo color="#4cb050" />
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow><planeGeometry args={[18, 11]} /><meshStandardMaterial color="#58bf5c" roughness={1} /></mesh>
    <Linea p={[0, -4.6]} s={[18, 0.12]} /><Linea p={[0, 4.6]} s={[18, 0.12]} /><Linea p={[0, 0]} s={[0.12, 9.2]} />
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}><ringGeometry args={[1.5, 1.62, 48]} /><meshStandardMaterial color="#f4f1e6" /></mesh>
    {porteria(-4)}{porteria(4)}
    <Paisaje m={m} libre={9} lejos={26} semilla={11} />
  </>);
}
function Calle({ m }) {
  const edificios = ['ciudad/building-type-a', 'ciudad/building-type-c', 'ciudad/building-type-h', 'ciudad/building-type-e', 'ciudad/building-type-m', 'ciudad/building-type-b'];
  return (<>
    <Suelo color="#8d9a8b" />
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 1.4]} receiveShadow><planeGeometry args={[40, 4.2]} /><meshStandardMaterial color="#3d4048" roughness={0.95} /></mesh>
    {[-8, -5, -2, 1, 4, 7].map((x) => (<mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.02, 1.4]}><planeGeometry args={[1.3, 0.16]} /><meshStandardMaterial color="#f4f1e6" /></mesh>))}
    <mesh position={[0, 0.06, -1.4]} receiveShadow><boxGeometry args={[40, 0.12, 1.6]} /><meshStandardMaterial color="#c9c4b8" roughness={0.9} /></mesh>
    {edificios.map((b, i) => (<Objeto key={b} objeto={b} m={m} position={[-9 + i * 3.6, 0, -5.2]} scale={4.4} rotation-y={0} />))}
    <Semaforo t={0} position={[3.2, 0.1, -0.9]} scale={0.6} />
  </>);
}
function Parque({ m }) {
  return (<>
    <Suelo />
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 1]} receiveShadow><planeGeometry args={[3, 30]} /><meshStandardMaterial color="#d8c9a3" roughness={1} /></mesh>
    <mesh position={[3.4, 0.45, -0.6]} castShadow><boxGeometry args={[2.2, 0.12, 0.7]} /><meshStandardMaterial color="#8a5a35" /></mesh>
    <mesh position={[3.4, 0.9, -0.95]} castShadow><boxGeometry args={[2.2, 0.6, 0.1]} /><meshStandardMaterial color="#8a5a35" /></mesh>
    <Paisaje m={m} libre={6} lejos={24} semilla={29} />
  </>);
}
// Un interior: piso, pared del fondo, pared lateral y una ventana. «consultorio» le suma el cartel de letras de las pruebas de vista;
// «cocina» una mesa con tabla y estantes
function Interior({ e, m, tipo }) {
  const paredes = e.paredes || (tipo === 'consultorio' ? '#d7ecef' : tipo === 'cocina' ? '#fde7b8' : tipo === 'aula' ? '#e6efd2' : '#f4d9bf'), piso = e.piso || (tipo === 'consultorio' ? '#e9e4da' : '#b98a5b');
  const cartel = useMemo(() => (tipo === 'consultorio' ? new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = 400; c.height = 600; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 400, 600); g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
    [['E', 180], ['F P', 120], ['T O Z', 84], ['L P E D', 58], ['P E C F D', 40]].reduce((y, [t, s]) => { g.font = `bold ${s}px Arial`; g.fillText(t, 200, y + s / 2); return y + s + 22; }, 24); return c; })()) : null), [tipo]);
  return (<>
    <Luces cielo={false} niebla={[40, 90]} colorNiebla="#e8e2d6" />
    <color attach="background" args={['#e8e2d6']} />
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow><planeGeometry args={[16, 14]} /><meshStandardMaterial color={piso} roughness={0.8} /></mesh>
    <mesh position={[0, 3, -3.4]} receiveShadow><planeGeometry args={[16, 6]} /><meshStandardMaterial color={paredes} roughness={1} /></mesh>
    <mesh position={[-6, 3, 1]} rotation-y={Math.PI / 2} receiveShadow><planeGeometry args={[14, 6]} /><meshStandardMaterial color={paredes} roughness={1} /></mesh>
    <mesh position={[1.5, 3.1, -3.38]}><planeGeometry args={[1.5, 1.5]} /><meshBasicMaterial color="#a9d8ff" /></mesh>
    <mesh position={[1.5, 3.1, -3.37]}><planeGeometry args={[0.06, 1.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
    {tipo === 'consultorio' && cartel && <mesh position={[-1.3, 3, -3.36]}><planeGeometry args={[1.1, 1.65]} /><meshBasicMaterial map={cartel} /></mesh>}
    {tipo === 'aula' && (<>
      <mesh position={[0, 2.9, -3.36]}><planeGeometry args={[3.6, 1.5]} /><meshBasicMaterial map={texturaTexto(e.pizarra || 'ABC  123  XYZ', { fondo: '#1f5a45', color: '#f4f1e6', w: 1024, h: 420, size: 150, borde: '#8a5a35' })} /></mesh>
      {[-1.1, 0, 1.1].map((x) => (<mesh key={x} position={[x, 0.42, 1.2]} castShadow><boxGeometry args={[0.9, 0.08, 0.6]} /><meshStandardMaterial color="#b98a5b" /></mesh>))}
    </>)}
    {tipo === 'cocina' && (<>
      <mesh position={[0, 0.5, -1.6]} castShadow receiveShadow><boxGeometry args={[3.2, 1, 1.5]} /><meshStandardMaterial color="#b07a4a" roughness={0.7} /></mesh>
      <mesh position={[0, 1.03, -1.6]} receiveShadow><boxGeometry args={[3.3, 0.06, 1.6]} /><meshStandardMaterial color="#f6f1e7" /></mesh>
    </>)}
    <mesh position={[-0.2, 0.02, 0.8]} rotation-x={-Math.PI / 2}><planeGeometry args={[3, 2]} /><meshStandardMaterial color="#c0605a" roughness={1} /></mesh>
  </>);
}

const LUGARES = {
  cancha: ({ m }) => <Cancha m={m} />, calle: ({ m }) => <Calle m={m} />, parque: ({ m }) => <Parque m={m} />,
  interior: (p) => <Interior {...p} tipo="interior" />, aula: (p) => <Interior {...p} tipo="aula" />, consultorio: (p) => <Interior {...p} tipo="consultorio" />, cocina: (p) => <Interior {...p} tipo="cocina" />
};
const INTERIOR = new Set(['interior', 'aula', 'consultorio', 'cocina']);

// ---------- personaje con marca, movimiento y acción por tiempo ----------
function Actor({ p, t, dur, m, k: K = 0.5 }) {
  const esc = p.escala ?? 1.7, [x0, z0] = [(p.x ?? 0) * K, p.z ?? 0], c = p.camina && { ...p.camina, a: [p.camina.a[0] * K, p.camina.a[1]] };
  let x = x0, z = z0, giro = p.giro ?? 0, accion = accionEn(p.accion, t);
  if (c) {
    const t0 = c.t0 ?? 0.3, t1 = c.t1 ?? dur * 0.7, k = easeInOut((t - t0) / Math.max(0.1, t1 - t0));
    x = lerp(x0, c.a[0], k); z = lerp(z0, c.a[1], k);
    if (t >= t0 && t < t1) { accion = 'walk'; giro = Math.atan2(c.a[0] - x0, c.a[1] - z0); } else if (t >= t1) { accion = p.accionFinal || 'idle'; giro = p.giro ?? 0; }
  }
  return (<group position={[x, 0, z]}>
    <Personaje gltf={PJH(m, p.modelo)} accion={accion} t={t} rotation-y={giro} scale={esc} />
    {p.marca && (<>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}><ringGeometry args={[0.42 * esc * 0.6, 0.55 * esc * 0.6, 40]} /><meshBasicMaterial color={p.marca} toneMapped={false} /></mesh>
      <mesh position={[0, esc * 1.05, 0]}><coneGeometry args={[0.16, 0.34, 20]} /><meshBasicMaterial color={p.marca} toneMapped={false} /></mesh>
    </>)}
  </group>);
}

export function EscenaHistoria({ t, dur, e, m }) {
  const lugar = e.lugar || 'parque', Lugar = LUGARES[lugar] || LUGARES.parque, dentro = INTERIOR.has(lugar), p = easeInOut(t / dur);
  const foco = e.foco || [0, 1.1, 0], cam = e.camara || 'frente', fov = e.fov || 40;
  const z0 = dentro ? 6.4 : 7.6;
  const POS = {
    frente: lerp3([0, 2.0, z0], [0, 1.8, z0 - 0.9], p),
    cerca: lerp3([0.4, 1.7, z0 - 2.4], [0, 1.6, z0 - 3.2], p),
    orbita: [lerp(-3.2, 3.2, p), 2.2, z0 - Math.abs(lerp(-3.2, 3.2, p)) * 0.12],
    lateral: lerp3([-5, 1.9, z0 - 2], [-4, 1.8, z0 - 1.6], p),
    alta: lerp3([0, 5.4, z0 - 0.4], [0, 4.6, z0 - 1], p)
  };
  return (<>
    <Camara pos={POS[cam] || POS.frente} mira={foco} fov={fov} desenfoque={dentro ? 0.15 : 0.35} />
    {!dentro && <Luces />}
    <Lugar m={m} e={e} />
    {(e.personajes || []).map((pj, i) => <Actor key={i} p={pj} t={t} dur={dur} m={m} k={e.ancho ?? 0.5} />)}
    {(e.props || []).map((o, i) => {
      const a = t - (o.t0 || 0); if (a < 0) return null;
      const K = e.ancho ?? 0.5; let x = (o.x ?? 0) * K, z = o.z ?? 0; if (o.de && o.a) { const k = ease(a / (o.dur || 1.2)); x = lerp(o.de[0], o.a[0], k) * K; z = lerp(o.de[1], o.a[1], k); }
      const pop = o.pop === false ? 1 : Math.min(1, ease(a / 0.45)) , y = (o.y || 0) + (o.flota ? 0.12 * Math.sin(t * 2.4) : 0);
      return <Objeto key={i} objeto={o.objeto} m={m} position={[x, y, z]} rotation-y={(o.giro || 0) + (o.gira || 0) * t} scale={(o.escala || 1) * pop} />;
    })}
  </>);
}
export const ESCENAS_HISTORIA = { historia: EscenaHistoria };
