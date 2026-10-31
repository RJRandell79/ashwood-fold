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
  // the deepest feud and the warmest friendship between families that both came through may be remembered
  const pairs = [];
  for (let i = 0; i < kept.length; i++) for (let j = i + 1; j < kept.length; j++) pairs.push({ a: kept[i].name, b: kept[j].name, v: feeling(kept[i].name, kept[j].name) });
  const feud = pairs.filter(p => p.v <= L.bonds.feudBelow).sort((x, y) => x.v - y.v)[0];
  const friends = pairs.filter(p => p.v >= L.bonds.friendAbove).sort((x, y) => y.v - x.v)[0];
  for (const [p, kind] of [[feud, 'feud'], [friends, 'friends']]) if (p && rnd() < L.bonds.chance) out.bonds.push({ a: p.a, b: p.b, kind });
  return out;
}

/** How two families feel about each other on average, among their living members. */
function feeling(fa, fb) {
  const A = S.agents.filter(x => !x.dead && familyKey(x) === fa), B = S.agents.filter(x => !x.dead && familyKey(x) === fb);
  let s = 0, n = 0;
  for (const x of A) for (const y of B) { s += S.op[x.id][y.id] + S.op[y.id][x.id]; n += 2; }
  return n ? s / n : 0;
}

/** The enduring building that carries the families' arms: the church, if it stands. */
function carvingPlace() {
  const enduring = Object.values(P).filter(p => p.indoor && (BUILDINGS[p.def] || {}).legacy === 'enduring');
  return enduring.find(p => p.def === 'chapel') || enduring[0] || null;
}

/** Once the next age's people are in the valley: standing and old bonds take hold of the heirs. */
export function applyLegacies(out, families) {
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
  for (const bond of out.bonds) {
    const later = n => (families.find(r => r.name === n) || {}).later || n;
    const A = heirs(later(bond.a)), B = heirs(later(bond.b)), v = bond.kind === 'feud' ? L.bonds.feud : L.bonds.friends;
    for (const x of A) for (const y of B) { S.op[x.id][y.id] = v + Math.round((rnd() - 0.5) * 10); S.op[y.id][x.id] = v + Math.round((rnd() - 0.5) * 10); if (bond.kind === 'feud') { S.grudge[`${x.id}-${y.id}`] = 1; S.grudge[`${y.id}-${x.id}`] = 1; } }
  }
}

/** The annals' line for a family's standing, landmark, carving or bond. */
export function legacyLine(kind, r, extra) {
  const L = LEGACY.lines, pl = n => familyPlural(n);
  if (kind === 'standing') return L.standing[r.standing].replace('{fam}', pl(r.later || r.name));
  if (kind === 'landmark') return extra.line.replace('{name}', extra.name).replace('{fam}', pl(r.name));
  if (kind === 'carved') return L.carved.replace('{fam}', pl(r.name)).replace('{place}', P[r.carved].name);
  if (kind === 'bond') return L[extra.kind].replace('{a}', pl(extra.a)).replace('{b}', pl(extra.b));
  return '';
}
