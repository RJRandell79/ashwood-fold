// What a family leaves behind when the centuries pass. Decided 30 Oct: survival and legacy are separate.
// Each family that is still in the valley when an age closes is judged on several things, each rolled
// apart with the simulation's dice:
//   survival   whether the line comes through (src/sim/interlude.js)
//   standing   whether those who come through rose, held their own or fell (land, wealth, office)
//   landmark   a lane, field or wood that keeps the family's name, in its old spelling
//   carved     the family's arms carved on a building that endures
//   bonds      old feuds and friendships between two families that both came through
//   how        how a surname carried on: by descent, through a marriage, with the land, or as a name only
// A family can die out and keep its lane and its carving; a surviving name can belong to a line that
// fell. A surname never implies unbroken descent.
import { BUILDINGS } from '../data/buildings.js';
import { LEGACY } from '../data/legacy.js';
import { familyKey, familyPlural } from './heraldry.js';
import { P, rnd, S } from './state.js';

const pick = list => list[Math.floor(rnd() * list.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** How the valley rates a family at the close of an age: wealth, offices held, honours, disgraces. */
function worth(r) {
  const members = S.agents.filter(a => !a.dead && familyKey(a) === r.name);
  const wealth = members.reduce((s, a) => s + a.coins, 0);
  const count = k => r.deeds.filter(d => d.kind === k).length;
  return wealth / 60 + 0.5 * Math.min(count('office'), 3) + 0.3 * Math.min(count('honour'), 4) - 0.6 * Math.min(count('disgrace'), 2);
}

/** Rolls every family's legacy at the close of an age. `kept` came through; `living` is every family
 *  still in the valley at the close. Returns what the interlude and the next age need. */
export function rollLegacies(living, kept) {
  const L = LEGACY, out = { landmarks: [], carved: [], bonds: [] };
  const used = new Set(((S.history && S.history.landmarks) || []).map(l => l.name));
  // where each family stood in the valley at the close, from 0 (the least) to 1 (the most)
  const ranked = living.map(r => [r, worth(r)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  const rank = r => (ranked.length > 1 ? ranked.indexOf(r) / (ranked.length - 1) : 0.5);
  for (const r of living) {
    const honours = r.deeds.filter(d => d.kind !== 'disgrace').length;
    // standing, for those who come through: the well placed are likelier to rise, the poor to fall
    if (kept.includes(r)) {
      const rose = L.standing.rose + L.standing.perRank * rank(r), fell = L.standing.fell - L.standing.perRank * rank(r);
      const u = rnd();
      r.standing = u < rose ? 'rose' : u < rose + fell ? 'fell' : 'held';
      r.how = rnd() < L.marriage ? 'marriage' : 'descent';
    }
    // a name in the landscape, kept in its old spelling
    if (rnd() < clamp(L.landmark.base + L.landmark.perHonour * Math.min(honours, 4), 0, 0.8)) {
      const words = new Set(out.landmarks.map(l => l.word));   // one Brow, one Lane, … to an interlude
      const kinds = L.landmark.kinds.filter(k => !words.has(k.word) && !used.has(`${r.name} ${k.word}`));
      if (kinds.length) {
        const k = pick(kinds), name = `${r.name} ${k.word}`;
        used.add(name);
        r.landmark = name;
        out.landmarks.push({ name, family: r.name, word: k.word, house: !!k.house, line: k.line });
      }
    }
    // arms carved on what endures, for families the valley honoured
    const hall = carvingPlace();
    if (hall && S.arms && S.arms[r.name] && honours && rnd() < L.carved) {
      (hall.carved || (hall.carved = [])).push({ family: r.name });
      r.carved = hall.id;
      out.carved.push({ family: r.name, place: hall.id });
    }
  }
  // the deepest feud and the warmest friendship in the valley at the close may be remembered. Whether they
  // reach the next age depends on who holds each family's name and land then (applyLegacies)
  // feuds are counted over every family of the age, living or not: a quarrel can run down the generations
  // and outlast the people who began it, and pass with a name or the land to whoever comes after
  const ofAge = Object.values(S.dynasties || {}).filter(r => (r.age || S.age) === S.age);
  const pairs = [];
  for (let i = 0; i < ofAge.length; i++) for (let j = i + 1; j < ofAge.length; j++) pairs.push({ a: ofAge[i].name, b: ofAge[j].name, v: feeling(ofAge[i].name, ofAge[j].name), g: grudges(ofAge[i].name, ofAge[j].name) });
  // a feud is held grudges between the families, not a low average: a village grows fond of itself over
  // the years, and one family's quarrel with another shows in a few people, not all of them
  // candidates deepest first: applyLegacies keeps the first of each kind whose names someone still holds
  const feuds = pairs.filter(p => p.g >= L.bonds.feudGrudges).sort((x, y) => y.g - x.g || x.v - y.v);
  const friends = pairs.filter(p => p.v >= L.bonds.friendAbove).sort((x, y) => y.v - x.v);
  for (const [list, kind] of [[feuds, 'feud'], [friends, 'friends']]) if (list.length && rnd() < L.bonds.chance) for (const p of list) out.bonds.push({ a: p.a, b: p.b, kind });
  return out;
}

/** How two families feel about each other on average, among their living members. */
function feeling(fa, fb) {
  const A = S.agents.filter(x => !x.dead && familyKey(x) === fa), B = S.agents.filter(x => !x.dead && familyKey(x) === fb);
  let s = 0, n = 0;
  for (const x of A) for (const y of B) { s += S.op[x.id][y.id] + S.op[y.id][x.id]; n += 2; }
  return n ? s / n : 0;
}

/** How many grudges were held between two families' members this age, either way. */
function grudges(fa, fb) {
  const ours = x => !(x.dead && x.dead.longAgo);   // this age's people, living or dead
  const A = S.agents.filter(x => ours(x) && familyKey(x) === fa), B = S.agents.filter(x => ours(x) && familyKey(x) === fb);
  let n = 0;
  for (const x of A) for (const y of B) n += (S.grudge[`${x.id}-${y.id}`] ? 1 : 0) + (S.grudge[`${y.id}-${x.id}`] ? 1 : 0);
  return n;
}

/** The enduring building that carries the families' arms: the church, if it stands. */
function carvingPlace() {
  const enduring = Object.values(P).filter(p => p.indoor && (BUILDINGS[p.def] || {}).legacy === 'enduring');
  return enduring.find(p => p.def === 'chapel') || enduring[0] || null;
}

/** Once the next age's people are in the valley: standing and old bonds take hold of the heirs.
 *  `successor(oldName)` gives the family that now holds an old family's name, and how ({ fam, how }), or
 *  null. A feud passes to whoever holds the name by descent, marriage or with the land (decided 31 Oct:
 *  newcomers take up the old feuds); a friendship only to true heirs. Returns the bonds that took hold. */
export function applyLegacies(out, families, successor) {
  const L = LEGACY, heirs = fam => S.agents.filter(a => !a.dead && familyKey(a) === fam);
  for (const r of families) {
    const now = heirs(r.later || r.name);
    if (!now.length || !r.standing) continue;
    const s = L.standing.effect[r.standing];
    for (const a of now) {
      a.coins = Math.round(a.coins * s.coins + s.add);
      for (const b of S.agents) if (!b.dead && familyKey(b) !== familyKey(a)) S.op[b.id][a.id] += s.regard;
    }
  }
  const took = [];
  for (const bond of out.bonds) {
    if (took.some(t => t.kind === bond.kind)) continue;   // one feud and one friendship at most
    const sa = successor(bond.a), sb = successor(bond.b);
    if (!sa || !sb || sa.fam === sb.fam) continue;
    const ok = bond.kind === 'feud' ? L.bonds.feudPasses : L.bonds.friendshipPasses;
    if (!ok.includes(sa.how) || !ok.includes(sb.how)) continue;
    const A = heirs(sa.fam), B = heirs(sb.fam), v = bond.kind === 'feud' ? L.bonds.feud : L.bonds.friends;
    if (!A.length || !B.length) continue;
    for (const x of A) for (const y of B) { S.op[x.id][y.id] = v + Math.round((rnd() - 0.5) * 10); S.op[y.id][x.id] = v + Math.round((rnd() - 0.5) * 10); if (bond.kind === 'feud') { S.grudge[`${x.id}-${y.id}`] = 1; S.grudge[`${y.id}-${x.id}`] = 1; } }
    took.push({ ...bond, newA: sa.fam, newB: sb.fam, newcomers: sa.how === 'land' || sb.how === 'land' });
  }
  return took;
}

/** The annals' line for a family's standing, landmark, carving or bond. */
export function legacyLine(kind, r, extra) {
  const L = LEGACY.lines, pl = n => familyPlural(n);
  if (kind === 'standing') return L.standing[r.standing].replace('{fam}', pl(r.later || r.name));
  if (kind === 'landmark') return extra.line.replace('{name}', extra.name).replace('{fam}', pl(r.name));
  if (kind === 'carved') return L.carved.replace('{fam}', pl(r.name)).replace('{place}', P[r.carved].name);
  if (kind === 'bond') return L[extra.kind === 'feud' && extra.newcomers ? 'feudLand' : extra.kind].replace('{a}', pl(extra.newA)).replace('{b}', pl(extra.newB)).replace('{oa}', pl(extra.a)).replace('{ob}', pl(extra.b));
  return '';
}
