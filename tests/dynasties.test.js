// Family records: a family's legacy outlives its members, and is kept apart from its wealth.
import { describe, it, expect } from 'vitest';
import { run } from '../harness/lib.mjs';
import { S } from '../src/sim/state.js';
import { familyKey } from '../src/sim/heraldry.js';

describe('family records', () => {
  it('every family that has lived here has a record, founded in a calendar year', () => {
    run(4, { years: 30 });
    const fams = new Set(S.agents.map(familyKey));
    for (const f of fams) {
      const r = S.dynasties[f];
      expect(r, f).toBeTruthy();
      expect(r.first).toBeGreaterThanOrEqual(1750);
      expect(r.founder).toBeTruthy();
    }
  });
  it('families that die out or leave are remembered, with when they went', () => {
    run(4, { years: 30 });
    const gone = Object.values(S.dynasties).filter(r => r.living === 0);
    expect(gone.length).toBeGreaterThan(0);
    for (const r of gone) expect(r.gone).toBeGreaterThanOrEqual(r.first);
  });
  it('built ideas and offices become deeds the family is remembered for', () => {
    run(4, { years: 30 });
    const deeds = Object.values(S.dynasties).flatMap(r => r.deeds);
    expect(deeds.some(d => d.kind === 'honour')).toBe(true);
    expect(deeds.some(d => d.kind === 'office')).toBe(true);
    for (const d of deeds) expect(d.year).toBeGreaterThanOrEqual(1750);
  });
});
