// Todos los tipos de escena 3D (el «tipo» de cada escena del guion)
import { ESCENAS as AGUA } from './escenas3d.jsx';
import { EscenaCalendario, EscenaCamion, MODELOS_CIUDAD } from './escenas2.jsx';
import { EscenaPortada, EscenaCierre, EscenaPila, EscenaLluvia, EscenaTorre, EscenaFoco, EscenaGlobo, EscenaCuadricula, EscenaComparacion, EscenaLinea, EscenaCalle, EscenaGente, TEMAS } from './genericas.jsx';

export const ESCENAS = {
  // De agua (vaso, botellas, piscina) y las genéricas, que sirven para cualquier tema
  vaso: AGUA.vaso, botellas: AGUA.botellas, piscina: AGUA.piscina, calendario: EscenaCalendario, camion: EscenaCamion,
  portada: EscenaPortada, cierre: EscenaCierre, pila: EscenaPila, lluvia: EscenaLluvia, torre: EscenaTorre, foco: EscenaFoco,
  globo: EscenaGlobo, cuadricula: EscenaCuadricula, piscinas: EscenaCuadricula, comparacion: EscenaComparacion, linea: EscenaLinea,
  calle: EscenaCalle, gente: EscenaGente
};
export { MODELOS_CIUDAD, TEMAS };
// Los modelos de Kenney que pide un guion (objetos de las escenas, barras y carteles)
export function modelosDelGuion(render) {
  const s = new Set();
  for (const e of render?.escenas || []) for (const o of [e.objeto, ...(e.barras || []).map((b) => b.objeto), ...(e.hitos || []).map((h) => h.objeto)]) if (typeof o === 'string' && o.includes('/')) s.add(o);
  return [...s];
}
