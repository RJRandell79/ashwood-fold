// Elections and the trades: a village must not lose its only baker (or miller, or smith) to the Moot Hall.
import { describe, it, expect } from 'vitest';
import { run } from '../harness/lib.mjs';
import { checkInvariants } from '../harness/invariants.mjs';
import { tallyElection } from '../src/sim/civic.js';
import { LIVE, S } from '../src/sim/state.js';

describe('elections', () => {
  it('when the only baker is elected reeve, the trade passes on or a baker is sent for', () => {
    run(5, { years: 1 });
    const baker = LIVE.find(a => a.job === 'baker');
    for (const a of LIVE) if (a !== baker && a.job === 'baker') a.job = 'labourer';
    S.election = { cands: [baker.id], lean: {} };
    tallyElection();
    expect(baker.job).toBe('reeve');
    expect(LIVE.some(a => a.job === 'baker') || S.vacant.some(v => v.job === 'baker')).toBe(true);
    expect(checkInvariants(S)).toEqual([]);
  });
});
