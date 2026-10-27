// Worn paths. Every step people take wears the ground a little; unused ground grows back.
// S.foot maps a valley cell index to how worn it is. The view draws paths from it and
// placement prefers well-trodden ground for buildings that want a road.
import { S } from './state.js';
import { VW, VH } from './valley.js';

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
