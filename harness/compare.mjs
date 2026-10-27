// Behaviour report: runs the same villages on this checkout and on another (usually main)
// and says how many come out identical, where the rest first part ways, and how the
// averages moved. Informational: behaviour is allowed to change, but every change shows.
//   node harness/compare.mjs --base ../main-checkout [--seeds 20] [--years 30] [--markdown out.md]
import fs from 'node:fs';
import path from 'node:path';
import { canonical } from './canonical.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const baseDir = path.resolve(arg('--base', '../base'));
const seeds = Number(arg('--seeds', 20)), years = Number(arg('--years', 30));
const out = arg('--markdown', null);

const base = await import(path.join(baseDir, 'harness/lib.mjs'));
const cur = await import(new URL('./lib.mjs', import.meta.url));
const text = h => h.replace(/<[^>]+>/g, '');
const day = t => Math.floor(t / 144) + 1;
const metrics = S => {
  const an = S.annals, built = id => S.tech[id] && S.tech[id].state === 'built' ? Math.floor(S.tech[id].builtAt / 144 / 20) + 1 : null;
  return {
    living: S.agents.filter(a => !a.dead).length, lives: S.agents.length,
    births: an.filter(e => e.c === 'birth').length, deaths: an.filter(e => e.c === 'death').length,
    trials: an.filter(e => e.c === 'court').length, wrecks: an.filter(e => e.sabotage).length,
    lastEraYear: (() => { const e = an.filter(x => x.c === 'era').at(-1); return e ? Math.floor(e.t / 144 / 20) + 1 : null; })(),
    ideasBuilt: Object.keys(S.tech).filter(id => built(id) != null).length,
  };
};

let identical = 0, sameAnnals = 0;
const diverged = [], sums = { base: {}, cur: {} }, counts = { base: {}, cur: {} };
for (let s = 1; s <= seeds; s++) {
  const a = JSON.parse(JSON.stringify(base.run(s, { years }))), b = JSON.parse(JSON.stringify(cur.run(s, { years })));
  if (canonical(a) === canonical(b)) identical++;
  const i = a.annals.findIndex((e, k) => !b.annals[k] || text(e.h) !== text(b.annals[k].h));
  if (i < 0 && a.annals.length === b.annals.length) sameAnnals++;
  else { const k = i < 0 ? a.annals.length : i; diverged.push({ seed: s, day: day((a.annals[k] || b.annals[k]).t), main: text((a.annals[k] || { h: '(nothing)' }).h), now: text((b.annals[k] || { h: '(nothing)' }).h) }); }
  for (const [side, S] of [['base', a], ['cur', b]]) for (const [k, v] of Object.entries(metrics(S))) if (v != null) { sums[side][k] = (sums[side][k] || 0) + v; counts[side][k] = (counts[side][k] || 0) + 1; }
}
const avg = (side, k) => counts[side][k] ? (sums[side][k] / counts[side][k]).toFixed(2) : '–';
const lines = [
  `### Behaviour compared with the base branch`,
  ``,
  `${seeds} villages × ${years} years. **${identical}** identical in full, **${sameAnnals}** with identical annals.`,
  ``,
  `| Measure (average) | Base | This branch |`, `| --- | --- | --- |`,
  ...Object.keys(sums.base).map(k => `| ${k} | ${avg('base', k)} | ${avg('cur', k)} |`),
];
if (diverged.length) {
  lines.push('', `First difference in the annals (up to 10 villages):`, '', '| Seed | Day | Base | This branch |', '| --- | --- | --- | --- |');
  for (const d of diverged.slice(0, 10)) lines.push(`| ${d.seed} | ${d.day} | ${d.main.slice(0, 100).replace(/\|/g, '/')} | ${d.now.slice(0, 100).replace(/\|/g, '/')} |`);
}
const md = lines.join('\n');
console.log(md);
if (out) fs.writeFileSync(out, md + '\n');
