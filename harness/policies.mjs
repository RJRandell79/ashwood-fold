// Ways the harness can answer crossroads, to test that nudges matter but do not dominate,
// and that declining is free. Each returns an option index, -1 to let it be, or null to leave it open.
import { CROSSROAD } from '../src/data/crossroads.js';
import { optionsOf } from '../src/sim/crossroads.js';

function dice(seed) { let t = (seed ^ 0x9e3779b9) >>> 0; return () => { t = (t + 0x6D2B79F5) | 0; let r = Math.imul(t ^ (t >>> 15), t | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

export const POLICIES = {
  /** Never intervene: every crossroads passes. */
  never: () => () => null,
  /** Always take the first option on offer. */
  first: () => (S, o) => { const opts = optionsOf(CROSSROAD[o.id]); return opts.length ? opts[0].k : -1; },
  /** Choose at random among the options and letting it be, with the harness's own dice. */
  random: seed => { const r = dice(seed); return (S, o) => { const opts = optionsOf(CROSSROAD[o.id]); const i = Math.floor(r() * (opts.length + 1)); return i < opts.length ? opts[i].k : -1; }; },
};
