// Worn paths. Every step people take wears the ground a little; unused ground grows back.
// S.foot maps a valley cell index to how worn it is. The view draws paths from it and
// placement prefers well-trodden ground for buildings that want a road.
import { S } from './state.js';
import { valley, VW, VH } from './valley.js';
import { crossingEnds } from './placement.js';

const DECAY = 0.97;   // the share of wear left after each night
const FADE = 1;       // wear below this is grass again

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
