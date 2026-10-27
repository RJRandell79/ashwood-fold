import { describe, it, expect } from 'vitest';
import { run } from '../harness/lib.mjs';
import { checkInvariants } from '../harness/invariants.mjs';

describe('invariants hold through long runs', () => {
  // Seed 11 married one man to two people in v5 (two sets of banns on the same day).
  for (const seed of [11, 77, 3]) {
    it(`seed ${seed}: 30 years`, () => {
      const problems = [];
      run(seed, { years: 30, onYear: (S, y) => checkInvariants(S).forEach(p => problems.push(`year ${y}: ${p}`)) });
      expect(problems).toEqual([]);
    });
  }
});

import { S, refreshLive } from '../src/sim/state.js';
import { exile } from '../src/sim/civic.js';

describe('banishment ends a marriage', () => {
  it('the partner left behind is single again and can remarry', () => {
    run(4, { years: 1 });
    const wife = S.agents.find(a => !a.dead && a.spouse >= 0);
    const husband = S.agents[wife.spouse];
    exile(husband, 'banished by the court');
    refreshLive();
    expect(wife.spouse).toBe(-1);
    expect(wife.formerSpouse).toBe(husband.id);
    expect(S.annals.at(-1).h).toMatch(/free to wed again/);
  });
});
