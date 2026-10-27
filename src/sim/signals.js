// Named conditions and events that build pressure for ideas (see pressure.when / pressure.on
// in src/data/ideas.js). Adding a signal is code; using it in an idea is data.
import { IDEAS } from '../data/ideas.js';
import { LIVE, P, S, seasonOf } from './state.js';
import { effect } from './effects.js';
import { choosePlot, lineDifficulty, settlementCentre } from './placement.js';
import { BUILDINGS, LINES } from '../data/buildings.js';
const WATERWAY = Object.keys(LINES).find(k => LINES[k].water);

const weavers = () => LIVE.filter(a => a.job === 'weaver');
// Above this difficulty (see lineDifficulty) a valley is too steep and broken for a canal: about a third of valleys.
const CANAL_LIMIT = 1.4;

/** Daily conditions: while one holds, ideas that list it gain extra pressure each day. */
export const SIGNALS = {
  grainShort: () => S.stores.grain < LIVE.length * 4,
  flourShort: () => S.stores.flour < 10,
  granaryFullAtHarvest: () => seasonOf() === 2 && S.stores.grain >= effect('grainCap') * 0.95,
  weaversPoor: () => { const w = weavers(); return w.length && w.reduce((s, x) => s + x.coins, 0) / w.length < 8; },
  manyChildren: () => LIVE.filter(a => a.age >= 5 && a.age < 14).length >= 4,
  hasWeavers: () => weavers().length > 0,
  // a works is running in the village and wants its goods carried
  worksRunning: () => effect('millHandsCap') > 0,
  // a works is running but its goods and corn still go by packhorse and cart on a bad road
  goodsStuck: () => effect('millHandsCap') > 0 && effect('cornCartCost') > 30,
  // the valley side is gentle enough to carry a canal at one level, or it is not
  canalCountry: () => lineDifficulty(WATERWAY) < CANAL_LIMIT,
  hillCountry: () => lineDifficulty(WATERWAY) >= CANAL_LIMIT,
  // the next cottage would stand well out beyond the homes already built
  shortOfLand: () => {
    const p = choosePlot('cottage'); if (!p) return true;
    const c = settlementCentre(), d = BUILDINGS.cottage, far = q => Math.hypot(q.x + q.w / 2 - c.x, q.y + q.h / 2 - c.y);
    const homes = Object.values(P).filter(q => q.home);
    return far({ ...p, w: d.w, h: d.h }) > 1.35 * homes.reduce((s, q) => s + far(q), 0) / homes.length;
  },
};

/** One-off events raised by the simulation. */
export const SIGNAL_EVENTS = ['shelvesBare', 'granaryFull', 'cornFlattened', 'thinHarvest', 'rumourSpread'];

/** Something happened: every idea that listens for it gains pressure. */
export function raisePressure(event) {
  for (const d of IDEAS) { const v = d.pressure && d.pressure.on && d.pressure.on[event]; if (v) S.tech[d.id].pressure += v; }
}
