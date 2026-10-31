// The next age inherits the old one's geography (decided 30 Oct): old sites draw their own kind, and every
// building keeps a record of who built it, why it stands where it does and what stood there before.
import { describe, it, expect } from 'vitest';
import { run } from '../harness/lib.mjs';
import { beginInterlude, interludeReady } from '../src/sim/interlude.js';
import { S, setState } from '../src/sim/state.js';

const gap = (a, b) => Math.hypot(Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h)));

describe('inherited influence', () => {
  it('every building keeps a record, and the first village is laid out with no past to draw on', () => {
    run(4, { years: 10 });
    for (const p of Object.values(S.places)) {
      expect(p.record, p.id).toBeTruthy();
      expect(p.record.year).toBeGreaterThanOrEqual(1290);
      expect(p.record.over).toBeNull();
    }
    expect(S.places.square.record.why).toBe('where the first hearth was lit');
    expect(Object.values(S.places).filter(p => p.record.why).length).toBeGreaterThan(Object.keys(S.places).length / 2);
  });

  it('the new village grows over the old: homes and fields go back where homes and fields were', () => {
    let near = 0, total = 0, onSite = 0;
    for (const seed of [3, 5]) {
      let before = null;
      run(seed, { years: 75, onYear: s => { if (!before && s.age === 'medieval' && interludeReady()) before = JSON.parse(JSON.stringify(s)); } });
      const old = Object.values(before.places);
      setState(before); beginInterlude();
      for (const p of Object.values(S.places)) {
        if (p.record.age !== 'industrial' || !(p.home || p.kind === 'field')) continue;
        const kin = old.filter(o => (p.home && o.home) || (p.kind === 'field' && o.kind === 'field'));
        total++;
        if (Math.min(...kin.map(o => gap(p, o))) <= 3) near++;
        if (p.record.over) onSite++;
        expect(p.record.year).toBe(1750);
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(near / total).toBeGreaterThan(0.6);
    expect(onSite).toBeGreaterThan(0);
  });
});
