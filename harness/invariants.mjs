import { valley } from '../src/sim/valley.js';

// Checks that should hold at any moment of any run. Returns a list of problems (empty = fine).
export function checkInvariants(S) {
  const bad = [];
  const n = S.agents.length;
  const fin = (v, what) => { if (typeof v !== 'number' || !Number.isFinite(v)) bad.push(`${what} is not a finite number (${v})`); };
  for (const [k, v] of Object.entries(S.stores)) { fin(v, `stores.${k}`); if (v < -1e-9) bad.push(`stores.${k} is negative (${v})`); }
  if (S.op.length !== n || S.op.some(r => r.length !== n)) bad.push(`opinion matrix is not ${n}x${n}`);
  S.agents.forEach((a, i) => {
    if (a.id !== i) bad.push(`agent at index ${i} has id ${a.id}`);
    fin(a.age, `${a.name}.age`); fin(a.coins, `${a.name}.coins`);
    if (a.coins < -1e-9) bad.push(`${a.name} has negative coins (${a.coins})`);
    for (const k of ['hunger', 'tired', 'lonely']) if (!(a[k] >= 0 && a[k] <= 1)) bad.push(`${a.name}.${k} out of range (${a[k]})`);
    for (const p of a.parents) if (!(p >= 0 && p < n)) bad.push(`${a.name} has unknown parent ${p}`);
    if (a.spouse >= 0) {
      const s = S.agents[a.spouse];
      if (!s) bad.push(`${a.name} has unknown spouse ${a.spouse}`);
      else if (!a.dead && !s.dead && s.spouse !== a.id) bad.push(`${a.name} and ${s.name} disagree about being married`);
    }
    if (!a.dead && !a.home) bad.push(`${a.name} has no home`);
  });
  for (const [id, t] of Object.entries(S.tech)) {
    for (const i of [...t.backers, ...t.opponents]) if (!(i >= 0 && i < n)) bad.push(`idea ${id} lists unknown person ${i}`);
    if (t.state !== 'none' && t.inventor != null && !(t.inventor >= 0 && t.inventor < n)) bad.push(`idea ${id} has unknown inventor`);
  }
  // Places: every one on dry land, inside the valley, clear of every other place and of the lines.
  if (S.places && S.valley) {
    const v = valley(S.valley.seed), ps = Object.values(S.places), taken = new Map();
    for (const p of ps) {
      if (p.x < 0 || p.y < 0 || p.x + p.w > v.W || p.y + p.h > v.H) { bad.push(`${p.id} stands outside the valley`); continue; }
      for (let y = Math.floor(p.y); y < Math.ceil(p.y + p.h); y++) for (let x = Math.floor(p.x); x < Math.ceil(p.x + p.w); x++) {
        const i = y * v.W + x;
        if (v.water[i]) bad.push(`${p.id} stands in the river at ${x},${y}`);
        if (taken.has(i)) bad.push(`${p.id} overlaps ${taken.get(i)}`);
        taken.set(i, p.id);
      }
    }
    for (const [id, ys] of Object.entries(S.lines || {})) {
      if (ys.length !== v.W) bad.push(`line ${id} does not cross the valley`);
      ys.forEach((y, x) => { const i = y * v.W + x; if (taken.has(i)) bad.push(`line ${id} runs through ${taken.get(i)}`); });
    }
    for (const p of ps) if (p.y + p.h / 2 > v.riverY(p.x + p.w / 2) && !(S.crossing && S.crossing.kind === 'bridge')) bad.push(`${p.id} stands on the far bank with no bridge`);
    if (S.crossing && !(S.crossing.x >= 0 && S.crossing.x < v.W)) bad.push('the river crossing is outside the valley');
    for (const a of S.agents) if (!a.dead) {
      if (a.home && !S.places[a.home]) bad.push(`${a.name} lives at missing place ${a.home}`);
      if (a.act && a.act.place && !S.places[a.act.place]) bad.push(`${a.name} is heading for missing place ${a.act.place}`);
    }
    for (const [k, f] of Object.entries(S.foot || {})) if (!(f >= 1) || !(+k >= 0 && +k < v.W * v.H)) { bad.push(`bad footfall ${k}=${f}`); break; }
  }
  // dedupe overlap reports
  for (let i = bad.length - 1; i > 0; i--) if (bad.indexOf(bad[i]) < i) bad.splice(i, 1);
  for (let i = 1; i < S.annals.length; i++) if (S.annals[i].t < S.annals[i - 1].t) { bad.push('annals are out of order'); break; }
  if (S.era < 0 || S.era > 4) bad.push(`era out of range (${S.era})`);
  for (const e of S.annals) if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(e.h)) { bad.push(`broken text in the annals: ${e.h.replace(/<[^>]+>/g, '').slice(0, 90)}`); break; }
  return bad;
}
