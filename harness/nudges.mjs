// Nudge report: runs the same villages under different crossroads policies and compares them.
// Nudges should change histories noticeably without taking over, and never nudging must not be
// worse on any measure (declining is free).
//   node harness/nudges.mjs [--seeds 16] [--years 30] [--markdown out.md]
import fs from 'node:fs';
import { run } from './lib.mjs';
import { checkInvariants } from './invariants.mjs';
import { IDEAS } from '../src/data/ideas.js';
import { TPD, YEAR_DAYS } from '../src/data/world.js';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const n = Number(arg('--seeds', 16)), years = Number(arg('--years', 30)), out = arg('--markdown', null);
const yearOf = t => Math.floor(t / TPD / YEAR_DAYS) + 1;
const policies = ['never', 'first', 'random'], res = {};
let broken = 0;
for (const policy of policies) {
  res[policy] = [];
  for (let s = 1; s <= n; s++) {
    const S = run(s * 7919, { years, policy, onYear: st => { if (checkInvariants(st).length) broken++; } });
    const past = S.xr ? S.xr.past : [];
    res[policy].push({
      offered: past.length + (S.xr ? S.xr.open.length : 0), taken: past.filter(p => p.label !== 'Let it be').length,
      built: Object.fromEntries(IDEAS.map(d => [d.id, S.tech[d.id].state === 'built' ? yearOf(S.tech[d.id].builtAt) : null])),
      living: S.agents.filter(a => !a.dead).length, deaths: S.agents.filter(a => a.dead && !a.dead.exiled).length,
      hungry: S.annals.filter(e => /went to bed hungry/.test(e.h)).length + S.log.filter(e => /went to bed hungry/.test(e.h)).length,
      feuds: S.annals.filter(e => e.c === 'feud').length, era: S.era,
      results: past.filter(p => p.status && p.label !== 'Let it be').map(p => p.status),
    });
  }
}
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length, f = x => x.toFixed(1);
const L = [`### Crossroads across ${n} villages × ${years} years`, '', `| Measure | ${policies.join(' | ')} |`, `| --- |${policies.map(() => ' --- |').join('')}`];
const row = (name, fn) => L.push(`| ${name} | ${policies.map(p => fn(res[p])).join(' | ')} |`);
row('Crossroads offered per village', r => f(mean(r.map(x => x.offered))));
row('Choices made per village', r => f(mean(r.map(x => x.taken))));
row('Living at the end', r => f(mean(r.map(x => x.living))));
row('Deaths (not counting those who left)', r => f(mean(r.map(x => x.deaths))));
row('Feuds opened', r => f(mean(r.map(x => x.feuds))));
row('Final era (mean)', r => f(mean(r.map(x => x.era))));
for (const d of IDEAS) row(`${d.name} built`, r => `${Math.round(r.filter(x => x.built[d.id] != null).length / r.length * 100)}%`);
const outcomes = p => { const all = res[p].flatMap(x => x.results), c = {}; for (const s of all) c[s] = (c[s] || 0) + 1; return Object.entries(c).map(([k, v]) => `${k} ${v}`).join(', ') || '–'; };
row('Outcomes of choices', r => outcomes(policies[Object.values(res).indexOf(r)]));
// how often a nudged run differs from the un-nudged run of the same village in which ideas got built
const differs = p => res[p].filter((x, i) => IDEAS.some(d => (x.built[d.id] == null) !== (res.never[i].built[d.id] == null))).length;
row('Villages whose set of built ideas differs from never nudging', r => { const p = policies[Object.values(res).indexOf(r)]; return p === 'never' ? '–' : `${differs(p)} of ${n}`; });
L.push('', broken ? `**${broken} invariant breaks.**` : 'All runs kept their invariants.');
const md = L.join('\n') + '\n';
console.log(md);
if (out) fs.writeFileSync(out, md);
process.exit(broken ? 1 : 0);
