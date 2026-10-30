// Ported from the v5 prototype by tools/port-v5.mjs.
import { effect } from './effects.js';
import { TPD } from '../data/world.js';
import { hooks } from './hooks.js';
import { civicDay } from './civic.js';
import { techDay } from './ideas.js';
import { step } from './life.js';
import { footDay } from './paths.js';
import { eventsDay } from './events.js';
import { crossroadsDay } from './crossroads.js';
import { interludeDay } from './interlude.js';
import { restyleSeason } from './placement.js';
import { log } from './log.js';
import { gatherTick, lifeDay } from './people.js';
import { conditionsDay, conditionsSpring } from './conditions.js';
import { collectDues, foodDay, seasonStart, spendDay, upkeepDay, weatherDay } from './seasons.js';
import { checkPair, encounters } from './social.js';
import { LIVE, S, dayInSeason, dayOf, dayStart, listNames, refreshLive, seasonOf } from './state.js';

export function midnight(){
  refreshLive();
  for(const a of LIVE)for(const b of S.agents){if(a===b)continue;const o=S.op[a.id][b.id];
    if(o<0)S.op[a.id][b.id]=Math.min(0,o+(.5+a.tr.forgive*2.5)*(1-a.tr.temper*.5)*effect('forgiveness'));
    else if(o>25&&!b.dead)S.op[a.id][b.id]=o-.6;}
  // children take on their parents' loves and hates
  const inherit=effect('childInherit');
  for(const c of LIVE){if(c.age>=18||!c.parents.length)continue;const ps=c.parents.map(i=>S.agents[i]);
    for(const x of LIVE){if(x===c||ps.includes(x))continue;const tgt=ps.reduce((s,p)=>s+S.op[p.id][x.id],0)/ps.length*inherit;
      S.op[c.id][x.id]+=(tgt-S.op[c.id][x.id])*.06;}}
  for(const a of LIVE)for(const b of LIVE)if(a.id<b.id)checkPair(a,b);
  if((dayOf()-1)%7===0)collectDues();
  spendDay();
  upkeepDay();
  const hungry=LIVE.filter(a=>a.hunger>.85);
  if(hungry.length)log(`${listNames(hungry)} went to bed hungry.`,'bad');
  lifeDay();
  foodDay();
  techDay();
  crossroadsDay();
  civicDay();
  if(dayInSeason()===1){seasonStart();if(seasonOf()===0){conditionsSpring();restyleSeason();}}
  conditionsDay();
  if(seasonOf()===2&&dayInSeason()===5&&!S.fair){S.fair={start:dayStart()+72,end:dayStart()+126,harvest:true};}
  weatherDay();
  eventsDay();
  footDay();
  for(const k in S.cool)if(S.cool[k]<S.tick)delete S.cool[k];
  refreshLive();
  interludeDay(); // last: it may close the age and open the next
}
export function tick(){
  S.tick++;
  refreshLive();
  if(S.tick%TPD===0)midnight();
  if(S.spoil>0){S.spoil--;if(S.spoil===0)log('The weevils are finally smoked out of the Watermill. Good flour again.','event');}
  if(S.storm>0){S.storm--;if(S.storm===0)log(seasonOf()===3?'The snow stops falling. Children are out on the Green within the hour.':'The storm blows itself out. The lanes steam in the sun.','event');}
  if(S.fair){
    if(S.tick===S.fair.start)log(S.fair.harvest?'Harvest Home on the Green: the last sheaf is carried in, and the fiddler strikes up.':'The fair opens on the Green: ribbons, a fiddler, and a pie stall.','good',S.fair.harvest?null:'event');
    if(S.tick===S.fair.end){log(S.fair.harvest?'Harvest Home is over for another year.':'The fair packs up for another year.','event');S.fair=null;}
  }
  gatherTick();
  for(const a of LIVE){a.px=a.x;a.py=a.y;step(a);}
  encounters();
  if(S.tick%36===0)hooks.autosave();
}
