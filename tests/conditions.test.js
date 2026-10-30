// Historical conditions within an age: the wet years, the pestilence, and the dear labour after it.
import { describe, it, expect } from 'vitest';
import { run, TICKS_PER_YEAR } from '../harness/lib.mjs';
import { checkInvariants } from '../harness/invariants.mjs';
import { MEDIEVAL_CONDITIONS } from '../src/data/conditions.js';
import { validateConditions } from '../src/sim/validate.js';
import { effect } from '../src/sim/effects.js';
import { tick } from '../src/sim/clock.js';
import { calYear, S } from '../src/sim/state.js';
import { AGES } from '../src/data/ages.js';

const until = year => { while (calYear() < year) tick(); };

describe('historical conditions', () => {
  it('the records validate, and the validator catches mistakes', () => {
    expect(validateConditions(MEDIEVAL_CONDITIONS)).toEqual([]);
    const bad = validateConditions([{ id: 'x', years: [1400, 1300], chance: 2, after: 'y', effects: { gloom: { mul: 2 } }, mortality: {} }]).join('\n');
    for (const w of ['years', 'chance', 'unknown condition', 'begin', 'unknown effect', 'visitation']) expect(bad).toContain(w);
  });

  it('the wet years come in most villages, and cut the harvest while they hold', () => {
    let wet = 0;
    for (const seed of [1, 2, 3, 4]) {
      run(seed, { years: 0 }); until(1318);
      if (S.conditions.past.wetYears != null) wet++;
    }
    expect(wet).toBeGreaterThanOrEqual(3);
    run(1, { years: 0 }); until(1315);
    while (!S.conditions.active.wetYears && calYear() < 1318) tick();
    if (S.conditions.active.wetYears) expect(effect('farmYield')).toBeLessThan(0.6);
  });

  it('a village still in its age by 1350 lives through the pestilence, then labour is dear', () => {
    const keep = AGES.medieval.minYears;
    AGES.medieval.minYears = 70; // keep the village in its age, so the pestilence must come
    try { run(3, { years: 0 }); while (calYear() < 1352 && S.age === 'medieval') tick(); } finally { AGES.medieval.minYears = keep; }
    expect(S.age).toBe('medieval');
    expect(S.conditions.past.pestilence).toBeGreaterThanOrEqual(1348);
    expect(S.conditions.past.pestilence).toBeLessThanOrEqual(1350);
    expect(S.agents.some(a => a.dead && a.dead.cause === 'of the pestilence')).toBe(true);
    expect(S.conditions.past.deadHands).toBeGreaterThan(S.conditions.past.pestilence);
    expect(S.annals.some(e => e.condition === 'pestilence' && /Michaelmas/.test(e.h))).toBe(true);
    expect(checkInvariants(S)).toEqual([]);
  });
});
