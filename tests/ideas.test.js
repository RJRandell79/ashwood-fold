import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { IDEAS } from '../src/data/ideas.js';
import { validateBuildings, validateIdeas } from '../src/sim/validate.js';

describe('ideas are data', () => {
  it('the idea records validate', () => {
    expect(validateIdeas()).toEqual([]);
  });

  it('the building records validate, and a missing legacy is caught', () => {
    expect(validateBuildings()).toEqual([]);
    expect(validateBuildings({ shed: { w: 2, h: 2 } }).join('\n')).toMatch(/legacy/);
  });

  it('the validator catches broken records', () => {
    const broken = [
      { ...IDEAS[0], id: 'a', requires: ['b'], effects: { flying: { set: 1 } }, pressure: { base: 1, when: { moonFull: 1 } } },
      { ...IDEAS[1], id: 'b', requires: ['a'], emblem: 'dragon' },
    ];
    const errors = validateIdeas(broken).join('\n');
    expect(errors).toMatch(/requirement cycle/);
    expect(errors).toMatch(/unknown effect flying/);
    expect(errors).toMatch(/unknown signal moonFull/);
    expect(errors).toMatch(/emblem dragon/);
  });

  it('nothing in src/sim names an idea', () => {
    const dir = path.resolve('src/sim');
    const ids = IDEAS.map(d => d.id);
    const offenders = [];
    for (const f of fs.readdirSync(dir)) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const id of ids) {
        const re = new RegExp(`['"\`]${id}['"\`]|\\.tech\\.${id}\\b`);
        if (re.test(src)) offenders.push(`${f}: ${id}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
