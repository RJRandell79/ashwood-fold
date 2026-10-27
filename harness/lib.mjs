// Headless driver: runs the simulation in plain Node, no DOM, no Three.js.
import { newTown } from '../src/sim/setup.js';
import { S, refreshLive } from '../src/sim/state.js';
import { tick } from '../src/sim/clock.js';
import { TPD } from '../src/data/world.js';

export const TICKS_PER_YEAR = TPD * 20;

/** Starts a fresh village from `seed` and runs it for `years` game years (or `ticks` ticks). */
export function run(seed, { years = 0, ticks = years * TICKS_PER_YEAR, onYear } = {}) {
  newTown(seed);
  refreshLive();
  for (let i = 1; i <= ticks; i++) {
    tick();
    if (onYear && i % TICKS_PER_YEAR === 0) onYear(S, i / TICKS_PER_YEAR);
  }
  return S;
}
