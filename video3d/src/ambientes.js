// Ambientes de los videos 3D: cada video recibe uno distinto (scripts/lib/estilo3d.mjs lo elige sin repetir los últimos),
// y con él cambian el cielo, el color del suelo, la luz (hora del día), la niebla y qué árboles y piedras salen en el
// paisaje. Las escenas no lo piden: Luces, Suelo, Cielo y Paisaje lo leen del contexto (AmbienteCtx).
import { createContext } from 'react';

const N = 'naturaleza/';
const l = (...xs) => xs.map((x) => N + x);
export const AMBIENTES = {
  pradera: { cielo: ['#5cc3ff', '#a9e1ff', '#e9f7ff'], suelo: '#9edb7c', niebla: '#cdeeff', hemi: ['#ffffff', '#9fc9e8', 1.1], sol: [6, 10, 5], solColor: '#ffffff', intensidad: 2.2,
    arboles: l('tree_default', 'tree_oak', 'tree_detailed', 'tree_pineRoundA', 'tree_pineTallA', 'tree_fat', 'tree_cone'),
    pequenos: l('flower_redA', 'flower_yellowA', 'flower_purpleA', 'grass_large', 'plant_bush', 'rock_smallA', 'mushroom_red', 'plant_bushSmall') },
  desierto: { cielo: ['#2b8fd8', '#f6c98a', '#fbe7c4'], suelo: '#e2b872', niebla: '#f6dcae', hemi: ['#fff1d6', '#c99a5b', 1.0], sol: [8, 11, 3], solColor: '#fff4dc', intensidad: 2.5,
    arboles: l('cactus_tall', 'cactus_short', 'rock_largeA', 'rock_largeB', 'cactus_tall', 'rock_tallA'),
    pequenos: l('cactus_short', 'rock_smallA', 'plant_bushSmall', 'rock_smallB', 'stump_old') },
  nevado: { cielo: ['#7fa6d6', '#c9def3', '#f2f8ff'], suelo: '#f4f8fc', niebla: '#e6f0fa', hemi: ['#ffffff', '#bcd0e8', 1.25], sol: [-5, 9, 6], solColor: '#f2f6ff', intensidad: 1.9,
    arboles: l('tree_pineTallA', 'tree_pineTallB', 'tree_pineTallC', 'tree_pineTallD', 'tree_pineRoundA', 'tree_pineRoundB'),
    pequenos: l('rock_smallA', 'rock_smallC', 'plant_bushSmall', 'stump_round', 'log') },
  playa: { cielo: ['#1aa3e8', '#7fdcf5', '#eefcff'], suelo: '#f1d9a0', niebla: '#d6f3fb', hemi: ['#ffffff', '#7ed3ea', 1.15], sol: [4, 12, 8], solColor: '#fffbea', intensidad: 2.4,
    arboles: l('tree_palmTall', 'tree_palm', 'tree_palmBend', 'tree_palmDetailedShort', 'tree_palmShort'),
    pequenos: l('rock_smallA', 'plant_bushSmall', 'flower_yellowA', 'rock_smallB', 'grass_large') },
  otono: { cielo: ['#e08a3c', '#f5c27a', '#fdebcf'], suelo: '#c9a45a', niebla: '#f8dcb4', hemi: ['#fff0dc', '#b88a50', 1.05], sol: [-4, 8, 7], solColor: '#ffe2b8', intensidad: 2.3,
    arboles: l('tree_default_fall', 'tree_oak_fall', 'tree_detailed_fall', 'tree_fat_fall', 'tree_tall_fall', 'tree_cone_fall'),
    pequenos: l('mushroom_red', 'rock_smallA', 'grass_large', 'log', 'stump_round', 'mushroom_tan') },
  atardecer: { cielo: ['#3a2a6b', '#ff8a5c', '#ffd9a8'], suelo: '#8fb36a', niebla: '#ffc79a', hemi: ['#ffd6b0', '#7a6a9a', 0.95], sol: [-10, 4, 7], solColor: '#ff9a55', intensidad: 2.7,
    arboles: l('tree_default', 'tree_oak', 'tree_detailed', 'tree_pineRoundA', 'tree_tall'),
    pequenos: l('flower_redA', 'flower_purpleA', 'grass_large', 'plant_bush', 'rock_smallA') },
  noche: { cielo: ['#050a1c', '#0f1e44', '#27406e'], suelo: '#2c4a3e', niebla: '#1b2c4e', hemi: ['#6f8fd6', '#1d2b44', 0.8], sol: [-6, 10, 4], solColor: '#9fb8ff', intensidad: 1.3,
    arboles: l('tree_default_dark', 'tree_oak_dark', 'tree_detailed_dark', 'tree_fat_darkh', 'tree_tall_dark', 'tree_pineTallA'),
    pequenos: l('mushroom_red', 'rock_smallA', 'grass_large', 'plant_bush', 'campfire_logs') },
  bosque: { cielo: ['#3d7a64', '#8fcfae', '#e1f5e6'], suelo: '#5f9b52', niebla: '#cfe8d8', hemi: ['#e6ffe9', '#6fa77a', 1.05], sol: [3, 11, -4], solColor: '#f6ffe0', intensidad: 2.0,
    arboles: l('tree_default_dark', 'tree_oak_dark', 'tree_pineTallB', 'tree_pineRoundC', 'tree_detailed_dark', 'tree_tall_dark'),
    pequenos: l('mushroom_red', 'mushroom_tan', 'plant_bush', 'grass_large', 'flower_purpleA', 'log', 'stump_old') }
};
export const NOMBRES_AMBIENTE = Object.keys(AMBIENTES);
export const TODO_AMBIENTE = [...new Set(Object.values(AMBIENTES).flatMap((a) => [...a.arboles, ...a.pequenos]))];
export const AmbienteCtx = createContext(AMBIENTES.pradera);
