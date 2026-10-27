// What built ideas do to the village, read from the `effects` of each record in src/data/ideas.js.
import { EFFECT_BASE, IDEAS } from '../data/ideas.js';
import { S, techOn } from './state.js';

let version = 0;
const cache = { state: null, tick: -1, version: -1, table: null };

/** Call when an idea is built or wrecked mid-tick so effects are recomputed at once. */
export function invalidateEffects() { version++; }

/** Working ideas, oldest first; ties keep tree order. */
function working() {
  return IDEAS.filter(d => techOn(d.id)).sort((a, b) => (S.tech[a.id].builtAt ?? 0) - (S.tech[b.id].builtAt ?? 0));
}

function compute(name, who) {
  if (!(name in EFFECT_BASE)) throw new Error(`unknown effect: ${name}`);
  let v = EFFECT_BASE[name];
  for (const d of working()) {
    const e = d.effects && d.effects[name];
    if (!e || (e.while && !techOn(e.while))) continue;
    if ('set' in e) v = who && e.adopterSet !== undefined && S.tech[d.id].adopters.includes(who.id) ? e.adopterSet : e.set;
    if ('mul' in e) v *= e.mul;
  }
  return v;
}

/** The current value of an effect. Pass `who` for effects that differ for an idea's adopters. */
export function effect(name, who) {
  if (who && IDEAS.some(d => d.effects && d.effects[name] && d.effects[name].adopterSet !== undefined)) return compute(name, who);
  if (cache.state !== S || cache.tick !== S.tick || cache.version !== version) {
    Object.assign(cache, { state: S, tick: S.tick, version, table: new Map() });
  }
  if (!cache.table.has(name)) cache.table.set(name, compute(name));
  return cache.table.get(name);
}

/** The built, working idea that employs a trade, if any (for paying the owner, avoiding them). */
export function employerOf(job) {
  return IDEAS.find(d => d.hires && d.hires.job === job && techOn(d.id)) || null;
}

/** The era the village is in: the highest era opened by a built idea. */
export function currentEra() {
  let era = 0;
  for (const d of IDEAS) if (d.opensEra && S.tech[d.id] && S.tech[d.id].state === 'built') era = Math.max(era, d.opensEra);
  return era;
}
