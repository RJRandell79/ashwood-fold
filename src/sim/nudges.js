// Ported from the v5 prototype by tools/port-v5.mjs.
import { RUMOURS, STRANGERS } from '../data/folk.js';
import { MAXPOP, P, TPD } from '../data/world.js';
import { bringCase } from './civic.js';
import { log } from './log.js';
import { addAgent } from './people.js';
import { stormHits } from './seasons.js';
import { makeAgent } from './setup.js';
import { addRumour, adj, mem, op } from './social.js';
import { LIVE, N, S, dayStart, hourOf, isAdult, pick, pointIn, rnd, seasonOf } from './state.js';
import { hooks } from './hooks.js';

export function nudgeRumour(id){
  const subj=S.agents[id];if(!subj||subj.dead)return;
  let seeder=null;for(const a of LIVE)if(a!==subj&&isAdult(a)&&(!seeder||a.tr.gossip>seeder.tr.gossip))seeder=a;
  const text=pick(RUMOURS);addRumour(subj.id,text,seeder);adj(seeder,subj,-8);
  log(`A whisper starts with ${N(seeder)}: that ${N(subj)} ${text}.`,'nudge','rumour',{ids:[subj.id]});hooks.changed();
}
export function nudgeShort(){S.stores.flour=0;S.spoil=TPD*2;log('Weevils have got into the granary at the Watermill. The flour is spoiled, and whatever is milled in the next two days will be too.','nudge','event');hooks.changed();}
export function nudgeStorm(){S.storm=96;if(seasonOf()!==3)log('Black clouds roll in over the fells and a storm breaks over Ashwood Fold.','nudge');stormHits(false);hooks.changed();}
export function nudgeStranger(){
  const used=new Set(S.agents.map(a=>a.name)),st=STRANGERS.find(n=>!used.has(n[0]));if(!st||LIVE.length>=MAXPOP)return;
  const tr={temper:.2+rnd()*.6,warmth:.2+rnd()*.7,diligence:.3+rnd()*.6,forgive:.2+rnd()*.7,gossip:.2+rnd()*.7,scruple:.25+rnd()*.7};
  const id=S.agents.length,s=addAgent(makeAgent(id,st[0],'pedlar','tavern',tr,{age:24+rnd()*20,sex:st[1],hue:330}));
  s.coins=10;s.hunger=.5;s.arrivedAt=S.tick;
  s.x=s.px=.5;s.y=s.py=13;s.arrived=false;s.act={type:'stroll',place:'tavern',left:2,target:null};const q=pointIn(P.tavern);s.tx=q[0];s.ty=q[1];
  for(const a of LIVE)if(a!==s){S.op[a.id][id]=Math.round(-12+a.tr.warmth*22+(rnd()-.5)*10);S.op[id][a.id]=Math.round((rnd()-.4)*14);}
  log(`A stranger walks in along the carters' road. ${N(s)}, a pedlar, takes a room at The Plough.`,'nudge','arrival',{ids:[id]});hooks.changed();
}
export function nudgeFair(){
  if(S.fair)return;
  const h=hourOf(),start=h<9?dayStart()+60:dayStart()+TPD+60;
  S.fair={start,end:start+60};
  log(`The reeve's crier announces a fair on the Green ${h<9?'this morning':'tomorrow'}.`,'nudge');hooks.changed();
}
export function nudgePurse(){
  const pool=LIVE.filter(a=>a.coins>=3);if(!pool.length){log('Nobody in Ashwood Fold has enough in their purse to lose.','nudge');hooks.changed();return;}
  const owner=pool.reduce((m,a)=>a.coins>m.coins?a:m),loss=Math.max(2,Math.floor(owner.coins*.7));
  owner.coins-=loss;const finder=pick(LIVE.filter(a=>a!==owner&&a.age>=6));
  if(rnd()<finder.tr.scruple*.9){
    owner.coins+=loss;adj(owner,finder,20);mem(owner,finder,'returned my lost purse');
    log(`${N(owner)} drops a purse of ${loss} pennies near the well. ${N(finder)} finds it and hands it straight back.`,'nudge','event',{ids:[owner.id,finder.id]});
  }else{
    finder.coins+=loss;mem(finder,null,'kept a purse found by the well');
    let sus=null,low=100;for(const b of LIVE)if(b!==owner&&isAdult(b)&&op(owner,b)<low){low=op(owner,b);sus=b;}
    adj(owner,sus,-20);mem(owner,sus,'took my purse');bringCase(sus,owner,`taking a purse of ${loss} pennies`,.15,sus===finder);
    log(`${N(owner)} has lost a purse of ${loss} pennies and blames ${N(sus)}.${sus===finder?' Rightly, as it happens.':` In fact ${N(finder)} found it and kept quiet.`}`,'nudge','crime',{ids:[owner.id,sus.id]});
  }
  hooks.changed();
}
