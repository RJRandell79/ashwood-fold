// Worn paths and lanes. Every step people take wears the ground a little; unused ground grows back.
// S.foot maps a valley cell index to how worn it is. Ground that stays heavily worn for long enough
// becomes a lane (S.roads, cell index -> the tick it formed), which is permanent: later buildings keep
// clear of it and front onto it, so the old tracks shape the streets. The view draws both.
import { S, PN, P } from './state.js';
import { valley, VW, VH } from './valley.js';
import { crossingEnds, occupancy } from './placement.js';
import { log } from './log.js';

const DECAY = 0.97;   // the share of wear left after each night
const FADE = 1;       // wear below this is grass again
const LANE_WEAR = 40; // wear that, held for LANE_NIGHTS nights running, makes a lane
const LANE_NIGHTS = 40;

/** Wears the cells along one stride from (x0,y0) to (x1,y1). */
export function wear(x0, y0, x1, y1) {
  const foot = S.foot || (S.foot = {});
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  let last = -1;
  for (let k = 1; k <= n; k++) {
    const x = Math.floor(x0 + (x1 - x0) * k / n), y = Math.floor(y0 + (y1 - y0) * k / n);
    if (x < 0 || y < 0 || x >= VW || y >= VH) continue;
    const i = y * VW + x;
    if (i === last) continue;
    last = i;
    foot[i] = (foot[i] || 0) + 1;
  }
}

/** Overnight, the grass creeps back. */
export function footDay() {
  const foot = S.foot;
  if (!foot) return;
  for (const k in foot) {
    const v = Math.round(foot[k] * DECAY * 10) / 10;
    if (v < FADE) delete foot[k]; else foot[k] = v;
  }
  laneNight();
}

/** Ground worn hard night after night hardens into a lane. */
function laneNight() {
  const foot = S.foot, held = S.wornFor || (S.wornFor = {}), roads = S.roads || (S.roads = {});
  let occ = null, fresh = [];
  for (const k in held) if (!(foot[k] >= LANE_WEAR)) delete held[k];
  for (const k in foot) {
    if (foot[k] < LANE_WEAR || roads[k]) continue;
    held[k] = (held[k] || 0) + 1;
    if (held[k] < LANE_NIGHTS) continue;
    delete held[k];
    occ = occ || occupancy(valley(S.valley.seed));
    if ((occ[k] && occ[k] !== 4) || valley(S.valley.seed).water[k]) continue; // never under a building or line, nor in the river
    roads[k] = S.tick;
    fresh.push(+k);
  }
  if (fresh.length && !S.laneLogged) {
    S.laneLogged = 1;
    const c = fresh[0], x = c % VW, y = Math.floor(c / VW);
    let near = null, nd = Infinity;
    for (const p of Object.values(P)) { const d = Math.hypot(p.x + p.w / 2 - x, p.y + p.h / 2 - y); if (d < nd) { nd = d; near = p.id; } }
    log(`Feet and carts have worn the old track by ${PN(near)} into a lane. The village will grow along it.`, 'event', 'work', { place: near });
  }
}

/** Where a straight walk from p to q on one bank would cut through a bend of the river, the
 *  points to go round by instead (on the same bank, clear of the water). */
function roundBends(v, p, q, south, depth = 0) {
  const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]));
  let a = -1, b = -1;
  for (let k = 1; k < n; k++) {
    const x = p[0] + (q[0] - p[0]) * k / n, y = p[1] + (q[1] - p[1]) * k / n;
    const edge = v.riverY(x) + (south ? 1 : -1) * (v.halfWidth(x) + 0.8);
    if (south ? y < edge : y > edge) { if (a < 0) a = k; b = k; }
  }
  if (a < 0 || depth > 3) return [];
  const k = (a + b) / 2, x = p[0] + (q[0] - p[0]) * k / n;
  const w = [x, v.riverY(x) + (south ? 1 : -1) * (v.halfWidth(x) + 1.5)];
  return [...roundBends(v, p, w, south, depth + 1), w, ...roundBends(v, w, q, south, depth + 1)];
}

/** Plans someone's walk: round the river's bends on their own bank, and over the crossing if their way
 *  lies across the river. a.via lists the points to pass on the way to (a.tx, a.ty). */
export function setVia(a) {
  delete a.via;
  const v = valley(S.valley.seed), south = (x, y) => y > v.riverY(x);
  const from = [a.x, a.y], to = [a.tx, a.ty], sf = south(...from), st = south(...to);
  let via;
  if (sf === st) via = roundBends(v, from, to, sf);
  else {
    const e = crossingEnds();
    if (!e) return;
    const [p, q] = sf ? [e.south, e.north] : [e.north, e.south];
    via = [...roundBends(v, from, [p.x, p.y], sf), [p.x, p.y], [q.x, q.y], ...roundBends(v, [q.x, q.y], to, st)];
  }
  if (via.length) a.via = via.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
}
