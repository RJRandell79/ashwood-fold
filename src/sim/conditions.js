// Historical conditions (src/data/conditions.js): rolled each spring, held for their years, and read by
// the effects system while they hold. A visitation of sickness kills by the dice through its season.
import { CONDITION } from '../data/conditions.js';
import { MAXPOP } from '../data/world.js';
import { effect, invalidateEffects } from './effects.js';
import { log } from './log.js';
import { arrive, die } from './people.js';
import { calYear, currentAge, household, isAdult, listNames, LIVE, rnd, S, seasonOf } from './state.js';

/** The conditions record, made on first use (older saves have none). */
export function conditionState() {
  return S.conditions || (S.conditions = { active: {}, past: {}, dead: {} });
}

/** The records of the conditions holding now. */
export function activeConditions() {
  if (!S.conditions) return [];
  return Object.keys(S.conditions.active).map(id => CONDITION[id]).filter(Boolean);
}

/** Each spring: conditions end, begin or come again. Call on the first day of spring. */
export function conditionsSpring() {
  const C = conditionState(), year = calYear(), list = currentAge().conditions || [];
  let changed = false;
  const ending = Object.keys(C.active).filter(id => year >= C.active[id].until);
  for (const id of ending) { tellToll(CONDITION[id]); delete C.active[id]; changed = true; }
  for (const c of list) {
    if (C.active[c.id] || year < c.years[0] || year > c.years[1]) continue;
    if (C.past[c.id] != null && !c.repeats) continue;
    if (c.after && !(C.past[c.after] != null && C.past[c.after] < year)) continue;
    const sure = c.certain && year === c.years[1] && C.past[c.id] == null;
    if (!sure && rnd() >= c.chance) continue;
    const again = C.past[c.id] != null;
    C.active[c.id] = { since: year, until: year + (c.lasts || 1) };
    C.past[c.id] = year; changed = true;
    for (const [k, share] of Object.entries(c.stores || {})) if (k in S.stores) S.stores[k] *= share;
    log(again && c.again ? c.again : c.begin, 'bad', 'season', { condition: c.id });
  }
  // a condition that ended this spring and did not come again is over (a visitation tells its own end)
  for (const id of ending) {
    const c = CONDITION[id];
    if (c && c.end && !C.active[id]) log(c.end, 'event', 'season', { condition: id });
  }
  // newcomers drawn by what the condition has done (land left empty)
  for (const c of activeConditions()) if (c.migrants) for (let i = 0; i < c.migrants.n && LIVE.length < MAXPOP - 2; i++) arrive(c.migrants.job, c.migrants.reason);
  if (changed) invalidateEffects();
}

/** Each day: a visitation kills through its season, and the wage a condition sets is paid. */
export function conditionsDay() {
  if (!S.conditions) return;
  const C = S.conditions;
  // when hands are scarce the better-off pay the field hands and labourers more, while they can
  const wage = effect('scarceWage');
  if (wage > 0) {
    const hands = LIVE.filter(a => isAdult(a) && ['labourer', 'farmhand'].includes(a.job));
    const payer = LIVE.filter(a => isAdult(a) && !hands.includes(a)).sort((x, y) => y.coins - x.coins)[0];
    for (const h of hands) if (payer && payer.coins >= wage + 10) { payer.coins -= wage; h.coins += wage; }
  }
  for (const c of activeConditions()) {
    const m = c.mortality;
    if (!m) continue;
    if (seasonOf() === m.season) {
      // a person's chance over the season, spread over its days
      for (const a of [...LIVE]) {
        const housemates = household(a.home).length;
        const q = Math.min(m.max, m.base + (a.age > 55 ? m.old : 0) + (a.age < 10 ? m.young : 0) + Math.max(0, housemates - 2) * (m.crowd || 0) + (a.hunger > 0.6 ? m.hungry || 0 : 0));
        if (rnd() < 1 - Math.pow(1 - q, 1 / 5)) { die(a, m.cause); (C.dead[c.id] || (C.dead[c.id] = [])).push(a.id); }
      }
    } else if (seasonOf() > m.season) tellToll(c);
  }
}

/** Once a visitation's season is over, the annals give its toll. */
function tellToll(c) {
  const C = S.conditions, m = c && c.mortality;
  if (!m || !C.active[c.id] || C.active[c.id].told) return;
  C.active[c.id].told = true;
  const dead = (C.dead[c.id] || []).map(i => S.agents[i]);
  C.dead[c.id] = [];
  if (!dead.length && !m.spared) return;
  const text = !dead.length ? m.spared : dead.length <= 4 && m.few ? m.few.replace('{names}', listNames(dead)) : m.end.replace('{dead}', numberIn(dead.length)).replace('{names}', listNames(dead.slice(0, 4)));
  log(text, 'event', 'season', { condition: c.id, ids: dead.slice(0, 4).map(a => a.id) });
}

const WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
const numberIn = n => WORDS[n] || String(n);
