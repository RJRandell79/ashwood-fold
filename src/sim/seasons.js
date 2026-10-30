// Ported from the v5 prototype by tools/port-v5.mjs.
import { effect } from './effects.js';
import { raisePressure } from './signals.js';
import { MAXPOP, TPD, YEAR_DAYS } from '../data/world.js';
import { plan } from './life.js';
import { recordFamilies } from './dynasties.js';
import { log } from './log.js';
import { arrive } from './people.js';
import { adj, mem } from './social.js';
import { byJob, calYear, dayOf, household, isAdult, listNames, LIVE, N, P, pick, rnd, S, seasonOf, yearOf } from './state.js';

export function seasonStart(){
  if(seasonOf()===0)recordFamilies();
  const s=seasonOf(),y=yearOf(),pop=LIVE.length;
  if(s===0){
    S.years[y]={startPop:pop,births:0,deaths:0,weddings:0,era:S.era,age:S.age,cal:calYear()};S.yearQ=.65+rnd()*.6;
    log(`Spring comes to Ashwood Fold in ${calYear()}, with ${pop} souls in the village.`,'event','season',{season:0});
    const come=effect('strangersCome');
    if(LIVE.filter(isAdult).length<12&&(come>=1||rnd()<come))arrive(pick(['labourer','farmhand','weaver']),'looking for work');
    const extra=come>=1?effect('springMigrants'):Math.floor(effect('springMigrants')*come);
    for(let i=0;i<extra&&LIVE.length<MAXPOP-2;i++)arrive(effect('migrantJob'),effect('migrantReason'));
  }else if(s===1)log(`Summer. The corn stands green in the South Fields.`,'event');
  else if(s===2){S.harvest=0;log(`Autumn, and the harvest begins.`,'event');}
  else{
    const ratio=S.harvest/Math.max(1,pop*22),verdict=ratio<.8?'thin':ratio<1.15?'fair':'fine';
    S.years[y].harvest=verdict;
    if(verdict==='thin'){raisePressure('thinHarvest');}
    log(`Winter sets in. The harvest was ${verdict}: ${Math.round(S.harvest)} sheaves brought in for ${pop} mouths${verdict==='thin'?'. It will be a hungry winter.':'.'}`,verdict==='thin'?'bad':'event','season',{season:3,harvest:verdict});
  }
}
export function weatherDay(){
  if(S.storm>0)return;
  const s=seasonOf(),p=[.04,.05,.12,.09][s]*effect('stormChance');
  if(rnd()<p){S.storm=60+Math.floor(rnd()*36);stormHits(true);}
}
export function stormHits(natural){
  const s=seasonOf();
  if(s===3)log(natural?'A blizzard sweeps down off the fells. The lanes fill with snow.':'Snow and wind lash Ashwood Fold.','event',natural?'season':null);
  else if(natural)log('Black clouds roll in over the fells and a storm breaks over Ashwood Fold.','event');
  if(s===2&&!effect('protectsHarvest')&&S.stores.grain>20){const lost=Math.round(S.stores.grain*.08);S.stores.grain-=lost;S.harvest=Math.max(0,S.harvest-lost);raisePressure('cornFlattened');
    log(`The rain lays the standing corn flat. ${lost} sheaves are spoiled in the field.`,'bad','season');}
  for(const a of LIVE)if(!P[a.act.place].indoor)plan(a);
}
export function upkeepDay(){
  const cost=seasonOf()===3?effect('winterUpkeep'):.7;
  for(const h of new Set(LIVE.map(a=>a.home))){
    const folk=household(h),adults=folk.filter(isAdult);if(!adults.length)continue;
    for(const a of adults)if(a.coins>10)a.coins-=(a.coins-10)*.012;
    if(h==='tavern'){for(const a of adults)a.coins=Math.max(0,a.coins-cost);continue;}
    let bill=cost*adults.length+cost*.5*(folk.length-adults.length);
    for(const a of adults.sort((x,y)=>y.coins-x.coins)){const p=Math.min(a.coins,bill);a.coins-=p;bill-=p;if(bill<=0)break;}
  }
}
export function spendDay(){
  const adults=LIVE.filter(isAdult);if(adults.length<2)return;
  const med=[...adults].sort((x,y)=>x.coins-y.coins)[Math.floor(adults.length/2)].coins;
  const poor=adults.filter(a=>a.coins<=Math.max(10,med));
  for(const a of adults){if(a.coins<=30)continue;
    const spend=(a.coins-30)*.12;a.coins-=spend;
    const per=spend/Math.min(3,poor.length);
    for(let i=0;i<Math.min(3,poor.length);i++){const b=pick(poor);b.coins+=per;if(per>=1.5&&b!==a)adj(b,a,1.5);}
    if(spend>4&&rnd()<.08){const b=pick(poor);if(b!==a)log(`${N(a)} pays ${N(b)} to ${pick(['mend a roof','dig a drain','fetch coal from the next valley','whitewash a wall','mind the cellar'])}.`,'event');}}
}
export function foodDay(){
  const pop=LIVE.length,food=S.stores.grain+S.stores.flour+S.stores.bread,season=seasonOf();
  // hands turn to the fields when the fields are short of them
  const field=LIVE.filter(a=>a.work==='fields').length;
  if(season!==3&&(field<3||food<pop*8)&&field<6){
    const c=LIVE.filter(a=>isAdult(a)&&a.age<60&&['labourer','carter','pedlar','millhand','weaver'].includes(a.job)&&S.tick-(a.switched||-1e9)>TPD*YEAR_DAYS).sort((x,y)=>x.coins-y.coins)[0];
    if(c&&rnd()<.35){c.switched=S.tick;c.prevJob=c.job;c.job='farmhand';c.work='fields';log(`${N(c)} leaves ${c.prevJob} work for the South Fields. There are too few hands at the harvest.`,'event','work',{ids:[c.id]});}
  }
  // a cartload of corn from the next valley, if anyone will pay for it
  const canal=effect('cornByBoat'),cost=effect('cornCartCost');
  if(S.stores.grain+S.stores.flour<pop*effect('cornCartThreshold')&&S.tick-(S.lastCart||-1e9)>TPD*2){
    const rich=LIVE.filter(a=>isAdult(a)&&a.coins>=cost).sort((x,y)=>y.coins*y.tr.warmth-x.coins*x.tr.warmth);
    const buyer=rich.find(a=>rnd()<.25+a.tr.warmth*.6);
    if(buyer){buyer.coins-=cost;S.stores.grain+=70;S.lastCart=S.tick;for(const b of LIVE)if(b!==buyer)adj(b,buyer,4);
      log(canal?`${N(buyer)} pays for a boatload of corn to come up the canal.`:`${N(buyer)} pays for a cartload of corn from the next valley. There will be bread a while longer.`,'good','work',{ids:[buyer.id],cart:1});}
    else if(rich.length&&!S.cartRefused){S.cartRefused=dayOf();const r=rich[0];for(const b of LIVE)if(b!==r&&b.hunger>.6)adj(b,r,-6);
      log(`The granary is nearly empty. ${N(r)} has the money for corn from the next valley, and keeps it.`,'bad','crime',{ids:[r.id]});}
  }
  if(S.cartRefused&&dayOf()-S.cartRefused>5)S.cartRefused=0;
  // with no baker, households bake their own at the oven: less than a baker would, but enough to live on
  if(pop&&!LIVE.some(a=>a.job==='baker')&&S.stores.flour>=1){
    const c=Math.min(S.stores.flour,pop*.6,Math.max(0,40-S.stores.bread));S.stores.flour-=c;S.stores.bread+=c;
    if(!S.homeBaking){S.homeBaking=S.tick;log(`With no baker in the village, every household bakes its own bread at ${P.bakery?P.bakery.name:'the oven'}.`,'event','work',{place:'bakery'});}
  }else if(S.homeBaking&&LIVE.some(a=>a.job==='baker'))S.homeBaking=0;
}
export function collectDues(){
  const reeve=byJob('reeve');if(!reeve)return;const short=[];
  const homes=[...new Set(LIVE.map(a=>a.home))].filter(h=>h!=='tavern'&&h!==reeve.home);
  for(const h of homes){const adults=household(h).filter(isAdult).sort((x,y)=>y.coins-x.coins);if(!adults.length)continue;const payer=adults[0];
    const due=(2+Math.max(0,payer.coins-20)*.05)*effect('duesRate');if(payer.coins>=2){payer.coins-=due;reeve.coins+=Math.min(2,due);}
    else{short.push(payer);adj(reeve,payer,-10);adj(payer,reeve,-12);mem(payer,reeve,'demanded dues I could not pay');mem(reeve,payer,'could not pay their dues to');}}
  if(short.length)log(`Dues day. ${listNames(short)} could not pay ${N(reeve)} the two pennies owed to the manor.`,'bad');
  else log(`Dues day. Every household paid ${N(reeve)} in full, with varying grace.`,'event');
}
