// Crossroads (see src/data/crossroads.js): when a pressure has held long enough, the village reaches a
// crossroads and the player may tip the balance once, or let it be. Choices lean the village towards an
// idea or prompt a one-off act; whether anything comes of it is still up to the villagers, and the annals
// follow up with what happened and why.
//
// State lives in S.xr: { held, open, past, era, used, crisisUsed, closedAt }.
import { COOLDOWN_DAYS, CROSSROAD, CROSSROADS, FAVOUR_DAYS, MAX_OPEN, NUDGES_PER_ERA, OPEN_DAYS } from '../data/crossroads.js';
import { IDEA } from '../data/ideas.js';
import { TPD, YEAR_DAYS } from '../data/world.js';
import { effect } from './effects.js';
import { possible, requiresMet } from './ideas.js';
import { log } from './log.js';
import { SIGNALS } from './signals.js';
import { adj, mem } from './social.js';
import { calYear, isAdult, listNames, LIVE, N, rnd, S } from './state.js';

const lower = d => d.name.toLowerCase();

function xr() {
  return S.xr || (S.xr = { held: {}, open: [], past: [], era: S.era || 0, used: 0, crisisUsed: false, closedAt: {} });
}

/** The options of a crossroads that make sense now (an idea already built or set aside is not offered). */
export function optionsOf(c) {
  return c.options.map((o, k) => ({ ...o, k })).filter(o => {
    if (o.relief) return true;
    const d = IDEA[o.favour], t = S.tech[o.favour];
    return d && t && (t.state === 'none' || t.state === 'idea') && requiresMet(d) && possible(d);
  });
}

/** Whether this era still has room for a crossroads like this one. */
export function hasRoom(c) {
  const X = xr();
  return X.used < NUDGES_PER_ERA || (c.crisis && !X.crisisUsed);
}

/** How serious a pressure has become, in words: it grows the longer it has held. */
export function severity(o) {
  const c = CROSSROAD[o.id], held = xr().held[o.id] || 0;
  return held >= c.days * 3 ? 'grave' : held >= c.days * 2 ? 'serious' : 'growing';
}

/** Each night: count how long each pressure has held, open crossroads, close those whose time is up. */
export function crossroadsDay() {
  const X = xr();
  if ((S.era || 0) !== X.era) { X.era = S.era || 0; X.used = 0; X.crisisUsed = false; }
  for (const o of [...X.open]) if (S.tick >= o.closes) close(o, null);
  for (const c of CROSSROADS) X.held[c.id] = SIGNALS[c.when]() ? (X.held[c.id] || 0) + 1 : 0;
  for (const c of CROSSROADS) {
    if (X.open.length >= MAX_OPEN) break;
    if ((X.held[c.id] || 0) < c.days || X.open.some(o => o.id === c.id)) continue;
    if (S.tick - (X.closedAt[c.id] ?? -1e12) < COOLDOWN_DAYS * TPD || !hasRoom(c) || !optionsOf(c).length) continue;
    X.open.push({ id: c.id, opened: S.tick, closes: S.tick + OPEN_DAYS * TPD });
    log(`The village is at a crossroads: ${c.title.toLowerCase()}.`, 'nudge', null, { xr: c.id });
  }
  // favours that run out before anyone so much as thinks of the idea
  for (const p of X.past) {
    if (p.status !== 'favoured' || S.tick < p.until) continue;
    const d = IDEA[p.idea], t = S.tech[p.idea];
    if (t.state !== 'none') continue;
    p.status = 'faded';
    const can = LIVE.some(a => isAdult(a) && d.inventorJobs.includes(a.job));
    log(`For all the talk of a ${lower(d)} since ${calYear(p.at)}, ${can ? 'nobody ever took it up' : 'there was nobody in the village with the trade to take it up'}.`, 'event', 'crossroads', { tech: p.idea, xr: p.id });
  }
}

function close(o, choice) {
  const X = xr();
  X.open = X.open.filter(x => x !== o);
  X.closedAt[o.id] = S.tick;
  if (!choice) X.past.push({ id: o.id, at: S.tick, label: 'Let it be', status: 'let be' });
}

/** The player's answer to an open crossroads: an option's index, or -1 to let it be. Returns a line for the page. */
export function choose(id, k) {
  const X = xr(), o = X.open.find(x => x.id === id), c = CROSSROAD[id];
  if (!o) return null;
  if (k < 0) { close(o, null); log(`The village is left to find its own way.`, 'event'); return 'Left to its own devices.'; }
  const opt = optionsOf(c).find(x => x.k === k);
  if (!opt) return null;
  if (X.used < NUDGES_PER_ERA) X.used++; else X.crisisUsed = true;
  close(o, opt);
  const entry = { id, at: S.tick, label: opt.label, status: 'done' };
  X.past.push(entry);
  if (opt.favour) favour(entry, opt.favour);
  else entry.result = RELIEF[opt.relief](entry);
  return entry.result || opt.intent;
}

function favour(entry, ideaId) {
  const d = IDEA[ideaId], t = S.tech[ideaId];
  Object.assign(entry, { idea: ideaId, status: 'favoured', until: S.tick + FAVOUR_DAYS * TPD });
  t.favouredUntil = entry.until;
  if (t.state === 'none') t.pressure = Math.min(140, t.pressure + 70);
  log(`Talk in the village turns to a ${lower(d)}. People who had never thought of it are thinking of it now.`, 'nudge', 'crossroads', { tech: ideaId, xr: entry.id });
}

/** Called by the ideas engine when a favoured idea is thought of, built, or fails, to tell the rest of the story. */
export function noteIdea(ideaId, what, why) {
  const X = S.xr; if (!X) return;
  const p = [...X.past].reverse().find(e => e.idea === ideaId && (e.status === 'favoured' || e.status === 'thought'));
  if (!p) return;
  const d = IDEA[ideaId], since = `since the village spoke for it in ${calYear(p.at)}`;
  if (what === 'thought') { p.status = 'thought'; return; }
  if (what === 'built') { p.status = 'built'; log(`The ${lower(d)} is built, ${since}.`, 'good', 'crossroads', { tech: ideaId, xr: p.id }); }
  if (what === 'failed') log(`The ${lower(d)} the village spoke for in ${calYear(p.at)} has come to nothing for now: ${why}.`, 'bad', 'crossroads', { tech: ideaId, xr: p.id });
  if (what === 'abandoned') { p.status = 'failed'; log(`In the end the village would not have the ${lower(d)}, ${since}: ${why}.`, 'bad', 'crossroads', { tech: ideaId, xr: p.id }); }
}

// One-off acts. Each returns a short account of what happened, and logs it in the annals.
const adults = () => LIVE.filter(isAdult);
const RELIEF = {
  /** The better-off club together for a cartload of corn. It may not be enough. */
  corn(entry) {
    const cost = effect('cornCartCost'), payers = [];
    let left = cost;
    for (const a of adults().sort((x, y) => y.coins - x.coins)) {
      if (left <= 0) break;
      if (a.coins < 4 || rnd() > 0.35 + a.tr.warmth * 0.6) continue;
      const g = Math.min(Math.floor(a.coins * 0.6), Math.ceil(left)); payers.push([a, g]); left -= g;
    }
    if (left > 0) {
      const line = payers.length ? `${listNames(payers.map(p => p[0]))} put in what they could, but the village could not raise the price of a cartload.` : 'Nobody with money would put it in, and no corn came.';
      log(`The village tries to send for corn. ${line}`, 'bad', 'crossroads', { xr: entry.id, ids: payers.map(p => p[0].id) });
      entry.status = 'failed'; return line;
    }
    for (const [a, g] of payers) { a.coins -= g; for (const b of LIVE) if (b !== a && !payers.some(p => p[0] === b)) adj(b, a, 4); }
    S.stores.grain += 70;
    const line = `${listNames(payers.map(p => p[0]))} paid for a cartload of corn from the next valley.`;
    log(line, 'good', 'crossroads', { xr: entry.id, ids: payers.map(p => p[0].id), place: 'mill' });
    return line;
  },
  /** Those with full purses are asked to help those with none. Not all will. */
  alms(entry) {
    const rich = adults().filter(a => a.coins >= 15).sort((x, y) => y.coins - x.coins).slice(0, 4);
    const poor = adults().filter(a => a.coins < 4);
    if (!rich.length || !poor.length) { const line = 'There was nobody with much to give, or nobody in great need.'; log(`The village is asked to share. ${line}`, 'event', 'crossroads', { xr: entry.id }); return line; }
    const gave = [], refused = [];
    for (const r of rich) {
      if (rnd() < 0.2 + r.tr.warmth * 0.7) { const g = Math.floor(r.coins * 0.3); r.coins -= g; gave.push(r); poor.forEach(p => { p.coins += g / poor.length; adj(p, r, 10); mem(p, r, 'helped us through the hard times'); }); }
      else { refused.push(r); poor.forEach(p => { adj(p, r, -8); mem(p, r, 'would not help when we were in need'); }); }
    }
    const line = `${gave.length ? `${listNames(gave)} gave to the families in need.` : 'Nobody gave.'}${refused.length ? ` ${listNames(refused)} would not, and it was noticed.` : ''}`;
    log(line, gave.length ? 'good' : 'bad', 'crossroads', { xr: entry.id, ids: [...gave, ...refused].map(a => a.id) });
    if (!gave.length) entry.status = 'failed';
    return line;
  },
  /** A peacemaking at the chapel: the feuding are asked to shake hands. The forgiving may; the proud may not. */
  reconcile(entry) {
    const feuds = Object.entries(S.pair).filter(([, v]) => v === 'feud').map(([k]) => k.split('-').map(Number)).filter(([a, b]) => !S.agents[a].dead && !S.agents[b].dead);
    const made = [], refused = [];
    for (const [i, j] of feuds) {
      const a = S.agents[i], b = S.agents[j];
      if (rnd() < (a.tr.forgive + b.tr.forgive) / 2 + 0.15) {
        S.op[i][j] = Math.max(S.op[i][j], 5); S.op[j][i] = Math.max(S.op[j][i], 5); S.pair[`${i}-${j}`] = 'none';
        delete S.grudge[`${i}-${j}`]; delete S.grudge[`${j}-${i}`]; mem(a, b, 'shook hands with me at the chapel'); mem(b, a, 'shook hands with me at the chapel'); made.push(`${N(a)} and ${N(b)}`);
      } else { adj(a, b, -5); adj(b, a, -5); refused.push(`${N(a)} and ${N(b)}`); }
    }
    const also = (list, verb) => list.length > 1 ? `, and so ${verb} ${list.slice(1).join(', ').replace(/, ([^,]*)$/, ', and $1')}` : '';
    const line = `${made.length ? `${made[0]} shook hands at the chapel${also(made, 'did')}.` : 'Nobody would shake hands at the chapel.'}${refused.length ? ` ${refused[0]} would not${refused.length > 1 ? `, nor would ${refused.slice(1).join(', ').replace(/, ([^,]*)$/, ', or $1')}` : ''}, and they left angrier than they came.` : ''}`;
    log(line, made.length ? 'good' : 'bad', 'crossroads', { xr: entry.id, place: 'chapel' });
    if (!made.length) entry.status = 'failed';
    return line;
  },
  /** New houses squeeze in close by the lanes for a few years. */
  infill(entry) {
    S.infillUntil = S.tick + TPD * YEAR_DAYS * 3;
    const line = 'For a few years, new houses will be squeezed in near the Green rather than spread out along the valley.';
    log(`The village agrees to build closer in. ${line}`, 'event', 'crossroads', { xr: entry.id, place: 'square' });
    return line;
  },
};
export const RELIEFS = Object.keys(RELIEF);
