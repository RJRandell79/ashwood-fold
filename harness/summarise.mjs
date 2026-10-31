// Runs one whole game headlessly and boils it down to a plain record for the diversity report:
// what was built and when, how the people and buildings fared, what the valley was like, and what
// the player's stand-in (a crossroads policy) chose. Records are plain JSON so they can come back
// from worker threads.
import { run } from './lib.mjs';
import { POLICIES } from './policies.mjs';
import { checkInvariants } from './invariants.mjs';
import { TPD, YEAR_DAYS } from '../src/data/world.js';
import { AGES, FIRST_AGE } from '../src/data/ages.js';
import { valley } from '../src/sim/valley.js';
import { lineDifficulty, settlementCentre } from '../src/sim/placement.js';
import { calYear } from '../src/sim/state.js';
import { LINES } from '../src/data/buildings.js';

const YEAR_TICKS = TPD * YEAR_DAYS;
const yearOf = t => Math.floor(t / YEAR_TICKS) + 1;
const WATERWAY = Object.keys(LINES).find(k => LINES[k].water);
let counter = 0;

/** What the valley is like around its first hearth, judged before anything is built. */
export function geography(seed) {
  const v = valley(seed), h = v.hearth;
  let cells = 0, flat = 0, wood = 0, fertile = 0;
  for (let y = Math.floor(h.y) - 20; y <= h.y + 20; y++) for (let x = Math.floor(h.x) - 20; x <= h.x + 20; x++) {
    if (x < 0 || y < 0 || x >= v.W || y >= v.H || Math.hypot(x + 0.5 - h.x, y + 0.5 - h.y) > 20) continue;
    const i = y * v.W + x;
    if (v.water[i]) continue;
    cells++; fertile += v.fertile[i];
    if (v.slope[i] < 0.25 && v.flood[i] === 0) flat++;
    if (v.wood[i]) wood++;
  }
  return { flat: flat / cells, wood: wood / cells, fertile: fertile / cells, river: v.halfWidth(h.x) * 2 };
}

/** One whole game from `seed` under a crossroads `policy`, for `years` game years. */
export function summarise(seed, { years = 90, policy = 'never' } = {}) {
  const taken = [], offered = new Set(), name = `_count${counter++}`;
  POLICIES[name] = s => {
    const answer = POLICIES[policy](s);
    return (S, o) => { offered.add(`${S.age}:${o.id}:${o.at ?? o.opened ?? ''}`); const k = answer(S, o); if (k != null && k >= 0) taken.push({ age: S.age, id: o.id, k }); return k; };
  };
  const pop = [], places = [], eraAt = [], problems = [];
  let seen = -1;
  const notes = [];
  const S = run(seed, {
    years, policy: name,
    onYear: (st, y) => {
      for (const p of checkInvariants(st)) problems.push(`year ${y}: ${p}`);
      pop.push(st.agents.filter(a => !a.dead).length);
      places.push(Object.keys(st.places).length);
      eraAt.push(`${st.age}:${st.era}`);
      // annals are capped in length, so keep what each year adds
      for (const e of st.annals) if (e.t > seen) notes.push({ t: e.t, c: e.c, era: e.era, age: e.age, tech: e.tech, fizzle: e.fizzle, abandoned: e.abandoned, rebuild: /rebuilt in/.test(e.h), storm: /thatch from|slates from/.test(e.h), decay: /falling down/.test(e.h) });
      if (st.annals.length) seen = Math.max(seen, st.annals[st.annals.length - 1].t);
    },
  });
  delete POLICIES[name];

  const H = S.history || { ages: [] }, closed = H.ages[0] || null;
  const boundary = closed ? (S.ageFrom - 1) * YEAR_TICKS : Infinity;
  const ageOf = t => (closed && t < boundary ? closed.id : S.age);
  const techOf = age => (age === S.age ? S.tech : (H.tech && H.tech[age]) || {});
  const built = {}, abandoned = {}, fizzles = {};
  for (const a of Object.values(AGES)) for (const d of a.ideas) {
    const t = techOf(a.id)[d.id];
    if (t && t.state === 'built' && !t.inherited) built[`${a.id}:${d.id}`] = calYear(t.builtAt);
  }
  const eras = {};
  for (const e of notes) {
    const age = e.age || ageOf(e.t);
    if (e.c === 'era') eras[`${age}:${e.era}`] = calYear(e.t);
    if (e.abandoned && e.tech) abandoned[`${age}:${e.tech}`] = true;
    if (e.fizzle) fizzles[age] = (fizzles[age] || 0) + 1;
  }
  // ages run by game year: how long the village spent in each era
  const runs = []; for (const k of eraAt) { if (runs.length && runs[runs.length - 1].k === k) runs[runs.length - 1].n++; else runs.push({ k, n: 1 }); }
  const firstAge = [], lastAge = [];
  eraAt.forEach((k, i) => (k.startsWith(`${FIRST_AGE}:`) && closed ? firstAge : lastAge).push(i));
  const deaths = {};
  for (const a of S.agents) if (a.dead && !a.dead.longAgo) { const c = a.dead.exiled ? 'left' : String(a.dead.cause).replace(/\b(his|her)\b/, 'their'); deaths[c] = (deaths[c] || 0) + 1; }
  const dyn = Object.values(S.dynasties || {});
  const centre = settlementCentre();
  return {
    seed, policy, years, problems: problems.slice(0, 20), broken: problems.length,
    age: S.age, era: S.era,
    interlude: closed ? closed.endYear : null,
    built, abandoned, fizzles, eras,
    longestEra: Math.max(...runs.map(r => r.n)),
    pop, places,
    popFirst: firstAge.map(i => pop[i]), popLast: lastAge.map(i => pop[i]),
    placesFirst: firstAge.map(i => places[i]), placesLast: lastAge.map(i => places[i]),
    living: pop[pop.length - 1], deaths,
    families: closed ? {
      atClose: closed.families.length,
      kept: closed.families.filter(f => f.kept).map(f => f.name),
      lost: closed.families.filter(f => !f.kept).map(f => f.name),
      heirs: dyn.filter(r => r.descends).length,
      namesakes: dyn.filter(r => r.namesake).length,
      heirsLiving: dyn.filter(r => r.descends && S.agents.some(a => !a.dead && a.name.split(' ').slice(1).join(' ') === r.name)).length,
      how: dyn.filter(r => r.how && (r.descends || r.namesake)).map(r => r.how),
      standing: closed.families.filter(f => f.kept).map(f => f.standing),
      landmarks: closed.families.filter(f => f.landmark).length,
      landmarksLost: closed.families.filter(f => f.landmark && !f.kept).length,
      carved: closed.families.filter(f => f.carved).length,
      bonds: (closed.bondsKept || []).map(b => (b.newcomers ? `${b.kind} (newcomers)` : b.kind)),
    } : null,
    buildings: closed && closed.places ? {
      stood: closed.places.stood.length, rebuilt: closed.places.rebuilt.length, ruined: closed.places.ruined.length, gone: closed.places.gone.length,
      ruins: Object.values(S.places).filter(p => p.def === 'ruin').length,
      heartMoved: closed.centre ? Math.hypot(centre.x - closed.centre.x, centre.y - closed.centre.y) : null,
      onOldSites: (H.sites || []).filter(s => s.found).length,
      builtAfresh: Object.keys(S.places).filter(id => id.startsWith('ruin-')).length,
    } : null,
    geo: { ...geography(S.valley.seed), canal: lineDifficulty(WATERWAY) },
    farBank: Object.values(S.places).filter(p => { const v = valley(S.valley.seed); return p.y + p.h / 2 > v.riverY(p.x + p.w / 2); }).length,
    crossing: S.crossing ? S.crossing.kind : null,
    rebuilds: notes.filter(e => e.rebuild).length, storms: notes.filter(e => e.storm).length, decayed: notes.filter(e => e.decay).length,
    offered: offered.size, taken,
  };
}
