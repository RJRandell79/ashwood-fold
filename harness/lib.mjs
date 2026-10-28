// Headless driver: runs the simulation in plain Node, no DOM, no Three.js.
import { newTown } from '../src/sim/setup.js';
import { S, refreshLive } from '../src/sim/state.js';
import { tick } from '../src/sim/clock.js';
import { TPD } from '../src/data/world.js';
import { choose } from '../src/sim/crossroads.js';
import { POLICIES } from './policies.mjs';

export const TICKS_PER_YEAR = TPD * 20;

/** Starts a fresh village from `seed` and runs it for `years` game years (or `ticks` ticks).
 *  `policy` (a name from harness/policies.mjs) answers crossroads once a day; by default none are answered. */
export function run(seed, { years = 0, ticks = years * TICKS_PER_YEAR, onYear, policy = 'never', age } = {}) {
  newTown(seed, age);
  refreshLive();
  const answer = POLICIES[policy](seed);
  for (let i = 1; i <= ticks; i++) {
    tick();
    if (i % TPD === 0 && S.xr) for (const o of [...S.xr.open]) { const k = answer(S, o); if (k != null) choose(o.id, k); }
    if (onYear && i % TICKS_PER_YEAR === 0) onYear(S, i / TICKS_PER_YEAR);
  }
  return S;
}
