// Escenas del formato «Idea» (videos que se arman desde una idea; el 3D de datos de la cola no las usa):
//   vision    una mesa con frutas de colores (o un semáforo) para mostrar cómo la ve alguien con daltonismo; el filtro
//             de color lo pone Idea.jsx (e.vision)
//   ishihara  una lámina de puntos de colores con un número escondido (como el test de Ishihara)
// Como todas las escenas, dependen solo del tiempo t: cada cuadro se puede dibujar suelto.
import { useMemo, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { Camara, Luces, Suelo, clamp, ease, easeInOut, lerp, lerp3, azar } from './escenas3d.jsx';
import { Cielo } from './efectos.jsx';
import { Objeto } from './objetos.jsx';
import { Paisaje } from './modelos.jsx';

// ---------- vision: mesa de frutas (o semáforo) que la cámara rodea despacio ----------
export const FRUTAS = ['comida/apple', 'comida/tomato', 'comida/strawberry', 'comida/orange', 'comida/banana', 'comida/lemon', 'comida/broccoli', 'comida/grapes', 'comida/watermelon', 'comida/cherries', 'comida/carrot', 'comida/eggplant'];
function Semaforo({ t, position, scale = 1 }) {
  // Rojo, amarillo y verde se encienden por turnos (cada 1,4 s)
  const turno = Math.floor(t / 1.4) % 3, luces = [['#ff2d2d', 0], ['#ffd400', 1], ['#22e05b', 2]];
  return (<group position={position} scale={scale}>
    <mesh position={[0, 1.6, 0]} castShadow><cylinderGeometry args={[0.08, 0.1, 3.2, 12]} /><meshStandardMaterial color="#2b2f36" /></mesh>
    <mesh position={[0, 3.6, 0]} castShadow><boxGeometry args={[0.9, 2.3, 0.6]} /><meshStandardMaterial color="#1c1f24" roughness={0.6} /></mesh>
    {luces.map(([c, i]) => (<mesh key={i} position={[0, 4.35 - i * 0.72, 0.31]}><circleGeometry args={[0.26, 32]} /><meshBasicMaterial color={turno === i ? c : new THREE.Color(c).multiplyScalar(0.22)} toneMapped={false} /></mesh>))}
  </group>);
}
export function EscenaVision({ t, dur, e, m }) {
  const p = easeInOut(t / dur);
  if (e.modo === 'semaforo') return (<>
    <Camara pos={lerp3([-2.5, 3.2, 7], [2.5, 3.6, 6], p)} mira={[0, 3.4, 0]} fov={42} desenfoque={0.4} />
    <Luces /><Suelo color="#8a8f98" /><Paisaje m={m} libre={6} lejos={22} semilla={81} />
    <Semaforo t={t} position={[0, 0, 0]} scale={1.2} />
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 2.5]}><planeGeometry args={[30, 5]} /><meshStandardMaterial color="#3d4048" roughness={0.95} /></mesh>
    {[-4, -1.5, 1, 3.5].map((x) => (<mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.02, 2.5]}><planeGeometry args={[1.2, 0.25]} /><meshStandardMaterial color="#f4f1e6" /></mesh>))}
  </>);
  // Mesa con frutas en dos filas
  const frutas = (e.objetos || FRUTAS).slice(0, 12);
  return (<>
    <Camara pos={lerp3([-4.5, 4.2, 7.5], [4.5, 4.6, 7], p)} mira={[0, 1.2, 0]} fov={40} desenfoque={0.5} />
    <Cielo arriba="#fef3e2" medio="#fde7c8" abajo="#f7d9b0" />
    <ambientLight intensity={0.6} /><directionalLight position={[4, 8, 5]} intensity={2.4} castShadow />
    <mesh position={[0, 0.5, 0]} receiveShadow castShadow><boxGeometry args={[9, 1, 4.6]} /><meshStandardMaterial color="#c08552" roughness={0.7} /></mesh>
    <mesh position={[0, 1.02, 0]} receiveShadow><boxGeometry args={[8.6, 0.04, 4.2]} /><meshStandardMaterial color="#f6f1e7" roughness={0.9} /></mesh>
    {frutas.map((f, i) => { const fila = Math.floor(i / 6), col = i % 6, ap = ease((t - 0.08 * i) / 0.4); return <Objeto key={f + i} objeto={f} m={m} position={[-3.4 + col * 1.36, 1.05 + (1 - ap) * 2, -0.9 + fila * 1.7]} rotation-y={0.4 * i} scale={Math.max(0.001, ap) * 1.05} />; })}
    <Semaforo t={t} position={[3.6, 1.05, -1.9]} scale={0.38} />
  </>);
}

// ---------- ishihara: lámina de puntos con un número escondido ----------
// Puntos sin encimarse dentro de un círculo; el número decide el color de cada punto (figura naranja-rojiza sobre fondo
// verde oliva: quien tiene daltonismo rojo-verde casi no lo distingue)
const FIGURA = ['#e07b39', '#d9663a', '#ef8f4b', '#c95a2e', '#f0a05a'], FONDO = ['#8fae4a', '#a3b85c', '#7c9a3f', '#b5c46e', '#96a84f'];
function lamina(numero, semilla = 7) {
  const r = azar(semilla + Number(numero || 7)), R = 3, puntos = [];
  // La máscara del número: se dibuja en un lienzo y se consulta cada punto
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#fff'; x.font = 'bold 178px "Archivo Black", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(numero), 128, 136);
  const px = x.getImageData(0, 0, 256, 256).data, dentro = (u, v) => { const i = (Math.floor(v) * 256 + Math.floor(u)) * 4; return px[i] > 128; };
  for (let k = 0; k < 26000 && puntos.length < 1700; k++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R, px3 = Math.cos(a) * d, py3 = Math.sin(a) * d, rad = 0.035 + r() * 0.07;
    if (d + rad > R) continue;
    if (puntos.some((q) => (q.x - px3) ** 2 + (q.y - py3) ** 2 < (q.r + rad + 0.012) ** 2)) continue;
    const fig = dentro((px3 / R) * 118 + 128, (-py3 / R) * 118 + 128);
    puntos.push({ x: px3, y: py3, r: rad, fig, color: (fig ? FIGURA : FONDO)[Math.floor(r() * 5)] });
  }
  return puntos;
}
export function EscenaIshihara({ t, dur, e }) {
  const puntos = useMemo(() => lamina(e.numero || 74), [e.numero]), ref = useRef();
  const revela = clamp((t - dur * (e.revelar ?? 0.78)) / 0.4);
  useLayoutEffect(() => {
    const mesh = ref.current; if (!mesh) return;
    const o = new THREE.Object3D(), col = new THREE.Color();
    puntos.forEach((q, i) => {
      const s = q.r * (q.fig ? 1 + 0.18 * revela : 1);
      o.position.set(q.x, q.y, 0); o.rotation.set(Math.PI / 2, 0, 0); o.scale.set(s, 1, s); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
      col.set(q.color); if (q.fig && revela) col.lerp(new THREE.Color('#ffffff'), 0.35 * revela); mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [puntos, revela]);
  // En vertical lo que limita es el ancho: la lámina entera cabe a ~15 de distancia
  const z = lerp(15.5, 13.2, easeInOut(t / dur));
  return (<>
    <Camara pos={[0, 0.2, z]} mira={[0, 0, 0]} fov={45} desenfoque={0} />
    <Cielo arriba="#10141f" medio="#1a2133" abajo="#273149" />
    <ambientLight intensity={1.2} /><directionalLight position={[2, 3, 6]} intensity={1.2} />
    <mesh position={[0, 0, -0.05]}><circleGeometry args={[3.25, 96]} /><meshStandardMaterial color="#f3ead8" roughness={0.9} /></mesh>
    <instancedMesh ref={ref} args={[null, null, puntos.length]}><cylinderGeometry args={[1, 1, 0.04, 20]} /><meshStandardMaterial roughness={0.8} /></instancedMesh>
  </>);
}

export const ESCENAS_IDEA = { vision: EscenaVision, ishihara: EscenaIshihara };
