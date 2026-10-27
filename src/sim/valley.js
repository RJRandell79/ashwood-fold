// The valley: a fictional Lancashire river valley generated from a seed.
// The terrain is never saved; it is rebuilt from S.valley.seed whenever it is needed.
// Coordinates are cells: x runs west to east (0..VW), y north to south (0..VH).
// The river runs west to east south of the middle, so the north bank is the broad side.

export const VW = 160, VH = 100;

function hash(ix, iy, seed) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = t => t * t * (3 - 2 * t);
/** Smooth value noise in [0,1). */
export function noise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function fbm(x, y, seed, octaves = 4) {
  let v = 0, amp = 0.5, f = 1, norm = 0;
  for (let o = 0; o < octaves; o++) { v += noise(x * f, y * f, seed + o * 101) * amp; norm += amp; amp *= 0.5; f *= 2; }
  return v / norm;
}
function rng(seed) { let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) | 0; let r = Math.imul(t ^ (t >>> 15), t | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

const cache = new Map();

/** Builds (or returns the cached) valley for a seed. */
export function valley(seed) {
  seed = seed | 0;
  if (cache.has(seed)) return cache.get(seed);
  const r = rng(seed ^ 0x5bd1e995);
  const base = VH * (0.6 + r() * 0.1), a1 = 4 + r() * 5, f1 = (2 * Math.PI) / (60 + r() * 50), p1 = r() * 6.3;
  const a2 = 1.5 + r() * 2, f2 = (2 * Math.PI) / (18 + r() * 14), p2 = r() * 6.3;
  const plainN = 6 + r() * 5, plainS = 3 + r() * 3, rise = 0.16 + r() * 0.08, woods = 0.5 + r() * 0.12;
  const riverY = x => base + a1 * Math.sin(f1 * x + p1) + a2 * Math.sin(f2 * x + p2);
  const halfWidth = x => 1.15 + 0.35 * Math.sin(x * 0.11 + p2);

  const n = VW * VH;
  const height = new Float32Array(n), dist = new Float32Array(n), flood = new Float32Array(n);
  const fertile = new Float32Array(n), slope = new Float32Array(n), wood = new Uint8Array(n), water = new Uint8Array(n);
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    const i = y * VW + x, cx = x + 0.5, cy = y + 0.5;
    const d = cy - riverY(cx), hw = halfWidth(cx), side = d < 0 ? 'n' : 's';
    const t = Math.abs(d) - hw;
    dist[i] = Math.max(0, t);
    if (t < 0) { water[i] = 1; height[i] = -0.6; flood[i] = 1; continue; }
    const plain = (side === 'n' ? plainN : plainS) * (0.8 + 0.4 * noise(cx * 0.05, 0, seed + 7));
    let h = 0.2 + t * 0.03;
    if (t > plain) { const u = t - plain; h += u * rise * (0.7 + 0.6 * fbm(cx * 0.03, cy * 0.03, seed + 13)) + Math.pow(Math.max(0, u - 12), 1.35) * 0.05; }
    h += (fbm(cx * 0.06, cy * 0.06, seed + 29) - 0.5) * Math.min(3, 0.4 + t * 0.06);
    height[i] = Math.max(0.05, h);
    flood[i] = t < plain * 0.6 ? Math.max(0, 1 - t / (plain * 0.6)) * (h < 0.7 ? 1 : 0.3) : 0;
  }
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    const i = y * VW + x;
    const hx = height[y * VW + Math.min(VW - 1, x + 1)] - height[y * VW + Math.max(0, x - 1)];
    const hy = height[Math.min(VH - 1, y + 1) * VW + x] - height[Math.max(0, y - 1) * VW + x];
    slope[i] = Math.hypot(hx, hy) / 2;
    if (water[i]) continue;
    const cx = x + 0.5, cy = y + 0.5;
    fertile[i] = Math.max(0, Math.min(1, (1 - dist[i] / 28) * (1 - slope[i] * 1.8) * 0.85 + (fbm(cx * 0.08, cy * 0.08, seed + 41) - 0.5) * 0.4 + 0.15));
    const w = fbm(cx * 0.05, cy * 0.05, seed + 53);
    if (w > woods && dist[i] > 4 && slope[i] < 0.7 && height[i] < 9) wood[i] = 1;
  }
  const v = { seed, W: VW, H: VH, height, dist, flood, fertile, slope, wood, water, riverY, halfWidth };
  v.hearth = findHearth(v);
  v.entry = { x: 0.5, y: Math.max(1, Math.min(v.hearth.y, riverY(0.5) - halfWidth(0.5) - 4)) };
  cache.set(seed, v);
  if (cache.size > 8) cache.delete(cache.keys().next().value);
  return v;
}

/** Where the first hearth was lit: flat, dry, on the north bank near the river, towards the middle of the valley. */
function findHearth(v) {
  let best = null, bs = -Infinity;
  for (let y = 4; y < v.H - 4; y++) for (let x = 30; x < v.W - 30; x++) {
    const i = y * v.W + x;
    if (v.water[i] || y + 0.5 > v.riverY(x + 0.5)) continue;
    const d = v.dist[i];
    if (d < 6 || d > 18 || v.flood[i] > 0) continue;
    let s = -v.slope[i] * 12 - Math.abs(x - v.W / 2) * 0.02 + v.fertile[i] * 0.5 - Math.abs(d - 10) * 0.08;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -6; dx <= 6; dx++) { const j = (y + dy) * v.W + (x + dx); if (v.water[j] || v.flood[j] > 0.3) s -= 0.5; s -= v.slope[j] * 0.4; }
    if (s > bs) { bs = s; best = { x: x + 0.5, y: y + 0.5 }; }
  }
  return best || { x: v.W / 2, y: v.H * 0.4 };
}

export const cell = (v, x, y) => (x < 0 || y < 0 || x >= v.W || y >= v.H ? -1 : Math.floor(y) * v.W + Math.floor(x));
/** Ground height at a point (bilinear), for the view and for levelling building pads. */
export function heightAt(v, x, y) {
  const fx = Math.max(0, Math.min(v.W - 1.001, x - 0.5)), fy = Math.max(0, Math.min(v.H - 1.001, y - 0.5));
  const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
  const h = (a, b) => v.height[b * v.W + a];
  return h(ix, iy) * (1 - tx) * (1 - ty) + h(ix + 1, iy) * tx * (1 - ty) + h(ix, iy + 1) * (1 - tx) * ty + h(ix + 1, iy + 1) * tx * ty;
}
