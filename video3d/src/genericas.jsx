// Escenas genéricas: sirven para cualquier tema porque el objeto, las cantidades y los textos vienen del guion
// (e = la escena del guion). Todas dependen solo del tiempo t, así que cada cuadro se puede dibujar suelto.
import { useMemo } from 'react';
import * as THREE from 'three';
import { Camara, Luces, Suelo, Nube, clamp, ease, easeInOut, rebote, lerp, lerp3, azar, PJ } from './escenas3d.jsx';
import { Paisaje, Personaje, Modelo, PERSONAJES } from './modelos.jsx';
import { Cielo } from './efectos.jsx';
import { Objeto, Muchos, matrizDe, texturaTexto, medidas } from './objetos.jsx';

export const TEMAS = {
  ciencia: { cielo: ['#2563eb', '#60a5fa', '#dbeafe'], acento: '#60a5fa', nombre: 'DATO CIENTÍFICO' },
  historia: { cielo: ['#b45309', '#f59e0b', '#fef3c7'], acento: '#f59e0b', nombre: 'HISTORIA' },
  datos: { cielo: ['#047857', '#34d399', '#d1fae5'], acento: '#34d399', nombre: 'DATO' },
  curiosidad: { cielo: ['#6d28d9', '#a78bfa', '#ede9fe'], acento: '#a78bfa', nombre: 'CURIOSIDAD' },
  noticia: { cielo: ['#b91c1c', '#f87171', '#fee2e2'], acento: '#f87171', nombre: 'EXPLICADO' },
  especial: { cielo: ['#9d174d', '#f472b6', '#fce7f3'], acento: '#f472b6', nombre: 'ESPECIAL' }
};
const tema = (g) => TEMAS[g?.categoria] || TEMAS.datos;

// ---------- portada: el objeto principal enorme sobre un pedestal que brilla (el texto lo pone Dato) ----------
export function EscenaPortada({ t, dur, e, m, g }) {
  const T = tema(g), s = 2.6, giro = t * 0.6, salto = Math.sin(t * 2.2) * 0.08;
  return (<>
    <Camara pos={lerp3([0, 2.4, 9.5], [0, 2.1, 8.4], easeInOut(t / dur))} mira={[0, 1.4, 0]} desenfoque={0.3} brillo={0.6} />
    <Cielo arriba={T.cielo[0]} medio={T.cielo[1]} abajo={T.cielo[2]} />
    <Luces cielo={false} niebla={[30, 80]} colorNiebla={T.cielo[2]} />
    <Suelo color={T.cielo[2]} />
    <mesh position={[0, 0.15, 0]} receiveShadow castShadow><cylinderGeometry args={[2, 2.2, 0.3, 48]} /><meshStandardMaterial color="#ffffff" roughness={0.4} /></mesh>
    <mesh position={[0, 0.31, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[1.6, 1.9, 48]} /><meshBasicMaterial color={T.acento} toneMapped={false} /></mesh>
    <Objeto objeto={e.objeto || 'moneda'} m={m} position={[0, 0.32 + salto + 0.1, 0]} rotation-y={giro} scale={s} />
    {useMemo(() => { const r = azar(4); return Array.from({ length: 18 }, () => [(r() - 0.5) * 8, 0.5 + r() * 5, (r() - 0.5) * 4 - 1, r()]); }, []).map(([x, y, z, f], i) => (
      <mesh key={i} position={[x, y + Math.sin(t * 2 + i) * 0.2, z]} scale={0.06 + 0.05 * Math.abs(Math.sin(t * 3 + f * 9))}><octahedronGeometry args={[1, 0]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>))}
  </>);
}

// ---------- cierre: personajes que saludan, confeti y el objeto del video (el logo y el texto los pone Dato) ----------
export function EscenaCierre({ t, dur, e, m, g }) {
  const T = tema(g), a = t * 0.2;
  const confeti = useMemo(() => { const r = azar(17); return Array.from({ length: 70 }, () => ({ x: (r() - 0.5) * 9, z: (r() - 0.5) * 5, v: 0.8 + r(), f: r(), c: ['#ffd23c', '#ff5a8a', '#4fb6ff', '#34d399', '#ffffff'][Math.floor(r() * 5)] })); }, []);
  return (<>
    <Camara pos={[Math.sin(a) * 7.5, 2.4, Math.cos(a) * 7.5]} mira={[0, 1.1, 0]} />
    <Luces niebla={[25, 80]} /><Suelo /><Paisaje m={m} libre={4} lejos={16} semilla={91} />
    {e.objeto && <Objeto objeto={e.objeto} m={m} position={[0, 0, -0.6]} scale={1.6} rotation-y={t * 0.8} />}
    {['female-c', 'male-a', 'female-e', 'male-d'].map((n, i) => (<Personaje key={n} gltf={PJ(m, n)} accion={i % 2 ? 'emote-yes' : 'interact-right'} t={t + i * 0.3} position={[(i - 1.5) * 1.5, 0, 1 + (i % 2) * 0.4]} rotation-y={0} scale={1.6} />))}
    {confeti.map((c, i) => { const y = 7 - ((t * c.v + c.f * 7) % 7); return (<mesh key={i} position={[c.x, y, c.z]} rotation={[t * 3 + i, t * 2, i]}><planeGeometry args={[0.12, 0.2]} /><meshBasicMaterial color={c.c} side={THREE.DoubleSide} /></mesh>); })}
  </>);
}

// ---------- pila: N objetos caen uno tras otro y forman una montaña ----------
export function EscenaPila({ t, dur, e, m }) {
  const n = e.cantidad || 200, objeto = e.objeto || 'botella', md = medidas(objeto, m), tam = e.tam || 1;
  const R = Math.max(2.2, Math.sqrt(n) * 0.33 * tam), H = R * 0.62;
  const lugares = useMemo(() => {
    const r = azar(11), out = [];
    for (let i = 0; i < n; i++) {
      const ang = r() * 6.283, rad = Math.sqrt(r()) * R, alto = Math.max(0, H * (1 - rad / R)) * (0.6 + 0.4 * r());
      const acostado = md.alto > md.ancho * 1.3; // lo alto (botellas) se acuesta; lo plano (monedas, comida) no
      out.push({ pos: [Math.cos(ang) * rad, alto, Math.sin(ang) * rad], rot: acostado ? [(r() - 0.5) * 0.5, r() * 3.14, Math.PI / 2] : [(r() - 0.5) * 0.6, r() * 6.28, (r() - 0.5) * 0.6], orden: alto + r() * 0.3 });
    }
    return out.sort((a, b) => a.orden - b.orden);
  }, [n, R, H, md.alto, md.ancho]);
  const caida = dur * 0.75, mats = [];
  lugares.forEach((l, i) => { const ini = (i / n) * caida * 0.85; if (t < ini) return; const k = rebote((t - ini) / 0.7); mats.push(matrizDe([l.pos[0], lerp(l.pos[1] + 9, l.pos[1], k), l.pos[2]], [l.rot[0], l.rot[1] + (1 - k) * 2, l.rot[2]], tam)); });
  return (<>
    <Camara pos={lerp3([0, R * 0.8 + 2, R * 2.2 + 5], [0, R * 1.5 + 3, R * 3 + 7], easeInOut(t / dur))} mira={[0, H * 0.4, 0]} />
    <Luces /><Suelo /><Paisaje m={m} libre={R + 2} lejos={R * 3 + 14} semilla={13} />
    <Muchos objeto={objeto} m={m} matrices={mats} />
    <Personaje gltf={PJ(m, 'female-c')} accion="idle" t={t} position={[R * 0.6, 0, R + 1.6]} rotation-y={-2.8} scale={1.8} />
    <Personaje gltf={PJ(m, 'male-d')} accion="emote-no" t={t} position={[-R * 0.6, 0, R + 1.4]} rotation-y={2.8} scale={1.8} />
  </>);
}

// ---------- lluvia: objetos que caen del cielo sobre un pueblo y se acumulan ----------
const CASAS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'].map((l) => `ciudad/building-type-${l}`);
function Pueblo({ m, radio = 9, n = 10, semilla = 3 }) {
  const casas = useMemo(() => { const r = azar(semilla); return Array.from({ length: n }, (_, i) => { const a = (i / n) * 6.283 + r() * 0.3, d = radio * (0.8 + r() * 0.4); return { c: CASAS[Math.floor(r() * CASAS.length)], p: [Math.cos(a) * d, 0, Math.sin(a) * d], ry: -a + Math.PI / 2 }; }); }, [radio, n, semilla]);
  return <>{casas.map((c, i) => <Modelo key={i} escena={m?.[c.c]} position={c.p} rotation-y={c.ry} scale={2.4} />)}</>;
}
export function EscenaLluvia({ t, dur, e, m }) {
  const objeto = e.objeto || 'moneda', n = e.cantidad || 160, tam = e.tam || 0.7;
  const gotas = useMemo(() => { const r = azar(23); return Array.from({ length: n }, (_, i) => ({ x: (r() - 0.5) * 12, z: (r() - 0.5) * 10, ini: (i / n) * dur * 0.8, ry: r() * 6.28, rx: (r() - 0.5) * 0.8 })); }, [n, dur]);
  const mats = [];
  for (const g of gotas) { if (t < g.ini) continue; const k = clamp((t - g.ini) / 0.9), y = lerp(12, 0, k * k); mats.push(matrizDe([g.x, y, g.z], [g.rx * (1 - k), g.ry + t * (1 - k) * 4, 0], tam)); }
  return (<>
    <Camara pos={lerp3([0, 7, 17], [0, 9, 20], easeInOut(t / dur))} mira={[0, 1, 0]} />
    <Luces niebla={[30, 90]} /><Suelo /><Pueblo m={m} />
    <Muchos objeto={objeto} m={m} matrices={mats} />
    <Personaje gltf={PJ(m, 'male-b')} accion="emote-no" t={t} position={[1.2, 0, 5]} rotation-y={-0.3} scale={1.8} />
  </>);
}

// ---------- torre: objetos apilados que suben junto a una referencia (Everest, pirámide, edificio) ----------
const GEO_MONTE = new THREE.ConeGeometry(42, 62, 7, 3), GEO_NIEVE = new THREE.ConeGeometry(13.6, 20, 7, 1).translate(0, 21, 0), GEO_PIRAMIDE = new THREE.ConeGeometry(1, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0);
function Referencia({ tipo, alto }) {
  if (tipo === 'everest') return (<group position={[-alto * 0.75, alto / 2, -alto * 0.7]} scale={alto / 62}><mesh geometry={GEO_MONTE}><meshStandardMaterial color="#7d8794" flatShading roughness={1} /></mesh><mesh geometry={GEO_NIEVE}><meshStandardMaterial color="#ffffff" flatShading roughness={1} /></mesh></group>);
  if (tipo === 'piramide') return (<mesh geometry={GEO_PIRAMIDE} position={[-alto * 1.1, 0, -alto * 0.6]} scale={[alto * 1.55, alto, alto * 1.55]} castShadow><meshStandardMaterial color="#d8b46a" flatShading roughness={1} /></mesh>);
  if (tipo === 'edificio') return (<group position={[-alto * 0.45, 0, -alto * 0.25]}>
    <mesh position={[0, alto / 2, 0]} castShadow><boxGeometry args={[alto * 0.18, alto, alto * 0.18]} /><meshStandardMaterial color="#9fb3c8" metalness={0.5} roughness={0.25} /></mesh>
    <mesh position={[0, alto + alto * 0.06, 0]}><cylinderGeometry args={[0.003 * alto, 0.01 * alto, alto * 0.12, 8]} /><meshStandardMaterial color="#cfd8e3" /></mesh></group>);
  return null;
}
export function EscenaTorre({ t, dur, e, m }) {
  const objeto = e.objeto || 'botella', md = medidas(objeto, m), N = e.cantidad || 40, paso = md.alto * 1.0;
  const S = 2.5, altoTorre = N * paso * S, altoRef = altoTorre / (e.proporcion || 1.05);
  const p = clamp(t / (dur * 0.8)), visibles = Math.floor(easeInOut(p) * N), mats = [];
  for (let i = 0; i < visibles; i++) mats.push(matrizDe([0, i * paso * S, 0], [0, i * 0.7, 0], S));
  const cima = Math.max(2, visibles * paso * S), sube = clamp(p / 0.7), aleja = easeInOut((p - 0.7) / 0.3), y = Math.max(4, cima - 4);
  const lejos = [altoTorre * 0.42, altoTorre * 0.56, altoTorre * 1.25];
  return (<>
    <Camara pos={lerp3([8, y + 1, 20], lejos, aleja)} mira={[0, lerp(y - 2, altoTorre * 0.53, aleja), 0]} fov={lerp(48, 55, aleja)} desenfoque={lerp(0.6, 0, aleja)} />
    <Luces sol={[80, 200, 60]} intensidad={2} niebla={[altoTorre * 0.7, altoTorre * 4]} />
    <mesh rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[altoTorre * 6, 64]} /><meshStandardMaterial color="#9edb7c" roughness={1} /></mesh>
    <Referencia tipo={e.referencia || 'everest'} alto={altoRef} />
    {[[-0.18, 0.15, -0.06, 0.025], [0.18, 0.56, -0.15, 0.03], [-0.08, 0.8, 0.05, 0.02], [0.24, 0.21, 0.06, 0.018]].map(([x, yy, z, s], i) => <Nube key={i} position={[x * altoTorre, yy * altoTorre, z * altoTorre]} s={s * altoTorre} />)}
    <Paisaje m={m} libre={9} lejos={Math.min(70, altoTorre * 0.4)} arboles={40} detalles={30} escala={3.2} semilla={21} />
    <Muchos objeto={objeto} m={m} matrices={mats} />
    {visibles < N && p < 1 && <Objeto objeto={objeto} m={m} position={[0, cima + 8 * (1 - ((p * N) % 1)), 0]} scale={S} />}
    <Personaje gltf={PJ(m, 'male-c')} accion="emote-no" t={t} position={[4, 0, 3]} rotation-y={-2.2} scale={2.6} />
  </>);
}

// ---------- foco: hasta 4 objetos que aparecen uno a uno bajo un foco (escenario oscuro) ----------
export function EscenaFoco({ t, dur, e, m }) {
  const n = Math.min(4, e.cantidad || 1), objeto = e.objeto || 'moneda', tam = (e.tam || 1) * (n === 1 ? 2.6 : 1.7);
  const pos = n === 1 ? [[0, 0]] : n === 2 ? [[-1.3, 0], [1.3, 0]] : [[-1.3, -1.6], [1.3, -1.6], [-1.3, 0.9], [1.3, 0.9]].slice(0, n);
  const aparece = (i) => dur * 0.7 * (1 - Math.cbrt(1 - (i + 0.5) / n));
  return (<>
    <Camara pos={lerp3([0, 6.5, 10.5], [0, 5.2, 9], easeInOut(t / dur))} mira={[0, 0.6, -0.3]} brillo={0.7} />
    <Cielo arriba="#05070d" medio="#0d1424" abajo="#1a2438" />
    <ambientLight intensity={0.35} /><hemisphereLight args={['#c9d8ff', '#1b2333', 0.6]} />
    <mesh rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[30, 48]} /><meshStandardMaterial color="#1b2333" roughness={0.6} /></mesh>
    {pos.map(([x, z], i) => { const on = clamp((t - aparece(i)) / 0.25), k = rebote((t - aparece(i)) / 0.6); return (<group key={i}>
      <spotLight position={[x, 7, z + 2]} target-position={[x, 0, z]} angle={0.32} penumbra={0.5} intensity={on * 180} distance={20} castShadow />
      <mesh position={[x, 3.6, z + 1]} rotation-x={-0.27}><coneGeometry args={[1.5, 7, 32, 1, true]} /><meshBasicMaterial color="#fff4cf" transparent opacity={0.035 * on} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {t > aparece(i) && <Objeto objeto={objeto} m={m} position={[x, lerp(3, 0, k), z]} rotation-y={Math.sin(t * 0.9 + i) * 0.6} scale={tam} />}
    </group>); })}
  </>);
}

// ---------- globo: la Tierra low-poly con luces, satélites, rayos u órbita alrededor del Sol ----------
function ruido3(semilla) {
  const r = azar(semilla), gg = Array.from({ length: 512 }, () => r() * 2 - 1), h = (x, y, z) => gg[(((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 512], s = (q) => q * q * (3 - 2 * q);
  const v = (x, y, z) => { const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), fx = s(x - X), fy = s(y - Y), fz = s(z - Z); let o = 0; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) o += h(X + i, Y + j, Z + k) * (i ? fx : 1 - fx) * (j ? fy : 1 - fy) * (k ? fz : 1 - fz); return o; };
  return (x, y, z) => v(x * 1.6, y * 1.6, z * 1.6) * 0.65 + v(x * 3.4, y * 3.4, z * 3.4) * 0.35;
}
const PLANETA = (() => {
  const geo = new THREE.IcosahedronGeometry(2, 18).toNonIndexed(), pos = geo.attributes.position, n = ruido3(42), col = [], tierra = [];
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 6, cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 6, cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 6;
    const v = n(cx, cy, cz), polo = Math.abs(cy) > 0.86, c = new THREE.Color(polo ? '#f4f8fb' : v > 0.12 ? (v > 0.3 ? '#4f9a45' : '#6cbf4f') : v > 0.07 ? '#e8d59a' : '#2f7fd6');
    for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
    if (!polo && v > 0.12) tierra.push(new THREE.Vector3(cx, cy, cz).normalize());
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals(); return { geo, tierra };
})();
function Estrellas() { return useMemo(() => { const r = azar(5); return Array.from({ length: 160 }, (_, i) => { const a = r() * 6.28, b = (r() - 0.5) * 3, d = 40 + r() * 20; return <mesh key={i} position={[Math.cos(a) * d, b * 12, Math.sin(a) * d - 20]}><sphereGeometry args={[0.06 + r() * 0.08, 6, 4]} /><meshBasicMaterial color="#ffffff" /></mesh>; }); }, []); }
function Tierra({ t, modo, p }) {
  const luces = PLANETA.tierra.filter((_, i) => i % 3 === 0), n = modo === 'luces' ? Math.floor(luces.length * ease(p)) : 0;
  const rayos = useMemo(() => { const r = azar(8); return Array.from({ length: 40 }, () => [PLANETA.tierra[Math.floor(r() * PLANETA.tierra.length)], r()]); }, []);
  return (<group rotation={[0.35, t * 0.25, 0]}>
    <mesh geometry={PLANETA.geo}><meshStandardMaterial vertexColors flatShading roughness={0.9} /></mesh>
    <mesh scale={1.06}><sphereGeometry args={[2, 48, 32]} /><meshBasicMaterial color="#6fc3ff" transparent opacity={0.12} side={THREE.BackSide} /></mesh>
    {luces.slice(0, n).map((v, i) => (<mesh key={i} position={v.clone().multiplyScalar(2.03)}><sphereGeometry args={[0.035, 6, 4]} /><meshBasicMaterial color="#ffe08a" toneMapped={false} /></mesh>))}
    {modo === 'rayos' && rayos.map(([v, f], i) => { const on = Math.sin(t * 9 + f * 40) > 0.85; return on ? <mesh key={i} position={v.clone().multiplyScalar(2.12)} scale={0.12}><octahedronGeometry args={[1, 0]} /><meshBasicMaterial color="#fff7a8" toneMapped={false} /></mesh> : null; })}
  </group>);
}
export function EscenaGlobo({ t, dur, e }) {
  const modo = e.modo || 'luces', p = clamp(t / (dur * 0.85));
  const sats = useMemo(() => { const r = azar(14); return Array.from({ length: 70 }, () => ({ inc: r() * 3.14, fase: r() * 6.28, rad: 2.5 + r() * 1.2, vel: 0.4 + r() * 0.6 })); }, []);
  if (modo === 'orbita') {
    const a = -1.2 + p * 2.6, R = 3.6;
    return (<>
      <Camara pos={[0, 13, 7]} mira={[0, 0, 0.6]} desenfoque={0} brillo={1.2} />
      <Cielo arriba="#020410" medio="#07112a" abajo="#0b1a3a" /><Estrellas />
      <ambientLight intensity={0.4} /><pointLight position={[0, 0, 0]} intensity={300} distance={60} />
      <mesh><sphereGeometry args={[1.1, 48, 32]} /><meshBasicMaterial color="#ffcf4a" toneMapped={false} /></mesh>
      <mesh rotation-x={-Math.PI / 2}><ringGeometry args={[R - 0.03, R + 0.03, 128]} /><meshBasicMaterial color="#7fa7ff" transparent opacity={0.5} /></mesh>
      <group position={[Math.cos(a) * R, 0, Math.sin(a) * R]} scale={0.3}><Tierra t={t} modo="nada" p={p} /></group>
    </>);
  }
  return (<>
    <Camara pos={lerp3([0, 0.6, 12.5], [0, 0.4, 9.5], easeInOut(t / dur))} mira={[0, 0, 0]} desenfoque={0} brillo={1.1} />
    <Cielo arriba="#020410" medio="#07112a" abajo="#0b1a3a" /><Estrellas />
    <ambientLight intensity={0.5} /><directionalLight position={[-6, 4, 6]} intensity={2.4} />
    <Tierra t={t} modo={modo} p={p} />
    {modo === 'satelites' && sats.slice(0, Math.floor(sats.length * ease(p))).map((s, i) => { const a = s.fase + t * s.vel; return (<group key={i} rotation-x={s.inc}><mesh position={[Math.cos(a) * s.rad, 0, Math.sin(a) * s.rad]} scale={0.06}><boxGeometry args={[1, 0.6, 2.4]} /><meshBasicMaterial color="#e5f0ff" toneMapped={false} /></mesh></group>); })}
    {modo === 'luna' && (<mesh position={[Math.cos(t * 0.3) * (4.5 + p * 1.5), 0.6, Math.sin(t * 0.3) * (4.5 + p * 1.5)]}><icosahedronGeometry args={[0.55, 3]} /><meshStandardMaterial color="#c9ccd2" flatShading /></mesh>)}
  </>);
}

// ---------- cuadrícula vista desde el aire: los objetos se multiplican desde el centro ----------
export function EscenaCuadricula({ t, dur, e, m }) {
  const objeto = e.objeto || 'piscina', lado = e.lado || 22, total = lado * lado, md = medidas(objeto, m), sep = Math.max(md.ancho, 1) * 1.5 * (e.tam || 1);
  const p = clamp(t / (dur * 0.8)), n = Math.floor(total * ease(p) ** 1.4), alto = lerp(9, lado * sep * 1.4, easeInOut(p));
  const orden = useMemo(() => Array.from({ length: total }, (_, i) => [(i % lado) - lado / 2 + 0.5, Math.floor(i / lado) - lado / 2 + 0.5]).sort((a, b) => Math.hypot(...a) - Math.hypot(...b)), [total, lado]);
  const mats = orden.slice(0, n).map(([x, z]) => matrizDe([x * sep, 0, z * sep], [0, 0, 0], e.tam || 1));
  return (<>
    <Camara pos={[alto * 0.15, alto, alto * 0.55]} mira={[0, 0, 0]} fov={50} desenfoque={0} />
    <Luces sol={[30, 80, 20]} niebla={[alto * 1.2, alto * 4]} /><Suelo radio={600} />
    <Muchos objeto={objeto} m={m} matrices={mats} sombras={false} />
  </>);
}

// ---------- comparación: columnas de objetos que crecen, con su etiqueta y su valor ----------
export function EscenaComparacion({ t, dur, e, m }) {
  const barras = e.barras || [], max = Math.max(...barras.map((b) => b.valor)), H = 7, n = barras.length, sep = 2.3;
  return (<>
    <Camara pos={lerp3([0, 5.5, 19], [0, 5, 16.5], easeInOut(t / dur))} mira={[0, 3.8, 0]} />
    <Luces /><Suelo /><Paisaje m={m} libre={6} lejos={20} semilla={61} />
    {barras.map((b, i) => {
      const x = (i - (n - 1) / 2) * sep, k = ease((t - i * 0.4) / (dur * 0.6)), alto = Math.max(0.15, (b.valor / max) * H * k), objeto = b.objeto, md = medidas(objeto || 'ladrillo', m);
      const mats = []; if (objeto) { const paso = md.alto * 0.9; for (let y = 0; y < alto; y += paso) mats.push(matrizDe([x, y, 0], [0, y * 0.9, 0], 0.9)); }
      const color = ['#4fb6ff', '#ffd23c', '#ff6b8a', '#34d399'][i % 4];
      return (<group key={i}>
        {objeto ? <Muchos objeto={objeto} m={m} matrices={mats} /> : <mesh position={[x, alto / 2, 0]} castShadow><boxGeometry args={[1.4, alto, 1.4]} /><meshStandardMaterial color={color} roughness={0.4} /></mesh>}
        <mesh position={[x, alto + 0.7, 0]}><planeGeometry args={[2, 0.7]} /><meshBasicMaterial map={texturaTexto(b.texto || String(b.valor), { fondo: '#111827', color: '#ffffff', w: 512, h: 180, size: 96 })} toneMapped={false} /></mesh>
        <mesh position={[x, 0.45, 1.05]} rotation-x={-0.3}><planeGeometry args={[2.1, 0.6]} /><meshBasicMaterial map={texturaTexto(b.etiqueta, { fondo: color, color: '#111827', w: 512, h: 150, size: 70 })} toneMapped={false} /></mesh>
      </group>);
    })}
  </>);
}

// ---------- línea de tiempo: un camino con carteles por año; la cámara lo recorre y al final se aleja ----------
export function EscenaLinea({ t, dur, e, m }) {
  const hitos = e.hitos || [], anios = hitos.map((h) => h.anio), min = Math.min(...anios), max = Math.max(...anios), L = 40;
  const x = (a) => ((a - min) / Math.max(1, max - min)) * L - L / 2, p = clamp(t / (dur * 0.85)), recorre = clamp(p / 0.7), aleja = easeInOut((p - 0.7) / 0.3);
  const cx = lerp(-L / 2, L / 2, easeInOut(recorre)), color = ['#ffd23c', '#4fb6ff', '#ff6b8a', '#34d399', '#a78bfa'];
  return (<>
    <Camara pos={lerp3([cx - 2, 3.5, 9], [0, 18, 34], aleja)} mira={lerp3([cx + 2, 1.5, 0], [0, 0, 0], aleja)} fov={lerp(48, 55, aleja)} desenfoque={lerp(0.5, 0, aleja)} />
    <Luces niebla={[30, 120]} /><Suelo radio={200} /><Paisaje m={m} libre={6} lejos={40} arboles={50} semilla={44} />
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}><planeGeometry args={[L + 6, 1.6]} /><meshStandardMaterial color="#e9dcc0" roughness={1} /></mesh>
    {Array.from({ length: 41 }, (_, i) => (<mesh key={i} position={[-L / 2 + i * (L / 40), 0.06, 0]}><boxGeometry args={[0.06, 0.08, 1.6]} /><meshStandardMaterial color="#c8b48c" /></mesh>))}
    {hitos.map((h, i) => { const hx = x(h.anio), c = color[i % color.length], ap = ease((cx + 4 - hx) / 4); return (<group key={i} position={[hx, 0, 0]} scale={Math.max(0.001, ap)}>
      <mesh position={[0, 1.2, -0.9]} castShadow><boxGeometry args={[0.12, 2.4, 0.12]} /><meshStandardMaterial color="#7a5a3a" /></mesh>
      <mesh position={[0, 2.6, -0.85]}><planeGeometry args={[3.2, 0.8]} /><meshBasicMaterial map={texturaTexto(h.etiqueta_anio || String(h.anio), { fondo: c, color: '#111827', w: 512, h: 128, size: 92 })} toneMapped={false} /></mesh>
      <mesh position={[0, 1.85, -0.84]}><planeGeometry args={[3.2, 0.6]} /><meshBasicMaterial map={texturaTexto(h.texto, { fondo: '#ffffff', color: '#111827', w: 640, h: 120, size: 62 })} toneMapped={false} /></mesh>
      {h.objeto && <Objeto objeto={h.objeto} m={m} position={[0, 0, 0.3]} scale={1.2} rotation-y={t * 0.5} />}
    </group>); })}
    <Personaje gltf={PJ(m, 'female-a')} accion="walk" t={t} position={[cx - 1, 0, 0.6]} rotation-y={Math.PI / 2} scale={1.4} />
  </>);
}

// ---------- calle: vehículos que pasan por una calle con casas ----------
export function EscenaCalle({ t, dur, e, m }) {
  const objeto = e.objeto || 'autos/sedan', n = e.cantidad || 12, casas = useMemo(() => { const r = azar(9); return Array.from({ length: 14 }, (_, i) => ({ n: CASAS[Math.floor(r() * CASAS.length)], z: -26 + i * 4, lado: i % 2 ? 1 : -1 })); }, []);
  const autos = useMemo(() => { const r = azar(19); return Array.from({ length: n }, (_, i) => ({ carril: i % 2 ? 1 : -1, ini: (i / n) * dur * 0.8, vel: 9 + r() * 4 })); }, [n, dur]);
  return (<>
    <Camara pos={lerp3([3.6, 6, 15], [2.6, 4.6, 12], easeInOut(t / dur))} mira={[0.4, 0.8, -4]} desenfoque={0} />
    <Luces niebla={[20, 70]} /><Suelo />
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, -5]} receiveShadow><planeGeometry args={[4.4, 70]} /><meshStandardMaterial color="#4a5260" roughness={0.9} /></mesh>
    {Array.from({ length: 16 }, (_, i) => (<mesh key={i} rotation-x={-Math.PI / 2} position={[0, 0.02, -36 + i * 4.5]}><planeGeometry args={[0.15, 2]} /><meshStandardMaterial color="#ffd23c" /></mesh>))}
    {casas.map((c, i) => (<Modelo key={i} escena={m?.[c.n]} position={[c.lado * 5.2, 0, c.z]} rotation-y={c.lado > 0 ? -Math.PI / 2 : Math.PI / 2} scale={2.6} />))}
    {autos.map((a, i) => { if (t < a.ini) return null; const z = a.carril > 0 ? -40 + (t - a.ini) * a.vel : 14 - (t - a.ini) * a.vel; return <Objeto key={i} objeto={objeto} m={m} position={[a.carril * 1.1, 0, z]} rotation-y={a.carril > 0 ? 0 : Math.PI} scale={1.6} />; })}
  </>);
}

// ---------- gente: una multitud que va apareciendo en una plaza ----------
export function EscenaGente({ t, dur, e, m }) {
  const n = Math.min(36, e.cantidad || 24), acciones = ['idle', 'emote-yes', 'interact-right', 'idle', 'walk'];
  const lugares = useMemo(() => { const r = azar(31); return Array.from({ length: n }, (_, i) => ({ x: ((i % 6) - 2.5) * 1.5 + (r() - 0.5) * 0.5, z: (Math.floor(i / 6) - 2.5) * 1.4 + (r() - 0.5) * 0.5, ry: (r() - 0.5) * 1.2, a: acciones[Math.floor(r() * acciones.length)], ini: r() * dur * 0.6 })); }, [n, dur]);
  return (<>
    <Camara pos={lerp3([0, 5, 12], [0, 8, 16], easeInOut(t / dur))} mira={[0, 0.8, 0]} />
    <Luces /><Suelo /><Paisaje m={m} libre={7} lejos={20} semilla={72} />
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} receiveShadow><circleGeometry args={[6.5, 48]} /><meshStandardMaterial color="#e8e2d4" roughness={0.9} /></mesh>
    {lugares.map((l, i) => { if (t < l.ini) return null; const k = rebote((t - l.ini) / 0.6); return <Personaje key={i} gltf={m?.[PERSONAJES[i % PERSONAJES.length]]} accion={l.a} t={t + i * 0.2} position={[l.x, lerp(3, 0, k), l.z]} rotation-y={l.ry} scale={1.4} />; })}
  </>);
}
