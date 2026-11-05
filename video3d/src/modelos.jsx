// Modelos 3D gratuitos (Kenney, CC0: public/modelos/*/LICENSE-*.txt) en formato GLB. Se cargan una vez por pestaña
// del render; Remotion espera (delayRender) a que estén listos antes de dibujar el cuadro.
import { useMemo, useState, useEffect } from 'react';
import { staticFile, delayRender, continueRender } from 'remotion';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const cargador = new GLTFLoader(), cache = new Map();
function cargar(ruta) {
  if (!cache.has(ruta)) cache.set(ruta, new Promise((ok, mal) => cargador.load(staticFile(`modelos/${ruta}.glb`), (g) => ok(g.scene), undefined, mal)));
  return cache.get(ruta);
}
// Varios modelos a la vez: { nombre: escena } (null mientras cargan)
export function useModelos(rutas) {
  const clave = rutas.join('|');
  const [listos, setListos] = useState(null);
  useEffect(() => {
    const h = delayRender(`modelos ${clave}`);
    Promise.all(rutas.map(cargar)).then((escenas) => {
      escenas.forEach((s) => s.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }));
      setListos(Object.fromEntries(rutas.map((r, i) => [r, escenas[i]]))); continueRender(h);
    }).catch((e) => { console.error(e); continueRender(h); });
  }, [clave]);
  return listos;
}
// Una copia del modelo, con su posición, giro y escala
export function Modelo({ escena, ...props }) {
  const copia = useMemo(() => (escena ? escena.clone(true) : null), [escena]);
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
