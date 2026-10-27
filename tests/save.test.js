import { describe, it, expect } from 'vitest';
import { run } from '../harness/lib.mjs';
import { encode, decode } from '../src/save/codec.js';
import { S, setState } from '../src/sim/state.js';
import { tick } from '../src/sim/clock.js';

describe('save codes', () => {
  it('round-trips a village through an AF1 code', () => {
    run(5, { years: 2 });
    const code = encode();
    expect(code.startsWith('AF1:')).toBe(true);
    const back = decode(code);
    expect(back.tick).toBe(S.tick);
    expect(back.agents.map(a => a.name)).toEqual(S.agents.map(a => a.name));
  });

  it('a decoded village carries on running', () => {
    run(9, { years: 1 });
    setState(decode(encode()));
    for (let i = 0; i < 2000; i++) tick();
    expect(S.annals.length).toBeGreaterThan(0);
  });

  it('rejects text that is not a save code', () => {
    expect(() => decode('hello')).toThrow(/AF1/);
  });
});
