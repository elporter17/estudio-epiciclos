// Posprocesado de cámara: desenfoque de profundidad (enfoca lo que mira la cámara y difumina el fondo, como un lente
// real), un brillo suave en lo más luminoso y viñeta en los bordes. Se dibuja una sola vez por escena.
import { useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer, DepthOfField, Bloom, Vignette, SMAA } from '@react-three/postprocessing';

// Cielo: un degradado vertical como fondo de la escena (el posprocesado no deja ver lo que hay detrás del lienzo)
export function Cielo({ arriba = '#5cc3ff', medio = '#a9e1ff', abajo = '#e9f7ff' }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d');
    const l = g.createLinearGradient(0, 0, 0, 512); l.addColorStop(0, arriba); l.addColorStop(0.45, medio); l.addColorStop(1, abajo);
    g.fillStyle = l; g.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [arriba, medio, abajo]);
  return <primitive attach="background" object={tex} />;
}

export function Efectos({ objetivo = [0, 1, 0], desenfoque = 1, brillo = 0.35 }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <SMAA />
      {desenfoque > 0 && <DepthOfField target={objetivo} focalLength={0.02 * desenfoque} bokehScale={2.2 * desenfoque} />}
      <Bloom intensity={brillo} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette offset={0.32} darkness={0.42} />
    </EffectComposer>
  );
}
