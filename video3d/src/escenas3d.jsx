// Escenas 3D hechas con código (sin modelos descargados ni IA): botellas por torneado (LatheGeometry), vaso, montaña
// low-poly, nubes y piscina. Todo depende solo del tiempo `t` de la escena, así cada cuadro se puede dibujar suelto.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = (x) => 1 - (1 - clamp(x)) ** 3;
const easeInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
// Caída con rebote (para lo que cae y aterriza)
function rebote(x) {
  x = clamp(x); const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375;
}
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
function azar(semilla) { let s = semilla; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

// ---------- cámara ----------
// Se aplica durante el render (no en un efecto): así el cuadro que se dibuja ya tiene la cámara en su lugar
function Camara({ pos, mira, fov = 48 }) {
  const camera = useThree((s) => s.camera), size = useThree((s) => s.size);
  camera.position.set(...pos); camera.fov = fov; camera.near = 0.1; camera.far = 2000;
  camera.aspect = size.width / size.height; camera.updateProjectionMatrix(); camera.lookAt(...mira); camera.updateMatrixWorld();
  return null;
}
function Luces({ sol = [6, 10, 5], intensidad = 2.2, niebla = [25, 90] }) {
  return (<>
    <fog attach="fog" args={['#cdeeff', niebla[0], niebla[1]]} />
    <hemisphereLight args={['#ffffff', '#9fc9e8', 1.1]} />
    <directionalLight position={sol} intensity={intensidad} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0004} />
  </>);
}
function Suelo({ color = '#9edb7c', radio = 80 }) {
  return (<mesh rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[radio, 64]} /><meshStandardMaterial color={color} roughness={0.95} /></mesh>);
}

// ---------- botella (geometría por torneado) ----------
const perfil = [[0, 0], [0.4, 0], [0.45, 0.06], [0.46, 0.25], [0.43, 0.32], [0.46, 0.4], [0.46, 0.98], [0.4, 1.12], [0.2, 1.32], [0.15, 1.42], [0.15, 1.52], [0, 1.52]];
const GEO = {
  cuerpo: new THREE.LatheGeometry(perfil.map(([x, y]) => new THREE.Vector2(x, y)), 32),
  agua: new THREE.LatheGeometry([[0, 0.03], [0.42, 0.03], [0.43, 0.25], [0.4, 0.32], [0.43, 0.4], [0.43, 0.9], [0, 0.9]].map(([x, y]) => new THREE.Vector2(x, y)), 32),
  tapa: new THREE.CylinderGeometry(0.17, 0.17, 0.14, 24).translate(0, 1.58, 0),
  etiqueta: new THREE.CylinderGeometry(0.465, 0.465, 0.32, 32, 1, true).translate(0, 0.65, 0)
};
const MAT = {
  cuerpo: new THREE.MeshPhysicalMaterial({ color: '#e8f7ff', transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }),
  agua: new THREE.MeshStandardMaterial({ color: '#2f9bf0', transparent: true, opacity: 0.88, roughness: 0.15 }),
  tapa: new THREE.MeshStandardMaterial({ color: '#1b5fd1', roughness: 0.4 }),
  etiqueta: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, side: THREE.DoubleSide })
};
function Botella(props) {
  return (<group {...props}>
    <mesh geometry={GEO.agua} material={MAT.agua} castShadow />
    <mesh geometry={GEO.etiqueta} material={MAT.etiqueta} />
    <mesh geometry={GEO.tapa} material={MAT.tapa} castShadow />
    <mesh geometry={GEO.cuerpo} material={MAT.cuerpo} />
  </group>);
}
// Muchas botellas a la vez (una malla por pieza, instanciada)
function Botellas({ matrices }) {
  const refs = [useRef(), useRef(), useRef(), useRef()];
  useLayoutEffect(() => {
    for (const r of refs) { if (!r.current) continue; matrices.forEach((m, i) => r.current.setMatrixAt(i, m)); r.current.count = matrices.length; r.current.instanceMatrix.needsUpdate = true; r.current.computeBoundingSphere(); }
  });
  const n = Math.max(1, matrices.length);
  return (<>
    <instancedMesh ref={refs[0]} args={[GEO.agua, MAT.agua, n]} castShadow />
    <instancedMesh ref={refs[1]} args={[GEO.etiqueta, MAT.etiqueta, n]} />
    <instancedMesh ref={refs[2]} args={[GEO.tapa, MAT.tapa, n]} castShadow />
    <instancedMesh ref={refs[3]} args={[GEO.cuerpo, MAT.cuerpo, n]} />
  </>);
}
const matriz = (pos, rot, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(s, s, s));

// ---------- vaso ----------
const vasoPerfil = [[0.55, 0], [0.62, 1.7], [0.58, 1.7], [0.51, 0.08], [0, 0.08]];
const GEO_VASO = new THREE.LatheGeometry([[0, 0], ...vasoPerfil].map(([x, y]) => new THREE.Vector2(x, y)), 48);
function Vaso({ nivel = 0.8, ...props }) {
  const h = 0.1 + 1.45 * clamp(nivel);
  return (<group {...props}>
    <mesh position={[0, 0.08 + h / 2, 0]} castShadow><cylinderGeometry args={[0.505 + 0.035 * (h / 1.62), 0.51, h, 48]} /><meshStandardMaterial color="#38a8f5" transparent opacity={0.85} roughness={0.1} /></mesh>
    <mesh geometry={GEO_VASO}><meshPhysicalMaterial color="#f2fbff" transparent opacity={0.3} roughness={0.02} clearcoat={1} side={THREE.DoubleSide} depthWrite={false} /></mesh>
  </group>);
}

// ---------- escenas ----------
// 1) Un vaso que se llena con gotas que caen
function EscenaVaso({ t, dur }) {
  const p = t / dur, gotas = [];
  for (let k = 0; k < 7; k++) { const f = (t * 1.3 + k / 7) % 1; gotas.push(<mesh key={k} position={[Math.sin(k * 2.1) * 0.15, 3.6 - f * 2.4, Math.cos(k * 1.7) * 0.15]} scale={[0.09, 0.13, 0.09]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#4fb6ff" transparent opacity={clamp((1 - f) * 3)} /></mesh>); }
  return (<>
    <Camara pos={lerp3([2.8, 2.4, 5.6], [1.7, 1.5, 4.2], easeInOut(p))} mira={[0, 0.75, 0]} />
    <Luces /><Suelo />
    <Vaso nivel={ease(t / (dur * 0.85))} />
    {gotas}
  </>);
}
// 2) Dos botellas caen y rebotan
function EscenaBotellas({ t, dur }) {
  const b = (d, x) => { const k = rebote((t - d) / 0.9); return <Botella position={[x, lerp(6, 0, k), 0]} rotation={[0, -0.4 + x * 0.3, 0]} />; };
  return (<>
    <Camara pos={lerp3([0.6, 1.5, 6.4], [0, 2, 5.2], easeInOut(t / dur))} mira={[0, 0.8, 0]} />
    <Luces /><Suelo />
    {b(0.2, -0.65)}{b(0.55, 0.65)}
  </>);
}
// 3) Montaña de botellas acostadas que caen una tras otra
function EscenaPila({ t, dur, cantidad = 365 }) {
  const lugares = useMemo(() => {
    const r = azar(11), out = [];
    for (let i = 0; i < cantidad; i++) {
      const ang = r() * Math.PI * 2, rad = Math.sqrt(r()) * 5.5, alto = Math.max(0, 3.4 * (1 - rad / 5.5)) * (0.6 + 0.4 * r());
      out.push({ pos: [Math.cos(ang) * rad, 0.46 + alto, Math.sin(ang) * rad], rot: [(r() - 0.5) * 0.5, r() * Math.PI, Math.PI / 2 + (r() - 0.5) * 0.3], orden: alto + r() * 0.3 });
    }
    return out.sort((a, b) => a.orden - b.orden);
  }, [cantidad]);
  const caida = dur * 0.75, matrices = [];
  lugares.forEach((l, i) => {
    const ini = (i / lugares.length) * caida * 0.85, k = rebote((t - ini) / 0.7);
    if (t < ini) return;
    matrices.push(matriz([l.pos[0], lerp(l.pos[1] + 9, l.pos[1], k), l.pos[2]], [l.rot[0], l.rot[1] + (1 - k) * 2, l.rot[2]]));
  });
  return (<>
    <Camara pos={lerp3([0, 4, 13], [0, 9, 19], easeInOut(t / dur))} mira={[0, 1.3, 0]} />
    <Luces /><Suelo />
    <Botellas matrices={matrices} />
  </>);
}
// 4) Una torre de botellas que sube más alto que una montaña nevada, entre nubes
const GEO_MONTE = new THREE.ConeGeometry(42, 62, 7, 3);
const GEO_NIEVE = new THREE.ConeGeometry(13.6, 20, 7, 1).translate(0, 21, 0);
function Nube({ position, s = 1 }) {
  return (<group position={position} scale={s}>{[[0, 0, 0, 2.2], [2.2, -0.3, 0.4, 1.6], [-2.1, -0.4, -0.2, 1.7], [0.8, 0.9, -0.3, 1.5]].map(([x, y, z, r], i) => (
    <mesh key={i} position={[x, y, z]}><icosahedronGeometry args={[r, 1]} /><meshStandardMaterial color="#ffffff" flatShading roughness={1} /></mesh>))}</group>);
}
function EscenaTorre({ t, dur }) {
  const N = 42, p = clamp(t / (dur * 0.8)), visibles = Math.floor(easeInOut(p) * N), matrices = [];
  const S = 2.5;
  for (let i = 0; i < visibles; i++) matrices.push(matriz([0, i * 1.6 * S, 0], [0, i * 0.7, 0], S));
  const k = ease(p), cima = Math.max(2, visibles * 1.6 * S);
  return (<>
    {(() => { const sube = clamp(p / 0.7), aleja = easeInOut((p - 0.7) / 0.3), y = Math.max(4, cima - 4);
      const cerca = [8, y + 1, 20], lejos = [70, 95, 210];
      return <Camara pos={lerp3(cerca, lejos, aleja)} mira={[0, lerp(y - 2, 90, aleja), 0]} fov={lerp(48, 55, aleja)} />; })()}
    <Luces sol={[80, 200, 60]} intensidad={2} niebla={[120, 700]} />
    <mesh rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[900, 64]} /><meshStandardMaterial color="#9edb7c" roughness={1} /></mesh>
    <group position={[-120, 75, -110]} scale={2.4}>
      <mesh geometry={GEO_MONTE}><meshStandardMaterial color="#7d8794" flatShading roughness={1} /></mesh>
      <mesh geometry={GEO_NIEVE}><meshStandardMaterial color="#ffffff" flatShading roughness={1} /></mesh>
    </group>
    <Nube position={[-30, 50, -10]} s={4} /><Nube position={[30, 95, -25]} s={5} /><Nube position={[-14, 135, 8]} s={3.5} /><Nube position={[40, 35, 10]} s={3} /><Nube position={[-60, 160, -60]} s={6} />
    <Botellas matrices={matrices} />
    {/* La botella que está cayendo arriba de la torre */}
    {visibles < N && p < 1 && <Botella position={[0, cima + 8 * (1 - ((p * N) % 1)), 0]} scale={S} />}
  </>);
}
// Un césped grande con un hueco rectangular en el centro
const cespedes = new Map();
function cesped(w, d) {
  const k = `${w}x${d}`; if (cespedes.has(k)) return cespedes.get(k);
  const sh = new THREE.Shape(); sh.absarc(0, 0, 60, 0, Math.PI * 2);
  const h = new THREE.Path(); h.moveTo(-w / 2, -d / 2); h.lineTo(w / 2, -d / 2); h.lineTo(w / 2, d / 2); h.lineTo(-w / 2, d / 2); h.lineTo(-w / 2, -d / 2); sh.holes.push(h);
  const g = new THREE.ShapeGeometry(sh, 48); cespedes.set(k, g); return g;
}
// 5) Una piscina de jardín que se llena
function EscenaPiscina({ t, dur }) {
  const nivel = ease(t / (dur * 0.8)), L = 4, A = 8, P = 1.5, h = 0.02 + nivel * (P - 0.15);
  const azulejo = '#d8eef9', borde = '#f4f1ea';
  return (<>
    <Camara pos={lerp3([0.5, 11, 10], [0, 8, 8.5], easeInOut(t / dur))} mira={[0, -0.8, -0.3]} />
    <Luces sol={[6, 12, 4]} niebla={[30, 90]} />
    {/* Terraza alrededor (cuatro losas para dejar el hueco de la piscina) */}
    {[[0, A / 2 + 1.5, L + 6, 3], [0, -A / 2 - 1.5, L + 6, 3], [L / 2 + 1.5, 0, 3, A], [-L / 2 - 1.5, 0, 3, A]].map(([x, z, w, d], i) => (
      <mesh key={i} position={[x, -0.05, z]} receiveShadow><boxGeometry args={[w, 0.1, d]} /><meshStandardMaterial color={borde} roughness={0.9} /></mesh>))}
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.11, 0]} receiveShadow geometry={cesped(L + 6, A + 6)}><meshStandardMaterial color="#9edb7c" roughness={1} /></mesh>
    {/* Vaso de la piscina: fondo y paredes */}
    <mesh position={[0, -P, 0]} receiveShadow><boxGeometry args={[L, 0.05, A]} /><meshStandardMaterial color={azulejo} /></mesh>
    {[[0, A / 2, L, 0.06], [0, -A / 2, L, 0.06], [L / 2, 0, 0.06, A], [-L / 2, 0, 0.06, A]].map(([x, z, w, d], i) => (
      <mesh key={i} position={[x, -P / 2, z]} receiveShadow><boxGeometry args={[w, P, d]} /><meshStandardMaterial color={azulejo} /></mesh>))}
    {/* Agua que sube, con un leve oleaje en la superficie */}
    <mesh position={[0, -P + h / 2, 0]}><boxGeometry args={[L - 0.08, h, A - 0.08]} /><meshStandardMaterial color="#29a3f0" transparent opacity={0.72} roughness={0.08} /></mesh>
    <mesh position={[0, -P + h + 0.005, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[L - 0.08, A - 0.08]} /><meshStandardMaterial color="#8fd8ff" transparent opacity={0.35 + 0.1 * Math.sin(t * 3)} roughness={0.02} /></mesh>
    {/* Escalera */}
    {[-0.3, 0.3].map((x, i) => (<mesh key={i} position={[L / 2 - 0.15, 0.2, A / 2 - 0.9 + x]} rotation-y={Math.PI / 2}><torusGeometry args={[0.35, 0.04, 8, 24, Math.PI]} /><meshStandardMaterial color="#c9d2da" metalness={0.8} roughness={0.25} /></mesh>))}
  </>);
}
// 6) Cierre: el vaso lleno y una botella, girando despacio
function EscenaCierre({ t, dur }) {
  const a = t * 0.25;
  return (<>
    <Camara pos={[Math.sin(a) * 5.4, 2.1, Math.cos(a) * 5.4]} mira={[0, 0.8, 0]} />
    <Luces /><Suelo />
    <Vaso nivel={0.85} position={[-0.6, 0, 0]} />
    <Botella position={[0.7, 0, 0]} rotation={[0, 0.5, 0]} />
  </>);
}

export const ESCENAS = { vaso: EscenaVaso, botellas: EscenaBotellas, pila: EscenaPila, torre: EscenaTorre, piscina: EscenaPiscina, cierre: EscenaCierre };
