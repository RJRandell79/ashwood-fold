// Phase 2: the valley, building placement and the re-laying-out of old saves.
import { describe, it, expect } from 'vitest';
import { run, TICKS_PER_YEAR } from '../harness/lib.mjs';
import { runV5 } from '../harness/v5-reference.mjs';
import { checkInvariants } from '../harness/invariants.mjs';
import { canonical } from '../harness/canonical.mjs';
import { valley, VW, VH } from '../src/sim/valley.js';
import { IDEAS } from '../src/data/ideas.js';
import { migrate } from '../src/sim/setup.js';
import { S, setState } from '../src/sim/state.js';
import { tick } from '../src/sim/clock.js';

describe('the valley', () => {
  it('is the same valley every time for a seed, and differs between seeds', () => {
    const a = valley(3), b = valley(3), c = valley(4);
    expect(a).toBe(b);
    expect(Array.from(a.height.slice(0, 500))).not.toEqual(Array.from(c.height.slice(0, 500)));
  });
  it('puts the first hearth on dry land north of the river', () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      const v = valley(seed), i = Math.floor(v.hearth.y) * VW + Math.floor(v.hearth.x);
      expect(v.water[i]).toBe(0);
      expect(v.flood[i]).toBe(0);
      expect(v.hearth.y).toBeLessThan(v.riverY(v.hearth.x));
      expect(v.hearth.y).toBeGreaterThan(0);
      expect(v.hearth.y).toBeLessThan(VH);
    }
  });
});

describe('placement', () => {
  it('a run is deterministic, layout and all', () => {
    const a = canonical(JSON.parse(JSON.stringify(run(7, { years: 3 }))));
    const b = canonical(JSON.parse(JSON.stringify(run(7, { years: 3 }))));
    expect(a).toBe(b);
  });
  it('every village lays out cleanly and stays clean as it grows', () => {
    for (const seed of [2, 31, 64]) {
      const problems = [];
      run(seed, { years: 30, onYear: s => problems.push(...checkInvariants(s)) });
      expect(problems).toEqual([]);
      // every built idea's buildings and lines stand in the valley
      for (const d of IDEAS) if (S.tech[d.id].state === 'built') {
        for (const id of d.places || []) expect(S.places[id], `${id} in seed ${seed}`).toBeTruthy();
        if (d.line) expect(S.lines[d.line]).toHaveLength(VW);
      }
    }
  });
});

describe('old saves', () => {
  it('a v5 village is laid out afresh in a valley and carries on', () => {
    const v5 = JSON.parse(JSON.stringify(runV5(42, { ticks: 12 * TICKS_PER_YEAR })));
    expect(v5.places).toBeUndefined();
    const o = migrate(v5);
    setState(o);
    expect(o.v).toBe(3);
    expect(Object.keys(o.places)).toContain('square');
    for (const a of o.agents) if (!a.dead) expect(o.places[a.home], `${a.name}'s home ${a.home}`).toBeTruthy();
    for (const [id, t] of Object.entries(o.tech)) if (t.state === 'built' && id === 'cottonmill') expect(o.places.cottonmill).toBeTruthy();
    expect(checkInvariants(o)).toEqual([]);
    for (let i = 0; i < 3 * TICKS_PER_YEAR; i++) tick();
    expect(checkInvariants(S)).toEqual([]);
  });
});

describe('the river and the eras', () => {
  it('the first village fords the river; once bridged, people walk over by the bridge', () => {
    let crossed = 0, bridged = false;
    run(4, { years: 30, onYear: s => { if (s.crossing.kind === 'bridge') bridged = true; } });
    expect(bridged).toBe(true);
    const v = valley(S.valley.seed), far = Object.values(S.places).filter(p => p.y + p.h / 2 > v.riverY(p.x + p.w / 2));
    expect(far.length).toBeGreaterThan(0);
    // walk a few days and check nobody wades: every step over the river is at the crossing
    for (let i = 0; i < 144 * 5; i++) {
      const before = S.agents.map(a => [a.x, a.y]);
      tick();
      S.agents.forEach((a, k) => {
        if (a.dead || !before[k]) return;
        const [x0, y0] = before[k], s0 = y0 > v.riverY(x0), s1 = a.y > v.riverY(a.x);
        if (s0 !== s1) { crossed++; expect(Math.abs(a.x - (S.crossing.x + 0.5))).toBeLessThan(1); }
      });
    }
    expect(crossed).toBeGreaterThan(0);
  });
  it('old buildings are rebuilt in newer styles as the eras pass', () => {
    run(1, { years: 30, age: 'industrial' });
    const rebuilt = Object.values(S.places).filter(p => p.rebuilt);
    expect(rebuilt.length).toBeGreaterThan(3);
    for (const p of rebuilt) expect(p.era).toBeGreaterThanOrEqual(2);
    for (const id of ['square', 'chapel', 'market']) expect(S.places[id].rebuilt, `${id} is enduring`).toBeUndefined();
  });
});
