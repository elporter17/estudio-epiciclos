// Todos los tipos de escena 3D (el «tipo» de cada escena del guion)
import { ESCENAS as BASE } from './escenas3d.jsx';
import { EscenaCalendario, EscenaFoco, EscenaCamion, EscenaGlobo, EscenaPiscinas, MODELOS_CIUDAD } from './escenas2.jsx';

export const ESCENAS = { ...BASE, calendario: EscenaCalendario, foco: EscenaFoco, camion: EscenaCamion, globo: EscenaGlobo, piscinas: EscenaPiscinas };
export { MODELOS_CIUDAD };
