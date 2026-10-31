// What families leave behind across an interlude (decided 30 Oct: survival and legacy are separate).
import { describe, it, expect } from 'vitest';
import { run } from '../harness/lib.mjs';
import { LEGACY } from '../src/data/legacy.js';
import { recordFamilies } from '../src/sim/dynasties.js';
import { familyKey } from '../src/sim/heraldry.js';
import { applyLegacies, rollLegacies } from '../src/sim/legacy.js';
import { beginInterlude, interludeReady } from '../src/sim/interlude.js';
import { S, setState } from '../src/sim/state.js';

const families = () => { recordFamilies(); return Object.values(S.dynasties).filter(r => r.living > 0); };

describe('family legacies', () => {
  it('old feuds and friendships pass to the heirs of families that both came through', () => {
    run(2, { years: 20 });
    const [a, b] = families();
    const A = S.agents.filter(x => !x.dead && familyKey(x) === a.name), B = S.agents.filter(x => !x.dead && familyKey(x) === b.name);
    for (const x of A) for (const y of B) { S.op[x.id][y.id] = -70; S.op[y.id][x.id] = -70; }
    const keep = LEGACY.bonds.chance; LEGACY.bonds.chance = 1;
    let out;
    try { out = rollLegacies([a, b], [a, b]); } finally { LEGACY.bonds.chance = keep; }
    expect(out.bonds).toEqual([{ a: a.name, b: b.name, kind: 'feud' }]);
    for (const x of A) for (const y of B) S.op[x.id][y.id] = 0;
    applyLegacies(out, [a, b]);
    for (const x of A) for (const y of B) expect(S.op[x.id][y.id]).toBeLessThan(-20);
    for (const r of [a, b]) { expect(['rose', 'held', 'fell']).toContain(r.standing); expect(['descent', 'marriage']).toContain(r.how); }
  });

  it('across a real interlude: names stay on the land in their old spelling, and arms only for honoured families', () => {
    const counts = { landmarks: 0, carved: 0, how: new Set() };
    for (const seed of [2, 3, 5, 6]) {
      let before = null;
      run(seed, { years: 75, onYear: s => { if (!before && s.age === 'medieval' && interludeReady()) before = JSON.parse(JSON.stringify(s)); } });
      setState(before); beginInterlude();
      const rec = S.history.ages[0];
      for (const f of rec.families) {
        if (f.landmark) { counts.landmarks++; expect(f.landmark.startsWith(f.name + ' ')).toBe(true); }
        if (f.carved) { counts.carved++; expect(S.places[f.carved].def).toBe('chapel'); expect(S.dynasties[f.name].deeds.some(d => d.kind !== 'disgrace')).toBe(true); }
        if (f.kept) expect(f.standing).toBeTruthy(); else expect(f.standing).toBeNull();
      }
      for (const r of Object.values(S.dynasties)) if (r.descends || r.namesake) counts.how.add(r.how);
    }
    expect(counts.landmarks).toBeGreaterThan(0);
    expect(counts.carved).toBeGreaterThan(0);
    expect(counts.how.size).toBeGreaterThanOrEqual(2);
  });
});
