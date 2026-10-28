// Family records. A family's legacy is kept apart from its wealth and its living members (decided
// 27 Oct, after the design review): a line can die out and still be remembered, lose its land and
// keep its arms, fall into disgrace and return to office. The interludes carry these records across
// the centuries; the annals and the families panel read them.
//
// S.dynasties[family] = { name, first, founder, age, seat, deeds: [{ year, text, kind }], peak, living, lastSeen, gone }
//   deeds' kinds: honour (an idea built, arms granted), office (chosen reeve), disgrace (banished)
import { familyKey } from './heraldry.js';
import { calYear, LIVE, S } from './state.js';

function record(fam) {
  const D = S.dynasties || (S.dynasties = {});
  return D[fam] || (D[fam] = { name: fam, first: calYear(), founder: null, age: S.age, seat: null, deeds: [], peak: 0, living: 0, lastSeen: calYear(), gone: null });
}

/** Notes something a member of the family did that the valley will remember. */
export function addDeed(a, text, kind) {
  const r = record(familyKey(a));
  r.deeds.push({ year: calYear(), text, kind });
  if (r.deeds.length > 12) r.deeds.splice(0, r.deeds.length - 12);
}

/** Brings every family's record up to date: who founded it, where it lives, whether it still lives here. */
export function recordFamilies() {
  const now = calYear(), fams = {};
  for (const a of S.agents) (fams[familyKey(a)] || (fams[familyKey(a)] = [])).push(a);
  for (const [fam, members] of Object.entries(fams)) {
    const r = record(fam), live = members.filter(a => !a.dead);
    if (!r.founder) { const f = members.slice().sort((x, y) => (x.born ?? -1e9) - (y.born ?? -1e9) || y.age - x.age)[0]; r.founder = f.name; }
    r.living = live.length;
    r.peak = Math.max(r.peak, live.length);
    if (live.length) {
      r.lastSeen = now; r.gone = null;
      const homes = {}; for (const a of live) homes[a.home] = (homes[a.home] || 0) + 1;
      r.seat = Object.entries(homes).sort((x, y) => y[1] - x[1])[0][0];
    } else if (!r.gone) r.gone = now;
  }
}

/** The records of families that are still here, or that the valley remembers. */
export function dynasties() {
  return Object.values(S.dynasties || {}).sort((a, b) => b.living - a.living || a.first - b.first || (a.name > b.name ? 1 : -1));
}
export const livingFamilies = () => new Set(LIVE.map(familyKey));
