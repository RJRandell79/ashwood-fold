// Traces of the past that stay on the land, for the player to notice and ask about (decided 7 Nov:
// the settlement makes the player curious; the annals answer). Each trace carries the number of the
// annals entry that explains it, so the card in the valley can open the book at the answer.
//
//   S.stakes            plots pegged out for an idea that came to nothing (first failure on): { idea, def, name,
//                       x, y, w, h, route, n (the latest failure), year, givenUp (year, or null) }. Pulled up when something is built over them or the idea is built.
//   S.history.landmarks a lane, field, wood or holding that keeps a gone family's name: gains { n, x, y }
//                       (x and y null for a holding, whose name goes to a house instead).
import { BUILDINGS, LINES } from '../data/buildings.js';
import { choosePlot, planLine, settlementCentre } from './placement.js';
import { valley } from './valley.js';
import { calYear, P, S } from './state.js';

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The plot (and for a canal or railway, a line of survey pegs) staked out for an idea given up. */
export function stakeOut(d, n, givenUp = false) {
  const had = (S.stakes || []).find(s => s.idea === d.id);
  if (had) { if (n) had.n = n; if (givenUp) had.givenUp = calYear(); return had; }   // the same pegs, a later chapter
  const def = (d.places || [])[0];
  if (!def || !BUILDINGS[def] || P[def]) return null;
  const plot = choosePlot(def);
  if (!plot) return null;
  const b = BUILDINGS[def], stake = { idea: d.id, def, name: b.name, x: plot.x, y: plot.y, w: b.w, h: b.h, route: null, n: n || null, year: calYear(), givenUp: givenUp ? calYear() : null };
  if (d.line && LINES[d.line] && !(S.lines && S.lines[d.line])) {
    // the surveyors' pegs along the line near the village, one every few paces
    const { ys } = planLine(d.line), c = settlementCentre(), route = [];
    for (let x = Math.max(0, Math.floor(c.x - 16)); x <= Math.min(ys.length - 1, Math.ceil(c.x + 16)); x += 3) if (ys[x] != null) route.push([x + 0.5, ys[x] + 0.5]);
    stake.route = route;
  }
  (S.stakes || (S.stakes = [])).push(stake);
  return stake;
}

/** Pulls up stakes that a new building now stands on, or whose idea has been built after all. */
export function clearStakes(place, idea) {
  if (!S.stakes || !S.stakes.length) return;
  S.stakes = S.stakes.filter(s => !(idea && s.idea === idea) && !(place && overlaps(s, place)));
}

/** Where on the ground a family's name has stuck: a field, the wet meadow, the wood, a lane or the brow. */
export function placeLandmark(l) {
  if (l.house) return { x: null, y: null };
  const v = valley(S.valley.seed), c = settlementCentre(), W = v.W;
  const taken = Object.values(P), used = ((S.history && S.history.landmarks) || []).filter(o => o !== l && o.x != null);
  const free = (x, y) => !taken.some(p => (p.kind !== 'field' || l.word !== 'Ing') && x >= p.x - 1 && x < p.x + p.w + 1 && y >= p.y - 1 && y < p.y + p.h + 1) && !used.some(o => Math.hypot(o.x - x, o.y - y) < 6);
  const fields = taken.filter(p => p.kind === 'field');
  let best = null, bs = Infinity;
  for (let y = Math.max(0, Math.floor(c.y - 26)); y < Math.min(v.H, c.y + 26); y++) for (let x = Math.max(0, Math.floor(c.x - 26)); x < Math.min(W, c.x + 26); x++) {
    const i = y * W + x, d = Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y);
    if (v.water[i] || d < 5 || !free(x + 0.5, y + 0.5)) continue;
    const inField = fields.some(p => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
    const lane = (S.roads && S.roads[i]) || (S.foot && S.foot[i] > 6);
    let s;
    switch (l.word) {
      case 'Field': {   // one of the enclosed fields: just beyond the open fields, not on them
        const near = fields.reduce((m, p) => Math.min(m, Math.hypot(Math.max(0, p.x - x, x - (p.x + p.w)), Math.max(0, p.y - y, y - (p.y + p.h)))), Infinity);
        s = !inField && near >= 2 && near <= 6 ? d + near : Infinity; break;
      }
      case 'Ing': s = v.flood[i] > 0 || Math.abs(y + 0.5 - v.riverY(x + 0.5)) < v.halfWidth(x + 0.5) + 4 ? d * 0.5 + (inField ? 0 : 3) : Infinity; break;
      case 'Wood': s = v.wood[i] && !(S.cleared && S.cleared[i]) ? d : Infinity; break;
      case 'Brow': s = lane ? d * 0.4 - v.slope[i] * 30 : Infinity; break;
      default: s = lane ? Math.abs(d - 11) : Infinity;   // a lane: out past the houses
    }
    if (s === Infinity) s = 200 + Math.abs(d - 12);       // nothing of the kind: open ground near the village
    if (s < bs) { bs = s; best = { x: x + 0.5, y: y + 0.5 }; }
  }
  return best || { x: null, y: null };
}
