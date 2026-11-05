// Más escenas reutilizables: calendario que pasa las hojas, objetos bajo un foco, camiones en una calle con casas,
// planeta Tierra low-poly con personas que se encienden y una cuadrícula de piscinas olímpicas vista desde el aire.
import { useMemo } from 'react';
import * as THREE from 'three';
import { Camara, Luces, Suelo, Botella, clamp, ease, easeInOut, rebote, lerp, lerp3, azar, PJ } from './escenas3d.jsx';
import { Paisaje, Personaje, Modelo } from './modelos.jsx';
import { Cielo } from './efectos.jsx';

// Textura con un texto grande (números del calendario, rótulos)
const texturas = new Map();
function texturaTexto(texto, { fondo = '#ffffff', color = '#1f2937', w = 256, h = 256, size = 150, fuente = 'Archivo Black' } = {}) {
  const k = [texto, fondo, color, w, h, size].join('|'); if (texturas.has(k)) return texturas.get(k);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = fondo; g.fillRect(0, 0, w, h); g.fillStyle = color; g.font = `${size}px "${fuente}"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texto, w / 2, h / 2 + size * 0.05);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texturas.set(k, t); return t;
}

// ---------- calendario: las hojas se arrancan solas y vuelan, cada vez más rápido ----------
export function EscenaCalendario({ t, dur, m }) {
  // El mismo ritmo que el contador de la pantalla (para que el número del calendario coincida)
  const total = 365, p = ease(t / (dur * 0.7)), dia = Math.max(1, Math.round(1 + (total - 1) * p));
  const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const fecha = new Date(2026, 0, dia), mes = meses[fecha.getMonth()], num = String(fecha.getDate());
  // Tres hojas volando (las que se acaban de arrancar)
  const hojas = [0, 1, 2].map((k) => { const f = ((t * (1.5 + (1 - p) * 6)) + k / 3) % 1; return { f, x: lerp(0.6, 3.6 + k, f), y: lerp(2.9, 4.6 + k * 0.5, f), z: lerp(0.3, -1.5, f), r: f * (2 + k) }; });
  return (<>
    <Camara pos={lerp3([1.4, 2.6, 8.6], [0.6, 2.2, 7.2], easeInOut(t / dur))} mira={[0, 1.5, 0]} />
    <Luces /><Suelo />
    <Paisaje m={m} libre={3} lejos={16} semilla={77} />
    <group position={[0, 0.02, 0]}>
      {/* Base del calendario: tapa roja con el mes y la hoja con el día */}
      <mesh position={[0, 1.6, 0]} castShadow><boxGeometry args={[2.4, 2.8, 0.25]} /><meshStandardMaterial color="#f4f1ea" /></mesh>
      <mesh position={[0, 2.75, 0.13]}><planeGeometry args={[2.4, 0.6]} /><meshStandardMaterial map={texturaTexto(mes, { fondo: '#e23b3b', color: '#ffffff', w: 512, h: 128, size: 92 })} /></mesh>
      <mesh position={[0, 1.4, 0.13]}><planeGeometry args={[2.2, 2.1]} /><meshStandardMaterial map={texturaTexto(num, { size: 170 })} /></mesh>
      {[-0.7, 0.7].map((x, i) => (<mesh key={i} position={[x, 3.06, 0.05]} rotation-x={Math.PI / 2}><torusGeometry args={[0.12, 0.03, 8, 16]} /><meshStandardMaterial color="#9aa3ad" metalness={0.8} roughness={0.3} /></mesh>))}
      {hojas.map((h, i) => (<mesh key={i} position={[h.x, h.y, h.z]} rotation={[h.r * 0.6, h.r, h.r * 0.4]} scale={0.55 - h.f * 0.25}><planeGeometry args={[2.2, 2.1]} /><meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={(1 - h.f) * (1 - p)} /></mesh>))}
    </group>
    <Personaje gltf={PJ(m, 'female-b')} accion="sit" t={t} position={[-1.7, 0, 0.9]} rotation-y={0.6} scale={1.6} />
  </>);
}

// ---------- objetos bajo un foco (escenario oscuro): aparecen uno a uno con un golpe de luz ----------
function Banera({ nivel = 1, ...props }) {
  return (<group {...props}>
    <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[2.2, 0.9, 1.1]} /><meshStandardMaterial color="#ffffff" roughness={0.25} /></mesh>
    <mesh position={[0, 0.93, 0]}><boxGeometry args={[2.0, 0.06, 0.9]} /><meshStandardMaterial color="#f2f6f9" /></mesh>
    <mesh position={[0, 0.35 + 0.55 * nivel, 0]}><boxGeometry args={[1.96, 0.04, 0.86]} /><meshStandardMaterial color="#2fa2f2" roughness={0.05} emissive="#1166aa" emissiveIntensity={0.25} /></mesh>
    {[[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]].map(([x, z], i) => (<mesh key={i} position={[x, 0.04, z]}><sphereGeometry args={[0.09, 12, 8]} /><meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.3} /></mesh>))}
  </group>);
}
export function EscenaFoco({ t, dur, cantidad = 4 }) {
  // Cada bañera aparece justo cuando el contador llega a su número (el contador sube con ease en el 70 % de la escena)
  const n = cantidad, aparece = (i) => dur * 0.7 * (1 - Math.cbrt(1 - (i + 0.5) / n));
  return (<>
    <Camara pos={lerp3([0, 6.5, 10.5], [0, 5.2, 9], easeInOut(t / dur))} mira={[0, 0.3, -0.3]} brillo={0.7} />
    <Cielo arriba="#05070d" medio="#0d1424" abajo="#1a2438" />
    <ambientLight intensity={0.35} />
    <hemisphereLight args={['#c9d8ff', '#1b2333', 0.6]} />
    <mesh rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[30, 48]} /><meshStandardMaterial color="#1b2333" roughness={0.6} /></mesh>
    {Array.from({ length: n }, (_, i) => {
      const x = (i % 2 ? 1.3 : -1.3), z = i < 2 ? -1.6 : 0.9, on = clamp((t - aparece(i)) / 0.25), k = rebote((t - aparece(i)) / 0.6);
      return (<group key={i}>
        <spotLight position={[x, 7, z + 2]} target-position={[x, 0, z]} angle={0.32} penumbra={0.5} intensity={on * 180} distance={20} castShadow />
        {/* El cono de luz visible */}
        <mesh position={[x, 3.6, z + 1]} rotation-x={-0.27}><coneGeometry args={[1.5, 7, 32, 1, true]} /><meshBasicMaterial color="#fff4cf" transparent opacity={0.035 * on} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        {t > aparece(i) && <Banera position={[x, lerp(3, 0, k), z]} scale={0.95} nivel={clamp((t - aparece(i) - 0.4) / 1.2)} />}
      </group>);
    })}
  </>);
}

// ---------- calle con casas y camiones cisterna que llegan ----------
const CASAS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'].map((l) => `ciudad/building-type-${l}`);
export const MODELOS_CIUDAD = [...CASAS, 'ciudad/tree-large', 'ciudad/tree-small', 'ciudad/fence', 'autos/truck', 'autos/truck-flat', 'autos/sedan', 'autos/taxi', 'autos/van'];
function Cisterna({ m, ...props }) {
  // El camión de Kenney con un tanque cilíndrico encima
  return (<group {...props}>
    <Modelo escena={m?.['autos/truck-flat'] || m?.['autos/truck']} scale={1} />
    <mesh position={[0, 1.05, -0.35]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.48, 0.48, 1.7, 24]} /><meshStandardMaterial color="#dfe6ee" metalness={0.6} roughness={0.25} /></mesh>
    <mesh position={[0, 1.05, -0.35]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.49, 0.49, 0.5, 24, 1, true]} /><meshStandardMaterial color="#2f9bf0" side={THREE.DoubleSide} /></mesh>
  </group>);
}
export function EscenaCamion({ t, dur, m }) {
  const llega = (d) => easeInOut((t - d) / 2.2), casas = useMemo(() => { const r = azar(9); return Array.from({ length: 14 }, (_, i) => ({ n: CASAS[Math.floor(r() * CASAS.length)], z: -26 + i * 4, lado: i % 2 ? 1 : -1, ry: r() })); }, []);
  return (<>
    <Camara pos={lerp3([3.6, 6, 15], [2.6, 4.6, 12], easeInOut(t / dur))} mira={[0.4, 0.8, -4]} />
    <Luces niebla={[20, 70]} /><Suelo />
    {/* Calle: asfalto y líneas */}
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, -5]} receiveShadow><planeGeometry args={[4.4, 70]} /><meshStandardMaterial color="#4a5260" roughness={0.9} /></mesh>
    {Array.from({ length: 16 }, (_, i) => (<mesh key={i} rotation-x={-Math.PI / 2} position={[0, 0.02, -36 + i * 4.5]}><planeGeometry args={[0.15, 2]} /><meshStandardMaterial color="#ffd23c" /></mesh>))}
    {[-1, 1].map((l) => (<mesh key={l} rotation-x={-Math.PI / 2} position={[l * 2.7, 0.015, -5]}><planeGeometry args={[1, 70]} /><meshStandardMaterial color="#d9d4c7" /></mesh>))}
    {casas.map((c, i) => (<Modelo key={i} escena={m?.[c.n]} position={[c.lado * 5.2, 0, c.z]} rotation-y={c.lado > 0 ? -Math.PI / 2 : Math.PI / 2} scale={2.6} />))}
    {Array.from({ length: 10 }, (_, i) => (<Modelo key={`t${i}`} escena={m?.['ciudad/tree-large']} position={[(i % 2 ? 1 : -1) * 3.4, 0, -24 + i * 5]} scale={1.6} />))}
    {/* Dos cisternas: entran por la calle y se detienen una tras otra */}
    <Cisterna m={m} position={[0.9, 0, lerp(-40, -1.5, llega(0.1))]} scale={1.5} />
    <Cisterna m={m} position={[0.9, 0, lerp(-46, -6.5, llega(0.7))]} scale={1.5} />
    <Personaje gltf={PJ(m, 'male-a')} accion={t < 2.6 ? 'idle' : 'emote-yes'} t={t} position={[2.6, 0, 1.6]} rotation-y={-0.6} scale={1.5} />
  </>);
}

// ---------- planeta Tierra low-poly: continentes por ruido, giro lento y luces que se encienden (personas) ----------
function ruido3(semilla) {
  const r = azar(semilla), g = Array.from({ length: 512 }, () => r() * 2 - 1);
  const h = (x, y, z) => g[(((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 512];
  const s = (t) => t * t * (3 - 2 * t);
  const v = (x, y, z) => { const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), fx = s(x - X), fy = s(y - Y), fz = s(z - Z); let o = 0;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) o += h(X + i, Y + j, Z + k) * (i ? fx : 1 - fx) * (j ? fy : 1 - fy) * (k ? fz : 1 - fz); return o; };
  return (x, y, z) => v(x * 1.6, y * 1.6, z * 1.6) * 0.65 + v(x * 3.4, y * 3.4, z * 3.4) * 0.35;
}
const PLANETA = (() => {
  const geo = new THREE.IcosahedronGeometry(2, 18).toNonIndexed(), pos = geo.attributes.position, n = ruido3(42), col = [], tierra = [];
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 6, cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 6, cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 6;
    const v = n(cx, cy, cz), polo = Math.abs(cy) > 0.86;
    const c = new THREE.Color(polo ? '#f4f8fb' : v > 0.12 ? (v > 0.3 ? '#4f9a45' : '#6cbf4f') : v > 0.07 ? '#e8d59a' : '#2f7fd6');
    for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
    if (!polo && v > 0.12) tierra.push(new THREE.Vector3(cx, cy, cz).normalize());
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  return { geo, tierra };
})();
export function EscenaGlobo({ t, dur }) {
  const giro = t * 0.25, p = clamp(t / (dur * 0.85)), luces = PLANETA.tierra.filter((_, i) => i % 3 === 0), n = Math.floor(luces.length * ease(p));
  return (<>
    <Camara pos={lerp3([0, 0.6, 12.5], [0, 0.4, 9.5], easeInOut(t / dur))} mira={[0, 0, 0]} desenfoque={0} brillo={1.1} />
    <Cielo arriba="#020410" medio="#07112a" abajo="#0b1a3a" />
    <ambientLight intensity={0.5} />
    <directionalLight position={[-6, 4, 6]} intensity={2.4} />
    {/* Estrellas */}
    {useMemo(() => { const r = azar(5); return Array.from({ length: 160 }, (_, i) => { const a = r() * 6.28, b = (r() - 0.5) * 3, d = 40 + r() * 20; return <mesh key={i} position={[Math.cos(a) * d, b * 12, Math.sin(a) * d - 20]}><sphereGeometry args={[0.06 + r() * 0.08, 6, 4]} /><meshBasicMaterial color="#ffffff" /></mesh>; }); }, [])}
    <group rotation={[0.35, giro, 0]}>
      <mesh geometry={PLANETA.geo}><meshStandardMaterial vertexColors flatShading roughness={0.9} /></mesh>
      {/* Atmósfera */}
      <mesh scale={1.06}><sphereGeometry args={[2, 48, 32]} /><meshBasicMaterial color="#6fc3ff" transparent opacity={0.12} side={THREE.BackSide} /></mesh>
      {luces.slice(0, n).map((v, i) => (<mesh key={i} position={v.clone().multiplyScalar(2.03)}><sphereGeometry args={[0.035, 6, 4]} /><meshBasicMaterial color="#ffe08a" toneMapped={false} /></mesh>))}
    </group>
  </>);
}

// ---------- cuadrícula de piscinas olímpicas que se multiplican, vista desde el aire ----------
export function EscenaPiscinas({ t, dur }) {
  const lado = 24, total = lado * lado, p = clamp(t / (dur * 0.8)), n = Math.floor(total * ease(p) ** 1.4), alto = lerp(9, 70, easeInOut(p));
  // Del centro hacia afuera: las más cercanas al centro aparecen primero
  const orden = useMemo(() => Array.from({ length: total }, (_, i) => [(i % lado) - lado / 2 + 0.5, Math.floor(i / lado) - lado / 2 + 0.5]).sort((a, b) => Math.hypot(a[0], a[1] * 0.5) - Math.hypot(b[0], b[1] * 0.5)), [total]);
  const mat = useMemo(() => new THREE.Matrix4(), []);
  return (<>
    <Camara pos={[alto * 0.15, alto, alto * 0.55]} mira={[0, 0, 0]} fov={50} desenfoque={0.4} />
    <Luces sol={[30, 80, 20]} niebla={[80, 260]} /><Suelo radio={400} />
    <instancedMesh args={[undefined, undefined, total]} count={n} ref={(im) => { if (!im) return; orden.forEach(([x, z], i) => { mat.makeTranslation(x * 3.2, 0.06, z * 1.6); im.setMatrixAt(i, mat); }); im.instanceMatrix.needsUpdate = true; }}>
      <boxGeometry args={[2.5, 0.12, 1.25]} /><meshStandardMaterial color="#2fa8f5" roughness={0.1} emissive="#0b4f86" emissiveIntensity={0.2} />
    </instancedMesh>
  </>);
}
