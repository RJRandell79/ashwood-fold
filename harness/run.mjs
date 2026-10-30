// Balance report: runs several villages headlessly and summarises what happened.
//   node harness/run.mjs [--seeds 1,11,23,42,77] [--years 30] [--json out.json]
import fs from 'node:fs';
import { run, TICKS_PER_YEAR } from './lib.mjs';
import { checkInvariants } from './invariants.mjs';
import { TPD } from '../src/data/world.js';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('--seeds', '1,11,23,42,77').split(',').map(Number);
const years = Number(arg('--years', 110)); // a whole game: the manor village (40 to 70 years), the interlude, the industrial village
const yearOf = t => Math.floor(t / TPD / 20) + 1;

const rows = [];
let broken = 0;
for (const seed of seeds) {
  const problems = [];
  const t0 = performance.now();
  const S = run(seed, { years, onYear: (s, y) => { for (const p of checkInvariants(s)) problems.push(`year ${y}: ${p}`); } });
  const ms = performance.now() - t0;
  const an = S.annals, count = c => an.filter(e => e.c === c).length;
  const deaths = {};
  for (const a of S.agents) if (a.dead) { const c = a.dead.exiled ? (/Manchester/.test(a.dead.cause) ? 'emigrated' : /navvy/.test(a.dead.cause) ? 'moved on' : 'banished') : a.dead.cause; deaths[c] = (deaths[c] || 0) + 1; }
  const built = Object.entries(S.tech).filter(([, t]) => t.state === 'built').map(([id, t]) => `${id}@Y${yearOf(t.builtAt)}`);
  const row = {
    seed, years, msPerTick: +(ms / (years * TICKS_PER_YEAR)).toFixed(3),
    living: S.agents.filter(a => !a.dead).length, lives: S.agents.length,
    births: count('birth'), weddings: count('wedding'), deaths,
    built, fizzled: an.filter(e => e.fizzle).length,
    trials: count('court'), guilty: an.filter(e => e.c === 'court' && e.guilty).length,
    elections: an.filter(e => e.election).length,
    eras: an.filter(e => e.c === 'era').map(e => `${e.era}@Y${yearOf(e.t)}`),
    annals: an.length, problems,
  };
  rows.push(row);
  if (problems.length) broken++;
  console.log(`\nseed ${seed} · ${years} years · ${row.msPerTick} ms/tick`);
  console.log(`  people   ${row.living} living of ${row.lives} lives · ${row.births} births · ${row.weddings} weddings`);
  console.log(`  departed ${Object.entries(deaths).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${n} ${c}`).join(', ') || 'none'}`);
  console.log(`  ideas    built ${built.join(' ') || 'none'} · ${row.fizzled} fizzled`);
  console.log(`  civic    ${row.elections} elections · ${row.trials} trials (${row.guilty} guilty)`);
  console.log(`  eras     ${row.eras.join(' ') || 'none'}`);
  if (problems.length) console.log(`  PROBLEMS ${problems.length}:\n    ${problems.slice(0, 10).join('\n    ')}`);
}
const json = arg('--json', null);
if (json) fs.writeFileSync(json, JSON.stringify(rows, null, 2));
if (broken) { console.error(`\n${broken} run(s) broke invariants`); process.exit(1); }
console.log(`\nAll ${seeds.length} runs kept their invariants.`);
