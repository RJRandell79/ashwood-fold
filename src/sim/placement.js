// Where buildings go. The game, not the player, chooses every site: each candidate plot is
// scored against the building's placement rules (src/data/buildings.js) on the valley terrain.
// Placement is deterministic: no draws from the simulation's dice, ties go to the first plot found.
import { BUILDINGS, COTTAGE_FIRST, COTTAGE_HUES, HOUSE_WORD, LINES, MAX_HOMES, NAME_PARTS, STYLED_ARCHETYPES } from '../data/buildings.js';
import { ERA_STYLES } from '../data/styles.js';
import { effect } from './effects.js';
import { log } from './log.js';
import { noise, valley } from './valley.js';
import { household, isAdult, N, P, PN, S } from './state.js';

const MARGIN = 1; // clear cells kept around every building, so lanes run between them

export const theValley = () => valley(S.valley.seed);

/** Cells already taken: 1 buildings, 2 lines, 3 the crossing's landings, 4 lanes. */
export { occupancy };
function occupancy(v) {
  const occ = new Uint8Array(v.W * v.H);
  for (const k in S.roads || {}) occ[k] = 4; // lanes: kept clear, though buildings may front onto them
  for (const p of Object.values(P)) for (let y = Math.floor(p.y); y < Math.ceil(p.y + p.h); y++) for (let x = Math.floor(p.x); x < Math.ceil(p.x + p.w); x++) if (x >= 0 && y >= 0 && x < v.W && y < v.H) occ[y * v.W + x] = 1;
  for (const [id, ys] of Object.entries(S.lines || {})) { const w = LINES[id].width; ys.forEach((y, x) => { for (let k = 0; k < w; k++) if (y + k < v.H) occ[(y + k) * v.W + x] = 2; }); }
  const e = crossingEnds();
  if (e) for (const end of [e.north, e.south]) for (let y = Math.floor(end.y) - 1; y <= Math.floor(end.y) + 1; y++) for (let x = Math.floor(end.x) - 1; x <= Math.floor(end.x) + 1; x++) if (x >= 0 && y >= 0 && x < v.W && y < v.H && !v.water[y * v.W + x]) occ[y * v.W + x] = 3;
  return occ;
}
const gap = (a, b) => Math.hypot(Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h)));
const centreOf = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** The heart of the settlement: the Green once it exists, else the first hearth. */
export function settlementCentre() {
  return P.square ? centreOf(P.square) : theValley().hearth;
}
function matches(p, key) { return p.id === key || p.def === key || p.kind === key; }
function nearest(rect, key) {
  let best = Infinity;
  for (const p of Object.values(P)) if (matches(p, key)) best = Math.min(best, gap(rect, p));
  return best;
}
function lineGap(rect, id) {
  const ys = S.lines && S.lines[id]; if (!ys) return Infinity;
  let best = Infinity;
  for (let x = Math.max(0, Math.floor(rect.x) - 4); x < Math.min(ys.length, Math.ceil(rect.x + rect.w) + 4); x++) best = Math.min(best, gap(rect, { x, y: ys[x], w: 1, h: LINES[id].width }));
  return best;
}

/** Whether a cell still carries woodland: the valley's woods, less what has been felled (S.cleared). */
export const wooded = (v, i) => (v.wood[i] && !(S.cleared && S.cleared[i]) ? 1 : 0);

/** Fells the trees on and around a new building. Returns how many cells were cleared. */
function clearWood(p) {
  const v = theValley(), cleared = S.cleared || (S.cleared = {});
  let n = 0;
  for (let y = Math.floor(p.y) - 1; y < Math.ceil(p.y + p.h) + 1; y++) for (let x = Math.floor(p.x) - 1; x < Math.ceil(p.x + p.w) + 1; x++) {
    if (x < 0 || y < 0 || x >= v.W || y >= v.H) continue;
    const i = y * v.W + x;
    if (wooded(v, i)) { cleared[i] = S.tick; n++; }
  }
  return n;
}

/** Scores one plot, or returns -Infinity if the building cannot stand there. */
function score(def, x, y, v, occ, centre) {
  const R = def.place || {}, rect = { x, y, w: def.w, h: def.h };
  if (x - MARGIN < 0 || y - MARGIN < 0 || x + def.w + MARGIN > v.W || y + def.h + MARGIN > v.H) return -Infinity;
  let lane = 0;
  for (let yy = y - MARGIN; yy < y + def.h + MARGIN; yy++) for (let xx = x - MARGIN; xx < x + def.w + MARGIN; xx++) {
    const o = occ[yy * v.W + xx];
    if (!o) continue;
    const inside = xx >= x && xx < x + def.w && yy >= y && yy < y + def.h;
    if (o !== 4 || inside) return -Infinity;
    lane++;
  }
  let slope = 0, flood = 0, fert = 0, dist = 0, wood = 0, maxSlope = 0, maxFlood = 0, minDist = Infinity, n = 0, foot = 0;
  for (let yy = y; yy < y + def.h; yy++) for (let xx = x; xx < x + def.w; xx++) {
    const i = yy * v.W + xx;
    if (v.water[i]) return -Infinity;
    slope += v.slope[i]; flood += v.flood[i]; fert += v.fertile[i]; dist += v.dist[i]; wood += wooded(v, i); n++;
    maxSlope = Math.max(maxSlope, v.slope[i]); maxFlood = Math.max(maxFlood, v.flood[i]); minDist = Math.min(minDist, v.dist[i]);
    if (S.foot) foot += S.foot[i] || 0;
  }
  if (maxSlope > (R.maxSlope ?? 0.35) || maxFlood > (R.maxFlood ?? 0.15)) return -Infinity;
  if (R.riverbank && minDist > 1) return -Infinity;
  if (R.line && lineGap(rect, R.line) > 2) return -Infinity;
  // The far bank is open only once there is a bridge, and is as far away as the walk over it.
  const far = y + def.h / 2 > v.riverY(x + def.w / 2);
  if (far && !effect('farBank')) return -Infinity;
  slope /= n; flood /= n; fert /= n; dist /= n; wood /= n;
  const c = centreOf(rect);
  let dc = Math.hypot(c.x - centre.x, c.y - centre.y);
  if (far) { const e = crossingEnds(); dc = Math.hypot(c.x - e.south.x, c.y - e.south.y) + Math.hypot(e.north.x - centre.x, e.north.y - centre.y) + 2; }
  let s = R.wooded ? R.wooded * wood : -wood * 0.3;
  if (R.centre) s += R.centre * (1 - Math.min(1, dc / 30));
  if (R.edge) s += R.edge * Math.min(1, dc / 25);
  if (R.nearWater) s += R.nearWater * (1 - Math.min(1, dist / 12));
  if (R.fertile) s += R.fertile * fert;
  if (R.flat) s -= R.flat * slope * 3;
  if (R.dry) s -= R.dry * flood * 3;
  if (R.road) s += R.road * (Math.min(1, foot / 60) + Math.min(1, lane / 3));
  for (const [k, w] of Object.entries(R.near || {})) { const d = nearest(rect, k); if (d < Infinity) s += w * (1 - Math.min(1, d / 15)); }
  for (const [k, w] of Object.entries(R.away || {})) { const d = nearest(rect, k); if (d < Infinity) s -= w * (1 - Math.min(1, d / 12)); }
  return s;
}

/** Finds the best plot for a building, searching outward from the settlement's centre. */
export function choosePlot(defId) {
  const def = BUILDINGS[defId], v = theValley(), occ = occupancy(v), centre = settlementCentre();
  for (const R of [22, 36, 60, 200]) {
    let best = null, bs = -Infinity;
    const x0 = Math.max(0, Math.floor(centre.x - R)), x1 = Math.min(v.W - def.w, Math.ceil(centre.x + R));
    const y0 = Math.max(0, Math.floor(centre.y - R)), y1 = Math.min(v.H - def.h, Math.ceil(centre.y + R));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const s = score(def, x, y, v, occ, centre); if (s > bs) { bs = s; best = { x, y }; } }
    if (best) return best;
  }
  return null;
}
/** As choosePlot, but if the rules allow no site at all, relaxes them step by step rather than leave the building unbuilt. */
function choosePlotSomewhere(defId) {
  let plot = choosePlot(defId);
  if (plot) return plot;
  const def = BUILDINGS[defId], orig = def.place;
  const relaxed = [{ ...orig, riverbank: false, line: null }, { ...orig, riverbank: false, line: null, maxSlope: 1, maxFlood: 1 }];
  try { for (const place of relaxed) { def.place = place; if ((plot = choosePlot(defId))) return plot; } }
  finally { def.place = orig; }
  return null;
}

/** Builds a place of the given kind and records it in S.places. Returns the place, or null if nowhere fits. */
export function addPlace(id, defId = id, extra = {}) {
  if (P[id]) return P[id];
  const def = BUILDINGS[defId];
  if (!def) throw new Error(`unknown building ${defId}`);
  const plot = choosePlotSomewhere(defId);
  if (!plot) return null;
  P[id] = { id, def: defId, name: extra.name || def.name, x: plot.x, y: plot.y, w: def.w, h: def.h, indoor: def.indoor, home: !!def.home, kind: def.kind,
    era: S.era || 0, built: S.tick, ...(def.hue != null ? { hue: def.hue } : {}), ...extra };
  const felled = clearWood(P[id]);
  if (felled >= 10) {
    P[id].felled = felled;
    if (!(def.place && def.place.wooded)) log(`Trees are felled to make room for ${P[id].name}.`, 'event', 'work', { place: id });
  }
  return P[id];
}

/** Where the river is crossed: the narrowest reach near the hearth. The first village fords it there. */
function placeCrossing() {
  const v = theValley(), h = v.hearth;
  let best = null, bs = Infinity;
  for (let x = Math.max(3, Math.floor(h.x - 22)); x <= Math.min(v.W - 4, Math.ceil(h.x + 22)); x++) {
    const s = v.halfWidth(x + 0.5) * 4 + Math.abs(x + 0.5 - h.x) * 0.06 + Math.abs(v.riverY(x + 1.5) - v.riverY(x - 0.5)) * 2;
    if (s < bs) { bs = s; best = x; }
  }
  S.crossing = { x: best, kind: 'ford' };
}
/** The two landings of the crossing, on dry ground either side of the river. */
export function crossingEnds() {
  if (!S || !S.crossing) return null;
  const v = theValley(), x = S.crossing.x, mid = Math.floor(v.riverY(x + 0.5));
  let n = mid, s = mid;
  while (n > 0 && v.water[n * v.W + x]) n--;
  while (s < v.H - 1 && v.water[s * v.W + x]) s++;
  return { x: x + 0.5, north: { x: x + 0.5, y: n + 0.5 }, south: { x: x + 0.5, y: s + 0.5 } };
}
/** An idea has changed the crossing (the ford becomes a bridge). */
export function setCrossing(kind) {
  if (!S.crossing) placeCrossing();
  S.crossing.kind = kind;
}

/** Lays out the first village, in founding order. */
export function placeFounding() {
  if (!S.crossing) placeCrossing();
  const ids = Object.keys(BUILDINGS).filter(k => BUILDINGS[k].founding).sort((a, b) => BUILDINGS[a].founding - BUILDINGS[b].founding);
  for (const id of ids) addPlace(id);
}

/** True while another home may be built: homes are capped for the named cast (MAX_HOMES). */
export const cottagesLeft = () => Object.values(P).filter(p => p.home).length < MAX_HOMES;

/** The name of the n-th cottage built (0-based), in an order set by the valley's seed. */
export function cottageName(n, era = S.era || 0) {
  if (n < COTTAGE_FIRST.length) return `${COTTAGE_FIRST[n]} Cottage`;
  const order = NAME_PARTS.map((w, i) => [noise(i * 3.7 + 0.5, 11.5, S.valley.seed), w]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const k = n - COTTAGE_FIRST.length, part = order[k % order.length], again = Math.floor(k / order.length);
  return `${part} ${HOUSE_WORD(era)}${again ? ' ' + ['', 'Two', 'Three', 'Four'][again] : ''}`;
}

/** A new cottage for a growing village. Returns its id, or null when housing is full or no plot fits. */
export function buildCottage() {
  if (!cottagesLeft()) return null;
  const n = S.cottages || 0, id = `cottage${n + 1}`;
  const p = addPlace(id, 'cottage', { name: cottageName(n), hue: COTTAGE_HUES[n % COTTAGE_HUES.length] });
  if (!p) return null;
  S.cottages = n + 1;
  return id;
}

/** Plans a line along the valley side at a steady height above the settlement, by dynamic programming
 *  over one row per column. With terrainOnly it ignores buildings (to judge whether the valley suits a line).
 *  Returns { ys, cost } where cost is the average cost per column. */
export function planLine(id, terrainOnly = false) {
  const L = LINES[id], v = theValley(), W = v.W, top = 3;
  const occ = terrainOnly ? new Uint8Array(W * v.H) : occupancy(v), c = terrainOnly ? v.hearth : settlementCentre();
  const ci = Math.floor(c.y) * W + Math.floor(c.x), target = v.height[ci] + L.target;
  // Lines keep a clear berth of a few cells from buildings rather than threading the gaps between them.
  const near = new Float32Array(W * v.H);
  if (!terrainOnly) for (const p of Object.values(P)) for (let y = Math.floor(p.y) - 3; y < Math.ceil(p.y + p.h) + 3; y++) for (let x = Math.floor(p.x) - 3; x < Math.ceil(p.x + p.w) + 3; x++)
    if (x >= 0 && y >= 0 && x < W && y < v.H) { const d = gap({ x, y, w: 1, h: 1 }, p); near[y * W + x] = Math.max(near[y * W + x], d < 1 ? 60 : d < 2 ? 25 : 8); }
  const bottom = x => Math.max(top + 1, Math.floor(v.riverY(x + 0.5) - v.halfWidth(x + 0.5) - 2));
  let prev = new Map(), back = [];
  for (let x = 0; x < W; x++) {
    const cur = new Map(), from = new Map();
    for (let y = top; y <= bottom(x); y++) {
      const i = y * W + x;
      const cost = Math.abs(v.height[i] - target) * 1.5 + v.flood[i] * 4 + v.slope[i] * 2 + (occ[i] === 4 ? 3 + near[i] : occ[i] ? 500 : near[i]) + (v.water[i] ? 500 : 0);
      if (x === 0) { cur.set(y, cost); continue; }
      let best = Infinity, arg = -1;
      for (let dy = -2; dy <= 2; dy++) { const p = prev.get(y + dy); if (p === undefined) continue; const t = p + L.smooth * Math.abs(dy) + L.smooth * 0.1 * dy * dy; if (t < best) { best = t; arg = y + dy; } }
      if (arg >= 0) { cur.set(y, best + cost); from.set(y, arg); }
    }
    back.push(from); prev = cur;
  }
  const [end, total] = [...prev.entries()].sort((a, b) => a[1] - b[1] || a[0] - b[0])[0];
  let y = end;
  const ys = new Array(W);
  for (let x = W - 1; x >= 0; x--) { ys[x] = y; if (x > 0) y = back[x].get(y); }
  return { ys, cost: total / W };
}

const suitCache = new Map();
/** How hard the valley makes a line, judged on the terrain alone (average cost per column; lower suits it). */
export function lineDifficulty(id) {
  const key = `${S.valley.seed}:${id}`;
  if (!suitCache.has(key)) { suitCache.set(key, planLine(id, true).cost); if (suitCache.size > 32) suitCache.delete(suitCache.keys().next().value); }
  return suitCache.get(key);
}

/** Routes a canal or railway (or road) along the valley side, around what is already built, and records it. */
export function routeLine(id) {
  if (S.lines && S.lines[id]) return S.lines[id];
  const { ys } = planLine(id);
  (S.lines || (S.lines = {}))[id] = ys;
  return ys;
}

/** Each spring one building that is two eras out of date may be rebuilt in the style of the present:
 *  a home when its household can pay for it, anything else at the parish's charge. Oldest first.
 *  Enduring buildings (the Green, the chapel, the cross) are never rebuilt; they keep their first look. */
export function restyleSeason() {
  const era = S.era || 0, now = ERA_STYLES[Math.min(era, ERA_STYLES.length - 1)];
  const dated = Object.values(P)
    .filter(p => { const d = BUILDINGS[p.def] || {}; return d.legacy !== 'enduring' && STYLED_ARCHETYPES.includes(d.archetype); })
    .filter(p => era - (p.era || 0) >= 2 && ERA_STYLES[p.era || 0].material !== now.material)
    .sort((a, b) => (a.era || 0) - (b.era || 0) || (a.built || 0) - (b.built || 0) || (a.id < b.id ? -1 : 1));
  for (const p of dated) {
    if (p.home) {
      const payer = household(p.id).filter(isAdult).sort((a, b) => b.coins - a.coins)[0];
      if (!payer || payer.coins < 14) continue;
      payer.coins -= 8;
      rebuild(p, era);
      log(`${N(payer)} has ${PN(p.id)} pulled down and rebuilt in ${now.material}.`, 'event', 'work', { ids: [payer.id], place: p.id });
      return p.id;
    }
    {
      rebuild(p, era);
      const how = BUILDINGS[p.def].legacy === 'adaptable' ? 'is rebuilt on its old footings' : 'is pulled down and rebuilt';
      log(`${PN(p.id).replace(/^the /, 'The ')} ${how} in ${now.material}.`, 'event', 'work', { place: p.id });
      return p.id;
    }
  }
  return null;
}
function rebuild(p, era) { p.era = era; p.rebuilt = S.tick; }
