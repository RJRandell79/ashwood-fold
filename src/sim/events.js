// Things that happen to the village on their own: a pedlar walking in, the midsummer fair.
// (Storms are in seasons.js.) Once these were buttons for the player; since 27 Oct the player
// acts only at crossroads (src/sim/crossroads.js), so they happen when the season brings them.
import { STRANGERS } from '../data/folk.js';
import { MAXPOP, TPD } from '../data/world.js';
import { log } from './log.js';
import { effect } from './effects.js';
import { addAgent } from './people.js';
import { makeAgent } from './setup.js';
import { dayInSeason, dayStart, entryPoint, LIVE, N, P, pointIn, rnd, S, seasonOf } from './state.js';

/** A pedlar walks in along the carters' road and takes a room at the inn. */
export function strangerArrives() {
  const used = new Set(S.agents.map(a => a.name)), st = STRANGERS.find(n => !used.has(n[0]));
  if (!st || LIVE.length >= MAXPOP) return null;
  const tr = { temper: .2 + rnd() * .6, warmth: .2 + rnd() * .7, diligence: .3 + rnd() * .6, forgive: .2 + rnd() * .7, gossip: .2 + rnd() * .7, scruple: .25 + rnd() * .7 };
  const id = S.agents.length, s = addAgent(makeAgent(id, st[0], 'pedlar', 'tavern', tr, { age: 24 + rnd() * 20, sex: st[1], hue: 330 }));
  s.coins = 10; s.hunger = .5; s.arrivedAt = S.tick;
  [s.x, s.y] = entryPoint(); s.px = s.x; s.py = s.y; s.arrived = false; s.act = { type: 'stroll', place: 'tavern', left: 2, target: null };
  const q = pointIn(P.tavern); s.tx = q[0]; s.ty = q[1];
  for (const a of LIVE) if (a !== s) { S.op[a.id][id] = Math.round(-12 + a.tr.warmth * 22 + (rnd() - .5) * 10); S.op[id][a.id] = Math.round((rnd() - .4) * 14); }
  log(`A stranger walks in along the carters' road. ${N(s)}, a pedlar, takes a room at The Plough.`, 'event', 'arrival', { ids: [id], place: 'tavern' });
  return s;
}

/** Each night: in spring and summer a pedlar now and then; the midsummer fair on the third day of summer. */
export function eventsDay() {
  const season = seasonOf();
  if ((season === 0 || season === 1) && rnd() < 0.02) strangerArrives();
  if (season === 1 && dayInSeason() === 3 && !S.fair && effect('midsummerFair')) {
    S.fair = { start: dayStart() + TPD + 60, end: dayStart() + TPD + 120 };
    log('The crier announces the midsummer fair on the Green tomorrow.', 'event', null, { place: 'square' });
  }
}
