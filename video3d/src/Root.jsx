// Composiciones de los videos 3D. «Dato» lee public/render.json (lo escribe scripts/video3d-preparar.mjs):
// escenas con su inicio, duración, texto y audio del narrador.
import { Composition, staticFile, continueRender, delayRender } from 'remotion';
import { Dato } from './Dato.jsx';
import { Idea } from './Idea.jsx';

export const FPS = 30;

// Fuentes de la marca (locales: el render no depende de internet)
const espera = delayRender('fuentes');
Promise.all([
  new FontFace('Archivo Black', `url(${staticFile('fuentes/archivo-black.woff2')})`).load(),
  new FontFace('Plex', `url(${staticFile('fuentes/plex-700.woff2')})`, { weight: '700' }).load(),
  new FontFace('Plex', `url(${staticFile('fuentes/plex-600.woff2')})`, { weight: '600' }).load()
]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(espera); }).catch(() => continueRender(espera));

const leerRender = async () => {
  const render = await fetch(staticFile('render.json')).then((r) => r.json());
  return { durationInFrames: Math.ceil(render.duracion * FPS), props: { render } };
};
// «Dato»: el 3D de datos de la cola. «Idea»: el formato de los videos que se arman desde una idea (escenas propias y
// filtro de visión; mismo render.json)
export const Root = () => (<>
  <Composition id="Dato" component={Dato} width={1080} height={1920} fps={FPS} durationInFrames={300} defaultProps={{ render: null }} calculateMetadata={leerRender} />
  <Composition id="Idea" component={Idea} width={1080} height={1920} fps={FPS} durationInFrames={300} defaultProps={{ render: null }} calculateMetadata={leerRender} />
</>);
