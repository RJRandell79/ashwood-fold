// A building's card: tap a building in the valley (or Show on a chronicle entry) to read its record.
// Who built it, why it stands where it does, what stood there before, what it was once called, and how
// it is wearing (src/sim/placement.js keeps the record).
import { BUILDINGS } from '../data/buildings.js';
import { familyPlural } from '../sim/heraldry.js';
import { wears } from '../sim/placement.js';
import { FIRST_AGE } from '../data/ages.js';
import { calYear, P } from '../sim/state.js';

const $ = id => document.getElementById(id);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let shown = null;

/** The lines of a place's record, in the annals' plain voice. */
export function placeLines(p) {
  const r = p.record || {}, def = BUILDINGS[p.def] || {}, out = [];
  if (p.def === 'ruin') out.push(`What is left of ${esc(p.wasName || 'an older building')}${r.year ? `, built in ${r.year}` : ''}. No one has used it for a long while.`);
  else if (r.was) out.push(`Built in ${r.keptFrom} as ${esc(r.was)}, and kept on the same footings ever since.`);
  else if (r.year) out.push(`Built in ${r.year}${r.by ? (p.home ? ` for ${esc(r.by)}` : `, ${esc(r.by)}'s idea`) : def.founding ? (r.age && r.age !== FIRST_AGE ? ', when the new village was laid out over the old' : ', when the village was laid out') : ''}.`);
  if (r.why && p.def !== 'ruin') out.push(`It stands ${esc(r.why)}.`);
  if (r.over && !(r.why || '').includes(r.over)) out.push(`${esc(cap(r.over))} stood here before it${r.overYear ? `, from ${r.overYear}` : ''}.`);
  for (const c of p.carved || []) out.push(`Carved above the door: the arms of the ${esc(familyPlural(c.family))}.`);
  if (p.def !== 'ruin' && wears(p)) {
    const w = p.wear || 0;
    out.push(p.decay || w >= 1 ? 'It is falling down, and no one has the money to mend it.' : w >= 0.55 ? 'It is worn, and patched where the weather has got in.' : 'It is in good repair.');
    if (p.rebuilt) out.push(`Last rebuilt in ${calYear(p.rebuilt)}.`);
  }
  return out;
}

export function showPlace(id) {
  const p = P[id], box = $('placeCard');
  if (!p || !box) return;
  shown = id;
  box.innerHTML = `<button class="pcclose" type="button" aria-label="Close">×</button><h3>${esc(cap(p.name))}</h3>${placeLines(p).map(l => `<p>${l}</p>`).join('')}`;
  box.hidden = false;
}
export function hidePlace() { const box = $('placeCard'); if (box) box.hidden = true; shown = null; }
/** Keeps an open card current as the village changes (rebuilt, worn, fallen to ruin). */
export function refreshPlace() { if (shown) { if (P[shown]) showPlace(shown); else hidePlace(); } }

document.addEventListener('click', e => { if (e.target.closest('.pcclose')) hidePlace(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && shown) hidePlace(); });
