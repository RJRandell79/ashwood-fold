// Diversity report: do different seeds give different histories, or the same history with new names?
// Runs many villages and reports how often each idea is built and when, when the eras arrive, how much
// the layouts differ, which founding families survive, and how often a village stalls.
//   node harness/diversity.mjs [--seeds 20] [--years 30] [--markdown out.md]
import fs from 'node:fs';
import { run } from './lib.mjs';
import { TPD, YEAR_DAYS } from '../src/data/world.js';
import { IDEAS } from '../src/data/ideas.js';
import { FOLK } from '../src/data/folk.js';
import { valley } from '../src/sim/valley.js';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const n = Number(arg('--seeds', 20)), years = Number(arg('--years', 30)), out = arg('--markdown', null);
const yearOf = t => Math.floor(t / TPD / YEAR_DAYS) + 1;
const surname = name => name.split(' ').slice(1).join(' ');
const founders = [...new Set(FOLK.map(f => surname(f[0])))];

const runs = [];
for (let seed = 1; seed <= n; seed++) {
  const S = run(seed * 7919, { years });
  const v = valley(S.valley.seed), sq = S.places.square;
  const built = IDEAS.filter(d => S.tech[d.id].state === 'built');
  const living = S.agents.filter(a => !a.dead);
  runs.push({
    seed,
    order: built.slice().sort((a, b) => S.tech[a.id].builtAt - S.tech[b.id].builtAt).map(d => d.id).join(' > '),
    builtYear: Object.fromEntries(built.map(d => [d.id, yearOf(S.tech[d.id].builtAt)])),
    fizzled: S.annals.filter(e => e.fizzle).length,
    eras: Object.fromEntries(S.annals.filter(e => e.c === 'era').map(e => [e.era, yearOf(e.t)])),
    finalEra: S.era,
    // where each founding building stands relative to the Green, to compare layouts between valleys
    offsets: Object.fromEntries(Object.values(S.places).filter(p => p.id !== 'square' && !p.id.startsWith('cottage')).map(p => [p.id, [p.x + p.w / 2 - sq.x - sq.w / 2, p.y + p.h / 2 - sq.y - sq.h / 2]])),
    farBank: Object.values(S.places).filter(p => p.y + p.h / 2 > v.riverY(p.x + p.w / 2)).length,
    places: Object.keys(S.places).length,
    living: living.length,
    families: founders.filter(f => living.some(a => surname(a.name) === f)).length,
    surnames: new Set(living.map(a => surname(a.name))).size,
  });
}

const stats = xs => { const s = xs.slice().sort((a, b) => a - b); return s.length ? { min: s[0], med: s[Math.floor(s.length / 2)], max: s[s.length - 1] } : null; };
const span = xs => { const s = stats(xs); return s ? `${s.min} / ${s.med} / ${s.max}` : '–'; };
const pct = k => `${Math.round(k / n * 100)}%`;
const L = [];
L.push(`### Diversity across ${n} villages × ${years} years`, '');
L.push('Spans are min / median / max.', '');
L.push('| Idea | Built | Year built |', '| --- | --- | --- |');
for (const d of IDEAS) { const ys = runs.map(r => r.builtYear[d.id]).filter(y => y != null); L.push(`| ${d.name} | ${pct(ys.length)} | ${span(ys)} |`); }
L.push('', '| Era | Reached | Year reached |', '| --- | --- | --- |');
for (let e = 1; e <= 4; e++) { const ys = runs.map(r => r.eras[e]).filter(y => y != null); L.push(`| ${e} | ${pct(ys.length)} | ${span(ys)} |`); }
const orders = new Map(); for (const r of runs) orders.set(r.order, (orders.get(r.order) || 0) + 1);
const top = [...orders.values()].sort((a, b) => b - a)[0];
// layout spread: for each building, the average distance between its offsets from the Green in different villages
const ids = [...new Set(runs.flatMap(r => Object.keys(r.offsets)))], spread = [];
for (const id of ids) { const o = runs.map(r => r.offsets[id]).filter(Boolean); let s = 0, k = 0; for (let i = 0; i < o.length; i++) for (let j = i + 1; j < o.length; j++) { s += Math.hypot(o[i][0] - o[j][0], o[i][1] - o[j][1]); k++; } if (k) spread.push(s / k); }
L.push('', '| Measure | Value |', '| --- | --- |');
L.push(`| Distinct orders in which ideas were built | ${orders.size} of ${n} (the commonest order in ${top} ${top === 1 ? 'village' : 'villages'}) |`);
L.push(`| Ideas that fizzled per village | ${span(runs.map(r => r.fizzled))} |`);
L.push(`| Villages stalled short of the last era | ${pct(runs.filter(r => r.finalEra < 4).length)} |`);
L.push(`| Layout spread: a building's position relative to the Green differs by | ${(spread.reduce((a, b) => a + b, 0) / spread.length).toFixed(1)} cells on average between villages |`);
L.push(`| Places built | ${span(runs.map(r => r.places))} |`);
L.push(`| Places on the far bank | ${span(runs.map(r => r.farBank))} |`);
L.push(`| People living at the end | ${span(runs.map(r => r.living))} |`);
L.push(`| Founding families with living members (of ${founders.length}) | ${span(runs.map(r => r.families))} |`);
L.push(`| Surnames among the living | ${span(runs.map(r => r.surnames))} |`);
const md = L.join('\n') + '\n';
console.log(md);
if (out) fs.writeFileSync(out, md);
