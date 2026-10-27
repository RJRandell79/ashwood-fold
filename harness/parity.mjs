// Phase 0 gate: the port must produce exactly the same village as v5 from the same seed.
//   node harness/parity.mjs [--seeds 1,11,23] [--years 10]
import { run, TICKS_PER_YEAR } from './lib.mjs';
import { runV5 } from './v5-reference.mjs';
import { canonical } from './canonical.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('--seeds', '1,11,23,42,77').split(',').map(Number);
const years = Number(arg('--years', 10));
const ticks = years * TICKS_PER_YEAR;

let failed = 0;
for (const seed of seeds) {
  const t0 = Date.now();
  const ref = runV5(seed, { ticks });
  const t1 = Date.now();
  const got = JSON.parse(JSON.stringify(run(seed, { ticks })));
  const t2 = Date.now();
  const same = canonical(ref) === canonical(got);
  let detail = '';
  if (!same) {
    failed++;
    const i = ref.annals.findIndex((e, k) => JSON.stringify(e) !== JSON.stringify(got.annals[k]));
    const keys = Object.keys(ref).filter(k => canonical(ref[k]) !== canonical(got[k]));
    detail = ` differs in [${keys.join(', ')}]` + (i >= 0 ? `; first annal mismatch #${i}:\n  v5:   ${ref.annals[i]?.h}\n  port: ${got.annals[i]?.h}` : '');
  }
  console.log(`seed ${seed}: ${years} years, ${ref.annals.length} annals, ${ref.agents.length} lives — ${same ? 'identical' : 'DIFFERENT'} (v5 ${t1 - t0} ms, port ${t2 - t1} ms)${detail}`);
}
if (failed) { console.error(`${failed} seed(s) differ`); process.exit(1); }
console.log('Parity: the port matches v5 exactly.');
