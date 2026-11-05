// Modelos 3D gratuitos (Kenney, CC0: public/modelos/*/LICENSE-*.txt) en formato GLB. Se cargan una vez por pestaña
// del render; Remotion espera (delayRender) a que estén listos antes de dibujar el cuadro.
import { useMemo, useState, useEffect } from 'react';
import { staticFile, delayRender, continueRender } from 'remotion';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as clonarConEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';

const cargador = new GLTFLoader(), cache = new Map();
function cargar(ruta) {
  if (!cache.has(ruta)) cache.set(ruta, new Promise((ok, mal) => cargador.load(staticFile(`modelos/${ruta}.glb`), (g) => ok(g), undefined, mal)));
  return cache.get(ruta);
}
// Varios modelos a la vez: { nombre: gltf } (null mientras cargan); gltf.scene es el modelo y gltf.animations sus animaciones
export function useModelos(rutas) {
  const clave = rutas.join('|');
  const [listos, setListos] = useState(null);
  // Se pide la espera al montar y se libera DESPUÉS de que React ya dibujó con los modelos (dos cuadros del navegador
  // más tarde): si se libera al cargar, Remotion puede capturar el cuadro antes de que aparezcan
  const [espera] = useState(() => delayRender(`modelos ${clave}`));
  useEffect(() => {
    Promise.all(rutas.map(cargar)).then((escenas) => {
      escenas.forEach((g) => g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }));
      setListos(Object.fromEntries(rutas.map((r, i) => [r, escenas[i]])));
    }).catch((e) => { console.error('No se pudieron cargar los modelos', e); setListos({}); });
  }, [clave]);
  useEffect(() => { if (listos) requestAnimationFrame(() => requestAnimationFrame(() => continueRender(espera))); }, [listos, espera]);
  return listos;
}
// Una copia del modelo (acepta el gltf o su escena), con su posición, giro y escala
export function Modelo({ escena, ...props }) {
  const base = escena?.scene || escena;
  const copia = useMemo(() => (base ? base.clone(true) : null), [base]);
  return copia ? <primitive object={copia} {...props} /> : null;
}

function azar(semilla) { let s = semilla; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const ARBOLES = ['naturaleza/tree_default', 'naturaleza/tree_oak', 'naturaleza/tree_detailed', 'naturaleza/tree_pineRoundA', 'naturaleza/tree_pineTallA', 'naturaleza/tree_fat', 'naturaleza/tree_cone'];
const PEQUENOS = ['naturaleza/flower_redA', 'naturaleza/flower_yellowA', 'naturaleza/flower_purpleA', 'naturaleza/grass_large', 'naturaleza/plant_bush', 'naturaleza/rock_smallA', 'naturaleza/mushroom_red', 'naturaleza/plant_bushSmall'];
export const NATURALEZA = [...ARBOLES, ...PEQUENOS, 'naturaleza/fence_simple', 'naturaleza/rock_largeA', 'naturaleza/stump_round', 'naturaleza/log'];

// Paisaje alrededor de la acción: árboles en un anillo lejano y flores, pasto y piedras más cerca (sin tapar el centro)
export function Paisaje({ m, libre = 3, lejos = 18, arboles = 26, detalles = 40, escala = 1, semilla = 5 }) {
  const lista = useMemo(() => {
    if (!m) return [];
    const r = azar(semilla), out = [];
    for (let i = 0; i < arboles; i++) {
      const a = (i / arboles) * Math.PI * 2 + r() * 0.3, d = lejos * (0.75 + r() * 0.6);
      out.push({ k: `a${i}`, n: ARBOLES[Math.floor(r() * ARBOLES.length)], p: [Math.cos(a) * d, 0, Math.sin(a) * d], s: (2.2 + r() * 1.6) * escala, ry: r() * 6.3 });
    }
    for (let i = 0; i < detalles; i++) {
      const a = r() * Math.PI * 2, d = libre + r() * (lejos * 0.7 - libre);
      out.push({ k: `d${i}`, n: PEQUENOS[Math.floor(r() * PEQUENOS.length)], p: [Math.cos(a) * d, 0, Math.sin(a) * d], s: (1.4 + r() * 1.2) * escala, ry: r() * 6.3 });
    }
    return out;
  }, [m, libre, lejos, arboles, detalles, escala, semilla]);
  return <>{lista.map((x) => <Modelo key={x.k} escena={m[x.n]} position={x.p} scale={x.s} rotation-y={x.ry} />)}</>;
}

// Personaje animado (Kenney Mini Characters: idle, walk, sprint, jump, sit, pick-up, emote-yes, emote-no,
// holding-right, interact-right…). La animación se fija al tiempo t de la escena: cada cuadro sale igual siempre
export const PERSONAJES = ['character-female-a', 'character-female-b', 'character-female-c', 'character-female-d', 'character-female-e', 'character-female-f', 'character-male-a', 'character-male-b', 'character-male-c', 'character-male-d', 'character-male-e', 'character-male-f'].map((n) => `personajes/${n}`);
export function Personaje({ gltf, accion = 'idle', t = 0, velocidad = 1, ...props }) {
  const inst = useMemo(() => {
    if (!gltf) return null;
    const obj = clonarConEsqueleto(gltf.scene), mixer = new THREE.AnimationMixer(obj);
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    return { obj, mixer, clips: Object.fromEntries(gltf.animations.map((c) => [c.name, c])) };
  }, [gltf]);
  if (!inst) return null;
  const clip = inst.clips[accion] || inst.clips.idle;
  inst.mixer.stopAllAction(); const a = inst.mixer.clipAction(clip); a.reset().play(); inst.mixer.setTime(t * velocidad);
  return <primitive object={inst.obj} {...props} />;
}
