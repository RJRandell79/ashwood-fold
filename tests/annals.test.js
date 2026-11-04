// The annals' connections: entries are numbered and point back to what led to them.
import { describe, it, expect } from 'vitest';
import { run } from '../harness/lib.mjs';
import { log } from '../src/sim/log.js';
import { S } from '../src/sim/state.js';

describe('the annals follow a thread', () => {
  it("numbers every entry, and chains an idea's story from its first thought", () => {
    run(31676, { years: 60 });
    const ns = S.annals.map(e => e.n);
    expect(ns.every(n => Number.isInteger(n))).toBe(true);
    expect(new Set(ns).size).toBe(ns.length);
    const built = S.annals.filter(e => e.built && e.because);
    expect(built.length).toBeGreaterThan(0);
    // follow a built idea back to its first thought
    const byN = new Map(S.annals.map(e => [e.n, e]));
    let e = built[0], steps = 0;
    while (e && e.because && steps < 50) { e = byN.get(Math.min(...e.because)); steps++; }
    expect(e && (e.idea || e.c === 'crossroads')).toBeTruthy();
  });

  it('an entry can name its own causes, and a chronicle line with no category is not numbered', () => {
    run(5, { years: 1 });
    const a = log('The first thing.', 'event', 'event');
    const b = log('The second thing, because of the first.', 'event', 'event', { because: a.n });
    expect(b.because).toEqual([a.n]);
    expect(log('Just the chronicle.', 'event')).toBeNull();
  });
});
