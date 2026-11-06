// Catálogo de objetos para cualquier escena: «botella», «moneda», «celular», «balon», «libro», «corazon», «ladrillo»
// (hechos con código) o cualquier modelo de Kenney por su ruta («comida/apple», «autos/taxi», «naturaleza/tree_oak»…).
// Todo se normaliza a 1 unidad de alto con la base en y = 0, y se puede dibujar instanciado (cientos de copias).
import { useMemo, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';

// ---------- objetos hechos con código ----------
const M = (o) => new THREE.MeshStandardMaterial(o);
const perfilBotella = [[0, 0], [0.4, 0], [0.45, 0.06], [0.46, 0.25], [0.43, 0.32], [0.46, 0.4], [0.46, 0.98], [0.4, 1.12], [0.2, 1.32], [0.15, 1.42], [0.15, 1.52], [0, 1.52]];
const lathe = (pts, n = 32) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), n);
function corazon() {
  const s = new THREE.Shape(); s.moveTo(0, 0.25); s.bezierCurveTo(0, 0.5, -0.5, 0.55, -0.5, 0.2); s.bezierCurveTo(-0.5, -0.1, -0.15, -0.3, 0, -0.5); s.bezierCurveTo(0.15, -0.3, 0.5, -0.1, 0.5, 0.2); s.bezierCurveTo(0.5, 0.55, 0, 0.5, 0, 0.25);
  return new THREE.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 4, curveSegments: 24 }).translate(0, 0.55, -0.12);
}
function balon() {
  const g = new THREE.IcosahedronGeometry(0.5, 1).toNonIndexed(), col = [];
  for (let i = 0; i < g.attributes.position.count; i += 3) { const c = new THREE.Color((i / 3) % 4 === 0 ? '#1d1f24' : '#f4f4f4'); for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g.translate(0, 0.5, 0);
}
const PROC = {
  botella: () => [
    [lathe([[0, 0.03], [0.42, 0.03], [0.43, 0.25], [0.4, 0.32], [0.43, 0.4], [0.43, 0.9], [0, 0.9]]), M({ color: '#2f9bf0', transparent: true, opacity: 0.88, roughness: 0.15 })],
    [new THREE.CylinderGeometry(0.465, 0.465, 0.32, 32, 1, true).translate(0, 0.65, 0), M({ color: '#ffffff', roughness: 0.6, side: THREE.DoubleSide })],
    [new THREE.CylinderGeometry(0.17, 0.17, 0.14, 24).translate(0, 1.58, 0), M({ color: '#1b5fd1', roughness: 0.4 })],
    [lathe(perfilBotella), new THREE.MeshPhysicalMaterial({ color: '#e8f7ff', transparent: true, opacity: 0.38, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false })]
  ],
  moneda: () => [
    [new THREE.CylinderGeometry(0.5, 0.5, 0.12, 40).translate(0, 0.06, 0), M({ color: '#f2c14e', metalness: 0.9, roughness: 0.25 })],
    [new THREE.TorusGeometry(0.47, 0.03, 8, 40).rotateX(Math.PI / 2).translate(0, 0.12, 0), M({ color: '#d9a52c', metalness: 0.9, roughness: 0.3 })]
  ],
  celular: () => [
    [new THREE.BoxGeometry(0.5, 1, 0.07).translate(0, 0.5, 0), M({ color: '#1f2430', roughness: 0.4, metalness: 0.4 })],
    [new THREE.PlaneGeometry(0.44, 0.9).translate(0, 0.5, 0.036), M({ color: '#4fb6ff', emissive: '#2a7fd6', emissiveIntensity: 0.8, roughness: 0.2 })]
  ],
  balon: () => [[balon(), M({ vertexColors: true, flatShading: true, roughness: 0.6 })]],
  libro: () => [
    [new THREE.BoxGeometry(0.75, 0.22, 1).translate(0, 0.11, 0), M({ color: '#f3ecd9', roughness: 0.9 })],
    [new THREE.BoxGeometry(0.8, 0.05, 1.04).translate(0, 0.245, 0), M({ color: '#c0392b', roughness: 0.6 })],
    [new THREE.BoxGeometry(0.8, 0.05, 1.04).translate(0, 0.0, 0), M({ color: '#c0392b', roughness: 0.6 })]
  ],
  corazon: () => [[corazon(), M({ color: '#e5384f', roughness: 0.35, emissive: '#5a0010', emissiveIntensity: 0.3 })]],
  ladrillo: () => [[new THREE.BoxGeometry(1, 0.5, 0.48).translate(0, 0.25, 0), M({ color: '#b8553a', roughness: 0.95 })]],
  banera: () => [
    [new THREE.BoxGeometry(2.2, 0.9, 1.1).translate(0, 0.45, 0), M({ color: '#ffffff', roughness: 0.25 })],
    [new THREE.BoxGeometry(1.96, 0.04, 0.86).translate(0, 0.86, 0), M({ color: '#2fa2f2', roughness: 0.05, emissive: '#1166aa', emissiveIntensity: 0.25 })],
    ...[[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]].map(([x, z]) => [new THREE.SphereGeometry(0.09, 12, 8).translate(x, 0.04, z), M({ color: '#c9a227', metalness: 0.8, roughness: 0.3 })])
  ],
  piscina: () => [
    [new THREE.BoxGeometry(2, 0.12, 1).translate(0, 0.06, 0), M({ color: '#2fa8f5', roughness: 0.1, emissive: '#0b4f86', emissiveIntensity: 0.2 })],
    [new THREE.BoxGeometry(2.2, 0.08, 1.2).translate(0, 0.02, 0), M({ color: '#eef2f5', roughness: 0.8 })]
  ]
};
export const OBJETOS_CODIGO = Object.keys(PROC);

// Las piezas (geometría + material + posición dentro del objeto) normalizadas a 1 de alto
const cachePiezas = new Map();
function piezasDe(objeto, m) {
  if (cachePiezas.has(objeto)) return cachePiezas.get(objeto);
  let piezas = null;
  if (PROC[objeto]) piezas = PROC[objeto]().map(([geo, mat]) => ({ geo, mat, local: new THREE.Matrix4() }));
  else if (m?.[objeto]) {
    const raiz = m[objeto].scene; raiz.updateMatrixWorld(true); piezas = [];
    raiz.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh) piezas.push({ geo: o.geometry, mat: o.material, local: o.matrixWorld.clone() }); });
  }
  if (!piezas?.length) return null;
  // Caja de todo el objeto → escala para que mida 1 de alto (o de ancho si es muy plano) y base en el suelo
  const caja = new THREE.Box3();
  for (const p of piezas) { p.geo.computeBoundingBox(); caja.union(p.geo.boundingBox.clone().applyMatrix4(p.local)); }
  const t = caja.getSize(new THREE.Vector3()), c = caja.getCenter(new THREE.Vector3()), s = 1 / Math.max(t.y, Math.max(t.x, t.z) * 0.6);
  const norm = new THREE.Matrix4().makeScale(s, s, s).multiply(new THREE.Matrix4().makeTranslation(-c.x, -caja.min.y, -c.z));
  const r = { piezas: piezas.map((p) => ({ ...p, local: norm.clone().multiply(p.local) })), alto: t.y * s, ancho: Math.max(t.x, t.z) * s };
  cachePiezas.set(objeto, r); return r;
}
export function usePiezas(objeto, m) { return useMemo(() => piezasDe(objeto, m), [objeto, m]); }
export const medidas = (objeto, m) => piezasDe(objeto, m) || { alto: 1, ancho: 1 };

// Un objeto suelto
export function Objeto({ objeto, m, ...props }) {
  const p = usePiezas(objeto, m);
  if (!p) return null;
  return (<group {...props}>{p.piezas.map((x, i) => (<mesh key={i} geometry={x.geo} material={x.mat} matrixAutoUpdate={false} matrix={x.local} castShadow receiveShadow />))}</group>);
}
// Muchas copias: matrices = [Matrix4] (posición, giro y escala de cada copia)
export function Muchos({ objeto, m, matrices, sombras = true }) {
  const p = usePiezas(objeto, m), refs = useRef([]), tmp = useMemo(() => new THREE.Matrix4(), []);
  const max = Math.max(1, matrices.length);
  useLayoutEffect(() => {
    if (!p) return;
    p.piezas.forEach((x, k) => { const im = refs.current[k]; if (!im) return;
      matrices.forEach((mm, i) => im.setMatrixAt(i, tmp.multiplyMatrices(mm, x.local)));
      im.count = matrices.length; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); });
  });
  if (!p) return null;
  return (<>{p.piezas.map((x, k) => (<instancedMesh key={`${k}-${max > 400 ? 'g' : 'p'}`} ref={(r) => { refs.current[k] = r; }} args={[x.geo, x.mat, Math.max(400, max)]} castShadow={sombras} receiveShadow />))}</>);
}
export const matrizDe = (pos, rot = [0, 0, 0], s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(s, s, s));

// Textura con texto (carteles, etiquetas, números)
const texturas = new Map();
export function texturaTexto(texto, { fondo = '#ffffff', color = '#1f2937', w = 512, h = 256, size = 120, fuente = 'Archivo Black', borde = null } = {}) {
  const k = [texto, fondo, color, w, h, size, borde].join('|'); if (texturas.has(k)) return texturas.get(k);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = fondo; g.fillRect(0, 0, w, h);
  if (borde) { g.strokeStyle = borde; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14); }
  let sz = size; g.font = `${sz}px "${fuente}"`; while (g.measureText(texto).width > w * 0.9 && sz > 20) { sz -= 4; g.font = `${sz}px "${fuente}"`; }
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texto, w / 2, h / 2 + sz * 0.05);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texturas.set(k, t); return t;
}
// Qué modelos de Kenney piden los guiones (para cargarlos al empezar)
export const esModelo = (o) => typeof o === 'string' && o.includes('/');
