// Traces of the past left on the land (decided 7 Nov: the settlement makes the player curious; the annals answer).
import { describe, it, expect } from 'vitest';
import { run } from '../harness/lib.mjs';
import { IDEAS } from '../src/data/ideas.js';
import { raiseBuildings } from '../src/sim/ideas.js';
import { stakeOut } from '../src/sim/traces.js';
import { P, S } from '../src/sim/state.js';

describe('traces on the land', () => {
  it('an idea that comes to nothing leaves its plot pegged out until it is built after all', () => {
    run(6, { years: 2 });
    const d = IDEAS.find(d => (d.places || []).length && !P[d.places[0]] && S.tech[d.id].state !== 'built');
    const s = stakeOut(d, 7);
    expect(S.stakes).toContain(s);
    expect(stakeOut(d, 9, true)).toBe(s);   // failing again keeps the same pegs, pointing at the later entry
    expect(s.n).toBe(9);
    expect(s.givenUp).toBeTruthy();
    raiseBuildings(d);
    expect(S.stakes.some(x => x.idea === d.id)).toBe(false);
  });

  it("an old family's name settles on the new village's land, with the entry that tells of it", () => {
    let named = 0;
    for (const seed of [10, 12]) {
      const S2 = run(seed, { years: 75 });
      for (const l of S2.history.landmarks.filter(l => l.to === S2.age)) {
        expect(S2.annals.some(e => e.n === l.n)).toBe(true);
        if (l.house) { expect(l.x).toBeNull(); continue; }
        expect(Number.isFinite(l.x) && Number.isFinite(l.y)).toBe(true);
        expect(Object.values(S2.places).some(p => p.kind !== 'field' && l.x >= p.x && l.x < p.x + p.w && l.y >= p.y && l.y < p.y + p.h)).toBe(false);
        named++;
      }
    }
    expect(named).toBeGreaterThan(2);
  });
});
