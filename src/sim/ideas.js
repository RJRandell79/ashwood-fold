// Ported from the v5 prototype by tools/port-v5.mjs.
import { AUG, CHARGE_NAMES } from '../data/heraldry.js';
import { TECH } from '../data/ideas.js';
import { SEASON_DAYS, TPD } from '../data/world.js';
import { bringCase, startBuilding } from './civic.js';
import { armsOf, familyKey } from './heraldry.js';
import { log } from './log.js';
import { addRumour, adj, glyph, mem, op } from './social.js';
import { LIVE, N, PN, S, byJob, grainCap, household, isAdult, listNames, pick, rnd, seasonOf, techBuilt, techOn } from './state.js';

export function threatOf(b,id){
  const t=S.tech[id];
  if(id==='shuttle')return b.job==='weaver'&&b.id!==t.inventor?1:0;
  if(id==='cottonmill')return b.job==='weaver'&&b.id!==t.inventor?1:b.job==='carter'?.3:0;
  if(id==='plough')return b.job==='farmhand'?.35:0;
  if(id==='canal')return b.job==='carter'?.6:0;
  if(id==='steam')return b.job==='weaver'?1:b.job==='millhand'?.3:0;
  if(id==='railway')return b.job==='carter'?1:0;
  return 0;
}
export function pitch(a,b){
  if(!isAdult(a)||!isAdult(b))return false;
  for(const id in S.tech){
    const t=S.tech[id];if(t.state!=='idea')continue;
    const stance=t.backers.includes(a.id)?1:t.opponents.includes(a.id)?-1:0;if(!stance)continue;
    if(t.backers.includes(b.id)||t.opponents.includes(b.id))continue;
    if(rnd()>.28)continue;
    const inv=S.agents[t.inventor],T=TECH[id],threat=threatOf(b,id);
    glyph(a,'…','rumour');
    if(stance>0){
      let sc=(op(b,inv)*.45+op(b,a)*.35)/100+(T.jobs.includes(b.job)?.2:0)+(b.tr.diligence-.5)*.4+rnd()*.5-.35-threat*.8-(b.coins<10?.15:0);
      if(op(b,inv)<-40)sc-=.5;
      if(sc>.12){t.backers.push(b.id);adj(b,inv,3);
        if(t.backers.length===T.need)log(`${N(inv)} has enough backers for the ${T.name.toLowerCase()}. Now for the money.`,'good','tech',{tech:id});
        else if(rnd()<.3)log(`${N(a)} talks ${N(b)} round to ${N(inv)}'s ${T.name.toLowerCase()}.`,'event');}
      else if(sc<-.2){t.opponents.push(b.id);
        if(threat>=1){mem(b,inv,'is taking my living');adj(b,inv,-8);log(`${N(b)} wants nothing to do with ${N(inv)}'s ${T.name.toLowerCase()}. It would cost ${N(b)} a living.`,'bad','tech',{tech:id,ids:[b.id]});}
        else if(op(b,inv)<-40)log(`${N(b)} won't back anything of ${N(inv)}'s, least of all a ${T.name.toLowerCase()}.`,'bad','tech',{tech:id,ids:[b.id]});}
    }else{
      const sc=op(b,a)/100*.6+threat*.6-op(b,inv)/100*.4+rnd()*.4-.3;
      if(sc>.15){t.opponents.push(b.id);if(rnd()<.35)log(`${N(a)} has turned ${N(b)} against the ${T.name.toLowerCase()}.`,'bad');}
    }
    return true;
  }
  return false;
}
export function techDay(){
  const pop=LIVE.length,weavers=LIVE.filter(a=>a.job==='weaver');
  const bump=(id,v)=>{const t=S.tech[id];if(t.state==='none')t.pressure=Math.min(140,t.pressure+v);};
  const autumn=seasonOf()===2;
  bump('plough',.6+(S.stores.grain<pop*4?5:0));
  bump('millstone',.6+(S.stores.flour<10?4:0));
  bump('barn',.6+(autumn&&S.stores.grain>=grainCap()*.95?6:0));
  bump('shuttle',.6+(weavers.length&&weavers.reduce((s,w)=>s+w.coins,0)/weavers.length<8?3:0));
  bump('school',.6+(LIVE.filter(a=>a.age>=5&&a.age<14).length>=4?2:0));
  if(techBuilt('shuttle')&&techBuilt('millstone'))bump('cottonmill',1.5+(weavers.length?1:0));
  if(techBuilt('cottonmill'))bump('canal',1.4);if(techBuilt('canal'))bump('steam',1.5);if(techBuilt('steam'))bump('railway',1.2);
  for(const id in TECH){
    const t=S.tech[id],T=TECH[id];
    if(t.state==='none'&&t.pressure>=100&&T.req.every(techBuilt)){
      const cands=LIVE.filter(a=>isAdult(a)&&T.jobs.includes(a.job));
      if(!cands.length)continue;
      let inv=null,best=-9;for(const a of cands){const s=a.tr.diligence*.6+rnd()*.4+(id==='cottonmill'?(1-a.tr.warmth)*.25:0);if(s>best){best=s;inv=a;}}
      Object.assign(t,{state:'idea',inventor:inv.id,backers:[inv.id],opponents:[],since:S.tick,short:false});
      log(`${N(inv)} has an idea: a ${T.name.toLowerCase()} that ${T.what}. It will need ${T.need} backers and ${T.cost} pennies.`,'good','tech',{tech:id,ids:[inv.id],idea:1});
    }else if(t.state==='idea'){
      const inv=S.agents[t.inventor];
      t.backers=t.backers.filter(i=>!S.agents[i].dead);t.opponents=t.opponents.filter(i=>!S.agents[i].dead);
      if(inv.dead){t.state='none';t.pressure=50;log(`With ${N(inv)} gone, nobody takes up the ${T.name.toLowerCase()}.`,'event','tech',{tech:id});continue;}
      const reeve=byJob('reeve'),need=T.need+(reeve&&t.opponents.includes(reeve.id)?2:0);
      if(t.backers.length-t.opponents.length*.5>=need){
        const bk=t.backers.map(i=>S.agents[i]);let avail=bk.reduce((s,b)=>s+Math.floor(b.coins*.6),0);
        if(avail>=T.cost){
          let left=T.cost;for(const b of bk.sort((x,y)=>y.coins-x.coins)){const g=Math.min(Math.floor(b.coins*.6),Math.ceil(left));b.coins-=g;left-=g;if(left<=0)break;}
          if(T.build){for(const b of bk)if(b!==inv)adj(b,inv,6);startBuilding(id);continue;}
          t.state='built';t.builtAt=S.tick;
          for(const b of bk)if(b!==inv)adj(b,inv,6);
          for(const o of t.opponents.map(i=>S.agents[i]))adj(o,inv,-4);
          if(id==='shuttle')t.adopters=bk.filter(b=>b.job==='weaver').map(b=>b.id);
          log(`The ${T.name.toLowerCase()} is finished: ${N(inv)}'s idea, paid for by ${listNames(bk.filter(b=>b!==inv).slice(0,5))}${bk.length>6?' and others':''}.`,'good','tech',{tech:id,ids:[inv.id],built:1});
          if(id==='cottonmill')log(`A tall chimney now stands by the river. Some call it progress.`,'event');
          const fam=familyKey(inv),ar=armsOf(fam);
          if(ar.aug.length<3&&!ar.aug.includes(id)){ar.aug.push(id);log(`The ${fam} family add ${CHARGE_NAMES[AUG[id]]} to their arms, in honour of ${N(inv)}'s ${T.name.toLowerCase()}.`,'good','arms',{fam});}
        }else if(!t.short){t.short=true;log(`${N(inv)} has the backers for the ${T.name.toLowerCase()} but not yet the money.`,'event');}
      }
      if(t.state==='idea'&&S.tick-t.since>TPD*15){
        const opp=t.opponents.map(i=>S.agents[i]);
        log(`Nothing comes of ${N(inv)}'s ${T.name.toLowerCase()}. ${opp.length?`${listNames(opp.slice(0,3))} saw to that.`:'The village never quite took to it.'}`,'bad','tech',{tech:id,fizzle:1});
        Object.assign(t,{state:'none',pressure:40,backers:[],opponents:[]});
      }
    }else if(t.state==='built'&&t.brokenUntil&&t.brokenUntil<=S.tick){
      t.brokenUntil=0;const inv=S.agents[t.inventor];if(inv&&!inv.dead)inv.coins=Math.max(0,inv.coins-4);
      log(`The ${T.name.toLowerCase()} is mended and working again.`,'event');
    }
  }
  // the shuttle wins converts, or makes enemies
  if(techOn('shuttle')){const t=S.tech.shuttle,inv=S.agents[t.inventor];
    for(const w of weavers){if(t.adopters.includes(w.id))continue;
      const par=w.parents.find(p=>t.adopters.includes(p));
      if(par!=null||(op(w,inv)>-20&&w.coins>=4&&rnd()<.12)){t.adopters.push(w.id);if(par==null){w.coins-=4;log(`${N(w)} gives in and buys a flying shuttle.`,'event','tech',{tech:'shuttle',ids:[w.id]});}}
      else if(!inv.dead){adj(w,inv,-2);if(!w.mem.some(m=>m.t==='is taking my living'))mem(w,inv,'is taking my living');}}
  }
  // the mill takes on hands
  if(techOn('cottonmill')){const t=S.tech.cottonmill,own=S.agents[t.inventor];
    const hands=LIVE.filter(a=>a.job==='millhand').length;
    if(hands<(techOn('steam')?12:7)){for(const a of LIVE){
      const poorKid=a.job==='child'&&a.age>=12&&household(a.home).reduce((s,x)=>s+x.coins,0)<6;
      const thinFields=LIVE.filter(b=>b.work==='fields').length<4;
      if(!(poorKid||(isAdult(a)&&['weaver','labourer','carter','pedlar'].concat(thinFields?[]:['farmhand']).includes(a.job))))continue;
      if(own&&!own.dead&&op(a,own)<-35)continue;
      if(!poorKid&&a.coins>=5)continue;
      if(rnd()<.25){const prev=a.job;a.prevJob=prev;a.job='millhand';a.work='cottonmill';
        log(poorKid?`At ${Math.floor(a.age)}, ${N(a)} goes to work at the cotton mill. The family needs the pennies.`:`${N(a)} gives up ${prev} work and takes a place at ${own&&!own.dead?N(own)+"'s":'the'} cotton mill.`,'event','work',{ids:[a.id]});break;}}}
    if(own&&!own.dead)for(const w of weavers)adj(w,own,-1.5);
  }
  // machine breaking
  for(const id of ['shuttle','cottonmill','steam','railway']){
    if(!techOn(id)||rnd()>.5)continue;
    const t=S.tech[id],inv=S.agents[t.inventor];if(!inv||inv.dead)continue;
    if(S.tick-(t.lastWreck||-1e9)<TPD*SEASON_DAYS*(1+(t.wrecks||0)))continue;
    const angry=LIVE.filter(a=>isAdult(a)&&a!==inv&&op(a,inv)<-50&&a.tr.scruple<.65&&a.tr.temper>.4&&(threatOf(a,id)>0||op(a,inv)<-70)&&!(a.banned>S.tick));
    if(!angry.length)continue;
    const culprit=pick(angry);if(rnd()>.35)continue;
    t.brokenUntil=S.tick+TPD*2;t.lastWreck=S.tick;t.wrecks=(t.wrecks||0)+1;mem(culprit,inv,'smashed the machine');
    const place=id==='shuttle'?'weaving':id==='railway'?'wharf':'cottonmill';
    let sus=null,low=0;for(const b of LIVE)if(b!==inv&&isAdult(b)&&op(inv,b)<low){low=op(inv,b);sus=b;}
    let line=`In the night someone broke into ${PN(place)} and wrecked ${{shuttle:'the flying shuttle',cottonmill:'the spinning frames',steam:'the engine',railway:'a stretch of the line'}[id]}.`;
    if(sus){adj(inv,sus,-18);mem(inv,sus,'smashed the machine');addRumour(sus.id,'smashed the '+TECH[id].name.toLowerCase(),inv);
      line+=` ${N(inv)} blames ${N(sus)}${sus===culprit?', rightly.':`. It was ${N(culprit)}.`}`;
      bringCase(sus,inv,`wrecking the ${TECH[id].name.toLowerCase()}`,.25,sus===culprit);}
    else line+=` It was ${N(culprit)}, though nobody suspects it.`;
    log(line,'bad','crime',{tech:id,ids:[culprit.id],sabotage:1});
    break;
  }
}
