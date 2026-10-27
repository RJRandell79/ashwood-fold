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

export function log(h,k,cat,extra){
  const place=(extra&&(extra.place||(extra.tech&&placeOfIdea(extra.tech))))||null;
  const e={t:S.tick,k:k||'event',h};if(place)e.p=place;
  S.log.push(e);if(S.log.length>400)S.log.splice(0,S.log.length-400);
  if(cat){S.annals.push(Object.assign({t:S.tick,k:k||'event',h,c:cat},extra||{},place?{place}:{}));if(S.annals.length>2500)S.annals.splice(0,S.annals.length-2500);}
}
