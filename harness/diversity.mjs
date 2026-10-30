// Diversity report: do different seeds give different histories, or the same history with new names?
// Runs whole games (the manor village, the interlude, the industrial village) and measures what the
// design review of 30 October asked for: eras reached, ideas abandoned, population over time, family
// survival, building survival across the interlude, how the valley's shape bears on what it becomes,
// and what nudging changes across a whole game.
//   node harness/diversity.mjs [--seeds 8] [--years 90] [--policies never,random] [--jobs N] [--markdown out.md]
//                              [--json raw.json] [--from raw.json]
// Each seed is played once per policy. The first policy is the baseline the others are compared with.
import fs from 'node:fs';
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { AGES } from '../src/data/ages.js';


async function main() {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const n = Number(arg('--seeds', 8)), years = Number(arg('--years', 90)), out = arg('--markdown', null);
  const policies = arg('--policies', 'never,random').split(',');
  const jobs = Math.max(1, Number(arg('--jobs', os.availableParallelism ? os.availableParallelism() : os.cpus().length)));
  const queue = [];
  for (const policy of policies) for (let s = 1; s <= n; s++) queue.push({ seed: s * 7919, years, policy });
  // --json saves the raw records; --from reports on saved records without playing again
  const from = arg('--from', null), json = arg('--json', null);
  const results = from ? JSON.parse(fs.readFileSync(from, 'utf8')) : await pool(queue, jobs);
  if (json) fs.writeFileSync(json, JSON.stringify(results));
  const R = {}; for (const p of policies) R[p] = results.filter(r => r.policy === p).sort((a, b) => a.seed - b.seed);
  const md = report(R, policies, n, years);
  console.log(md);
  if (out) fs.writeFileSync(out, md);
  const broken = results.filter(r => r.broken);
  for (const r of broken) console.error(`seed ${r.seed} (${r.policy}): ${r.broken} invariant breaks\n  ${r.problems.join('\n  ')}`);
  process.exit(broken.length ? 1 : 0);
}

function pool(queue, jobs) {
  return new Promise((resolve, reject) => {
    const out = [], todo = queue.slice(); let live = 0;
    const next = w => { if (!todo.length) { w.terminate(); if (--live === 0) resolve(out); return; } w.postMessage(todo.shift()); };
    for (let i = 0; i < Math.min(jobs, queue.length); i++) {
      const w = new Worker(new URL(import.meta.url)); live++;
      w.on('message', r => { out.push(r); process.stderr.write('.'); next(w); });
      w.on('error', reject);
      next(w);
    }
  }).finally(() => process.stderr.write('\n'));
}

// --- the report ---
const sorted = xs => xs.slice().sort((a, b) => a - b);
const med = xs => { const s = sorted(xs); return s.length ? s[Math.floor(s.length / 2)] : null; };
const span = xs => { const s = sorted(xs.filter(x => x != null)); return s.length ? `${r1(s[0])} / ${r1(s[Math.floor(s.length / 2)])} / ${r1(s[s.length - 1])}` : '–'; };
const r1 = x => (Number.isInteger(x) ? x : x.toFixed(1));
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const share = (xs, f) => `${Math.round(xs.filter(f).length / xs.length * 100)}%`;
const table = (L, head, rows) => { L.push(`| ${head.join(' | ')} |`, `|${head.map(() => ' --- |').join('')}`); for (const r of rows) L.push(`| ${r.join(' | ')} |`); L.push(''); };
const keys = o => Object.keys(o || {});
const drop = (series, frac) => { let peak = 0; for (const v of series) { peak = Math.max(peak, v); if (peak && v <= peak * (1 - frac)) return true; } return false; };
const stall = series => { let best = 0, run = 0; for (let i = 1; i < series.length; i++) { run = series[i] > series[i - 1] ? 0 : run + 1; best = Math.max(best, run); } return best; };

function report(R, policies, n, years) {
  const base = R[policies[0]], L = [];
  L.push(`### Diversity across ${n} villages × ${years} years`, '');
  L.push(`Each village is played to the end once without nudges${policies.length > 1 ? ` and once under each of: ${policies.slice(1).join(', ')}` : ''}. Spans are min / median / max. Years are calendar years.`, '');

  // 1. eras and the interlude
  L.push('#### Ages and eras', '');
  const eraRows = [];
  for (const a of Object.values(AGES)) for (let e = 1; e < a.eras.length; e++) { const ys = base.map(r => r.eras[`${a.id}:${e}`]).filter(y => y != null); eraRows.push([`${a.eras[e]} (${a.id})`, share(base, r => r.eras[`${a.id}:${e}`] != null), span(ys)]); }
  eraRows.push(['The interlude', share(base, r => r.interlude != null), span(base.map(r => r.interlude))]);
  table(L, ['Era', 'Reached', 'Year'], eraRows);
  const finals = {}; for (const r of base) { const k = `${AGES[r.age].eras[r.era]} (${r.age})`; finals[k] = (finals[k] || 0) + 1; }
  table(L, ['Measure', 'Value'], [
    ['Where villages ended', Object.entries(finals).map(([k, v]) => `${k} ${v}`).join(', ')],
    ['Longest spell in one era (years)', span(base.map(r => r.longestEra))],
    ['Distinct orders in which ideas were built', `${new Set(base.map(r => Object.entries(r.built).sort((a, b) => a[1] - b[1]).map(e => e[0]).join('>'))).size} of ${n}`],
  ]);

  // 2. ideas: built, abandoned, fizzled
  L.push('#### Ideas', '');
  const ideaRows = [];
  for (const a of Object.values(AGES)) for (const d of a.ideas) {
    const id = `${a.id}:${d.id}`;
    ideaRows.push([`${d.name} (${a.id})`, share(base, r => r.built[id] != null), span(base.map(r => r.built[id])), share(base, r => r.abandoned[id]), share(base, r => r.abandoned[id] && r.built[id] == null)]);
  }
  table(L, ['Idea', 'Built', 'Year built', 'Set aside at least once', 'Set aside and never built'], ideaRows);
  table(L, ['Measure', 'Value'], Object.values(AGES).map(a => [`Ideas that fizzled per village (${a.id})`, span(base.map(r => r.fizzles[a.id] || 0))]));

  // 3. population over time
  L.push('#### Population over time', '');
  const marks = []; for (let y = 10; y <= years; y += 10) marks.push(y);
  table(L, ['Game year', ...marks.map(String)], [['People living', ...marks.map(y => span(base.map(r => r.pop[y - 1])))], ['Places built', ...marks.map(y => span(base.map(r => r.places[y - 1])))]]);
  const per = (k, f) => Object.values(AGES).map(a => [`${f} (${a.id})`, k(a.id)]);
  table(L, ['Measure', 'Value'], [
    ...per(a => span(base.map(r => Math.max(...(a === 'medieval' ? r.popFirst : r.popLast), 0))), 'Peak population'),
    ...per(a => share(base, r => drop(a === 'medieval' ? r.popFirst : r.popLast, 0.2)), 'Villages that fell a fifth from a peak'),
    ...per(a => span(base.map(r => stall(a === 'medieval' ? r.placesFirst : r.placesLast))), 'Longest spell without a new building (years)'),
    ['Deaths by cause (all villages)', deathRows(base)],
  ]);

  // 4. families across the interlude
  L.push('#### Families across the interlude', '');
  const fam = base.filter(r => r.families);
  table(L, ['Measure', 'Value'], fam.length ? [
    ['Families in the manor village at its close', span(fam.map(r => r.families.atClose))],
    ['Came through the centuries', span(fam.map(r => r.families.kept.length))],
    ['Lost', span(fam.map(r => r.families.lost.length))],
    ['New families descended from an old one', span(fam.map(r => r.families.heirs))],
    ['New families bearing an old name only', span(fam.map(r => r.families.namesakes))],
    ['Old lines still living at the end', span(fam.map(r => r.families.heirsLiving))],
    ['Distinct sets of surviving families', `${new Set(fam.map(r => r.families.kept.slice().sort().join(','))).size} of ${fam.length}`],
  ] : [['No village reached the interlude', '–']]);

  // 5. buildings across the interlude
  L.push('#### Buildings across the interlude', '');
  const bld = base.filter(r => r.buildings);
  table(L, ['Measure', 'Value'], bld.length ? [
    ['Still standing as they were', span(bld.map(r => r.buildings.stood))],
    ['Rebuilt on the old footings', span(bld.map(r => r.buildings.rebuilt))],
    ['Fallen to ruin', span(bld.map(r => r.buildings.ruined))],
    ['Gone, their sites remembered', span(bld.map(r => r.buildings.gone))],
    ['New buildings that stand on an old site', span(bld.map(r => r.buildings.onOldSites))],
    ['How far the heart of the village moved (cells)', span(bld.map(r => r.buildings.heartMoved))],
  ] : [['No village reached the interlude', '–']]);

  // 6. the valley's shape and what it became
  L.push('#### The valley and what it became', '');
  L.push('Villages are split at the median of each feature of the valley around the first hearth. Each cell gives the outcome in the lower half, then the upper half.', '');
  const features = [['canal', 'Canal difficulty'], ['flat', 'Flat dry land near the hearth'], ['wood', 'Woodland near the hearth'], ['fertile', 'Fertility near the hearth'], ['river', 'River width']];
  const outcomes = [
    ['Canal', r => r.built['industrial:canal'] != null],
    ['Turnpike', r => r.built['industrial:turnpike'] != null],
    ['Bridge', r => r.crossing === 'bridge'],
    ['Wood cleared', r => r.built['medieval:assart'] != null || r.built['industrial:assart'] != null],
    ['Market', r => r.built['medieval:charter'] != null],
  ];
  table(L, ['Feature', ...outcomes.map(o => o[0]), 'People at the end', 'Far-bank places'], features.map(([k, label]) => {
    const m = med(base.map(r => r.geo[k])), lo = base.filter(r => r.geo[k] < m), hi = base.filter(r => r.geo[k] >= m);
    const pc = (xs, f) => (xs.length ? `${Math.round(xs.filter(f).length / xs.length * 100)}%` : '–');
    return [label, ...outcomes.map(([, f]) => `${pc(lo, f)} · ${pc(hi, f)}`), `${r1(mean(lo.map(r => r.living)))} · ${r1(mean(hi.map(r => r.living)))}`, `${r1(mean(lo.map(r => r.farBank)))} · ${r1(mean(hi.map(r => r.farBank)))}`];
  }));

  // 7. what nudging changes, across whole games
  if (policies.length > 1) {
    L.push('#### What nudges change across a whole game', '');
    L.push(`Each policy's villages are compared with the same villages left alone (${policies[0]}).`, '');
    const cmp = (p, f) => R[p].map((r, i) => f(r, base[i]));
    const eraShift = (a, b) => { const ks = keys(a.eras).filter(k => b.eras[k] != null); return ks.length ? mean(ks.map(k => Math.abs(a.eras[k] - b.eras[k]))) : 0; };
    const builtSet = r => new Set(keys(r.built));
    const differ = (a, b) => { const x = builtSet(a), y = builtSet(b); return [...x].some(k => !y.has(k)) || [...y].some(k => !x.has(k)); };
    const rows = [
      ['Crossroads offered per village', p => r1(mean(R[p].map(r => r.offered)))],
      ['Choices made per village', p => r1(mean(R[p].map(r => r.taken.length)))],
      ['Set of ideas built differs', p => (p === policies[0] ? '–' : `${cmp(p, differ).filter(Boolean).length} of ${n}`)],
      ['Era years moved by (mean, years)', p => (p === policies[0] ? '–' : span(cmp(p, eraShift)))],
      ['Interlude moved by (years)', p => (p === policies[0] ? '–' : span(cmp(p, (a, b) => (a.interlude != null && b.interlude != null ? Math.abs(a.interlude - b.interlude) : null))))],
      ['Ended in a different era', p => (p === policies[0] ? '–' : `${cmp(p, (a, b) => a.age !== b.age || a.era !== b.era).filter(Boolean).length} of ${n}`)],
      ['Different families came through the interlude', p => (p === policies[0] ? '–' : `${cmp(p, (a, b) => a.families && b.families && a.families.kept.slice().sort().join() !== b.families.kept.slice().sort().join()).filter(Boolean).length} of ${n}`)],
      ['Different buildings survived the interlude', p => (p === policies[0] ? '–' : `${cmp(p, (a, b) => a.buildings && b.buildings && ['stood', 'rebuilt', 'ruined', 'gone'].some(k => a.buildings[k] !== b.buildings[k])).filter(Boolean).length} of ${n}`)],
      ['People living at the end (mean)', p => r1(mean(R[p].map(r => r.living)))],
      ['Deaths (mean, not counting those who left)', p => r1(mean(R[p].map(r => Object.entries(r.deaths).filter(([c]) => c !== 'left').reduce((s, [, v]) => s + v, 0))))],
      ['Deaths from hunger (mean)', p => r1(mean(R[p].map(r => Object.entries(r.deaths).filter(([c]) => /hunger|starv|want/.test(c)).reduce((s, [, v]) => s + v, 0))))],
    ];
    table(L, ['Measure', ...policies], rows.map(([label, f]) => [label, ...policies.map(f)]));
  }
  const broken = Object.values(R).flat().filter(r => r.broken).length;
  L.push(broken ? `**${broken} runs broke invariants.**` : 'All runs kept their invariants.');
  return L.join('\n') + '\n';
}

function deathRows(rs) {
  const c = {}; for (const r of rs) for (const [k, v] of Object.entries(r.deaths)) c[k] = (c[k] || 0) + v;
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ') || '–';
}

// workers play the games; the main thread hands them out and writes the report
if (!isMainThread) {
  const { summarise } = await import('./summarise.mjs');
  parentPort.on('message', job => parentPort.postMessage(summarise(job.seed, job)));
} else {
  await main();
}
