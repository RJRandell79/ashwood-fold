// Crossroads: opportunities come from real pressures, choices influence but never command,
// declining is free, and each era allows only so many.
import { describe, it, expect } from 'vitest';
import { run, TICKS_PER_YEAR } from '../harness/lib.mjs';
import { checkInvariants } from '../harness/invariants.mjs';
import { CROSSROAD, NUDGES_PER_ERA } from '../src/data/crossroads.js';
import { choose, optionsOf } from '../src/sim/crossroads.js';
import { validateCrossroads } from '../src/sim/validate.js';
import { SIGNALS } from '../src/sim/signals.js';
import { S, setState } from '../src/sim/state.js';
import { tick } from '../src/sim/clock.js';
import { TPD } from '../src/data/world.js';

describe('crossroads', () => {
  it('the records validate, and the validator catches mistakes', () => {
    expect(validateCrossroads()).toEqual([]);
    const bad = validateCrossroads([{ id: 'x', answers: 'mood', when: 'moonFull', options: [{ label: 'a', intent: 'b', favour: 'flying', relief: 'corn' }] }]).join('\n');
    expect(bad).toMatch(/unknown signal moonFull/);
    expect(bad).toMatch(/answers must be/);
    expect(bad).toMatch(/exactly one of favour or relief/);
  });

  it('a crossroads opens only after its pressure has held, and passes if left alone', () => {
    const seen = [];
    run(3, { years: 12, onYear: s => { for (const o of s.xr.open) seen.push(o.id); } });
    expect(S.xr.past.length + S.xr.open.length).toBeGreaterThan(0);
    for (const p of S.xr.past) expect(p.label).toBe('Let it be'); // nobody chose, so nothing was spent
    expect(S.xr.used).toBe(0);
    for (const id of seen) expect(SIGNALS[CROSSROAD[id].when]).toBeTypeOf('function');
  });

  it('choosing to favour an idea raises its pressure but does not build it', () => {
    run(3, { years: 1 });
    S.xr.open = [{ id: 'quarrels', opened: S.tick, closes: S.tick + TPD * 10 }];
    const opt = optionsOf(CROSSROAD.quarrels).find(o => o.favour);
    const before = S.tech[opt.favour].pressure, state = S.tech[opt.favour].state;
    choose('quarrels', opt.k);
    expect(S.tech[opt.favour].pressure).toBeGreaterThan(before);
    expect(S.tech[opt.favour].state).toBe(state); // influence, never command
    expect(S.tech[opt.favour].favouredUntil).toBeGreaterThan(S.tick);
    expect(S.xr.used).toBe(1);
  });

  it('only so many choices per era, and letting it be costs nothing', () => {
    run(5, { years: 1 });
    for (let k = 0; k < NUDGES_PER_ERA + 2; k++) {
      S.xr.open = [{ id: 'crowded', opened: S.tick, closes: S.tick + TPD * 10 }];
      choose('crowded', -1);
    }
    expect(S.xr.used).toBe(0);
    for (let k = 0; k < NUDGES_PER_ERA; k++) { S.xr.open = [{ id: 'crowded', opened: S.tick, closes: S.tick + TPD }]; choose('crowded', CROSSROAD.crowded.options.findIndex(o => o.relief)); }
    expect(S.xr.used).toBe(NUDGES_PER_ERA);
    // with the era's choices spent, the daily check offers no more ordinary crossroads (a crisis still may)
    S.xr.open = []; S.xr.held.crowded = 99; S.xr.closedAt = {};
    for (let i = 0; i < TPD * 2; i++) tick();
    expect(S.xr.open.some(o => !CROSSROAD[o.id].crisis)).toBe(false);
  });

  it('villages that are nudged at every crossroads keep their invariants and save cleanly', () => {
    const problems = [];
    run(11, { years: 25, policy: 'first', onYear: s => problems.push(...checkInvariants(s)) });
    expect(problems).toEqual([]);
    expect(S.xr.past.filter(p => p.label !== 'Let it be').length).toBeGreaterThan(0);
    const copy = JSON.parse(JSON.stringify(S));
    setState(copy);
    for (let i = 0; i < TICKS_PER_YEAR; i++) tick();
    expect(checkInvariants(S)).toEqual([]);
  });
});
