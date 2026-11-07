// The ideas system: pressure builds, someone has the idea, argues for it, raises the money and
// builds it, and the village lives with the consequences. Everything specific to an idea comes
// from its record in src/data/ideas.js.
import { clearStakes, stakeOut } from './traces.js';
import { CHARGE_NAMES } from '../data/heraldry.js';
import { IDEA, IDEA_RULES, IDEAS } from '../data/ideas.js';
import { SEASON_DAYS, TPD, YEAR_DAYS } from '../data/world.js';
import { bringCase, startBuilding } from './civic.js';
import { effect, invalidateEffects } from './effects.js';
import { armsOf, familyKey, familyPlural } from './heraldry.js';
import { addPlace, routeLine, setCrossing } from './placement.js';
import { log } from './log.js';
import { SIGNALS } from './signals.js';
import { noteIdea } from './crossroads.js';
import { addDeed } from './dynasties.js';
import { addRumour, adj, glyph, mem, op } from './social.js';
import { LIVE, N, P, PN, S, byJob, household, isAdult, listNames, pick, rnd, techBuilt, techOn } from './state.js';

const lower = d => d.name.toLowerCase();
const REVIVE = 0.25;   // the chance an abandoned idea gets a fresh hearing when a new era opens

/** Whether an idea's requirements are built: each entry is an idea, or a list of which any one will do. */
export function requiresMet(d) {
  return d.requires.every(r => (Array.isArray(r) ? r.some(techBuilt) : techBuilt(r)));
}
/** Whether anyone could think of the idea at all here and now (possibleWhen names a signal). */
export function possible(d) {
  return !d.possibleWhen || !!SIGNALS[d.possibleWhen]();
}
/** Building one answer to a need eases the others: ideas pressed by the same signal lose most of their pressure. */
export function easeRivals(d) {
  const mine = Object.keys((d.pressure && d.pressure.when) || {});
  if (!mine.length) return;
  for (const e of IDEAS) {
    if (e === d || S.tech[e.id].state !== 'none') continue;
    if (Object.keys((e.pressure && e.pressure.when) || {}).some(k => mine.includes(k))) S.tech[e.id].pressure *= 0.4;
  }
}

/** How much an idea threatens someone's living (0 = not at all, 1 = takes it). */
export function threatOf(b, id) {
  const d = IDEA[id], t = S.tech[id];
  if (b.id === t.inventor) return 0;
  return (d.threatens && d.threatens[b.job]) || 0;
}

/** A backer or opponent tries to win someone over to their side of a live idea. */
export function pitch(a, b) {
  if (!isAdult(a) || !isAdult(b)) return false;
  for (const id in S.tech) {
    const t = S.tech[id]; if (t.state !== 'idea') continue;
    const stance = t.backers.includes(a.id) ? 1 : t.opponents.includes(a.id) ? -1 : 0; if (!stance) continue;
    if (t.backers.includes(b.id) || t.opponents.includes(b.id)) continue;
    if (rnd() > (t.favouredUntil > S.tick ? .42 : .28)) continue; // a favoured idea is argued for harder
    const inv = S.agents[t.inventor], d = IDEA[id], threat = threatOf(b, id);
    glyph(a, '…', 'rumour');
    if (stance > 0) {
      let sc = (op(b, inv) * .45 + op(b, a) * .35) / 100 + (d.inventorJobs.includes(b.job) ? .2 : 0) + (b.tr.diligence - .5) * .4 + rnd() * .5 - .35 - threat * .8 - (b.coins < 10 ? .15 : 0);
      if (op(b, inv) < -40) sc -= .5;
      if (sc > .12) {
        t.backers.push(b.id); adj(b, inv, 3);
        if (t.backers.length === d.backers) log(`${N(inv)} has enough backers for the ${lower(d)}. Now for the money.`, 'good', 'tech', { tech: id });
        else if (rnd() < .3) log(`${N(a)} talks ${N(b)} round to ${N(inv)}'s ${lower(d)}.`, 'event');
      } else if (sc < -.2) {
        t.opponents.push(b.id);
        if (threat >= 1) { mem(b, inv, 'is taking my living'); adj(b, inv, -8); log(`${N(b)} wants nothing to do with ${N(inv)}'s ${lower(d)}. It would cost ${N(b)} a living.`, 'bad', 'tech', { tech: id, ids: [b.id] }); }
        else if (op(b, inv) < -40) log(`${N(b)} won't back anything of ${N(inv)}'s, least of all a ${lower(d)}.`, 'bad', 'tech', { tech: id, ids: [b.id] });
      }
    } else {
      const sc = op(b, a) / 100 * .6 + threat * .6 - op(b, inv) / 100 * .4 + rnd() * .4 - .3;
      if (sc > .15) { t.opponents.push(b.id); if (rnd() < .35) log(`${N(a)} has turned ${N(b)} against the ${lower(d)}.`, 'bad'); }
    }
    return true;
  }
  return false;
}

/** Daily pressure: each unthought-of idea whose requirements are built gains its base plus any signals that hold. */
function buildPressure() {
  const held = {};
  for (const d of IDEAS) {
    const t = S.tech[d.id];
    // decided 4 Nov: an idea the village has set its face against is gone for the age. Each new era gives it
    // one chance of a fresh hearing (`revive`), and a crossroads may raise it again (src/sim/crossroads.js)
    if (t.state === 'abandoned' && (S.era || 0) > (t.reviewedEra ?? t.abandonedEra)) {
      t.reviewedEra = S.era || 0;
      if (rnd() < (d.revive ?? REVIVE)) { t.state = 'none'; t.fizzles = 1; t.pressure = 30; log(`With the new times there is talk of the ${lower(d)} again, though many said it was finished with.`, 'event', 'tech', { tech: d.id }); }
    }
    // an idea the valley itself rules out is said once, so the annals record why it never came
    if (t.state === 'none' && d.ruledOut && !t.ruledOut && requiresMet(d) && !possible(d)) { t.ruledOut = S.tick; log(d.ruledOut, 'event', 'tech', { tech: d.id, ruledOut: 1 }); }
    if (t.state !== 'none' || !requiresMet(d) || !possible(d)) continue;
    let v = d.pressure.base;
    for (const [sig, extra] of Object.entries(d.pressure.when || {})) {
      if (!(sig in held)) held[sig] = !!SIGNALS[sig]();
      v += held[sig] ? extra : 0;
    }
    t.pressure = Math.min(140, t.pressure + v);
  }
}

function inventorScore(a, d) {
  const b = d.inventorBias;
  const bias = b ? (b.invert ? 1 - a.tr[b.trait] : a.tr[b.trait]) * b.weight : 0;
  return a.tr.diligence * .6 + rnd() * .4 + bias;
}

/** Called when an idea is finished (at once, or after its build days). Shared by civic.js. */
export function honourInventor(d, inv) {
  if (!d.emblem || inv.dead) return;
  const fam = familyKey(inv), ar = armsOf(fam);
  if (ar.aug.length < 3 && !ar.aug.includes(d.id)) {
    ar.aug.push(d.id);
    log(`The ${fam} family add ${CHARGE_NAMES[d.emblem]} to their arms, in honour of ${N(inv)}'s ${lower(d)}.`, 'good', 'arms', { fam });
  }
  addDeed(inv, `${inv.name} thought of the ${lower(d)}, and saw it built`, 'honour');
}

/** Puts an idea's buildings (and any canal or railway line) into the valley. */
/** Puts up an idea's buildings, lines or crossing. `by` is whose idea it was, for the places' records;
 *  the chronicle says where each building went, and why there. */
export function raiseBuildings(d, by = null) {
  clearStakes(null, d.id);
  if (d.line) routeLine(d.line);
  if (d.crossing) setCrossing(d.crossing);
  for (const b of d.places || []) {
    const had = !!P[b], p = addPlace(b, b, { by: by ? by.name : null });
    if (p && !had && p.record && p.record.why) log(`${cap(p.name)} ${p.kind === 'field' ? 'are laid out' : 'goes up'} ${p.record.why}.`, 'event', 'work', { place: b });
  }
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function finish(d, t, inv, bk) {
  t.state = 'built'; t.builtAt = S.tick; invalidateEffects(); raiseBuildings(d, inv); easeRivals(d); noteIdea(d.id, 'built');
  for (const b of bk) if (b !== inv) adj(b, inv, 6);
  for (const o of t.opponents.map(i => S.agents[i])) adj(o, inv, -4);
  if (d.adoption) t.adopters = bk.filter(b => d.adoption.jobs.includes(b.job)).map(b => b.id);
  log(`The ${lower(d)} is finished: ${N(inv)}'s idea, paid for by ${listNames(bk.filter(b => b !== inv).slice(0, 5))}${bk.length > 6 ? ' and others' : ''}.`, 'good', 'tech', { tech: d.id, ids: [inv.id], built: 1 });
  for (const line of d.builtLines || []) log(line, 'event');
  honourInventor(d, inv);
}

/** How much a person's opposition weighs: the reeve, the richest families and those whose living the idea
 *  threatens count for more than an ordinary voice (IDEA_RULES.power). */
export function powerOf(a, d) {
  const P = IDEA_RULES.power, t = (d.threatens && d.threatens[a.job]) || 0;
  const rich = LIVE.filter(isAdult).sort((x, y) => y.coins - x.coins).slice(0, 3);
  return P.base + (a.job === 'reeve' ? P.reeve : 0) + (rich.includes(a) ? P.rich : 0) + (t >= 1 ? P.threatened : 0);
}
/** The family with the most money among its living members. */
function richestFamily() {
  const sums = {};
  for (const a of LIVE) if (isAdult(a)) sums[familyKey(a)] = (sums[familyKey(a)] || 0) + a.coins;
  return Object.entries(sums).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

/** An idea that has run out of time. Twice, and the village sets its face against it for the age. */
function fail(d, t, inv, opp, cost) {
  const id = d.id, lead = opp.slice().sort((a, b) => powerOf(b, d) - powerOf(a, d))[0];
  const reason = t.outvoted && lead ? 'opposed' : t.short ? 'money' : 'few';
  const fam = lead && familyKey(lead), rec = fam && S.dynasties && S.dynasties[fam];
  // a family that has stood against new things before: the annals remember the last time, by someone else
  const before = rec && reason === 'opposed' && [...rec.deeds].reverse().find(x => x.kind === 'opposed' && !x.text.startsWith(lead.name));
  const why = reason === 'opposed' ? `${listNames(opp.slice(0, 3))} stood against it` : reason === 'money' ? `the backers could not find the ${cost} pennies` : 'too few would back it';
  const said = reason === 'opposed' ? `${N(lead)} saw to that${opp.length > 1 ? `, with ${listNames(opp.filter(o => o !== lead).slice(0, 2))}` : ''}.${before ? ` The ${familyPlural(fam)} have stood against new things before: ${before.text}, in ${before.year}.` : ''}`
    : reason === 'money' ? `The backers could not find the ${cost} pennies between them.` : 'The village never quite took to it.';
  const e = log(`Nothing comes of ${N(inv)}'s ${lower(d)}. ${said}`, 'bad', 'tech', { tech: id, fizzle: 1, why: reason, ids: lead ? [inv.id, lead.id] : [inv.id], because: before && before.n ? [before.n] : [], fam: reason === 'opposed' ? fam : undefined });
  if (reason === 'opposed') addDeed(lead, `${lead.name} stood against the ${lower(d)}`, 'opposed', e && e.n);
  t.fizzles = (t.fizzles || 0) + 1;
  stakeOut(d, e && e.n);   // the plot stays pegged out while the idea hangs, for anyone to wonder at
  if (t.fizzles >= 2) {
    Object.assign(t, { state: 'abandoned', abandonedEra: S.era || 0, abandonedAt: S.tick, pressure: 0, backers: [], opponents: [], lostWhy: reason, lostTo: fam || null });
    const gone = reason === 'opposed' ? `The ${familyPlural(fam)} would not have it, and the village has given it up.` : reason === 'money' ? `Ashwood Fold could never raise the money, and the village has given it up.` : 'The village has set its face against it.';
    const end = log(`The ${lower(d)} is not to be. ${gone} Nobody will raise it again in these times.`, 'bad', 'tech', { tech: id, abandoned: 1, why: reason });
    stakeOut(d, end && end.n, true);
    noteIdea(id, 'abandoned', why);
  } else { Object.assign(t, { state: 'none', pressure: 40, backers: [], opponents: [], short: false, outvoted: false }); noteIdea(id, 'failed', why); }
}

/** One idea's day: thought of, argued over, funded, built, mended. */
function ideaDay(d) {
  const id = d.id, t = S.tech[id];
  if (t.state === 'none' && t.pressure >= 100 && requiresMet(d) && possible(d)) {
    const cands = LIVE.filter(a => isAdult(a) && d.inventorJobs.includes(a.job));
    if (!cands.length) return;
    let inv = null, best = -9;
    for (const a of cands) { const s = inventorScore(a, d); if (s > best) { best = s; inv = a; } }
    Object.assign(t, { state: 'idea', inventor: inv.id, backers: [inv.id], opponents: [], since: S.tick, short: false, outvoted: false });
    log(`${N(inv)} has an idea: a ${lower(d)} that ${d.what}. It will need ${d.backers} backers and ${d.cost} pennies.`, 'good', 'tech', { tech: id, ids: [inv.id], idea: 1 });
    noteIdea(id, 'thought');
  } else if (t.state === 'idea') {
    // Decided 4 Nov: an idea succeeds only when the valley allows it, the village can pay for it, and
    // the interests of its people come together. Opponents weigh by their power; the backers pay from
    // what they can spare; and the richest family's opposition makes the land dearer to come by.
    const inv = S.agents[t.inventor], R = IDEA_RULES;
    t.backers = t.backers.filter(i => !S.agents[i].dead); t.opponents = t.opponents.filter(i => !S.agents[i].dead);
    if (inv.dead) { t.state = 'none'; t.pressure = 50; log(`With ${N(inv)} gone, nobody takes up the ${lower(d)}.`, 'event', 'tech', { tech: id }); return; }
    const opp = t.opponents.map(i => S.agents[i]), weight = opp.reduce((s, o) => s + powerOf(o, d), 0);
    const rich = richestFamily(), landlord = rich && opp.some(o => familyKey(o) === rich);
    const cost = Math.round(d.cost * (landlord ? R.landlordMarkup : 1));
    if (t.backers.length - weight >= d.backers) {
      t.outvoted = false;
      const bk = t.backers.map(i => S.agents[i]), spare = b => Math.floor(Math.max(0, b.coins - R.reserve) * R.share);
      const avail = bk.reduce((s, b) => s + spare(b), 0);
      if (avail >= cost) {
        let left = cost;
        for (const b of bk.sort((x, y) => y.coins - x.coins)) { const g = Math.min(spare(b), Math.ceil(left)); b.coins -= g; left -= g; if (left <= 0) break; }
        if (d.buildDays) { for (const b of bk) if (b !== inv) adj(b, inv, 6); startBuilding(id); return; }
        finish(d, t, inv, bk);
      } else if (!t.short) { t.short = true; log(`${N(inv)} has the backers for the ${lower(d)}, but between them they cannot yet find the ${cost} pennies it will cost${landlord ? `, with the ${familyPlural(rich)} asking so much for the land` : ''}.`, 'event', 'tech', { tech: id }); }
    } else t.outvoted = weight > 0;
    if (t.state === 'idea' && S.tick - t.since > TPD * (R.window + d.cost * R.windowPerCost)) fail(d, t, inv, opp, cost);
  } else if (t.state === 'built' && t.brokenUntil && t.brokenUntil <= S.tick) {
    t.brokenUntil = 0; invalidateEffects();
    const inv = S.agents[t.inventor]; if (inv && !inv.dead) inv.coins = Math.max(0, inv.coins - 4);
    log(`The ${lower(d)} is mended and working again.`, 'event');
  }
}

/** Ideas bought one by one: those of the trade adopt it, or come to resent its inventor. */
function adoptionDay(d) {
  const a = d.adoption, t = S.tech[d.id], inv = S.agents[t.inventor];
  for (const w of LIVE) {
    if (!a.jobs.includes(w.job) || t.adopters.includes(w.id)) continue;
    const par = w.parents.find(p => t.adopters.includes(p));
    if (par != null || (op(w, inv) > a.minOpinion && w.coins >= a.cost && rnd() < a.chance)) {
      t.adopters.push(w.id);
      if (par == null) { w.coins -= a.cost; log(`${N(w)} gives in and buys a ${lower(d)}.`, 'event', 'tech', { tech: d.id, ids: [w.id] }); }
    } else if (!inv.dead) { adj(w, inv, a.resentment); if (!w.mem.some(m => m.t === a.memory)) mem(w, inv, a.memory); }
  }
}

/** A works takes on hands: poor youngsters and those in trades it is putting out of work. */
function hiringDay(d) {
  const h = d.hires, t = S.tech[d.id], own = S.agents[t.inventor];
  // Those who resent the works are counted before anyone is taken on today.
  const resenters = d.resentedBy ? LIVE.filter(w => d.resentedBy[w.job]).map(w => [w, d.resentedBy[w.job]]) : [];
  const hands = LIVE.filter(a => a.job === h.job).length;
  if (hands < effect('millHandsCap')) {
    for (const a of LIVE) {
      const poorKid = a.job === 'child' && a.age >= h.children.minAge && household(a.home).reduce((s, x) => s + x.coins, 0) < h.children.householdBelow;
      const thinFields = LIVE.filter(b => b.work === 'fields').length < 4;
      const from = h.fromJobs.concat(thinFields ? [] : h.fromJobsIfFieldsManned);
      if (!(poorKid || (isAdult(a) && from.includes(a.job)))) continue;
      if (own && !own.dead && op(a, own) < h.avoidsOwnerBelow) continue;
      if (!poorKid && a.coins >= h.maxCoins) continue;
      if (rnd() < h.chance) {
        const prev = a.job; a.prevJob = prev; a.job = h.job; a.work = h.place;
        log(poorKid ? `At ${Math.floor(a.age)}, ${N(a)} goes to work at the ${lower(d)}. The family needs the pennies.` : `${N(a)} gives up ${prev} work and takes a place at ${own && !own.dead ? N(own) + "'s" : 'the'} ${lower(d)}.`, 'event', 'work', { ids: [a.id] });
        break;
      }
    }
  }
  if (own && !own.dead) for (const [w, v] of resenters) adj(w, own, v);
}

/** One wrecking a night at most: someone who hates the inventor and fears for their living. */
function sabotageNight() {
  for (const d of IDEAS) {
    if (!d.sabotage) continue;
    const id = d.id;
    if (!techOn(id) || rnd() > .5) continue;
    const t = S.tech[id], inv = S.agents[t.inventor]; if (!inv || inv.dead) continue;
    if (S.tick - (t.lastWreck || -1e9) < TPD * SEASON_DAYS * (1 + (t.wrecks || 0))) continue;
    const angry = LIVE.filter(a => isAdult(a) && a !== inv && op(a, inv) < -50 && a.tr.scruple < .65 && a.tr.temper > .4 && (threatOf(a, id) > 0 || op(a, inv) < -70) && !(a.banned > S.tick));
    if (!angry.length) continue;
    const culprit = pick(angry); if (rnd() > .35) continue;
    t.brokenUntil = S.tick + TPD * 2; t.lastWreck = S.tick; t.wrecks = (t.wrecks || 0) + 1; invalidateEffects();
    mem(culprit, inv, 'smashed the machine');
    let sus = null, low = 0;
    for (const b of LIVE) if (b !== inv && isAdult(b) && op(inv, b) < low) { low = op(inv, b); sus = b; }
    let line = `In the night someone broke into ${PN(d.sabotage.place)} and wrecked ${d.sabotage.what}.`;
    if (sus) {
      adj(inv, sus, -18); mem(inv, sus, 'smashed the machine'); addRumour(sus.id, 'smashed the ' + lower(d), inv);
      line += ` ${N(inv)} blames ${N(sus)}${sus === culprit ? ', rightly.' : `. It was ${N(culprit)}.`}`;
      bringCase(sus, inv, `wrecking the ${lower(d)}`, .25, sus === culprit);
    } else line += ` It was ${N(culprit)}, though nobody suspects it.`;
    log(line, 'bad', 'crime', { tech: id, ids: [culprit.id], sabotage: 1 });
    break;
  }
}

export function techDay() {
  buildPressure();
  for (const d of IDEAS) ideaDay(d);
  for (const d of IDEAS) if (d.adoption && techOn(d.id)) adoptionDay(d);
  for (const d of IDEAS) if (d.hires && techOn(d.id)) hiringDay(d);
  sabotageNight();
}
