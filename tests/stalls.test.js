// Stalls and decline (decided 4 Nov): ideas can fail for good, the valley can rule an idea out, and an
// industrial village's mill can stand idle in a slump and never reopen.
import { describe, it, expect } from 'vitest';
import { run } from '../harness/lib.mjs';
import { CONDITION, INDUSTRIAL_CONDITIONS } from '../src/data/conditions.js';
import { IDEA } from '../src/data/ideas.js';
import { validateConditions } from '../src/sim/validate.js';
import { tick } from '../src/sim/clock.js';
import { possible, powerOf } from '../src/sim/ideas.js';
import { familyKey } from '../src/sim/heraldry.js';
import { calYear, S, techOn } from '../src/sim/state.js';
import { TPD, YEAR_DAYS } from '../src/data/world.js';

describe('stalls and decline', () => {
  it('an idea the village set its face against stays abandoned through the age, bar a chance with each new era', () => {
    run(3, { years: 2, age: 'industrial' });
    const t = S.tech.school;
    Object.assign(t, { state: 'abandoned', abandonedEra: S.era, abandonedAt: S.tick, fizzles: 2, pressure: 0 });
    for (let i = 0; i < TPD * YEAR_DAYS * 12; i++) { tick(); if (S.era > t.abandonedEra) break; }
    if ((S.era || 0) === t.abandonedEra) expect(t.state).toBe('abandoned');   // ten years on, the same era: still gone
  });

  it('some valleys are too steep for a railway (about three in ten)', () => {
    let ruled = 0, open = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      run(seed * 7919, { years: 0, age: 'industrial' });
      if (possible(IDEA.railway)) open++; else ruled++;
    }
    expect(ruled).toBeGreaterThan(0);
    expect(open).toBeGreaterThan(0);
  });

  it('a cloth slump can stand the mill idle; the works is off while it lasts', () => {
    expect(validateConditions(INDUSTRIAL_CONDITIONS)).toEqual([]);
    const slump = CONDITION.clothSlump, keep = { chance: slump.chance, stop: slump.stops.chance };
    slump.chance = 1; slump.stops.chance = 1;
    try {
      run(5, { years: 0, age: 'industrial' });
      Object.assign(S.tech.cottonmill, { state: 'built', builtAt: S.tick, inventor: S.agents.find(a => !a.dead).id });
      while (calYear() < 1776) tick();
      expect(S.conditions.past.clothSlump).toBe(1775);
      expect(techOn('cottonmill')).toBe(false);
      while (calYear() < 1780) tick();
      const t = S.tech.cottonmill;
      expect(!!t.closed || techOn('cottonmill')).toBe(true);
      expect(S.annals.some(e => e.condition === 'clothSlump' && /mill/i.test(e.h))).toBe(true);
    } finally { slump.chance = keep.chance; slump.stops.chance = keep.stop; }
  });

  it('a powerful opponent can sink an idea, and the family is remembered for it', () => {
    run(4, { years: 1, age: 'industrial' });
    const live = S.agents.filter(a => !a.dead && a.age >= 18);
    const reeve = live.find(a => a.job === 'reeve') || live[0], inv = live.find(a => a !== reeve);
    const against = live.filter(a => a !== inv).map(a => a.id);   // the whole village, the reeve among them
    Object.assign(S.tech.school, { state: 'idea', inventor: inv.id, backers: [inv.id], opponents: against, since: S.tech.school.since = S.tick, fizzles: 1 });
    expect(powerOf(reeve, IDEA.school)).toBeGreaterThan(1);
    for (let i = 0; i < TPD * 30 && S.tech.school.state === 'idea'; i++) tick();
    const t = S.tech.school;
    expect(t.state).toBe('abandoned');
    expect(t.lostWhy).toBe('opposed');
    expect(Object.values(S.dynasties).some(r => r.deeds.some(d => d.kind === 'opposed'))).toBe(true);   // whoever led the opposition
    expect(S.annals.some(e => e.abandoned && e.tech === 'school')).toBe(true);
  });
});
