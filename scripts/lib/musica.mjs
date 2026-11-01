// Música propia para los Reels (sin copyright de terceros: todo se sintetiza aquí, no se copia ninguna canción).
// Cinco estilos con batería, bajo, acordes y una melodía corta que se repite:
//   pop (118 bpm), dembow (96), lofi (84), electro (124) y synthwave (100, ambiente Miami de noche para GTA VI).
// Las progresiones de acordes y los ritmos (dembow, cuatro por cuatro…) son patrones comunes, no obras protegidas.
export const ESTILOS = ['pop', 'dembow', 'lofi', 'electro', 'synthwave'];

const CONF = {
  pop: { bpm: 118, prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']], raiz: [60, 62, 64, 65, 67] },
  dembow: { bpm: 96, prog: [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M']], raiz: [57, 59, 60, 62] },
  lofi: { bpm: 84, prog: [[2, 'm7'], [7, '7'], [0, 'M7'], [9, 'm7']], raiz: [60, 62, 63, 65] },
  electro: { bpm: 124, prog: [[0, 'm'], [10, 'M'], [8, 'M'], [10, 'M']], raiz: [57, 59, 60, 62] },
  synthwave: { bpm: 100, prog: [[0, 'm'], [8, 'M'], [5, 'm'], [7, 'M']], raiz: [57, 60, 62, 64] }
};
const ACORDE = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], 7: [0, 4, 7, 10] };
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
function rng(semilla) { let a = semilla >>> 0 || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- instrumentos ----------
function crear(buf, SR) {
  const i0 = (t) => Math.floor(t * SR);
  const ruido = () => Math.random() * 2 - 1;
  return {
    bombo(t, v = 1) {
      const n = Math.floor(0.4 * SR), s = i0(t); let fase = 0;
      for (let i = 0; i < n && s + i < buf.length; i++) { const x = i / SR, f = 45 + 110 * Math.exp(-x / 0.035); fase += 2 * Math.PI * f / SR; buf[s + i] += v * 0.9 * Math.sin(fase) * Math.exp(-x / 0.17) + (i < 60 ? v * 0.25 * ruido() * (1 - i / 60) : 0); }
    },
    caja(t, v = 1) {
      const n = Math.floor(0.25 * SR), s = i0(t); let lp = 0, fase = 0;
      for (let i = 0; i < n && s + i < buf.length; i++) { const x = i / SR, r = ruido(); lp += 0.3 * (r - lp); fase += 2 * Math.PI * 185 / SR; buf[s + i] += v * (0.45 * (r - lp) * Math.exp(-x / 0.07) + 0.35 * Math.sin(fase) * Math.exp(-x / 0.04)); }
    },
    palma(t, v = 1) {
      for (const d of [0, 0.011, 0.022]) { const s = i0(t + d), n = Math.floor(0.12 * SR); let lp = 0; for (let i = 0; i < n && s + i < buf.length; i++) { const x = i / SR, r = ruido(); lp += 0.5 * (r - lp); buf[s + i] += v * 0.3 * (r - lp) * Math.exp(-x / (d === 0.022 ? 0.06 : 0.008)); } }
    },
    platillo(t, v = 1, abierto = false) {
      const n = Math.floor((abierto ? 0.3 : 0.06) * SR), s = i0(t); let lp = 0;
      for (let i = 0; i < n && s + i < buf.length; i++) { const x = i / SR, r = ruido(); lp += 0.6 * (r - lp); buf[s + i] += v * 0.16 * (r - lp) * Math.exp(-x / (abierto ? 0.09 : 0.018)); }
    },
    // Bajo: diente de sierra suave (pocos armónicos); «sub» es casi una senoidal tipo 808
    bajo(t, m, d, v = 1, sub = false) {
      const n = Math.floor(d * SR), s = i0(t), f = hz(m); let fase = 0;
      for (let i = 0; i < n && s + i < buf.length; i++) {
        const x = i / SR, env = Math.min(1, x / 0.005) * Math.min(1, (d - x) / 0.03) * (sub ? Math.exp(-x / 0.6) : 1);
        fase += 2 * Math.PI * f / SR;
        const w = sub ? Math.sin(fase) + 0.15 * Math.sin(2 * fase) : Math.sin(fase) + 0.4 * Math.sin(2 * fase) + 0.18 * Math.sin(3 * fase);
        buf[s + i] += v * 0.33 * env * w;
      }
    },
    // Acordes de fondo: triángulos un poco desafinados, ataque lento
    colchon(t, notas, d, v = 1, bombeo = null) {
      const n = Math.floor(d * SR), s = i0(t), fs = notas.flatMap((m) => [hz(m) * 0.997, hz(m) * 1.003]), fases = fs.map(() => Math.random() * 6);
      for (let i = 0; i < n && s + i < buf.length; i++) {
        const x = i / SR, env = Math.min(1, x / 0.25) * Math.min(1, (d - x) / 0.2), b = bombeo ? bombeo(t + x) : 1;
        let w = 0; for (let k = 0; k < fs.length; k++) { fases[k] += 2 * Math.PI * fs[k] / SR; w += (2 / Math.PI) * Math.asin(Math.sin(fases[k])); }
        buf[s + i] += v * 0.05 * env * b * w;
      }
    },
    // Piano eléctrico (lo-fi): senoidal con un poco de segundo armónico y trémolo
    rhodes(t, notas, d, v = 1) {
      const n = Math.floor(d * SR), s = i0(t);
      for (let i = 0; i < n && s + i < buf.length; i++) {
        const x = i / SR, env = Math.min(1, x / 0.01) * Math.exp(-x / 1.4) * Math.min(1, (d - x) / 0.1), trem = 1 + 0.15 * Math.sin(2 * Math.PI * 4.5 * x);
        let w = 0; for (const m of notas) { const f = hz(m); w += Math.sin(2 * Math.PI * f * x) + 0.2 * Math.sin(4 * Math.PI * f * x); }
        buf[s + i] += v * 0.07 * env * trem * w;
      }
    },
    // Melodía: cuadrada suavizada (armónicos impares) con caída rápida, tipo «pluck»
    pluck(t, m, d, v = 1) {
      const n = Math.floor(d * SR), s = i0(t), f = hz(m); let fase = 0;
      for (let i = 0; i < n && s + i < buf.length; i++) {
        const x = i / SR, env = Math.min(1, x / 0.004) * Math.exp(-x / 0.18) * Math.min(1, (d - x) / 0.02);
        fase += 2 * Math.PI * f / SR;
        buf[s + i] += v * 0.16 * env * (Math.sin(fase) + Math.sin(3 * fase) / 3 + Math.sin(5 * fase) / 5);
      }
    },
    disco(t, d) { // crujido de vinilo (lo-fi)
      const n = Math.floor(d * SR), s = i0(t);
      for (let i = 0; i < n && s + i < buf.length; i++) if (Math.random() < 0.0004) buf[s + i] += (Math.random() - 0.5) * 0.25;
    }
  };
}

// Agrega la pista a «buf» (mono, frecuencia SR) desde 0 hasta «dur» segundos
export function pistaMusical(buf, dur, { estilo = 'pop', semilla = Date.now(), SR = 44100, volumen = 1 } = {}) {
  const c = CONF[estilo] || CONF.pop, r = rng(semilla), I = crear(buf, SR);
  const paso = 60 / c.bpm / 4, compas = paso * 16, raiz = c.raiz[Math.floor(r() * c.raiz.length)];
  const compases = Math.ceil(dur / compas);
  // Motivo de 2 compases (16 corcheas), hecho con notas del acorde: se repite y engancha
  const motivo = Array.from({ length: 16 }, (_, k) => (r() < (k % 2 ? 0.35 : 0.75) ? Math.floor(r() * 4) : null));
  const bombos = [];
  for (let b = 0; b < compases; b++) {
    const t0 = b * compas, [grado, tipo] = c.prog[b % c.prog.length], notas = ACORDE[tipo].map((x) => raiz + grado + x - 12);
    const v = volumen * (b === 0 ? 0.75 : 1), fin = t0 > dur - compas;
    const golpe = (st, fn) => { const t = t0 + st * paso; if (t < dur - 0.05) fn(t); };
    if (estilo === 'pop') {
      for (const st of [0, 8, b % 2 ? 10 : 11]) golpe(st, (t) => { I.bombo(t, v); bombos.push(t); });
      for (const st of [4, 12]) golpe(st, (t) => I.palma(t, v));
      for (let st = 0; st < 16; st += 2) golpe(st, (t) => I.platillo(t, v * (st % 4 ? 0.7 : 1)));
      for (const st of [0, 3, 6, 8, 11, 14]) golpe(st, (t) => I.bajo(t, notas[0] - 12, paso * 2.5, v));
      I.colchon(t0, notas.map((m) => m + 12), compas, v * 0.8);
    } else if (estilo === 'dembow') {
      for (const st of [0, 4, 8, 12]) golpe(st, (t) => { I.bombo(t, v); bombos.push(t); });
      for (const st of [3, 6, 11, 14]) golpe(st, (t) => I.caja(t, v * 0.9));
      for (let st = 0; st < 16; st += 2) golpe(st, (t) => I.platillo(t, v * 0.8));
      golpe(0, (t) => I.bajo(t, notas[0] - 12, compas * 0.48, v, true)); golpe(8, (t) => I.bajo(t, notas[0] - 12, compas * 0.48, v, true));
      I.colchon(t0, notas.map((m) => m + 12), compas, v * 0.6);
    } else if (estilo === 'lofi') {
      const sw = (st) => st + (st % 2 ? 0.25 : 0); // corcheas con swing
      for (const st of [0, 7, 10]) golpe(st, (t) => { I.bombo(t, v * 0.8); bombos.push(t); });
      for (const st of [4, 12]) golpe(st, (t) => I.caja(t, v * 0.6));
      for (let st = 0; st < 16; st += 2) golpe(sw(st), (t) => I.platillo(t, v * 0.5));
      golpe(0, (t) => I.bajo(t, notas[0] - 12, compas * 0.45, v * 0.8)); golpe(8, (t) => I.bajo(t, notas[2] - 12, compas * 0.45, v * 0.8));
      I.rhodes(t0, notas.map((m) => m + 12), compas, v); I.disco(t0, compas);
    } else if (estilo === 'electro') {
      for (const st of [0, 4, 8, 12]) golpe(st, (t) => { I.bombo(t, v); bombos.push(t); });
      for (const st of [4, 12]) golpe(st, (t) => I.palma(t, v));
      for (const st of [2, 6, 10, 14]) golpe(st, (t) => I.platillo(t, v, true));
      for (const st of [2, 6, 10, 14]) golpe(st, (t) => I.bajo(t, notas[0] - 12, paso * 1.8, v));
      const bombeo = (t) => { const k = bombos.filter((x) => x <= t).at(-1); return k == null ? 1 : 1 - 0.7 * Math.exp(-(t - k) / 0.12); };
      I.colchon(t0, notas.map((m) => m + 12), compas, v, bombeo);
    } else { // synthwave
      for (const st of [0, 8]) golpe(st, (t) => { I.bombo(t, v); bombos.push(t); });
      for (const st of [4, 12]) golpe(st, (t) => { I.caja(t, v); I.palma(t, v * 0.6); });
      for (let st = 0; st < 16; st += 2) golpe(st, (t) => I.platillo(t, v * 0.6));
      for (let st = 0; st < 16; st++) golpe(st, (t) => I.bajo(t, notas[0] - 12 + (st % 4 === 3 ? 12 : 0), paso * 0.9, v * 0.85)); // bajo en semicorcheas
      I.colchon(t0, notas.map((m) => m + 12), compas, v * 1.1);
    }
    // Melodía (desde el segundo compás); en el último se calla para cerrar
    if (b > 0 && !fin) for (let k = 0; k < 8; k++) {
      const nota = motivo[(b % 2) * 8 + k]; if (nota == null) continue;
      const m = notas[nota % notas.length] + 24 + (estilo === 'lofi' ? -12 : 0);
      golpe(k * 2, (t) => I.pluck(t, m, paso * 2.2, v * (estilo === 'lofi' ? 0.7 : 1)));
    }
  }
  // Salida: los últimos 1,5 s bajan de volumen
  const ini = Math.floor((dur - 1.5) * SR), finS = Math.floor(dur * SR);
  for (let i = Math.max(0, ini); i < Math.min(buf.length, finS + SR); i++) buf[i] *= Math.max(0, (finS - i) / (finS - ini));
}
