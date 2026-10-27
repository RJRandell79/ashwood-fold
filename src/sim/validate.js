// Checks the idea records for mistakes that would otherwise only show up mid-game.
import { EFFECT_BASE, IDEAS } from '../data/ideas.js';
import { CHARGE_NAMES } from '../data/heraldry.js';
import { JOBS } from '../data/world.js';
import { BUILDINGS, LINES } from '../data/buildings.js';
import { SIGNALS, SIGNAL_EVENTS } from './signals.js';

export function validateIdeas(ideas = IDEAS) {
  const errors = [], ids = new Set();
  const known = new Set(ideas.map(d => d.id));
  for (const d of ideas) {
    const where = `idea ${d.id}`;
    if (ids.has(d.id)) errors.push(`${where}: duplicate id`);
    ids.add(d.id);
    for (const k of ['name', 'what', 'hint']) if (typeof d[k] !== 'string' || !d[k]) errors.push(`${where}: missing ${k}`);
    if (!(d.backers > 0) || !(d.cost > 0)) errors.push(`${where}: needs backers and cost`);
    for (const r of d.requires || []) if (!known.has(r)) errors.push(`${where}: requires unknown idea ${r}`);
    for (const j of d.inventorJobs || []) if (!(j in JOBS)) errors.push(`${where}: unknown inventor trade ${j}`);
    if (!d.inventorJobs || !d.inventorJobs.length) errors.push(`${where}: nobody can think of it`);
    for (const s of Object.keys((d.pressure && d.pressure.when) || {})) if (!(s in SIGNALS)) errors.push(`${where}: unknown signal ${s}`);
    for (const ev of Object.keys((d.pressure && d.pressure.on) || {})) if (!SIGNAL_EVENTS.includes(ev)) errors.push(`${where}: unknown event ${ev}`);
    for (const [name, e] of Object.entries(d.effects || {})) {
      if (!(name in EFFECT_BASE)) errors.push(`${where}: unknown effect ${name}`);
      if (!('set' in e) && !('mul' in e)) errors.push(`${where}: effect ${name} needs set or mul`);
      if (e.while && !known.has(e.while)) errors.push(`${where}: effect ${name} depends on unknown idea ${e.while}`);
    }
    for (const j of Object.keys(d.threatens || {})) if (!(j in JOBS)) errors.push(`${where}: threatens unknown trade ${j}`);
    if (d.sabotage && !BUILDINGS[d.sabotage.place]) errors.push(`${where}: sabotage at unknown place ${d.sabotage.place}`);
    if (d.hires && !BUILDINGS[d.hires.place]) errors.push(`${where}: hires at unknown place ${d.hires.place}`);
    for (const b of d.places || []) if (!BUILDINGS[b]) errors.push(`${where}: raises unknown building ${b}`);
    if (d.line && !LINES[d.line]) errors.push(`${where}: unknown line ${d.line}`);
    if (d.emblem && !CHARGE_NAMES[d.emblem]) errors.push(`${where}: emblem ${d.emblem} has no name`);
  }
  // Places that appear with an idea must name a real one.
  // Every idea must be reachable: requirements form no cycle and lead back to ideas needing nothing.
  const state = {};
  const visit = (id, path) => {
    if (state[id] === 'done') return;
    if (state[id] === 'busy') { errors.push(`requirement cycle: ${[...path, id].join(' -> ')}`); return; }
    state[id] = 'busy';
    const d = ideas.find(x => x.id === id);
    for (const r of (d && d.requires) || []) visit(r, [...path, id]);
    state[id] = 'done';
  };
  for (const d of ideas) visit(d.id, []);
  // Eras must open in order along the requirement chain.
  const eras = ideas.filter(d => d.opensEra).map(d => d.opensEra).sort((a, b) => a - b);
  eras.forEach((e, i) => { if (e !== i + 1) errors.push(`eras are not opened 1, 2, 3...: found ${eras.join(', ')}`); });
  return [...new Set(errors)];
}
