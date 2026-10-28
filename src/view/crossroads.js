// The crossroads panel: open crossroads with their choices, how many more this era may turn on the
// player's word, and what came of past choices. The words matter here: a choice states an intent,
// never a promised result, and letting it be is always offered.
import { CROSSROAD, NUDGES_PER_ERA } from '../data/crossroads.js';
import { IDEA } from '../data/ideas.js';
import { TPD } from '../data/world.js';
import { autosave } from '../save/codec.js';
import { choose, hasRoom, optionsOf, severity } from '../sim/crossroads.js';
import { eraName } from '../sim/effects.js';
import { calYear, S } from '../sim/state.js';
import { $, render } from './ui.js';
import { AUTO_DAYS, beginInterlude } from '../sim/interlude.js';
import { AGES } from '../data/ages.js';
import { currentAge } from '../sim/state.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const WORDS = ['no', 'one', 'two', 'three', 'four'];
const STATUS = {
  favoured: 'waiting to see if anyone takes it up', thought: 'someone has taken it up', built: 'it came to pass',
  failed: 'it came to nothing', faded: 'nobody took it up', done: 'done', 'let be': 'left to itself',
};

let sig = '';
/** Draws the panel when anything in it has changed. */
export function renderCrossroads(force) {
  const X = S.xr || { open: [], past: [], used: 0 };
  const s = JSON.stringify([X.open, X.past.length, X.past.map(p => p.status), X.used, X.crisisUsed, S.era, S.age, S.ageEnding, Math.floor(S.tick / TPD)]);
  if (s === sig && !force) return;
  sig = s;
  const left = Math.max(0, NUDGES_PER_ERA - (X.used || 0)), era = eraName(S.era || 0).replace(/^The /, 'the ');
  $('xrNote').textContent = X.open.length
    ? `The village is at a crossroads. You may tip the balance, or let it be: letting it be costs nothing. ${left ? `Your word may carry at ${WORDS[left] || left} more crossroads in ${era}.` : `Your word has been spent for ${era}; only a crisis will be put to you now.`}`
    : left ? `Nothing is pressing. When a real pressure builds, the village will come to a crossroads. Your word may carry at ${WORDS[left] || left} more in ${era}.`
      : `Your word has been spent for ${era}. The village will find its own way until times change, unless a crisis comes.`;
  // what came of the latest choice, shown for a few days after it was made
  const last = [...X.past].reverse().find(p => p.label !== 'Let it be');
  const after = last && S.tick - last.at < TPD * 4
    ? `<p class="xr-after"><b>${esc(CROSSROAD[last.id].title)}.</b> ${esc(last.label)}: ${esc(last.result ? last.result.replace(/<[^>]+>/g, '') : last.idea ? `the village leans towards the ${IDEA[last.idea].name.toLowerCase()}. Whether anything comes of it is up to them; the annals will tell.` : '')}</p>` : '';
  // an age at its close: the player may let the centuries pass now; otherwise they pass on their own
  let closing = '';
  if (S.ageEnding) {
    const a = currentAge(), next = AGES[a.next], years = Math.max(1, Math.ceil((S.ageEnding + AUTO_DAYS * TPD - S.tick) / TPD / 20));
    closing = `<article class="xr closing"><header><h3>${esc(a.name)} is drawing to its close</h3></header>
      <p>The valley has become what this age will make of it. When you are ready, let the centuries pass: the annals will tell what came through them, and what was lost, and the story will take up again in ${next.startYear}. If you leave it, they will pass on their own in about ${years} year${years > 1 ? 's' : ''}.</p>
      <div class="grid"><button class="nudge" data-interlude="1"><b>Let the centuries pass</b><small>To ${next.startYear}. This cannot be undone.</small></button></div></article>`;
  }
  $('xroads').innerHTML = closing + after + X.open.map(o => {
    const c = CROSSROAD[o.id], days = Math.max(1, Math.ceil((o.closes - S.tick) / TPD)), room = hasRoom(c);
    const opts = optionsOf(c).map(op => `<button class="nudge" data-xr="${o.id}" data-k="${op.k}"${room ? '' : ' disabled'}><b>${esc(op.label)}</b><small>${esc(op.intent)}</small></button>`).join('');
    return `<article class="xr"><header><h3>${esc(c.title)}</h3><span class="chip ${severity(o) === 'growing' ? '' : 'storm'}">${severity(o)}</span></header>
      <p>${esc(c.situation)}</p><div class="grid">${opts}<button class="nudge let" data-xr="${o.id}" data-k="-1"><b>Let it be</b><small>Leave the village to find its own way. This costs nothing.</small></button></div>
      <p class="xr-time">The moment passes in ${days} day${days > 1 ? 's' : ''}.</p></article>`;
  }).join('');
  const past = X.past.slice(-12).reverse();
  $('xrPastBox').hidden = !past.length;
  $('xrPast').innerHTML = past.map(p => {
    const c = CROSSROAD[p.id], what = p.idea ? `${STATUS[p.status] || p.status} (${IDEA[p.idea].name.toLowerCase()})` : p.result ? p.result.replace(/<[^>]+>/g, '') : STATUS[p.status] || p.status;
    return `<li><time>${calYear(p.at)}</time> <b>${esc(c.title)}</b>: ${esc(p.label)} — ${esc(what)}</li>`;
  }).join('');
}

document.addEventListener('click', e => {
  if (e.target.closest('[data-interlude]')) { if (beginInterlude()) { autosave(); render(true); renderCrossroads(true); } return; }
  const b = e.target.closest('[data-xr]');
  if (!b || b.disabled) return;
  const line = choose(b.dataset.xr, +b.dataset.k);
  if (line != null) { autosave(); renderCrossroads(true); }
});
