// The first interlude: from the manor village of 1290 to the industrial village of 1750.
import { describe, it, expect } from 'vitest';
import { run, TICKS_PER_YEAR } from '../harness/lib.mjs';
import { checkInvariants } from '../harness/invariants.mjs';
import { BUILDINGS } from '../src/data/buildings.js';
import { AGES } from '../src/data/ages.js';
import { calYear, S, setState } from '../src/sim/state.js';
import { beginInterlude, interludeReady } from '../src/sim/interlude.js';
import { tick } from '../src/sim/clock.js';
import { decode, encode } from '../src/save/codec.js';

/** Runs a manor village until its age closes, then lets the centuries pass. */
function toInterlude(seed) {
  let before = null;
  run(seed, { years: 75, onYear: s => { if (!before && s.age === 'medieval' && interludeReady()) before = JSON.parse(JSON.stringify(s)); } });
  return before;
}

describe('the first interlude', () => {
  it('a new game begins in the manor village of 1290', () => {
    run(1, { years: 0 });
    expect(S.age).toBe('medieval');
    expect(calYear()).toBe(1290);
    expect(S.places.hall.name).toBe('the Manor House');
  });

  it('the age closes when it has run its course, and the next begins in 1750', () => {
    const before = toInterlude(2);
    expect(before).toBeTruthy();
    setState(before);
    expect(beginInterlude()).toBe(true);
    expect(S.age).toBe('industrial');
    expect(calYear()).toBe(1750);
    expect(checkInvariants(S)).toEqual([]);
  });

  it('buildings follow their legacy across the centuries', () => {
    const before = toInterlude(3);
    const old = JSON.parse(JSON.stringify(before.places));
    setState(before); beginInterlude();
    for (const [id, p] of Object.entries(old)) {
      const legacy = (BUILDINGS[p.def] || {}).legacy;
      if (legacy === 'enduring') expect(S.places[id], `${id} endures`).toBeTruthy();
      if (legacy === 'enduring') expect(S.places[id].name).toBe(p.name);
      if (legacy === 'adaptable') expect(S.places[id], `${id} is rebuilt or a ruin`).toBeTruthy();
    }
    expect(S.places.hall.name).toBe('the Moot Hall');               // the Manor House, rebuilt on its footings
    for (const id of ['chantry', 'fulling']) if (old[id]) expect(S.places[id].def).toBe('ruin');
    for (const s of S.history.sites) expect(old[Object.keys(old).find(k => old[k].name === s.name)]).toBeTruthy();
    expect(Object.keys(S.roads || {}).length).toBeGreaterThan(0);   // the old lanes carry on
    // the age's record says what became of every building, and where the heart of the village was
    const rec = S.history.ages[0], fates = Object.values(rec.places).flat();
    expect(fates.map(f => f.id).sort()).toEqual(Object.keys(old).sort());
    expect(rec.centre.x).toBeCloseTo(old.square.x + old.square.w / 2);
  });

  it('families come through as heirs, or are remembered when lost; the new cast is their heirs or namesakes', () => {
    const before = toInterlude(5);
    setState(before); beginInterlude();
    const old = Object.values(S.dynasties).filter(r => r.age === 'medieval' && r.fate);
    expect(old.length).toBeGreaterThan(0);
    const heirs = Object.values(S.dynasties).filter(r => r.descends), namesakes = Object.values(S.dynasties).filter(r => r.namesake);
    expect(heirs.length + namesakes.length).toBeGreaterThan(0);
    for (const h of heirs) { expect(h.first).toBeLessThan(1750); expect(S.arms[h.name]).toBeTruthy(); }
    const living = S.agents.filter(a => !a.dead);
    expect(living.length).toBe(AGES.industrial.cast.folk.length);
    for (const a of S.agents.filter(a => a.dead && a.dead.longAgo)) expect(a.dead.ageName).toBe(AGES.medieval.name);
    expect(S.annals.some(e => e.c === 'interlude')).toBe(true);
  });

  it('the valley carries on after the interlude, saves and loads', () => {
    const before = toInterlude(7);
    setState(before); beginInterlude();
    for (let i = 0; i < TICKS_PER_YEAR * 5; i++) tick();
    expect(checkInvariants(S)).toEqual([]);
    const back = decode(encode());
    expect(back.age).toBe('industrial');
    setState(back);
    for (let i = 0; i < TICKS_PER_YEAR; i++) tick();
    expect(checkInvariants(S)).toEqual([]);
  });
});

describe('the manor village runs for about two generations', () => {
  it('it cannot close before forty years, and closes by about 1360', () => {
    let closed = null, readyFrom = null;
    run(4, { years: 75, onYear: (s, y) => { if (s.age === 'medieval' && interludeReady() && !readyFrom) readyFrom = y; if (s.age === 'industrial' && !closed) closed = y; } });
    expect(readyFrom).toBeGreaterThanOrEqual(40);
    expect(closed).toBeTruthy();
    expect(S.history.ages[0].endYear).toBeLessThanOrEqual(1362);
  });
});
