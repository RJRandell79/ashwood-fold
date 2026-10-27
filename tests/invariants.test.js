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
