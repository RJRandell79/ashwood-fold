// The Phase 0 gate in miniature: the ported modules reproduce v5 exactly.
// Later phases deliberately change behaviour; this test pins the early years only.
import { describe, it, expect } from 'vitest';
import { run, TICKS_PER_YEAR } from '../harness/lib.mjs';
import { runV5 } from '../harness/v5-reference.mjs';
import { canonical } from '../harness/canonical.mjs';

describe('port matches the v5 prototype', () => {
  for (const seed of [1, 42]) {
    it(`seed ${seed}: identical state after 3 years`, () => {
      const ticks = 3 * TICKS_PER_YEAR;
      const ref = runV5(seed, { ticks });
      const got = JSON.parse(JSON.stringify(run(seed, { ticks })));
      expect(got.annals).toEqual(ref.annals);
      expect(canonical(got)).toBe(canonical(ref));
    });
  }
});
