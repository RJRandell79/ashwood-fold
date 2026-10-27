// Phase 2: the valley, building placement and the re-laying-out of old saves.
import { describe, it, expect } from 'vitest';
import { run, TICKS_PER_YEAR } from '../harness/lib.mjs';
import { runV5 } from '../harness/v5-reference.mjs';
import { checkInvariants } from '../harness/invariants.mjs';
import { canonical } from '../harness/canonical.mjs';
import { valley, VW, VH } from '../src/sim/valley.js';
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
      for (const id of ['cottonmill', 'wharf', 'station', 'school', 'barn']) expect(S.places[id], `${id} in seed ${seed}`).toBeTruthy();
      expect(S.lines.canal).toHaveLength(VW);
      expect(S.lines.railway).toHaveLength(VW);
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
