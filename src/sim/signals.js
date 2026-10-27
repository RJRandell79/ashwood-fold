// Named conditions and events that build pressure for ideas (see pressure.when / pressure.on
// in src/data/ideas.js). Adding a signal is code; using it in an idea is data.
import { IDEAS } from '../data/ideas.js';
import { LIVE, S, seasonOf } from './state.js';
import { effect } from './effects.js';

const weavers = () => LIVE.filter(a => a.job === 'weaver');

/** Daily conditions: while one holds, ideas that list it gain extra pressure each day. */
export const SIGNALS = {
  grainShort: () => S.stores.grain < LIVE.length * 4,
  flourShort: () => S.stores.flour < 10,
  granaryFullAtHarvest: () => seasonOf() === 2 && S.stores.grain >= effect('grainCap') * 0.95,
  weaversPoor: () => { const w = weavers(); return w.length && w.reduce((s, x) => s + x.coins, 0) / w.length < 8; },
  manyChildren: () => LIVE.filter(a => a.age >= 5 && a.age < 14).length >= 4,
  hasWeavers: () => weavers().length > 0,
};

/** One-off events raised by the simulation. */
export const SIGNAL_EVENTS = ['shelvesBare', 'granaryFull', 'cornFlattened', 'thinHarvest', 'rumourSpread'];

/** Something happened: every idea that listens for it gains pressure. */
export function raisePressure(event) {
  for (const d of IDEAS) { const v = d.pressure && d.pressure.on && d.pressure.on[event]; if (v) S.tech[d.id].pressure += v; }
}
