// The chronicle. S.log is the running record shown beside the village; S.annals keeps the
// events that make the storybook. An entry may name the place where it happened (p / place),
// so the page can show it in the valley.
import { IDEA } from '../data/ideas.js';
import { S } from './state.js';

/** Where an idea's events belong: its first building, the crossing, or the works it threatens. */
function placeOfIdea(id) {
  const d = IDEA[id];
  if (!d) return null;
  return (d.places && d.places[0]) || (d.crossing ? 'crossing' : null) || (d.sabotage && d.sabotage.place) || (d.hires && d.hires.place) || null;
}

// Annals entries are numbered (n) and may name the earlier entries that led to them (because), so the
// annals can follow a thread back: an idea's story from first thought to its end, a condition from its
// coming to what it did. Entries about the same idea or condition are chained to the one before
// automatically; a caller may add causes of its own with extra.because (one n or a list).
export function log(h,k,cat,extra){
  const place=(extra&&(extra.place||(extra.tech&&placeOfIdea(extra.tech))))||null;
  const e={t:S.tick,k:k||'event',h};if(place)e.p=place;
  S.log.push(e);if(S.log.length>400)S.log.splice(0,S.log.length-400);
  if(!cat)return null;
  const n=S.aid=(S.aid||0)+1,why=[].concat((extra&&extra.because)||[]);
  const a=Object.assign({t:S.tick,k:k||'event',h,c:cat},extra||{},place?{place}:{},{n});
  const idea=extra&&extra.tech&&S.tech&&S.tech[extra.tech];
  if(idea){if(idea.lastN&&!why.includes(idea.lastN))why.push(idea.lastN);idea.lastN=n;}
  const cond=extra&&extra.condition;
  if(cond&&S.conditions){const L=S.conditions.lastN||(S.conditions.lastN={});if(L[cond]&&!why.includes(L[cond]))why.push(L[cond]);L[cond]=n;}
  if(why.length)a.because=why;else delete a.because;
  S.annals.push(a);if(S.annals.length>2500)S.annals.splice(0,S.annals.length-2500);
  return a;
}
