// The interlude: an age closes and the centuries pass. What survives into the next age follows from
// what the village became: enduring buildings stay, adaptable ones are rebuilt for new uses or fall
// to ruin, replaceable ones vanish but their sites are remembered. Lanes, clearings and the crossing
// carry on. Families come through or are lost by the dice, weighted by how many there are and how
// much they mattered. Then the next age's people take up the valley, as heirs or namesakes.
import { AGES } from '../data/ages.js';
import { BUILDINGS } from '../data/buildings.js';
import { interludeFor } from '../data/interludes.js';
import { TPD, YEAR_DAYS } from '../data/world.js';
import { recordFamilies } from './dynasties.js';
import { invalidateEffects } from './effects.js';
import { armsOf, familyKey, familyPlural } from './heraldry.js';
import { log } from './log.js';
import { foundCast } from './setup.js';
import { placeFounding } from './placement.js';
import { calYear, currentAge, P, refreshLive, rnd, S, setState, yearOf } from './state.js';

const AUTO_DAYS = YEAR_DAYS * 3;   // if the player does not begin the interlude, it begins on its own after three years
const lower = s => s.replace(/^The /, 'the ');

/** Years the village has spent in its present age. */
export function yearsInAge() {
  return yearOf() - (S.ageFrom || 1) + 1;
}

/** Whether the age has run its course: its last era has opened and enough years have passed, or the
 *  age has gone on as long as it can. Only then may the interlude begin. */
export function interludeReady() {
  const a = currentAge();
  if (!a.next) return false;
  const y = yearsInAge();
  return (S.era >= a.eras.length - 1 && y >= a.minYears) || y >= a.maxYears;
}

/** Each night: notice when the age is ready to close, and close it on its own if the player lets it lie. */
export function interludeDay() {
  if (!interludeReady()) return;
  if (!S.ageEnding) {
    S.ageEnding = S.tick;
    log(`${currentAge().name} is drawing to its close. The valley is ready for what comes next, whenever that may be.`, 'nudge', null);
  } else if (S.tick - S.ageEnding >= AUTO_DAYS * TPD) beginInterlude();
}

/** Closes this age and opens the next, centuries later. */
export function beginInterlude() {
  const from = currentAge(), to = AGES[from.next];
  if (!to) return false;
  const I = interludeFor(from.id, to.id), endYear = calYear();
  const say = (text, extra = {}) => log(text, 'event', 'interlude', { age: from.id, ...extra });
  recordFamilies();
  say(`So ends ${lower(from.name)}, in ${endYear}. What follows is the story of ${to.startYear - endYear} years, told briefly.`);

  // --- families: who comes through ---
  const H = S.history || (S.history = { ages: [], sites: [], eraTitles: {} });
  const living = Object.values(S.dynasties || {}).filter(r => r.living > 0);
  const kept = [], lost = [];
  // the centuries' events in order: those before the great mortality, then the mortality and what it did
  // to each family, then the rest
  const tell = e => { if (e.when && !P[e.when] && !(S.tech[e.when] && S.tech[e.when].state === 'built')) return; say(e.text.replace('{place}', P[e.when] ? P[e.when].name : '')); };
  const plagueYear = I && I.plague ? I.plague.year : Infinity;
  for (const e of (I ? I.events : []).filter(e => e.year < plagueYear)) tell(e);
  if (I && I.plague) say(I.plague.text);
  for (const r of living) {
    const honour = r.deeds.filter(d => d.kind !== 'disgrace').length;
    const chance = Math.min(0.85, 0.25 + 0.1 * Math.min(r.living, 5) + 0.06 * Math.min(honour, 4));
    (rnd() < chance ? kept : lost).push(r);
  }
  const words = (list, i) => list[i % list.length];
  for (const [i, r] of lost.entries()) { r.gone = r.gone || endYear; r.fate = I ? words(I.lostWords, i) : 'were lost'; say(`The ${plural(r.name)} ${r.fate}.`); }
  for (const [i, r] of kept.entries()) {
    const later = (from.lineage || {})[r.name] || r.name;
    r.fate = I ? words(I.keptWords, i) : 'came through';
    r.later = later;
    say(`The ${plural(r.name)} ${r.fate}.${later !== r.name ? ` By ${to.startYear} the name was spelt ${later}.` : ''}`);
  }

  // --- what else happened in between ---
  for (const e of (I ? I.events : []).filter(e => e.year >= plagueYear)) tell(e);

  // --- places: by their legacy ---
  const known = new Set([...to.founding, ...to.ideas.flatMap(d => d.places || [])]);
  const crofts = [];
  for (const p of Object.values(P)) {
    const def = BUILDINGS[p.def] || {};
    if (p.def === 'ruin' || def.legacy === 'enduring') { if (p.def !== 'ruin') say(`${cap(p.name)} ${p.indoor || def.archetype === 'market' ? 'still stands' : 'is still there'}, as it has been since ${firstYearOf(p)}.`, { place: p.id }); continue; }
    if (def.legacy === 'adaptable' && known.has(p.id)) {
      const was = p.name, now = (to.placeNames || {})[p.def] || def.name;
      Object.assign(p, { name: now, age: to.id, era: 0, rebuilt: S.tick });
      say(was === now ? `${cap(was)} still stands, rebuilt on its old footings.` : `${cap(was)} was rebuilt many times on the same footings, and is ${now} now.`, { place: p.id });
      continue;
    }
    if (def.legacy === 'adaptable') {
      Object.assign(p, { def: 'ruin', kind: 'open', indoor: false, home: false, ruinOf: p.def, wasName: p.name, name: `the ruins of ${lower(p.name)}` });
      say(`${cap(p.wasName)} fell out of use. Its walls still stand, roofless.`, { place: p.id });
      continue;
    }
    // replaceable: gone, but the valley remembers where it stood
    H.sites.push({ name: p.name, def: p.def, x: p.x, y: p.y, w: p.w, h: p.h, age: from.id, year: firstYearOf(p), walls: !!p.indoor });
    if (p.home) crofts.push(p.name); else say(`Of ${p.name} nothing is left but a change in the grass.`);
    delete P[p.id];
  }
  if (crofts.length) say(`Of ${crofts.length > 1 ? `${crofts[0]} and the other ${crofts.length - 1} homes of those days` : crofts[0]} nothing remains but low banks in the grass.`);
  if (S.crossing) say(S.crossing.kind !== 'ford' ? 'The bridge was mended many times, and still carries the lane over the river.' : 'The ford is still the only way over the river.');
  const lanes = Object.keys(S.roads || {}).length;
  if (lanes) say('The old lanes are still the ways through the village, though few remember who first wore them.');

  // --- the people of the old age pass into the record ---
  for (const a of S.agents) if (!a.dead) a.dead = { t: S.tick, cause: 'long ago', age: a.age, longAgo: true, ageName: from.name };
  H.ages.push({ id: from.id, endYear, families: living.map(r => ({ name: r.name, fate: r.fate, later: r.later || null })) });
  H.eraTitles[from.id] = S.eraTitles || {};

  // --- the clock: the next age opens in the spring of its first year ---
  const y = yearOf(), next = y * YEAR_DAYS * TPD + 36;
  S.tick = next;
  S.ageFrom = yearOf(next);
  S.yearBase = to.startYear - S.ageFrom + 1;
  Object.assign(S, {
    age: to.id, era: 0, eraTitles: {}, ageEnding: null,
    stores: { grain: 160, flour: 30, bread: 30, missing: 0 }, pantry: {}, storm: 0, fair: null, rumours: [], gathers: [], cases: [],
    election: null, nextElection: next + (YEAR_DAYS + 2) * TPD, reeveSince: null, lastElection: null, vacant: [], spoil: 0, harvest: 0,
    foot: {}, wornFor: {}, cool: {}, lastThief: -1,
    xr: { held: {}, open: [], past: [], era: 0, used: 0, crisisUsed: false, closedAt: {} },
  });
  const oldTech = S.tech;
  H.tech = { ...(H.tech || {}), [from.id]: oldTech };
  setState(S); // switches the live ideas, crossroads and names to the new age
  S.tech = {};
  for (const d of to.ideas) {
    const t = { state: 'none', pressure: 0, backers: [], opponents: [], adopters: [] };
    const before = oldTech[d.id];
    const stands = (d.places || []).length ? d.places.every(id => P[id] && P[id].def !== 'ruin') : d.crossing ? S.crossing && S.crossing.kind === d.crossing : false;
    if (before && before.state === 'built' && stands) Object.assign(t, { state: 'built', builtAt: S.tick, inherited: true, inventor: null });
    S.tech[d.id] = t;
  }
  invalidateEffects();

  // --- the new village: its buildings around what survived, and its people ---
  placeFounding();
  // the new village over the old: a few of the new buildings stand where old ones stood
  let over = 0;
  for (const p of Object.values(P)) {
    if (p.built !== S.tick || over >= 3) continue;
    const site = H.sites.find(s => !s.found && s.x < p.x + p.w && p.x < s.x + s.w && s.y < p.y + p.h && p.y < s.y + s.h);
    if (site) { site.found = S.tick; over++; say(p.kind === 'field' ? `${cap(p.name)} lie where ${site.name} lay.` : `${cap(p.name)} stands where ${site.name} stood.`, { place: p.id }); }
  }
  for (const r of kept) if (S.arms && S.arms[r.name] && r.later && !S.arms[r.later]) S.arms[r.later] = S.arms[r.name];
  say(`It is ${to.startYear}. The valley's story takes up again.`);
  const before = S.agents.length;
  foundCast({ ...to.cast, prologue: to.cast.prologue.map(l => l.replace(/^Spring, and the first year of this chronicle\. /, '')) });
  // heirs and namesakes: each new family that bears an old name
  for (const fam of new Set(S.agents.slice(before).map(familyKey))) {
    const old = kept.find(r => r.later === fam) || living.concat(Object.values(S.dynasties || {})).find(r => ((from.lineage || {})[r.name] || r.name) === fam && r.name !== fam);
    const rec = S.dynasties[fam];
    if (!old || !rec) continue;
    if (kept.includes(old)) {
      Object.assign(rec, { first: old.first, descends: old.name, deeds: [...old.deeds, ...rec.deeds] });
      armsOf(fam);
      say(`The ${plural(fam)} are the oldest family in the valley: there have been ${plural(old.name)} here since ${old.first}.`);
    } else {
      rec.namesake = old.name;
      say(`The ${plural(fam)} are newcomers, though they took their name from the old ${plural(old.name)}' land.`);
    }
  }
  refreshLive();
  return true;
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const plural = familyPlural;
function firstYearOf(p) { return (S.yearBase ?? currentAge().startYear) + yearOf(p.built || 0) - 1; }
export { AUTO_DAYS };
